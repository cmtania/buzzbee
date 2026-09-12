import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { OnboardingScreen } from '@/components/onboarding-screen';
import { Fonts, Radii, Shadows } from '@/constants/theme';

const INK = '#2B2420';
const INK_SOFT = '#6B5D4F';
const INK_FAINT = '#9C8C7A';
const CARD_BG = '#FFFDF7';
const ACCENT = '#F5A623';

export default function ScienceScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen
      step={2}
      title="Waking mid-deep-sleep costs you"
      continueLabel="Makes sense"
      onContinue={() => router.push('/onboarding/window')}>
      <View style={styles.card}>
        <View style={styles.waveWrap}>
          <Svg width="100%" height={90} viewBox="0 0 300 90" preserveAspectRatio="none">
            <Path
              d="M0 30 C 30 30, 40 70, 70 75 C 100 80, 110 20, 140 15 C 165 11, 175 45, 200 50 C 225 55, 235 18, 260 14 C 275 12, 285 20, 300 22"
              fill="none"
              stroke="#E3E5E7"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <Circle cx={75} cy={76} r={7} fill="#C9784A" />
            <Circle cx={255} cy={15} r={7} fill={ACCENT} />
          </Svg>
        </View>
        <View style={styles.zoneCaps}>
          <Text style={styles.zoneCapText}>Deep sleep</Text>
          <Text style={styles.zoneCapText}>Light sleep</Text>
        </View>
      </View>
      <Text style={styles.paragraph}>
        Getting woken during <Text style={styles.bold}>deep sleep</Text> (left) leaves you groggy
        for hours — sleep scientists call it sleep inertia.
      </Text>
      <Text style={styles.paragraph}>
        BuzzBee's Smart Wake only rings once it senses you've drifted into{' '}
        <Text style={styles.bold}>light sleep</Text> (right) — so mornings actually feel like
        mornings.
      </Text>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: Radii.xl,
    padding: 20,
    marginBottom: 20,
    ...Shadows.card,
  },
  waveWrap: { paddingBottom: 10 },
  zoneCaps: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  zoneCapText: {
    fontFamily: Fonts.extraBold,
    fontSize: 10.5,
    color: INK_FAINT,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  paragraph: { fontFamily: Fonts.semiBold, fontSize: 14.5, color: INK_SOFT, lineHeight: 23, marginBottom: 14 },
  bold: { color: INK, fontFamily: Fonts.bold },
});
