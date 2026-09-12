import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding-screen';
import { Fonts, Radii } from '@/constants/theme';
import { ensureNotificationPermission } from '@/lib/scheduling';

const INK = '#2B2420';
const INK_FAINT = '#9C8C7A';
const CARD_BG = '#FFFDF7';
const ACCENT = '#F5A623';

export default function PermissionsScreen() {
  const router = useRouter();
  const [notificationsGranted, setNotificationsGranted] = useState<boolean | null>(null);

  useEffect(() => {
    ensureNotificationPermission().then(setNotificationsGranted);
  }, []);

  return (
    <OnboardingScreen
      step={5}
      title="A couple of permissions"
      subtitle="So BuzzBee can sense light sleep and still ring even if your phone's on Silent."
      onContinue={() => router.push('/onboarding/features')}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Text style={styles.emoji}>📳</Text>
        </View>
        <View style={styles.main}>
          <Text style={styles.title}>Motion & Fitness</Text>
          <Text style={styles.sub}>Reads gentle phone movement to detect light sleep.</Text>
        </View>
        <Text style={styles.status}>Built-in</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Text style={styles.emoji}>🔔</Text>
        </View>
        <View style={styles.main}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.sub}>Lets BuzzBee ring at your hard deadline as a safety net.</Text>
        </View>
        <Text style={[styles.status, notificationsGranted && styles.statusGranted]}>
          {notificationsGranted === null ? '…' : notificationsGranted ? 'Granted' : 'Denied'}
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD_BG,
    borderRadius: Radii.lg,
    padding: 16,
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: ACCENT + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
  main: { flex: 1, minWidth: 0 },
  title: { fontFamily: Fonts.bold, fontSize: 15, color: INK },
  sub: { fontFamily: Fonts.semiBold, fontSize: 12, color: INK_FAINT, marginTop: 2, lineHeight: 16 },
  status: { fontFamily: Fonts.bold, fontSize: 12, color: INK_FAINT },
  statusGranted: { color: '#3FAE5A' },
});
