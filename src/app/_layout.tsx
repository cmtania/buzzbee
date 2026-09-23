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
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CreateAlarmButton } from '@/components/create-alarm-button';
import { Colors } from '@/constants/theme';
import { useBackgroundKeepAlive } from '@/hooks/use-background-keep-alive';
import { useEveningCalendarCheck } from '@/hooks/use-evening-calendar-check';
import { useWakeWindowMonitor } from '@/hooks/use-wake-window-monitor';
import { AlarmDraftProvider, useAlarmDraft } from '@/lib/alarm-draft-context';
import {
  armConfirmationAlarm,
  checkAlarmKitLaunch,
  configureAlarmKit,
  CONFIRMATION_ALARM_DELAY_SEC,
} from '@/lib/alarmkit';
import { isoMatchesTime } from '@/lib/alarm-utils';
import { getAlarm, getSettings, getWakeEventToday } from '@/lib/db';
import { dedupKey, markTriggeredToday } from '@/lib/ring-dedup';
import { rescheduleWindDownNotification } from '@/lib/wind-down-scheduling';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureAlarmKit();

type PendingAlarmLaunch = { alarmId: string; triggeredBy: 'window-start' | 'hard-deadline' };

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
  const [alarmLaunchChecked, setAlarmLaunchChecked] = useState(false);
  const [pendingAlarmLaunch, setPendingAlarmLaunch] = useState<PendingAlarmLaunch | null>(null);

  useEffect(() => {
    getSettings().then((s) => setHasOnboarded(s.hasOnboarded));
  }, []);

  // Resolve a pending AlarmKit cold-launch up front, before the splash
  // screen ever hides — this used to happen in an effect inside AppShell,
  // *after* Home had already rendered and the splash had already hidden.
  // That both flashed Home before Ringing and, worse, left the anti-cheat
  // safety net (armConfirmationAlarm) unarmed for however long that took:
  // tapping AlarmKit's native Stop control during that window silenced the
  // alarm for good with no backstop, since arming it used to wait for the
  // Ringing screen to mount. Arming it here instead closes that gap down to
  // just this synchronous check + one DB read, however long Home would have
  // taken to render is no longer part of the window at all.
  useEffect(() => {
    (async () => {
      const alarmId = checkAlarmKitLaunch();
      if (!alarmId) {
        setAlarmLaunchChecked(true);
        return;
      }
      const alarm = await getAlarm(alarmId);
      if (alarm) {
        // Mark this alarm as already-rung *before* navigating —
        // useWakeWindowMonitor shares this same dedup set (lib/ring-dedup.ts)
        // and starts ticking fresh on every cold launch, with no idea
        // AlarmKit already handled this alarm. Without marking it here, its
        // next 5s tick sees the same overdue deadline and pushes a second,
        // duplicate /ringing screen.
        markTriggeredToday(dedupKey(alarm.id));
        armConfirmationAlarm(alarm, CONFIRMATION_ALARM_DELAY_SEC).catch(() => {});
      }
      setPendingAlarmLaunch({
        alarmId,
        triggeredBy: alarm?.smartWakeEnabled ? 'window-start' : 'hard-deadline',
      });
      setAlarmLaunchChecked(true);
    })();
  }, []);

  const ready = fontsLoaded && hasOnboarded !== null && alarmLaunchChecked;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AlarmDraftProvider>
          <AppShell initialHasOnboarded={hasOnboarded} pendingAlarmLaunch={pendingAlarmLaunch} />
        </AlarmDraftProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell({
  initialHasOnboarded,
  pendingAlarmLaunch,
}: {
  initialHasOnboarded: boolean;
  pendingAlarmLaunch: PendingAlarmLaunch | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { setDraft } = useAlarmDraft();

  useWakeWindowMonitor();
  useEveningCalendarCheck();
  useBackgroundKeepAlive();

  // Redirect to onboarding, or straight into a pending AlarmKit launch (see
  // RootLayout, which already resolved and armed it), before the native
  // splash screen is hidden so Home never flashes first.
  useEffect(() => {
    if (!initialHasOnboarded) {
      router.replace('/onboarding/welcome');
    } else if (pendingAlarmLaunch) {
      router.replace({ pathname: '/ringing', params: pendingAlarmLaunch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getSettings().then(rescheduleWindDownNotification);
  }, []);

  useEffect(() => {
    async function handleNotificationResponse(response: Notifications.NotificationResponse) {
      const data = response.notification.request.content.data as
        | {
            type?: string;
            alarmId?: string;
            triggeredBy?: string;
            suggestedStart?: string;
            suggestedEnd?: string;
          }
        | undefined;

      if (data?.type === 'alarm-deadline' && data.alarmId) {
        // This backup notification is scheduled for the exact same moment as
        // AlarmKit's own native alert (see scheduling.ts's
        // scheduleAlarmNotification) as a defense-in-depth fallback in case
        // AlarmKit ever fails — but nothing cancels an already-*delivered*
        // notification when the alarm is genuinely dismissed through the
        // AlarmKit path instead (cancelAlarmNotification only cancels a still
        // *scheduled* one). That leaves this one sitting in Notification
        // Center even after a real dismissal, tappable hours later and,
        // without this check, unconditionally re-opening the mission for an
        // alarm already handled today. Same WakeEvent guard as
        // useWakeWindowMonitor's tick — an alarm that rang and was genuinely
        // *ignored* has no WakeEvent, so tapping this notification still
        // works normally for that case.
        const alarm = await getAlarm(data.alarmId);
        const todayEvent = alarm ? await getWakeEventToday(alarm.id) : null;
        const alreadyHandled =
          !!alarm && !!todayEvent && isoMatchesTime(todayEvent.scheduledDeadline, alarm.windowEnd);
        if (!alreadyHandled) {
          router.push({
            pathname: '/ringing',
            params: {
              alarmId: data.alarmId,
              triggeredBy: data.triggeredBy === 'window-start' ? 'window-start' : 'hard-deadline',
            },
          });
        }
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

  // NativeTabs (see (tabs)/_layout.tsx) sizes each tab screen's own content
  // frame to stop above the native tab bar — an absolutely-positioned button
  // rendered *inside* one of those screens can never reach down into the tab
  // bar's own row, no matter its `bottom` offset, since it's boxed into the
  // wrong coordinate space. Rendered here instead, as a sibling of the whole
  // Stack, it's positioned against the true screen bounds. Only shown on the
  // three tab routes — everywhere else (onboarding, modals, ringing) has no
  // "create" affordance to float here.
  const showCreateButton = pathname === '/' || pathname === '/history' || pathname === '/settings';

  return (
    <View style={{ flex: 1 }}>
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
        <Stack.Screen name="wind-down" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="ringing" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen
          name="mission-complete"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
      </Stack>
      {showCreateButton && <CreateAlarmButton />}
    </View>
  );
}
