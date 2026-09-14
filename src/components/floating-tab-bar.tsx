import { useRouter, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HistoryTabIcon, HomeTabIcon, PlusIcon, SettingsTabIcon } from '@/components/icons';
import { Colors, Fonts, Radii, Shadows } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';

const TABS = [
  { path: '/', label: 'Home', Icon: HomeTabIcon },
  { path: '/history', label: 'History', Icon: HistoryTabIcon },
  { path: '/settings', label: 'Settings', Icon: SettingsTabIcon },
] as const;

export function FloatingTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { startDraft } = useAlarmDraft();

  return (
    <View style={[styles.tabbar, { bottom: Math.max(insets.bottom, 10) + 16 }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {TABS.map(({ path, label, Icon }) => {
          const active = pathname === path;
          return (
            <Pressable
              key={path}
              style={styles.tab}
              onPress={() => !active && router.replace(path)}
              hitSlop={8}>
              <Icon size={20} color={active ? Colors.ink : Colors.inkFaint} />
              <Text style={[styles.tabLabel, { color: active ? Colors.ink : Colors.inkFaint }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={styles.addBtn}
        accessibilityLabel="Add alarm"
        onPress={() => {
          startDraft();
          router.push('/add-edit');
        }}>
        <PlusIcon size={26} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pill: {
    flex: 1,
    height: '100%',
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    ...Shadows.floating,
  },
  tab: {
    alignItems: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  addBtn: {
    width: 64,
    height: 64,
    flexShrink: 0,
    borderRadius: Radii.lg,
    backgroundColor: '#FBC873',
    borderWidth: 4,
    borderColor: Colors.accentDeep,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accentDeep,
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
});
