import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CalendarIcon, MoonIcon, StopwatchIcon } from '@/components/icons';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { Fonts } from '@/constants/theme';

const INK = '#2B2420';
const INK_FAINT = '#9C8C7A';
const ACCENT_DEEP = '#E8790A';
const ACCENT = '#F5A623';

/**
 * Purely informational now — no toggles. Bedtime Reminder and Calendar
 * Auto-Shift are already on by default (see DEFAULT_SETTINGS in types.ts)
 * and adjustable anytime in Settings; Calendar Auto-Shift's own permission
 * is requested lazily the first time the evening check actually needs it
 * (see calendar-shift.ts), so there's nothing to request here either.
 */
export default function FeaturesScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen
      step={5}
      title="What BuzzBee can do for you"
      subtitle="Bedtime Reminder and Calendar Auto-Shift are on by default — you can adjust them anytime in Settings."
      onContinue={() => router.push('/onboarding/mission')}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <MoonIcon size={21} color={ACCENT_DEEP} />
        </View>
        <View style={styles.main}>
          <Text style={styles.title}>Bedtime Reminder</Text>
          <Text style={styles.desc}>A calm reminder and breathing screen before bed.</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <CalendarIcon size={21} color={ACCENT_DEEP} />
        </View>
        <View style={styles.main}>
          <Text style={styles.title}>Calendar Auto-Shift</Text>
          <Text style={styles.desc}>Nudges your window the evening before, if tomorrow starts early.</Text>
        </View>
      </View>

      <View style={[styles.row, styles.rowLast]}>
        <View style={styles.iconWrap}>
          <StopwatchIcon size={21} color={ACCENT_DEEP} />
        </View>
        <View style={styles.main}>
          <Text style={styles.title}>Task after you’re awake</Text>
          <Text style={styles.desc}>
            Chain reminders after any alarm’s deadline — like “Taking a bath” or “Walk for 10
            minutes” — each with its own time. Set it up per alarm.
          </Text>
        </View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E3E5E7',
  },
  rowLast: { borderBottomWidth: 0 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: ACCENT + '26',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  main: { flex: 1, minWidth: 0 },
  title: { fontFamily: Fonts.extraBold, fontSize: 15, color: INK },
  desc: { fontFamily: Fonts.semiBold, fontSize: 12.5, color: INK_FAINT, marginTop: 3, lineHeight: 18 },
});
