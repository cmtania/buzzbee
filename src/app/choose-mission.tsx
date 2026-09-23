import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/glass-card';
import { SwipeToDismissSheet } from '@/components/swipe-to-dismiss-sheet';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { Check, Eye } from 'lucide-react-native';
import {
  MISSION_ORDER,
  missionCountLabel,
  missionDescription,
  MissionIcon,
  missionLabel,
} from '@/lib/mission-meta';
import { DismissMethod } from '@/lib/types';

export default function ChooseMissionScreen() {
  const router = useRouter();
  const { draft, setDraft } = useAlarmDraft();

  function select(method: DismissMethod) {
    setDraft((d) => ({ ...d, dismissMethod: method }));
    router.back();
  }

  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()}>
      <SwipeToDismissSheet
        onDismiss={() => router.back()}
        style={styles.sheet}
        // Header-only drag: the body is a ScrollView now that missions are one
        // per row, and a downward drag inside it must scroll, not dismiss.
        header={
          <>
            <View style={styles.handle} />
            <View style={styles.topbar}>
              <Text style={styles.title}>Choose Mission</Text>
              <Text style={styles.subtitle}>Pick one dismiss method for this alarm</Text>
            </View>
          </>
        }>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
            {MISSION_ORDER.map((method) => {
              const selected = draft.dismissMethod === method;
              return (
                <Pressable key={method} onPress={() => select(method)}>
                  <GlassCard style={[styles.card, selected && styles.cardSelected]}>
                    <View style={styles.cardHead}>
                      <View style={styles.iconWrap}>
                        <MissionIcon method={method} size={42} color={Colors.accentDeep} />
                      </View>
                      <View style={styles.headText}>
                        <View style={styles.titleRow}>
                          <Text style={styles.cardTitle}>{missionLabel(method)}</Text>
                          {selected && (
                            <View style={styles.check}>
                              <Check size={13} color={Colors.white} />
                            </View>
                          )}
                        </View>
                        <View style={styles.descRow}>
                          <Text style={styles.cardDesc}>{missionDescription(method)}</Text>
                          <View style={styles.countPill}>
                            <Text style={styles.countPillText}>{missionCountLabel(method)}</Text>
                          </View>
                        </View>

                        {/* Nested inside the card's own Pressable on purpose —
                            RN gives the touch to the innermost responder, so
                            these buttons act on their own without also firing
                            the card's select-and-close. */}
                        <View style={styles.actions}>
                          <Pressable
                            style={[styles.actionBtn, styles.previewBtn]}
                            hitSlop={4}
                            onPress={() =>
                              router.push({
                                pathname: '/ringing',
                                params: { preview: '1', mission: method },
                              })
                            }>
                            <Eye size={19} color={Colors.inkSoft} />
                            <Text style={styles.previewText}>Preview</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.actionBtn, styles.chooseBtn]}
                            hitSlop={4}
                            onPress={() => select(method)}>
                            <Check size={19} color={Colors.ink} />
                            <Text style={styles.chooseText}>
                              {selected ? 'Selected' : 'Choose'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </SwipeToDismissSheet>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,36,32,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  // flexShrink: 1 on both of these is what makes the sheet's maxHeight cap
  // actually bite: RN defaults flexShrink to 0, so without it a body taller
  // than the cap overflows the sheet instead of becoming scrollable.
  safeArea: { flexShrink: 1 },
  scroll: { flexShrink: 1 },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.trackOff,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  topbar: { alignItems: 'center', paddingTop: 4, paddingHorizontal: Spacing.xl },
  title: { fontFamily: Fonts.extraBold, fontSize: 19.5, color: Colors.ink },
  subtitle: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    color: Colors.inkFaint,
    textAlign: 'center',
    marginTop: 2,
  },
  body: { padding: Spacing.xl, gap: 10, paddingBottom: 24 },
  card: {
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 14,
  },
  cardSelected: { borderColor: Colors.accent },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent + '26',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headText: { flex: 1, minWidth: 0, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Description and count share a row, count pinned right and vertically
  // centred against it; the text flexes so a long description wraps rather
  // than pushing the pill off the card.
  descRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF6E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontFamily: Fonts.extraBold, fontSize: 18.5, color: Colors.ink },
  cardDesc: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: 14.5,
    color: Colors.inkSoft,
    lineHeight: 19,
  },
  countPill: {
    flexShrink: 0,
    backgroundColor: Colors.accent + '26',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  countPillText: { fontFamily: Fonts.extraBold, fontSize: 17.5, color: Colors.accentDeep },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 3 },
  // Content-width, not flex: 1 — these sit right-aligned under the text
  // column rather than stretching the full width of the card.
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: Radii.pill,
  },
  previewBtn: { borderWidth: 1.5, borderColor: Colors.trackOff },
  previewText: { fontFamily: Fonts.bold, fontSize: 16.5, color: Colors.inkSoft },
  chooseBtn: { backgroundColor: Colors.accent },
  chooseText: { fontFamily: Fonts.extraBold, fontSize: 16.5, color: Colors.ink },
});
