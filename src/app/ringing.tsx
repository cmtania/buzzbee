import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { BackspaceIcon, TapIcon as TapGlyph } from '@/components/icons';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { addWakeEvent, getAlarm } from '@/lib/db';
import { cancelAlarmNotification } from '@/lib/scheduling';
import {
  Alarm,
  BUZZ_TARGET,
  CLAP_TARGET,
  DismissMethod,
  SHAKE_TARGET,
  TAP_TARGET,
} from '@/lib/types';
import { genId } from '@/lib/id';
import { MISSION_ORDER, missionLabel } from '@/lib/mission-meta';

const RANDOMIZABLE: DismissMethod[] = MISSION_ORDER.filter((m) => m !== 'random');
const MIC_MISSIONS: DismissMethod[] = ['clap', 'buzz'];

export default function RingingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ alarmId?: string; triggeredBy?: string }>();
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [effectiveMission, setEffectiveMission] = useState<DismissMethod | null>(null);
  const startedAt = useRef(Date.now());
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, []);

  useEffect(() => {
    if (!params.alarmId) return;
    getAlarm(params.alarmId).then((a) => {
      setAlarm(a);
      if (!a) return;
      setEffectiveMission(
        a.dismissMethod === 'random'
          ? RANDOMIZABLE[Math.floor(Math.random() * RANDOMIZABLE.length)]
          : a.dismissMethod
      );
    });
  }, [params.alarmId]);

  async function dismiss() {
    if (alarm) {
      await cancelAlarmNotification(alarm.id);
      const deadline = new Date();
      const [hh, mm] = alarm.windowEnd.split(':').map(Number);
      deadline.setHours(hh, mm, 0, 0);
      await addWakeEvent({
        id: genId('wake'),
        alarmId: alarm.id,
        date: new Date().toISOString().slice(0, 10),
        scheduledDeadline: deadline.toISOString(),
        actualRingTime: new Date().toISOString(),
        triggeredBy: params.triggeredBy === 'smart-detection' ? 'smart-detection' : 'hard-deadline',
        dismissedAfterSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      });
    }
    router.replace('/');
  }

  const clockLabel = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={styles.screen}>
      <WaveBackground />
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.clock}>{clockLabel}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            {params.triggeredBy === 'smart-detection' ? 'Light sleep detected' : 'Deadline reached'}
          </Text>
        </View>

        {effectiveMission && (
          <View style={styles.eyebrow}>
            <Text style={styles.eyebrowText}>{missionLabel(effectiveMission)}</Text>
          </View>
        )}

        <View style={styles.missionArea}>
          {effectiveMission === 'math' && <MathMission onSolved={dismiss} />}
          {effectiveMission === 'tap' && <TapMission onComplete={dismiss} />}
          {effectiveMission === 'shake' && <ShakeMission onComplete={dismiss} />}
          {effectiveMission && MIC_MISSIONS.includes(effectiveMission) && (
            <ComingSoonMission mission={effectiveMission} onDismiss={dismiss} />
          )}
          {!effectiveMission && (
            <Pressable style={styles.fallbackDismiss} onPress={dismiss}>
              <Text style={styles.fallbackDismissText}>Dismiss</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
    </View>
  );
}

