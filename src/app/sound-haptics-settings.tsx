import { AudioSource, useAudioPlayer } from 'expo-audio';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon, MicIcon, TrashIcon } from '@/components/icons';
import { SwipeToDismissSheet } from '@/components/swipe-to-dismiss-sheet';
import { Toggle } from '@/components/toggle';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { getCustomSounds, removeCustomSound } from '@/lib/custom-sounds';
import { getSettings, updateSettings } from '@/lib/db';
import { safeAudioCall, SOUND_FILES, SOUND_NAMES } from '@/lib/sounds';
import { AppSettings, CustomSound } from '@/lib/types';

export default function SoundHapticsSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);

  useFocusEffect(
    useCallback(() => {
      getSettings().then(setSettings);
      getCustomSounds().then(setCustomSounds);
      return () => setPreviewing(null);
    }, [])
  );

  async function patch(update: Partial<AppSettings>) {
    setSettings(await updateSettings(update));
  }

  function handleDelete(sound: CustomSound) {
    Alert.alert('Delete This Sound?', `"${sound.name}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setPreviewing((p) => (p === sound.filePath ? null : p));
          await removeCustomSound(sound);
          if (settings?.defaultSound === sound.filePath) await patch({ defaultSound: 'Classic Alarm' });
          setCustomSounds(await getCustomSounds());
        },
      },
    ]);
  }

  if (!settings) return <View style={styles.backdrop} />;

  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()}>
      <SwipeToDismissSheet onDismiss={() => router.back()} style={styles.sheet}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={styles.handle} />
          <Text style={styles.title}>Sound & Haptics</Text>

          <View style={styles.body}>
            <View style={styles.rowCard}>
              <Text style={styles.rowLabel}>Haptics</Text>
              <Toggle value={settings.hapticsEnabled} onChange={(v) => patch({ hapticsEnabled: v })} />
            </View>
            <Text style={styles.hint}>Buttons, toggles, and missions give a light tap feedback.</Text>

            <View>
              <Text style={styles.sectionLabel}>Default Alarm Sound</Text>
              <Text style={styles.sectionHint}>Used for every new alarm you create — change it per-alarm anytime in Choose Sound.</Text>

              <Pressable style={styles.recordRow} onPress={() => router.push('/record-sound')}>
                <View style={styles.recordIconWrap}>
                  <MicIcon size={16} color={Colors.accentDeep} />
                </View>
                <Text style={styles.recordLabel}>Record a New Sound</Text>
              </Pressable>

              {customSounds.length > 0 && (
                <>
                  <Text style={styles.subSectionLabel}>Your Sounds</Text>
                  <View style={styles.grid}>
                    {customSounds.map((sound) => (
                      <SoundRow
                        key={sound.id}
                        label={sound.name}
                        source={{ uri: sound.filePath }}
                        selected={settings.defaultSound === sound.filePath}
                        previewing={previewing === sound.filePath}
                        onSelect={() => patch({ defaultSound: sound.filePath })}
                        onTogglePreview={() =>
                          setPreviewing((p) => (p === sound.filePath ? null : sound.filePath))
                        }
                        onDelete={() => handleDelete(sound)}
                      />
                    ))}
                  </View>
                  <Text style={styles.subSectionLabel}>Default Sounds</Text>
                </>
              )}

              <View style={styles.grid}>
                {SOUND_NAMES.map((name) => (
                  <SoundRow
                    key={name}
                    label={name}
                    source={SOUND_FILES[name]}
                    selected={settings.defaultSound === name}
                    previewing={previewing === name}
                    onSelect={() => patch({ defaultSound: name })}
                    onTogglePreview={() => setPreviewing((p) => (p === name ? null : name))}
                  />
                ))}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </SwipeToDismissSheet>
    </Pressable>
  );
}

function SoundRow({
  label,
  source,
  selected,
  previewing,
  onSelect,
  onTogglePreview,
  onDelete,
}: {
  label: string;
  source: AudioSource;
  selected: boolean;
  previewing: boolean;
  onSelect: () => void;
  onTogglePreview: () => void;
  onDelete?: () => void;
}) {
  const player = useAudioPlayer(source);

  useEffect(() => {
    safeAudioCall(() => {
      if (previewing) {
        player.seekTo(0);
        player.play();
      } else {
        player.pause();
      }
    });
  }, [previewing, player]);

  useEffect(() => () => safeAudioCall(() => player.pause()), [player]);

  return (
    <Pressable style={[styles.tile, selected && styles.tileSelected]} onPress={onSelect}>
      <View style={styles.tileTop}>
        <Pressable style={styles.playBtn} onPress={onTogglePreview} hitSlop={8}>
          <Text style={styles.playIcon}>{previewing ? '■' : '▶'}</Text>
        </Pressable>
        {onDelete && (
          <Pressable style={styles.deleteBtn} onPress={onDelete} hitSlop={8}>
            <TrashIcon size={14} color={Colors.danger} />
          </Pressable>
        )}
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
      {selected && (
        <View style={styles.check}>
          <CheckIcon size={11} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,36,32,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '88%',
  },
  safeArea: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.trackOff,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  title: { fontFamily: Fonts.extraBold, fontSize: 17, color: Colors.ink, textAlign: 'center' },
  body: { paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.md },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    padding: 14,
    ...Shadows.card,
  },
  rowLabel: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.ink },
  hint: { fontSize: 12, color: Colors.inkFaint, marginTop: -8, lineHeight: 16, fontFamily: Fonts.medium },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.inkFaint,
    marginBottom: 12,
    lineHeight: 16,
    fontFamily: Fonts.medium,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.accent + '1a',
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
  },
  recordIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordLabel: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.accentDeep },
  subSectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  deleteBtn: { padding: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 10,
  },
  tile: {
    width: '48%',
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.md,
    padding: 14,
    borderWidth: 2,
    borderColor: Colors.trackOff,
    ...Shadows.card,
  },
  tileSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent + '1a' },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 13, color: Colors.ink },
  tileLabel: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.ink, marginTop: 12 },
  check: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
