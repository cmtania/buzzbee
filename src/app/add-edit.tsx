import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/glass-card';
import { SwipeToDismissSheet } from '@/components/swipe-to-dismiss-sheet';
import { TimeStepper } from '@/components/time-stepper';
import { Toggle } from '@/components/toggle';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { ArrowRight, ChevronRight } from 'lucide-react-native';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { dayShortLabel } from '@/lib/alarm-utils';
import { getCustomSounds, soundDisplayName } from '@/lib/custom-sounds';
import { saveAlarm } from '@/lib/db';
import { genId } from '@/lib/id';
import { MissionIcon, missionLabel, missionSubtitle } from '@/lib/mission-meta';
import { cancelAlarmNotification, scheduleAlarmNotification } from '@/lib/scheduling';
import { CustomSound } from '@/lib/types';

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun display order

export default function AddEditScreen() {
  const router = useRouter();
  const { draft, setDraft } = useAlarmDraft();
  const isEditing = draft.id !== '';
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);

  useFocusEffect(
    useCallback(() => {
      getCustomSounds().then(setCustomSounds);
    }, [])
  );
  // Guards against the same TimePickerModal-vs-sheet conflict fixed in
  // wind-down-settings.tsx: RN's <Modal> touches leak through to this
  // sheet's swipe/tap-outside dismiss underneath it, so both need to be
  // disabled while any of this screen's time pickers are open.
  const [pickerOpen, setPickerOpen] = useState(false);

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

  return (
    // Plain View, not Pressable — tapping the dimmed backdrop no longer
    // closes this sheet (per explicit request); dismissal is now only via
    // the header's swipe-down, the Cancel button, or the hardware/system
    // back gesture.
    <View style={styles.backdrop}>
      <SwipeToDismissSheet
        onDismiss={handleCancel}
        style={styles.sheet}
        disabled={pickerOpen}
        header={
          <>
            <View style={styles.handle} />
            <View style={styles.topbar}>
              <Text style={styles.title}>{isEditing ? 'Edit Alarm' : 'New Alarm'}</Text>
            </View>
          </>
        }>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          <View>
            <Text style={styles.sectionLabel}>Alarm name</Text>
            <GlassCard style={styles.rowCard}>
              <TextInput
                style={styles.labelInput}
                value={draft.label}
                onChangeText={(text) => setDraft((d) => ({ ...d, label: text }))}
                placeholder="Morning run, Meds, Work…"
                placeholderTextColor={Colors.inkFaint}
                maxLength={40}
                returnKeyType="done"
              />
            </GlassCard>
          </View>

          <GlassCard style={styles.rowCard}>
            <View style={styles.smartRow}>
              <Text style={styles.smartLabel}>Wake Window</Text>
              <Toggle
                value={draft.smartWakeEnabled}
                onChange={(v) =>
                  setDraft((d) => {
                    if (v) {
                      // Turning Wake Window back on: give it a real window
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
                Instead of one fixed time, set a window below. I’ll start ringing gently the
                moment it opens and build up to full volume by your hard deadline — so you’re
                eased awake, never overslept.
              </Text>
            </View>
          </GlassCard>

          {draft.smartWakeEnabled ? (
            <View>
              <Text style={styles.sectionLabel}>Wake window</Text>
              <View style={styles.timeRow}>
                <GlassCard style={styles.timeStepperGlass}>
                  <TimeStepper
                    label="Starts"
                    value={draft.windowStart}
                    onChange={(v) => setDraft((d) => ({ ...d, windowStart: v }))}
                    bigFont
                    bare
                    onOpenChange={setPickerOpen}
                  />
                </GlassCard>
                <View style={styles.timeSep}>
                  <ArrowRight size={18.5} color={Colors.inkFaint} />
                </View>
                <GlassCard style={styles.timeStepperGlass}>
                  <TimeStepper
                    label="Hard deadline"
                    value={draft.windowEnd}
                    onChange={(v) => setDraft((d) => ({ ...d, windowEnd: v }))}
                    deadline
                    bigFont
                    bare
                    onOpenChange={setPickerOpen}
                  />
                </GlassCard>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.sectionLabel}>Alarm time</Text>
              <View style={styles.fixedTimeCenterWrap}>
                <GlassCard style={styles.fixedTimeGlass}>
                  <TimeStepper
                    label="Rings at"
                    value={draft.windowEnd}
                    onChange={(v) => setDraft((d) => ({ ...d, windowStart: v, windowEnd: v }))}
                    large
                    bare
                    onOpenChange={setPickerOpen}
                  />
                </GlassCard>
              </View>
            </View>
          )}

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
            <Pressable onPress={() => router.push('/choose-mission')}>
              <GlassCard style={[styles.rowCard, styles.missionRow]}>
                <View style={styles.missionIconWrap}>
                  <MissionIcon method={draft.dismissMethod} size={23} color={Colors.accentDeep} />
                </View>
                <View style={styles.missionMain}>
                  <Text style={styles.missionTitle}>{missionLabel(draft.dismissMethod)}</Text>
                  <Text style={styles.missionSub}>{missionSubtitle(draft.dismissMethod)}</Text>
                </View>
                <ChevronRight size={17.5} color={Colors.inkFaint} />
              </GlassCard>
            </Pressable>
          </View>

          <Pressable onPress={() => router.push('/choose-sound')}>
            <GlassCard style={[styles.rowCard, styles.soundRow]}>
              <Text style={styles.soundLabel}>Sound</Text>
              <View style={styles.soundRight}>
                <Text style={styles.soundValue} numberOfLines={1}>
                  {soundDisplayName(draft.sound, customSounds)}
                </Text>
                <ChevronRight size={17.5} color={Colors.inkFaint} />
              </View>
            </GlassCard>
          </Pressable>

          <GlassCard style={[styles.rowCard, styles.vibrateRow]}>
            <Text style={styles.soundLabel}>Vibrate</Text>
            <Toggle
              value={draft.vibrationEnabled}
              onChange={(v) => setDraft((d) => ({ ...d, vibrationEnabled: v }))}
            />
          </GlassCard>

          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.footerBtnWrap} onPress={handleCancel}>
              <GlassCard style={styles.cancelBtn} isInteractive>
                <Text style={styles.cancelText}>Cancel</Text>
              </GlassCard>
            </Pressable>
            <Pressable style={styles.footerBtnWrap} onPress={handleSave}>
              <GlassCard style={styles.saveBtn} isInteractive>
                <Text style={styles.saveText}>{isEditing ? 'Update My Alarm' : 'Create My Alarm'}</Text>
              </GlassCard>
            </Pressable>
          </View>
        </SafeAreaView>
      </SwipeToDismissSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,36,32,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  // flexShrink: 1 on both this and `scroll` below is what actually makes the
  // sheet's maxHeight cap work with a growing body: RN's default flexShrink
  // is 0 (unlike web's 1), so without this, content taller than maxHeight
  // doesn't shrink to fit — it just overflows past the sheet's box, pushing
  // the footer (Cancel/Save) below the screen entirely instead of leaving it
  // reachable via a scrollable body.
  safeArea: { flexShrink: 1 },
  scroll: { flexShrink: 1 },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.trackOff,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  topbar: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, alignItems: 'center' },
  title: { fontFamily: Fonts.extraBold, fontSize: 19.5, color: Colors.ink },
  body: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 24 },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  timeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  timeStepperGlass: { flex: 1, borderRadius: Radii.lg, paddingHorizontal: 14, alignItems: 'center' },
  fixedTimeCenterWrap: { alignItems: 'center' },
  fixedTimeGlass: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 48,
    borderRadius: Radii.lg,
  },
  timeSep: { flexShrink: 0 },
  rowCard: {
    borderRadius: Radii.lg,
    padding: 14,
  },
  labelInput: {
    fontFamily: Fonts.bold,
    fontSize: 18.5,
    color: Colors.ink,
    // Height (rather than padding) so the field matches a rowCard's normal
    // single-line height instead of growing it — RN's TextInput defaults to
    // a taller intrinsic height on iOS than the Text rows beside it.
    height: 28,
    padding: 0,
  },
  smartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smartLabel: { fontFamily: Fonts.bold, fontSize: 17.5, color: Colors.ink },
  smartExplainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.trackOff,
  },
  buzzTag: {
    fontFamily: Fonts.extraBold,
    fontSize: 12.5,
    color: Colors.accentDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  explainerText: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.inkSoft, lineHeight: 17 },
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
  dayText: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.inkFaint },
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
  missionTitle: { fontFamily: Fonts.bold, fontSize: 18.5, color: Colors.ink },
  missionSub: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.inkFaint, marginTop: 2 },
  soundRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vibrateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  soundLabel: { fontFamily: Fonts.bold, fontSize: 18.5, color: Colors.ink },
  soundRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginLeft: 12 },
  soundValue: { flexShrink: 1, fontFamily: Fonts.semiBold, fontSize: 16.5, color: Colors.inkFaint, textAlign: 'right' },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  footerBtnWrap: { flex: 1 },
  cancelBtn: {
    height: 52,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontFamily: Fonts.extraBold, fontSize: 18, color: Colors.ink },
  saveBtn: {
    height: 52,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontFamily: Fonts.extraBold, fontSize: 18, color: Colors.accentDeep },
});
