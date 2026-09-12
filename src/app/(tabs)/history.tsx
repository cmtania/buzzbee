import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { getRecentWakeEvents } from '@/lib/db';
import { WakeEvent } from '@/lib/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_EARLY_MIN = 30; // scale cap for positioning the dot along the track

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
          <Text style={styles.eyebrow}>Last 7 days</Text>
          <Text style={styles.h1}>Wake History</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.insightCard}>
            <Text style={styles.buzzTag}>Buzz says</Text>
            <Text style={styles.insight}>{insight}</Text>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Wake time vs. deadline</Text>
            <View style={styles.axisCaps}>
              <Text style={styles.axisCapText}>Window start</Text>
              <Text style={styles.axisCapText}>Deadline</Text>
            </View>

            {last7.map((day) => (
              <View key={day.key} style={styles.chartRow}>
                <Text style={styles.dayLabel}>{day.label}</Text>
                <View style={styles.track}>
                  {day.event && (
                    <View
                      style={[
                        styles.dot,
                        {
                          left: `${day.leftPct}%`,
                          backgroundColor:
                            day.event.triggeredBy === 'smart-detection'
                              ? Colors.accent
                              : Colors.inkFaint,
                        },
                      ]}
                    />
                  )}
                </View>
                <Text style={styles.value}>{day.valueLabel}</Text>
              </View>
            ))}

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
                <Text style={styles.legendText}>Smart wake</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.inkFaint }]} />
                <Text style={styles.legendText}>Deadline reached</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <FloatingTabBar />
    </View>
  );
}

function buildLast7Days(events: WakeEvent[]) {
  const byDate = new Map(events.map((e) => [e.date, e]));
  const days: {
    key: string;
    label: string;
    event?: WakeEvent;
    leftPct: number;
    valueLabel: string;
  }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const event = byDate.get(key);

    let leftPct = 100;
    let valueLabel = '—';
    if (event) {
      if (event.triggeredBy === 'smart-detection') {
        const earlyMin = Math.max(
          0,
          Math.round(
            (new Date(event.scheduledDeadline).getTime() - new Date(event.actualRingTime).getTime()) /
              60000
          )
        );
        leftPct = (1 - Math.min(earlyMin, MAX_EARLY_MIN) / MAX_EARLY_MIN) * 100;
        valueLabel = `${earlyMin}m early`;
      } else {
        leftPct = 93;
        valueLabel = 'At deadline';
      }
    }

    days.push({ key, label: DAY_LABELS[d.getDay()], event, leftPct, valueLabel });
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
  eyebrow: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.inkFaint },
  h1: { fontFamily: Fonts.extraBold, fontSize: 26, color: Colors.ink, marginTop: 2 },
  body: { padding: Spacing.xxl, gap: Spacing.lg, paddingBottom: 140 },
  insightCard: {
    backgroundColor: Colors.accent + '33',
    borderRadius: Radii.xl,
    padding: 16,
  },
  chartCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  chartTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  axisCaps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 44,
    marginRight: 60,
    marginTop: 10,
    marginBottom: 8,
  },
  axisCapText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dayLabel: { width: 34, fontFamily: Fonts.bold, fontSize: 12.5, color: Colors.inkSoft },
  track: { flex: 1, height: 6, borderRadius: 100, backgroundColor: Colors.trackOff },
  dot: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: Colors.cardBg,
  },
  value: { width: 74, fontFamily: Fonts.bold, fontSize: 12, color: Colors.inkFaint, textAlign: 'right' },
  legendRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.trackOff,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: 4.5 },
  legendText: { fontFamily: Fonts.medium, fontSize: 12.5, color: Colors.inkSoft },
  buzzTag: {
    fontFamily: Fonts.extraBold,
    fontSize: 10.5,
    color: Colors.accentDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  insight: { fontFamily: Fonts.bold, fontSize: 13.5, color: Colors.ink, lineHeight: 19 },
});
