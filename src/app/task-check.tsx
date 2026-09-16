import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable as Pressable } from '@/components/haptic-pressable';

import { CheckIcon, CloseIcon } from '@/components/icons';
import { Colors, Fonts, Radii, Shadows, Spacing } from '@/constants/theme';
import { addTaskEvent } from '@/lib/db';
import { genId } from '@/lib/id';

/**
 * Shown when a Hybrid Alarm task's notification is tapped (see
 * _layout.tsx's notification-response handler) — asks whether the task
 * actually got done and records a TaskEvent either way. If the notification
 * is ignored instead of tapped, this screen never opens and no TaskEvent
 * ever gets written — History treats that missing row as "not completed"
 * too, so there's nothing else this screen needs to do for that case.
 */
export default function TaskCheckScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ alarmId?: string; taskId?: string; label?: string }>();
  const [saving, setSaving] = useState(false);

  async function respond(completed: boolean) {
    if (!params.taskId || !params.alarmId || saving) return;
    setSaving(true);
    await addTaskEvent({
      id: genId('taskevent'),
      taskId: params.taskId,
      alarmId: params.alarmId,
      date: new Date().toISOString().slice(0, 10),
      label: params.label ?? '',
      completed,
      respondedAt: new Date().toISOString(),
    });
    router.back();
  }

  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>BuzzBee</Text>
        <Text style={styles.question}>Did you finish this?</Text>
        <Text style={styles.taskLabel} numberOfLines={2}>
          {params.label || 'Your task'}
        </Text>

        <View style={styles.actions}>
          <Pressable style={styles.noBtn} onPress={() => respond(false)} disabled={saving}>
            <CloseIcon size={16} color={Colors.inkSoft} />
            <Text style={styles.noText}>Not yet</Text>
          </Pressable>
          <Pressable style={styles.yesBtn} onPress={() => respond(true)} disabled={saving}>
            <CheckIcon size={14} color="#2B2420" />
            <Text style={styles.yesText}>Done!</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(43,36,32,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.cardBg,
    borderRadius: Radii.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadows.floating,
  },
  eyebrow: {
    fontFamily: Fonts.extraBold,
    fontSize: 11,
    color: Colors.accentDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  question: { fontFamily: Fonts.extraBold, fontSize: 20, color: Colors.ink, textAlign: 'center' },
  taskLabel: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Colors.inkSoft,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  actions: { flexDirection: 'row', gap: 10, width: '100%' },
  noBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 50,
    borderRadius: Radii.lg,
    backgroundColor: Colors.trackOff,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noText: { fontFamily: Fonts.extraBold, fontSize: 14.5, color: Colors.inkSoft },
  yesBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 50,
    borderRadius: Radii.lg,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesText: { fontFamily: Fonts.extraBold, fontSize: 14.5, color: '#2B2420' },
});
