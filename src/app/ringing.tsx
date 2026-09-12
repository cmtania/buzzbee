import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { BackspaceIcon, WaveformIcon } from '@/components/icons';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { useMicMetering } from '@/hooks/use-mic-metering';
import { addWakeEvent, getAlarm, getSettings } from '@/lib/db';
import { cancelAlarmNotification } from '@/lib/scheduling';
import { isSoundName, safeAudioCall, SOUND_FILES } from '@/lib/sounds';
import {
  Alarm,
  AppSettings,
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
// A quiet bedroom typically reads well below this; a room with the TV on,
// a partner talking, etc. tends to sit above it. Untuned placeholder like
// the other thresholds in this file — needs real-room calibration.
const AMBIENT_ACTIVE_THRESHOLD_DB = -28;
const AMBIENT_CHECK_MS = 1200;

// "<Verb> to dismiss" pill-eyebrow copy, per design/Ringing*.dc.html.
const MISSION_VERBS: Record<DismissMethod, string> = {
  math: 'Solve to dismiss',
  clap: 'Clap to dismiss',
  shake: 'Shake to dismiss',
  buzz: 'Buzz to dismiss',
  tap: 'Tap to dismiss',
  random: 'Dismiss',
};

function minutesAheadOfDeadline(alarm: Alarm, now: Date): number {
  const [hh, mm] = alarm.windowEnd.split(':').map(Number);
  const deadline = new Date(now);
  deadline.setHours(hh, mm, 0, 0);
  return Math.max(0, Math.round((deadline.getTime() - now.getTime()) / 60000));
}

export default function RingingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ alarmId?: string; triggeredBy?: string }>();
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [effectiveMission, setEffectiveMission] = useState<DismissMethod | null>(null);
  const [alarmLoaded, setAlarmLoaded] = useState(!params.alarmId);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [roomActive, setRoomActive] = useState<boolean | null>(null);
  const startedAt = useRef(Date.now());
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    getSettings().then((s) => setSettings(s));
  }, []);

  useEffect(() => {
    if (!params.alarmId) return;
    getAlarm(params.alarmId).then((a) => {
      setAlarm(a);
      if (a) {
        setEffectiveMission(
          a.dismissMethod === 'random'
            ? RANDOMIZABLE[Math.floor(Math.random() * RANDOMIZABLE.length)]
            : a.dismissMethod
        );
      }
      setAlarmLoaded(true);
    });
  }, [params.alarmId]);

  const dataReady = alarmLoaded && settings !== null;

  // Skip the ambient pre-check for Clap/Buzz — they run their own mic
  // session for the mission itself, and iOS only supports one recorder at a
  // time, so running both concurrently would conflict.
  const needsAmbientCheck =
    dataReady &&
    !!settings?.ambientAwarenessEnabled &&
    !!effectiveMission &&
    !MIC_MISSIONS.includes(effectiveMission);
  const ambientCheckDone = dataReady && (!needsAmbientCheck || roomActive !== null);

  useEffect(() => {
    if (!ambientCheckDone) return;
    Haptics.notificationAsync(
      roomActive ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    ).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambientCheckDone]);

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
  const [clockValue, clockAmpm] = clockLabel.split(' ');

  // The mic-based missions (Clap/Buzz) need a clean signal to count against —
  // a blaring alarm loop would trigger false positives on their own
  // threshold detection — so we skip continuous sound for those two rather
  // than trying to duck volume mid-mission. Also gated on the ambient
  // pre-check finishing first: sampling room noise while our own alarm is
  // already playing would make every room read as "active".
  const shouldPlaySound =
    ambientCheckDone && !!alarm && !!effectiveMission && !MIC_MISSIONS.includes(effectiveMission);

  let statusText = 'Deadline reached';
  if (ambientCheckDone && roomActive) {
    statusText = "Sounds like you're already up";
  } else if (params.triggeredBy === 'smart-detection') {
    statusText = alarm
      ? `Light sleep detected · ${minutesAheadOfDeadline(alarm, now)} min ahead`
      : 'Light sleep detected';
  }

  return (
    <View style={styles.screen}>
      {shouldPlaySound && <AlarmSoundLoop soundName={alarm!.sound} />}
      <WaveBackground />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.top}>
          <Text style={styles.clock}>
            {clockValue}
            <Text style={styles.ampm}> {clockAmpm}</Text>
          </Text>
          <View style={styles.statusPill}>
            <WaveformIcon size={14} color={Colors.accentDeep} />
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.missionArea}>
          {needsAmbientCheck && !ambientCheckDone && (
            <>
              <AmbientPreCheck onResult={setRoomActive} />
              <Text style={styles.hint}>Listening for room noise…</Text>
            </>
          )}
          {ambientCheckDone && effectiveMission && (
            <View style={styles.eyebrow}>
              <Text style={styles.eyebrowText}>{MISSION_VERBS[effectiveMission]}</Text>
            </View>
          )}
          {ambientCheckDone && effectiveMission === 'math' && <MathMission onSolved={dismiss} />}
          {ambientCheckDone && effectiveMission === 'tap' && <TapMission onComplete={dismiss} />}
          {ambientCheckDone && effectiveMission === 'shake' && <ShakeMission onComplete={dismiss} />}
          {ambientCheckDone && effectiveMission === 'clap' && <ClapMission onComplete={dismiss} />}
          {ambientCheckDone && effectiveMission === 'buzz' && <BuzzMission onComplete={dismiss} />}
          {ambientCheckDone && !effectiveMission && (
            <Pressable style={styles.fallbackDismiss} onPress={dismiss}>
              <Text style={styles.fallbackDismissText}>Dismiss</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.caption}>Snoozing is disabled — finish the mission to dismiss.</Text>
      </SafeAreaView>
    </View>
  );
}

