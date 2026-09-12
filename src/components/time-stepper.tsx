import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radii, Shadows } from '@/constants/theme';
import { formatClock } from '@/lib/alarm-utils';

function addMinutes(time: string, delta: number): string {
  const [hh, mm] = time.split(':').map(Number);
  let total = (hh * 60 + mm + delta + 24 * 60) % (24 * 60);
  const nextHH = Math.floor(total / 60);
  const nextMM = total % 60;
  return `${String(nextHH).padStart(2, '0')}:${String(nextMM).padStart(2, '0')}`;
}

export function TimeStepper({
  label,
  value,
  onChange,
  deadline,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  deadline?: boolean;
}) {
  const { value: v, ampm } = formatClock(value);
  return (
    <View style={[styles.box, deadline && styles.boxDeadline]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.time}>
        {v}
        <Text style={styles.ampm}> {ampm}</Text>
      </Text>
      <View style={styles.steppers}>
        <Pressable style={styles.stepBtn} onPress={() => onChange(addMinutes(value, -15))} hitSlop={6}>
          <Text style={styles.stepText}>−15m</Text>
        </Pressable>
        <Pressable style={styles.stepBtn} onPress={() => onChange(addMinutes(value, 15))} hitSlop={6}>
          <Text style={styles.stepText}>+15m</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    padding: 14,
    ...Shadows.card,
  },
  boxDeadline: {
    backgroundColor: Colors.accent + '26',
  },
  label: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.inkFaint },
  time: { fontFamily: Fonts.extraBold, fontSize: 22, color: Colors.ink, marginTop: 4 },
  ampm: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.inkFaint },
  steppers: { flexDirection: 'row', gap: 8, marginTop: 10 },
  stepBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    backgroundColor: Colors.trackOff,
    alignItems: 'center',
  },
  stepText: { fontFamily: Fonts.bold, fontSize: 11.5, color: Colors.ink },
});
