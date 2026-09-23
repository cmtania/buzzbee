# BuzzBee for Android — Build Plan

**Status:** not started. Written 2026-09-23, before the iOS App Store
release. Nothing in this file has been built or tested.

**How to use this file:** point a fresh session at it. It is meant to be
read cold, without the iOS repo's history in context. It currently lives in
the iOS repo (`z:\Git\buzzbee-alarm\ANDROID-PLAN.md`) only because the
Android repo does not exist yet — move it there on day one.

**Confidence markers used below:**
- *(verified)* — checked against this repo's source or `node_modules` on
  2026-09-23.
- *(platform knowledge)* — standard Android behaviour, not verified here.
  Re-check against current Android docs before relying on it; API levels
  and Play Store policy move.

---

## 1. Premise

This is a **separate app, built from scratch** — not a cross-platform port
of the iOS codebase. That was decided deliberately.

The reason: BuzzBee's defining guarantee is *"the alarm rings even if you
force-quit the app or the phone is in Silent mode."* On iOS that is
AlarmKit, an Apple-only API *(verified: `expo-alarm-kit`'s
`expo-module.config.json` is `"platforms": ["apple"]`)*. Android's
equivalent is a completely different architecture — `AlarmManager` +
full-screen intent + a foreground service. Sharing one codebase would mean
maintaining two unrelated alarm engines behind a common abstraction, for no
real gain.

What *is* worth copying is the product: the same features, the same
missions, the same visual identity — rebuilt on Android-native foundations.

---

## 2. What ports, what doesn't

### Ports cleanly (pure TypeScript, no iOS coupling) *(verified)*

Copy these files nearly as-is:

| File | What it is |
|---|---|
| `src/lib/types.ts` | `Alarm`, `AppSettings`, `DismissMethod`, mission targets/copy |
| `src/lib/wake-window-engine.ts` | Wake-window + escalation math. Zero imports beyond `./types` |
| `src/lib/alarm-utils.ts` | `nextOccurrence`, clock formatting, repeat summaries. Zero imports beyond `./types` |
| `src/lib/ring-dedup.ts`, `src/lib/id.ts` | Small helpers, no imports |
| `src/lib/db.ts` | Schema + CRUD. Only dependency is `expo-sqlite`, which is cross-platform |
| `src/lib/history-data.ts`, `src/lib/settings-cache.ts` | Derived-data helpers |

`db.ts` is worth copying **including its migration pattern**: every column
added after v1 needs both a line in `CREATE TABLE IF NOT EXISTS` (for fresh
installs) *and* an `ALTER TABLE ... .catch(() => {})` (for existing ones).
See the `label`, `alarmKitId` and `confirmAlarmKitId` columns for the shape.
Drop the two AlarmKit columns on Android; keep the rest of the schema
identical so History/stats logic ports unchanged.

### Must be rebuilt

| Area | Why |
|---|---|
| `src/lib/alarmkit.ts`, `src/lib/scheduling.ts` | Entirely AlarmKit/iOS-notification shaped. See §3 |
| `src/components/glass-card.tsx` and every `GlassCard` call site | `expo-glass-effect` is Apple-only *(verified)*. See §6 |
| `src/app/(tabs)/_layout.tsx` | Tab icons are SF Symbols only (`sf=` props) *(verified)* |
| `src/components/alarm-ring-effects.tsx` | iOS audio-session and volume behaviour |
| `src/app/ringing.tsx` | Must be launched by a full-screen intent, not a router push. See §4 |
| Onboarding permission screens | Different permission set and different grant flows |

---

## 3. The core problem — alarm delivery

**This is the whole project. Build and prove this first, before any UI.**

### Why `expo-notifications` alone is not enough *(verified)*

The iOS app keeps a scheduled notification as a *fallback* behind AlarmKit.
On Android that fallback would be the only path, and it is not good enough:

- `expo-notifications`' Android scheduler
  (`ExpoSchedulingDelegate.kt:106`) calls `setExactAndAllowWhileIdle` **only
  if** `AlarmManager.canScheduleExactAlarms()` returns true. Otherwise it
  silently degrades to `setAndAllowWhileIdle` — inexact and Doze-batched.
- It uses `setExactAndAllowWhileIdle`, never `setAlarmClock`, so it gets
  none of the alarm-clock exemptions *(platform knowledge)*.
- It cannot deliver a **full-screen intent**, so there is no way to take
  over a locked screen with the mission UI.
- It has no foreground service, so nothing keeps the alarm sounding and the
  process alive once the notification is delivered.

