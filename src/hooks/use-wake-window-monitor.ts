import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { resolveAlarmKitLaunch, takeAlarmKitLaunchPayload } from '@/lib/alarm-launch';
import { isoMatchesTime } from '@/lib/alarm-utils';
import { cancelAlarmKitAlarm } from '@/lib/alarmkit';
import { getAlarms, getWakeEventToday } from '@/lib/db';
import { dedupKey, hasTriggeredToday, markTriggeredToday } from '@/lib/ring-dedup';
import { isFixedTimeDue, isWindowStartDue } from '@/lib/wake-window-engine';

const CHECK_INTERVAL_MS = 5000;
// How long the launch cover stays up after pushing /ringing — long enough for
// its full-screen-modal slide-in to finish, so Home never shows underneath.
const COVER_HOLD_MS = 650;

/**
 * Alarm monitor. Paired with useBackgroundKeepAlive() (which keeps the JS
 * process from being suspended while the app is backgrounded, not
 * force-quit — see its doc comment), this interval keeps ticking and firing
 * alarms even with the app closed to the background. Both a fixed-time
 * alarm's deadline and a Wake Window alarm's start are plain wall-clock
 * checks.
 *
 * None of this survives a full force-quit (swiped away in the app
 * switcher) — no third-party app's code runs at all once truly killed, which
 * is what AlarmKit is for (see lib/alarmkit.ts).
 *
 * Also handles the warm AlarmKit launch: tapping an AlarmKit alert while the
 * app is still alive in the background brings it to the foreground, but the
 * root layout's cold-launch check has long since run. Without the foreground
 * check below, the mission only appeared on this monitor's next tick — Home
 * showed for up to 5 seconds first.
 *
 * Returns true while the app should show its launch cover instead of Home:
 * set the moment a fixed-time alarm comes due with the app in the background
 * (so the cover is already in place when the app returns), cleared once the
 * mission screen is up — or right away if it turns out nothing is ringing.
 * Ordinary app switching never sets it.
 */
export function useWakeWindowMonitor(): boolean {
  const [covering, setCovering] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  // Read from inside the interval/AppState callbacks, which outlive renders.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // Ticks run one at a time, queued rather than skipped. Overlapping ticks
    // (the interval plus an immediate foreground tick) could both pass
    // hasTriggeredToday before either marks it and push two ringing screens;
    // skipping instead would let onForeground drop the launch cover before a
    // tick that was already running had pushed /ringing.
    let queue: Promise<void> = Promise.resolve();
    function tick(): Promise<void> {
      queue = queue.then(runTick, runTick);
      return queue;
    }
    // Counts /ringing pushes, so onForeground can tell whether one happened.
    let pushes = 0;
    // Mirrors `covering` for these long-lived callbacks.
    let coverUp = false;
    function setCover(value: boolean) {
      coverUp = value;
      setCovering(value);
    }

    async function runTick() {
      try {
        const now = new Date();
        const foreground = AppState.currentState === 'active';
        const alarms = await getAlarms();

        for (const alarm of alarms) {
          const key = dedupKey(alarm.id, now);
          if (hasTriggeredToday(key)) continue;

          const fixedDue = isFixedTimeDue(alarm, now);
          const windowDue = isWindowStartDue(alarm, now);
          if (!fixedDue && !windowDue) continue;

          // A fixed-time alarm while the app is in the background (phone
          // locked, another app open): leave it to AlarmKit. Its native alert
          // rings at full alarm volume through Silent mode. Taking over here
          // used to cancel that alert and ring in-app instead — and an app in
          // the background can't raise the system volume (DeviceVolumeBoost's
          // trick needs a foreground view), so a locked phone rang at whatever
          // volume it happened to be on. Not marked, so the moment the app
          // comes to the foreground this still takes over within the grace
          // window (or the AlarmKit tap opens the mission directly, above).
          // Wake Window keeps the in-app takeover even in the background: its
          // whole point is the gentle ramp, which AlarmKit's alert can't do.
          if (fixedDue && !foreground) {
            if (!coverUp) setCover(true);
            continue;
          }

          // hasTriggeredToday's in-memory Set resets on every app restart, so
          // within GRACE_MIN of a deadline that already rang and was genuinely
          // dismissed this session, it looks freshly "due" again. WakeEvent is
          // the durable record of a real dismissal (see ringing.tsx's
          // dismiss()), so check it before trusting the in-memory set alone.
          // An alarm that rang and was *ignored* has no WakeEvent, so the
          // intended "keep re-checking an unhandled alarm" retry still works.
          const todayEvent = await getWakeEventToday(alarm.id);
          if (todayEvent && isoMatchesTime(todayEvent.scheduledDeadline, alarm.windowEnd)) {
            markTriggeredToday(key);
            continue;
          }

          markTriggeredToday(key);
          cancelAlarmKitAlarm(alarm.id).catch(() => {});
          pushes++;
          router.push({
            pathname: '/ringing',
            params: { alarmId: alarm.id, triggeredBy: fixedDue ? 'hard-deadline' : 'window-start' },
          });
        }
      } catch {
        // A failed DB read just means this tick is skipped; the next one retries.
      }
    }

    async function onForeground() {
      const pushesBefore = pushes;
      const alarmId = await takeAlarmKitLaunchPayload();
      // Already on the mission (e.g. the 90s confirmation alarm re-rang
      // mid-attempt and was tapped): don't stack a second ringing screen.
      if (alarmId && pathnameRef.current !== '/ringing') {
        const launch = await resolveAlarmKitLaunch(alarmId);
        pushes++;
        router.push({ pathname: '/ringing', params: launch });
      }
      // Then catch anything that came due while backgrounded (see the
      // fixed-time skip in tick) right away, instead of up to 5s later.
      await tick();
      if (coverUp) {
        // Something was pushed: wait out the slide-in. Nothing was: drop the
        // cover now and show Home.
        const pushed = pushes > pushesBefore;
        setTimeout(() => setCover(false), pushed ? COVER_HOLD_MS : 0);
      }
    }

    const interval = setInterval(tick, CHECK_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') onForeground();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [router]);

  return covering;
}
