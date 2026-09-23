import { AudioSource, setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/glass-card';
import { SwipeToDismissSheet } from '@/components/swipe-to-dismiss-sheet';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { getCustomSounds, removeCustomSound } from '@/lib/custom-sounds';
import { safeAudioCall, SOUND_FILES, SOUND_NAMES } from '@/lib/sounds';
import { CustomSound } from '@/lib/types';
import { Check, Mic, Trash } from 'lucide-react-native';

export default function ChooseSoundScreen() {
  const router = useRouter();
  const { draft, setDraft } = useAlarmDraft();
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);

  useFocusEffect(
    useCallback(() => {
      getCustomSounds().then(setCustomSounds);
      return () => setPreviewing(null);
    }, [])
  );

  function select(value: string) {
    setDraft((d) => ({ ...d, sound: value }));
    setPreviewing(null);
    router.back();
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
          if (draft.sound === sound.filePath) setDraft((d) => ({ ...d, sound: 'Classic Alarm' }));
          setCustomSounds(await getCustomSounds());
        },
      },
    ]);
  }

  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()}>
      <SwipeToDismissSheet
        onDismiss={() => router.back()}
        style={styles.sheet}
        // Drag-to-dismiss is confined to this header so the list below stays a
        // plain ScrollView — a downward drag in the body scrolls, and never
        // gets misread as a dismiss.
        header={
          <>
            <View style={styles.handle} />
            <Text style={styles.title}>Choose a Sound</Text>
          </>
        }>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          {/* Pinned above the ScrollView rather than inside it: adding a sound
              is the one action here that shouldn't scroll out of reach. */}
          <View style={styles.recordWrap}>
            <Pressable onPress={() => router.push('/record-sound')}>
              <GlassCard style={styles.recordRow}>
                <View style={styles.recordIconWrap}>
                  <Mic size={18.5} color={Colors.accentDeep} />
                </View>
                <Text style={styles.recordLabel}>Record a New Sound</Text>
              </GlassCard>
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          {customSounds.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Your Sounds</Text>
              <View style={styles.grid}>
                {customSounds.map((sound) => (
                  <SoundRow
                    key={sound.id}
                    label={sound.name}
                    source={{ uri: sound.filePath }}
                    selected={draft.sound === sound.filePath}
                    previewing={previewing === sound.filePath}
                    onSelect={() => select(sound.filePath)}
                    onTogglePreview={() =>
                      setPreviewing((p) => (p === sound.filePath ? null : sound.filePath))
                    }
                    onDelete={() => handleDelete(sound)}
                  />
                ))}
              </View>
              {draft.sound && customSounds.some((s) => s.filePath === draft.sound) && (
                <Text style={styles.customSoundNote}>
                  If BuzzBee is closed when this alarm rings, the lock screen alert plays Classic
                  Alarm instead — iOS only allows built-in sounds there. Your recording plays
                  correctly once you open the mission.
                </Text>
              )}
              <Text style={styles.sectionLabel}>Default Sounds</Text>
            </>
          )}

          <View style={styles.grid}>
            {SOUND_NAMES.map((name) => (
              <SoundRow
                key={name}
                label={name}
                source={SOUND_FILES[name]}
                selected={draft.sound === name}
                previewing={previewing === name}
                onSelect={() => select(name)}
                onTogglePreview={() => setPreviewing((p) => (p === name ? null : name))}
              />
            ))}
          </View>
          </ScrollView>
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
    // Re-assert playback mode before every preview — visiting Record a New
    // Sound leaves the audio session set up for recording, and previewing
    // here without this would silently play nothing until the app restarts.
    if (previewing) setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
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
    <Pressable style={styles.tileWrap} onPress={onSelect}>
      <GlassCard style={[styles.tile, selected && styles.tileSelected]}>
        <View style={styles.tileTop}>
          <Pressable style={styles.playBtn} onPress={onTogglePreview} hitSlop={8}>
            <Text style={styles.playIcon}>{previewing ? '■' : '▶'}</Text>
          </Pressable>
          {onDelete && (
            <Pressable style={styles.deleteBtn} onPress={onDelete} hitSlop={8}>
              <Trash size={16} color={Colors.danger} />
            </Pressable>
          )}
        </View>
        <Text style={styles.tileLabel} numberOfLines={2}>
          {label}
        </Text>
        {selected && (
          <View style={styles.check}>
            <Check size={12.5} color={Colors.white} />
          </View>
        )}
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,36,32,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '75%',
    overflow: 'hidden',
  },
  // flexShrink: 1 on both of these is what makes the sheet's maxHeight cap
  // actually bite: RN defaults flexShrink to 0, so without it a list taller
  // than the cap overflowed past the sheet's box instead of scrolling — the
  // bottom sounds were simply unreachable.
  safeArea: { flexShrink: 1 },
  scroll: { flexShrink: 1 },
  body: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  recordWrap: { paddingHorizontal: Spacing.xl },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.trackOff,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 22,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 16,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  recordLabel: { fontFamily: Fonts.bold, fontSize: 17.5, color: Colors.accentDeep },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  customSoundNote: {
    fontFamily: Fonts.semiBold,
    fontSize: 14.5,
    color: Colors.inkFaint,
    lineHeight: 18,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 10,
  },
  tileWrap: { width: '48%' },
  tile: {
    borderRadius: Radii.md,
    padding: 14,
    borderWidth: 2,
    borderColor: Colors.trackOff,
  },
  tileSelected: { borderColor: Colors.accent },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 15, color: Colors.ink },
  tileLabel: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.ink, marginTop: 12 },
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
  deleteBtn: { padding: 4 },
});
