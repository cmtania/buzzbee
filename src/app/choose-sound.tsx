import { useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/icons';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { safeAudioCall, SOUND_FILES, SOUND_NAMES, SoundName } from '@/lib/sounds';

export default function ChooseSoundScreen() {
  const router = useRouter();
  const { draft, setDraft } = useAlarmDraft();
  const [previewing, setPreviewing] = useState<SoundName | null>(null);

  function select(name: SoundName) {
    setDraft((d) => ({ ...d, sound: name }));
  }

  function done() {
    setPreviewing(null);
    router.back();
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={styles.handle} />
          <Text style={styles.title}>Choose a Sound</Text>
          {SOUND_NAMES.map((name) => (
            <SoundRow
              key={name}
              name={name}
              selected={draft.sound === name}
              previewing={previewing === name}
              onSelect={() => select(name)}
              onTogglePreview={() => setPreviewing((p) => (p === name ? null : name))}
            />
          ))}
          <Pressable style={styles.doneBtn} onPress={done}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </View>
  );
}

function SoundRow({
  name,
  selected,
  previewing,
  onSelect,
  onTogglePreview,
}: {
  name: SoundName;
  selected: boolean;
  previewing: boolean;
  onSelect: () => void;
  onTogglePreview: () => void;
}) {
  const player = useAudioPlayer(SOUND_FILES[name]);

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
    <Pressable style={[styles.row, selected && styles.rowSelected]} onPress={onSelect}>
      <Pressable style={styles.playBtn} onPress={onTogglePreview} hitSlop={8}>
        <Text style={styles.playIcon}>{previewing ? '■' : '▶'}</Text>
      </Pressable>
      <Text style={styles.rowLabel}>{name}</Text>
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
    maxHeight: '75%',
  },
  safeArea: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
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
    fontSize: 19,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: Colors.trackOff,
    ...Shadows.card,
  },
  rowSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent + '1a' },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 13, color: Colors.ink },
  rowLabel: { flex: 1, fontFamily: Fonts.bold, fontSize: 15, color: Colors.ink },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    marginTop: 6,
    backgroundColor: Colors.ink,
    paddingVertical: 15,
    borderRadius: Radii.lg,
    alignItems: 'center',
  },
  doneText: { fontFamily: Fonts.extraBold, fontSize: 15, color: '#fff' },
});
