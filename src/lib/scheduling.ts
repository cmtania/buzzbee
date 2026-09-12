import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getAlarmNotificationId, setAlarmNotificationId } from './db';
import { Alarm } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Computes the next Date this alarm's hard deadline (windowEnd) should fire,
 * honoring repeatDays. Empty repeatDays = next occurrence of windowEnd today/tomorrow (one-off).
 */
export function computeNextDeadline(alarm: Alarm, from: Date = new Date()): Date {
  const [hh, mm] = alarm.windowEnd.split(':').map(Number);

  const candidateFor = (dayOffset: number) => {
    const d = new Date(from);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hh, mm, 0, 0);
    return d;
  };

  if (alarm.repeatDays.length === 0) {
    const today = candidateFor(0);
    return today > from ? today : candidateFor(1);
  }

  for (let offset = 0; offset <= 7; offset++) {
    const candidate = candidateFor(offset);
    const dow = candidate.getDay();
    if (alarm.repeatDays.includes(dow) && candidate > from) {
      return candidate;
    }
  }
  // Fallback: shouldn't happen since we check a full week.
  return candidateFor(7);
}

export async function scheduleAlarmNotification(alarm: Alarm): Promise<string | null> {
  await cancelAlarmNotification(alarm.id);
  if (!alarm.enabled) return null;

  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  const deadline = computeNextDeadline(alarm);
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'BuzzBee',
      body: `Your hard deadline (${alarm.windowEnd}) has arrived — time to wake up!`,
      sound: Platform.OS === 'ios' ? 'default' : undefined,
      data: { alarmId: alarm.id, type: 'alarm-deadline' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: deadline,
    },
  });

  await setAlarmNotificationId(alarm.id, notificationId);
  return notificationId;
}

export async function cancelAlarmNotification(alarmId: string): Promise<void> {
  const existing = await getAlarmNotificationId(alarmId);
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing).catch(() => {});
    await setAlarmNotificationId(alarmId, null);
  }
}
