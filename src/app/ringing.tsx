import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, Vibration, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { VolumeManager } from 'react-native-volume-manager';

import { BackspaceIcon, WaveformIcon } from '@/components/icons';
import { RingingWaveBackground } from '@/components/ringing-wave-background';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { useMicMetering } from '@/hooks/use-mic-metering';
import { armConfirmationAlarm, disarmConfirmationAlarm } from '@/lib/alarmkit';
import { addWakeEvent, getAlarm, getSettings } from '@/lib/db';
import { cancelAlarmNotification } from '@/lib/scheduling';
import { isCustomSoundUri, isSoundName, safeAudioCall, SOUND_FILES } from '@/lib/sounds';
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
// A full minute of silent listening before the alarm makes any sound — only
// safe to do on a Smart-Wake *early* ring (see needsAmbientCheck below),
// since there's real buffer time before the hard deadline. A hard-deadline
// ring never gets this delay: that's the "no more slack" moment and must
// ring immediately regardless of ambient awareness.
const AMBIENT_CHECK_MS = 60 * 1000;
// Gentle-escalation volume ramp (secondary differentiator #1, PLAN.md) —
// only applied on a Smart-Wake early ring, same reasoning as the ambient
// check above: a hard-deadline ring goes straight to full volume, no ramp.
const ESCALATION_DURATION_MS = 75 * 1000;
const ESCALATION_START_VOLUME = 0.15;
const ESCALATION_STEP_MS = 500;
// If the mission is started but sees no progress for this long, we assume
// the person fell back asleep mid-mission: the alarm resumes ringing and
// the mission resets to 0, rather than staying silently "in progress"
// forever.
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000;
// Delay before the AlarmKit confirmation/anti-cheat safety net re-rings (see
// armConfirmationAlarm) — deliberately its own constant, not tied to
// INACTIVITY_TIMEOUT_MS above: that one only matters while the app stays
// alive, so 3 minutes is a safe, generous grace period there. This one
// fires unconditionally, alive or not, so a short value here means even a
// legitimately slow mission attempt (no force-quit at all) could trigger a
// duplicate re-ring before finishing — confirmed on a real device at 30s
// (too short, re-rang mid-legitimate-attempt). 90s is a safer floor: still
// closes the force-quit escape window quickly, but comfortably outlasts a
// real attempt at any of the five missions (Tap x100, Clap x50, etc.).
const CONFIRMATION_ALARM_DELAY_SEC = 90;

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
        // Anti-cheat safety net: tapping Stop on the AlarmKit alert only
        // stops *that* alert and gets us this far — it doesn't mean the
        // mission is done. Without this, force-quitting right now would
        // silence the alarm for good. Disarmed the moment dismiss() runs
        // (mission actually completed); otherwise it re-rings on its own,
        // fully OS-native, and relaunches straight back into this mission —
        // backed by AlarmKit instead of a JS timer, for when the app
        // doesn't survive to see INACTIVITY_TIMEOUT_MS's own JS timer below.
        armConfirmationAlarm(a, CONFIRMATION_ALARM_DELAY_SEC).catch(() => {});
      }
      setAlarmLoaded(true);
    });
  }, [params.alarmId]);

  const dataReady = alarmLoaded && settings !== null;

  // Skip the ambient pre-check for Clap/Buzz — they run their own mic
  // session for the mission itself, and iOS only supports one recorder at a
  // time, so running both concurrently would conflict. Also only run it on
  // a Smart-Wake *early* ring — see AMBIENT_CHECK_MS's comment for why a
  // hard-deadline ring never gets this pre-ring delay.
  const needsAmbientCheck =
    dataReady &&
    !!settings?.ambientAwarenessEnabled &&
    !!effectiveMission &&
    !MIC_MISSIONS.includes(effectiveMission) &&
    params.triggeredBy === 'smart-detection';
  const ambientCheckDone = dataReady && (!needsAmbientCheck || roomActive !== null);

  // A confident "room's already active" result skips the mission/ring
  // entirely in favor of a lighter one-tap confirmation — unless the person
  // says the room noise was a false read and taps through to the real
  // mission instead.
  const [skipAmbientShortcut, setSkipAmbientShortcut] = useState(false);
  const showAlreadyUpScreen = ambientCheckDone && !!roomActive && !skipAmbientShortcut;

  // Only Clap/Buzz need the explicit Start Mission gate — they're the only
  // missions that conflict with the alarm sound (their own mic detection
  // would pick it up). Math/Tap/Shake have no such conflict, so they skip
  // straight into the mission with the alarm still ringing the whole time.
  const needsMissionGate = !!effectiveMission && MIC_MISSIONS.includes(effectiveMission);
  const autoStarted = useRef(false);

  useEffect(() => {
    if (
      !ambientCheckDone ||
      !effectiveMission ||
      needsMissionGate ||
      autoStarted.current ||
      showAlreadyUpScreen
    )
      return;
    autoStarted.current = true;
    startMission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambientCheckDone, effectiveMission, needsMissionGate, showAlreadyUpScreen]);

  useEffect(() => {
    if (!ambientCheckDone) return;
    Haptics.notificationAsync(
      roomActive ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    ).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambientCheckDone]);

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
    router.replace('/mission-complete');
  }

  const clockLabel = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const [clockValue, clockAmpm] = clockLabel.split(' ');

  // Sound plays continuously for Math/Tap/Shake (no mic conflict). For
  // Clap/Buzz it plays only while ringing (before the mission is started,
  // and again if it times out from inactivity) and pauses once that
  // mission is actively being attempted, keeping their mic detection clean
  // without ever leaving the alarm silent for the person to sleep through.
  // Never plays during the "Already up?" screen — the whole point of the
  // ambient pre-check is to avoid the full alarm blast when it isn't needed.
  const shouldPlaySound =
    ambientCheckDone &&
    !!alarm &&
    !!effectiveMission &&
    !showAlreadyUpScreen &&
    (!needsMissionGate || phase === 'ringing');

  // Vibration doesn't conflict with anything mic-related, so — unlike sound
  // — it keeps going through the Start-Mission gate and Clap/Buzz's mission
  // attempts too, only stopping for the "Already up?" screen or once
  // dismissed.
  const shouldVibrate =
    !!alarm?.vibrationEnabled && ambientCheckDone && !!effectiveMission && !showAlreadyUpScreen;

  // Boosts the device's actual system volume (not just this app's player —
  // see DeviceVolumeBoost's comment for why that's a different thing) for
  // as long as the alarm is genuinely trying to wake someone. Same scope as
  // vibration: stays on through the Start-Mission gate and Clap/Buzz
  // attempts, only off during the deliberately-quiet "Already up?" screen.
  const shouldBoostVolume = ambientCheckDone && !!effectiveMission && !showAlreadyUpScreen;

  // Gentle escalation (secondary differentiator #1) only applies to a
  // Smart-Wake early ring — a hard-deadline ring has no slack left and goes
  // straight to full volume.
  const escalate = params.triggeredBy === 'smart-detection';

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
      {shouldPlaySound && <AlarmSoundLoop soundName={alarm!.sound} escalate={escalate} />}
      {shouldVibrate && <AlarmVibration />}
      {shouldBoostVolume && <DeviceVolumeBoost escalate={escalate} />}
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
            {needsAmbientCheck && !ambientCheckDone && <AmbientPreCheck onResult={setRoomActive} />}
            {showAlreadyUpScreen && (
              <View style={styles.alreadyUpWrap}>
                <Text style={styles.alreadyUpTitle}>Sounds like you're already up!</Text>
                <Text style={styles.alreadyUpSub}>
                  We heard activity in your room, so we skipped straight to a quick check instead of
                  the full mission.
                </Text>
                <Pressable style={styles.alreadyUpConfirmBtn} onPress={dismiss}>
                  <Text style={styles.alreadyUpConfirmText}>Yes, I'm up</Text>
                </Pressable>
                <Pressable style={styles.alreadyUpFallbackBtn} onPress={() => setSkipAmbientShortcut(true)}>
                  <Text style={styles.alreadyUpFallbackText}>No, wake me properly</Text>
                </Pressable>
              </View>
            )}
            {ambientCheckDone && effectiveMission && !showAlreadyUpScreen && (
              <View style={styles.eyebrow}>
                <Text style={styles.eyebrowText}>{MISSION_VERBS[effectiveMission]}</Text>
              </View>
            )}
            {ambientCheckDone &&
              effectiveMission &&
              !showAlreadyUpScreen &&
              needsMissionGate &&
              phase === 'ringing' && (
                <Pressable style={styles.startBtn} onPress={startMission}>
                  <Text style={styles.startBtnText}>Start Mission</Text>
                </Pressable>
              )}
            {ambientCheckDone && effectiveMission && !showAlreadyUpScreen && phase === 'mission' && (
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
            {ambientCheckDone && !effectiveMission && (
              <Pressable style={styles.fallbackDismiss} onPress={dismiss}>
                <Text style={styles.fallbackDismissText}>Dismiss</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.caption}>
          {showAlreadyUpScreen
            ? "We'll ring properly if that wasn't actually you."
            : 'Snoozing is disabled — finish the mission to dismiss.'}
        </Text>
      </SafeAreaView>
    </View>
  );
}

function AlarmSoundLoop({ soundName, escalate }: { soundName: string; escalate: boolean }) {
  const source = isSoundName(soundName)
    ? SOUND_FILES[soundName]
    : isCustomSoundUri(soundName)
      ? { uri: soundName }
      : SOUND_FILES['Classic Alarm'];
  const player = useAudioPlayer(source);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
    }).catch(() => {});
    safeAudioCall(() => {
      player.loop = true;
      player.volume = escalate ? ESCALATION_START_VOLUME : 1;
      player.play();
    });

    let interval: ReturnType<typeof setInterval> | null = null;
    if (escalate) {
      const startedAt = Date.now();
      interval = setInterval(() => {
        const progress = Math.min(1, (Date.now() - startedAt) / ESCALATION_DURATION_MS);
        safeAudioCall(() => {
          player.volume = ESCALATION_START_VOLUME + (1 - ESCALATION_START_VOLUME) * progress;
        });
        if (progress >= 1 && interval) {
          clearInterval(interval);
          interval = null;
        }
      }, ESCALATION_STEP_MS);
    }

    return () => {
      if (interval) clearInterval(interval);
      safeAudioCall(() => player.pause());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, escalate]);

  return null;
}

