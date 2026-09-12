import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlarmCard } from '@/components/alarm-card';
import { CountdownDial } from '@/components/countdown-dial';
import { FloatingTabBar } from '@/components/floating-tab-bar';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { countdownToWindowStart, formatClock, repeatSummary } from '@/lib/alarm-utils';
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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.h1}>BuzzBee</Text>
          {streak > 0 && (
            <View style={styles.streak}>
              <Text style={styles.streakText}>🔥 {streak}</Text>
            </View>
          )}
        </View>

        {primary ? (
          <View style={styles.hero}>
            <CountdownDial {...countdownToWindowStart(primary)} size={88} />
            <View style={styles.heroText}>
              <Text style={styles.heroWindow}>
                {formatClock(primary.windowStart).value} – {formatClock(primary.windowEnd).value}{' '}
                {formatClock(primary.windowEnd).ampm}
              </Text>
              <Text style={styles.heroRepeat}>{repeatSummary(primary.repeatDays)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.hero}>
            <Text style={styles.emptyHero}>No alarms yet — tap + to add your first Smart Wake alarm.</Text>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.sectionLabel}>Your Alarms</Text>
          {alarms.length > 0 && (
            <Text style={styles.listHint}>Long-press a card to test-ring it</Text>
          )}
        </View>

        <FlatList
          data={alarms}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  h1: { fontFamily: Fonts.extraBold, fontSize: 26, color: Colors.ink },
  streak: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...Shadows.card,
  },
  streakText: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.ink },
  hero: {
    marginHorizontal: Spacing.xxl,
    marginTop: Spacing.lg,
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    ...Shadows.card,
  },
  heroText: { flex: 1, minWidth: 0 },
  heroWindow: { fontFamily: Fonts.extraBold, fontSize: 17, color: Colors.ink },
  heroRepeat: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.inkFaint, marginTop: 2 },
  emptyHero: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.inkFaint, lineHeight: 20 },
  listHeader: {
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  listHint: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    color: Colors.inkFaint,
    marginTop: 3,
  },
  list: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 140,
    gap: Spacing.md,
  },
});
