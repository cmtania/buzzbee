// "Task after you're awake": scheduling/cancellation for a chain of
// follow-up tasks attached to an alarm — see PLAN.md's "Hybrid Alarm"
// section and the AlarmTask type's doc comment. Called from scheduling.ts's
// scheduleAlarmNotification/cancelAlarmNotification, the single choke point
// every call site (add-edit save, Home's toggle/delete, ringing.tsx's
// dismiss) already goes through to arm/disarm an alarm — so no other call
// site needs to know these tasks exist.
//
// Deliberately a plain local notification only, NOT an AlarmKit alarm: an
// earlier version scheduled a real AlarmKit registration per task (so it
// could ring through Silent mode and launch a dedicated ringing screen), but
// that read as "another alarm" going off after the user was already awake
// and had dismissed the main one — confusing and unwanted. A task is just a
// reminder for something you do after you're up, so a normal notification
// (tap it or ignore it, no full-screen ring, no mission) is the whole
// mechanism now.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { nextOccurrence } from './alarm-utils';
import { getAlarmTaskNotificationId, getAlarmTasks, setAlarmTaskNotificationId } from './db';
import { isSoundName, NOTIFICATION_SOUND_FILES } from './sounds';
import { Alarm, AlarmTask } from './types';

// Duplicated from scheduling.ts's ensureNotificationPermission rather than
// imported from there, to avoid a circular import (scheduling.ts imports
// this module's scheduleHybridTaskChain/cancelHybridTaskChain).
async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function cancelTaskNotification(task: AlarmTask): Promise<void> {
  const existing = await getAlarmTaskNotificationId(task.id);
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing).catch(() => {});
    await setAlarmTaskNotificationId(task.id, null);
  }
}

/**
 * The task's label goes into the notification's `title` (with a fixed
 * "BuzzBee" in `subtitle`) so it's the bold, most-prominent text on the Lock
 * Screen — showing that label is the whole point of the feature, even though
 * it's "just" a notification now. Tapping it opens task-check.tsx (see
 * _layout.tsx's notification-response handler) to ask whether the task got
 * done — `label` rides along in `data` so that screen doesn't need a DB
 * lookup just to show what it's asking about.
 */
async function scheduleTaskNotification(alarm: Alarm, task: AlarmTask): Promise<void> {
  await cancelTaskNotification(task);
  if (!alarm.enabled || !task.enabled) return;

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const iosSound = isSoundName(alarm.sound) ? NOTIFICATION_SOUND_FILES[alarm.sound] : 'default';
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: task.label,
      subtitle: 'BuzzBee',
      body: 'Tap to say whether you got this done.',
      sound: Platform.OS === 'ios' ? iosSound : 'default',
      data: { type: 'task-reminder', alarmId: alarm.id, taskId: task.id, label: task.label },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: nextOccurrence(task.time, alarm.repeatDays),
    },
  });

  await setAlarmTaskNotificationId(task.id, notificationId);
}

export async function scheduleHybridTaskChain(alarm: Alarm): Promise<void> {
  const tasks = await getAlarmTasks(alarm.id);
  for (const task of tasks) {
    await scheduleTaskNotification(alarm, task);
  }
}

/**
 * Cancels every scheduled notification for this alarm's task chain without
 * deleting the alarm_tasks rows themselves — toggling the alarm back on (or
 * re-saving it) restores the identical chain. Row deletion only happens from
 * add-edit.tsx's delete flow, alongside deleteAlarm.
 */
export async function cancelHybridTaskChain(alarmId: string): Promise<void> {
  const tasks = await getAlarmTasks(alarmId);
  for (const task of tasks) {
    await cancelTaskNotification(task);
  }
}
