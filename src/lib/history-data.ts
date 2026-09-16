// Aggregation for History's calendar view — kept separate from db.ts's raw
// queries so history.tsx doesn't have to assemble this itself.
import {
  getAlarmTasks,
  getAlarmTriggersInRange,
  getTaskEvent,
  getWakeEventsForDate,
  getWakeEventsInRange,
} from './db';

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
  tasks: { taskId: string; alarmId: string; label: string; completed: boolean }[];
};

/**
 * The full picture for one selected day, fetched only on tap (not for the
 * whole visible month) since it needs per-alarm task lookups. Task
 * completion is only meaningful for alarms whose mission was actually
 * completed that day — a task chain is provisionally cancelled the moment
 * its alarm rings and only restored on a genuine dismiss (see ringing.tsx),
 * so an alarm that rang but was never dismissed has no tasks to report on.
 */
export async function getDayDetail(date: string): Promise<DayDetail> {
  const [triggeredAlarmIds, wakeEvents] = await Promise.all([
    getAlarmTriggersInRange(date, date).then((rows) => rows.map((r) => r.alarmId)),
    getWakeEventsForDate(date),
  ]);

  const completedAlarmIds = [...new Set(wakeEvents.map((e) => e.alarmId))];
  const tasks: DayDetail['tasks'] = [];
  for (const alarmId of completedAlarmIds) {
    const alarmTasks = await getAlarmTasks(alarmId);
    for (const task of alarmTasks) {
      const event = await getTaskEvent(task.id, date);
      tasks.push({ taskId: task.id, alarmId, label: task.label, completed: event?.completed ?? false });
    }
  }

  return {
    date,
    alarmsTriggered: new Set(triggeredAlarmIds).size,
    missionsCompleted: completedAlarmIds.length,
    tasks,
  };
}
