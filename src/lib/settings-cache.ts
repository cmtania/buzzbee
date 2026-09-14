import type { AppSettings } from './types';

/**
 * A synchronous, in-memory mirror of the last-loaded AppSettings row, kept
 * fresh by db.ts's getSettings()/updateSettings(). Exists for call sites
 * that need a setting's current value synchronously and can't await a
 * database read — HapticPressable fires on every button press app-wide, and
 * newAlarmDraft() is a plain sync function — an async settings read on every
 * tap or draft creation would be real, avoidable overhead.
 */
let cache: AppSettings | null = null;

export function setSettingsCache(settings: AppSettings): void {
  cache = settings;
}

export function getSettingsCache(): AppSettings | null {
  return cache;
}
