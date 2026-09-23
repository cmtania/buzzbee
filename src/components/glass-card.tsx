import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';

import { Colors, Shadows } from '@/constants/theme';

// Checked once per app session, not per render — the underlying native/API
// availability can't change while the app is running. Expo's own docs call
// this out as the crash-safety gate to check before ever touching GlassView/
// GlassContainer: some iOS 26 beta versions shipped without the underlying
// UIGlassEffect API, and calling into it there crashes
// (https://github.com/expo/expo/issues/40911). It also hard-returns false on
// Android, since expo-glass-effect is iOS-only.
const GLASS_AVAILABLE = isGlassEffectAPIAvailable();

type GlassCardProps = {
  /** Omit for a purely decorative glass backdrop (e.g. the nav bar's active-
   * tab pill), which renders no content of its own. */
  children?: ReactNode;
  /** Shape/layout only — borderRadius, padding, flexDirection, gap, etc.
   * Don't put backgroundColor or overflow here: GlassCard owns those itself,
   * differently per branch (see the two render paths below). */
  style?: StyleProp<ViewStyle>;
  /** Defaults to the standard card shadow; the floating nav bar/button pass
   * Shadows.floating instead so they keep their heavier lift. */
  shadow?: object;
  /** Apple's native touch-reactive glass — the highlight/ripple that follows
   * a finger and springs on release, real UIGlassEffect behavior, not a
   * manual animation. Only meaningful for a tappable glass element (the nav
   * bar's pill and its "+" button); off by default since a passive card like
   * the hero shouldn't visually react to touches it doesn't handle. No-op on
   * the flat fallback branch — there's no native effect to be interactive. */
  isInteractive?: boolean;
};

/**
 * A card that renders as real Apple Liquid Glass on iOS 26+ (via
 * expo-glass-effect's GlassView — a genuine UIVisualEffectView, not a manual
 * blur simulation), falling back to today's flat card look everywhere else
 * (Android, or the rare iOS beta gap GLASS_AVAILABLE guards against).
 * Untinted on purpose — no colored backdrop behind it — so it reads as
 * actual glass over whatever's underneath, not a colored panel with a blur
 * applied on top.
 */
export function GlassCard({ children, style, shadow = Shadows.card, isInteractive = false }: GlassCardProps) {
  if (GLASS_AVAILABLE) {
    return (
      <GlassView
        style={[style, shadow]}
        glassEffectStyle="regular"
        colorScheme="light"
        isInteractive={isInteractive}>
        {children}
      </GlassView>
    );
  }

  return <View style={[style, styles.flatCard, shadow]}>{children}</View>;
}

const styles = StyleSheet.create({
  flatCard: {
    backgroundColor: Colors.cardBg,
    overflow: 'hidden',
  },
});
