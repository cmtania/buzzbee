import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SwipeToDismissSheet } from '@/components/swipe-to-dismiss-sheet';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { MicFrames } from '@/components/mic-frames';
import {
  BUZZ_RISE_DB,
  buzzThreshold,
  CLAP_RISE_DB,
  clapThreshold,
  MicMission,
  roomLevel,
  saveCalibration,
} from '@/lib/mic-calibration';
import { MissionIcon } from '@/lib/mission-meta';
import { averageShape, Frame, matchTolerance } from '@/lib/sound-print';

const QUIET_MS = 2000;
const CLAP_TIMEOUT_MS = 10000;
const CLAPS_WANTED = 3;
const CLAP_DEBOUNCE_MS = 250;
const BUZZ_WINDOW_MS = 4000;
// How long the buzz has to be heard in total (time, not frame count: frames
// are ~64ms with sound matching, ~120ms on the loudness-only fallback).
const BUZZ_MIN_MS = 1100;

type Phase = 'intro' | 'quiet' | 'listen' | 'done' | 'failed';

/**
 * One-time calibration for the Clap or Buzz mission (route param
 * mission=clap|buzz): measure the room while the user stays quiet, then
 * their clap or buzz. Saves a loudness threshold between the two, plus a
 * fingerprint of the clap or buzz itself (16 numbers) so missions can ignore
 * other loud sounds. Never any audio — see lib/mic-calibration.ts.
 */
