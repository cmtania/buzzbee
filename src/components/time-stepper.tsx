import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Radii, Shadows } from '@/constants/theme';
import { formatClock } from '@/lib/alarm-utils';

import { TimePickerModal } from './time-picker-modal';

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
  const [open, setOpen] = useState(false);
  const { value: v, ampm } = formatClock(value);

  return (
    <>
      <Pressable style={[styles.box, deadline && styles.boxDeadline]} onPress={() => setOpen(true)}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.time}>
          {v}
          <Text style={styles.ampm}> {ampm}</Text>
        </Text>
      </Pressable>
      <TimePickerModal
        visible={open}
        label={label}
        value={value}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </>
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
  time: { fontFamily: Fonts.extraBold, fontSize: 24, color: Colors.ink, marginTop: 4 },
  ampm: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.inkFaint },
});
