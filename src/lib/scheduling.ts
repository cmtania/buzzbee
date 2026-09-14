import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { nextOccurrence } from './alarm-utils';
import { cancelAlarmKitAlarm, disarmConfirmationAlarm, scheduleAlarmKitAlarm } from './alarmkit';
import { getAlarmNotificationId, setAlarmNotificationId } from './db';
import { isSoundName, NOTIFICATION_SOUND_FILES } from './sounds';
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
 * The next Date this alarm's hard deadline (windowEnd) should fire, honoring
 * repeatDays. Empty repeatDays = next occurrence of windowEnd today/tomorrow
 * (one-off).
 */
export function computeNextDeadline(alarm: Alarm, from: Date = new Date()): Date {
  return nextOccurrence(alarm.windowEnd, alarm.repeatDays, from);
}

export async function scheduleAlarmNotification(alarm: Alarm): Promise<string | null> {
  await cancelAlarmNotification(alarm.id);
  // AlarmKit is the reliable, force-quit-surviving path on iOS 26+ (the
  // app's whole minimum OS now); the plain notification below stays as a
  // defense-in-depth fallback in case AlarmKit scheduling ever fails.
  await scheduleAlarmKitAlarm(alarm);
  if (!alarm.enabled) return null;

  const granted = await ensureNotificationPermission();
  if (!granted) return null;

  const deadline = computeNextDeadline(alarm);
  // Android routes notification sound through notification channels rather
  // than this per-notification field (see expo-notifications' docs) — real
  // per-alarm custom sound there is a later-milestone item, same as the rest
  // of Android support. iOS honors a bundled custom sound filename directly.
  const iosSound = isSoundName(alarm.sound) ? NOTIFICATION_SOUND_FILES[alarm.sound] : 'default';
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'BuzzBee',
      body: `Your hard deadline (${alarm.windowEnd}) has arrived — time to wake up!`,
      sound: Platform.OS === 'ios' ? iosSound : 'default',
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
  await cancelAlarmKitAlarm(alarmId);
  // Covers the edge case of deleting/disabling an alarm while it's actively
  // ringing — otherwise a stray confirmation safety-net alarm (see
  // armConfirmationAlarm) could still fire later for an alarm that no
  // longer exists or was turned off. A no-op in the vastly more common case
  // where no confirmation alarm is armed.
  await disarmConfirmationAlarm(alarmId);
  const existing = await getAlarmNotificationId(alarmId);
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing).catch(() => {});
    await setAlarmNotificationId(alarmId, null);
  }
}