export default function CalibrateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mission?: string }>();
  const mission: MicMission = params.mission === 'buzz' ? 'buzz' : 'clap';

  const [phase, setPhase] = useState<Phase>('intro');
  const [clapsHeard, setClapsHeard] = useState(0);
  const [level, setLevel] = useState<number | null>(null);
  const [result, setResult] = useState<{
    threshold: number;
    riseDb: number;
    print: number[] | null;
    tolerance: number;
  } | null>(null);
  const [failReason, setFailReason] = useState('');

  // Mutable measurement state, read inside the sample callback and timers.
  const m = useRef({
    phase: 'intro' as Phase,
    quiet: [] as number[],
    room: 0,
    peaks: [] as number[],
    inClap: false,
    peak: -160,
    peakShape: null as number[] | null,
    lastClapAt: 0,
    clapShapes: [] as number[][],
    buzz: [] as number[],
    buzzShapes: [] as number[][],
    buzzMs: 0,
    lastFrameAt: 0,
    timers: [] as ReturnType<typeof setTimeout>[],
  });

  function go(next: Phase) {
    m.current.phase = next;
    setPhase(next);
  }

  function clearTimers() {
    m.current.timers.forEach(clearTimeout);
    m.current.timers = [];
  }
  useEffect(() => clearTimers, []);

  function fail(reason: string) {
    clearTimers();
    setFailReason(reason);
    go('failed');
  }

  function finishClap() {
    clearTimers();
    const { room, peaks } = m.current;
    if (peaks.length < 2) {
      fail('We couldn’t hear enough claps. Try clapping louder or closer to the phone.');
      return;
    }
    const threshold = clapThreshold(room, peaks);
    const shapes = m.current.clapShapes;
    const print = shapes.length >= 2 ? averageShape(shapes) : null;
    setResult({
      threshold,
      riseDb: Math.round(Math.min(...peaks) - room),
      print,
      tolerance: print ? matchTolerance(print, shapes) : 0.7,
    });
    go('done');
  }

  function finishBuzz() {
    clearTimers();
    const { room, buzz, buzzMs, buzzShapes } = m.current;
    if (buzzMs < BUZZ_MIN_MS || buzz.length === 0) {
      fail('We couldn’t hear a long enough buzz. Hold one steady “bzzzz” for 2 seconds.');
      return;
    }
    const threshold = buzzThreshold(room, buzz);
    const print = buzzShapes.length >= 5 ? averageShape(buzzShapes) : null;
    setResult({
      threshold,
      riseDb: Math.round(Math.max(...buzz) - room),
      print,
      tolerance: print ? matchTolerance(print, buzzShapes) : 0.7,
    });
    go('done');
  }

  function start() {
    const s = m.current;
    s.quiet = [];
    s.peaks = [];
    s.buzz = [];
    s.clapShapes = [];
    s.buzzShapes = [];
    s.buzzMs = 0;
    s.lastFrameAt = 0;
    s.inClap = false;
    s.lastClapAt = 0;
    setClapsHeard(0);
    setResult(null);
    go('quiet');
    s.timers.push(
      setTimeout(() => {
        s.room = roomLevel(s.quiet);
        go('listen');
        s.timers.push(
          mission === 'clap' ? setTimeout(finishClap, CLAP_TIMEOUT_MS) : setTimeout(finishBuzz, BUZZ_WINDOW_MS)
        );
      }, QUIET_MS)
    );
  }

  function onFrame({ db, shape }: Frame, now: number) {
    setLevel(db);
    const s = m.current;
    const dt = s.lastFrameAt ? Math.min(250, now - s.lastFrameAt) : 0;
    s.lastFrameAt = now;
    if (s.phase === 'quiet') {
      s.quiet.push(db);
      return;
    }
    if (s.phase !== 'listen') return;

    if (mission === 'buzz') {
      if (db > s.room + BUZZ_RISE_DB) {
        s.buzz.push(db);
        s.buzzMs += dt;
        if (shape) s.buzzShapes.push(shape);
      }
      return;
    }

    // Clap: a rise of CLAP_RISE_DB starts one; its peak (and the shape of the
    // loudest slice) is recorded once the level falls back near the room.
    if (!s.inClap && db > s.room + CLAP_RISE_DB && now - s.lastClapAt > CLAP_DEBOUNCE_MS) {
      s.inClap = true;
      s.peak = db;
      s.peakShape = shape;
      s.lastClapAt = now;
      setClapsHeard((c) => c + 1);
    } else if (s.inClap) {
      if (db > s.peak) {
        s.peak = db;
        s.peakShape = shape ?? s.peakShape;
      }
      if (db < s.room + 6) {
        s.inClap = false;
        s.peaks.push(s.peak);
        if (s.peakShape) s.clapShapes.push(s.peakShape);
        if (s.peaks.length >= CLAPS_WANTED) finishClap();
      }
    }
  }

  async function save(tryIt: boolean) {
    if (!result) return;
    await saveCalibration(mission, result.threshold, result.print, result.tolerance);
    // replace, not push: the mission preview needs the microphone, and this
    // screen must be gone (its recorder stopped) before that one starts.
    if (tryIt) router.replace({ pathname: '/ringing', params: { preview: '1', mission } });
    else router.back();
  }

  const measuring = phase === 'quiet' || phase === 'listen';
  const name = mission === 'clap' ? 'Clap' : 'Buzz';

  let headline = '';
  let detail = '';
  if (phase === 'intro') {
    headline = `Calibrate ${name}`;
    detail =
      mission === 'clap'
        ? 'BuzzBee will listen to your room for 2 seconds, then to 3 claps — so the Clap mission hears your claps, not the room.'
        : 'BuzzBee will listen to your room for 2 seconds, then to one long “bzzzz” — so the Buzz mission hears you, not the room.';
  } else if (phase === 'quiet') {
    headline = 'Stay quiet…';
    detail = 'Measuring your room.';
  } else if (phase === 'listen') {
    headline = mission === 'clap' ? `Clap ${CLAPS_WANTED} times` : 'Buzz now — hold it!';
    detail = mission === 'clap' ? `${clapsHeard} of ${CLAPS_WANTED} heard` : 'Keep one steady “bzzzz” for 2 seconds.';
  } else if (phase === 'done' && result) {
    headline = 'Got it!';
    detail = result.print
      ? `Got your ${mission === 'clap' ? 'clap' : 'buzz'} — it’s about ${result.riseDb} dB louder than your room. Missions will now listen for that sound, and ignore other noise.`
      : `Your ${mission} is about ${result.riseDb} dB louder than your room. Missions will now listen for that.`;
  } else if (phase === 'failed') {
    headline = 'Let’s try again';
    detail = failReason;
  }

  // Live meter: maps roughly -60..0 dB onto the bar, just so the user can see
  // the phone is hearing them.
  const meterPct = level === null ? 0 : Math.max(0, Math.min(100, ((level + 60) / 60) * 100));

  return (
    <Pressable style={styles.backdrop} onPress={() => !measuring && router.back()}>
      <SwipeToDismissSheet onDismiss={() => router.back()} style={styles.sheet} disabled={measuring}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={styles.handle} />
          {measuring && <MicFrames onFrame={onFrame} onError={() => fail('BuzzBee needs microphone access to calibrate. You can allow it in the Settings app.')} />}

          <View style={styles.body}>
            <View style={styles.iconWrap}>
              <MissionIcon method={mission} size={40} color={Colors.accentDeep} />
            </View>
            <Text style={styles.headline}>{headline}</Text>
            <Text style={styles.detail}>{detail}</Text>
            {measuring && (
              <View style={styles.meterTrack}>
                <View style={[styles.meterFill, { width: `${meterPct}%` }]} />
              </View>
            )}
            <Text style={styles.privacy}>Analysed on your phone and never recorded — only a few numbers describing your sound are saved.</Text>
          </View>

          <View style={styles.footer}>
            {phase === 'done' ? (
              <>
                <Pressable style={styles.secondaryBtn} onPress={() => save(true)}>
                  <Text style={styles.secondaryText}>Save & try it</Text>
                </Pressable>
                <Pressable style={styles.primaryBtn} onPress={() => save(false)}>
                  <Text style={styles.primaryText}>Save</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={styles.secondaryBtn} onPress={() => router.back()} disabled={measuring}>
                  <Text style={styles.secondaryText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.primaryBtn, measuring && styles.btnDisabled]} onPress={start} disabled={measuring}>
                  <Text style={styles.primaryText}>{phase === 'failed' ? 'Try again' : measuring ? 'Listening…' : 'Start'}</Text>
                </Pressable>
              </>
            )}
          </View>
        </SafeAreaView>
      </SwipeToDismissSheet>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,36,32,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bg, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl },
  safeArea: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.trackOff,
    alignSelf: 'center',
    marginTop: 10,
  },
  body: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: 12 },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.accent + '26',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headline: { fontFamily: Fonts.extraBold, fontSize: 24, color: Colors.ink, textAlign: 'center' },
  detail: { fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.inkSoft, textAlign: 'center', lineHeight: 22 },
  meterTrack: {
    width: '100%',
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.trackOff,
    overflow: 'hidden',
    marginTop: 8,
  },
  meterFill: { height: '100%', borderRadius: 7, backgroundColor: Colors.accent },
  privacy: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.inkFaint, textAlign: 'center', marginTop: 8 },
  footer: { flexDirection: 'row', gap: 12, paddingTop: 4, paddingBottom: Spacing.xl },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Colors.trackOff,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontFamily: Fonts.extraBold, fontSize: 17, color: Colors.ink },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  primaryText: { fontFamily: Fonts.extraBold, fontSize: 17, color: Colors.ink },
});
