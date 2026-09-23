import { useFocusEffect, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeToDismissSheet } from '@/components/swipe-to-dismiss-sheet';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { getSettings } from '@/lib/db';
import { AppSettings } from '@/lib/types';

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useFocusEffect(
    useCallback(() => {
      Notifications.getPermissionsAsync().then((p) => setGranted(p.granted));
      getSettings().then(setSettings);
    }, [])
  );

  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()}>
      <SwipeToDismissSheet onDismiss={() => router.back()} style={styles.sheet}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={styles.handle} />
          <Text style={styles.title}>Notifications</Text>

          <View style={styles.body}>
            <View style={styles.statusRow}>
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>Permission</Text>
                <Text style={styles.statusSub}>
                  {granted === null
                    ? 'Checking…'
                    : granted
                      ? 'Allowed — BuzzBee can alert you even if the app is closed'
                      : "Not allowed — BuzzBee can't ring you while it's closed"}
                </Text>
              </View>
              {granted === false && (
                <Pressable style={styles.settingsBtn} onPress={() => Linking.openSettings()}>
                  <Text style={styles.settingsBtnText}>Open Settings</Text>
                </Pressable>
              )}
            </View>

            <View>
              <Text style={styles.sectionLabel}>What BuzzBee sends</Text>
              <View style={styles.group}>
                <InfoRow
                  title="Hard-deadline alarm"
                  sub="Always on — the safety net that fires if the app is backgrounded or closed when your alarm's deadline arrives."
                  divider={false}
                />
                <InfoRow
                  title="Bedtime reminder"
                  sub={
                    settings?.windDownEnabled
                      ? 'On — controlled by Bedtime Reminder in Settings.'
                      : 'Off — turn on Bedtime Reminder in Settings to enable.'
                  }
                />
                <InfoRow
                  title="Calendar conflict nudge"
                  sub={
                    settings?.calendarAutoShiftEnabled
                      ? 'On — controlled by Calendar Auto-Shift in Settings.'
                      : 'Off — turn on Calendar Auto-Shift in Settings to enable.'
                  }
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </SwipeToDismissSheet>
    </Pressable>
  );
}

function InfoRow({ title, sub, divider = true }: { title: string; sub: string; divider?: boolean }) {
  return (
    <View style={[styles.infoRow, divider && styles.infoRowDivider]}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoSub}>{sub}</Text>
    </View>
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    padding: 14,
  },
  statusText: { flex: 1, minWidth: 0 },
  statusTitle: { fontFamily: Fonts.bold, fontSize: 16.5, color: Colors.ink },
  statusSub: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.inkFaint, marginTop: 2, lineHeight: 16 },
  settingsBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radii.md,
  },
  settingsBtnText: { fontFamily: Fonts.extraBold, fontSize: 14.5, color: '#2B2420' },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  group: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, overflow: 'hidden' },
  infoRow: { padding: 14 },
  infoRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.trackOff },
  infoTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.ink },
  infoSub: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.inkFaint, marginTop: 3, lineHeight: 16 },
});
