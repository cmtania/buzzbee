// Sound/vibration/system-volume effects shared by the Ringing screen (the
// main alarm) and the Task Ringing screen (a Hybrid Alarm follow-up task) —
// extracted out of ringing.tsx with no behavior change, since none of these
// depend on that screen's own mission/escalation state, only on props.
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';
import { Vibration } from 'react-native';
import { VolumeManager } from 'react-native-volume-manager';

import { isCustomSoundUri, isSoundName, safeAudioCall, SOUND_FILES } from '@/lib/sounds';

// Gentle-escalation volume ramp for a Wake Window alarm — starts at this
// fraction of full volume right when the window opens and linearly ramps to
// full volume by windowEnd (see escalationDurationMs). A hard-deadline
// (fixed-time) ring — or a Hybrid Alarm task, which never escalates — goes
// straight to full volume.
const ESCALATION_START_VOLUME = 0.15;
const ESCALATION_STEP_MS = 500;
// How often AlarmSoundLoop checks the sound is still playing (see its watchdog).
const WATCHDOG_MS = 1000;

export function AlarmSoundLoop({
  soundName,
  escalate,
  escalationMs,
}: {
  soundName: string;
  escalate: boolean;
  escalationMs: number;
}) {
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

    // Resume after an interruption. Another audio session taking over — an
    // AlarmKit alert firing on top of this screen, a call, Siri — pauses this
    // player, and nothing resumes it afterwards: the alarm went silent while
    // AlarmVibration's own timer kept buzzing. For as long as this is mounted
    // the sound is meant to be playing, so anything not playing is restarted.
    const watchdog = setInterval(() => {
      safeAudioCall(() => {
        if (player.playing) return;
        setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'doNotMix',
          shouldPlayInBackground: true,
        }).catch(() => {});
        player.play();
      });
    }, WATCHDOG_MS);

    let interval: ReturnType<typeof setInterval> | null = null;
    if (escalate) {
      const startedAt = Date.now();
      interval = setInterval(() => {
        const progress = Math.min(1, (Date.now() - startedAt) / escalationMs);
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
      clearInterval(watchdog);
      if (interval) clearInterval(interval);
      safeAudioCall(() => player.pause());
    };
  }, [player, escalate, escalationMs]);

  return null;
}

export function AlarmVibration() {
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
 * jumps straight to max. On a Wake Window ring (escalate=true) it ramps from
 * whatever the system volume already was up to max over the window's own
 * duration (windowStart to windowEnd), instead of jumping to max instantly —
 * the two ramps compound with AlarmSoundLoop's, so the alarm genuinely
 * starts quiet and builds rather than being loud from the first second.
 *
 * The volume is also locked for as long as this is mounted: pressing the
 * side volume-down button snaps it straight back, so the alarm can't be
 * turned quiet instead of finishing the mission. "Back" means the current
 * target — max for a fixed-time ring, or the ramp's current level for a Wake
 * Window ring (snapping to max there would throw away the gentle build).
 * Raising the volume is always allowed.
 */
export function DeviceVolumeBoost({ escalate, escalationMs }: { escalate: boolean; escalationMs: number }) {
  useEffect(() => {
    let previousVolume: number | null = null;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    // Null until the starting volume is known — nothing to enforce before that.
    let target: number | null = null;

    // Our own setVolume calls fire this listener too, but they only ever land
    // at or above target, so they never trigger a correction loop.
    const listener = VolumeManager.addVolumeListener(({ volume }) => {
      if (cancelled || target === null) return;
      if (volume < target - 0.01) {
        VolumeManager.setVolume(target, { showUI: false }).catch(() => {});
      }
    });

    VolumeManager.getVolume()
      .then((result) => {
        if (cancelled) return;
        previousVolume = result.volume;

        if (!escalate) {
          target = 1;
          return VolumeManager.setVolume(1, { showUI: false });
        }

        const startVolume = result.volume;
        const startedAt = Date.now();
        target = startVolume;
        interval = setInterval(() => {
          const progress = Math.min(1, (Date.now() - startedAt) / escalationMs);
          target = startVolume + (1 - startVolume) * progress;
          VolumeManager.setVolume(target, { showUI: false }).catch(() => {});
          if (progress >= 1 && interval) {
            clearInterval(interval);
            interval = null;
          }
        }, ESCALATION_STEP_MS);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      listener.remove();
      if (interval) clearInterval(interval);
      if (previousVolume !== null) {
        VolumeManager.setVolume(previousVolume, { showUI: false }).catch(() => {});
      }
    };
  }, [escalate, escalationMs]);

  return null;
}
