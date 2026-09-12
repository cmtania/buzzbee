import * as Notifications from 'expo-notifications';

import { AppSettings } from './types';

/** Next Date the wind-down reminder (bedtime minus offset) should fire. */
export function nextBedtimeReminder(settings: AppSettings, now: Date = new Date()): Date | null {
  if (!settings.windDownEnabled || !settings.bedtime) return null;
  const [hh, mm] = settings.bedtime.split(':').map(Number);
  const reminderMinutes = ((hh * 60 + mm - settings.windDownOffsetMin) % 1440 + 1440) % 1440;
  const d = new Date(now);
  d.setHours(Math.floor(reminderMinutes / 60), reminderMinutes % 60, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d;
}

export async function rescheduleWindDownNotification(settings: AppSettings): Promise<void> {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter((n) => (n.content.data as { type?: string } | undefined)?.type === 'wind-down')
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );

  const when = nextBedtimeReminder(settings);
  if (!when) return;

  const granted = (await Notifications.getPermissionsAsync()).granted;
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Wind-Down time',
      body: "Bedtime's coming up — want to start winding down?",
      data: { type: 'wind-down' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });
}
