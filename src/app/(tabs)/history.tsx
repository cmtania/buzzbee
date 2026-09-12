import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { getRecentWakeEvents } from '@/lib/db';
import { WakeEvent } from '@/lib/types';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function HistoryScreen() {
  const [events, setEvents] = useState<WakeEvent[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecentWakeEvents(7).then(setEvents);
    }, [])
  );

  const insight = buildInsight(events);
  const last7 = buildLast7Days(events);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.h1}>Wake History</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Last 7 days</Text>
            <View style={styles.chartRow}>
              {last7.map((day) => (
                <View key={day.key} style={styles.chartCol}>
                  <View style={styles.trackLine} />
                  <View
                    style={[
                      styles.dot,
                      day.event
                        ? day.event.triggeredBy === 'smart-detection'
                          ? styles.dotSmart
                          : styles.dotDeadline
                        : styles.dotEmpty,
                    ]}
                  />
                  <Text style={styles.dayLabel}>{day.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.dotSmart]} />
                <Text style={styles.legendText}>Smart wake</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.dotDeadline]} />
                <Text style={styles.legendText}>Deadline</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.buzzTag}>Buzz says</Text>
            <Text style={styles.insight}>{insight}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
      <FloatingTabBar />
    </View>
  );
}

function buildLast7Days(events: WakeEvent[]) {
  const byDate = new Map(events.map((e) => [e.date, e]));
  const days: { key: string; label: string; event?: WakeEvent }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, label: DAY_LABELS[d.getDay()], event: byDate.get(key) });
  }
  return days;
}

function buildInsight(events: WakeEvent[]): string {
  if (events.length === 0) {
    return "No wake data yet — I'll have something to celebrate once you've used a Smart Wake alarm!";
  }
  const smartWakes = events.filter((e) => e.triggeredBy === 'smart-detection');
  if (smartWakes.length === 0) {
    return "You've been waking at your hard deadline lately — once Smart Wake catches a light-sleep moment, I'll ring you earlier and gentler!";
  }
  const avgEarly =
    smartWakes.reduce((sum, e) => {
      const diffMin =
        (new Date(e.scheduledDeadline).getTime() - new Date(e.actualRingTime).getTime()) / 60000;
      return sum + Math.max(0, diffMin);
    }, 0) / smartWakes.length;
  return `You beat your deadline by ${Math.round(avgEarly)} minutes on average this week!`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
  h1: { fontFamily: Fonts.extraBold, fontSize: 26, color: Colors.ink },
  body: { padding: Spacing.xxl, gap: Spacing.lg, paddingBottom: 140 },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.lg,
  },
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartCol: { alignItems: 'center', gap: 8, width: 28 },
  trackLine: {
    position: 'absolute',
    top: 9,
    left: -20,
    right: -20,
    height: 2,
    backgroundColor: Colors.trackOff,
  },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.cardBg },
  dotSmart: { backgroundColor: Colors.accent },
  dotDeadline: { backgroundColor: Colors.inkFaint },
  dotEmpty: { backgroundColor: Colors.trackOff },
  dayLabel: { fontFamily: Fonts.bold, fontSize: 11, color: Colors.inkFaint },
  legendRow: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: Fonts.semiBold, fontSize: 11.5, color: Colors.inkFaint },
  buzzTag: {
    fontFamily: Fonts.extraBold,
    fontSize: 11,
    color: Colors.accentDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  insight: { fontFamily: Fonts.semiBold, fontSize: 14.5, color: Colors.ink, lineHeight: 21 },
});
