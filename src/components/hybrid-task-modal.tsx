import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { formatTime12h } from '@/lib/alarm-utils';
import { from24h, PICKER_HOURS, PICKER_MINUTES, to24h } from './time-picker-modal';
import { WheelItem, WheelPicker } from './wheel-picker';

const HOUR_ITEMS: WheelItem<number>[] = PICKER_HOURS.map((h) => ({ label: String(h), value: h }));
const MINUTE_ITEMS: WheelItem<number>[] = PICKER_MINUTES.map((m) => ({
  label: String(m).padStart(2, '0'),
  value: m,
}));
const AMPM_ITEMS: WheelItem<'AM' | 'PM'>[] = [
  { label: 'AM', value: 'AM' },
  { label: 'PM', value: 'PM' },
];

function toMinutesOfDay(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Clamps `candidate` to strictly after `minTime`, same day (no cross-midnight
 * wraparound) — a Hybrid Alarm task must ring after the alarm's own hard
 * deadline, so this is applied on every picker change rather than just
 * validated on save: the picker visibly can't be left on an invalid time.
 */
function clampAfter(candidate: string, minTime: string): string {
  const c = toMinutesOfDay(candidate);
  const min = toMinutesOfDay(minTime);
  if (c > min) return candidate;
  return minutesToTime(Math.min(min + 1, 23 * 60 + 59));
}

export function HybridTaskModal({
  visible,
  mode,
  initialLabel,
  initialTime,
  minTime,
  onSave,
  onDelete,
  onClose,
}: {
  visible: boolean;
  mode: 'add' | 'edit';
  initialLabel?: string;
  initialTime?: string;
  /** The alarm's own hard deadline (windowEnd) — the earliest a task can ring. */
  minTime: string;
  onSave: (label: string, time: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(initialLabel ?? '');
  const initial = from24h(
    clampAfter(initialTime ?? minutesToTime(Math.min(toMinutesOfDay(minTime) + 15, 23 * 60 + 59)), minTime)
  );
  const [hour12, setHour12] = useState(initial.hour12);
  const [minute, setMinute] = useState(initial.minute);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(initial.ampm);

  function reset() {
    setLabel(initialLabel ?? '');
    const time = clampAfter(
      initialTime ?? minutesToTime(Math.min(toMinutesOfDay(minTime) + 15, 23 * 60 + 59)),
      minTime
    );
    const cur = from24h(time);
    setHour12(cur.hour12);
    setMinute(cur.minute);
    setAmpm(cur.ampm);
  }

  function applyTime(nextHour12: number, nextMinute: number, nextAmpm: 'AM' | 'PM') {
    const clamped = clampAfter(to24h(nextHour12, nextMinute, nextAmpm), minTime);
    const next = from24h(clamped);
    setHour12(next.hour12);
    setMinute(next.minute);
    setAmpm(next.ampm);
  }

  function save() {
    const trimmed = label.trim();
    if (!trimmed) return;
    onSave(trimmed, to24h(hour12, minute, ampm));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onShow={reset} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.handle} />
            <Text style={styles.title}>{mode === 'edit' ? 'Edit Task' : 'Add Task'}</Text>

            <Text style={styles.fieldLabel}>Task name</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={(v) => setLabel(v.slice(0, 40))}
              placeholder="e.g. Taking a bath"
              placeholderTextColor={Colors.inkFaint}
              autoFocus={mode === 'add'}
            />

            <Text style={styles.fieldLabel}>Time — after {formatTime12h(minTime)}</Text>
            <View style={styles.pickerRow}>
              <WheelPicker
                items={HOUR_ITEMS}
                value={hour12}
                onChange={(v) => applyTime(v, minute, ampm)}
              />
              <Text style={styles.colon}>:</Text>
              <WheelPicker
                items={MINUTE_ITEMS}
                value={minute}
                onChange={(v) => applyTime(hour12, v, ampm)}
              />
              <WheelPicker
                items={AMPM_ITEMS}
                value={ampm}
                onChange={(v) => applyTime(hour12, minute, v)}
                loop={false}
              />
            </View>

            <View style={styles.actions}>
              {mode === 'edit' && onDelete && (
                <Pressable style={styles.deleteBtn} onPress={onDelete}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.saveBtn, !label.trim() && styles.saveBtnDisabled]}
                disabled={!label.trim()}
                onPress={save}>
                <Text style={styles.saveText}>{mode === 'edit' ? 'Save' : 'Create My Task'}</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,36,32,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingHorizontal: Spacing.xl,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.trackOff,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 17,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 16,
  },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  colon: { fontFamily: Fonts.extraBold, fontSize: 20, color: Colors.ink, marginHorizontal: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 12 },
  deleteBtn: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: Radii.lg,
    backgroundColor: Colors.trackOff,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { fontFamily: Fonts.extraBold, fontSize: 15, color: Colors.danger },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    paddingVertical: 15,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontFamily: Fonts.extraBold, fontSize: 15, color: '#2B2420' },
});
