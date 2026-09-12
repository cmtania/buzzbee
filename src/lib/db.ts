import * as SQLite from 'expo-sqlite';

import { Alarm, AppSettings, DEFAULT_SETTINGS, DismissMethod, WakeEvent } from './types';

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
          notificationId TEXT
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
        CREATE TABLE IF NOT EXISTS app_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          windDownEnabled INTEGER NOT NULL,
          windDownOffsetMin INTEGER NOT NULL,
          bedtime TEXT,
          calendarAutoShiftEnabled INTEGER NOT NULL,
          autoShiftTrusted INTEGER NOT NULL,
          ambientAwarenessEnabled INTEGER NOT NULL,
          simulateModeEnabled INTEGER NOT NULL,
          hasOnboarded INTEGER NOT NULL DEFAULT 0
        );
      `);
      const settingsRow = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM app_settings WHERE id = 1'
      );
      if (!settingsRow) {
        await db.runAsync(
          `INSERT INTO app_settings (id, windDownEnabled, windDownOffsetMin, bedtime, calendarAutoShiftEnabled, autoShiftTrusted, ambientAwarenessEnabled, simulateModeEnabled, hasOnboarded)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            DEFAULT_SETTINGS.windDownEnabled ? 1 : 0,
            DEFAULT_SETTINGS.windDownOffsetMin,
            DEFAULT_SETTINGS.bedtime,
            DEFAULT_SETTINGS.calendarAutoShiftEnabled ? 1 : 0,
            DEFAULT_SETTINGS.autoShiftTrusted ? 1 : 0,
            DEFAULT_SETTINGS.ambientAwarenessEnabled ? 1 : 0,
            DEFAULT_SETTINGS.simulateModeEnabled ? 1 : 0,
            DEFAULT_SETTINGS.hasOnboarded ? 1 : 0,
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
    `INSERT INTO alarms (id, windowStart, windowEnd, repeatDays, smartWakeEnabled, dismissMethod, sound, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       windowStart = excluded.windowStart,
       windowEnd = excluded.windowEnd,
       repeatDays = excluded.repeatDays,
       smartWakeEnabled = excluded.smartWakeEnabled,
       dismissMethod = excluded.dismissMethod,
       sound = excluded.sound,
       enabled = excluded.enabled`,
    [
      alarm.id,
      alarm.windowStart,
      alarm.windowEnd,
      JSON.stringify(alarm.repeatDays),
      alarm.smartWakeEnabled ? 1 : 0,
      alarm.dismissMethod,
      alarm.sound,
      alarm.enabled ? 1 : 0,
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
  }>('SELECT * FROM app_settings WHERE id = 1');
  if (!row) return DEFAULT_SETTINGS;
  return {
    windDownEnabled: !!row.windDownEnabled,
    windDownOffsetMin: row.windDownOffsetMin,
    bedtime: row.bedtime,
    calendarAutoShiftEnabled: !!row.calendarAutoShiftEnabled,
    autoShiftTrusted: !!row.autoShiftTrusted,
    ambientAwarenessEnabled: !!row.ambientAwarenessEnabled,
    simulateModeEnabled: !!row.simulateModeEnabled,
    hasOnboarded: !!row.hasOnboarded,
  };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  const db = await getDb();
  await db.runAsync(
    `UPDATE app_settings SET
       windDownEnabled = ?, windDownOffsetMin = ?, bedtime = ?,
       calendarAutoShiftEnabled = ?, autoShiftTrusted = ?,
       ambientAwarenessEnabled = ?, simulateModeEnabled = ?, hasOnboarded = ?
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
    ]
  );
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
