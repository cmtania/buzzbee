import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { endOfDay, formatTime12h, isoMatchesTime, nextOccurrence } from './alarm-utils';
import { cancelAlarmKitAlarm, disarmConfirmationAlarm, scheduleAlarmKitAlarm } from './alarmkit';
import { getAlarmNotificationId, getWakeEventToday, setAlarmNotificationId } from './db';
import { cancelHybridTaskChain, scheduleHybridTaskChain } from './hybrid-tasks';
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
  // Hybrid Alarm: (re)arm every follow-up task attached to this alarm
  // alongside the alarm's own registration, so editing/re-saving the alarm
  // automatically cascades to its whole task chain.
  await scheduleHybridTaskChain(alarm);
  return notificationId;
}

/**
 * @param cancelTasks Also cancels this alarm's whole Hybrid Alarm task chain
 * (see cancelHybridTaskChain) — defaults to true for the common case of
 * genuinely disabling/deleting an alarm (Home's toggle-off/delete, add-edit's
 * disable/delete), where the tasks should stop firing too. `ringing.tsx`'s
 * `dismiss()` passes `false`: it calls this only to clear *today's
 * already-rung* instance of the main alarm, not to disable the alarm — the
 * follow-up tasks are meant to fire shortly after, independent of whether
 * the main alarm itself was just dismissed, so they must survive this call.
 */
export async function cancelAlarmNotification(alarmId: string, cancelTasks = true): Promise<void> {
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
  // See cancelHybridTaskChain's doc comment — this doesn't delete the task
  // rows, so re-enabling/re-saving the alarm restores the identical chain.
  if (cancelTasks) {
    await cancelHybridTaskChain(alarmId);
  }
}
