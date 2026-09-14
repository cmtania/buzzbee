import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BellIcon, ClockIcon, ShakeIcon } from '@/components/icons';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { Fonts } from '@/constants/theme';
import { ensureAlarmKitAuthorization } from '@/lib/alarmkit';
import { ensureNotificationPermission } from '@/lib/scheduling';

const INK = '#2B2420';
const INK_FAINT = '#9C8C7A';
const ACCENT_DEEP = '#E8790A';
const ACCENT = '#F5A623';

export default function PermissionsScreen() {
  const router = useRouter();

  useEffect(() => {
    ensureNotificationPermission();
    ensureAlarmKitAuthorization();
  }, []);

  return (
    <OnboardingScreen
      step={5}
      title="BuzzBee needs a couple permissions"
      continueLabel="Allow & continue"
      onContinue={() => router.push('/onboarding/features')}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <ShakeIcon size={21} color={ACCENT_DEEP} />
        </View>
        <View style={styles.main}>
          <Text style={styles.title}>Motion & Fitness</Text>
          <Text style={styles.desc}>
            Lets BuzzBee sense light sleep from gentle phone movement during your wake window.
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <BellIcon size={21} color={ACCENT_DEEP} />
        </View>
        <View style={styles.main}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.desc}>So BuzzBee can ring reliably, even through Silent or Focus mode.</Text>
        </View>
      </View>

      <View style={[styles.row, styles.rowLast]}>
        <View style={styles.iconWrap}>
          <ClockIcon size={21} color={ACCENT_DEEP} />
        </View>
        <View style={styles.main}>
          <Text style={styles.title}>Alarms</Text>
          <Text style={styles.desc}>
            So your alarm can still ring — and open straight to your mission — even if BuzzBee is
            fully closed.
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
