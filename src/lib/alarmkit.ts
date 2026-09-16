// Thin wrapper around the (patched — see patches/expo-alarm-kit+*.patch)
// expo-alarm-kit native module. AlarmKit is iOS 26+ only and has no Android
// implementation at all, so every entry point here is guarded by
// Platform.OS and uses a lazy require() — a static top-level import would
// crash at module-evaluation time on Android/web, before any of these
// functions are ever called.
import { Platform } from 'react-native';

import { endOfDay, isoMatchesTime, nextOccurrence } from './alarm-utils';
import {
  getAlarmKitId,
  getConfirmAlarmKitId,
  getWakeEventToday,
  setAlarmKitId,
  setConfirmAlarmKitId,
} from './db';
import { isSoundName, NOTIFICATION_SOUND_FILES } from './sounds';
import { Alarm } from './types';

// AlarmKit's soundName docs say "must exist in app bundle" — reusing the
// same PCM .wav files already bundled for the notification fallback (see
// sounds.ts's doc comment) rather than the in-app .mp3s, since those are
// already proven to land in the native bundle via expo-notifications'
// config plugin and AlarmKit's requirements (PCM, ≤30s) match.
function alarmKitSoundName(sound: string): string | undefined {
  return isSoundName(sound) ? NOTIFICATION_SOUND_FILES[sound] : undefined;
}

const APP_GROUP_ID = 'group.com.cmtania.buzzbeealarm';

type AlarmKitModule = typeof import('expo-alarm-kit');

let cached: AlarmKitModule | null = null;
let configured = false;

function loadModule(): AlarmKitModule | null {
  if (Platform.OS !== 'ios') return null;
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-alarm-kit') as AlarmKitModule;
  }
  return cached;
}

/** Call once at app startup, before any other AlarmKit function. */
export function configureAlarmKit(): void {
  const mod = loadModule();
  if (!mod) return;
  configured = mod.configure(APP_GROUP_ID);
  if (!configured) {
    console.warn('[AlarmKit] Failed to configure App Group — check the entitlement setup.');
  }
}

export async function ensureAlarmKitAuthorization(): Promise<boolean> {
  const mod = loadModule();
  if (!mod || !configured) return false;
  const status = await mod.requestAuthorization();
  return status === 'authorized';
}

// AlarmKit's own weekday numbering (1=Sunday..7=Saturday) is offset by one
// from JS Date#getDay() (0=Sunday..6=Saturday), which is what Alarm.repeatDays
// already stores.
function toAlarmKitWeekdays(repeatDays: number[]): number[] {
  return repeatDays.map((d) => d + 1);
}

/**
 * Schedules (or reschedules) this alarm through AlarmKit, so it still rings —
 * and launches BuzzBee straight to the mission screen — even if the app has
 * been fully force-quit. A Wake Window alarm (smartWakeEnabled) is scheduled
 * at windowStart, not windowEnd: it's meant to start ringing gently the
 * moment the window opens and escalate to full volume by windowEnd via
 * ringing.tsx's own timer once launched, so AlarmKit only needs to fire once,
 * at the start. A fixed-time alarm is scheduled at windowEnd as before. This
 * is a safety net alongside the JS wake-window monitor, not a replacement for
 * it: while the app is alive, that monitor firing first should cancel the
 * pending AlarmKit alarm via cancelAlarmKitAlarm() so the OS alert doesn't
 * also fire later.
 */
export async function scheduleAlarmKitAlarm(alarm: Alarm): Promise<void> {
  const mod = loadModule();
  if (!mod || !configured) return;
  await cancelAlarmKitAlarm(alarm.id);
  if (!alarm.enabled) return;

  const authorized = await ensureAlarmKitAuthorization();
  if (!authorized) return;

  let alarmKitId = await getAlarmKitId(alarm.id);
  if (!alarmKitId) {
    alarmKitId = mod.generateUUID();
    await setAlarmKitId(alarm.id, alarmKitId);
  }

  const triggerTime = alarm.smartWakeEnabled ? alarm.windowStart : alarm.windowEnd;
  const [hour, minute] = triggerTime.split(':').map(Number);
  const shared = {
    id: alarmKitId,
    title: 'BuzzBee — time to wake up',
    soundName: alarmKitSoundName(alarm.sound),
    launchAppOnDismiss: true,
    dismissPayload: alarm.id,
  };

  // If this alarm already rang and was dismissed today *at this same
  // trigger time*, don't let a no-op re-save (e.g. opening it from Home
  // right after dismissing and tapping Update without changing anything)
  // re-arm a second ring later this same day — skip straight to the next
  // valid occurrence instead. Deliberately changing the time to something
  // later today is still honored, since that no longer matches what was
  // already dismissed. Today's weekday drops out of the *native*
  // registration only, not alarm.repeatDays itself, so it comes back
  // automatically once this alarm is next (re)scheduled after today.
  const todayEvent = await getWakeEventToday(alarm.id);
  const alreadyRangAtThisTime = !!todayEvent && isoMatchesTime(todayEvent.scheduledDeadline, triggerTime);
  const todayWeekday = new Date().getDay();
  const nativeWeekdays = alreadyRangAtThisTime
    ? alarm.repeatDays.filter((d) => d !== todayWeekday)
    : alarm.repeatDays;

  if (alarm.repeatDays.length > 0 && nativeWeekdays.length === 0) {
    // Only weekday left was today, already handled at this time — nothing
    // to arm until this alarm is next saved/toggled.
    return;
  }

  const ok =
    alarm.repeatDays.length > 0
      ? await mod.scheduleRepeatingAlarm({
          ...shared,
          hour,
          minute,
          weekdays: toAlarmKitWeekdays(nativeWeekdays),
        })
      : await mod.scheduleAlarm({
          ...shared,
          date: nextOccurrence(
            triggerTime,
            alarm.repeatDays,
            alreadyRangAtThisTime ? endOfDay(new Date()) : undefined
          ),
        });

  if (!ok) {
    console.warn(`[AlarmKit] Failed to schedule alarm ${alarm.id} — falling back to notification only.`);
  }
}

