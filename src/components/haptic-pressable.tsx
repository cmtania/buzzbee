import * as Haptics from 'expo-haptics';
import { forwardRef } from 'react';
import { Pressable, PressableProps } from 'react-native';

import { getSettingsCache } from '@/lib/settings-cache';

/**
 * Drop-in replacement for RN's Pressable that fires a light tap haptic on
 * press-in. Imported as `Pressable` (via `import { HapticPressable as
 * Pressable } ...`) everywhere a real button/row/toggle uses one, so every
 * interactive control in the app gets consistent tactile feedback without
 * touching each individual JSX usage.
 *
 * Respects the global Haptics toggle (Settings → Sound & Haptics) via the
 * synchronous settings cache — this fires on every tap app-wide, so an async
 * settings read here isn't an option. Defaults to on if the cache hasn't
 * loaded yet (matches AppSettings' own default).
 */
export const HapticPressable = forwardRef<
  React.ElementRef<typeof Pressable>,
  PressableProps
>(function HapticPressable({ onPressIn, disabled, ...rest }, ref) {
  return (
    <Pressable
      ref={ref}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled && getSettingsCache()?.hapticsEnabled !== false) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPressIn?.(e);
      }}
      {...rest}
    />
  );
});
