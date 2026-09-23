import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BeeLogo } from '@/components/bee-logo';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { RingingWaveBackground } from '@/components/ringing-wave-background';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

export default function MissionCompleteScreen() {
  const router = useRouter();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const clockLabel = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const [clockValue, clockAmpm] = clockLabel.split(' ');

  return (
    <View style={styles.screen}>
      <RingingWaveBackground />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.top}>
          <Text style={styles.clock}>
            {clockValue}
            <Text style={styles.ampm}> {clockAmpm}</Text>
          </Text>
        </View>

        <View style={styles.center}>
          <BeeLogo size={180} />
          <Text style={styles.title}>Congrats!{'\n'}You're Awake!</Text>
        </View>

        <Pressable
          style={styles.homeBtn}
          onPress={() => {
            // dismissTo (not replace) pops the whole Ringing/MissionComplete
            // stack back down to the Home screen that's already mounted
            // underneath, instead of pushing/replacing with a brand-new
            // Home instance on top of it — the latter is what caused a
            // second Home screen to visually stack over the first.
            if (router.canDismiss()) {
              router.dismissTo('/');
            } else {
              router.replace('/');
            }
          }}>
          <Text style={styles.homeBtnText}>Go to Home</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f0f0' },
  safeArea: { flex: 1, alignItems: 'center' },
  top: { alignItems: 'center', paddingTop: Spacing.xxxl + 24 },
  clock: { fontFamily: Fonts.extraBold, fontSize: 101, color: '#fff' },
  ampm: { fontFamily: Fonts.bold, fontSize: 30, color: '#fff', opacity: 0.85 },
  center: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 24 },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 39,
    color: Colors.ink,
    textAlign: 'center',
    lineHeight: 40,
  },
  homeBtn: {
    alignSelf: 'stretch',
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
    backgroundColor: Colors.ink,
    paddingVertical: 18,
    borderRadius: Radii.lg,
    alignItems: 'center',
  },
  homeBtnText: { fontFamily: Fonts.extraBold, fontSize: 18.5, color: '#fff' },
});
