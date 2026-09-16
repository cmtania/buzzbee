import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HybridTaskModal } from '@/components/hybrid-task-modal';
import { ChevronRight, LongArrowRight, TrashIcon } from '@/components/icons';
import { SwipeToDismissSheet } from '@/components/swipe-to-dismiss-sheet';
import { TimeStepper } from '@/components/time-stepper';
import { Toggle } from '@/components/toggle';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { dayShortLabel, formatTime12h } from '@/lib/alarm-utils';
import { getCustomSounds, soundDisplayName } from '@/lib/custom-sounds';
import { replaceAlarmTasks, saveAlarm } from '@/lib/db';
import { genId } from '@/lib/id';
import { MissionIcon, missionLabel, missionSubtitle } from '@/lib/mission-meta';
import { cancelAlarmNotification, scheduleAlarmNotification } from '@/lib/scheduling';
import { AlarmTask, CustomSound, MAX_HYBRID_TASKS } from '@/lib/types';

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun display order

/** Minutes from the alarm's hard deadline to this task's time, wrapping past
 * midnight — used only for display ordering (see the Hybrid Alarm task list
 * below), not to block saving an out-of-order or cross-midnight chain. */
function minutesAfterDeadline(taskTime: string, deadline: string): number {
  const [th, tm] = taskTime.split(':').map(Number);
  const [dh, dm] = deadline.split(':').map(Number);
  return ((th * 60 + tm - (dh * 60 + dm) + 1440) % 1440);
}

