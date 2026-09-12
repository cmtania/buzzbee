import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 120;

/**
 * Starts mic recording (metering-only — no audio is retained; expo-audio
 * writes to a temp file we never read, matching the plan's "on-device only,
 * never recorded" ambient/mission promise) and exposes the live dBFS level.
 */
export function useMicMetering() {
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, POLL_INTERVAL_MS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) {
          if (!cancelled) setError('Microphone permission denied');
          return;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        if (cancelled) return;
        recorder.record();
        startedRef.current = true;
        setStarted(true);
      } catch {
        if (!cancelled) setError('Could not start the microphone');
      }
    })();

    return () => {
      cancelled = true;
      if (startedRef.current) {
        recorder.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metering = started && typeof state.metering === 'number' ? state.metering : null;
  return { metering, error };
}
