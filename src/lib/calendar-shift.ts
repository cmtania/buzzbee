import { EntityTypes, getCalendars, listEvents, requestCalendarPermissions } from 'expo-calendar';
import * as Notifications from 'expo-notifications';

import { formatTime12h } from './alarm-utils';
import { getAlarms, getSettings, saveAlarm } from './db';
import { scheduleAlarmNotification } from './scheduling';
import { Alarm } from './types';

// How much buffer is needed between an alarm's hard deadline and the next
// day's first calendar event before we consider it a conflict worth nudging
// about.
const BUFFER_MIN = 45;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export type ConflictResult =
  | { conflict: false }
  | {
      conflict: true;
      firstEventTitle: string;
      firstEventStart: Date;
      suggestedStart: string;
      suggestedEnd: string;
    };

/** Does `alarm`'s hard deadline leave enough buffer before tomorrow's first calendar event? */
export async function checkTomorrowConflict(alarm: Alarm): Promise<ConflictResult> {
  const perm = await requestCalendarPermissions();
  if (!perm.granted) return { conflict: false };

  const calendars = await getCalendars(EntityTypes.EVENT);
  if (calendars.length === 0) return { conflict: false };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayStart = new Date(tomorrow);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(tomorrow);
  dayEnd.setHours(23, 59, 59, 999);

  const events = await listEvents(calendars, dayStart, dayEnd);
  const timed = events.filter((e) => !e.allDay);
  if (timed.length === 0) return { conflict: false };

  const earliest = timed.reduce((min, e) =>
    new Date(e.startDate) < new Date(min.startDate) ? e : min
  );
  const eventStart = new Date(earliest.startDate);

  const [eh, em] = alarm.windowEnd.split(':').map(Number);
  const deadlineTomorrow = new Date(tomorrow);
  deadlineTomorrow.setHours(eh, em, 0, 0);

  const bufferMs = BUFFER_MIN * 60000;
  const shortfallMs = bufferMs - (eventStart.getTime() - deadlineTomorrow.getTime());

  if (shortfallMs <= 0) return { conflict: false };

  const shiftMin = Math.ceil(shortfallMs / 60000);
  return {
    conflict: true,
    firstEventTitle: earliest.title || 'your first event',
    firstEventStart: eventStart,
    suggestedStart: minutesToTime(timeToMinutes(alarm.windowStart) - shiftMin),
    suggestedEnd: minutesToTime(timeToMinutes(alarm.windowEnd) - shiftMin),
  };
}

const ranForDate = new Set<string>();
/** Earliest local hour (24h) the daily check may run: 13 = 1:00 PM. */
const CHECK_FROM_HOUR = 13;

/**
 * Checks every enabled, calendar-auto-shift-eligible alarm against tomorrow's
 * calendar and either auto-applies a shift (if trusted) or sends a
 * confirm-first nudge notification. Intended to be called while the app is
 * foregrounded in the evening — see PLAN.md's Known Technical Risk section on
 * why this isn't (yet) a true background task.
 */
export async function runEveningCalendarCheck(now: Date = new Date()): Promise<void> {
  // Runs from 1:00 PM to 11:59 PM local time — early enough that the nudge
  // arrives while there's still plenty of the day left to act on it.
  if (now.getHours() < CHECK_FROM_HOUR) return;
  // Local calendar date, not toISOString() (UTC): west of UTC, a 1 PM–midnight
  // window crosses the UTC date line, so a UTC key could let the check run
  // twice in one local afternoon/evening.
  const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  if (ranForDate.has(todayKey)) return;

  const settings = await getSettings();
  if (!settings.calendarAutoShiftEnabled) return;
  ranForDate.add(todayKey);

  const alarms = (await getAlarms()).filter((a) => a.enabled);
  for (const alarm of alarms) {
    const result = await checkTomorrowConflict(alarm);
    if (!result.conflict) continue;

    if (settings.autoShiftTrusted) {
      const updated: Alarm = {
        ...alarm,
        windowStart: result.suggestedStart,
        windowEnd: result.suggestedEnd,
      };
      await saveAlarm(updated);
      await scheduleAlarmNotification(updated);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'BuzzBee shifted your alarm',
          body: `Tomorrow's ${result.firstEventTitle} is early, so I moved your window to ${formatTime12h(result.suggestedStart)}–${formatTime12h(result.suggestedEnd)}.`,
          data: { type: 'info' },
        },
        trigger: null,
      });
    } else {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Shift your wake window?',
          body: `Tomorrow's ${result.firstEventTitle} is at ${result.firstEventStart.toLocaleTimeString(
            [],
            { hour: 'numeric', minute: '2-digit', hour12: true }
          )} — move your window to ${formatTime12h(result.suggestedStart)}–${formatTime12h(result.suggestedEnd)}?`,
          data: {
            type: 'calendar-nudge',
            alarmId: alarm.id,
            suggestedStart: result.suggestedStart,
            suggestedEnd: result.suggestedEnd,
          },
        },
        trigger: null,
      });
    }
  }
}
