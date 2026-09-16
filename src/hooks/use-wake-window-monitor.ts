import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { cancelAlarmKitAlarm } from '@/lib/alarmkit';
import { getAlarms } from '@/lib/db';
import { dedupKey, hasTriggeredToday, markTriggeredToday } from '@/lib/ring-dedup';
import { isFixedTimeDue, isWindowStartDue } from '@/lib/wake-window-engine';

const CHECK_INTERVAL_MS = 5000;

/**
 * Alarm monitor. Paired with useBackgroundKeepAlive() (which keeps the JS
 * process from being suspended while the app is backgrounded, not
 * force-quit — see its doc comment), this interval keeps ticking and firing
 * alarms even with the app closed to the background — and unlike the old
 * accelerometer-based design, both a fixed-time alarm's deadline and a Wake
 * Window alarm's start are plain wall-clock checks with no foreground-only
 * sensor involved, so both fire reliably whether the screen is on or not.
 *
 * Hybrid Alarm follow-up tasks are NOT checked here — they're plain local
 * notifications (see hybrid-tasks.ts), not something this app pushes a
 * ringing screen for while it happens to be alive. The OS handles firing
 * their notification on its own, exactly like any other scheduled
 * notification, with no JS monitor involved.
 *
 * None of this survives a full force-quit (swiped away in the app
 * switcher) — no third-party app's code runs at all once truly killed, which
 * is what AlarmKit is for (see lib/alarmkit.ts).
 */
export function useWakeWindowMonitor() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const alarms = await getAlarms();

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
          continue;
        }

        if (isWindowStartDue(alarm, now)) {
          markTriggeredToday(key);
          cancelAlarmKitAlarm(alarm.id).catch(() => {});
          router.push({
            pathname: '/ringing',
            params: { alarmId: alarm.id, triggeredBy: 'window-start' },
          });
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [router]);
}
