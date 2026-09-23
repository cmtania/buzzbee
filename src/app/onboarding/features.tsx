import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/glass-card';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { BedDouble, Calendar, CalendarCheck, LucideIcon, Mic, Tag } from 'lucide-react-native';

// Same five features and copy as the App Store "What BuzzBee Can Do For You"
// slide (app-store/promo-src/build.mjs, slide 04) — keep the two in sync.
const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: BedDouble, title: 'Bedtime Reminder', desc: 'A calm reminder and breathing screen before bed.' },
  {
    icon: Calendar,
    title: 'Calendar Auto-Shift',
    desc: 'A heads-up the day before if tomorrow’s first event clashes with your wake window.',
  },
  { icon: CalendarCheck, title: 'Wake Calendar', desc: 'See which mornings you finished the mission, day by day.' },
  {
    icon: Tag,
    title: 'Name Every Alarm',
    desc: '“Meds,” “Morning run” — the name shows on the alarm and when it rings.',
  },
  {
    icon: Mic,
    title: 'Record Your Own Sound',
    desc: 'Your voice, a song clip, anything — up to 15 seconds, saved on your phone only.',
  },
];

/**
 * Purely informational — no toggles. Bedtime Reminder and Calendar
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
      <GlassCard style={styles.card}>
        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
          <View key={title} style={[styles.row, i === FEATURES.length - 1 && styles.rowLast]}>
            <View style={styles.iconWrap}>
              <Icon size={24} color={Colors.accentDeep} />
            </View>
            <View style={styles.main}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.desc}>{desc}</Text>
            </View>
          </View>
        ))}
      </GlassCard>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radii.lg, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.trackOff,
  },
  rowLast: { borderBottomWidth: 0 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: Colors.accent + '26',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  main: { flex: 1, minWidth: 0 },
  title: { fontFamily: Fonts.extraBold, fontSize: 17.5, color: Colors.ink },
  desc: { fontFamily: Fonts.semiBold, fontSize: 14.5, color: Colors.inkFaint, marginTop: 3, lineHeight: 19 },
});
