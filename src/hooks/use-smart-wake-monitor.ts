import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { cancelAlarmKitAlarm } from '@/lib/alarmkit';
import { getAlarms } from '@/lib/db';
import { dedupKey, hasTriggeredToday, markTriggeredToday } from '@/lib/ring-dedup';
import {
  DetectorHandle,
  isFixedTimeDue,
  isWindowActiveNow,
  startMovementDetector,
  todaysDeadline,
} from '@/lib/smart-wake-engine';
import { Alarm } from '@/lib/types';

const CHECK_INTERVAL_MS = 5000;

type Monitored = { alarm: Alarm; detector: DetectorHandle; deadline: Date };

/**
 * Alarm monitor. Paired with useBackgroundKeepAlive() (which keeps the JS
 * process from being suspended while the app is backgrounded, not
 * force-quit — see its doc comment), this interval keeps ticking and firing
 * alarms even with the app closed to the background. Only the accelerometer
 * side is foreground-only: CoreMotion sampling isn't reliable for
 * third-party apps once backgrounded, so a brand-new Smart-Wake candidate
 * only starts movement detection while active, and backgrounding stops any
 * detector already running. The hard-deadline checks (for both fixed-time
 * and Smart-Wake alarms) don't depend on the accelerometer at all, so they
 * keep working regardless of foreground state.
 *
 * None of this survives a full force-quit (swiped away in the app
 * switcher) — no third-party app's code runs at all once truly killed. See
 * useLivenessHeartbeat for the general "BuzzBee is closed" warning, and
 * PLAN.md's Known Technical Risk section for the full picture.
 */
export function useSmartWakeMonitor() {
  const router = useRouter();
  const monitored = useRef<Monitored | null>(null);

  useEffect(() => {
    // Read AppState fresh on every tick rather than caching it in a ref
    // that's only updated by the 'change' event — if that ref ever
    // initializes stale (e.g. AppState.currentState isn't 'active' yet at
    // the exact moment this hook first mounts), and the app never actually
    // transitions foreground/background afterward, the cached value would
    // never self-correct and the monitor would silently never fire.
    const appStateSub = AppState.addEventListener('change', (state) => {
      // Stop accelerometer sampling in the background — CoreMotion updates
      // aren't reliable for third-party apps once backgrounded — but KEEP
      // the frozen deadline tracking, so the alarm still force-rings at its
      // hard deadline even without movement ever being detected.
      if (state !== 'active' && monitored.current) {
        monitored.current.detector.stop();
      }
    });

    const interval = setInterval(async () => {
      const now = new Date();
      const alarms = await getAlarms();

      // Fixed-time alarms fire directly off wall-clock time every tick,
      // independent of the "monitored" slot below — see isFixedTimeDue()'s
      // doc comment for why this replaced the old candidate-catching
      // approach (it was missing real alarms).
      for (const alarm of alarms) {
        const key = dedupKey(alarm.id, now);
        if (hasTriggeredToday(key)) continue;
        if (isFixedTimeDue(alarm, now)) {
          markTriggeredToday(key);
          cancelAlarmKitAlarm(alarm.id).catch(() => {});
          router.push({
            pathname: '/ringing',
            params: { alarmId: alarm.id, triggeredBy: 'hard-deadline' },
          });
        }
      }

      if (monitored.current) {
        // The deadline is frozen at the moment monitoring started (below) —
        // recomputing it fresh via todaysDeadline() on every tick was the
        // bug: that helper rolls to tomorrow once `now` passes it, so the
        // instant the real deadline arrived, the "target" would jump a full
        // day ahead and `now >= deadline` could never become true again.
        if (now >= monitored.current.deadline) {
          const alarm = monitored.current.alarm;
          monitored.current.detector.stop();
          monitored.current = null;
          markTriggeredToday(dedupKey(alarm.id, now));
          cancelAlarmKitAlarm(alarm.id).catch(() => {});
          router.push({
            pathname: '/ringing',
            params: { alarmId: alarm.id, triggeredBy: 'hard-deadline' },
          });
        }
        return;
      }

      // Only Smart-Wake alarms need the candidate/detector tracking below —
      // fixed-time alarms are handled entirely by the direct check above.
      const candidate = alarms.find(
        (a) =>
          a.smartWakeEnabled &&
          isWindowActiveNow(a, now) &&
          !hasTriggeredToday(dedupKey(a.id, now))
      );
      if (!candidate) return;

      const detector = startMovementDetector(() => {
        monitored.current = null;
        markTriggeredToday(dedupKey(candidate.id));
        cancelAlarmKitAlarm(candidate.id).catch(() => {});
        router.push({
          pathname: '/ringing',
          params: { alarmId: candidate.id, triggeredBy: 'smart-detection' },
        });
      });
      monitored.current = { alarm: candidate, detector, deadline: todaysDeadline(candidate, now) };
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      appStateSub.remove();
      monitored.current?.detector.stop();
    };
  }, [router]);
}
