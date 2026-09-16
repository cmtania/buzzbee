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
import { useWakeWindowMonitor } from '@/hooks/use-wake-window-monitor';
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

  useWakeWindowMonitor();
  useEveningCalendarCheck();
  useBackgroundKeepAlive();

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
  // Hybrid Alarm follow-up tasks never go through AlarmKit (see
  // hybrid-tasks.ts) — they're plain notifications, so there's no
  // task-launch case to handle here.
  useEffect(() => {
    const alarmId = checkAlarmKitLaunch();
    if (!alarmId) return;
    (async () => {
      const alarm = await getAlarm(alarmId);
      // Mark this alarm as already-rung *before* navigating — useWakeWindowMonitor
      // shares this same dedup set (lib/ring-dedup.ts) and starts ticking
      // fresh on every cold launch, with no idea AlarmKit already handled
      // this alarm. Without marking it here, its next 5s tick sees the same
      // overdue deadline and pushes a second, duplicate /ringing screen.
      if (alarm) markTriggeredToday(dedupKey(alarm.id));
      router.push({
        pathname: '/ringing',
        params: {
          alarmId,
          triggeredBy: alarm?.smartWakeEnabled ? 'window-start' : 'hard-deadline',
        },
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function handleNotificationResponse(response: Notifications.NotificationResponse) {
      const data = response.notification.request.content.data as
        | {
            type?: string;
            alarmId?: string;
            taskId?: string;
            label?: string;
            triggeredBy?: string;
            suggestedStart?: string;
            suggestedEnd?: string;
          }
        | undefined;

      if (data?.type === 'alarm-deadline' && data.alarmId) {
        router.push({
          pathname: '/ringing',
          params: {
            alarmId: data.alarmId,
            triggeredBy: data.triggeredBy === 'window-start' ? 'window-start' : 'hard-deadline',
          },
        });
        return;
      }

      // A Hybrid Alarm follow-up task's notification (see hybrid-tasks.ts) —
      // ask whether it actually got done. Ignoring the notification instead
      // of tapping it never reaches here at all, so no TaskEvent ever gets
      // written for it — task-check.tsx's own doc comment covers why that's
      // fine (History reads a missing row as "not completed").
      if (data?.type === 'task-reminder' && data.alarmId && data.taskId) {
        router.push({
          pathname: '/task-check',
          params: { alarmId: data.alarmId, taskId: data.taskId, label: data.label ?? '' },
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
    }

    // addNotificationResponseReceivedListener only fires for a tap that
    // happens while this listener is already registered — it never sees the
    // tap that cold-launched the app in the first place (e.g. tapping a
    // Bedtime Reminder notification after the app had been fully closed all
    // day, which is the common case for an evening notification, not an
    // edge case). getLastNotificationResponseAsync() catches exactly that
    // one response on startup; consumed once so a later live tap during this
    // same session isn't replayed.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      // Consume it — otherwise this same response keeps coming back from
      // every future call (Fast Refresh, or any remount of this layout
      // during the session), re-triggering its navigation each time.
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
      handleNotificationResponse(response);
    });

    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
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
      <Stack.Screen name="wind-down-settings" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="notifications-settings" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="sound-haptics-settings" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="about" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="task-check" options={{ presentation: 'transparentModal' }} />
      <Stack.Screen name="wind-down" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="ringing" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen
        name="mission-complete"
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
    </Stack>
  );
}
