import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { LongArrowRight } from '@/components/icons';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { TimeStepper } from '@/components/time-stepper';
import { Fonts } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';

const INK_FAINT = '#9C8C7A';

export default function WindowScreen() {
  const router = useRouter();
  const { draft, setDraft } = useAlarmDraft();

  return (
    <OnboardingScreen step={3} title="Set your wake window" onContinue={() => router.push('/onboarding/repeat')}>
      <View style={styles.row}>
        <TimeStepper
          label="Earliest OK"
          value={draft.windowStart}
          onChange={(v) => setDraft((d) => ({ ...d, windowStart: v }))}
        />
        <View style={styles.sep}>
          <LongArrowRight size={16} color={INK_FAINT} />
        </View>
        <TimeStepper
          label="Latest (hard deadline)"
          value={draft.windowEnd}
          onChange={(v) => setDraft((d) => ({ ...d, windowEnd: v }))}
          deadline
        />
      </View>
      <Text style={styles.hint}>
        BuzzBee rings sometime in this range — the moment it senses light sleep, never later than
        the deadline.
      </Text>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  sep: { flexShrink: 0 },
  hint: { fontFamily: Fonts.medium, fontSize: 12.5, color: INK_FAINT, lineHeight: 18 },
});
