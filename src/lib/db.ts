import * as SQLite from 'expo-sqlite';

import { setSettingsCache } from './settings-cache';
import { Alarm, AppSettings, CustomSound, DEFAULT_SETTINGS, DismissMethod, WakeEvent } from './types';

const DB_NAME = 'buzzbee.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS alarms (
          id TEXT PRIMARY KEY NOT NULL,
          windowStart TEXT NOT NULL,
          windowEnd TEXT NOT NULL,
          repeatDays TEXT NOT NULL,
          smartWakeEnabled INTEGER NOT NULL,
          dismissMethod TEXT NOT NULL,
          sound TEXT NOT NULL,
          enabled INTEGER NOT NULL,
          notificationId TEXT,
          vibrationEnabled INTEGER NOT NULL DEFAULT 1,
          alarmKitId TEXT,
          confirmAlarmKitId TEXT
        );
        CREATE TABLE IF NOT EXISTS wake_events (
          id TEXT PRIMARY KEY NOT NULL,
          alarmId TEXT NOT NULL,
          date TEXT NOT NULL,
          scheduledDeadline TEXT NOT NULL,
          actualRingTime TEXT NOT NULL,
          triggeredBy TEXT NOT NULL,
          dismissedAfterSeconds INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS custom_sounds (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          filePath TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS app_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          windDownEnabled INTEGER NOT NULL,
          windDownOffsetMin INTEGER NOT NULL,
          bedtime TEXT,
          calendarAutoShiftEnabled INTEGER NOT NULL,
          autoShiftTrusted INTEGER NOT NULL,
          ambientAwarenessEnabled INTEGER NOT NULL,
          simulateModeEnabled INTEGER NOT NULL,
          hasOnboarded INTEGER NOT NULL DEFAULT 0,
          hapticsEnabled INTEGER NOT NULL DEFAULT 1,
          defaultSound TEXT NOT NULL DEFAULT 'Classic Alarm'
        );
      `);
      // "CREATE TABLE IF NOT EXISTS" only applies the full schema above to a
      // brand-new install — an app_settings table created before a column
      // existed is never retroactively altered by it. Add any columns that
      // are still missing (a lightweight migration; no framework needed for
      // a single settings row) — SQLite has no "ADD COLUMN IF NOT EXISTS",
      // so failures from a column that already exists are expected and
      // swallowed.
      for (const columnDef of [
        'hapticsEnabled INTEGER NOT NULL DEFAULT 1',
        "defaultSound TEXT NOT NULL DEFAULT 'Classic Alarm'",
      ]) {
        await db.execAsync(`ALTER TABLE app_settings ADD COLUMN ${columnDef}`).catch(() => {});
      }
      await db
        .execAsync('ALTER TABLE alarms ADD COLUMN vibrationEnabled INTEGER NOT NULL DEFAULT 1')
        .catch(() => {});
      await db.execAsync('ALTER TABLE alarms ADD COLUMN alarmKitId TEXT').catch(() => {});
      await db.execAsync('ALTER TABLE alarms ADD COLUMN confirmAlarmKitId TEXT').catch(() => {});
      const settingsRow = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM app_settings WHERE id = 1'
      );
      if (!settingsRow) {
        await db.runAsync(
          `INSERT INTO app_settings (id, windDownEnabled, windDownOffsetMin, bedtime, calendarAutoShiftEnabled, autoShiftTrusted, ambientAwarenessEnabled, simulateModeEnabled, hasOnboarded, hapticsEnabled, defaultSound)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            DEFAULT_SETTINGS.windDownEnabled ? 1 : 0,
            DEFAULT_SETTINGS.windDownOffsetMin,
            DEFAULT_SETTINGS.bedtime,
            DEFAULT_SETTINGS.calendarAutoShiftEnabled ? 1 : 0,
            DEFAULT_SETTINGS.autoShiftTrusted ? 1 : 0,
            DEFAULT_SETTINGS.ambientAwarenessEnabled ? 1 : 0,
            DEFAULT_SETTINGS.simulateModeEnabled ? 1 : 0,
            DEFAULT_SETTINGS.hasOnboarded ? 1 : 0,
            DEFAULT_SETTINGS.hapticsEnabled ? 1 : 0,
            DEFAULT_SETTINGS.defaultSound,
          ]
        );
      }
      return db;
    });
  }
  return dbPromise;
}

