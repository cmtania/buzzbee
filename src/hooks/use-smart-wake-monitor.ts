import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { getAlarms } from '@/lib/db';
import {
  DetectorHandle,
  isWindowActiveNow,
  startMovementDetector,
  todaysDeadline,
} from '@/lib/smart-wake-engine';
import { Alarm } from '@/lib/types';

const CHECK_INTERVAL_MS = 5000;

/**
 * Foreground-only alarm monitor (see PLAN.md's Known Technical Risk
 * section — continuous background accelerometer sampling isn't reliable on
 * iOS in a managed app). While the app is in the foreground, this polls for
 * any enabled alarm whose window is currently open. Smart-Wake alarms get
 * accelerometer sampling and can ring early on movement detection; fixed-
 * time alarms (Smart Wake off) skip detection and simply ring the instant
 * their window's end time arrives. Either way, the scheduled local
 * notification (see lib/scheduling.ts) remains the backgrounded/killed-app
 * safety net.
 */
export function useSmartWakeMonitor() {
  const router = useRouter();
  const monitored = useRef<{ alarm: Alarm; detector: DetectorHandle } | null>(null);
  const triggeredToday = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Read AppState fresh on every tick rather than caching it in a ref
    // that's only updated by the 'change' event — if that ref ever
    // initializes stale (e.g. AppState.currentState isn't 'active' yet at
    // the exact moment this hook first mounts), and the app never actually
    // transitions foreground/background afterward, the cached value would
    // never self-correct and the monitor would silently never fire.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && monitored.current) {
        monitored.current.detector.stop();
        monitored.current = null;
      }
    });

    const interval = setInterval(async () => {
      if (AppState.currentState !== 'active') return;
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);

      if (monitored.current) {
        const deadline = todaysDeadline(monitored.current.alarm, now);
        console.log(
          '[smart-wake-monitor] watching',
          monitored.current.alarm.id,
          'now',
          now.toTimeString().slice(0, 8),
          'deadline',
          deadline.toTimeString().slice(0, 8)
        );
        if (now >= deadline) {
          const alarm = monitored.current.alarm;
          console.log('[smart-wake-monitor] deadline reached — firing ring for', alarm.id);
          monitored.current.detector.stop();
          monitored.current = null;
          triggeredToday.current.add(`${alarm.id}:${todayKey}`);
          router.push({
            pathname: '/ringing',
            params: { alarmId: alarm.id, triggeredBy: 'hard-deadline' },
          });
        }
        return;
      }

      const alarms = await getAlarms();
      const candidate = alarms.find(
        (a) => isWindowActiveNow(a, now) && !triggeredToday.current.has(`${a.id}:${todayKey}`)
      );
      if (!candidate) return;

      console.log(
        '[smart-wake-monitor] started monitoring',
        candidate.id,
        candidate.windowStart,
        '-',
        candidate.windowEnd,
        'smartWake:',
        candidate.smartWakeEnabled
      );

      // Fixed-time alarms (Smart Wake off) don't get movement detection —
      // they're still "monitored" purely so the deadline check above fires
      // them the instant their window's end time arrives.
      const detector = candidate.smartWakeEnabled
        ? startMovementDetector(() => {
            monitored.current = null;
            triggeredToday.current.add(`${candidate.id}:${todayKey}`);
            router.push({
              pathname: '/ringing',
              params: { alarmId: candidate.id, triggeredBy: 'smart-detection' },
            });
          })
        : { stop: () => {} };
      monitored.current = { alarm: candidate, detector };
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      appStateSub.remove();
      monitored.current?.detector.stop();
    };
  }, [router]);
}
