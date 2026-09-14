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

/** Next Date the actual bedtime itself lands on (no offset). */
export function nextBedtime(settings: AppSettings, now: Date = new Date()): Date | null {
  if (!settings.windDownEnabled || !settings.bedtime) return null;
  const [hh, mm] = settings.bedtime.split(':').map(Number);
  const d = new Date(now);
  d.setHours(hh, mm, 0, 0);
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

  const reminderAt = nextBedtimeReminder(settings);
  const bedtimeAt = nextBedtime(settings);
  if (!reminderAt && !bedtimeAt) return;

  const granted = (await Notifications.getPermissionsAsync()).granted;
  if (!granted) return;

  // Two distinct notifications: an early heads-up (bedtime minus the chosen
  // offset), and a second one right at the actual bedtime — the offset
  // reminder alone doesn't tell you when bedtime itself actually arrives.
  // Both share `type: 'wind-down'` so _layout.tsx's tap handler and the
  // cancel-before-reschedule filter above treat them the same way; `kind`
  // just distinguishes them for clarity.
  if (reminderAt) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bedtime Reminder',
        body: "Bedtime's coming up — want to start winding down?",
        data: { type: 'wind-down', kind: 'reminder' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderAt },
    });
  }

  if (bedtimeAt) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "It's bedtime",
        body: 'Time to put the phone down and get some sleep.',
        data: { type: 'wind-down', kind: 'bedtime' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: bedtimeAt },
    });
  }
}
