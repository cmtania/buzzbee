import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/icons';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { MISSION_ORDER, MissionIcon, missionLabel, missionSubtitle } from '@/lib/mission-meta';
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
          <View style={styles.handle} />
          <Text style={styles.title}>Choose a Mission</Text>
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
                  <View style={styles.iconWrap}>
                    <MissionIcon method={method} size={24} color={Colors.accentDeep} />
                  </View>
                  <Text style={styles.cardTitle}>{missionLabel(method)}</Text>
                  <Text style={styles.cardSub}>{missionSubtitle(method)}</Text>
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
    maxHeight: '85%',
  },
  safeArea: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.trackOff,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 19,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 18,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  card: {
    width: '47%',
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderColor: Colors.trackOff,
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
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.accent + '26',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: { fontFamily: Fonts.bold, fontSize: 14.5, color: Colors.ink, textAlign: 'center' },
  cardSub: { fontFamily: Fonts.semiBold, fontSize: 11, color: Colors.inkFaint, textAlign: 'center' },
});
