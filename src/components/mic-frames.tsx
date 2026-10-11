// Owns the microphone while mounted and reports each short slice of sound as
// a Frame (loudness + spectral shape, see lib/sound-print.ts).
//
// Uses react-native-audio-api for raw mic samples. If that native module
// isn't in the build (an older dev client) or fails to start, it falls back
// to expo-audio's loudness metering — frames then carry `shape: null` and the
// missions simply match on loudness, exactly as before sound matching.
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useMicMetering } from '@/hooks/use-mic-metering';
import { analyse, Frame } from '@/lib/sound-print';

type AudioApi = typeof import('react-native-audio-api');

// Lazy, guarded require — a static import would crash at load time on a
// build without the native module, before any fallback could run.
let cached: AudioApi | null | undefined;
function loadAudioApi(): AudioApi | null {
  if (Platform.OS !== 'ios') return null;
  if (cached === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = require('react-native-audio-api') as AudioApi;
    } catch {
      cached = null;
    }
  }
  return cached;
}

const SAMPLE_RATE = 16000;
// ~64ms slices: short enough to catch a clap's burst, long enough for a
// usable spectrum.
const BUFFER = 1024;

type Props = {
  onFrame: (frame: Frame, at: number) => void;
  /** Microphone permission denied or the mic could not start at all. */
  onError: () => void;
};

export function MicFrames({ onFrame, onError }: Props) {
  const [fallback, setFallback] = useState(() => loadAudioApi() === null);
  // Latest callbacks, for the long-lived native callback.
  const frameRef = useRef(onFrame);
  const errorRef = useRef(onError);
  useEffect(() => {
    frameRef.current = onFrame;
    errorRef.current = onError;
  });

  useEffect(() => {
    if (fallback) return;
    const api = loadAudioApi();
    if (!api) return;
    let cancelled = false;
    const recorder = new api.AudioRecorder();
    (async () => {
      try {
        const perm = await api.AudioManager.requestRecordingPermissions();
        if (cancelled) return;
        if (perm !== 'Granted') {
          errorRef.current();
          return;
        }
        // playAndRecord so the mic works while BuzzBee's other audio session
        // (vibration, volume boost, the background keep-alive) carries on;
        // mixWithOthers so starting the mic doesn't stop that audio.
        api.AudioManager.setAudioSessionOptions({
          iosCategory: 'playAndRecord',
          iosMode: 'default',
          iosOptions: ['defaultToSpeaker', 'mixWithOthers', 'allowBluetoothA2DP'],
        });
        await api.AudioManager.setAudioSessionActivity(true);
        const reg = recorder.onAudioReady({ sampleRate: SAMPLE_RATE, bufferLength: BUFFER, channelCount: 1 }, (e) => {
          if (cancelled) return;
          frameRef.current(analyse(e.buffer.getChannelData(0), e.buffer.sampleRate), Date.now());
        });
        const started = reg.status === 'success' ? await recorder.start() : reg;
        if (started.status !== 'success' && !cancelled) setFallback(true);
      } catch {
        if (!cancelled) setFallback(true);
      }
    })();
    return () => {
      cancelled = true;
      recorder.clearOnAudioReady();
      recorder.stop().catch(() => {});
    };
  }, [fallback]);

  return fallback ? <MeteringFrames onFrame={onFrame} onError={onError} /> : null;
}

/** Loudness-only frames from expo-audio's metering (the pre-1.0.2 behaviour). */
function MeteringFrames({ onFrame, onError }: Props) {
  const { metering, error } = useMicMetering();
  const frameRef = useRef(onFrame);
  const errorRef = useRef(onError);
  useEffect(() => {
    frameRef.current = onFrame;
    errorRef.current = onError;
  });
  useEffect(() => {
    if (metering !== null) frameRef.current({ db: metering, shape: null }, Date.now());
  }, [metering]);
  useEffect(() => {
    if (error) errorRef.current();
  }, [error]);
  return null;
}
