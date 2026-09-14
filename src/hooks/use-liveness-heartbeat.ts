import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { ensureNotificationPermission } from '@/lib/scheduling';

// How often the app "checks in" while alive. Must be shorter than
// WARNING_LEAD_MS below, with margin — otherwise there'd be a gap where the
// previously-armed warning could fire even though the app is still alive
// and simply hasn't reached its next heartbeat tick yet.
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
// How far into the future each check-in re-arms the warning. The app being
// force-quit right after a check-in is the worst case, so this is also
// roughly the maximum delay before the user is told BuzzBee is closed.
const WARNING_LEAD_MS = 6 * 60 * 1000;
const CLOSED_WARNING_TYPE = 'app-closed-warning';

async function rearmClosedWarning(): Promise<void> {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  // Cancel by type rather than tracking a single id in memory (same pattern
  // as wind-down-scheduling.ts) — this also clears out a stale instance
  // left over from a previous app session on every fresh launch.
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter((n) => (n.content.data as { type?: string } | undefined)?.type === CLOSED_WARNING_TYPE)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'BuzzBee',
      body: "BuzzBee is closed — Smart Wake won't trigger until you reopen it. Tap to open now.",
      data: { type: CLOSED_WARNING_TYPE },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + WARNING_LEAD_MS),
    },
  });
}

/**
 * A "dead man's switch" for Smart Wake, independent of any specific alarm —
 * runs whenever the app is alive (foreground or backgrounded, thanks to
 * useBackgroundKeepAlive) and notification permission is granted, even with
 * no alarms created at all, per explicit product decision.
 *
 * There is no way to detect the actual moment of a force-quit on iOS — no
 * third-party app code runs at all once truly killed, full stop (see
 * PLAN.md's Known Technical Risk section). This is the closest possible
 * approximation: while alive, it keeps re-arming a warning notification
 * into the near future (WARNING_LEAD_MS from "now"), so as long as it keeps
 * renewing, the notification never actually reaches its fire time. The
 * instant nothing renews it — because the app was force-quit — the last
 * armed instance fires on its own within WARNING_LEAD_MS. Tapping it
 * reopens the app, which is the actual fix (see _layout.tsx's handler).
 */
export function useLivenessHeartbeat() {
  useEffect(() => {
    rearmClosedWarning();
    const interval = setInterval(rearmClosedWarning, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
