import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlarmCard } from '@/components/alarm-card';
import { BeeLogo } from '@/components/bee-logo';
import { CountdownDial } from '@/components/countdown-dial';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { StreakIcon } from '@/components/icons';
import { WaveBackground } from '@/components/wave-background';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { countdownToRingTime, countdownToWindowStart, formatClock, repeatSummary } from '@/lib/alarm-utils';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { getAlarms, getRecentWakeEvents, saveAlarm } from '@/lib/db';
import { scheduleAlarmNotification, cancelAlarmNotification } from '@/lib/scheduling';
import { Alarm } from '@/lib/types';

export default function HomeScreen() {
  const router = useRouter();
  const { startDraft } = useAlarmDraft();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [streak, setStreak] = useState(0);

  const load = useCallback(async () => {
    const [rows, events] = await Promise.all([getAlarms(), getRecentWakeEvents(30)]);
    setAlarms(rows);
    setStreak(computeStreak(events.map((e) => e.date)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const primary = alarms.find((a) => a.enabled) ?? alarms[0];

  async function handleToggle(alarm: Alarm, next: boolean) {
    const updated = { ...alarm, enabled: next };
    await saveAlarm(updated);
    if (next) await scheduleAlarmNotification(updated);
    else await cancelAlarmNotification(updated.id);
    load();
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

        <ScrollView contentContainerStyle={styles.content}>
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
                  {formatClock(primary.windowStart).value}–{formatClock(primary.windowEnd).value}{' '}
                  {formatClock(primary.windowEnd).ampm}
                </Text>
                <Text style={styles.heroSub}>{repeatSummary(primary.repeatDays)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.hero}>
              <Text style={styles.emptyHero}>No alarms yet — tap + to add your first Smart Wake alarm.</Text>
            </View>
          )}

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Your Alarms</Text>
            <View style={styles.kebab}>
              <View style={styles.kebabDot} />
              <View style={styles.kebabDot} />
              <View style={styles.kebabDot} />
            </View>
          </View>

          <FlatList
            data={alarms}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.list}
            scrollEnabled={false}
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
        </ScrollView>
      </SafeAreaView>
      <FloatingTabBar />
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
  wordmark: { fontFamily: Fonts.extraBold, fontSize: 20, color: Colors.ink },
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
  content: { flex: 1, paddingHorizontal: Spacing.xxl, paddingTop: Spacing.md },
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontFamily: Fonts.extraBold, fontSize: 15, color: Colors.ink },
  kebab: { flexDirection: 'row', gap: 3, padding: 6 },
  kebabDot: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: Colors.inkFaint },
  list: {
    paddingBottom: 140,
    gap: Spacing.md,
  },
});
