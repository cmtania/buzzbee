import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MicIcon } from '@/components/icons';
import { SwipeToDismissSheet } from '@/components/swipe-to-dismiss-sheet';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { nextCustomSoundName, saveRecordingAsCustomSound } from '@/lib/custom-sounds';
import { safeAudioCall } from '@/lib/sounds';

const MAX_DURATION_MS = 15000;

type Phase = 'idle' | 'recording' | 'recorded';

export default function RecordSoundScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [recordedDurationMs, setRecordedDurationMs] = useState(0);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);
  // recorderState.durationMillis resets to 0 as soon as the recorder stops, so
  // the "recorded" phase can't read it directly for the final duration — this
  // ref keeps the last live value around to snapshot into state on stop.
  const lastDurationRef = useRef(0);

  const previewPlayer = useAudioPlayer(recordedUri ? { uri: recordedUri } : null);

  useEffect(() => {
    if (phase !== 'recording') return;
    lastDurationRef.current = recorderState.durationMillis;
    if (recorderState.durationMillis >= MAX_DURATION_MS) {
      stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, recorderState.durationMillis]);

  useEffect(() => {
    if (previewing) setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    safeAudioCall(() => {
      previewPlayer.loop = true;
      if (previewing) {
        previewPlayer.seekTo(0);
        previewPlayer.play();
      } else {
        previewPlayer.pause();
      }
    });
  }, [previewing, previewPlayer]);

  useEffect(() => () => safeAudioCall(() => previewPlayer.pause()), [previewPlayer]);

  async function startRecording() {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setPermissionError('Microphone permission is needed to record a sound.');
      return;
    }
    setPermissionError(null);
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setPhase('recording');
  }

  async function stopRecording() {
    setRecordedDurationMs(lastDurationRef.current);
    await recorder.stop();
    // Fully re-assert playback mode, not just flip allowsRecording off — a
    // patch-only mode change here was silently leaving iOS's audio session
    // unable to play anything (not just the preview below, but every sound
    // row elsewhere in the app too) until the app was force-quit and
    // relaunched. See the same re-assertion in the preview effect below and
    // in choose-sound.tsx/sound-haptics-settings.tsx's SoundRow.
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    setRecordedUri(recorder.uri);
    setPhase('recorded');
  }

  function retake() {
    setPreviewing(false);
    setRecordedUri(null);
    setRecordedDurationMs(0);
    setPhase('idle');
  }

  async function handleSave() {
    if (!recordedUri || saving) return;
    safeAudioCall(() => previewPlayer.pause());
    setPreviewing(false);
    const defaultName = await nextCustomSoundName();
    Alert.prompt(
      'Name Your Sound',
      undefined,
      (name) => {
        const trimmed = name?.trim();
        if (!trimmed) return;
        commitSave(trimmed);
      },
      'plain-text',
      defaultName
    );
  }

  async function commitSave(name: string) {
    if (!recordedUri) return;
    setSaving(true);
    try {
      await saveRecordingAsCustomSound(recordedUri, name);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    safeAudioCall(() => previewPlayer.pause());
    router.back();
  }

  const liveElapsedSec = Math.floor(recorderState.durationMillis / 1000);
  const recordedElapsedSec = Math.floor(recordedDurationMs / 1000);

  return (
    <Pressable style={styles.backdrop} onPress={handleCancel}>
      <SwipeToDismissSheet onDismiss={handleCancel} style={styles.sheet}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={styles.handle} />
          <Text style={styles.title}>Record Your Sound</Text>

          <View style={styles.body}>
            {phase === 'idle' && (
              <>
                <Pressable style={styles.recordBtn} onPress={startRecording}>
                  <MicIcon size={40} color={Colors.ink} />
                </Pressable>
                <Text style={styles.hint}>Tap to record — up to 15 seconds.{'\n'}It’ll loop while your alarm rings.</Text>
                {permissionError && <Text style={styles.error}>{permissionError}</Text>}
              </>
            )}

            {phase === 'recording' && (
              <>
                <Pressable style={[styles.recordBtn, styles.recordBtnActive]} onPress={stopRecording}>
                  <View style={styles.stopSquare} />
                </Pressable>
                <Text style={styles.timer}>
                  0:{liveElapsedSec.toString().padStart(2, '0')}{' '}
                  <Text style={styles.timerMax}>/ 0:15</Text>
                </Text>
                <Text style={styles.hint}>Recording — tap to stop.</Text>
              </>
            )}

            {phase === 'recorded' && (
              <>
                <View style={styles.doneBadge}>
                  <MicIcon size={28} color={Colors.accentDeep} />
                </View>
                <Text style={styles.hint}>{recordedElapsedSec}s recorded</Text>

                <View style={styles.actionsRow}>
                  <Pressable style={styles.actionBtn} onPress={() => setPreviewing((p) => !p)}>
                    <Text style={styles.actionIcon}>{previewing ? '■' : '▶'}</Text>
                    <Text style={styles.actionLabel}>{previewing ? 'Stop' : 'Preview'}</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={retake}>
                    <Text style={styles.actionIcon}>↺</Text>
                    <Text style={styles.actionLabel}>Re-take</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, phase !== 'recorded' && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={phase !== 'recorded' || saving}>
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save My Sound'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </SwipeToDismissSheet>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,36,32,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
  },
  safeArea: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.trackOff,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 17,
    color: Colors.ink,
    textAlign: 'center',
    marginTop: 8,
  },
  body: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: 14 },
  recordBtn: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accentDeep,
    shadowOpacity: 0.4,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
  recordBtnActive: { backgroundColor: Colors.danger, shadowColor: Colors.danger },
  stopSquare: { width: 28, height: 28, borderRadius: 6, backgroundColor: Colors.white },
  doneBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: { fontFamily: Fonts.extraBold, fontSize: 26, color: Colors.ink },
  timerMax: { fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.inkFaint },
  hint: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.inkFaint,
    textAlign: 'center',
    lineHeight: 18,
  },
  error: { fontFamily: Fonts.bold, fontSize: 12.5, color: Colors.danger, textAlign: 'center', marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.md,
    paddingVertical: 14,
    paddingHorizontal: 26,
    ...Shadows.card,
  },
  actionIcon: { fontSize: 18, color: Colors.ink },
  actionLabel: { fontFamily: Fonts.bold, fontSize: 12.5, color: Colors.ink },
  footer: { flexDirection: 'row', gap: 12, paddingTop: 4, paddingBottom: Spacing.xl },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Colors.trackOff,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontFamily: Fonts.extraBold, fontSize: 15.5, color: Colors.ink },
  saveBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { fontFamily: Fonts.extraBold, fontSize: 15.5, color: Colors.ink },
});
