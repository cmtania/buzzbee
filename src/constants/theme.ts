// BuzzBee palette — matches the design mockups (design/*.dc.html).
// Single warm theme; no dark-mode variant designed yet.

import { Platform } from 'react-native';

export const Colors = {
  bg: '#FBF3E4',
  ink: '#2B2420',
  inkSoft: '#6B5D4F',
  inkFaint: '#9C8C7A',
  cardBg: '#FFFDF7',
  trackOff: '#EDE2CE',
  accent: '#F5A623',
  accentDeep: '#E8790A',
  white: '#FFFFFF',
  danger: '#D64545',
  success: '#3FAE5A',
} as const;

export const Fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
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
