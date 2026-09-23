import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';

import { AlarmVibration } from '@/components/alarm-ring-effects';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { Toggle } from '@/components/toggle';
import { Fonts, Radii, Shadows } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { isSoundName, safeAudioCall, SOUND_FILES } from '@/lib/sounds';

const INK = '#2B2420';
const INK_SOFT = '#6B5D4F';
const CARD_BG = '#FFFDF7';
const ACCENT = '#F5A623';
const ACCENT_DEEP = '#E8790A';

// Same idea as the real Ringing screen's gentle-to-loud ramp (see
// alarm-ring-effects.tsx's AlarmSoundLoop) — previewed here at a fixed short
// duration rather than a real alarm's windowStart-to-windowEnd span, since
// there's no window configured yet this early in onboarding.
const ESCALATION_START_VOLUME = 0.15;
const ESCALATION_STEP_MS = 500;
const PREVIEW_ESCALATION_MS = 8000;

export default function RingerCheckScreen() {
  const router = useRouter();
  const { draft, setDraft } = useAlarmDraft();
  const [playing, setPlaying] = useState(false);
  const source = isSoundName(draft.sound) ? SOUND_FILES[draft.sound] : SOUND_FILES['Classic Alarm'];
  const player = useAudioPlayer(source);
  const escalationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    safeAudioCall(() => {
      player.loop = true;
    });
    return () => {
      clearEscalation();
      safeAudioCall(() => player.pause());
    };
  }, [player]);

  function clearEscalation() {
    if (escalationInterval.current) {
      clearInterval(escalationInterval.current);
      escalationInterval.current = null;
    }
  }

  function stop() {
    clearEscalation();
    safeAudioCall(() => player.pause());
    setPlaying(false);
  }

  function toggle() {
    if (playing) {
      stop();
    } else {
      safeAudioCall(() => {
        player.seekTo(0);
        player.volume = ESCALATION_START_VOLUME;
        player.play();
      });
      setPlaying(true);
      const startedAt = Date.now();
      escalationInterval.current = setInterval(() => {
        const progress = Math.min(1, (Date.now() - startedAt) / PREVIEW_ESCALATION_MS);
        safeAudioCall(() => {
          player.volume = ESCALATION_START_VOLUME + (1 - ESCALATION_START_VOLUME) * progress;
        });
        if (progress >= 1) clearEscalation();
      }, ESCALATION_STEP_MS);
    }
  }

  function handleContinue() {
    stop();
    router.push('/onboarding/summary');
  }

  function handleBack() {
    stop();
    router.back();
  }

  return (
    <OnboardingScreen
      step={7}
      title="Will you hear it?"
      continueLabel="I'll hear it"
      onContinue={handleContinue}
      onBack={handleBack}>
      <View style={styles.center}>
        {playing && draft.vibrationEnabled && <AlarmVibration />}
        <Pressable style={styles.playBtn} onPress={toggle}>
          <View style={playing ? styles.stopIcon : styles.playIconWrap}>
            {!playing && <View style={styles.playTriangle} />}
          </View>
        </Pressable>
        <Text style={styles.caption}>
          {playing
            ? 'Volume is gradually increasing — just like when your alarm rings.\nTap to stop.'
            : 'Playing at your Ringtone & Alerts volume.\nTap to stop.'}
        </Text>

        <View style={[styles.tipCard, styles.vibrateRow, styles.vibrateCardSpacing]}>
          <Text style={styles.vibrateLabel}>Vibrate</Text>
          <Toggle
            value={draft.vibrationEnabled}
            onChange={(v) => setDraft((d) => ({ ...d, vibrationEnabled: v }))}
          />
        </View>

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
  vibrateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vibrateCardSpacing: { marginBottom: 14 },
  vibrateLabel: { fontFamily: Fonts.extraBold, fontSize: 16, color: INK },
  caption: {
    fontFamily: Fonts.bold,
    fontSize: 15.5,
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
  tipTitle: { fontFamily: Fonts.extraBold, fontSize: 15, color: INK, marginBottom: 10 },
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
  tipNumText: { fontFamily: Fonts.extraBold, fontSize: 12, color: ACCENT_DEEP },
  tipStepText: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 14.5, color: INK_SOFT, lineHeight: 18 },
});
