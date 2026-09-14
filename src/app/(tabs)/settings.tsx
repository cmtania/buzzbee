import { useFocusEffect, useRouter } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import {
  BellIcon,
  BuzzIcon,
  CalendarIcon,
  ChevronRight,
  InfoIcon,
  MicIcon,
  MoonIcon,
  StopwatchIcon,
} from '@/components/icons';
import { Toggle } from '@/components/toggle';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { formatClock } from '@/lib/alarm-utils';
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
                icon={<MoonIcon size={16} color={Colors.accentDeep} />}
                title="Bedtime Reminder"
                sub={
                  settings.bedtime
                    ? `Calming reminder & breathing screen ${settings.windDownOffsetMin} min before your ${formatClock(settings.bedtime).value} ${formatClock(settings.bedtime).ampm} bedtime`
                    : 'Calming reminder before bed — tap to set your bedtime'
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
                icon={<CalendarIcon size={16} color={Colors.accentDeep} />}
                title="Calendar Auto-Shift"
                sub="Suggests moving your wake window the evening before, if tomorrow's first event would conflict with it"
                right={
                  <Toggle
                    value={settings.calendarAutoShiftEnabled}
                    onChange={(v) => patch({ calendarAutoShiftEnabled: v })}
                  />
                }
              />
              <Row
                icon={<MicIcon size={16} color={Colors.accentDeep} />}
                title="Ambient Awareness"
                sub="On a Smart Wake early ring, checks room noise for 1 minute first — skips straight to a quick 'already up?' check instead of the mission if you're already active. On-device only, never recorded or uploaded"
                right={
                  <Toggle
                    value={settings.ambientAwarenessEnabled}
                    onChange={(v) => patch({ ambientAwarenessEnabled: v })}
                  />
                }
              />
              <Row
                icon={<StopwatchIcon size={16} color={Colors.accentDeep} />}
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
              <Row
                icon={<BellIcon size={16} color={Colors.accentDeep} />}
                title="Notifications"
                divider={false}
                onPress={() => router.push('/notifications-settings')}
                right={<ChevronRight />}
              />
              <Row
                icon={<BuzzIcon size={16} color={Colors.accentDeep} />}
                title="Sound & Haptics"
                onPress={() => router.push('/sound-haptics-settings')}
                right={<ChevronRight />}
              />
              <Row
                icon={<InfoIcon size={16} color={Colors.accentDeep} />}
                title="About BuzzBee"
                onPress={() => router.push('/about')}
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
  icon,
  title,
  sub,
  right,
  onPress,
  divider = true,
}: {
  icon?: ReactNode;
  title: string;
  sub?: string;
  right: ReactNode;
  onPress?: () => void;
  divider?: boolean;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={[styles.row, divider && styles.rowDivider]} onPress={onPress}>
      {icon && <View style={styles.rowIcon}>{icon}</View>}
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
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: Colors.accent + '26',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: Fonts.bold, fontSize: 14.5, color: Colors.ink },
  rowSub: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.inkFaint, marginTop: 1 },
});
