import { requestRecordingPermissionsAsync } from 'expo-audio';
import { requestCalendarPermissions } from 'expo-calendar';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding-screen';
import { Toggle } from '@/components/toggle';
import { Fonts, Radii } from '@/constants/theme';
import { getSettings, updateSettings } from '@/lib/db';
import { AppSettings } from '@/lib/types';

const INK = '#2B2420';
const INK_FAINT = '#9C8C7A';
const CARD_BG = '#FFFDF7';

export default function FeaturesScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  async function patch(update: Partial<AppSettings>) {
    const next = await updateSettings(update);
    setSettings(next);
  }

  if (!settings) return <View style={styles.loading} />;

  return (
    <OnboardingScreen
      step={6}
      title="Choose your smart features"
      subtitle="All global — they apply across every alarm. You can change these anytime in Settings."
      onContinue={() => router.push('/onboarding/mission')}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.main}>
            <Text style={styles.title}>Bedtime Reminder</Text>
            <Text style={styles.sub}>A calm reminder before bed.</Text>
          </View>
          <Toggle
            value={settings.windDownEnabled}
            onChange={(v) => patch({ windDownEnabled: v })}
          />
        </View>

        <View style={[styles.row, styles.divider]}>
          <View style={styles.main}>
            <Text style={styles.title}>Calendar Auto-Shift</Text>
            <Text style={styles.sub}>Nudges your window if tomorrow starts early.</Text>
          </View>
          <Toggle
            value={settings.calendarAutoShiftEnabled}
            onChange={async (v) => {
              if (v) await requestCalendarPermissions();
              patch({ calendarAutoShiftEnabled: v });
            }}
          />
        </View>

        <View style={[styles.row, styles.divider]}>
          <View style={styles.main}>
            <Text style={styles.title}>Ambient Awareness</Text>
            <Text style={styles.sub}>On-device only, never recorded or uploaded.</Text>
          </View>
          <Toggle
            value={settings.ambientAwarenessEnabled}
            onChange={async (v) => {
              if (v) await requestRecordingPermissionsAsync();
              patch({ ambientAwarenessEnabled: v });
            }}
          />
        </View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#F2F3F4' },
  card: { backgroundColor: CARD_BG, borderRadius: Radii.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E3E5E7' },
  main: { flex: 1, minWidth: 0 },
  title: { fontFamily: Fonts.bold, fontSize: 15, color: INK },
  sub: { fontFamily: Fonts.semiBold, fontSize: 12, color: INK_FAINT, marginTop: 2, lineHeight: 16 },
});
