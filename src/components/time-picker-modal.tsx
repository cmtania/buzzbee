import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0..59

function to24h(hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
  let hh = hour12 % 12;
  if (ampm === 'PM') hh += 12;
  return `${String(hh).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function from24h(time: string): { hour12: number; minute: number; ampm: 'AM' | 'PM' } {
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
              <Picker
                style={styles.picker}
                itemStyle={styles.pickerItem}
                selectedValue={hour12}
                onValueChange={(v) => setHour12(Number(v))}>
                {HOURS.map((h) => (
                  <Picker.Item key={h} label={String(h)} value={h} color={pickerTextColor()} />
                ))}
              </Picker>
              <Text style={styles.colon}>:</Text>
              <Picker
                style={styles.picker}
                itemStyle={styles.pickerItem}
                selectedValue={minute}
                onValueChange={(v) => setMinute(Number(v))}>
                {MINUTES.map((m) => (
                  <Picker.Item
                    key={m}
                    label={String(m).padStart(2, '0')}
                    value={m}
                    color={pickerTextColor()}
                  />
                ))}
              </Picker>
              <Picker
                style={styles.picker}
                itemStyle={styles.pickerItem}
                selectedValue={ampm}
                onValueChange={(v) => setAmpm(v as 'AM' | 'PM')}>
                <Picker.Item label="AM" value="AM" color={pickerTextColor()} />
                <Picker.Item label="PM" value="PM" color={pickerTextColor()} />
              </Picker>
            </View>

            <Pressable style={styles.doneBtn} onPress={confirm}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

function pickerTextColor() {
  return Platform.OS === 'ios' ? Colors.ink : undefined;
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
  picker: { flex: 1, height: Platform.OS === 'ios' ? 180 : 52 },
  pickerItem: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.ink, height: 180 },
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
