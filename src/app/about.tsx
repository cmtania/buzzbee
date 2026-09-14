import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChevronRight } from '@/components/icons';
import { BeeLogo } from '@/components/bee-logo';
import { SwipeToDismissSheet } from '@/components/swipe-to-dismiss-sheet';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';

const SUPPORT_URL = 'https://cmtania.github.io/buzzbee-docs/support.html';
const PRIVACY_URL = 'https://cmtania.github.io/buzzbee-docs/privacy.html';
const TERMS_URL = 'https://cmtania.github.io/buzzbee-docs/terms.html';

export default function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()}>
      <SwipeToDismissSheet onDismiss={() => router.back()} style={styles.sheet}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={styles.handle} />

          <View style={styles.hero}>
            <BeeLogo size={72} />
            <Text style={styles.wordmark}>BuzzBee</Text>
            <Text style={styles.tagline}>Wakes you at the right moment, not just the loud one.</Text>
            <Text style={styles.version}>Version {version}</Text>
          </View>

          <View style={styles.group}>
            <Row title="Sound credits" sub="Alarm tones sourced from Mixkit — free for commercial use, no attribution required." />
          </View>

          <View style={[styles.group, styles.linkGroup]}>
            <LinkRow title="Support" onPress={() => Linking.openURL(SUPPORT_URL)} />
            <LinkRow title="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
            <LinkRow title="Terms of Service" onPress={() => Linking.openURL(TERMS_URL)} last />
          </View>
        </SafeAreaView>
      </SwipeToDismissSheet>
    </Pressable>
  );
}

function Row({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowSub}>{sub}</Text>
    </View>
  );
}

function LinkRow({ title, onPress, last }: { title: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable style={[styles.linkRow, !last && styles.linkRowDivider]} onPress={onPress}>
      <Text style={styles.linkRowTitle}>{title}</Text>
      <ChevronRight color={Colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,36,32,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '80%',
  },
  safeArea: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.trackOff,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  hero: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 6 },
  wordmark: { fontFamily: Fonts.brand, fontSize: 24, color: Colors.ink, marginTop: 8 },
  tagline: {
    fontFamily: Fonts.semiBold,
    fontSize: 13.5,
    color: Colors.inkSoft,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: Spacing.xl,
  },
  version: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.inkFaint, marginTop: 4 },
  group: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  row: { padding: 14 },
  rowTitle: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.ink },
  rowSub: { fontFamily: Fonts.semiBold, fontSize: 12, color: Colors.inkFaint, marginTop: 3, lineHeight: 16 },
  linkGroup: { marginTop: Spacing.md },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  linkRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.trackOff },
  linkRowTitle: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.ink },
});
