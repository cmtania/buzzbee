// Data model — mirrors PLAN.md's "Data Model (local, MVP)" section.

export type DismissMethod = 'math' | 'clap' | 'shake' | 'buzz' | 'tap' | 'random';

export type Alarm = {
  id: string;
  /** User's own name for this alarm ("Morning run", "Meds"). Optional —
   * empty string when unnamed, so every display site can just check for
   * truthiness rather than juggling null. */
  label: string;
  windowStart: string; // "06:30"
  windowEnd: string; // "07:00" (hard deadline)
  repeatDays: number[]; // 0-6 (0 = Sunday), empty = one-off
  smartWakeEnabled: boolean;
  dismissMethod: DismissMethod;
  sound: string;
  enabled: boolean;
  vibrationEnabled: boolean;
};

// Wind-Down / Calendar auto-shift are GLOBAL settings, not per-alarm —
// confirmed after reviewing the Settings screen mockup.
export type AppSettings = {
  windDownEnabled: boolean;
  windDownOffsetMin: number; // minutes before bedtime
  bedtime: string | null;
  calendarAutoShiftEnabled: boolean;
  autoShiftTrusted: boolean; // true = auto-apply, false = confirm-first nudge
  hasOnboarded: boolean;
  hapticsEnabled: boolean; // global tap-feedback toggle, see haptic-pressable.tsx
  defaultSound: string; // used as the sound for a newly-created alarm draft
};

// A user-recorded alarm sound. `filePath` is stored directly as an alarm's
// `sound` / a settings' `defaultSound` value (a `file://` URI) — there's no
// separate id-lookup at playback/scheduling time, so isSoundName()'s existing
// "not a bundled name" fallback in scheduling.ts/alarmkit.ts/ringing.tsx
// already degrades gracefully if a custom sound is later deleted.
export type CustomSound = {
  id: string;
  name: string;
  filePath: string;
  createdAt: string;
};

export type WakeEvent = {
  id: string;
  alarmId: string;
  date: string; // "2026-09-12"
  scheduledDeadline: string; // ISO timestamp
  actualRingTime: string; // ISO timestamp
  triggeredBy: 'window-start' | 'hard-deadline';
  dismissedAfterSeconds: number;
};

/**
 * Recorded the moment an alarm actually starts ringing (ringing.tsx loading
 * it), regardless of whether the mission ever gets completed — distinct from
 * WakeEvent, which is only recorded on a genuine dismiss. History's calendar
 * uses the two together: an AlarmTriggerEvent with no matching WakeEvent for
 * the same alarmId+date means the alarm rang but the mission wasn't
 * finished. At most one row per alarmId+date (see db.ts's addAlarmTrigger).
 */
export type AlarmTriggerEvent = {
  id: string;
  alarmId: string;
  date: string;
  triggeredAt: string; // ISO timestamp
};

// Mission target constants (v1: fixed, not per-alarm configurable)
export const MATH_PROBLEMS = 1;
export const CLAP_TARGET = 50;
export const SHAKE_TARGET = 50;
export const BUZZ_TARGET = 10;
export const TAP_TARGET = 100;

export const MISSION_LABELS: Record<DismissMethod, string> = {
  math: 'Math',
  clap: 'Clap',
  shake: 'Shake Phone',
  buzz: 'Buzzzzz',
  tap: 'Tap',
  random: 'Random',
};

export const MISSION_SUBTITLES: Record<DismissMethod, string> = {
  math: 'Solve 1 equation',
  clap: `Clap ×${CLAP_TARGET} to dismiss`,
  shake: `Shake ×${SHAKE_TARGET} to dismiss`,
  buzz: `Buzz ×${BUZZ_TARGET} to dismiss`,
  tap: `Tap ×${TAP_TARGET} to dismiss`,
  random: 'Surprise mission each morning',
};

// Split description + count-pill, matching the Choose Mission card design
// (design/ChooseMission.dc.html) — distinct from MISSION_SUBTITLES above,
// which is a single combined sentence used in summary rows.
export const MISSION_DESCRIPTIONS: Record<DismissMethod, string> = {
  math: 'Solve one equation to wake up',
  clap: 'Clap your hands to dismiss',
  shake: 'Shake your phone to dismiss',
  buzz: 'Make a long buzzing sound',
  tap: 'Tap the screen to dismiss',
  random: 'Surprise mission each morning',
};

export const MISSION_COUNT_LABELS: Record<DismissMethod, string> = {
  math: '1 problem',
  clap: `×${CLAP_TARGET}`,
  shake: `×${SHAKE_TARGET}`,
  buzz: `×${BUZZ_TARGET}`,
  tap: `×${TAP_TARGET}`,
  random: 'Mixes it up',
};

export const DEFAULT_SETTINGS: AppSettings = {
  windDownEnabled: true,
  windDownOffsetMin: 30,
  bedtime: null,
  calendarAutoShiftEnabled: true,
  autoShiftTrusted: false,
  hasOnboarded: false,
  hapticsEnabled: true,
  defaultSound: 'Classic Alarm',
};

// smartWakeEnabled is the internal field name for what's shown to users as
// "Wake Window" (renamed from "Smart Wake" once its mechanism changed from
// accelerometer-based light-sleep detection to a plain time-based gentle-to-
// loud ramp from windowStart to windowEnd — see wake-window-engine.ts). Kept
// as-is rather than renamed, same pattern as windDownEnabled surviving the
// "Wind-Down Mode" -> "Bedtime Reminder" rename: no functional reason to
// touch the column, only the label users see.
export function newAlarmDraft(): Alarm {
  return {
    id: '',
    label: '',
    windowStart: '06:30',
    windowEnd: '07:00',
    repeatDays: [1, 2, 3, 4, 5],
    smartWakeEnabled: true,
    dismissMethod: 'shake',
    sound: 'Classic Alarm',
    enabled: true,
    vibrationEnabled: true,
  };
}
