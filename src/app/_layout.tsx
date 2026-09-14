import { DynaPuff_700Bold } from '@expo-google-fonts/dynapuff';
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
import { useBackgroundKeepAlive } from '@/hooks/use-background-keep-alive';
import { useEveningCalendarCheck } from '@/hooks/use-evening-calendar-check';
import { useLivenessHeartbeat } from '@/hooks/use-liveness-heartbeat';
import { useSmartWakeMonitor } from '@/hooks/use-smart-wake-monitor';
import { AlarmDraftProvider, useAlarmDraft } from '@/lib/alarm-draft-context';
import { checkAlarmKitLaunch, configureAlarmKit } from '@/lib/alarmkit';
import { getAlarm, getSettings } from '@/lib/db';
import { dedupKey, markTriggeredToday } from '@/lib/ring-dedup';
import { rescheduleWindDownNotification } from '@/lib/wind-down-scheduling';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureAlarmKit();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    DynaPuff_700Bold,
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
  useBackgroundKeepAlive();
  useLivenessHeartbeat();

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

  // If the app was just launched by tapping Stop on an AlarmKit alert (the
  // app was previously force-quit — AlarmKit is what lets the alarm still
  // ring and this launch happen at all), go straight to the mission screen.
  useEffect(() => {
    const alarmId = checkAlarmKitLaunch();
    if (!alarmId) return;
    (async () => {
      const alarm = await getAlarm(alarmId);
      // Mark this alarm as already-rung *before* navigating — useSmartWakeMonitor
      // shares this same dedup set (lib/ring-dedup.ts) and starts ticking
      // fresh on every cold launch, with no idea AlarmKit already handled
      // this alarm. Without marking it here, its next 5s tick sees the same
      // overdue deadline and pushes a second, duplicate /ringing screen.
      if (alarm) markTriggeredToday(dedupKey(alarm.id));
      router.push({
        pathname: '/ringing',
        params: { alarmId, triggeredBy: 'hard-deadline' },
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      if (data?.type === 'app-closed-warning') {
        // Just reopening the app is the actual fix here — useLivenessHeartbeat
        // and useSmartWakeMonitor (both mounted in AppShell) resume the
        // moment the app is alive again. Landing on Home just gives the tap
        // a sensible destination rather than leaving router state wherever
        // it was before the app was killed.
        router.push('/');
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
      <Stack.Screen name="add-edit" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="choose-mission" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="choose-sound" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="record-sound" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="test-smart-wake" options={{ presentation: 'modal' }} />
      <Stack.Screen name="wind-down-settings" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="notifications-settings" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="sound-haptics-settings" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="about" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="wind-down" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="ringing" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen
        name="mission-complete"
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
    </Stack>
  );
}
