import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Toggle } from '@/components/toggle';
import { Colors, Fonts, Radii, Shadows } from '@/constants/theme';
import { formatClock, repeatSummary } from '@/lib/alarm-utils';
import { MissionIcon } from '@/lib/mission-meta';
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
          {repeatSummary(alarm.repeatDays)} · {alarm.smartWakeEnabled ? 'Smart Wake' : 'Fixed time'}
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
});