### Target architecture *(platform knowledge — verify against current docs)*

A custom Expo native module in Kotlin, same shape as the patched
`expo-alarm-kit` module this repo uses on iOS. (The user has already done
RN + Expo + Kotlin native modules on GupitSnap, so this is familiar ground.)

1. **Schedule** with `AlarmManager.setAlarmClock()` — the only API with
   real alarm-clock semantics: exempt from Doze, shows the system alarm
   icon, survives App Standby.
2. **Fire** into a `BroadcastReceiver` that immediately starts a
   **foreground service** (type `mediaPlayback`).
3. The service **posts a notification with a full-screen intent** pointing
   at the ringing Activity, on an `IMPORTANCE_HIGH` channel. That is what
   takes over the lock screen.
4. The service **owns the audio and vibration** for the whole ring, so it
   keeps going if the Activity is destroyed.
5. Only the completed mission stops the service.

### Permissions to declare

`app.json` currently declares audio and calendar permissions only. Android
needs, at minimum:

- `USE_EXACT_ALARM` — API 33+, granted at install for genuine alarm apps,
  no user prompt. Prefer this over `SCHEDULE_EXACT_ALARM` (user-grantable
  and revocable). **Play Store requires justification** — an alarm clock
  qualifies, but budget review time for it.
- `SCHEDULE_EXACT_ALARM` — fallback for API 31–32.
- `USE_FULL_SCREEN_INTENT` — required from API 34. Also Play-restricted to
  alarm/calling apps.
- `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` — *(verified)* both are
  already contributed by `expo-notifications`' own manifest, so they merge
  in automatically. Everything else in this list is not.
- `WAKE_LOCK`, `VIBRATE`
- `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` — already in
  `app.json` *(verified)*.

### Notification channels — a real design constraint

Android 8+ routes notification sound through the **channel**, not the
individual notification, and **a channel's sound is immutable once
created** *(platform knowledge)*. Deleting and recreating a channel to
change its sound resets the user's own settings for it.

That means per-alarm custom sound requires **one channel per sound**,
created up front — eight built-in tones, eight channels. This is the exact
limitation `src/lib/scheduling.ts` already documents as deferred *(verified,
see the comment above the `iosSound` line)*.

**User-recorded sounds are the hard case.** On iOS they already can't play
through AlarmKit's native alert (bundle resources only) and fall back to a
bundled tone. On Android a runtime file *can* be a channel sound via a
content URI, but it needs a channel created per recording and cleaned up on
delete. Decide early whether v1 supports custom recordings at all.

Note that the ringing Activity plays `alarm.sound` directly and is not
channel-restricted — the channel sound only matters for the pre-Activity
notification. Same split as iOS.

### Reboots and OEM battery managers

- `AlarmManager` alarms are cleared on reboot. A `BOOT_COMPLETED` receiver
  must re-arm every enabled alarm from SQLite *(platform knowledge)*.
- Xiaomi/MIUI, Oppo/ColorOS, Vivo and some Samsung builds kill background
  apps aggressively regardless of correct API use. Plan an onboarding step
  that detects these OEMs and deep-links to autostart / battery-optimisation
  settings. **This is the #1 source of "my alarm didn't go off" reviews for
  Android alarm apps** — treat it as a feature, not an edge case.

### Milestone 0 acceptance test

Before writing any UI: set an alarm for 8 hours out, force-quit the app,
leave the phone unplugged and idle overnight, in Silent mode. It must ring
on time, take over the lock screen, and keep ringing until the mission is
done. Repeat after a reboot. Repeat on a Xiaomi or Oppo device.

If that test doesn't pass, nothing else matters.

---

## 4. Ringing screen

On iOS this is a route pushed by the app. On Android it must be an
**Activity launched by a full-screen intent**, with `showWhenLocked` and
`turnScreenOn` set, so it appears over the lock screen.

Practical consequence: the ringing screen can be entered when the JS side
has no navigation history at all. Whatever navigation library is chosen, the
ringing route must be reachable as a cold-start entry point with an alarm id
passed in — not just as a push from the alarm list.

The visual design ports directly. The current iOS ringing screen is already
a dark full-screen takeover (`#1B1712`, white text) with per-mission UI,
which should translate to Android with no rethinking.

---

## 5. Missions

Six missions: Math, Clap, Shake, Buzz, Tap, Random. The logic and the tuned
thresholds are all in `src/app/ringing.tsx` and worth copying — they were
tuned on real devices.

- **Math, Tap** — pure JS, port as-is.
- **Shake** — `expo-sensors` `Accelerometer`, cross-platform. Threshold
  `1.7` with a `0.7×` reset hysteresis and a 300ms debounce.
