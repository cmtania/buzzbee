import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';

import { OnboardingScreen } from '@/components/onboarding-screen';
import { Fonts, Radii } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { MISSION_ORDER, missionCountLabel, MissionIcon, missionLabel } from '@/lib/mission-meta';
import { DismissMethod } from '@/lib/types';
import { Check } from 'lucide-react-native';

const INK = '#2B2420';
const INK_SOFT = '#6B5D4F';
const CARD_BG = '#FFFDF7';
const ACCENT = '#F5A623';

// Shorter copy than the Choose Mission sheet's, matching
// design/OnboardMission.dc.html's more compact card layout.
const ONBOARDING_DESCRIPTIONS: Record<DismissMethod, string> = {
  math: 'Solve one equation',
  clap: 'Clap your hands',
  shake: 'Shake to dismiss',
  buzz: 'Make a loud sound',
  tap: 'Tap the screen',
  random: 'Surprise mission',
};

export default function MissionScreen() {
  const router = useRouter();
  const { draft, setDraft } = useAlarmDraft();

  function select(method: DismissMethod) {
    setDraft((d) => ({ ...d, dismissMethod: method }));
  }

  return (
    <OnboardingScreen
      step={6}
      title="Choose your dismiss method"
      scroll={false}
      onContinue={() => router.push('/onboarding/ringer-check')}>
      <View style={styles.grid}>
        {MISSION_ORDER.map((method) => {
          const selected = draft.dismissMethod === method;
          return (
            <Pressable
              key={method}
              style={[styles.card, selected && styles.cardSelected]}
              onPress={() => select(method)}>
              {selected && (
                <View style={styles.check}>
                  <Check size={12.5} color="#fff" />
                </View>
              )}
              <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
                <MissionIcon method={method} size={24} color="#E8790A" />
              </View>
              <Text style={styles.cardTitle}>{missionLabel(method)}</Text>
              <Text style={styles.cardDesc}>{ONBOARDING_DESCRIPTIONS[method]}</Text>
              <View style={[styles.countPill, selected && styles.countPillSelected]}>
                <Text style={styles.countPillText}>{missionCountLabel(method)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  card: {
    width: '47%',
    backgroundColor: CARD_BG,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 14,
    alignItems: 'center',
    gap: 5,
  },
  cardSelected: { borderColor: ACCENT, backgroundColor: ACCENT + '1a' },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3FAE5A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: ACCENT + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: { backgroundColor: '#fff' },
  cardTitle: { fontFamily: Fonts.extraBold, fontSize: 15.5, color: INK, textAlign: 'center' },
  cardDesc: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: INK_SOFT,
    textAlign: 'center',
    lineHeight: 13,
    minHeight: 26,
  },
  countPill: {
    backgroundColor: ACCENT + '26',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  countPillSelected: { backgroundColor: '#fff' },
  countPillText: { fontFamily: Fonts.extraBold, fontSize: 12.5, color: '#E8790A' },
});
