import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackArrow } from '@/components/icons';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { updateSettings } from '@/lib/db';
import { DetectorHandle, startMovementDetector } from '@/lib/smart-wake-engine';

const SIMULATE_WINDOW_SECONDS = 45;
// A much more sensitive threshold than the real overnight heuristic — this
// mode exists so a light shake/nudge triggers detection almost immediately,
// for demoing and App Store review (see PLAN.md's Simulate/Test Mode section).
const SIMULATE_STDDEV_THRESHOLD = 0.02;
const SIMULATE_HITS_REQUIRED = 2;

type Phase = 'watching' | 'detected' | 'deadline';

export default function TestSmartWakeScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('watching');
  const [secondsLeft, setSecondsLeft] = useState(SIMULATE_WINDOW_SECONDS);
  const detectorRef = useRef<DetectorHandle | null>(null);

  useEffect(() => {
    updateSettings({ simulateModeEnabled: true });
    detectorRef.current = startMovementDetector(
      () => setPhase('detected'),
      { stddevThreshold: SIMULATE_STDDEV_THRESHOLD, consecutiveHitsRequired: SIMULATE_HITS_REQUIRED }
    );
    return () => {
      detectorRef.current?.stop();
      updateSettings({ simulateModeEnabled: false });
    };
  }, []);

  useEffect(() => {
    if (phase !== 'watching') return;
    if (secondsLeft <= 0) {
      detectorRef.current?.stop();
      setPhase('deadline');
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft]);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <BackArrow />
          </Pressable>
          <Text style={styles.title}>Test Smart Wake</Text>
        </View>

        <View style={styles.body}>
          {phase === 'watching' && (
            <>
              <Text style={styles.bigCount}>{secondsLeft}</Text>
              <Text style={styles.caption}>
                This compresses a wake window to {SIMULATE_WINDOW_SECONDS}s. Move or gently shake
                your phone like you would in light sleep — Smart Wake should catch it before time
                runs out.
              </Text>
            </>
          )}
          {phase === 'detected' && (
            <>
              <Text style={styles.emoji}>✅</Text>
              <Text style={styles.resultTitle}>Light sleep detected!</Text>
              <Text style={styles.caption}>
                That's the exact mechanism that runs during a real wake window — BuzzBee would
                ring right now instead of waiting for the hard deadline.
              </Text>
            </>
          )}
          {phase === 'deadline' && (
            <>
              <Text style={styles.emoji}>⏰</Text>
              <Text style={styles.resultTitle}>Deadline reached</Text>
              <Text style={styles.caption}>
                No movement was detected in time, so BuzzBee falls back to ringing at the hard
                deadline — it never fails to wake you, only ever wakes you earlier when it can.
              </Text>
            </>
          )}

          {phase !== 'watching' && (
            <Pressable
              style={styles.retryBtn}
              onPress={() => {
                setPhase('watching');
                setSecondsLeft(SIMULATE_WINDOW_SECONDS);
                detectorRef.current = startMovementDetector(
                  () => setPhase('detected'),
                  {
                    stddevThreshold: SIMULATE_STDDEV_THRESHOLD,
                    consecutiveHitsRequired: SIMULATE_HITS_REQUIRED,
                  }
                );
              }}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.xl },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  title: { fontFamily: Fonts.extraBold, fontSize: 17, color: Colors.ink },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: 16 },
  bigCount: { fontFamily: Fonts.extraBold, fontSize: 72, color: Colors.accentDeep },
  emoji: { fontSize: 56 },
  resultTitle: { fontFamily: Fonts.extraBold, fontSize: 22, color: Colors.ink },
  caption: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: Radii.lg,
  },
  retryText: { fontFamily: Fonts.extraBold, fontSize: 15, color: '#2B2420' },
});