function AlarmSoundLoop({ soundName }: { soundName: string }) {
  const source = isSoundName(soundName) ? SOUND_FILES[soundName] : SOUND_FILES['Classic Alarm'];
  const player = useAudioPlayer(source);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
    }).catch(() => {});
    safeAudioCall(() => {
      player.loop = true;
      player.play();
    });
    return () => {
      safeAudioCall(() => player.pause());
    };
  }, [player]);

  return null;
}

function AmbientPreCheck({ onResult }: { onResult: (roomActive: boolean) => void }) {
  const { metering } = useMicMetering();
  const samples = useRef<number[]>([]);
  const reported = useRef(false);

  useEffect(() => {
    if (metering !== null) samples.current.push(metering);
  }, [metering]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (reported.current) return;
      reported.current = true;
      const avg = samples.current.length
        ? samples.current.reduce((a, b) => a + b, 0) / samples.current.length
        : -80;
      onResult(avg > AMBIENT_ACTIVE_THRESHOLD_DB);
    }, AMBIENT_CHECK_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
    </View>
  );
}

function Counter({ count, target }: { count: number; target: number }) {
  return (
    <Text style={styles.counter}>
      {count}
      <Text style={styles.counterTarget}>/{target}</Text>
    </Text>
  );
}

function MathMission({ onSolved }: { onSolved: () => void }) {
  const problem = useMemo(() => {
    const a = 2 + Math.floor(Math.random() * 8); // 2..9
    const b = 2 + Math.floor(Math.random() * 8); // 2..9
    return { a, b, answer: a * b };
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
        {problem.a} × {problem.b} = ?
      </Text>
      <View style={[styles.inputDisplay, wrong && styles.inputDisplayWrong]}>
        <Text style={input ? styles.inputText : styles.inputPlaceholder}>
          {input || 'Enter answer'}
        </Text>
      </View>
      <View style={styles.keypad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ghost', '0', 'back'].map((key, i) => (
          <Pressable
            key={i}
            style={[styles.key, key === 'ghost' && styles.keyGhost]}
            disabled={key === 'ghost'}
            onPress={() => press(key)}>
            {key === 'back' ? (
              <BackspaceIcon size={22} />
            ) : key === 'ghost' ? null : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>Type the answer to dismiss.</Text>
    </View>
  );
}

function TapMission({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const remaining = TAP_TARGET - count;
  return (
    <View style={styles.centerWrap}>
      <Counter count={count} target={TAP_TARGET} />
      <ProgressBar progress={count / TAP_TARGET} />
      <Pressable
        style={styles.tapTarget}
        onPress={() => {
          const next = count + 1;
          setCount(next);
          if (next >= TAP_TARGET) onComplete();
        }}>
        <View style={[styles.ring, styles.ringOuter]} />
        <View style={[styles.ring, styles.ringInner]} />
        <View style={styles.tapCore}>
          <View style={styles.tapDot} />
        </View>
      </Pressable>
      <Text style={styles.hint}>{remaining} more taps — almost there!</Text>
    </View>
  );
}

function ShakeMission({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const remaining = SHAKE_TARGET - count;
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
      <Counter count={count} target={SHAKE_TARGET} />
      <ProgressBar progress={count / SHAKE_TARGET} />
      <ShakeArt />
      <Text style={styles.hint}>Keep shaking — {remaining} to go!</Text>
    </View>
  );
}

function ClapMission({ onComplete }: { onComplete: () => void }) {
  const { metering, error } = useMicMetering();
  const [count, setCount] = useState(0);
  const remaining = CLAP_TARGET - count;
  const wasAbove = useRef(false);
  const lastCountAt = useRef(0);

  useEffect(() => {
    if (metering === null) return;
    const THRESHOLD_DB = -20;
    const DEBOUNCE_MS = 250;
    const now = Date.now();
    const isAbove = metering > THRESHOLD_DB;
    if (isAbove && !wasAbove.current && now - lastCountAt.current > DEBOUNCE_MS) {
      lastCountAt.current = now;
      setCount((c) => {
        const next = c + 1;
        if (next >= CLAP_TARGET) onComplete();
        return next;
      });
    }
    wasAbove.current = isAbove;
  }, [metering, onComplete]);

  if (error) return <MicPermissionFallback mission="clap" onDismiss={onComplete} />;

  return (
    <View style={styles.centerWrap}>
      <Counter count={count} target={CLAP_TARGET} />
      <ProgressBar progress={count / CLAP_TARGET} />
      <ClapBars count={count} />
      <Text style={styles.hint}>Listening for claps — {remaining} to go!</Text>
    </View>
  );
}

function BuzzMission({ onComplete }: { onComplete: () => void }) {
  const { metering, error } = useMicMetering();
  const [count, setCount] = useState(0);
  const remaining = BUZZ_TARGET - count;
  const aboveSince = useRef<number | null>(null);
  const cooldownUntil = useRef(0);
  const countedThisBurst = useRef(false);

  useEffect(() => {
    if (metering === null) return;
    const THRESHOLD_DB = -25;
    const MIN_SUSTAIN_MS = 700;
    const COOLDOWN_MS = 500;
    const now = Date.now();
    const isAbove = metering > THRESHOLD_DB;

    if (isAbove) {
      if (aboveSince.current === null) aboveSince.current = now;
      if (
        !countedThisBurst.current &&
        now - aboveSince.current >= MIN_SUSTAIN_MS &&
        now >= cooldownUntil.current
      ) {
        countedThisBurst.current = true;
        cooldownUntil.current = now + COOLDOWN_MS;
        setCount((c) => {
          const next = c + 1;
          if (next >= BUZZ_TARGET) onComplete();
          return next;
        });
      }
    } else {
      aboveSince.current = null;
      countedThisBurst.current = false;
    }
  }, [metering, onComplete]);

  if (error) return <MicPermissionFallback mission="buzz" onDismiss={onComplete} />;

  return (
    <View style={styles.centerWrap}>
      <Counter count={count} target={BUZZ_TARGET} />
      <ProgressBar progress={count / BUZZ_TARGET} />
      <BuzzArt />
      <Text style={styles.hint}>Make a long "bzzzzz" — {remaining} to go!</Text>
    </View>
  );
}

function MicPermissionFallback({
  mission,
  onDismiss,
}: {
  mission: DismissMethod;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.centerWrap}>
      <Text style={styles.comingSoonText}>
        BuzzBee needs microphone access for the {missionLabel(mission)} mission. You can dismiss
        manually this time.
      </Text>
      <Pressable style={styles.fallbackDismiss} onPress={onDismiss}>
        <Text style={styles.fallbackDismissText}>Dismiss</Text>
      </Pressable>
    </View>
  );
}

function ShakeArt() {
  return (
    <Svg width={230} height={120} viewBox="0 0 230 120" fill="none">
      <Path d="M66 40 Q46 60 66 80" stroke="#2B2420" strokeWidth={4.5} strokeLinecap="round" opacity={0.55} />
      <Path d="M42 26 Q14 60 42 94" stroke="#2B2420" strokeWidth={4.5} strokeLinecap="round" opacity={0.3} />
      <Path d="M164 40 Q184 60 164 80" stroke="#2B2420" strokeWidth={4.5} strokeLinecap="round" opacity={0.55} />
      <Path d="M188 26 Q216 60 188 94" stroke="#2B2420" strokeWidth={4.5} strokeLinecap="round" opacity={0.3} />
      <Rect x="93" y="12" width={44} height={96} rx={12} fill="#fff" stroke="#2B2420" strokeWidth={4.5} transform="rotate(-13 115 60)" />
      <Rect x="101" y="24" width={28} height={66} rx={6} fill={Colors.accent} opacity={0.4} transform="rotate(-13 115 60)" />
    </Svg>
  );
}

function ClapBars({ count }: { count: number }) {
  const heights = [24, 48, 80, 58, 92, 42, 64, 30];
  const activeBars = Math.round((count / CLAP_TARGET) * heights.length);
  return (
    <View style={styles.bars}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={[styles.bar, { height: h }, i >= activeBars && styles.barDim]}
        />
      ))}
    </View>
  );
}

