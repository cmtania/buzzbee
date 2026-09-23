import { Alarm } from './types';

const GRACE_MIN = 3;

/**
 * Is this fixed-time (Wake Window off) alarm due to ring right now?
 *
 * Checking directly against the deadline on every tick — "are we at or just
 * past the target minute?" — means a fixed-time alarm fires the moment it's
 * due as soon as the monitor is ticking, with no advance notice required and
 * no risk of missing a narrow catch-window.
 */
export function isFixedTimeDue(alarm: Alarm, now: Date = new Date(), graceMin = GRACE_MIN): boolean {
  if (!alarm.enabled || alarm.smartWakeEnabled) return false;
  const dow = now.getDay();
  if (alarm.repeatDays.length > 0 && !alarm.repeatDays.includes(dow)) return false;

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const [eh, em] = alarm.windowEnd.split(':').map(Number);
  const endMin = eh * 60 + em;
  const minutesPastDeadline = (minutesNow - endMin + 1440) % 1440;
  return minutesPastDeadline < graceMin;
}

/**
 * Is a Wake Window alarm's *start* due right now? Mirrors isFixedTimeDue()
 * exactly, just checking windowStart instead of windowEnd. This is the whole
 * trigger for a Wake Window alarm now — it starts ringing gently the moment
 * its window opens and escalates to full volume by windowEnd (see
 * ringing.tsx's escalation duration), rather than waiting to sense movement.
 */
export function isWindowStartDue(alarm: Alarm, now: Date = new Date(), graceMin = GRACE_MIN): boolean {
  if (!alarm.enabled || !alarm.smartWakeEnabled) return false;
  const dow = now.getDay();
  if (alarm.repeatDays.length > 0 && !alarm.repeatDays.includes(dow)) return false;

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = alarm.windowStart.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const minutesPastStart = (minutesNow - startMin + 1440) % 1440;
  return minutesPastStart < graceMin;
}

/** Wake Window's escalation duration in ms: windowStart to windowEnd, today. */
export function escalationDurationMs(alarm: Alarm): number {
  const [sh, sm] = alarm.windowStart.split(':').map(Number);
  const [eh, em] = alarm.windowEnd.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const spanMin = ((endMin - startMin) % 1440 + 1440) % 1440;
  // A zero/negative span (misconfigured window) falls back to a short ramp
  // rather than dividing by zero or ramping instantly.
  return Math.max(spanMin, 1) * 60000;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Time left until this Wake Window alarm's hard deadline (windowEnd), or 0
 * if the window isn't open right now (already past the deadline). Measured
 * from windowStart, so a window that crosses midnight works too.
 *
 * The escalation ramp and the full-volume backstop both key off this, not
 * the window's full length: a ring that starts late (the app came to the
 * foreground 20 minutes into a 30-minute window) still has to reach full
 * volume by the deadline, not 30 minutes after it started.
 */
export function msUntilDeadline(alarm: Alarm, now: Date = new Date()): number {
  const [sh, sm] = alarm.windowStart.split(':').map(Number);
  const nowMsOfDay =
    ((now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds()) * 1000 + now.getMilliseconds();
  const sinceStartMs = (nowMsOfDay - (sh * 60 + sm) * 60000 + DAY_MS) % DAY_MS;
  const spanMs = escalationDurationMs(alarm);
  return sinceStartMs < spanMs ? spanMs - sinceStartMs : 0;
}
