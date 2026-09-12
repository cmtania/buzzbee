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
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { AlarmDraftProvider } from '@/lib/alarm-draft-context';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const router = useRouter();

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { alarmId?: string; type?: string }
        | undefined;
      if (data?.type === 'alarm-deadline' && data.alarmId) {
        router.push({
          pathname: '/ringing',
          params: { alarmId: data.alarmId, triggeredBy: 'hard-deadline' },
        });
      }
    });
    return () => sub.remove();
  }, [router]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: Colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <AlarmDraftProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="choose-mission" options={{ presentation: 'modal' }} />
          <Stack.Screen name="ringing" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        </Stack>
      </AlarmDraftProvider>
    </SafeAreaProvider>
  );
}
