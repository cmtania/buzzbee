import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useEveningCalendarCheck } from '@/hooks/use-evening-calendar-check';
import { useSmartWakeMonitor } from '@/hooks/use-smart-wake-monitor';
import { AlarmDraftProvider, useAlarmDraft } from '@/lib/alarm-draft-context';
import { getAlarm, getSettings } from '@/lib/db';
import { rescheduleWindDownNotification } from '@/lib/wind-down-scheduling';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    getSettings().then((s) => setHasOnboarded(s.hasOnboarded));
  }, []);

  const ready = fontsLoaded && hasOnboarded !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <AlarmDraftProvider>
        <AppShell initialHasOnboarded={hasOnboarded} />
      </AlarmDraftProvider>
    </SafeAreaProvider>
  );
}

function AppShell({ initialHasOnboarded }: { initialHasOnboarded: boolean }) {
  const router = useRouter();
  const { setDraft } = useAlarmDraft();

  useSmartWakeMonitor();
  useEveningCalendarCheck();

  // Redirect to onboarding on the very first launch, before the native
  // splash screen is hidden (see RootLayout) so Home never flashes first.
  useEffect(() => {
    if (!initialHasOnboarded) {
      router.replace('/onboarding/welcome');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getSettings().then(rescheduleWindDownNotification);
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data as
        | {
            type?: string;
            alarmId?: string;
            suggestedStart?: string;
            suggestedEnd?: string;
          }
        | undefined;

      if (data?.type === 'alarm-deadline' && data.alarmId) {
        router.push({
          pathname: '/ringing',
          params: { alarmId: data.alarmId, triggeredBy: 'hard-deadline' },
        });
        return;
      }

      if (data?.type === 'wind-down') {
        router.push('/wind-down');
        return;
      }

      if (data?.type === 'calendar-nudge' && data.alarmId) {
        const alarm = await getAlarm(data.alarmId);
        if (alarm) {
          setDraft({
            ...alarm,
            windowStart: data.suggestedStart ?? alarm.windowStart,
            windowEnd: data.suggestedEnd ?? alarm.windowEnd,
          });
          router.push('/add-edit');
        }
      }
    });
    return () => sub.remove();
  }, [router, setDraft]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="add-edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="choose-mission" options={{ presentation: 'modal' }} />
      <Stack.Screen name="choose-sound" options={{ presentation: 'modal' }} />
      <Stack.Screen name="test-smart-wake" options={{ presentation: 'modal' }} />
      <Stack.Screen name="wind-down-settings" options={{ presentation: 'modal' }} />
      <Stack.Screen name="wind-down" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="ringing" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
    </Stack>
  );
}
