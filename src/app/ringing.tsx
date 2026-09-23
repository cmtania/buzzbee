import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { AlarmSoundLoop, AlarmVibration, DeviceVolumeBoost } from '@/components/alarm-ring-effects';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { useMicMetering } from '@/hooks/use-mic-metering';
import { AudioWaveform, Check, Delete, Eye, X } from 'lucide-react-native';
import { confirmationDelaySec } from '@/lib/alarm-launch';
import { armConfirmationAlarm, disarmConfirmationAlarm } from '@/lib/alarmkit';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { addAlarmTrigger, addWakeEvent, getAlarm } from '@/lib/db';
import { cancelAlarmNotification, scheduleAlarmNotification } from '@/lib/scheduling';
import { Alarm, BUZZ_TARGET, CLAP_TARGET, DismissMethod, SHAKE_TARGET, TAP_TARGET } from '@/lib/types';
import { msUntilDeadline } from '@/lib/wake-window-engine';
import { genId } from '@/lib/id';
import { MISSION_ORDER, missionLabel } from '@/lib/mission-meta';

// Dark palette, matching the Bedtime (wind-down) screen so the two
// full-screen takeover moments read as the same surface.
const DARK_BG = '#1B1712';
const TEXT = '#FFFFFF';
const TEXT_SOFT = '#B8A98E';
const SURFACE = 'rgba(255,255,255,0.08)';
const SURFACE_BORDER = 'rgba(255,255,255,0.16)';

