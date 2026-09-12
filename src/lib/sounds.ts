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
