import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';

import { getAlarms } from '@/lib/db';
import { safeAudioCall } from '@/lib/sounds';

const RECHECK_INTERVAL_MS = 30000;
const SILENT_LOOP = require('../../assets/sounds/silence.wav');

/**
 * Keeps a near-silent audio session alive in the background so iOS doesn't
 * suspend the app's JS process while it's backgrounded (screen off, another
 * app open) — not force-quit. Apps with an active "audio" background mode
 * (see the expo-audio plugin's enableBackgroundPlayback in app.json) and a
 * genuinely playing audio session are exempted from the normal few-second
 * background suspension that would otherwise stop useSmartWakeMonitor's
 * setInterval from ever ticking again.
 *
 * Only armed while at least one alarm is enabled, to avoid pointless
 * battery drain the rest of the time.
 *
 * This does NOT survive a full force-quit (swiped away in the app
 * switcher) — no third-party app's code runs at all once truly killed.
 * That's a separate, much bigger undertaking (a CallKit-style "incoming
 * call" alarm) — see PLAN.md's Known Technical Risk section.
 */
export function useBackgroundKeepAlive() {
  const player = useAudioPlayer(SILENT_LOOP);
  const armed = useRef(false);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
    safeAudioCall(() => {
      player.loop = true;
    });
  }, [player]);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const alarms = await getAlarms();
      const shouldBeArmed = alarms.some((a) => a.enabled);
      if (cancelled || shouldBeArmed === armed.current) return;
      armed.current = shouldBeArmed;
      safeAudioCall(() => {
        if (shouldBeArmed) player.play();
        else player.pause();
      });
    }

    sync();
    const interval = setInterval(sync, RECHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [player]);
}
