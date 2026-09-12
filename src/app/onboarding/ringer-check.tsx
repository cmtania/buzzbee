import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding-screen';
import { Fonts, Radii } from '@/constants/theme';

const INK = '#2B2420';
const INK_FAINT = '#9C8C7A';
const CARD_BG = '#FFFDF7';
const ACCENT = '#F5A623';

export default function RingerCheckScreen() {
  const router = useRouter();
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  function toggle() {
    if (playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    intervalRef.current = setInterval(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }, 900);
  }

  return (
    <OnboardingScreen
      step={8}
      title="Ringer Check"
      subtitle="Playing a haptic preview at your alarm intensity — no sound assets are bundled yet, so this simulates the buzz pattern only."
      onContinue={() => router.push('/onboarding/summary')}>
      <View style={styles.center}>
        <Pressable style={[styles.playBtn, playing && styles.playBtnActive]} onPress={toggle}>
          <Text style={styles.playIcon}>{playing ? '■' : '▶'}</Text>
        </Pressable>
        <Text style={styles.hint}>
          {playing ? 'Tap to stop.' : "Tap to preview BuzzBee's ringer intensity."}
        </Text>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Too quiet when it really rings?</Text>
          <Text style={styles.tipText}>
            1. Raise your Ringtone & Alerts volume with the side buttons{'\n'}
            2. Turn off Silent mode{'\n'}
            3. Enable "Extra Loud Mode" later in Settings
          </Text>
        </View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 14, paddingTop: 10 },
  playBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  playBtnActive: { backgroundColor: '#E8790A' },
  playIcon: { fontSize: 34, color: INK },
  hint: { fontFamily: Fonts.semiBold, fontSize: 13, color: INK_FAINT },
  tipCard: {
    marginTop: 12,
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: Radii.lg,
    padding: 16,
  },
  tipTitle: { fontFamily: Fonts.bold, fontSize: 14, color: INK, marginBottom: 6 },
  tipText: { fontFamily: Fonts.semiBold, fontSize: 12.5, color: INK_FAINT, lineHeight: 20 },
});
