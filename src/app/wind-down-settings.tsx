import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackArrow } from '@/components/icons';
import { TimeStepper } from '@/components/time-stepper';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { getSettings, updateSettings } from '@/lib/db';
import { AppSettings } from '@/lib/types';
import { rescheduleWindDownNotification } from '@/lib/wind-down-scheduling';

const OFFSET_OPTIONS = [15, 30, 45, 60];

export default function WindDownSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);

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

  if (!settings) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <BackArrow />
          </Pressable>
          <Text style={styles.title}>Wind-Down Mode</Text>
        </View>

        <View style={styles.body}>
          <TimeStepper
            label="Bedtime"
            value={settings.bedtime ?? '22:30'}
            onChange={(v) => patch({ bedtime: v })}
          />

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

          <Pressable style={styles.previewBtn} onPress={() => router.push('/wind-down')}>
            <Text style={styles.previewText}>Preview Wind-Down screen</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.xl },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  title: { fontFamily: Fonts.extraBold, fontSize: 17, color: Colors.ink },
  body: { padding: Spacing.xl, gap: Spacing.xl },
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
  previewBtn: {
    marginTop: 8,
    backgroundColor: Colors.ink,
    paddingVertical: 16,
    borderRadius: Radii.lg,
    alignItems: 'center',
  },
  previewText: { fontFamily: Fonts.extraBold, fontSize: 15, color: '#fff' },
});
