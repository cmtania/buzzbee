import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChevronRight, LongArrowRight } from '@/components/icons';
import { TimeStepper } from '@/components/time-stepper';
import { Toggle } from '@/components/toggle';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { dayShortLabel } from '@/lib/alarm-utils';
import { deleteAlarm, saveAlarm } from '@/lib/db';
import { genId } from '@/lib/id';
import { MissionIcon, missionLabel, missionSubtitle } from '@/lib/mission-meta';
import { cancelAlarmNotification, scheduleAlarmNotification } from '@/lib/scheduling';

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun display order

export default function AddEditScreen() {
  const router = useRouter();
  const { draft, setDraft } = useAlarmDraft();
  const isEditing = draft.id !== '';

  function toggleDay(dow: number) {
    setDraft((d) => ({
      ...d,
      repeatDays: d.repeatDays.includes(dow)
        ? d.repeatDays.filter((x) => x !== dow)
        : [...d.repeatDays, dow].sort(),
    }));
  }

  async function handleSave() {
    const alarm = draft.id ? draft : { ...draft, id: genId('alarm') };
    await saveAlarm(alarm);
    if (alarm.enabled) await scheduleAlarmNotification(alarm);
    else await cancelAlarmNotification(alarm.id);
    router.back();
  }

  async function handleCancel() {
    router.back();
  }

  async function handleDelete() {
    await cancelAlarmNotification(draft.id);
    await deleteAlarm(draft.id);
    router.back();
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topbar}>
          <Text style={styles.title}>{isEditing ? 'Edit Alarm' : 'New Alarm'}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {draft.smartWakeEnabled ? (
            <View>
              <Text style={styles.sectionLabel}>Wake window</Text>
              <View style={styles.timeRow}>
                <TimeStepper
                  label="Starts"
                  value={draft.windowStart}
                  onChange={(v) => setDraft((d) => ({ ...d, windowStart: v }))}
                />
                <View style={styles.timeSep}>
                  <LongArrowRight size={16} color={Colors.inkFaint} />
                </View>
                <TimeStepper
                  label="Hard deadline"
                  value={draft.windowEnd}
                  onChange={(v) => setDraft((d) => ({ ...d, windowEnd: v }))}
                  deadline
                />
              </View>
              <Text style={styles.hint}>
                BuzzBee rings sometime in this range — never later than the deadline.
              </Text>
            </View>
          ) : (
            <View>
              <Text style={styles.sectionLabel}>Alarm time</Text>
              <TimeStepper
                label="Rings at"
                value={draft.windowEnd}
                onChange={(v) => setDraft((d) => ({ ...d, windowStart: v, windowEnd: v }))}
              />
            </View>
          )}

          <View style={styles.rowCard}>
            <View style={styles.smartRow}>
              <Text style={styles.smartLabel}>Smart Wake</Text>
              <Toggle
                value={draft.smartWakeEnabled}
                onChange={(v) =>
                  setDraft((d) => {
                    if (v) {
                      // Turning Smart Wake back on: give it a real window
                      // instead of a zero-width one collapsed to a point.
                      if (d.windowStart === d.windowEnd) {
                        const [h, m] = d.windowEnd.split(':').map(Number);
                        const startMin = (h * 60 + m - 30 + 1440) % 1440;
                        const start = `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`;
                        return { ...d, smartWakeEnabled: v, windowStart: start };
                      }
                      return { ...d, smartWakeEnabled: v };
                    }
                    // Turning it off: a fixed-time alarm is one time, not a
                    // range — collapse to the deadline so Home shows a
                    // single time instead of a stale-looking window.
                    return { ...d, smartWakeEnabled: v, windowStart: d.windowEnd };
                  })
                }
              />
            </View>
            <View style={styles.smartExplainer}>
              <Text style={styles.buzzTag}>Buzz says</Text>
              <Text style={styles.explainerText}>
                I'll ring the moment you're in light sleep — never later than your deadline!
              </Text>
            </View>
          </View>

          <View>
            <Text style={styles.sectionLabel}>Repeat</Text>
            <View style={styles.days}>
              {ALL_DAYS.map((dow) => {
                const active = draft.repeatDays.includes(dow);
                return (
                  <Pressable
                    key={dow}
                    style={[styles.day, active && styles.dayActive]}
                    onPress={() => toggleDay(dow)}>
                    <Text style={[styles.dayText, active && styles.dayTextActive]}>
                      {dayShortLabel(dow)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={styles.sectionLabel}>Choose a Mission</Text>
            <Pressable
              style={[styles.rowCard, styles.missionRow]}
              onPress={() => router.push('/choose-mission')}>
              <View style={styles.missionIconWrap}>
                <MissionIcon method={draft.dismissMethod} size={20} color={Colors.accentDeep} />
              </View>
              <View style={styles.missionMain}>
                <Text style={styles.missionTitle}>{missionLabel(draft.dismissMethod)}</Text>
                <Text style={styles.missionSub}>{missionSubtitle(draft.dismissMethod)}</Text>
              </View>
              <ChevronRight />
            </Pressable>
          </View>

          <Pressable
            style={[styles.rowCard, styles.soundRow]}
            onPress={() => router.push('/choose-sound')}>
            <Text style={styles.soundLabel}>Sound</Text>
            <View style={styles.soundRight}>
              <Text style={styles.soundValue}>{draft.sound}</Text>
              <ChevronRight />
            </View>
          </Pressable>

          {isEditing && (
            <Pressable style={styles.deleteRow} onPress={handleDelete}>
              <Text style={styles.deleteText}>Delete Alarm</Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>Save Alarm</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  topbar: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, alignItems: 'center' },
  title: { fontFamily: Fonts.extraBold, fontSize: 17, color: Colors.ink },
  body: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 40 },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  timeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  timeSep: { flexShrink: 0 },
  hint: { fontSize: 12.5, color: Colors.inkFaint, marginTop: 10, lineHeight: 17, fontFamily: Fonts.medium },
  rowCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    padding: 14,
    ...Shadows.card,
  },
  smartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smartLabel: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.ink },
  smartExplainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.trackOff,
  },
  buzzTag: {
    fontFamily: Fonts.extraBold,
    fontSize: 11,
    color: Colors.accentDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  explainerText: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.inkSoft, lineHeight: 17 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.trackOff,
  },
  dayActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  dayText: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.inkFaint },
  dayTextActive: { color: Colors.ink },
  missionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  missionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionMain: { flex: 1, minWidth: 0 },
  missionTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.ink },
  missionSub: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.inkFaint, marginTop: 2 },
  soundRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  soundLabel: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.ink },
  soundRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  soundValue: { fontFamily: Fonts.semiBold, fontSize: 14.5, color: Colors.inkFaint },
  deleteRow: { alignItems: 'center', paddingVertical: 8 },
  deleteText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.danger },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Colors.trackOff,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontFamily: Fonts.extraBold, fontSize: 15.5, color: Colors.ink },
  saveBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  saveText: { fontFamily: Fonts.extraBold, fontSize: 15.5, color: '#2B2420' },
});
