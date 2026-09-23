import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

// The OS's real native tab bar (genuine Liquid Glass on iOS 26+, drawn by
// the system itself — no expo-glass-effect/GlassCard needed here) rather
// than the previous hand-rolled floating pill. The "+" create button can't
// live in here: a NativeTabs.Trigger can only navigate to one of this
// layout's own routes, it can't open add-edit as a modal — so it stays a
// separate floating overlay each tab screen renders itself (see
// create-alarm-button.tsx), same pattern as before.
export default function TabsLayout() {
  return (
    <NativeTabs tintColor={Colors.accentDeep}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
