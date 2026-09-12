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
 * Foreground-only Smart Wake monitor (see PLAN.md's Known Technical Risk
 * section — continuous background accelerometer sampling isn't reliable on
 * iOS in a managed app). While the app is in the foreground, this polls for
 * any enabled, Smart-Wake alarm whose window is currently open, starts
 * accelerometer sampling for it, and navigates to the Ringing screen either
 * the moment gentle movement is detected or when the hard deadline passes.
 * The scheduled local notification (see lib/scheduling.ts) remains the
 * backgrounded/killed-app safety net.
 */
export function useSmartWakeMonitor() {
  const router = useRouter();
  const monitored = useRef<{ alarm: Alarm; detector: DetectorHandle } | null>(null);
  const triggeredToday = useRef<Set<string>>(new Set());
  const appActive = useRef(AppState.currentState === 'active');

  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', (state) => {
      appActive.current = state === 'active';
      if (!appActive.current && monitored.current) {
        monitored.current.detector.stop();
        monitored.current = null;
      }
    });

    const interval = setInterval(async () => {
      if (!appActive.current) return;
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);

      if (monitored.current) {
        if (now >= todaysDeadline(monitored.current.alarm, now)) {
          const alarm = monitored.current.alarm;
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

      const detector = startMovementDetector(() => {
        monitored.current = null;
        triggeredToday.current.add(`${candidate.id}:${todayKey}`);
        router.push({
          pathname: '/ringing',
          params: { alarmId: candidate.id, triggeredBy: 'smart-detection' },
        });
      });
      monitored.current = { alarm: candidate, detector };
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      appStateSub.remove();
      monitored.current?.detector.stop();
    };
  }, [router]);
}