export default function AddEditScreen() {
  const router = useRouter();
  const { draft, setDraft, tasks, setTasks } = useAlarmDraft();
  const isEditing = draft.id !== '';
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort(
        (a, b) => minutesAfterDeadline(a.time, draft.windowEnd) - minutesAfterDeadline(b.time, draft.windowEnd)
      ),
    [tasks, draft.windowEnd]
  );

  // Adding/editing a task happens through a modal (HybridTaskModal) rather
  // than inline rows — `taskModalTarget` is the task being edited, or null
  // while the modal is closed or adding a brand-new one.
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalTarget, setTaskModalTarget] = useState<AlarmTask | null>(null);

  function openAddTask() {
    if (tasks.length >= MAX_HYBRID_TASKS) return;
    setTaskModalTarget(null);
    setTaskModalOpen(true);
  }

  function openEditTask(task: AlarmTask) {
    setTaskModalTarget(task);
    setTaskModalOpen(true);
  }

  function updateTask(id: string, patch: Partial<AlarmTask>) {
    setTasks((t) => t.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }

  function removeTask(id: string) {
    setTasks((t) => t.filter((task) => task.id !== id));
  }

  function handleTaskModalSave(label: string, time: string) {
    if (taskModalTarget) {
      updateTask(taskModalTarget.id, { label, time });
    } else {
      const newTask: AlarmTask = {
        id: genId('task'),
        alarmId: draft.id,
        label,
        time,
        sortOrder: tasks.length,
        enabled: true,
      };
      setTasks((t) => [...t, newTask]);
    }
    setTaskModalOpen(false);
  }

  function handleTaskModalDelete() {
    if (taskModalTarget) removeTask(taskModalTarget.id);
    setTaskModalOpen(false);
  }

  useFocusEffect(
    useCallback(() => {
      getCustomSounds().then(setCustomSounds);
    }, [])
  );
  // Guards against the same TimePickerModal-vs-sheet conflict fixed in
  // wind-down-settings.tsx: RN's <Modal> touches leak through to this
  // sheet's swipe/tap-outside dismiss underneath it, so both need to be
  // disabled while any of this screen's time pickers are open.
  const [pickerOpen, setPickerOpen] = useState(false);

  function toggleDay(dow: number) {
    setDraft((d) => ({
      ...d,
      repeatDays: d.repeatDays.includes(dow)
        ? d.repeatDays.filter((x) => x !== dow)
        : [...d.repeatDays, dow].sort(),
    }));
  }

  async function handleSave() {
    const alarm = draft.id ? draft : { ...draft, id: genId('alarm') };
    await saveAlarm(alarm);
    // Persist the task list in its actual chronological display order (see
    // sortedTasks/minutesAfterDeadline above) so a future edit reopens it in
    // the same order it visually appeared in when saved.
    const orderedTasks = tasks
      .filter((task) => task.label.trim() !== '')
      .sort(
        (a, b) => minutesAfterDeadline(a.time, alarm.windowEnd) - minutesAfterDeadline(b.time, alarm.windowEnd)
      )
      .map((task, i) => ({ ...task, alarmId: alarm.id, sortOrder: i }));
    await replaceAlarmTasks(alarm.id, orderedTasks);
    if (alarm.enabled) await scheduleAlarmNotification(alarm);
    else await cancelAlarmNotification(alarm.id);
    router.back();
  }

  async function handleCancel() {
    router.back();
  }

  return (
    // Plain View, not Pressable — tapping the dimmed backdrop no longer
    // closes this sheet (per explicit request); dismissal is now only via
    // the header's swipe-down, the Cancel button, or the hardware/system
    // back gesture.
    <View style={styles.backdrop}>
      <SwipeToDismissSheet
        onDismiss={handleCancel}
        style={styles.sheet}
        disabled={pickerOpen}
        header={
          <>
            <View style={styles.handle} />
            <View style={styles.topbar}>
              <Text style={styles.title}>{isEditing ? 'Edit Alarm' : 'New Alarm'}</Text>
            </View>
          </>
        }>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          <View style={styles.rowCard}>
            <View style={styles.smartRow}>
              <Text style={styles.smartLabel}>Wake Window</Text>
              <Toggle
                value={draft.smartWakeEnabled}
                onChange={(v) =>
                  setDraft((d) => {
                    if (v) {
                      // Turning Wake Window back on: give it a real window
                      // instead of a zero-width one collapsed to a point.
                      if (d.windowStart === d.windowEnd) {
                        const [h, m] = d.windowEnd.split(':').map(Number);
                        const startMin = (h * 60 + m - 30 + 1440) % 1440;
                        const start = `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`;
                        return { ...d, smartWakeEnabled: v, windowStart: start };
                      }
                      return { ...d, smartWakeEnabled: v };
                    }
                    // Turning it off: a fixed-time alarm is one time, not a
                    // range — collapse to the deadline so Home shows a
                    // single time instead of a stale-looking window.
                    return { ...d, smartWakeEnabled: v, windowStart: d.windowEnd };
                  })
                }
              />
            </View>
            <View style={styles.smartExplainer}>
              <Text style={styles.buzzTag}>Buzz says</Text>
              <Text style={styles.explainerText}>
                Instead of one fixed time, set a window below. I’ll start ringing gently the
                moment it opens and build up to full volume by your hard deadline — so you’re
                eased awake, never overslept.
              </Text>
            </View>
          </View>

          {draft.smartWakeEnabled ? (
            <View>
              <Text style={styles.sectionLabel}>Wake window</Text>
              <View style={styles.timeRow}>
                <TimeStepper
                  label="Starts"
                  value={draft.windowStart}
                  onChange={(v) => setDraft((d) => ({ ...d, windowStart: v }))}
                  bigFont
                  onOpenChange={setPickerOpen}
                />
                <View style={styles.timeSep}>
                  <LongArrowRight size={16} color={Colors.inkFaint} />
                </View>
                <TimeStepper
                  label="Hard deadline"
                  value={draft.windowEnd}
                  onChange={(v) => setDraft((d) => ({ ...d, windowEnd: v }))}
                  deadline
                  bigFont
                  onOpenChange={setPickerOpen}
                />
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.sectionLabel}>Alarm time</Text>
              <View style={styles.fixedTimeCenterWrap}>
                <TimeStepper
                  label="Rings at"
                  value={draft.windowEnd}
                  onChange={(v) => setDraft((d) => ({ ...d, windowStart: v, windowEnd: v }))}
                  large
                  onOpenChange={setPickerOpen}
                />
              </View>
            </View>
          )}

          <View>
            <Text style={styles.sectionLabel}>Repeat</Text>
            <View style={styles.days}>
              {ALL_DAYS.map((dow) => {
                const active = draft.repeatDays.includes(dow);
                return (
                  <Pressable
                    key={dow}
                    style={[styles.day, active && styles.dayActive]}
                    onPress={() => toggleDay(dow)}>
                    <Text style={[styles.dayText, active && styles.dayTextActive]}>
                      {dayShortLabel(dow)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={styles.sectionLabel}>Choose a Mission</Text>
            <Pressable
              style={[styles.rowCard, styles.missionRow]}
              onPress={() => router.push('/choose-mission')}>
              <View style={styles.missionIconWrap}>
                <MissionIcon method={draft.dismissMethod} size={20} color={Colors.accentDeep} />
              </View>
              <View style={styles.missionMain}>
                <Text style={styles.missionTitle}>{missionLabel(draft.dismissMethod)}</Text>
                <Text style={styles.missionSub}>{missionSubtitle(draft.dismissMethod)}</Text>
              </View>
              <ChevronRight />
            </Pressable>
          </View>

          <View>
            <Text style={styles.sectionLabel}>Task after you’re awake</Text>
            <View style={styles.rowCard}>
              <Text style={styles.buzzTag}>Buzz says</Text>
              <Text style={styles.explainerText}>
                Chain tasks after your deadline — I’ll remind you for each one and show its name
                right on your Lock Screen.
              </Text>
            </View>
            {sortedTasks.map((task) => (
              <View key={task.id} style={styles.taskRow}>
                <Pressable style={styles.taskMain} onPress={() => openEditTask(task)}>
                  <Text style={styles.taskLabel} numberOfLines={1}>
                    {task.label}
                  </Text>
                  <Text style={styles.taskTime}>{formatTime12h(task.time)}</Text>
                </Pressable>
                <Pressable style={styles.taskEditBtn} onPress={() => openEditTask(task)} hitSlop={8}>
                  <Text style={styles.taskEditText}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => removeTask(task.id)} hitSlop={8} style={styles.taskDelete}>
                  <TrashIcon size={16} color={Colors.danger} />
                </Pressable>
              </View>
            ))}
            {tasks.length < MAX_HYBRID_TASKS ? (
              <Pressable style={styles.addTaskBtn} onPress={openAddTask}>
                <Text style={styles.addTaskText}>+ Add Task</Text>
              </Pressable>
            ) : (
              <Text style={styles.hint}>Up to {MAX_HYBRID_TASKS} tasks</Text>
            )}
          </View>

          <HybridTaskModal
            visible={taskModalOpen}
            mode={taskModalTarget ? 'edit' : 'add'}
            initialLabel={taskModalTarget?.label}
            initialTime={taskModalTarget?.time}
            minTime={draft.windowEnd}
            onSave={handleTaskModalSave}
            onDelete={taskModalTarget ? handleTaskModalDelete : undefined}
            onClose={() => setTaskModalOpen(false)}
          />

          <Pressable
            style={[styles.rowCard, styles.soundRow]}
            onPress={() => router.push('/choose-sound')}>
            <Text style={styles.soundLabel}>Sound</Text>
            <View style={styles.soundRight}>
              <Text style={styles.soundValue} numberOfLines={1}>
                {soundDisplayName(draft.sound, customSounds)}
              </Text>
              <ChevronRight />
            </View>
          </Pressable>

          <View style={[styles.rowCard, styles.vibrateRow]}>
            <Text style={styles.soundLabel}>Vibrate</Text>
            <Toggle
              value={draft.vibrationEnabled}
              onChange={(v) => setDraft((d) => ({ ...d, vibrationEnabled: v }))}
            />
          </View>

          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>{isEditing ? 'Update My Alarm' : 'Create My Alarm'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </SwipeToDismissSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,36,32,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  // flexShrink: 1 on both this and `scroll` below is what actually makes the
  // sheet's maxHeight cap work with a growing body (e.g. the Hybrid Alarm
  // task list): RN's default flexShrink is 0 (unlike web's 1), so without
  // this, content taller than maxHeight doesn't shrink to fit — it just
  // overflows past the sheet's box, pushing the footer (Cancel/Save) below
  // the screen entirely instead of leaving it reachable via a scrollable body.
  safeArea: { flexShrink: 1 },
  scroll: { flexShrink: 1 },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.trackOff,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  topbar: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, alignItems: 'center' },
  title: { fontFamily: Fonts.extraBold, fontSize: 17, color: Colors.ink },
  body: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 24 },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  timeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  fixedTimeCenterWrap: { alignItems: 'center' },
  timeSep: { flexShrink: 0 },
  hint: { fontSize: 12.5, color: Colors.inkFaint, marginTop: 10, lineHeight: 17, fontFamily: Fonts.medium },
  rowCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    padding: 14,
    ...Shadows.card,
  },
  smartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smartLabel: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.ink },
  smartExplainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.trackOff,
  },
  buzzTag: {
    fontFamily: Fonts.extraBold,
    fontSize: 11,
    color: Colors.accentDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  explainerText: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.inkSoft, lineHeight: 17 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.trackOff,
  },
  dayActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  dayText: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.inkFaint },
  dayTextActive: { color: Colors.ink },
  missionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  missionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionMain: { flex: 1, minWidth: 0 },
  missionTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.ink },
  missionSub: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.inkFaint, marginTop: 2 },
  soundRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vibrateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  soundLabel: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.ink },
  soundRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginLeft: 12 },
  soundValue: { flexShrink: 1, fontFamily: Fonts.semiBold, fontSize: 14.5, color: Colors.inkFaint, textAlign: 'right' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    padding: 12,
    marginTop: 10,
    ...Shadows.card,
  },
  taskMain: { flex: 1, minWidth: 0 },
  taskLabel: { fontFamily: Fonts.bold, fontSize: 14.5, color: Colors.ink },
  taskTime: { fontFamily: Fonts.semiBold, fontSize: 12.5, color: Colors.inkFaint, marginTop: 2 },
  taskEditBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    backgroundColor: Colors.accent + '26',
  },
  taskEditText: { fontFamily: Fonts.bold, fontSize: 12.5, color: Colors.accentDeep },
  taskDelete: { padding: 4 },
  addTaskBtn: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    borderColor: Colors.trackOff,
    borderStyle: 'dashed',
  },
  addTaskText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.accentDeep },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Colors.trackOff,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontFamily: Fonts.extraBold, fontSize: 15.5, color: Colors.ink },
  saveBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  saveText: { fontFamily: Fonts.extraBold, fontSize: 15.5, color: '#2B2420' },
});