const RANDOMIZABLE: DismissMethod[] = MISSION_ORDER.filter((m) => m !== 'random');
const MIC_MISSIONS: DismissMethod[] = ['clap', 'buzz'];
// If the mission is started but sees no progress for this long, we assume
// the person fell back asleep mid-mission: the alarm resumes ringing and
// the mission resets to 0, rather than staying silently "in progress"
// forever.
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;
// How often the confirmation alarm is pushed back while this screen is open
// and on screen. Well under its 90s minimum delay, so it can't fire in between.
const CONFIRMATION_HEARTBEAT_MS = 30 * 1000;

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
  const { draft, setDraft } = useAlarmDraft();
  const params = useLocalSearchParams<{
    alarmId?: string;
    triggeredBy?: string;
    preview?: string;
    mission?: string;
  }>();
  // Preview mode (from Choose Mission's Preview button): the real screen,
  // driven by a mission picked in the params instead of a saved alarm —
  // but deliberately inert. No sound, no vibration, no volume boost, no
  // AlarmKit arming, no WakeEvent/trigger rows: it's a look at the UI and a
  // chance to try the mission, not a ring that history should remember.
  const isPreview = params.preview === '1';
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  // The real path resolves its mission from the loaded alarm row; preview
  // has no row, so it resolves from the route param instead — once, in a
  // lazy initializer rather than an effect, so re-renders can't re-roll
  // which mission a "Random" preview landed on.
  const [alarmMission, setAlarmMission] = useState<DismissMethod | null>(null);
  const [previewMission] = useState<DismissMethod | null>(() => {
    const requested = params.mission as DismissMethod | undefined;
    if (params.preview !== '1' || !requested) return null;
    return requested === 'random'
      ? RANDOMIZABLE[Math.floor(Math.random() * RANDOMIZABLE.length)]
      : requested;
  });
  const effectiveMission = isPreview ? previewMission : alarmMission;
  const [alarmLoaded, setAlarmLoaded] = useState(!params.alarmId);
  const startedAt = useRef(Date.now());
  // Set once dismiss() starts, so the heartbeat below can't re-arm the
  // confirmation alarm after dismiss has disarmed it.
  const dismissing = useRef(false);
  const heartbeatInFlight = useRef<Promise<void> | null>(null);
  // Time left to the hard deadline when this ring started; 0 = no ramp.
  const [rampMs, setRampMs] = useState(0);
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
        setAlarmMission(
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
        armConfirmationAlarm(a, confirmationDelaySec(a)).catch(() => {});
        // Fixed once at load, not recomputed per render: the clock re-renders
        // this screen every second, and a changing escalationMs would restart
        // the ramp each time.
        setRampMs(params.triggeredBy === 'window-start' ? msUntilDeadline(a) : 0);
        // For History's calendar: records that this alarm rang today,
        // independent of whether the mission ever gets completed (WakeEvent
        // is only recorded on an actual dismiss, in dismiss() below). At
        // most one row per alarm+day regardless of how many times this
        // effect re-runs (e.g. the confirmation-alarm re-ring above).
        addAlarmTrigger(a.id, new Date().toISOString().slice(0, 10)).catch(() => {});
      }
      setAlarmLoaded(true);
    });
  }, [params.alarmId, params.triggeredBy]);

  const dataReady = alarmLoaded;

  // Keep the confirmation alarm from firing on top of this screen. It exists
  // for when the mission gets abandoned — the app force-quit, the phone locked
  // and left — but it was armed once and then fired regardless, even with this
  // screen open and ringing right in front of the user. Re-arming it every 30s
  // (only while the app is in the foreground) keeps pushing it out of reach.
  // The moment that stops — app killed, or backgrounded — the last re-arm
  // still fires, as intended: within 90s, or at a Wake Window's deadline.
  useEffect(() => {
    if (isPreview || !alarm) return;
    const id = setInterval(() => {
      if (dismissing.current || AppState.currentState !== 'active') return;
      heartbeatInFlight.current = armConfirmationAlarm(alarm, confirmationDelaySec(alarm)).catch(() => {});
    }, CONFIRMATION_HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [alarm, isPreview]);

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
    dismissing.current = true;
    // A re-arm already in flight could otherwise land after the disarm below
    // and leave a stray confirmation alarm ringing 90s after a real dismissal.
    if (heartbeatInFlight.current) await heartbeatInFlight.current;
    if (isPreview) {
      // Nothing to record or cancel — just leave the preview.
      router.back();
      return;
    }
    if (alarm) {
      await disarmConfirmationAlarm(alarm.id);
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
        triggeredBy: params.triggeredBy === 'window-start' ? 'window-start' : 'hard-deadline',
        dismissedAfterSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      });
      // Re-arm the next occurrence. cancelAlarmNotification above removed the
      // whole AlarmKit registration and the backup notification — for a
      // repeating alarm that included every future day, so without this the
      // next morning had no native alarm at all and only rang if the app
      // happened to still be running. Must run after addWakeEvent: the
      // scheduler reads today's WakeEvent to skip re-ringing later today.
      // One-off alarms aren't re-armed, same as before.
      if (alarm.enabled && alarm.repeatDays.length > 0) {
        await scheduleAlarmNotification(alarm).catch(() => {});
      }
    }
    router.replace('/mission-complete');
  }

  // Preview only: commit the mission being previewed to the alarm draft and
  // go straight back to the form. Both this screen and the Choose Mission
  // sheet it was opened from sit above add-edit in the stack, so dismissTo
  // pops past the sheet rather than landing back on the list we just chose
  // from. Uses params.mission, not the resolved effectiveMission — previewing
  // "Random" should save Random, not the one it happened to roll.
  function pickMission() {
    const requested = params.mission as DismissMethod | undefined;
    if (requested) setDraft((d) => ({ ...d, dismissMethod: requested }));
    router.dismissTo('/add-edit');
  }

  // Preview has no saved alarm row to read a name off, so it shows the name
  // currently typed into the form it was launched from. Empty until the
  // person names the alarm, same as the real screen when a label was never set.
  const displayLabel = isPreview ? draft.label : (alarm?.label ?? '');

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
  const shouldBoostVolume = dataReady && !!effectiveMission && !isPreview;

  // Gentle escalation (secondary differentiator #1): a Wake Window alarm
  // starts quiet right when the window opens and ramps to full volume by
  // windowEnd; a hard-deadline (fixed-time) ring has no slack left and goes
  // straight to full volume.
  // The ramp ends at the deadline itself (msUntilDeadline), not the window's
  // full length after the ring began — a ring that starts late in the window
  // still reaches full volume on time. Opened at/after the deadline (e.g. from
  // the deadline backstop), rampMs is 0 and it rings at full volume at once.
  const escalate = rampMs > 0;
  const escalationMs = rampMs;

  const statusText = isPreview
    ? 'Preview — this alarm isn’t really ringing'
    : params.triggeredBy === 'window-start'
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.top}>
          <Text style={styles.clock}>
            {clockValue}
            <Text style={styles.ampm}> {clockAmpm}</Text>
          </Text>
          {!!displayLabel && <Text style={styles.alarmLabel}>{displayLabel}</Text>}
          <View style={[styles.statusPill, isPreview && styles.statusPillPreview]}>
            {isPreview ? (
              <Eye size={18} color={Colors.accent} />
            ) : (
              <AudioWaveform size={18} color={Colors.accent} />
            )}
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

        <View style={styles.footer}>
          <Text style={styles.caption}>
            {isPreview
              ? 'Try the mission — finishing it just closes this preview.'
              : 'Snoozing is disabled — finish the mission to dismiss.'}
          </Text>
          {isPreview && (
            <View style={styles.previewActions}>
              <Pressable
                style={[styles.actionBtn, styles.closeAction]}
                onPress={() => router.back()}>
                <X size={20} color={TEXT} />
                <Text style={styles.closeActionText}>Close</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.pickAction]} onPress={pickMission}>
                <Check size={20} color="#2B2420" />
                <Text style={styles.pickActionText} numberOfLines={1}>
                  Pick this mission
                </Text>
              </Pressable>
            </View>
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
              <Delete size={32} color={TEXT} />
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
      <Path d="M66 40 Q46 60 66 80" stroke={TEXT} strokeWidth={4.5} strokeLinecap="round" opacity={0.6} />
      <Path d="M42 26 Q14 60 42 94" stroke={TEXT} strokeWidth={4.5} strokeLinecap="round" opacity={0.3} />
      <Path d="M164 40 Q184 60 164 80" stroke={TEXT} strokeWidth={4.5} strokeLinecap="round" opacity={0.6} />
      <Path d="M188 26 Q216 60 188 94" stroke={TEXT} strokeWidth={4.5} strokeLinecap="round" opacity={0.3} />
      <Rect x="93" y="12" width={44} height={96} rx={12} fill={DARK_BG} stroke={TEXT} strokeWidth={4.5} transform="rotate(-13 115 60)" />
      <Rect x="101" y="24" width={28} height={66} rx={6} fill={Colors.accent} opacity={0.55} transform="rotate(-13 115 60)" />
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
          <Stop offset="0%" stopColor={Colors.accent} />
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
  screen: { flex: 1, backgroundColor: DARK_BG },
  safeArea: { flex: 1, alignItems: 'center' },
  // alignSelf stretch (not horizontal padding) on purpose: the pill below
  // needs a definite parent width for its flexShrink to bite, while the 101pt
  // clock needs every point of that width to stay on one line.
  top: { alignItems: 'center', alignSelf: 'stretch', paddingTop: Spacing.xxl },
  clock: { fontFamily: Fonts.extraBold, fontSize: 101, color: TEXT },
  ampm: { fontFamily: Fonts.bold, fontSize: 34, color: TEXT, opacity: 0.85 },
  alarmLabel: {
    fontFamily: Fonts.extraBold,
    fontSize: 26,
    color: TEXT,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  statusPill: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    // The preview copy is long; let the pill and its label shrink/wrap
    // rather than run off the edges of a narrow screen.
    flexShrink: 1,
    marginHorizontal: Spacing.xl,
    gap: 8,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: SURFACE_BORDER,
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusPillPreview: { borderColor: Colors.accent },
  statusText: { fontFamily: Fonts.extraBold, fontSize: 16, color: Colors.accent, flexShrink: 1 },
  eyebrow: {
    backgroundColor: Colors.accent + '33',
    borderRadius: Radii.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  eyebrowText: {
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  startBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 36,
    paddingVertical: 20,
    borderRadius: Radii.pill,
    shadowColor: Colors.accentDeep,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  startBtnText: { fontFamily: Fonts.extraBold, fontSize: 22, color: '#2B2420', letterSpacing: 0.4 },
  missionArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  missionBlock: { width: '100%', alignItems: 'center', gap: 30 },
  centerWrap: { width: '100%', alignItems: 'center', gap: 18 },
  // lineHeight must stay >= fontSize here: anything smaller shrinks the line
  // box below the glyphs, and the digits bleed up over the mission label.
  counter: { fontFamily: Fonts.extraBold, fontSize: 87.5, color: Colors.accent, lineHeight: 98 },
  counterTarget: { fontFamily: Fonts.bold, fontSize: 29, color: TEXT_SOFT },
  progressTrack: {
    width: '100%',
    height: 16,
    borderRadius: 8,
    backgroundColor: SURFACE,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 8 },
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
  hint: { fontFamily: Fonts.extraBold, fontSize: 25, color: TEXT, textAlign: 'center', lineHeight: 30 },
  mathWrap: { width: '100%', alignItems: 'center', gap: 18 },
  equation: { fontFamily: Fonts.extraBold, fontSize: 64.5, color: TEXT },
  inputDisplay: {
    width: '100%',
    backgroundColor: SURFACE,
    borderWidth: 2,
    borderColor: SURFACE_BORDER,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  inputDisplayWrong: { backgroundColor: 'rgba(193,56,56,0.28)', borderColor: '#C13838' },
  inputText: { fontFamily: Fonts.extraBold, fontSize: 37, color: TEXT, letterSpacing: 1 },
  inputPlaceholder: { fontFamily: Fonts.extraBold, fontSize: 27.5, color: TEXT_SOFT, letterSpacing: 1 },
  keypad: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  key: {
    width: '31%',
    height: 58,
    borderRadius: Radii.sm,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGhost: { backgroundColor: 'transparent' },
  keyText: { fontFamily: Fonts.extraBold, fontSize: 33, color: TEXT },
  comingSoonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 19,
    color: TEXT,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  fallbackDismiss: {
    marginTop: 8,
    backgroundColor: Colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: Radii.lg,
  },
  fallbackDismissText: { fontFamily: Fonts.extraBold, fontSize: 19, color: '#2B2420' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, height: 100 },
  bar: { width: 15, borderRadius: 999, backgroundColor: Colors.accent },
  barDim: { backgroundColor: SURFACE },
  footer: {
    width: '100%',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.md,
    gap: 14,
  },
  caption: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: TEXT_SOFT,
    textAlign: 'center',
    lineHeight: 22,
  },
  previewActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: Radii.pill,
  },
  // Uneven flex on purpose: "Pick this mission" is a much longer label than
  // "Close", so an even split would squeeze it onto two lines.
  closeAction: { flex: 1, backgroundColor: SURFACE, borderWidth: 1.5, borderColor: SURFACE_BORDER },
  closeActionText: { fontFamily: Fonts.extraBold, fontSize: 18, color: TEXT },
  pickAction: { flex: 2, backgroundColor: Colors.accent },
  pickActionText: { fontFamily: Fonts.extraBold, fontSize: 18, color: '#2B2420' },
});
