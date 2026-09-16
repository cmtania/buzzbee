import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import {
  BellIcon,
  BuzzIcon,
  CalendarIcon,
  ChevronRight,
  InfoIcon,
  MoonIcon,
  TrashIcon,
} from '@/components/icons';
import { Toggle } from '@/components/toggle';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { formatClock } from '@/lib/alarm-utils';
import { clearAllAlarmKitAlarms } from '@/lib/alarmkit';
import { getAlarms, getSettings, resetAllData, updateSettings } from '@/lib/db';
import { cancelAlarmNotification } from '@/lib/scheduling';
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

  async function performReset() {
    // Cancel native registrations first — deleting the DB rows below doesn't
    // reach into AlarmKit's or iOS's own scheduled-notification stores, so
    // anything left un-cancelled here would still fire later for an alarm
    // that no longer exists.
    const alarms = await getAlarms();
    await Promise.all(alarms.map((a) => cancelAlarmNotification(a.id)));
    clearAllAlarmKitAlarms();
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    await resetAllData();
    router.replace('/onboarding/welcome');
  }

  function handleResetData() {
    // Alert.prompt is iOS-only, which is fine — BuzzBee is iOS-only (min
    // 26.1, for AlarmKit). Typing the exact word is a deliberate extra
    // speed bump beyond a plain Cancel/Confirm button pair, since this
    // wipes every alarm, all history, and settings with no way to undo it.
    Alert.prompt(
      'Reset All Data?',
      'This deletes every alarm, all wake/task history, custom sounds, and settings — and cannot be undone.\n\nType CONFIRM to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: (text?: string) => {
            if (text?.trim().toUpperCase() !== 'CONFIRM') {
              Alert.alert('Not reset', 'You need to type CONFIRM exactly to reset your data.');
              return;
            }
            performReset();
          },
        },
      ],
      'plain-text'
    );
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

          <View>
            <Text style={styles.sectionLabel}>Danger Zone</Text>
            <View style={styles.group}>
              <Row
                icon={<TrashIcon size={16} color={Colors.danger} />}
                title="Reset Data"
                sub="Deletes every alarm, all history, and settings"
                divider={false}
                danger
                onPress={handleResetData}
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
  danger = false,
}: {
  icon?: ReactNode;
  title: string;
  sub?: string;
  right: ReactNode;
  onPress?: () => void;
  divider?: boolean;
  /** Reddens the icon backdrop and title — for a destructive row like Reset Data. */
  danger?: boolean;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={[styles.row, divider && styles.rowDivider]} onPress={onPress}>
      {icon && <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>{icon}</View>}
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, danger && styles.rowTitleDanger]}>{title}</Text>
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
  rowIconDanger: { backgroundColor: Colors.danger + '26' },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: Fonts.bold, fontSize: 14.5, color: Colors.ink },
  rowTitleDanger: { color: Colors.danger },
  rowSub: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.inkFaint, marginTop: 1 },
});