- **Clap, Buzz** — mic metering via `src/hooks/use-mic-metering.ts`. Verify
  that `expo-audio`'s metering behaves the same on Android; the dB
  thresholds (`-20` for clap, `-25` sustained 700ms for buzz) are
  **iOS-calibrated and will likely need re-tuning**.
- The Clap/Buzz "Start Mission" gate exists because their mic detection
  conflicts with the alarm sound. Keep that. Keep the 3-minute inactivity
  timeout that resumes ringing too.

Android bonus worth considering: Android *does* expose an ambient light
sensor to third-party apps, which iOS does not. `PLAN.md` (iOS) notes
light-based ambient awareness as an Android-only possibility.

---

## 6. Visual design

The iOS app's look is Apple Liquid Glass (`expo-glass-effect`), applied
app-wide with an explicit rule: **no colour tinting on glass surfaces.**
That material does not exist on Android and shouldn't be faked.

Recommended: **Material 3 / Material You**, keeping BuzzBee's identity
through what actually carries — the warm palette (`src/constants/theme.ts`:
`#FBF3E4` background, `#F5A623` accent, `#2B2420` ink), the Manrope +
DynaPuff type pairing, the bee mascot, and the dark ringing screen.

Practical notes:
- `GlassCard` has a built-in flat fallback for non-glass platforms. Rather
  than porting that indirection, replace it with a plain Material surface
  component at every call site.
- Tab bar: `NativeTabs` renders Material bottom navigation on Android, but
  the icons here are SF Symbols only *(verified)* and need Android drawables
  or vector assets.
- The contrast-tuned colours in `theme.ts` (`inkFaint`, `danger`, `success`
  were each darkened to pass WCAG AA — see the comments) should carry over
  unchanged. Don't re-pick them.

---

## 7. Milestones

0. **Alarm delivery spike** — native module, `setAlarmClock`, full-screen
   intent, foreground service, boot re-arm. Bare UI. Pass the §3 acceptance
   test on a stock device *and* a Xiaomi/Oppo one. **Do not proceed until
   this passes.**
1. **Data layer** — port `db.ts`, `types.ts`, `alarm-utils.ts`,
   `wake-window-engine.ts`. Unit-test the wake-window and `nextOccurrence`
   math; it's pure and cheap to cover.
2. **Core loop** — alarm list, create/edit, one mission (Tap), ringing
   screen, dismiss.
3. **All six missions** — re-tune Clap/Buzz thresholds on real Android
   hardware.
4. **Sounds** — the eight bundled tones, one notification channel each.
   Decide on custom recordings (§3).
5. **Smart features** — Wake Window escalation, Bedtime Reminder, Calendar
   Auto-Shift, History.
6. **Onboarding** — including the OEM battery-manager step (§3).
7. **Play Store** — `USE_EXACT_ALARM` and `USE_FULL_SCREEN_INTENT` both
   need policy justification. Start that paperwork early.

---

## 8. Decisions to confirm before starting

1. **Stack** — Expo + a custom Kotlin module (recommended: matches the iOS
   app's own `expo-alarm-kit` pattern, and GupitSnap already proved this
   workflow), or fully native Kotlin/Compose?
2. **Shared code** — copy the pure-TS `src/lib` files into the new repo, or
   extract them into a package both apps depend on? Copying is simpler and
   the two apps will diverge anyway; a shared package only pays off if the
   product stays in lockstep.
3. **Min SDK** — full-screen intent and exact-alarm rules differ sharply
   across API 31/33/34. What's the floor?
4. **Custom recorded sounds in v1?** — the channel-per-sound constraint
   makes this meaningfully more work than on iOS.
5. **Feature parity or Android-first rethink?** — e.g. the light sensor,
   or Android's richer widget/tile surfaces.

---

## 9. iOS files worth reading first

- `PLAN.md` — the full iOS product history and rationale. Long, but it's
  where the *why* behind each feature lives.
- `src/lib/alarmkit.ts` — read the doc comments. They explain what
  guarantee each piece buys, which is what the Android side has to
  reproduce by other means.
- `src/lib/scheduling.ts` — the fallback-notification layer and the
  same-day re-save guard, which is subtle and worth copying.
- `src/app/ringing.tsx` — mission logic, thresholds, the inactivity
  timeout, and the anti-cheat confirmation alarm.
- `app-store/TEST-PLAN.md` — the manual test pass. Most of it is
  platform-agnostic and can be adapted directly for Play Store release
  testing.
