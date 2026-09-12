import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from '@/components/icons';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { Fonts, Radii } from '@/constants/theme';
import { useAlarmDraft } from '@/lib/alarm-draft-context';
import { MISSION_ORDER, MissionIcon, missionLabel, missionSubtitle } from '@/lib/mission-meta';
import { DismissMethod } from '@/lib/types';

const INK = '#2B2420';
const INK_FAINT = '#9C8C7A';
const CARD_BG = '#FFFDF7';
const TRACK_OFF = '#E3E5E7';
const ACCENT = '#F5A623';

export default function MissionScreen() {
  const router = useRouter();
  const { draft, setDraft } = useAlarmDraft();

  function select(method: DismissMethod) {
    setDraft((d) => ({ ...d, dismissMethod: method }));
  }

  return (
    <OnboardingScreen
      step={7}
      title="Choose your dismiss method"
      scroll={false}
      onContinue={() => router.push('/onboarding/ringer-check')}>
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
                <MissionIcon method={method} size={22} color="#E8790A" />
              </View>
              <Text style={styles.cardTitle}>{missionLabel(method)}</Text>
              <Text style={styles.cardSub}>{missionSubtitle(method)}</Text>
            </Pressable>
          );
        })}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  card: {
    width: '47%',
    backgroundColor: CARD_BG,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderColor: TRACK_OFF,
    padding: 14,
    alignItems: 'center',
    gap: 5,
  },
  cardSelected: { borderColor: ACCENT, backgroundColor: ACCENT + '1a' },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3FAE5A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: ACCENT + '26',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  cardTitle: { fontFamily: Fonts.bold, fontSize: 14, color: INK, textAlign: 'center' },
  cardSub: { fontFamily: Fonts.semiBold, fontSize: 10.5, color: INK_FAINT, textAlign: 'center' },
});
