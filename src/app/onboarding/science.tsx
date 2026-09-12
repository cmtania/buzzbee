import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { OnboardingScreen } from '@/components/onboarding-screen';
import { Fonts } from '@/constants/theme';

const INK_SOFT = '#6B5D4F';
const ACCENT = '#F5A623';

export default function ScienceScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen
      step={2}
      title="Waking up mid-deep-sleep is what makes mornings brutal."
      onContinue={() => router.push('/onboarding/window')}>
      <View style={styles.waveWrap}>
        <Svg width="100%" height={90} viewBox="0 0 300 90" preserveAspectRatio="none">
          <Path
            d="M0 20 C40 20, 40 70, 80 70 C120 70, 120 30, 160 30 C200 30, 200 60, 240 60 C270 60, 280 40, 300 40"
            stroke={ACCENT}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <Text style={styles.paragraph}>
        Sleep moves in cycles between light and deep stages. Get pulled out of a deep-sleep trough
        and your brain needs real time to catch up — that groggy, wrecked feeling is called sleep
        inertia, and it can last for over an hour.
      </Text>
      <Text style={styles.paragraph}>
        BuzzBee's Smart Wake Window watches for the light-sleep moments in your window and rings
        then instead — never later than your hard deadline, just earlier and gentler when it can.
      </Text>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  waveWrap: { marginBottom: 20 },
  paragraph: { fontFamily: Fonts.semiBold, fontSize: 14.5, color: INK_SOFT, lineHeight: 22, marginBottom: 16 },
});
