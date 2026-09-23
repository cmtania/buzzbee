import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BeeLogo } from '@/components/bee-logo';
import { Fonts, Radii } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';

const BG = '#F2F3F4';
const INK = '#2B2420';
const INK_SOFT = '#6B5D4F';
const ACCENT = '#F5A623';

export default function WelcomeScreen() {
  const router = useRouter();
  const { startDraft } = useAlarmDraft();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <BeeLogo size={140} />
          <Text style={styles.wordmark}>BuzzBee</Text>
          <Text style={styles.tagline}>Wakes you at the right moment, not just the loud one.</Text>
        </View>
        <Pressable
          style={styles.continueBtn}
          onPress={() => {
            startDraft();
            router.push('/onboarding/habit');
          }}>
          <Text style={styles.continueLabel}>Get Started</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1, justifyContent: 'space-between', padding: 32 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  wordmark: { fontFamily: Fonts.extraBold, fontSize: 32, color: INK },
  tagline: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    color: INK_SOFT,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 260,
  },
  continueBtn: {
    height: 54,
    borderRadius: Radii.lg,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  continueLabel: { fontFamily: Fonts.extraBold, fontSize: 18.5, color: INK },
});
