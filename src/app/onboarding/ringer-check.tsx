import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';

import { OnboardingScreen } from '@/components/onboarding-screen';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { isSoundName, safeAudioCall, SOUND_FILES } from '@/lib/sounds';

const INK = '#2B2420';
const INK_SOFT = '#6B5D4F';
const CARD_BG = '#FFFDF7';
const ACCENT = '#F5A623';
const ACCENT_DEEP = '#E8790A';

export default function RingerCheckScreen() {
  const router = useRouter();
  const { draft } = useAlarmDraft();
  const [playing, setPlaying] = useState(false);
  const source = isSoundName(draft.sound) ? SOUND_FILES[draft.sound] : SOUND_FILES['Classic Alarm'];
  const player = useAudioPlayer(source);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    safeAudioCall(() => {
      player.loop = true;
    });
    return () => {
      safeAudioCall(() => player.pause());
    };
  }, [player]);

  function toggle() {
    if (playing) {
      safeAudioCall(() => player.pause());
      setPlaying(false);
    } else {
      safeAudioCall(() => {
        player.seekTo(0);
        player.play();
      });
      setPlaying(true);
    }
  }

  function handleContinue() {
    safeAudioCall(() => player.pause());
    setPlaying(false);
    router.push('/onboarding/summary');
  }

  function handleBack() {
    safeAudioCall(() => player.pause());
    setPlaying(false);
    router.back();
  }

  return (
    <OnboardingScreen
      step={8}
      title="Will you hear it?"
      continueLabel="I'll hear it"
      onContinue={handleContinue}
      onBack={handleBack}>
      <View style={styles.center}>
        <Pressable style={styles.playBtn} onPress={toggle}>
          <View style={playing ? styles.stopIcon : styles.playIconWrap}>
            {!playing && <View style={styles.playTriangle} />}
          </View>
        </Pressable>
        <Text style={styles.caption}>
          Playing at your Ringtone & Alerts volume.{'\n'}Tap to stop.
        </Text>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Too quiet? Fix it here:</Text>
          <TipStep n={1}>Hold the Volume Up button now</TipStep>
          <TipStep n={2}>Watch the alert-volume bar rise</TipStep>
          <TipStep n={3}>Tap play again to double-check</TipStep>
        </View>
      </View>
    </OnboardingScreen>
  );
}

function TipStep({ n, children }: { n: number; children: string }) {
  return (
    <View style={styles.tipStep}>
      <View style={styles.tipNum}>
        <Text style={styles.tipNumText}>{n}</Text>
      </View>
      <Text style={styles.tipStepText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingTop: 20 },
  playBtn: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowColor: ACCENT_DEEP,
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  playIconWrap: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 16,
    borderBottomWidth: 16,
    borderLeftWidth: 26,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: INK,
    marginLeft: 6,
  },
  stopIcon: { width: 30, height: 30, borderRadius: 5, backgroundColor: INK },
  caption: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    color: INK_SOFT,
    textAlign: 'center',
    marginBottom: 26,
    lineHeight: 19,
  },
  tipCard: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: Radii.lg,
    padding: 18,
    ...Shadows.card,
  },
  tipTitle: { fontFamily: Fonts.extraBold, fontSize: 13, color: INK, marginBottom: 10 },
  tipStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  tipNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ACCENT + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  tipNumText: { fontFamily: Fonts.extraBold, fontSize: 10.5, color: ACCENT_DEEP },
  tipStepText: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 12.5, color: INK_SOFT, lineHeight: 18 },
});
