import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';

import { GlassCard } from '@/components/glass-card';
import { Toggle } from '@/components/toggle';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { formatClock, repeatSummary } from '@/lib/alarm-utils';
import { MissionIcon } from '@/lib/mission-meta';
import { Alarm } from '@/lib/types';
import { Trash } from 'lucide-react-native';

export function AlarmCard({
  alarm,
  onPress,
  onToggle,
  onLongPress,
  onDelete,
}: {
  alarm: Alarm;
  onPress: () => void;
  onToggle: (next: boolean) => void;
  onLongPress?: () => void;
  /** Always-visible delete button — a hand-rolled swipe-to-reveal gesture
   * was tried here first, but proved genuinely buggy (the row's animated
   * position could desync from its open/closed state after quick
   * back-and-forth swipes, leaving the toggle stuck invisible) and was
   * dropped in favor of this simpler, always-reachable button. */
  onDelete: () => void;
}) {
  const end = formatClock(alarm.windowEnd);

  return (
    <Pressable
      style={!alarm.enabled && styles.cardDim}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}>
      <GlassCard style={styles.card}>
        <View style={styles.iconWrap}>
          <MissionIcon method={alarm.dismissMethod} size={20.5} color={Colors.accentDeep} />
        </View>
        <View style={styles.main}>
          {!!alarm.label && (
            <Text style={styles.name} numberOfLines={1}>
              {alarm.label}
            </Text>
          )}
          <Text style={styles.repeatLabel}>
            {repeatSummary(alarm.repeatDays)} · {alarm.smartWakeEnabled ? 'Wake Window' : 'Fixed time'}
          </Text>
          {alarm.smartWakeEnabled ? (
            <Text style={styles.time}>
              {formatClock(alarm.windowStart).value}
              {'–'}
              {end.value}
              <Text style={styles.ampm}> {end.ampm}</Text>
            </Text>
          ) : (
            <Text style={styles.time}>
              {end.value}
              <Text style={styles.ampm}> {end.ampm}</Text>
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          <Toggle value={alarm.enabled} onChange={onToggle} />
          <Pressable style={styles.deleteBtn} onPress={onDelete} hitSlop={6}>
            <Trash size={18.5} color={Colors.danger} />
          </Pressable>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radii.lg,
    padding: 16,
  },
  cardDim: { opacity: 0.5 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: Colors.accent + '26',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: Fonts.extraBold,
    fontSize: 17,
    color: Colors.ink,
    marginBottom: 2,
  },
  repeatLabel: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  time: {
    fontFamily: Fonts.extraBold,
    fontSize: 24,
    color: Colors.ink,
    marginTop: 3,
  },
  ampm: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.inkFaint,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
  // 44x44 is Apple HIG's minimum tap target; the 16px icon alone (even with
  // hitSlop) came in under that at ~40x40 effective — real estate here for a
  // destructive action right next to the enable toggle, worth getting right.
  // No visible background/border, so the extra invisible padding doesn't
  // change how the row looks, just how forgiving it is to tap.
  deleteBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
