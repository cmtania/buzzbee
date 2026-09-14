// Real bundled alarm tones — sourced from Mixkit's free, commercial-use,
// no-attribution-required sound effects library. See assets/sounds/SOURCES.md
// for provenance. Not yet peak-normalized (see PLAN.md's Sound Assets note).

export const SOUND_FILES = {
  'Classic Alarm': require('../../assets/sounds/classic-alarm.mp3'),
  'Digital Buzzer': require('../../assets/sounds/digital-buzzer.mp3'),
  'Warning Buzzer': require('../../assets/sounds/warning-buzzer.mp3'),
  'Morning Alarm': require('../../assets/sounds/morning-alarm.mp3'),
  'Intense Electricity': require('../../assets/sounds/intense-electricity.wav'),
  'Sound Alert': require('../../assets/sounds/sound-alert.wav'),
  'Space Shooter': require('../../assets/sounds/space-shooter.wav'),
  'Vintage Telephone': require('../../assets/sounds/vintage-telephone.wav'),
} as const;

export type SoundName = keyof typeof SOUND_FILES;

export const SOUND_NAMES = Object.keys(SOUND_FILES) as SoundName[];

export function isSoundName(value: string): value is SoundName {
  return value in SOUND_FILES;
}

/**
 * A custom recorded sound is stored directly as its `file://` URI in
 * `alarm.sound` / `AppSettings.defaultSound` — this just tells the UI when to
 * render it as a "Your Sounds" row instead of a bundled one. Playback and
 * scheduling code don't need this: they already branch on isSoundName() and
 * fall back to a bundled default for anything else, which already covers a
 * custom sound whose file has since been deleted.
 */
export function isCustomSoundUri(value: string): boolean {
  return value.startsWith('file://');
}

/**
 * Filenames for the native OS notification sound (the backgrounded/killed-app
 * safety net in lib/scheduling.ts) — separate from SOUND_FILES above, which is
 * what plays in-app once the Ringing screen is actually mounted.
 *
 * iOS notification sounds must be uncompressed PCM in a .wav/.caf/.aiff file,
 * 30s or shorter, bundled via the expo-notifications config plugin's `sounds`
 * array (see app.json) — the four .mp3 sources above don't qualify as-is, so
 * these are separately-encoded PCM copies in assets/sounds/notif/, with
 * underscore-only filenames (Android's asset-name validation rejects the
 * hyphens used in the in-app filenames above).
 */
export const NOTIFICATION_SOUND_FILES: Record<SoundName, string> = {
  'Classic Alarm': 'classic_alarm.wav',
  'Digital Buzzer': 'digital_buzzer.wav',
  'Warning Buzzer': 'warning_buzzer.wav',
  'Morning Alarm': 'morning_alarm.wav',
  'Intense Electricity': 'intense_electricity.wav',
  'Sound Alert': 'sound_alert.wav',
  'Space Shooter': 'space_shooter.wav',
  'Vintage Telephone': 'vintage_telephone.wav',
};

/**
 * expo-audio's AudioPlayer wraps a native object that can already be torn
 * down by the time an effect cleanup fires (especially on fast unmount/
 * navigation) — calling .play()/.pause()/.seekTo() on it then throws
 * "Unable to find the native shared object associated with given
 * JavaScript object". These calls are fire-and-forget UI actions, so
 * swallowing that specific race is safe.
 */
export function safeAudioCall(fn: () => void): void {
  try {
    fn();
  } catch {
    // native player already released — nothing to do
  }
}
