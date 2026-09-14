import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeToDismissSheet } from '@/components/swipe-to-dismiss-sheet';
import { TimeStepper } from '@/components/time-stepper';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { getSettings, updateSettings } from '@/lib/db';
import { AppSettings } from '@/lib/types';
import { rescheduleWindDownNotification } from '@/lib/wind-down-scheduling';

const OFFSET_OPTIONS = [15, 30, 45, 60];

export default function WindDownSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSettings().then(setSettings);
    }, [])
  );

  async function patch(update: Partial<AppSettings>) {
    const next = await updateSettings(update);
    setSettings(next);
    await rescheduleWindDownNotification(next);
  }

  if (!settings) return <View style={styles.backdrop} />;

  return (
    <Pressable
      style={styles.backdrop}
      onPress={() => {
        // Guard the same way as SwipeToDismissSheet's `disabled` — the time
        // picker Modal above this sheet shouldn't let a stray tap on this
        // backdrop close the whole sheet underneath it.
        if (!pickerOpen) router.back();
      }}>
      <SwipeToDismissSheet onDismiss={() => router.back()} style={styles.sheet} disabled={pickerOpen}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={styles.handle} />
          <Text style={styles.title}>Bedtime Reminder</Text>

          <View style={styles.body}>
            <View style={styles.timeCenterWrap}>
              <TimeStepper
                label="Bedtime"
                value={settings.bedtime ?? '22:30'}
                onChange={(v) => patch({ bedtime: v })}
                large
                onOpenChange={setPickerOpen}
              />
            </View>

            <View>
              <Text style={styles.sectionLabel}>Remind me before bedtime</Text>
              <View style={styles.offsetRow}>
                {OFFSET_OPTIONS.map((min) => {
                  const active = settings.windDownOffsetMin === min;
                  return (
                    <Pressable
                      key={min}
                      style={[styles.offsetChip, active && styles.offsetChipActive]}
                      onPress={() => patch({ windDownOffsetMin: min })}>
                      <Text style={[styles.offsetText, active && styles.offsetTextActive]}>
                        {min}m
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.footerRow}>
              <Pressable style={styles.previewBtn} onPress={() => router.push('/wind-down')}>
                <Text style={styles.previewText}>Preview Bedtime screen</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={() => router.back()}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
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
  body: { paddingTop: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.md },
  timeCenterWrap: { alignItems: 'center' },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  offsetRow: { flexDirection: 'row', gap: 10 },
  offsetChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radii.md,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.trackOff,
  },
  offsetChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '26' },
  offsetText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.inkFaint },
  offsetTextActive: { color: Colors.ink },
  footerRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  previewBtn: {
    flex: 1,
    backgroundColor: Colors.ink,
    paddingVertical: 16,
    borderRadius: Radii.lg,
    alignItems: 'center',
  },
  previewText: { fontFamily: Fonts.extraBold, fontSize: 15, color: '#fff' },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: Radii.lg,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  saveText: { fontFamily: Fonts.extraBold, fontSize: 15, color: '#2B2420' },
});