function BuzzArt() {
  return (
    <Svg width={260} height={96} viewBox="0 0 260 96" fill="none">
      <Defs>
        <LinearGradient id="buzzGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={Colors.accentDeep} />
          <Stop offset="100%" stopColor="#F6D488" />
        </LinearGradient>
      </Defs>
      <Path
        d="M8 48 C16 16 26 16 34 48 C42 78 52 78 60 48 C68 8 78 8 86 48 C94 86 104 86 112 48 C120 12 130 12 138 48 C146 82 156 82 164 48 C172 20 182 20 190 48 C198 74 208 74 216 48 C224 28 234 28 242 48 C248 60 253 60 258 48"
        stroke="url(#buzzGrad)"
        strokeWidth={6}
        strokeLinecap="round"
      />
    </Svg>
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
  screen: { flex: 1, backgroundColor: '#f0f0f0' },
  safeArea: { flex: 1, alignItems: 'center' },
  top: { alignItems: 'center', paddingTop: Spacing.xxxl },
  clock: { fontFamily: Fonts.extraBold, fontSize: 64, color: '#fff' },
  ampm: { fontFamily: Fonts.bold, fontSize: 20, color: '#fff', opacity: 0.85 },
  statusPill: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#2B2420',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  statusText: { fontFamily: Fonts.extraBold, fontSize: 11.5, color: Colors.accentDeep },
  eyebrow: {
    backgroundColor: Colors.accent + '33',
    borderRadius: Radii.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  eyebrowText: {
    fontFamily: Fonts.extraBold,
    fontSize: 14,
    color: Colors.accentDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  missionArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xl,
  },
  centerWrap: { width: '100%', alignItems: 'center', gap: 18 },
  counter: { fontFamily: Fonts.extraBold, fontSize: 76, color: Colors.accentDeep, lineHeight: 80 },
  counterTarget: { fontFamily: Fonts.bold, fontSize: 22, color: Colors.inkFaint },
  progressTrack: {
    width: '100%',
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F1E7D3',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.accentDeep, borderRadius: 8 },
  tapTarget: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 3, borderColor: Colors.accent },
  ringOuter: { width: 150, height: 150, opacity: 0.25 },
  ringInner: { width: 114, height: 114, opacity: 0.5 },
  tapCore: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accentDeep,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  tapDot: { width: 25, height: 25, borderRadius: 13, backgroundColor: '#fff' },
  hint: { fontFamily: Fonts.extraBold, fontSize: 20, color: Colors.ink, textAlign: 'center', lineHeight: 26 },
  mathWrap: { width: '100%', alignItems: 'center', gap: 16 },
  equation: { fontFamily: Fonts.extraBold, fontSize: 40, color: Colors.ink },
  inputDisplay: {
    width: '100%',
    backgroundColor: '#F8EFDC',
    borderWidth: 2,
    borderColor: '#F1E1BE',
    borderRadius: Radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  inputDisplayWrong: { backgroundColor: '#FBDADA', borderColor: '#F0B8B8' },
  inputText: { fontFamily: Fonts.extraBold, fontSize: 24, color: Colors.ink, letterSpacing: 1 },
  inputPlaceholder: { fontFamily: Fonts.extraBold, fontSize: 24, color: '#C9B98F', letterSpacing: 1 },
  keypad: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  key: {
    width: '31%',
    height: 46,
    borderRadius: Radii.sm,
    backgroundColor: '#F8EFDC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGhost: { backgroundColor: 'transparent' },
  keyText: { fontFamily: Fonts.extraBold, fontSize: 18, color: Colors.ink },
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
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, height: 100 },
  bar: { width: 15, borderRadius: 999, backgroundColor: Colors.accent },
  barDim: { backgroundColor: '#F1E7D3' },
  caption: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.ink,
    opacity: 0.85,
    textAlign: 'center',
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
});
