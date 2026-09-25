import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/glass-card';
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
              <GlassCard style={styles.timeCard}>
                <TimeStepper
                  label="Bedtime"
                  value={settings.bedtime ?? '22:30'}
                  onChange={(v) => patch({ bedtime: v })}
                  large
                  bare
                  onOpenChange={setPickerOpen}
                />
              </GlassCard>
            </View>

            <View>
              <Text style={styles.sectionLabel}>Remind me before bedtime</Text>
              <GlassCard style={styles.offsetRow}>
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
              </GlassCard>
            </View>

            <View style={styles.footerRow}>
              <Pressable style={styles.previewBtnWrap} onPress={() => router.push('/wind-down')}>
                <GlassCard style={styles.previewBtn} isInteractive>
                  <Text style={styles.previewText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                    Preview Bedtime screen
                  </Text>
                </GlassCard>
              </Pressable>
              <Pressable style={styles.footerBtnWrap} onPress={() => router.back()}>
                <GlassCard style={styles.saveBtn} isInteractive>
                  <Text style={styles.saveText}>Save</Text>
                </GlassCard>
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
  title: { fontFamily: Fonts.extraBold, fontSize: 19.5, color: Colors.ink, textAlign: 'center' },
  body: { paddingTop: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.md },
  timeCenterWrap: { alignItems: 'center' },
  timeCard: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 48,
    borderRadius: Radii.lg,
  },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  offsetRow: { flexDirection: 'row', gap: 10, borderRadius: Radii.md, padding: 6 },
  offsetChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radii.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  offsetChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '26' },
  offsetText: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.inkFaint },
  offsetTextActive: { color: Colors.ink },
  footerRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  footerBtnWrap: { flex: 1 },
  // Wider than Save: its label is far longer, and an even split wrapped it
  // onto two lines on small screens.
  previewBtnWrap: { flex: 2 },
  previewBtn: {
    paddingVertical: 16,
    borderRadius: Radii.lg,
    alignItems: 'center',
  },
  previewText: { fontFamily: Fonts.extraBold, fontSize: 17.5, color: Colors.ink },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: Radii.lg,
    alignItems: 'center',
  },
  saveText: { fontFamily: Fonts.extraBold, fontSize: 17.5, color: Colors.accentDeep },
});
