import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';

import { TrashIcon } from '@/components/icons';
import { Toggle } from '@/components/toggle';
import { Colors, Fonts, Radii, Shadows } from '@/constants/theme';
import { formatClock, repeatSummary } from '@/lib/alarm-utils';
import { MissionIcon } from '@/lib/mission-meta';
import { Alarm } from '@/lib/types';

export function AlarmCard({
  alarm,
  taskCount = 0,
  onPress,
  onToggle,
  onLongPress,
  onDelete,
}: {
  alarm: Alarm;
  taskCount?: number;
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
      style={[styles.card, !alarm.enabled && styles.cardDim]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}>
      <View style={styles.iconWrap}>
        <MissionIcon method={alarm.dismissMethod} size={18} color={Colors.accentDeep} />
      </View>
      <View style={styles.main}>
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
        {taskCount > 0 && (
          <Text style={styles.taskBadge}>
            +{taskCount} task{taskCount === 1 ? '' : 's'}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        <Toggle value={alarm.enabled} onChange={onToggle} />
        <Pressable style={styles.deleteBtn} onPress={onDelete} hitSlop={10}>
          <TrashIcon size={16} color={Colors.danger} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    padding: 16,
    ...Shadows.card,
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
  repeatLabel: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  time: {
    fontFamily: Fonts.extraBold,
    fontSize: 21,
    color: Colors.ink,
    marginTop: 3,
  },
  ampm: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.inkFaint,
  },
  taskBadge: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.accentDeep,
    marginTop: 3,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  deleteBtn: { padding: 2 },
});
