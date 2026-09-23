import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { endOfDay, formatTime12h, isoMatchesTime, nextOccurrence } from './alarm-utils';
import { cancelAlarmKitAlarm, disarmConfirmationAlarm, scheduleAlarmKitAlarm } from './alarmkit';
import { getAlarmNotificationId, getWakeEventToday, setAlarmNotificationId } from './db';
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
 * The next Date this alarm's backup notification should fire, honoring
 * repeatDays — windowStart for a Wake Window alarm (matches AlarmKit's own
 * trigger point, see scheduleAlarmKitAlarm), windowEnd for a fixed-time one.
 * Empty repeatDays = next occurrence today/tomorrow (one-off).
 */
export function computeNextTrigger(alarm: Alarm, from: Date = new Date()): Date {
  const triggerTime = alarm.smartWakeEnabled ? alarm.windowStart : alarm.windowEnd;
  return nextOccurrence(triggerTime, alarm.repeatDays, from);
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

  // Same same-day-re-save guard as scheduleAlarmKitAlarm — if today's
  // occurrence already rang and was dismissed *at this same time*, skip
  // straight to the next one instead of re-arming this backup notification
  // for later today too. A deliberate time change to later today is still
  // honored (see scheduleAlarmKitAlarm's doc comment for the full reasoning).
  const triggerTime = alarm.smartWakeEnabled ? alarm.windowStart : alarm.windowEnd;
  const todayEvent = await getWakeEventToday(alarm.id);
  const alreadyRangAtThisTime = !!todayEvent && isoMatchesTime(todayEvent.scheduledDeadline, triggerTime);
  const deadline = computeNextTrigger(alarm, alreadyRangAtThisTime ? endOfDay(new Date()) : undefined);
  // Android routes notification sound through notification channels rather
  // than this per-notification field (see expo-notifications' docs) — real
  // per-alarm custom sound there is a later-milestone item, same as the rest
  // of Android support. iOS honors a bundled custom sound filename directly.
  const iosSound = isSoundName(alarm.sound) ? NOTIFICATION_SOUND_FILES[alarm.sound] : 'default';
  const body = alarm.smartWakeEnabled
    ? `Your wake window (${formatTime12h(alarm.windowStart)}) has opened — time to wake up!`
    : `Your hard deadline (${formatTime12h(alarm.windowEnd)}) has arrived — time to wake up!`;
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'BuzzBee',
      body,
      sound: Platform.OS === 'ios' ? iosSound : 'default',
      data: {
        alarmId: alarm.id,
        type: 'alarm-deadline',
        triggeredBy: alarm.smartWakeEnabled ? 'window-start' : 'hard-deadline',
      },
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
  // cancelScheduledNotificationAsync above only stops one that hasn't fired
  // yet — this alarm's backup notification is scheduled for the exact same
  // moment as AlarmKit's own native alert (see scheduleAlarmNotification), so
  // on a genuine dismiss it has very likely already been delivered to
  // Notification Center by the time this runs. Left alone, it would sit
  // there tappable indefinitely; _layout.tsx's alarm-deadline handler now
  // guards against acting on it, but clearing it here too means there's no
  // stale duplicate notification to see at all.
  await Notifications.getPresentedNotificationsAsync()
    .then((presented) =>
      Promise.all(
        presented
          .filter((n) => n.request.content.data?.type === 'alarm-deadline' && n.request.content.data?.alarmId === alarmId)
          .map((n) => Notifications.dismissNotificationAsync(n.request.identifier).catch(() => {}))
      )
    )
    .catch(() => {});
}
