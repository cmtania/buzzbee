// Storage layer for user-recorded alarm sounds: moves a just-recorded temp
// file into permanent app storage and keeps the custom_sounds DB table (name
// + path, for listing/deleting) in sync with it. See CustomSound's doc
// comment in types.ts for why alarm.sound stores the file path directly
// rather than an id needing a lookup at playback time.
import { Directory, File, Paths } from 'expo-file-system';

import { addCustomSound, deleteCustomSound, getCustomSounds } from './db';
import { genId } from './id';
import { isCustomSoundUri } from './sounds';
import { CustomSound } from './types';

function customSoundsDir(): Directory {
  const dir = new Directory(Paths.document, 'custom-sounds');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export { getCustomSounds };

export async function nextCustomSoundName(): Promise<string> {
  const existing = await getCustomSounds();
  return `My Sound ${existing.length + 1}`;
}

/** Copies a just-recorded temp file (recorder.uri) into permanent storage and records it. */
export async function saveRecordingAsCustomSound(tempUri: string, name: string): Promise<CustomSound> {
  const source = new File(tempUri);
  const ext = source.extension || '.m4a';
  const id = genId('sound');
  const dest = new File(customSoundsDir(), `${id}${ext}`);
  await source.copy(dest);

  const sound: CustomSound = {
    id,
    name,
    filePath: dest.uri,
    createdAt: new Date().toISOString(),
  };
  await addCustomSound(sound);
  return sound;
}

/**
 * A bundled sound's name is already display-ready; a custom sound is stored
 * as its raw file path (see the file's top doc comment), so anywhere that
 * shows `alarm.sound` / `AppSettings.defaultSound` as text needs to resolve
 * it back to the name the user gave it when they recorded it.
 */
export function soundDisplayName(soundValue: string, customSounds: CustomSound[]): string {
  if (!isCustomSoundUri(soundValue)) return soundValue;
  return customSounds.find((s) => s.filePath === soundValue)?.name ?? 'Custom Sound';
}

/** Deletes both the stored recording and its DB row. Safe to call even if the file is already gone. */
export async function removeCustomSound(sound: CustomSound): Promise<void> {
  try {
    const file = new File(sound.filePath);
    if (file.exists) file.delete();
  } catch {
    // file already gone — still clean up the DB row below
  }
  await deleteCustomSound(sound.id);
}
