import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { isoMatchesTime } from '@/lib/alarm-utils';
import { cancelAlarmKitAlarm } from '@/lib/alarmkit';
import { getAlarms, getWakeEventToday } from '@/lib/db';
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

        const fixedDue = isFixedTimeDue(alarm, now);
        const windowDue = isWindowStartDue(alarm, now);
        if (!fixedDue && !windowDue) continue;

        // hasTriggeredToday's in-memory Set resets on every app restart, so
        // within GRACE_MIN of a deadline that already rang and was genuinely
        // dismissed this session (mission completed, then the app got
        // force-quit and reopened a minute later — a very normal test/use
        // cycle), it looks freshly "due" again with no memory of that, and
        // would re-push /ringing for an alarm the user already handled.
        // WakeEvent is the durable record of a real dismissal (see
        // ringing.tsx's dismiss()), so check it before trusting the
        // in-memory set alone — same guard alarmKit.ts's own re-arm logic
        // already uses. An alarm that rang and was *ignored* has no
        // WakeEvent, so this doesn't touch the intended "keep re-checking an
        // unhandled alarm" retry behavior at all.
        const todayEvent = await getWakeEventToday(alarm.id);
        if (todayEvent && isoMatchesTime(todayEvent.scheduledDeadline, alarm.windowEnd)) {
          markTriggeredToday(key);
          continue;
        }

        markTriggeredToday(key);
        cancelAlarmKitAlarm(alarm.id).catch(() => {});
        router.push({
          pathname: '/ringing',
          params: { alarmId: alarm.id, triggeredBy: fixedDue ? 'hard-deadline' : 'window-start' },
        });
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [router]);
}
