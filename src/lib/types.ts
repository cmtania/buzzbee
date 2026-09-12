// Data model — mirrors PLAN.md's "Data Model (local, MVP)" section.

export type DismissMethod = 'math' | 'clap' | 'shake' | 'buzz' | 'tap' | 'random';

export type Alarm = {
  id: string;
  windowStart: string; // "06:30"
  windowEnd: string; // "07:00" (hard deadline)
  repeatDays: number[]; // 0-6 (0 = Sunday), empty = one-off
  smartWakeEnabled: boolean;
  dismissMethod: DismissMethod;
  sound: string;
  enabled: boolean;
};

// Wind-Down / Calendar auto-shift / Ambient awareness are GLOBAL settings,
// not per-alarm — confirmed after reviewing the Settings screen mockup.
export type AppSettings = {
  windDownEnabled: boolean;
  windDownOffsetMin: number; // minutes before bedtime
  bedtime: string | null;
  calendarAutoShiftEnabled: boolean;
  autoShiftTrusted: boolean; // true = auto-apply, false = confirm-first nudge
  ambientAwarenessEnabled: boolean;
  simulateModeEnabled: boolean; // Simulate/Test Mode toggle
};

export type WakeEvent = {
  id: string;
  alarmId: string;
  date: string; // "2026-09-12"
  scheduledDeadline: string; // ISO timestamp
  actualRingTime: string; // ISO timestamp
  triggeredBy: 'smart-detection' | 'hard-deadline';
  dismissedAfterSeconds: number;
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

export const DEFAULT_SETTINGS: AppSettings = {
  windDownEnabled: true,
  windDownOffsetMin: 30,
  bedtime: null,
  calendarAutoShiftEnabled: true,
  autoShiftTrusted: false,
  ambientAwarenessEnabled: false,
  simulateModeEnabled: false,
};

export function newAlarmDraft(): Alarm {
  return {
    id: '',
    windowStart: '06:30',
    windowEnd: '07:00',
    repeatDays: [1, 2, 3, 4, 5],
    smartWakeEnabled: true,
    dismissMethod: 'shake',
    sound: 'Honey Chime',
    enabled: true,
  };
}
