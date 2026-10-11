import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeToDismissSheet } from '@/components/swipe-to-dismiss-sheet';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { isCalibrated, MicMission, resetCalibration } from '@/lib/mic-calibration';
import { MissionIcon } from '@/lib/mission-meta';
import { ChevronRight } from 'lucide-react-native';

/** Settings → Calibrate: teach the Clap and Buzz missions the user's own sound. */
export default function CalibrateSettingsScreen() {
  const router = useRouter();
  const [calibrated, setCalibrated] = useState<Record<MicMission, boolean>>({ clap: false, buzz: false });

  useFocusEffect(
    useCallback(() => {
      // Re-read on focus: coming back from the Calibrate screen updates it.
      isCalibrated().then(setCalibrated);
    }, [])
  );

  function confirmReset(mission: MicMission) {
    Alert.alert('Reset calibration?', 'This mission will go back to the default sensitivity.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await resetCalibration(mission);
          setCalibrated(await isCalibrated());
        },
      },
    ]);
  }

  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()}>
      <SwipeToDismissSheet
        onDismiss={() => router.back()}
        style={styles.sheet}
        header={
          <>
            <View style={styles.handle} />
            <Text style={styles.title}>Calibrate</Text>
          </>
        }>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
            <View>
              <Text style={styles.sectionLabel}>Clap & Buzz Detection</Text>
              <Text style={styles.sectionHint}>
                Missions not hearing you, or counting room noise? Calibrate once and they’ll listen for your own clap and
                buzz, and ignore other sounds. Analysed on your phone — nothing is recorded.
              </Text>
              {(['clap', 'buzz'] as const).map((mission) => (
                <Pressable
                  key={mission}
                  style={styles.calibrateRow}
                  onPress={() => router.push({ pathname: '/calibrate', params: { mission } })}
                  onLongPress={() => calibrated[mission] && confirmReset(mission)}>
                  <View style={styles.iconWrap}>
                    <MissionIcon method={mission} size={18.5} color={Colors.accentDeep} />
                  </View>
                  <View style={styles.calibrateMain}>
                    <Text style={styles.rowLabel}>{mission === 'clap' ? 'Calibrate Clap' : 'Calibrate Buzz'}</Text>
                    <Text style={styles.calibrateStatus}>
                      {calibrated[mission] ? 'Calibrated to you · hold to reset' : 'Using default sensitivity'}
                    </Text>
                  </View>
                  <ChevronRight size={17.5} color={Colors.inkFaint} />
                </Pressable>
              ))}
            </View>
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
  // flexShrink: 1 lets the sheet's maxHeight cap the content on small screens.
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
  title: { fontFamily: Fonts.extraBold, fontSize: 19.5, color: Colors.ink, textAlign: 'center' },
  body: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xl },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    color: Colors.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 14,
    color: Colors.inkFaint,
    marginBottom: 12,
    lineHeight: 16,
    fontFamily: Fonts.medium,
  },
  calibrateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.lg,
    padding: 14,
    marginTop: 10,
    ...Shadows.card,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accent + '1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calibrateMain: { flex: 1, minWidth: 0 },
  rowLabel: { fontFamily: Fonts.bold, fontSize: 17.5, color: Colors.ink },
  calibrateStatus: { fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.inkFaint, marginTop: 2 },
});
