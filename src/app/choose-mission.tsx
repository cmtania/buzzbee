import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon, CloseIcon } from '@/components/icons';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
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
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={styles.topbar}>
            <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={8}>
              <CloseIcon size={15} color={Colors.inkSoft} />
            </Pressable>
            <Text style={styles.title}>Choose Mission</Text>
          </View>
          <Text style={styles.subtitle}>Pick one dismiss method for this alarm</Text>

          <View style={styles.grid}>
            {MISSION_ORDER.map((method) => {
              const selected = draft.dismissMethod === method;
              return (
                <Pressable
                  key={method}
                  style={[styles.card, selected && styles.cardSelected]}
                  onPress={() => select(method)}>
                  {selected && (
                    <View style={styles.check}>
                      <CheckIcon size={11} />
                    </View>
                  )}
                  <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
                    <MissionIcon method={method} size={24} color={Colors.accentDeep} />
                  </View>
                  <Text style={styles.cardTitle}>{missionLabel(method)}</Text>
                  <Text style={styles.cardDesc}>{missionDescription(method)}</Text>
                  <View style={[styles.countPill, selected && styles.countPillSelected]}>
                    <Text style={styles.countPillText}>{missionCountLabel(method)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,36,32,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '88%',
  },
  safeArea: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  topbar: { alignItems: 'center', justifyContent: 'center', paddingTop: 14, paddingBottom: 2 },
  closeBtn: {
    position: 'absolute',
    left: 0,
    top: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  title: { fontFamily: Fonts.extraBold, fontSize: 17, color: Colors.ink },
  subtitle: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: Colors.inkFaint,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  card: {
    width: '47%',
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 16,
    alignItems: 'center',
    gap: 6,
    ...Shadows.card,
  },
  cardSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent + '1a' },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF6E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.accent + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: { backgroundColor: '#fff' },
  cardTitle: { fontFamily: Fonts.extraBold, fontSize: 14.5, color: Colors.ink, textAlign: 'center' },
  cardDesc: {
    fontFamily: Fonts.semiBold,
    fontSize: 11.5,
    color: Colors.inkSoft,
    textAlign: 'center',
    lineHeight: 15,
    minHeight: 30,
  },
  countPill: {
    marginTop: 2,
    backgroundColor: Colors.accent + '26',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  countPillSelected: { backgroundColor: '#fff' },
  countPillText: { fontFamily: Fonts.extraBold, fontSize: 14, color: Colors.accentDeep },
});
