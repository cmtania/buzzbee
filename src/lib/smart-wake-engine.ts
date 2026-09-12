import { Accelerometer } from 'expo-sensors';

import { Alarm } from './types';

export type DetectorHandle = { stop: () => void };

// Fixed-time alarms (Smart Wake off) now store windowStart === windowEnd —
// a single alarm time, not a real range. isWindowActiveNow needs *some*
// non-empty span leading up to that instant so the monitor can pick it up
// as a candidate before the deadline check can ever fire it.
const FIXED_TIME_LEAD_MIN = 2;

// Tuned empirically for "gentle restlessness" vs. either dead stillness or a
// deliberate shake — this is a heuristic, not a validated sleep-stage
// classifier (see PLAN.md's Known Technical Risk section). Needs real
// overnight tuning before launch.
const SAMPLE_INTERVAL_MS = 400;
const BUFFER_SIZE = 12; // ~5s of samples at 400ms
const LIGHT_SLEEP_STDDEV = 0.035;
const CONSECUTIVE_HITS_REQUIRED = 3;

/**
 * Starts sampling the accelerometer and calls onLightSleepDetected once
 * sustained gentle movement (not stillness, not a hard shake) is seen.
 * Foreground-only — the caller is responsible for stopping this when the
 * window ends or the app backgrounds.
 */
export function startMovementDetector(
  onLightSleepDetected: () => void,
  opts?: { stddevThreshold?: number; consecutiveHitsRequired?: number }
): DetectorHandle {
  const threshold = opts?.stddevThreshold ?? LIGHT_SLEEP_STDDEV;
  const hitsRequired = opts?.consecutiveHitsRequired ?? CONSECUTIVE_HITS_REQUIRED;

  const buffer: number[] = [];
  let consecutiveHits = 0;
  let stopped = false;

  Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
  const sub = Accelerometer.addListener(({ x, y, z }) => {
    if (stopped) return;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    buffer.push(magnitude);
    if (buffer.length > BUFFER_SIZE) buffer.shift();
    if (buffer.length < BUFFER_SIZE) return;

    const mean = buffer.reduce((s, v) => s + v, 0) / buffer.length;
    const variance = buffer.reduce((s, v) => s + (v - mean) ** 2, 0) / buffer.length;
    const stddev = Math.sqrt(variance);

    if (stddev > threshold) {
      consecutiveHits++;
      if (consecutiveHits >= hitsRequired) {
        stopped = true;
        sub.remove();
        onLightSleepDetected();
      }
    } else {
      consecutiveHits = 0;
    }
  });

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      sub.remove();
    },
  };
}

/**
 * Is `alarm`'s wake window open right now (today's date, time-of-day only)?
 * Applies to every enabled alarm, not just Smart-Wake ones — a fixed-time
 * alarm still needs to be "monitored" so its deadline check below can fire
 * it, it just never runs the movement detector.
 */
export function isWindowActiveNow(alarm: Alarm, now: Date = new Date()): boolean {
  if (!alarm.enabled) return false;
  const dow = now.getDay();
  if (alarm.repeatDays.length > 0 && !alarm.repeatDays.includes(dow)) return false;

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = alarm.windowStart.split(':').map(Number);
  const [eh, em] = alarm.windowEnd.split(':').map(Number);
  let startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (startMin === endMin) {
    startMin = (startMin - FIXED_TIME_LEAD_MIN + 1440) % 1440;
  }

  if (startMin <= endMin) {
    return minutesNow >= startMin && minutesNow < endMin;
  }
  // Overnight wrap (e.g. window 23:30-00:15) — known limitation: the
  // "already triggered today" dedup keys off calendar date, so a window
  // crossing midnight isn't fully handled yet.
  return minutesNow >= startMin || minutesNow < endMin;
}

/** Today's Date object for this alarm's hard deadline (windowEnd). */
export function todaysDeadline(alarm: Alarm, now: Date = new Date()): Date {
  const [eh, em] = alarm.windowEnd.split(':').map(Number);
  const d = new Date(now);
  d.setHours(eh, em, 0, 0);
  if (d < now) d.setDate(d.getDate() + 1);
  return d;
}