function AlarmVibration() {
  useEffect(() => {
    // iOS ignores Vibration's pattern/repeat arguments (Android-only there)
    // and only ever fires one default buzz per call — so a repeating alarm
    // vibration on both platforms means re-triggering it on an interval
    // ourselves, rather than relying on a single patterned call.
    Vibration.vibrate();
    const interval = setInterval(() => Vibration.vibrate(), 2000);
    return () => {
      clearInterval(interval);
      Vibration.cancel();
    };
  }, []);

  return null;
}

/**
 * Controls the phone's actual system/media volume for the alarm, then
 * restores whatever it was before once dismissed — distinct from
 * AlarmSoundLoop's escalation, which only ramps this app's own player
 * volume within whatever the system volume already is. iOS has no public
 * API for a third-party app to set system volume directly; this relies on
 * react-native-volume-manager's well-known (if undocumented) trick of
 * driving MPVolumeView's internal slider, same technique other alarm apps
 * use for this. `showUI: false` keeps the native volume HUD from popping up
 * during the change.
 *
 * On a hard-deadline ring (escalate=false) there's no slack left, so it
 * jumps straight to max. On a Smart-Wake early ring (escalate=true) it ramps
 * from whatever the system volume already was up to max over the same
 * window as AlarmSoundLoop's escalation, instead of jumping to max
 * instantly — the two ramps compound, so the alarm genuinely starts quiet
 * and builds rather than being loud from the first second.
 */