type AlarmRow = {
  id: string;
  windowStart: string;
  windowEnd: string;
  repeatDays: string;
  smartWakeEnabled: number;
  dismissMethod: string;
  sound: string;
  enabled: number;
  notificationId: string | null;
  vibrationEnabled: number | null;
};

function rowToAlarm(row: AlarmRow): Alarm {
  return {
    id: row.id,
    windowStart: row.windowStart,
    windowEnd: row.windowEnd,
    repeatDays: JSON.parse(row.repeatDays),
    smartWakeEnabled: !!row.smartWakeEnabled,
    dismissMethod: row.dismissMethod as DismissMethod,
    sound: row.sound,
    enabled: !!row.enabled,
    vibrationEnabled: row.vibrationEnabled == null ? true : !!row.vibrationEnabled,
  };
}

export async function getAlarms(): Promise<Alarm[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AlarmRow>(
    'SELECT * FROM alarms ORDER BY windowStart ASC'
  );
  return rows.map(rowToAlarm);
}

export async function getAlarm(id: string): Promise<Alarm | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AlarmRow>('SELECT * FROM alarms WHERE id = ?', [id]);
  return row ? rowToAlarm(row) : null;
}

export async function saveAlarm(alarm: Alarm): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO alarms (id, windowStart, windowEnd, repeatDays, smartWakeEnabled, dismissMethod, sound, enabled, vibrationEnabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       windowStart = excluded.windowStart,
       windowEnd = excluded.windowEnd,
       repeatDays = excluded.repeatDays,
       smartWakeEnabled = excluded.smartWakeEnabled,
       dismissMethod = excluded.dismissMethod,
       sound = excluded.sound,
       enabled = excluded.enabled,
       vibrationEnabled = excluded.vibrationEnabled`,
    [
      alarm.id,
      alarm.windowStart,
      alarm.windowEnd,
      JSON.stringify(alarm.repeatDays),
      alarm.smartWakeEnabled ? 1 : 0,
      alarm.dismissMethod,
      alarm.sound,
      alarm.enabled ? 1 : 0,
      alarm.vibrationEnabled ? 1 : 0,
    ]
  );
}

export async function setAlarmNotificationId(id: string, notificationId: string | null) {
  const db = await getDb();
  await db.runAsync('UPDATE alarms SET notificationId = ? WHERE id = ?', [notificationId, id]);
}

export async function getAlarmNotificationId(id: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ notificationId: string | null }>(
    'SELECT notificationId FROM alarms WHERE id = ?',
    [id]
  );
  return row?.notificationId ?? null;
}

export async function setAlarmKitId(id: string, alarmKitId: string | null) {
  const db = await getDb();
  await db.runAsync('UPDATE alarms SET alarmKitId = ? WHERE id = ?', [alarmKitId, id]);
}

export async function getAlarmKitId(id: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ alarmKitId: string | null }>(
    'SELECT alarmKitId FROM alarms WHERE id = ?',
    [id]
  );
  return row?.alarmKitId ?? null;
}

export async function setConfirmAlarmKitId(id: string, confirmAlarmKitId: string | null) {
  const db = await getDb();
  await db.runAsync('UPDATE alarms SET confirmAlarmKitId = ? WHERE id = ?', [confirmAlarmKitId, id]);
}

export async function getConfirmAlarmKitId(id: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ confirmAlarmKitId: string | null }>(
    'SELECT confirmAlarmKitId FROM alarms WHERE id = ?',
    [id]
  );
  return row?.confirmAlarmKitId ?? null;
}

export async function deleteAlarm(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM alarms WHERE id = ?', [id]);
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    windDownEnabled: number;
    windDownOffsetMin: number;
    bedtime: string | null;
    calendarAutoShiftEnabled: number;
    autoShiftTrusted: number;
    ambientAwarenessEnabled: number;
    simulateModeEnabled: number;
    hasOnboarded: number;
    hapticsEnabled: number;
    defaultSound: string;
  }>('SELECT * FROM app_settings WHERE id = 1');
  if (!row) return DEFAULT_SETTINGS;
  const settings: AppSettings = {
    windDownEnabled: !!row.windDownEnabled,
    windDownOffsetMin: row.windDownOffsetMin,
    bedtime: row.bedtime,
    calendarAutoShiftEnabled: !!row.calendarAutoShiftEnabled,
    autoShiftTrusted: !!row.autoShiftTrusted,
    ambientAwarenessEnabled: !!row.ambientAwarenessEnabled,
    simulateModeEnabled: !!row.simulateModeEnabled,
    hasOnboarded: !!row.hasOnboarded,
    hapticsEnabled: row.hapticsEnabled == null ? true : !!row.hapticsEnabled,
    defaultSound: row.defaultSound ?? DEFAULT_SETTINGS.defaultSound,
  };
  setSettingsCache(settings);
  return settings;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  const db = await getDb();
  await db.runAsync(
    `UPDATE app_settings SET
       windDownEnabled = ?, windDownOffsetMin = ?, bedtime = ?,
       calendarAutoShiftEnabled = ?, autoShiftTrusted = ?,
       ambientAwarenessEnabled = ?, simulateModeEnabled = ?, hasOnboarded = ?,
       hapticsEnabled = ?, defaultSound = ?
     WHERE id = 1`,
    [
      next.windDownEnabled ? 1 : 0,
      next.windDownOffsetMin,
      next.bedtime,
      next.calendarAutoShiftEnabled ? 1 : 0,
      next.autoShiftTrusted ? 1 : 0,
      next.ambientAwarenessEnabled ? 1 : 0,
      next.simulateModeEnabled ? 1 : 0,
      next.hasOnboarded ? 1 : 0,
      next.hapticsEnabled ? 1 : 0,
      next.defaultSound,
    ]
  );
  setSettingsCache(next);
  return next;
}

export async function addWakeEvent(event: WakeEvent): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO wake_events (id, alarmId, date, scheduledDeadline, actualRingTime, triggeredBy, dismissedAfterSeconds)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.alarmId,
      event.date,
      event.scheduledDeadline,
      event.actualRingTime,
      event.triggeredBy,
      event.dismissedAfterSeconds,
    ]
  );
}

export async function getRecentWakeEvents(limit = 7): Promise<WakeEvent[]> {
  const db = await getDb();
  return db.getAllAsync<WakeEvent>(
    'SELECT * FROM wake_events ORDER BY date DESC LIMIT ?',
    [limit]
  );
}

/**
 * The most recent wake event recorded for this alarm on the given date
 * (default today), if any. Used to stop a same-day re-save (e.g. opening an
 * alarm from Home right after dismissing it and tapping Update, with no real
 * change) from re-arming a second ring later that same day at the *same*
 * time — see the doc comments on scheduleAlarmKitAlarm and
 * computeNextDeadline. Deliberately changing the alarm to a genuinely
 * different time later today is still honored: those call sites compare
 * this event's recorded deadline against the alarm's *current* windowEnd,
 * not just "did it ring today at all."
 */
export async function getWakeEventToday(
  alarmId: string,
  date = new Date().toISOString().slice(0, 10)
): Promise<WakeEvent | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<WakeEvent>(
    'SELECT * FROM wake_events WHERE alarmId = ? AND date = ? ORDER BY actualRingTime DESC LIMIT 1',
    [alarmId, date]
  );
  return row ?? null;
}

export async function getCustomSounds(): Promise<CustomSound[]> {
  const db = await getDb();
  return db.getAllAsync<CustomSound>('SELECT * FROM custom_sounds ORDER BY createdAt ASC');
}

export async function addCustomSound(sound: CustomSound): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO custom_sounds (id, name, filePath, createdAt) VALUES (?, ?, ?, ?)',
    [sound.id, sound.name, sound.filePath, sound.createdAt]
  );
}

export async function deleteCustomSound(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM custom_sounds WHERE id = ?', [id]);
}
