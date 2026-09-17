import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { AlarmSoundLoop, AlarmVibration, DeviceVolumeBoost } from '@/components/alarm-ring-effects';
import { BackspaceIcon, WaveformIcon } from '@/components/icons';
import { RingingWaveBackground } from '@/components/ringing-wave-background';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { useMicMetering } from '@/hooks/use-mic-metering';
import { armConfirmationAlarm, CONFIRMATION_ALARM_DELAY_SEC, disarmConfirmationAlarm } from '@/lib/alarmkit';
import { addAlarmTrigger, addWakeEvent, getAlarm } from '@/lib/db';
import { cancelHybridTaskChain, scheduleHybridTaskChain } from '@/lib/hybrid-tasks';
import { cancelAlarmNotification } from '@/lib/scheduling';
import { Alarm, BUZZ_TARGET, CLAP_TARGET, DismissMethod, SHAKE_TARGET, TAP_TARGET } from '@/lib/types';
import { escalationDurationMs } from '@/lib/wake-window-engine';
import { genId } from '@/lib/id';
import { MISSION_ORDER, missionLabel } from '@/lib/mission-meta';

const RANDOMIZABLE: DismissMethod[] = MISSION_ORDER.filter((m) => m !== 'random');
const MIC_MISSIONS: DismissMethod[] = ['clap', 'buzz'];
// If the mission is started but sees no progress for this long, we assume
// the person fell back asleep mid-mission: the alarm resumes ringing and
// the mission resets to 0, rather than staying silently "in progress"
// forever.
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;

// "<Verb> to dismiss" pill-eyebrow copy, per design/Ringing*.dc.html.
const MISSION_VERBS: Record<DismissMethod, string> = {
  math: 'Solve to dismiss',
  clap: 'Clap to dismiss',
  shake: 'Shake to dismiss',
  buzz: 'Buzz to dismiss',
  tap: 'Tap to dismiss',
  random: 'Dismiss',
};