function MathMission({ onSolved }: { onSolved: () => void }) {
  const problem = useMemo(() => {
    const a = 3 + Math.floor(Math.random() * 15);
    const b = 2 + Math.floor(Math.random() * 12);
    const useAdd = Math.random() > 0.5;
    return { a, b, op: useAdd ? '+' : '-', answer: useAdd ? a + b : a - b };
  }, []);
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);

  function press(key: string) {
    setWrong(false);
    if (key === 'back') {
      setInput((s) => s.slice(0, -1));
      return;
    }
    const next = input + key;
    if (next.length > 4) return;
    setInput(next);
    if (Number(next) === problem.answer) {
      onSolved();
    } else if (next.length >= String(problem.answer).length) {
      setWrong(true);
      setTimeout(() => setInput(''), 350);
    }
  }

  return (
    <View style={styles.mathWrap}>
      <Text style={styles.equation}>
        {problem.a} {problem.op} {problem.b} = ?
      </Text>
      <View style={[styles.inputDisplay, wrong && styles.inputDisplayWrong]}>
        <Text style={styles.inputText}>{input || 'Enter answer'}</Text>
      </View>
      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', 'back'].map((key) => (
          <Pressable
            key={key}
            style={[styles.key, key === '-' && styles.keyGhost]}
            onPress={() => press(key)}>
            {key === 'back' ? (
              <BackspaceIcon size={22} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TapMission({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  return (
    <View style={styles.centerWrap}>
      <Text style={styles.counter}>
        {count}
        <Text style={styles.counterTarget}>/{TAP_TARGET}</Text>
      </Text>
      <ProgressBar progress={count / TAP_TARGET} />
      <Pressable
        style={styles.tapButton}
        onPress={() => {
          const next = count + 1;
          setCount(next);
          if (next >= TAP_TARGET) onComplete();
        }}>
        <TapGlyph size={40} color={Colors.accentDeep} />
        <Text style={styles.tapLabel}>TAP</Text>
      </Pressable>
    </View>
  );
}

function ShakeMission({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const lastShake = useRef(0);
  const wasAbove = useRef(false);

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const THRESHOLD = 1.7;
      const nowTs = Date.now();
      if (magnitude > THRESHOLD && !wasAbove.current && nowTs - lastShake.current > 300) {
        wasAbove.current = true;
        lastShake.current = nowTs;
        setCount((c) => {
          const next = c + 1;
          if (next >= SHAKE_TARGET) onComplete();
          return next;
        });
      } else if (magnitude < THRESHOLD * 0.7) {
        wasAbove.current = false;
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.centerWrap}>
      <Text style={styles.counter}>
        {count}
        <Text style={styles.counterTarget}>/{SHAKE_TARGET}</Text>
      </Text>
      <ProgressBar progress={count / SHAKE_TARGET} />
      <Text style={styles.shakeHint}>Shake your phone!</Text>
    </View>
  );
}

function ComingSoonMission({
  mission,
  onDismiss,
}: {
  mission: DismissMethod;
  onDismiss: () => void;
}) {
  const target = mission === 'clap' ? CLAP_TARGET : BUZZ_TARGET;
  return (
    <View style={styles.centerWrap}>
      <Text style={styles.comingSoonText}>
        {missionLabel(mission)} ×{target} uses mic metering, which isn't wired up yet — this
        mission is a stand-in for now.
      </Text>
      <Pressable style={styles.fallbackDismiss} onPress={onDismiss}>
        <Text style={styles.fallbackDismissText}>Dismiss (dev)</Text>
      </Pressable>
    </View>
  );
}

function WaveBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 540 960" preserveAspectRatio="none">
        <Rect x="0" y="0" width="540" height="960" fill={Colors.bg} />
        <Path
          d="M0 234L11.3 232.5C22.7 231 45.3 228 67.8 224.3C90.3 220.7 112.7 216.3 135.2 214.7C157.7 213 180.3 214 202.8 219.2C225.3 224.3 247.7 233.7 270.2 233.3C292.7 233 315.3 223 337.8 218.5C360.3 214 382.7 215 405.2 220.3C427.7 225.7 450.3 235.3 472.8 234.7C495.3 234 517.7 223 528.8 217.5L540 212L540 0L528.8 0C517.7 0 495.3 0 472.8 0C450.3 0 427.7 0 405.2 0C382.7 0 360.3 0 337.8 0C315.3 0 292.7 0 270.2 0C247.7 0 225.3 0 202.8 0C180.3 0 157.7 0 135.2 0C112.7 0 90.3 0 67.8 0C45.3 0 22.7 0 11.3 0L0 0Z"
          fill={Colors.accent}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1, alignItems: 'center', paddingTop: Spacing.xxxl },
  clock: { fontFamily: Fonts.extraBold, fontSize: 56, color: '#fff' },
  statusPill: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: Radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusText: { fontFamily: Fonts.extraBold, fontSize: 13, color: Colors.accentDeep },
  eyebrow: {
    marginTop: 28,
    backgroundColor: Colors.ink,
    borderRadius: Radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  eyebrowText: {
    fontFamily: Fonts.extraBold,
    fontSize: 12,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  missionArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  centerWrap: { width: '100%', alignItems: 'center', gap: 16 },
  counter: { fontFamily: Fonts.extraBold, fontSize: 64, color: Colors.ink },
  counterTarget: { fontFamily: Fonts.bold, fontSize: 28, color: Colors.inkFaint },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.accentDeep, borderRadius: 5 },
  tapButton: {
    marginTop: 20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  tapLabel: { fontFamily: Fonts.extraBold, fontSize: 13, color: Colors.accentDeep, letterSpacing: 1 },
  shakeHint: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.ink },
  mathWrap: { width: '100%', alignItems: 'center', gap: 16 },
  equation: { fontFamily: Fonts.extraBold, fontSize: 40, color: Colors.ink },
  inputDisplay: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  inputDisplayWrong: { backgroundColor: '#FBDADA' },
  inputText: { fontFamily: Fonts.extraBold, fontSize: 22, color: Colors.ink },
  keypad: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  key: {
    width: '30%',
    height: 56,
    borderRadius: Radii.md,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGhost: { backgroundColor: 'transparent' },
  keyText: { fontFamily: Fonts.extraBold, fontSize: 22, color: Colors.ink },
  comingSoonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Colors.ink,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  fallbackDismiss: {
    marginTop: 8,
    backgroundColor: Colors.ink,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: Radii.lg,
  },
  fallbackDismissText: { fontFamily: Fonts.extraBold, fontSize: 14, color: '#fff' },
});
