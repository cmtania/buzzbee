import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { WheelItem, WheelPicker } from './wheel-picker';

export const PICKER_HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
export const PICKER_MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0..59

const HOUR_ITEMS: WheelItem<number>[] = PICKER_HOURS.map((h) => ({ label: String(h), value: h }));
const MINUTE_ITEMS: WheelItem<number>[] = PICKER_MINUTES.map((m) => ({
  label: String(m).padStart(2, '0'),
  value: m,
}));
const AMPM_ITEMS: WheelItem<'AM' | 'PM'>[] = [
  { label: 'AM', value: 'AM' },
  { label: 'PM', value: 'PM' },
];

export function to24h(hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
  let hh = hour12 % 12;
  if (ampm === 'PM') hh += 12;
  return `${String(hh).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function from24h(time: string): { hour12: number; minute: number; ampm: 'AM' | 'PM' } {
  const [h, m] = time.split(':').map(Number);
  const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12, minute: m, ampm };
}

export function TimePickerModal({
  visible,
  label,
  value,
  onChange,
  onClose,
}: {
  visible: boolean;
  label: string;
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
}) {
  const initial = from24h(value);
  const [hour12, setHour12] = useState(initial.hour12);
  const [minute, setMinute] = useState(initial.minute);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(initial.ampm);

  function open() {
    const cur = from24h(value);
    setHour12(cur.hour12);
    setMinute(cur.minute);
    setAmpm(cur.ampm);
  }

  function confirm() {
    onChange(to24h(hour12, minute, ampm));
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={open}
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.handle} />
            <Text style={styles.title}>{label}</Text>

            <View style={styles.pickerRow}>
              <WheelPicker items={HOUR_ITEMS} value={hour12} onChange={setHour12} />
              <Text style={styles.colon}>:</Text>
              <WheelPicker items={MINUTE_ITEMS} value={minute} onChange={setMinute} />
              <WheelPicker items={AMPM_ITEMS} value={ampm} onChange={setAmpm} loop={false} />
            </View>

            <Pressable style={styles.doneBtn} onPress={confirm}>
              <Text style={styles.doneText}>Save</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </View>
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
    marginBottom: 4,
  },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  colon: { fontFamily: Fonts.extraBold, fontSize: 22, color: Colors.ink, marginHorizontal: 2 },
  doneBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 15,
    borderRadius: Radii.lg,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  doneText: { fontFamily: Fonts.extraBold, fontSize: 15, color: '#2B2420' },
});
