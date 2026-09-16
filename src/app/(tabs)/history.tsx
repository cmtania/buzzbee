import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { CheckIcon, ChevronRight, CloseIcon } from '@/components/icons';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { DayDetail, DaySummary, getDayDetail, getMonthSummaries } from '@/lib/history-data';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** null cells pad the grid to a full 7-column week, before day 1 and after the month's last day. */
function buildMonthGrid(year: number, month0: number): (Date | null)[] {
  const firstDay = new Date(year, month0, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month0, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatSelectedLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return 'Today';
  return keyToDate(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function HistoryScreen() {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);
  const [viewedYear, setViewedYear] = useState(today.getFullYear());
  const [viewedMonth, setViewedMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [summaries, setSummaries] = useState<Record<string, DaySummary>>({});
  const [detail, setDetail] = useState<DayDetail | null>(null);

  const grid = useMemo(() => buildMonthGrid(viewedYear, viewedMonth), [viewedYear, viewedMonth]);

  useFocusEffect(
    useCallback(() => {
      const lastDay = new Date(viewedYear, viewedMonth + 1, 0).getDate();
      const start = `${viewedYear}-${pad(viewedMonth + 1)}-01`;
      const end = `${viewedYear}-${pad(viewedMonth + 1)}-${pad(lastDay)}`;
      getMonthSummaries(start, end).then(setSummaries);
    }, [viewedYear, viewedMonth])
  );

  useFocusEffect(
    useCallback(() => {
      setDetail(null);
      getDayDetail(selectedDate).then(setDetail);
    }, [selectedDate])
  );

  function goPrevMonth() {
    if (viewedMonth === 0) {
      setViewedYear((y) => y - 1);
      setViewedMonth(11);
    } else {
      setViewedMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewedMonth === 11) {
      setViewedYear((y) => y + 1);
      setViewedMonth(0);
    } else {
      setViewedMonth((m) => m + 1);
    }
  }

  const selectedLabel = formatSelectedLabel(selectedDate, todayKey);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>History</Text>
          <Text style={styles.h1}>Wake Calendar</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.calendarCard}>
            <View style={styles.monthNav}>
              <Pressable onPress={goPrevMonth} hitSlop={10} style={styles.navBtn}>
                <View style={styles.flipX}>
                  <ChevronRight size={16} color={Colors.ink} />
                </View>
              </Pressable>
              <Text style={styles.monthLabel}>
                {MONTH_LABELS[viewedMonth]} {viewedYear}
              </Text>
              <Pressable onPress={goNextMonth} hitSlop={10} style={styles.navBtn}>
                <ChevronRight size={16} color={Colors.ink} />
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((w, i) => (
                <Text key={i} style={styles.weekdayText}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {grid.map((d, i) => {
                if (!d) return <View key={i} style={styles.cell} />;
                const key = toDateKey(d);
                const summary = summaries[key];
                const isSelected = key === selectedDate;
                const isToday = key === todayKey;
                return (
                  <Pressable
                    key={i}
                    style={[styles.cell, isSelected && styles.cellSelected]}
                    onPress={() => setSelectedDate(key)}>
                    <Text
                      style={[
                        styles.cellText,
                        isToday && styles.cellTextToday,
                        isSelected && styles.cellTextSelected,
                      ]}>
                      {d.getDate()}
                    </Text>
                    {summary && (
                      <View
                        style={[
                          styles.cellDot,
                          { backgroundColor: summary.completed ? Colors.success : Colors.danger },
                        ]}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.legendText}>Mission finished</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
                <Text style={styles.legendText}>Rang, not finished</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.detailDate}>{selectedLabel}</Text>
            {!detail ? (
              <Text style={styles.detailEmpty}>Loading…</Text>
            ) : detail.alarmsTriggered === 0 ? (
              <Text style={styles.detailEmpty}>No alarms rang this day.</Text>
            ) : (
              <>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Alarms triggered</Text>
                  <Text style={styles.statValue}>{detail.alarmsTriggered}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Mission finished</Text>
                  <Text style={styles.statValue}>
                    {detail.missionsCompleted} / {detail.alarmsTriggered}
                  </Text>
                </View>

                {detail.tasks.length > 0 && (
                  <View style={styles.taskSection}>
                    <Text style={styles.taskSectionLabel}>
                      Tasks · {detail.tasks.filter((t) => t.completed).length}/{detail.tasks.length} done
                    </Text>
                    {detail.tasks.map((t) => (
                      <View key={t.taskId} style={styles.taskRow}>
                        <View
                          style={[
                            styles.taskIconWrap,
                            t.completed ? styles.taskIconDone : styles.taskIconMissed,
                          ]}>
                          {t.completed ? (
                            <CheckIcon size={11} color={Colors.white} />
                          ) : (
                            <CloseIcon size={10} color={Colors.white} />
                          )}
                        </View>
                        <Text style={styles.taskLabel} numberOfLines={1}>
                          {t.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
      <FloatingTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg },
  eyebrow: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.inkFaint },
  h1: { fontFamily: Fonts.extraBold, fontSize: 26, color: Colors.ink, marginTop: 2 },
  body: { padding: Spacing.xxl, gap: Spacing.lg, paddingBottom: 140 },
  calendarCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: Spacing.md,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.trackOff,
  },
  flipX: { transform: [{ scaleX: -1 }] },
  monthLabel: { fontFamily: Fonts.extraBold, fontSize: 15.5, color: Colors.ink },
  weekdayRow: { flexDirection: 'row' },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  cellSelected: {
    backgroundColor: Colors.accent + '33',
    borderRadius: Radii.sm,
  },
  cellText: { fontFamily: Fonts.semiBold, fontSize: 13.5, color: Colors.ink },
  cellTextToday: { color: Colors.accentDeep, fontFamily: Fonts.extraBold },
  cellTextSelected: { fontFamily: Fonts.extraBold },
  cellDot: { width: 5, height: 5, borderRadius: 2.5 },
  legendRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.trackOff,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: Fonts.medium, fontSize: 11.5, color: Colors.inkSoft },
  detailCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  detailDate: { fontFamily: Fonts.extraBold, fontSize: 16, color: Colors.ink, marginBottom: 10 },
  detailEmpty: { fontFamily: Fonts.semiBold, fontSize: 13.5, color: Colors.inkFaint },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statLabel: { fontFamily: Fonts.semiBold, fontSize: 13.5, color: Colors.inkSoft },
  statValue: { fontFamily: Fonts.extraBold, fontSize: 13.5, color: Colors.ink },
  taskSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.trackOff,
    gap: 8,
  },
  taskSectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 11.5,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIconDone: { backgroundColor: Colors.success },
  taskIconMissed: { backgroundColor: Colors.danger },
  taskLabel: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 13.5, color: Colors.ink },
});