function DeviceVolumeBoost({ escalate }: { escalate: boolean }) {
  useEffect(() => {
    let previousVolume: number | null = null;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    VolumeManager.getVolume()
      .then((result) => {
        if (cancelled) return;
        previousVolume = result.volume;

        if (!escalate) {
          return VolumeManager.setVolume(1, { showUI: false });
        }

        const startVolume = result.volume;
        const startedAt = Date.now();
        interval = setInterval(() => {
          const progress = Math.min(1, (Date.now() - startedAt) / ESCALATION_DURATION_MS);
          VolumeManager.setVolume(startVolume + (1 - startVolume) * progress, {
            showUI: false,
          }).catch(() => {});
          if (progress >= 1 && interval) {
            clearInterval(interval);
            interval = null;
          }
        }, ESCALATION_STEP_MS);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (previousVolume !== null) {
        VolumeManager.setVolume(previousVolume, { showUI: false }).catch(() => {});
      }
    };
  }, [escalate]);

  return null;
}

function AmbientPreCheck({ onResult }: { onResult: (roomActive: boolean) => void }) {
  const { metering } = useMicMetering();
  const samples = useRef<number[]>([]);
  const reported = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(AMBIENT_CHECK_MS / 1000));

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

  useEffect(() => {
    const startedAt = Date.now();
    const totalSeconds = Math.round(AMBIENT_CHECK_MS / 1000);
    const tick = setInterval(() => {
      const remaining = totalSeconds - Math.floor((Date.now() - startedAt) / 1000);
      setSecondsLeft(Math.max(0, remaining));
    }, 250);
    return () => clearInterval(tick);
  }, []);

  return (
    <View style={styles.ambientWrap}>
      <Text style={styles.ambientCount}>{secondsLeft}</Text>
      <Text style={styles.ambientHint}>Checking room noise before your alarm rings…</Text>
      <ProgressBar progress={1 - secondsLeft / Math.round(AMBIENT_CHECK_MS / 1000)} />
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
  ambientWrap: { width: '100%', alignItems: 'center', gap: 14 },
  ambientCount: { fontFamily: Fonts.extraBold, fontSize: 64, color: Colors.accentDeep },
  ambientHint: {
    fontFamily: Fonts.extraBold,
    fontSize: 22,
    color: Colors.ink,
    textAlign: 'center',
    lineHeight: 29,
    paddingHorizontal: Spacing.md,
  },
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
  alreadyUpWrap: { width: '100%', alignItems: 'center', gap: 16 },
  alreadyUpTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 28,
    color: Colors.ink,
    textAlign: 'center',
    lineHeight: 34,
  },
  alreadyUpSub: {
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    color: Colors.inkSoft,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  alreadyUpConfirmBtn: {
    marginTop: 8,
    alignSelf: 'stretch',
    backgroundColor: Colors.accent,
    paddingVertical: 20,
    borderRadius: Radii.pill,
    alignItems: 'center',
    shadowColor: Colors.accentDeep,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  alreadyUpConfirmText: { fontFamily: Fonts.extraBold, fontSize: 19, color: '#fff' },
  alreadyUpFallbackBtn: {
    alignSelf: 'stretch',
    backgroundColor: Colors.ink,
    paddingVertical: 20,
    borderRadius: Radii.pill,
    alignItems: 'center',
  },
  alreadyUpFallbackText: { fontFamily: Fonts.extraBold, fontSize: 17, color: '#fff' },
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
