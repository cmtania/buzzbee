import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Toggle } from '@/components/toggle';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { formatClock, repeatSummary } from '@/lib/alarm-utils';
import { MissionIcon, missionLabel } from '@/lib/mission-meta';
import { Alarm } from '@/lib/types';

export function AlarmCard({
  alarm,
  onPress,
  onToggle,
  onLongPress,
}: {
  alarm: Alarm;
  onPress: () => void;
  onToggle: (next: boolean) => void;
  onLongPress?: () => void;
}) {
  const start = formatClock(alarm.windowStart);
  const end = formatClock(alarm.windowEnd);

  return (
    <Pressable style={styles.card} onPress={onPress} onLongPress={onLongPress} delayLongPress={400}>
      <View style={styles.iconWrap}>
        <MissionIcon method={alarm.dismissMethod} size={20} color={Colors.accentDeep} />
      </View>
      <View style={styles.main}>
        <Text style={styles.repeatLabel}>{repeatSummary(alarm.repeatDays)}</Text>
        <Text style={styles.time}>
          {start.value}
          <Text style={styles.ampm}> {start.ampm}</Text>
          {'  →  '}
          {end.value}
          <Text style={styles.ampm}> {end.ampm}</Text>
        </Text>
        <Text style={styles.missionLabel}>{missionLabel(alarm.dismissMethod)}</Text>
      </View>
      <Toggle value={alarm.enabled} onChange={onToggle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.md,
    padding: 14,
    ...Shadows.card,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    marginBottom: 2,
  },
  time: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    color: Colors.ink,
  },
  ampm: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.inkFaint,
  },
  missionLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Colors.inkFaint,
    marginTop: 2,
  },
  spacer: {
    marginVertical: Spacing.xs,
  },
});
