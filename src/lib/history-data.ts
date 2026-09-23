// Aggregation for History's calendar view — kept separate from db.ts's raw
// queries so history.tsx doesn't have to assemble this itself.
import { getAlarmTriggersInRange, getWakeEventsForDate, getWakeEventsInRange } from './db';

export type DaySummary = {
  /** At least one alarm rang this day (see AlarmTriggerEvent). */
  triggered: boolean;
  /** At least one of those alarms had its mission completed (see WakeEvent). */
  completed: boolean;
};

/**
 * One entry per day in `[start, end]` that had any activity — cheap enough
 * for a month grid's dots, since it's just two grouped range queries. Days
 * with no alarm at all simply have no entry (the calendar renders them
 * plain).
 */
export async function getMonthSummaries(start: string, end: string): Promise<Record<string, DaySummary>> {
  const [triggers, wakeEvents] = await Promise.all([
    getAlarmTriggersInRange(start, end),
    getWakeEventsInRange(start, end),
  ]);
  const map: Record<string, DaySummary> = {};
  for (const t of triggers) {
    map[t.date] = { triggered: true, completed: map[t.date]?.completed ?? false };
  }
  for (const w of wakeEvents) {
    map[w.date] = { triggered: true, completed: true };
  }
  return map;
}

export type DayDetail = {
  date: string;
  alarmsTriggered: number;
  missionsCompleted: number;
};

/** The full picture for one selected day, fetched only on tap (not for the whole visible month). */
export async function getDayDetail(date: string): Promise<DayDetail> {
  const [triggeredAlarmIds, wakeEvents] = await Promise.all([
    getAlarmTriggersInRange(date, date).then((rows) => rows.map((r) => r.alarmId)),
    getWakeEventsForDate(date),
  ]);

  const completedAlarmIds = [...new Set(wakeEvents.map((e) => e.alarmId))];

  return {
    date,
    alarmsTriggered: new Set(triggeredAlarmIds).size,
    missionsCompleted: completedAlarmIds.length,
  };
}
