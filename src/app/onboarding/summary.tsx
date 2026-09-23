import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';

import { OnboardingScreen } from '@/components/onboarding-screen';
import { Fonts, Radii } from '@/constants/theme';
import { formatClock, repeatSummary } from '@/lib/alarm-utils';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { saveAlarm, updateSettings } from '@/lib/db';
import { genId } from '@/lib/id';
import { missionLabel } from '@/lib/mission-meta';
import { scheduleAlarmNotification } from '@/lib/scheduling';

const INK = '#2B2420';
const INK_FAINT = '#9C8C7A';
const CARD_BG = '#FFFDF7';

export default function SummaryScreen() {
  const router = useRouter();
  const { draft } = useAlarmDraft();
  const [saving, setSaving] = useState(false);

  const start = formatClock(draft.windowStart);
  const end = formatClock(draft.windowEnd);

  async function finish() {
    setSaving(true);
    const alarm = { ...draft, id: genId('alarm') };
    await saveAlarm(alarm);
    if (alarm.enabled) await scheduleAlarmNotification(alarm);
    await updateSettings({ hasOnboarded: true });
    router.replace('/');
  }

  return (
    <OnboardingScreen
      step={8}
      title="You're all set"
      continueLabel={saving ? 'Setting up…' : 'Set it up'}
      continueDisabled={saving}
      onContinue={finish}>
      <View style={styles.card}>
        <Row label="Wake window" value={`${start.value} ${start.ampm} – ${end.value} ${end.ampm}`} />
        <Row label="Repeats" value={repeatSummary(draft.repeatDays)} />
        <Row label="Wake Window" value={draft.smartWakeEnabled ? 'On' : 'Off'} />
        <Row label="Dismiss mission" value={missionLabel(draft.dismissMethod)} last />
      </View>
      <Text style={styles.footnote}>
        You can change any of this later from the alarm's edit screen or Settings.
      </Text>
    </OnboardingScreen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: CARD_BG, borderRadius: Radii.lg, overflow: 'hidden', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3E5E7' },
  rowLabel: { fontFamily: Fonts.semiBold, fontSize: 15.5, color: INK_FAINT },
  rowValue: { fontFamily: Fonts.bold, fontSize: 15.5, color: INK },
  footnote: { fontFamily: Fonts.medium, fontSize: 14, color: INK_FAINT, lineHeight: 18, textAlign: 'center' },
});
