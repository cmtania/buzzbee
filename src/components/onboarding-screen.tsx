import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowRight, BackArrow } from '@/components/icons';
import { Fonts, Radii, Spacing } from '@/constants/theme';

export const ONBOARDING_TOTAL_STEPS = 8;

const BG = '#F2F3F4';
const INK = '#2B2420';
const INK_FAINT = '#9C8C7A';
const TRACK_OFF = '#E3E5E7';
const ACCENT = '#F5A623';

export function OnboardingScreen({
  step,
  title,
  subtitle,
  children,
  continueLabel = 'Continue',
  onContinue,
  continueDisabled,
  onBack,
  scroll = true,
}: {
  step: number;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  continueLabel?: string;
  onContinue: () => void;
  continueDisabled?: boolean;
  onBack?: () => void;
  scroll?: boolean;
}) {
  const router = useRouter();
  const pct = Math.round((step / ONBOARDING_TOTAL_STEPS) * 100);
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll ? { contentContainerStyle: styles.body } : { style: styles.body };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topRow}>
          <Pressable style={styles.backBtn} onPress={onBack ?? (() => router.back())} hitSlop={8}>
            <BackArrow />
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </View>

        <Body {...bodyProps}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {children}
        </Body>

        <View style={styles.footer}>
          <Pressable
            style={[styles.continueBtn, continueDisabled && styles.continueBtnDisabled]}
            onPress={onContinue}
            disabled={continueDisabled}>
            <Text style={styles.continueLabel}>{continueLabel}</Text>
            <View style={styles.arrow}>
              <ArrowRight size={18} color={INK} />
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  topRow: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFDF7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: INK,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  progressTrack: { flex: 1, height: 6, backgroundColor: TRACK_OFF, borderRadius: 100, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 100 },
  body: { padding: Spacing.xxl, paddingBottom: 40, flexGrow: 1 },
  title: { fontFamily: Fonts.extraBold, fontSize: 25, color: INK, marginBottom: 10, lineHeight: 32 },
  subtitle: { fontFamily: Fonts.semiBold, fontSize: 13.5, color: INK_FAINT, marginBottom: 22, lineHeight: 20 },
  footer: { padding: Spacing.xl, paddingTop: 0 },
  continueBtn: {
    height: 54,
    borderRadius: Radii.lg,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: ACCENT,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  continueBtnDisabled: { opacity: 0.45 },
  continueLabel: { fontFamily: Fonts.extraBold, fontSize: 16, color: INK },
  arrow: { position: 'absolute', right: 18 },
});