export async function cancelAlarmKitAlarm(alarmId: string): Promise<void> {
  const mod = loadModule();
  if (!mod || !configured) return;
  const alarmKitId = await getAlarmKitId(alarmId);
  if (alarmKitId) {
    await mod.cancelAlarm(alarmKitId).catch(() => {});
  }
}

/** Reset Data (Settings) — wipes every AlarmKit registration in one native
 * call, rather than looping cancelAlarmKitAlarm per alarm, so nothing is
 * left behind even for an alarm whose DB row is about to be deleted anyway. */
export function clearAllAlarmKitAlarms(): void {
  const mod = loadModule();
  if (!mod || !configured) return;
  mod.clearAllAlarms();
}

/**
 * Checks whether the app was just launched by tapping an AlarmKit alert's
 * Stop button. Returns the internal Alarm.id (passed through as
 * dismissPayload when scheduling) or null. Consumes the payload — a second
 * call in the same launch returns null.
 *
 * Hybrid Alarm follow-up tasks never go through AlarmKit (see
 * hybrid-tasks.ts) — they're plain local notifications only, so there's no
 * task-launch case to handle here.
 */
export function checkAlarmKitLaunch(): string | null {
  const mod = loadModule();
  if (!mod) return null;
  return mod.getLaunchPayload()?.payload ?? null;
}

/**
 * Arms a one-shot AlarmKit safety-net alarm, `delaySeconds` from now, that
 * re-rings (and relaunches straight back into the mission via the same
 * dismissPayload) if it's never disarmed first. Tapping AlarmKit's Stop
 * button only stops *that* alert and launches the app — it doesn't mean the
 * mission was actually completed, so without this, force-quitting mid-
 * mission would silence the alarm for good with zero safety net. Call this
 * once the Ringing screen has a loaded alarm, and disarmConfirmationAlarm()
 * the moment the mission is genuinely completed (see ringing.tsx's dismiss()).
 *
 * Deliberately uses the plain (patched, stop-only) scheduleAlarm rather than
 * scheduleTimerAlarm: the timer variant's pending countdown UI always ships
 * with a native Pause button with no way to omit it (the same unconditional-
 * secondary-button bug this dependency had for the main alert, just not yet
 * patched for the timer path) — a user could pause the safety-net timer from
 * the Lock Screen/Dynamic Island and never finish the mission, defeating the
 * whole point.
 */
export async function armConfirmationAlarm(alarm: Alarm, delaySeconds: number): Promise<void> {
  const mod = loadModule();
  if (!mod || !configured) return;
  await disarmConfirmationAlarm(alarm.id);

  const authorized = await ensureAlarmKitAuthorization();
  if (!authorized) return;

  const confirmAlarmKitId = mod.generateUUID();
  await setConfirmAlarmKitId(alarm.id, confirmAlarmKitId);

  const ok = await mod.scheduleAlarm({
    id: confirmAlarmKitId,
    date: new Date(Date.now() + delaySeconds * 1000),
    title: "BuzzBee — you're not up yet!",
    soundName: alarmKitSoundName(alarm.sound),
    launchAppOnDismiss: true,
    dismissPayload: alarm.id,
  });

  if (!ok) {
    console.warn(`[AlarmKit] Failed to arm confirmation alarm for ${alarm.id}.`);
  }
}

export async function disarmConfirmationAlarm(alarmId: string): Promise<void> {
  const mod = loadModule();
  if (!mod || !configured) return;
  const confirmAlarmKitId = await getConfirmAlarmKitId(alarmId);
  if (confirmAlarmKitId) {
    await mod.cancelAlarm(confirmAlarmKitId).catch(() => {});
    await setConfirmAlarmKitId(alarmId, null);
  }
}
