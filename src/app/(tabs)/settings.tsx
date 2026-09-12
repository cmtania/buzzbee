import { useFocusEffect, useRouter } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChevronRight } from '@/components/icons';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { Toggle } from '@/components/toggle';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { getSettings, updateSettings } from '@/lib/db';
import { AppSettings } from '@/lib/types';
import { rescheduleWindDownNotification } from '@/lib/wind-down-scheduling';

export default function SettingsScreen() {
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
    if ('windDownEnabled' in update) await rescheduleWindDownNotification(next);
  }

  if (!settings) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.h1}>Settings</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View>
            <Text style={styles.sectionLabel}>Smart Features</Text>
            <View style={styles.group}>
              <Row
                title="Wind-Down Mode"
                sub={
                  settings.bedtime
                    ? `Reminder ${settings.windDownOffsetMin} min before ${settings.bedtime} bedtime`
                    : `Reminder ${settings.windDownOffsetMin} min before bed — tap to set bedtime`
                }
                divider={false}
                onPress={() => router.push('/wind-down-settings')}
                right={
                  <Toggle
                    value={settings.windDownEnabled}
                    onChange={(v) => patch({ windDownEnabled: v })}
                  />
                }
              />
              <Row
                title="Calendar Auto-Shift"
                sub="Checks tomorrow's first event"
                right={
                  <Toggle
                    value={settings.calendarAutoShiftEnabled}
                    onChange={(v) => patch({ calendarAutoShiftEnabled: v })}
                  />
                }
              />
              <Row
                title="Ambient Awareness"
                sub="On-device only, never recorded"
                right={
                  <Toggle
                    value={settings.ambientAwarenessEnabled}
                    onChange={(v) => patch({ ambientAwarenessEnabled: v })}
                  />
                }
              />
              <Row
                title="Test Smart Wake"
                sub="See it detect light sleep in under a minute"
                onPress={() => router.push('/test-smart-wake')}
                right={<ChevronRight />}
              />
            </View>
          </View>

          <View>
            <Text style={styles.sectionLabel}>General</Text>
            <View style={styles.group}>
              <Row title="Notifications" divider={false} onPress={() => {}} right={<ChevronRight />} />
              <Row title="Sound & Haptics" onPress={() => {}} right={<ChevronRight />} />
              <Row title="About BuzzBee" onPress={() => {}} right={<ChevronRight />} />
              <Row
                title="Replay Onboarding"
                onPress={async () => {
                  await updateSettings({ hasOnboarded: false });
                  router.replace('/onboarding/welcome');
                }}
                right={<ChevronRight />}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <FloatingTabBar />
    </View>
  );
}

function Row({
  title,
  sub,
  right,
  onPress,
  divider = true,
}: {
  title: string;
  sub?: string;
  right: ReactNode;
  onPress?: () => void;
  divider?: boolean;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={[styles.row, divider && styles.rowDivider]} onPress={onPress}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {right}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
  h1: { fontFamily: Fonts.extraBold, fontSize: 26, color: Colors.ink },
  body: { padding: Spacing.xxl, gap: Spacing.xl, paddingBottom: 140 },
  sectionLabel: {
    fontFamily: Fonts.extraBold,
    fontSize: 12,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
    paddingLeft: 4,
  },
  group: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.trackOff,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: Fonts.bold, fontSize: 14.5, color: Colors.ink },
  rowSub: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.inkFaint, marginTop: 1 },
});
