import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlarmCard } from '@/components/alarm-card';
import { BeeLogo } from '@/components/bee-logo';
import { CountdownDial } from '@/components/countdown-dial';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { ChevronRight, MoonIcon, StreakIcon } from '@/components/icons';
import { WaveBackground } from '@/components/wave-background';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import {
  countdownTo,
  countdownToRingTime,
  countdownToWindowStart,
  formatClock,
  repeatSummary,
} from '@/lib/alarm-utils';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { deleteAlarm, getAlarms, getRecentWakeEvents, getSettings, saveAlarm } from '@/lib/db';
import { scheduleAlarmNotification, cancelAlarmNotification } from '@/lib/scheduling';
import { Alarm, AppSettings } from '@/lib/types';
import { nextBedtimeReminder } from '@/lib/wind-down-scheduling';

/** The clock time an alarm is sorted by — its window start for Smart Wake
 * (when the window begins), its deadline for a fixed-time alarm (its one
 * real time). Matches what each alarm card/hero actually displays. */
function sortMinutes(alarm: Alarm): number {
  const [h, m] = (alarm.smartWakeEnabled ? alarm.windowStart : alarm.windowEnd).split(':').map(Number);
  return h * 60 + m;
}

/** Enabled alarms first, disabled after — within each group, soonest first. */
function sortAlarms(alarms: Alarm[]): Alarm[] {
  return [...alarms].sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return sortMinutes(a) - sortMinutes(b);
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { startDraft } = useAlarmDraft();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [streak, setStreak] = useState(0);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    const [rows, events, appSettings] = await Promise.all([
      getAlarms(),
      getRecentWakeEvents(30),
      getSettings(),
    ]);
    setAlarms(rows);
    setStreak(computeStreak(events.map((e) => e.date)));
    setSettings(appSettings);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sortedAlarms = useMemo(() => sortAlarms(alarms), [alarms]);
  const primary = sortedAlarms.find((a) => a.enabled);

  const windDownReminderAt = settings ? nextBedtimeReminder(settings) : null;
  const windDownCountdown = windDownReminderAt ? countdownTo(windDownReminderAt, new Date()) : null;

  async function handleToggle(alarm: Alarm, next: boolean) {
    const updated = { ...alarm, enabled: next };
    await saveAlarm(updated);
    if (next) await scheduleAlarmNotification(updated);
    else await cancelAlarmNotification(updated.id);
    load();
  }

  async function handleEnableAll() {
    setMenuOpen(false);
    await Promise.all(
      alarms
        .filter((a) => !a.enabled)
        .map(async (a) => {
          const updated = { ...a, enabled: true };
          await saveAlarm(updated);
          await scheduleAlarmNotification(updated);
        })
    );
    load();
  }

  async function handleDisableAll() {
    setMenuOpen(false);
    await Promise.all(
      alarms
        .filter((a) => a.enabled)
        .map(async (a) => {
          await saveAlarm({ ...a, enabled: false });
          await cancelAlarmNotification(a.id);
        })
    );
    load();
  }

  function handleDeleteAll() {
    setMenuOpen(false);
    Alert.alert('Delete All Alarms?', "This removes every alarm you've created. This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: async () => {
          await Promise.all(
            alarms.map(async (a) => {
              await cancelAlarmNotification(a.id);
              await deleteAlarm(a.id);
            })
          );
          load();
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <WaveBackground />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Good morning</Text>
            <View style={styles.wordmarkRow}>
              <BeeLogo size={26} />
              <Text style={styles.wordmark}>BuzzBee</Text>
            </View>
          </View>
          <View style={styles.streak}>
            <StreakIcon size={12} />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        </View>

        <View style={styles.fixedTop}>
          {primary ? (
            <View style={styles.hero}>
              <View style={styles.heroGlow} />
              <CountdownDial
                {...(primary.smartWakeEnabled
                  ? countdownToWindowStart(primary)
                  : countdownToRingTime(primary))}
                size={92}
              />
              <View style={styles.heroText}>
                <Text style={styles.heroLabel}>
                  {primary.smartWakeEnabled ? 'Smart Wake begins in' : 'Rings in'}
                </Text>
                <Text style={styles.heroRange}>
                  {primary.smartWakeEnabled
                    ? `${formatClock(primary.windowStart).value}–${formatClock(primary.windowEnd).value} ${formatClock(primary.windowEnd).ampm}`
                    : `${formatClock(primary.windowEnd).value} ${formatClock(primary.windowEnd).ampm}`}
                </Text>
                <Text style={styles.heroSub}>{repeatSummary(primary.repeatDays)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.hero}>
              <Text style={styles.emptyHero}>
                {alarms.length === 0
                  ? 'No alarms yet — tap + to add your first Smart Wake alarm.'
                  : 'All your alarms are off — enable one to start your countdown.'}
              </Text>
            </View>
          )}

          {settings?.windDownEnabled && (
            <Pressable style={styles.windDownHero} onPress={() => router.push('/wind-down-settings')}>
              <View style={styles.windDownGlow} />
              {windDownCountdown ? (
                <CountdownDial progress={windDownCountdown.progress} label={windDownCountdown.label} size={72} />
              ) : (
                <View style={styles.windDownDialPlaceholder}>
                  <MoonIcon size={22} color={Colors.accentDeep} />
                </View>
              )}
              <View style={styles.windDownText}>
                <Text style={styles.windDownLabel}>
                  {windDownCountdown ? 'Bedtime reminder in' : 'Bedtime Reminder'}
                </Text>
                <Text style={styles.windDownTime}>
                  {settings.bedtime
                    ? `${formatClock(settings.bedtime).value} ${formatClock(settings.bedtime).ampm}`
                    : 'Tap to set bedtime'}
                </Text>
                <Text style={styles.windDownSub}>
                  {settings.bedtime
                    ? `${settings.windDownOffsetMin} min reminder before bedtime`
                    : 'Reminder before bed'}
                </Text>
              </View>
              <ChevronRight />
            </Pressable>
          )}

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Your Alarms</Text>
            <Pressable style={styles.kebab} onPress={() => setMenuOpen(true)} hitSlop={10}>
              <View style={styles.kebabDot} />
              <View style={styles.kebabDot} />
              <View style={styles.kebabDot} />
            </Pressable>
          </View>
        </View>

        <FlatList
          style={styles.list}
          data={sortedAlarms}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <AlarmCard
              alarm={item}
              onPress={() => {
                startDraft(item);
                router.push('/add-edit');
              }}
              onToggle={(next) => handleToggle(item, next)}
              onLongPress={() =>
                router.push({
                  pathname: '/ringing',
                  params: { alarmId: item.id, triggeredBy: 'hard-deadline' },
                })
              }
            />
          )}
        />
      </SafeAreaView>
      <FloatingTabBar />

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuSheet}>
            <Pressable style={styles.menuRow} onPress={handleEnableAll}>
              <Text style={styles.menuRowText}>Enable All</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuRow} onPress={handleDisableAll}>
              <Text style={styles.menuRowText}>Disable All</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuRow} onPress={handleDeleteAll}>
              <Text style={[styles.menuRowText, styles.menuRowDanger]}>Delete All</Text>
            </Pressable>
          </View>
          <Pressable style={styles.menuCancel} onPress={() => setMenuOpen(false)}>
            <Text style={styles.menuCancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function computeStreak(datesDesc: string[]): number {
  if (datesDesc.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < datesDesc.length; i++) {
    const prev = new Date(datesDesc[i - 1]);
    const cur = new Date(datesDesc[i]);
    const diffDays = Math.round((prev.getTime() - cur.getTime()) / 86400000);
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eyebrow: { fontFamily: Fonts.bold, fontSize: 12.5, color: Colors.inkFaint },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  wordmark: { fontFamily: Fonts.brand, fontSize: 20, color: Colors.ink },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
    ...Shadows.card,
  },
  streakText: { fontFamily: Fonts.extraBold, fontSize: 13.5, color: Colors.ink },
  fixedTop: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  list: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    paddingBottom: 140,
    gap: Spacing.md,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    ...Shadows.card,
  },
  heroGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.accent + '33',
    top: -70,
    right: -60,
  },
  heroText: { flex: 1, minWidth: 0 },
  heroLabel: {
    fontFamily: Fonts.extraBold,
    fontSize: 11,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroRange: { fontFamily: Fonts.extraBold, fontSize: 19, color: Colors.ink, marginTop: 5 },
  heroSub: { fontFamily: Fonts.bold, fontSize: 12.5, color: Colors.inkSoft, marginTop: 4 },
  emptyHero: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.inkFaint, lineHeight: 20 },
  windDownHero: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...Shadows.card,
  },
  windDownGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accent + '26',
    top: -50,
    right: -40,
  },
  windDownDialPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  windDownText: { flex: 1, minWidth: 0 },
  windDownLabel: {
    fontFamily: Fonts.extraBold,
    fontSize: 10.5,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  windDownTime: { fontFamily: Fonts.extraBold, fontSize: 18, color: Colors.ink, marginTop: 3 },
  windDownSub: { fontFamily: Fonts.semiBold, fontSize: 11.5, color: Colors.inkSoft, marginTop: 3 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xxl,
  },
  sectionTitle: { fontFamily: Fonts.extraBold, fontSize: 15, color: Colors.ink },
  kebab: { flexDirection: 'row', gap: 3, padding: 6 },
  kebabDot: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: Colors.inkFaint },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(43,36,32,0.35)',
    justifyContent: 'flex-end',
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: 8,
  },
  menuSheet: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  menuRow: { paddingVertical: 16, alignItems: 'center' },
  menuRowText: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.ink },
  menuRowDanger: { color: Colors.danger },
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.trackOff },
  menuCancel: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  menuCancelText: { fontFamily: Fonts.extraBold, fontSize: 16, color: Colors.ink },
});