function minutesUntilDeadline(alarm: Alarm, now: Date): number {
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
  const startedAt = useRef(Date.now());
  const [now, setNow] = useState(new Date());

  // For Clap/Buzz (see needsMissionGate below): 'ringing' = sound playing,
  // showing a Start Mission button; 'mission' = sound paused, mission UI
  // live. For every other mission, phase flips to 'mission' immediately
  // and sound just keeps playing throughout — no gate needed since there's
  // no mic conflict. missionAttempt increments each (re)start so the
  // mission component remounts with fresh state, including after timeouts.
  const [phase, setPhase] = useState<'ringing' | 'mission'>('ringing');
  const [missionAttempt, setMissionAttempt] = useState(0);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
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
        // Anti-cheat safety net: tapping Stop on the AlarmKit alert only
        // stops *that* alert and gets us this far — it doesn't mean the
        // mission is done. Without this, force-quitting right now would
        // silence the alarm for good. Disarmed the moment dismiss() runs
        // (mission actually completed); otherwise it re-rings on its own,
        // fully OS-native, and relaunches straight back into this mission —
        // backed by AlarmKit instead of a JS timer, for when the app
        // doesn't survive to see INACTIVITY_TIMEOUT_MS's own JS timer below.
        armConfirmationAlarm(a, CONFIRMATION_ALARM_DELAY_SEC).catch(() => {});
        // Hybrid Alarm tasks only make sense once you're actually awake —
        // provisionally cancel today's task notifications the moment the
        // main alarm actually rings, and only restore them in dismiss()
        // below if the mission genuinely gets completed. If it never does
        // (ignored, slept through, force-quit and never reopened), they
        // simply stay cancelled — never firing a "you're awake" reminder for
        // a wake-up that didn't happen.
        cancelHybridTaskChain(a.id).catch(() => {});
        // For History's calendar: records that this alarm rang today,
        // independent of whether the mission ever gets completed (WakeEvent
        // is only recorded on an actual dismiss, in dismiss() below). At
        // most one row per alarm+day regardless of how many times this
        // effect re-runs (e.g. the confirmation-alarm re-ring above).
        addAlarmTrigger(a.id, new Date().toISOString().slice(0, 10)).catch(() => {});
      }
      setAlarmLoaded(true);
    });
  }, [params.alarmId]);

  const dataReady = alarmLoaded;

  // Only Clap/Buzz need the explicit Start Mission gate — they're the only
  // missions that conflict with the alarm sound (their own mic detection
  // would pick it up). Math/Tap/Shake have no such conflict, so they skip
  // straight into the mission with the alarm still ringing the whole time.
  const needsMissionGate = !!effectiveMission && MIC_MISSIONS.includes(effectiveMission);
  const autoStarted = useRef(false);

  useEffect(() => {
    if (!dataReady || !effectiveMission || needsMissionGate || autoStarted.current) return;
    autoStarted.current = true;
    startMission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady, effectiveMission, needsMissionGate]);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  }, []);

  const armInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimer.current = setTimeout(() => {
      // No progress in 3 minutes — assume they fell back asleep. Resume
      // ringing and drop back to the Start Mission screen; the mission
      // component unmounts here, so its progress resets to 0 next attempt.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setPhase('ringing');
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimer]);

  useEffect(() => clearInactivityTimer, [clearInactivityTimer]);

  // Math/Tap/Shake don't use the inactivity timer (see startMission) — they
  // get this no-op instead of armInactivityTimer for their onActivity prop.
  const noop = useCallback(() => {}, []);

  function startMission() {
    setMissionAttempt((n) => n + 1);
    setPhase('mission');
    // Only Clap/Buzz need the inactivity-reset safety net — their sound is
    // paused during the mission, so silence + no progress could mean the
    // person fell back asleep. Math/Tap/Shake keep the sound playing the
    // whole time, so there's no silent-fallback-asleep risk to guard
    // against — and critically, they have no "Start Mission" button to
    // recover with (that's gated to needsMissionGate), so arming this timer
    // for them was a dead end: time out once and the screen goes blank
    // forever, since the auto-start effect only ever fires once per mount.
    if (needsMissionGate) armInactivityTimer();
  }

  async function dismiss() {
    clearInactivityTimer();
    if (alarm) {
      await disarmConfirmationAlarm(alarm.id);
      // false: only clear today's already-rung instance of the main alarm —
      // the Hybrid Alarm task chain is handled explicitly below instead of
      // by this call (see cancelAlarmNotification's doc comment).
      await cancelAlarmNotification(alarm.id, false);
      // The mission is genuinely done now — restore the task chain that was
      // provisionally cancelled the moment this alarm started ringing (see
      // the alarm-load effect above), so today's follow-up reminders proceed.
      await scheduleHybridTaskChain(alarm);
      const deadline = new Date();
      const [hh, mm] = alarm.windowEnd.split(':').map(Number);
      deadline.setHours(hh, mm, 0, 0);
      await addWakeEvent({
        id: genId('wake'),
        alarmId: alarm.id,
        date: new Date().toISOString().slice(0, 10),
        scheduledDeadline: deadline.toISOString(),
        actualRingTime: new Date().toISOString(),
        triggeredBy: params.triggeredBy === 'window-start' ? 'window-start' : 'hard-deadline',
        dismissedAfterSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      });
    }
    router.replace('/mission-complete');
  }

  const clockLabel = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const [clockValue, clockAmpm] = clockLabel.split(' ');

  // Sound plays continuously for Math/Tap/Shake (no mic conflict). For
  // Clap/Buzz it plays only while ringing (before the mission is started,
  // and again if it times out from inactivity) and pauses once that
  // mission is actively being attempted, keeping their mic detection clean
  // without ever leaving the alarm silent for the person to sleep through.
  const shouldPlaySound =
    dataReady && !!alarm && !!effectiveMission && (!needsMissionGate || phase === 'ringing');

  // Vibration doesn't conflict with anything mic-related, so — unlike sound
  // — it keeps going through the Start-Mission gate and Clap/Buzz's mission
  // attempts too, only stopping once dismissed.
  const shouldVibrate = !!alarm?.vibrationEnabled && dataReady && !!effectiveMission;

  // Boosts the device's actual system volume (not just this app's player —
  // see DeviceVolumeBoost's comment for why that's a different thing) for
  // as long as the alarm is genuinely trying to wake someone. Same scope as
  // vibration: stays on through the Start-Mission gate and Clap/Buzz attempts.
  const shouldBoostVolume = dataReady && !!effectiveMission;

  // Gentle escalation (secondary differentiator #1): a Wake Window alarm
  // starts quiet right when the window opens and ramps to full volume by
  // windowEnd; a hard-deadline (fixed-time) ring has no slack left and goes
  // straight to full volume.
  const escalate = params.triggeredBy === 'window-start';
  const escalationMs = alarm ? escalationDurationMs(alarm) : 0;

  const statusText =
    params.triggeredBy === 'window-start'
      ? alarm
        ? `Wake Window · ${minutesUntilDeadline(alarm, now)} min until deadline`
        : 'Wake Window'
      : 'Deadline reached';

  return (
    <View style={styles.screen}>
      {shouldPlaySound && (
        <AlarmSoundLoop soundName={alarm!.sound} escalate={escalate} escalationMs={escalationMs} />
      )}
      {shouldVibrate && <AlarmVibration />}
      {shouldBoostVolume && <DeviceVolumeBoost escalate={escalate} escalationMs={escalationMs} />}
      <RingingWaveBackground />
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
          <View style={styles.missionBlock}>
            {dataReady && effectiveMission && (
              <View style={styles.eyebrow}>
                <Text style={styles.eyebrowText}>{MISSION_VERBS[effectiveMission]}</Text>
              </View>
            )}
            {dataReady && effectiveMission && needsMissionGate && phase === 'ringing' && (
              <Pressable style={styles.startBtn} onPress={startMission}>
                <Text style={styles.startBtnText}>Start Mission</Text>
              </Pressable>
            )}
            {dataReady && effectiveMission && phase === 'mission' && (
              <>
                {effectiveMission === 'math' && (
                  <MathMission key={missionAttempt} onSolved={dismiss} onActivity={noop} />
                )}
                {effectiveMission === 'tap' && (
                  <TapMission key={missionAttempt} onComplete={dismiss} onActivity={noop} />
                )}
                {effectiveMission === 'shake' && (
                  <ShakeMission key={missionAttempt} onComplete={dismiss} onActivity={noop} />
                )}
                {effectiveMission === 'clap' && (
                  <ClapMission key={missionAttempt} onComplete={dismiss} onActivity={armInactivityTimer} />
                )}
                {effectiveMission === 'buzz' && (
                  <BuzzMission key={missionAttempt} onComplete={dismiss} onActivity={armInactivityTimer} />
                )}
              </>
            )}
            {dataReady && !effectiveMission && (
              <Pressable style={styles.fallbackDismiss} onPress={dismiss}>
                <Text style={styles.fallbackDismissText}>Dismiss</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.caption}>Snoozing is disabled — finish the mission to dismiss.</Text>
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

function Counter({ count, target }: { count: number; target: number }) {
  return (
    <Text style={styles.counter}>
      {count}
      <Text style={styles.counterTarget}>/{target}</Text>
    </Text>
  );
}

type MissionProps = { onActivity: () => void };

function MathMission({ onSolved, onActivity }: { onSolved: () => void } & MissionProps) {
  const problem = useMemo(() => {
    const a = 2 + Math.floor(Math.random() * 8); // 2..9
    const b = 2 + Math.floor(Math.random() * 8); // 2..9
    return { a, b, answer: a * b };
  }, []);
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);

  function press(key: string) {
    onActivity();
    setWrong(false);
    if (key === 'back') {
      setInput((s) => s.slice(0, -1));
      return;
    }
    const next = input + key;
    if (next.length > 4) return;
    setInput(next);
    if (Number(next) === problem.answer) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSolved();
    } else if (next.length >= String(problem.answer).length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
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
              <BackspaceIcon size={28} />
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

function TapMission({ onComplete, onActivity }: { onComplete: () => void } & MissionProps) {
  const [count, setCount] = useState(0);
  const remaining = TAP_TARGET - count;
  return (
    <View style={styles.centerWrap}>
      <Counter count={count} target={TAP_TARGET} />
      <ProgressBar progress={count / TAP_TARGET} />
      <Pressable
        style={styles.tapTarget}
        onPress={() => {
          onActivity();
          const next = count + 1;
          setCount(next);
          if (next >= TAP_TARGET) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            onComplete();
          }
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

function ShakeMission({ onComplete, onActivity }: { onComplete: () => void } & MissionProps) {
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
        onActivity();
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

function ClapMission({ onComplete, onActivity }: { onComplete: () => void } & MissionProps) {
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
      onActivity();
      setCount((c) => {
        const next = c + 1;
        if (next >= CLAP_TARGET) onComplete();
        return next;
      });
    }
    wasAbove.current = isAbove;
  }, [metering, onComplete, onActivity]);

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

function BuzzMission({ onComplete, onActivity }: { onComplete: () => void } & MissionProps) {
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
        onActivity();
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
  }, [metering, onComplete, onActivity]);

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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f0f0' },
  safeArea: { flex: 1, alignItems: 'center' },
  top: { alignItems: 'center', paddingTop: Spacing.xxxl + 24 },
  clock: { fontFamily: Fonts.extraBold, fontSize: 88, color: '#fff' },
  ampm: { fontFamily: Fonts.bold, fontSize: 26, color: '#fff', opacity: 0.85 },
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
  startBtn: {
    backgroundColor: Colors.accentDeep,
    paddingHorizontal: 36,
    paddingVertical: 20,
    borderRadius: Radii.pill,
    shadowColor: Colors.accentDeep,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  startBtnText: { fontFamily: Fonts.extraBold, fontSize: 18, color: '#fff', letterSpacing: 0.4 },
  missionArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xl,
  },
  missionBlock: { width: '100%', alignItems: 'center', gap: 22 },
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
  mathWrap: { width: '100%', alignItems: 'center', gap: 18 },
  equation: { fontFamily: Fonts.extraBold, fontSize: 56, color: Colors.ink },
  inputDisplay: {
    width: '100%',
    backgroundColor: '#F8EFDC',
    borderWidth: 2,
    borderColor: '#F1E1BE',
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  inputDisplayWrong: { backgroundColor: '#FBDADA', borderColor: '#F0B8B8' },
  inputText: { fontFamily: Fonts.extraBold, fontSize: 32, color: Colors.ink, letterSpacing: 1 },
  inputPlaceholder: { fontFamily: Fonts.extraBold, fontSize: 24, color: '#C9B98F', letterSpacing: 1 },
  keypad: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  key: {
    width: '31%',
    height: 58,
    borderRadius: Radii.sm,
    backgroundColor: '#F8EFDC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGhost: { backgroundColor: 'transparent' },
  keyText: { fontFamily: Fonts.extraBold, fontSize: 26, color: Colors.ink },
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
