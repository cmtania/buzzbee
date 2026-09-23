import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';

import { Colors, Fonts, Radii, Shadows } from '@/constants/theme';
import { formatClock } from '@/lib/alarm-utils';

import { TimePickerModal } from './time-picker-modal';

export function TimeStepper({
  label,
  value,
  onChange,
  deadline,
  large,
  bare,
  bigFont,
  onOpenChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  deadline?: boolean;
  large?: boolean;
  /** Strips the box's own background/shadow/padding and hides its built-in
   * label, for embedding the bare time value inside another card that
   * already provides its own chrome and labeling (e.g. a hero card). */
  bare?: boolean;
  /** Bumps the font size up while keeping the box's own flex/width behavior
   * (unlike `large`, which also switches to a centered, non-flex layout) —
   * for a pair of steppers that must stay side-by-side at equal width. */
  bigFont?: boolean;
  /** Reports when the time picker modal opens/closes — used by parents that
   * also have their own swipe-to-dismiss gesture (see SwipeToDismissSheet's
   * `disabled` prop) so a swipe on the picker doesn't fall through and
   * dismiss the sheet underneath it instead. */
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const { value: v, ampm } = formatClock(value);

  function setOpenState(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  return (
    <>
      <Pressable
        style={[
          styles.box,
          deadline && styles.boxDeadline,
          large && styles.boxLarge,
          bare && styles.boxBare,
          bigFont && styles.boxBigFont,
        ]}
        onPress={() => setOpenState(true)}>
        {!bare && (
          <Text style={[styles.label, large && styles.labelLarge, bigFont && styles.labelBigFont]}>
            {label}
          </Text>
        )}
        <Text style={[styles.time, large && styles.timeLarge, bigFont && styles.timeBigFont]}>
          {v}
          <Text style={[styles.ampm, large && styles.ampmLarge, bigFont && styles.ampmBigFont]}>
            {' '}
            {ampm}
          </Text>
        </Text>
      </Pressable>
      <TimePickerModal
        visible={open}
        label={label}
        value={value}
        onChange={onChange}
        onClose={() => setOpenState(false)}
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
    alignItems: 'center',
    ...Shadows.card,
  },
  boxDeadline: {
    backgroundColor: Colors.accent + '26',
  },
  boxBigFont: {
    paddingVertical: 20,
  },
  boxLarge: {
    flex: 0,
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 48,
  },
  boxBare: {
    backgroundColor: 'transparent',
    padding: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  label: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.inkFaint },
  labelLarge: { fontSize: 16, letterSpacing: 0.5, textTransform: 'uppercase' },
  labelBigFont: { fontSize: 15 },
  time: { fontFamily: Fonts.extraBold, fontSize: 27.5, color: Colors.ink, marginTop: 4 },
  timeLarge: { fontSize: 60, marginTop: 8 },
  timeBigFont: { fontSize: 39, marginTop: 6 },
  ampm: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.inkFaint },
  ampmLarge: { fontSize: 23 },
  ampmBigFont: { fontSize: 18.5 },
});
