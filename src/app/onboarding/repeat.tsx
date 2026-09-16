import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';

import { OnboardingScreen } from '@/components/onboarding-screen';
import { Fonts } from '@/constants/theme';
import { dayShortLabel } from '@/lib/alarm-utils';
import { useAlarmDraft } from '@/lib/alarm-draft-context';

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun display order
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

const INK = '#2B2420';
const INK_FAINT = '#9C8C7A';
const TRACK_OFF = '#E3E5E7';
const ACCENT = '#F5A623';

const PRESETS: { label: string; days: number[] }[] = [
  { label: 'Every day', days: EVERY_DAY },
  { label: 'Weekdays', days: WEEKDAYS },
  { label: 'Weekends', days: WEEKENDS },
];

function sameSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export default function RepeatScreen() {
  const router = useRouter();
  const { draft, setDraft } = useAlarmDraft();

  function toggleDay(dow: number) {
    setDraft((d) => ({
      ...d,
      repeatDays: d.repeatDays.includes(dow)
        ? d.repeatDays.filter((x) => x !== dow)
        : [...d.repeatDays, dow].sort(),
    }));
  }

  return (
    <OnboardingScreen
      step={3}
      title="When should this repeat?"
      onContinue={() => router.push('/onboarding/permissions')}>
      <View style={styles.days}>
        {ALL_DAYS.map((dow) => {
          const active = draft.repeatDays.includes(dow);
          return (
            <Pressable
              key={dow}
              style={[styles.day, active && styles.dayActive]}
              onPress={() => toggleDay(dow)}>
              <Text style={[styles.dayText, active && styles.dayTextActive]}>
                {dayShortLabel(dow)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.presets}>
        {PRESETS.map((p) => {
          const active = sameSet(draft.repeatDays, p.days);
          return (
            <Pressable
              key={p.label}
              style={[styles.preset, active && styles.presetActive]}
              onPress={() => setDraft((d) => ({ ...d, repeatDays: p.days }))}>
              <Text style={[styles.presetText, active && styles.presetTextActive]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: TRACK_OFF,
  },
  dayActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  dayText: { fontFamily: Fonts.bold, fontSize: 13, color: INK_FAINT },
  dayTextActive: { color: INK },
  presets: { flexDirection: 'row', gap: 10 },
  preset: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFFDF7',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: TRACK_OFF,
  },
  presetActive: { borderColor: ACCENT, backgroundColor: ACCENT + '26' },
  presetText: { fontFamily: Fonts.bold, fontSize: 13, color: INK_FAINT },
  presetTextActive: { color: INK },
});
