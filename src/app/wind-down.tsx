import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const BREATH_CYCLE_MS = 4600;

export default function WindDownScreen() {
  const router = useRouter();
  const scale = useSharedValue(0.75);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1, { duration: BREATH_CYCLE_MS / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    const flip = setInterval(() => {
      setPhase((p) => (p === 'in' ? 'out' : 'in'));
      Haptics.selectionAsync().catch(() => {});
    }, BREATH_CYCLE_MS / 2);
    return () => clearInterval(flip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Animated.View style={[styles.circle, circleStyle]} />
          <Text style={styles.breathText}>{phase === 'in' ? 'Breathe in…' : 'Breathe out…'}</Text>
          <Text style={styles.caption}>
            A few slow breaths before bed helps your body settle into sleep.
          </Text>
        </View>
        <Pressable style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1B1712' },
  safeArea: { flex: 1, justifyContent: 'space-between', padding: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  circle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#F5A62333',
    borderWidth: 2,
    borderColor: '#F5A623',
  },
  breathText: { color: '#FBF3E4', fontSize: 25.5, fontWeight: '800' },
  caption: {
    color: '#B8A98E',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  doneBtn: {
    backgroundColor: '#F5A623',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  doneText: { color: '#2B2420', fontSize: 17.5, fontWeight: '800' },
});
