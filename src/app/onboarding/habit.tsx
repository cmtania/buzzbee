import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding-screen';
import { Fonts } from '@/constants/theme';

const OPTIONS = [
  'I snooze until the last possible second',
  'I wake up, but feel wrecked all morning',
  'I sleep through it entirely',
];

const INK = '#2B2420';
const TRACK_OFF = '#E3E5E7';
const CARD_BG = '#FFFDF7';
const ACCENT = '#F5A623';

export default function HabitScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState(0);

  return (
    <OnboardingScreen
      step={1}
      title="What usually happens when your alarm goes off?"
      subtitle="Be honest — this just helps us set your defaults."
      onContinue={() => router.push('/onboarding/science')}>
      {OPTIONS.map((label, i) => {
        const active = selected === i;
        return (
          <Pressable
            key={label}
            style={[styles.option, active && styles.optionSelected]}
            onPress={() => setSelected(i)}>
            <View style={[styles.dot, active && styles.dotSelected]}>
              {active && <View style={styles.dotInner} />}
            </View>
            <Text style={styles.label}>{label}</Text>
          </Pressable>
        );
      })}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: CARD_BG,
    borderWidth: 2,
    borderColor: TRACK_OFF,
    marginBottom: 12,
  },
  optionSelected: { borderColor: ACCENT, backgroundColor: ACCENT + '26' },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: TRACK_OFF,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSelected: { borderColor: ACCENT, backgroundColor: ACCENT },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  label: { fontFamily: Fonts.bold, fontSize: 15, color: INK, flex: 1 },
});
