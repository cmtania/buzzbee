// Turning an AlarmKit alert tap into "open the mission screen" — shared by the
// cold-launch path (_layout.tsx, app was fully closed) and the warm-launch
// path (use-wake-window-monitor.ts, app was alive in the background), so both
// arm the same safety net and mark the same dedup key.
import { armConfirmationAlarm, checkAlarmKitLaunch, CONFIRMATION_ALARM_DELAY_SEC } from './alarmkit';
import { getAlarm } from './db';
import { dedupKey, markTriggeredToday } from './ring-dedup';
import { Alarm } from './types';
import { msUntilDeadline } from './wake-window-engine';

export type AlarmLaunch = { alarmId: string; triggeredBy: 'window-start' | 'hard-deadline' };

/** Whether a ring starting now is still inside the Wake Window (gentle ramp)
 * or at/after the hard deadline (full volume straight away). */
export function ringTrigger(alarm: Alarm, now: Date = new Date()): AlarmLaunch['triggeredBy'] {
  return alarm.smartWakeEnabled && msUntilDeadline(alarm, now) > 0 ? 'window-start' : 'hard-deadline';
}

/**
 * When the AlarmKit confirmation alarm (the full-volume native re-ring, see
 * armConfirmationAlarm) should fire.
 *
 * Fixed-time, or a Wake Window already past its deadline: the usual 90s
 * anti-cheat delay.
 *
 * Wake Window still open: at the hard deadline itself, so it doubles as the
 * deadline backstop. The gentle ramp is played by the app, and an app in the
 * background can't raise the system volume — on a locked phone left at low
 * volume the ramp might never get loud. This native alarm rings at full
 * volume through Silent mode at the deadline regardless, which is the
 * "never late" promise. Firing it at +90s instead (the old behavior) cut
 * every window's gentle build off after a minute and a half.
 */
export function confirmationDelaySec(alarm: Alarm, now: Date = new Date()): number {
  if (!alarm.smartWakeEnabled) return CONFIRMATION_ALARM_DELAY_SEC;
  const untilDeadlineSec = Math.ceil(msUntilDeadline(alarm, now) / 1000);
  return Math.max(CONFIRMATION_ALARM_DELAY_SEC, untilDeadlineSec);
}

/**
 * Prepares a launch for the alarm AlarmKit just opened the app for: marks it
 * already-rung (so the wake-window monitor's next tick doesn't push a second
 * /ringing) and arms the anti-cheat confirmation alarm immediately, before
 * navigation, so tapping AlarmKit's Stop leaves no gap with no backstop.
 */
export async function resolveAlarmKitLaunch(alarmId: string): Promise<AlarmLaunch> {
  const alarm = await getAlarm(alarmId);
  if (!alarm) return { alarmId, triggeredBy: 'hard-deadline' };
  markTriggeredToday(dedupKey(alarm.id));
  armConfirmationAlarm(alarm, confirmationDelaySec(alarm)).catch(() => {});
  // Decided by the clock, not just "is this a Wake Window alarm": tapping the
  // deadline backstop means the window is over, and that ring must start at
  // full volume rather than restart the gentle ramp from quiet.
  return { alarmId, triggeredBy: ringTrigger(alarm) };
}

const PAYLOAD_POLL_MS = 100;
const PAYLOAD_POLL_TRIES = 10;

/**
 * For a warm launch. AlarmKit's open-app intent stores its payload natively
 * when it runs, and that can land a moment before or after the app reports
 * itself active — so poll briefly (up to ~1s) rather than reading once and
 * missing it. The native read clears the payload, so this can't return the
 * same launch twice.
 */
export async function takeAlarmKitLaunchPayload(): Promise<string | null> {
  for (let i = 0; i < PAYLOAD_POLL_TRIES; i++) {
    const alarmId = checkAlarmKitLaunch();
    if (alarmId) return alarmId;
    await new Promise((r) => setTimeout(r, PAYLOAD_POLL_MS));
  }
  return null;
}
