// BuzzBee palette — matches the design mockups (design/*.dc.html).
// Single warm theme; no dark-mode variant designed yet.

import { Platform } from 'react-native';

export const Colors = {
  bg: '#FBF3E4',
  ink: '#2B2420',
  inkSoft: '#6B5D4F',
  // Darkened from the original #9C8C7A: that only hit 2.95:1 contrast against
  // `bg` (fails WCAG AA's 4.5:1 for normal text, even fails Large Text's 3:1)
  // despite being used app-wide for hints/subtitles/timestamps at 11-14.5px.
  // This hits 4.88:1 on `bg` and 5.29:1 on `cardBg` — passes AA on both with
  // margin — while staying in the same warm-brown family as ink/inkSoft.
  inkFaint: '#786853',
  cardBg: '#FFFDF7',
  trackOff: '#EDE2CE',
  accent: '#F5A623',
  accentDeep: '#E8790A',
  white: '#FFFFFF',
  // Darkened from #D64545 (3.97:1 on `bg`, fails AA's 4.5:1) — used as text
  // (record-sound.tsx's error message, delete labels) as well as fills/dots,
  // so it needs to pass as text too. 4.89:1 on `bg`.
  danger: '#C13838',
  // Darkened from #3FAE5A (2.57:1 on `bg`) for the History calendar's
  // completed/missed dots — still reads as "success green" but is now
  // actually visible against the cream background. 4.81:1 on `bg`.
  success: '#297A44',
} as const;

export const Fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
  // Official brand font — used only for the "BuzzBee" wordmark itself, never
  // body copy or other UI text.
  brand: 'DynaPuff_700Bold',
} as const;

export const Radii = {
  sm: 12,
  md: 18,
  lg: 22,
  xl: 32,
  pill: 100,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#2B2420',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  floating: {
    shadowColor: '#2B2420',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 480;
