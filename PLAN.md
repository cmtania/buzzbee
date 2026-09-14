# BuzzBee — Smart Loud Alarm Clock

*An alarm that wakes you at the right moment, not just the loud one.*

> Working repo/folder name is still `circa-alarm` (renaming the folder to `buzzbee-alarm` is a housekeeping step, not a blocker). The **app itself is named BuzzBee**, full App Store title **"BuzzBee - Smart Loud Alarm Clock"** — see "Naming & mascot" below for the naming history (Circa → Buzz → BuzzBee).

## The problem with Clucky (and most alarm apps)

Clucky's whole design is: pick a fixed time, ring loud at that exact instant, force the user to solve a mission to shut it off. The mission delays snoozing, but it does nothing about *when* the alarm fires — you can be dragged out of deep sleep at a terrible moment and still ace the math problem while feeling wrecked all day. Its personality (snarky rooster, Flock social pressure, streak badges) is all about compliance *after* the alarm rings, never about *when* it should ring.

## The headline differentiator: Smart Wake Window

Instead of one fixed time, the user sets a **wake window** (e.g. 6:30–7:00 AM) and a hard deadline (7:00 AM, never later). During that window, BuzzBee quietly samples the phone's accelerometer (phone placed on the mattress/pillow) to estimate sleep depth from movement patterns — frequent small movements and restlessness indicate light sleep, near-total stillness for extended stretches indicates deep sleep. The moment it detects a light-sleep signal inside the window, it rings. If nothing is detected, it rings at the hard deadline regardless — so the app never fails to wake you, it only ever wakes you *earlier and gentler* than the deadline.

This is the headline differentiator versus Clucky, which has no concept of a window or sleep-state detection at all. **Nothing about naming or the mascot touches this** — it's still the core mechanic.

## Naming & mascot

**Naming history**: Circa → Buzz → **BuzzBee**. The app was first going to be named "Buzz" (following Clucky's own pattern of mascot-name-as-brand-name — an immediate, catchy pun on an alarm buzzer). While researching sound-asset sourcing, we discovered a live App Store app already named **"Buzz - Morning Person Alarm"** — same name, a mascot also named "Buzz," a mission-based dismiss mechanic (push-ups, squats, math, object hunt), a "Verification mode" nearly identical to a feature we'd already considered and declined, streaks, and a premium tier. A real conflict, not a coincidence to shrug off. Renamed to **BuzzBee** — full title **"BuzzBee - Smart Loud Alarm Clock,"** which conveniently bakes both differentiators into the App Store title itself ("Smart" = Smart Wake Window, "Loud" = the category and the sound-asset loudness work). Checked: the only existing "BuzzBee" App Store match is an unrelated Lifestyle/influencer-marketing app — no meaningful overlap.

The mascot is a bee character, chosen as a non-poultry alternative to Clucky's rooster that's still "catchy around alarm clock" (other options considered: Lark — "up with the lark" idiom, very apt but less punchy; Fox — crepuscular/smart-wake pun; Woodpecker — persistent knocking).

**Mascot strategy (finalized after building and reviewing the full mockup): a logo mark plus text voice — no illustrated character with poses.** Early in mockup development, Buzz appeared as a fully illustrated character (multiple poses: waving, reassuring, cheering, celebrating) across several screens. Across the course of building the real mockup, that illustrated character was removed from every screen it appeared on. Confirmed this is the deliberate final direction, not drift:

- **What appears visually**: the real bee **logo mark** (actual artwork supplied, not a hand-drawn posed mascot) as a static brand icon — on the Login screen's hero area and small in Home's header. No expressions, no poses, no speech bubbles.
- **What appears in copy only**: the mascot's encouraging **voice**, attributed with a short "Buzz says" tag (kept as an informal nickname in UI text, distinct from the app's full storefront name) — e.g. "Buzz says: I'll ring the moment you're in light sleep!" (Add/Edit Alarm), "Buzz says: You beat your deadline by 12 minutes this week!" (Wake History). Text only, no accompanying illustration.
- **The personality register** is still an **encouraging hype-coach** — upbeat, genuinely motivating, celebrates good wake data — the opposite emotional register from Clucky's "snarky, never mean" commentary that jokes about your snooze habit. Same basic idea as Clucky (a character with opinions about your mornings), inverted tone (cheering vs. teasing), now expressed purely through copy rather than illustration.
- **No streaks/badges/golden-egg gamification** beyond a simple streak *count* (see secondary differentiator #2) — that exclusion is unchanged.

### Visual identity

- **Palette**: warm honey/amber/gold with soft charcoal-black accents on a warm cream (beeswax) background, plus a light-gray-and-amber **wave background pattern** (Haikei-style SVG) on Home, Login, and the Ringing screens — this replaced an earlier honeycomb-hexagon-texture plan; the wave pattern is the actual shipped background treatment.
- **No illustrated mascot poses needed** — this was planned as a real production requirement (multiple bee poses/expressions) but is no longer needed given the logo-mark-plus-text-voice direction above. Genuine scope reduction.

### Secondary differentiators

1. **Gentle escalation, not instant blast. ✅ Implemented.** On a Smart-Wake early ring, the alarm starts at ~15% volume and ramps linearly to full over 75 seconds (`ringing.tsx`'s `AlarmSoundLoop`, via `expo-audio`'s per-player `.volume`, not the device's actual system volume). A hard-deadline ring skips the ramp entirely and goes straight to full volume — there's no slack left at that point, so no reason to ease in. Clucky is loud-instantly, always.
   **Also added: real device-volume boost.** iOS has no *public, sanctioned* API for a third-party app to set the system volume directly — this uses `react-native-volume-manager` (first real native dependency added this session; needs a fresh EAS build to take effect), which relies on the same well-known-but-undocumented `MPVolumeView`-slider trick other alarm apps use. Forces system volume to max for the duration of the ring, restores whatever it was before once dismissed.
2. **Post-wake insight, alongside a simple streak count.** "You woke up 14 min before your deadline, in an estimated light-sleep phase" plus a 7-day trend chart, delivered as a Buzz-voiced quote. A small streak counter (icon + count) appears on Home — deliberately minimal, no badge tiers or collectibles, so it doesn't balloon into full gamification.
3. **A mascot with the opposite personality, not the absence of one.** BuzzBee's mascot hypes and celebrates; Clucky teases and jokes. The differentiation is emotional register and species, not mascot-vs-no-mascot — and per the mascot strategy above, it's expressed through copy, not illustration.
4. **Missions are physical/energetic reps, not a cognitive-puzzle mix.** See the Mission Library section below — this replaced an earlier "keep missions minimal" stance once the human partner specified a concrete 6-mission set.

### Explicitly NOT building (to avoid scope creep / feature-cloning)

- No "Flock"-style social/group alarms in v1 (a group-sharing **Pro** tier is planned for later — see Database & Backend Architecture).
- No subscription/paywall in v1 — ship a working free app first.
- No camera-based mission checks (privacy-sensitive, and not core to the differentiator).
- No geofenced dismissal, accountability calls, or anti-charity money stakes (considered, explicitly declined for v1).
- No Proof-of-Wake follow-up check-in (considered, not selected — the existing "Buzz - Morning Person Alarm" competitor has a very similar "Verification mode," which is an additional reason to leave this out rather than converge further).
- No egg-hatching/pledge mechanic, reviews carousel, or Flock-style social-account screen in onboarding — these are Clucky-specific devices, not generic patterns worth reusing.

## Additional differentiators (beyond Smart Wake Window)

### 1. Wind-Down Mode (pre-sleep, not just wake)

> Renamed in the shipped UI to **"Bedtime Reminder"** (Settings, Home, notifications, onboarding) — plainer, more universally understood than "Wind-Down," which one real user testing the app didn't recognize. "Wind-Down" is kept below since that's this section's original planning name; internal code identifiers (`windDownEnabled`, `wind-down-settings.tsx`, etc.) were deliberately left unchanged — only user-visible copy was renamed.

Clucky's entire product only ever acts at the moment of waking. BuzzBee additionally acts the night before: starting a user-configurable offset before bedtime (a **global setting**, not per-alarm — see Data Model), it fires a calm local notification and offers an in-app **Wind-Down screen** — dimmed theme, a slow breathing animation, and an optional soft ambient sound loop (`expo-audio`, already installed).

**Two distinct notifications, not one.** The original build only scheduled the offset-before reminder ("Bedtime's coming up"). It now also schedules a second one right at the actual bedtime ("It's bedtime — time to put the phone down"), since the reminder alone never actually told you when bedtime itself arrived.

**Home's Wind-Down card upgraded to a hero treatment** (a `CountdownDial` + text block, matching Home's own hero card style), showing a live countdown to the *reminder* (not bedtime itself), the bedtime in large 12-hour AM/PM text, and the offset. Wind-Down Settings itself stays a plain, focused editor (bedtime stepper + offset chips + Preview/Save) — the hero/dial treatment lives on Home, not on the settings screen. Every other spot referencing bedtime (Home's Wind-Down card, Settings' Wind-Down row) was also fixed to show 12-hour AM/PM instead of the raw "22:30"-style stored string.

**Scope honestly**: true system-wide "lock distracting apps" (like iOS Screen Time) requires Apple's DeviceActivity/FamilyControls entitlement — a heavy, separate approval process, not v1. Wind-Down Mode ships as an in-app calm space + reminder notification only; app-locking is a flagged fast-follow.

### 2. Calendar-aware auto-shift

Clucky's alarms are static per weekday with no schedule awareness. BuzzBee reads the device's calendar (`expo-calendar`, needs calendar read permission) for the next day's earliest event. If it would conflict with the current wake window, BuzzBee surfaces an evening nudge notification — "Tomorrow's first event is at 8:00 — move your wake window to 5:45–6:15?" — rather than silently changing the alarm. A single **global** "trust auto-shift" toggle (in Settings, not per-alarm) lets a user opt into silent auto-apply instead of the confirmation step.

### 3. On-device ambient awareness ✅ Implemented (redesigned from the original "soften" idea into a real skip)

Clucky has zero environmental context. BuzzBee uses the microphone's input level (metering via `expo-audio`'s recording APIs) to notice the room is already active — partner up, TV on. Everything is on-device only: no audio is recorded, stored, or transmitted; only a running noise-level number is read and immediately discarded. This is a **global setting**, not per-alarm.

**Only applies to a Smart-Wake early ring, never a hard-deadline ring.** The check runs *before* any sound plays — up to a full minute of silent listening — which is only safe when there's real buffer time before the true deadline. A hard-deadline ring (no slack left) always rings immediately regardless of this setting.

**What actually happens, as shipped** (this superseded the original "softens or skips the ring" wording, which the code never actually implemented until this pass): if the room reads as active, BuzzBee skips the mission and the full alarm blast entirely and shows a lighter "Sounds like you're already up!" screen with one tap to confirm dismissal — or a "No, wake me properly" fallback that falls through to the normal ring + mission, in case the noise was a false read (partner up, but you're still asleep). Sound and vibration are both held off during this screen; nothing plays until either the person confirms they're up (mission-complete, no ring) or explicitly asks to be woken properly.

**Platform caveat**: iOS has **no public ambient-light-sensor API** for third-party apps (unlike Android's `expo-sensors` `LightSensor`), so light-based ambient awareness isn't feasible on iOS. Since iOS is the current target, this ships as **microphone-noise-level awareness only** on iOS; light-based detection is a possible Android-only enhancement later.

## Mission Library: 6 dismiss missions

The dismiss-method library is a real differentiator from Clucky, but not in the way originally planned ("missions stay minimal" was superseded once concrete missions were specified). The differentiator is the **character** of the missions: Clucky's six mix cognitive puzzles (math, memory, color-match, typing) with a couple of physical ones (walk, push-ups); BuzzBee's six are almost entirely **physical/energetic reps** (plus math and a random-surprise option), single-select only (no stacking, unlike Clucky's "stack up to 3"), with high repetition counts that make it much harder to "solve while still half-asleep" than a quick puzzle.

1. **Math** — one equation, answered via an on-screen **number keypad + input display** (confirmed approach — not multiple-choice tiles). No permissions needed.
2. **Clap × 50** — mic metering (`expo-audio`) detects sharp volume-spike transients (fast attack/decay, distinct from sustained noise), debounced so one clap isn't double-counted.
3. **Shake the phone × 50** — `expo-sensors` Accelerometer, shake detected when acceleration magnitude crosses a threshold, debounced (~300–500ms between counted shakes).
4. **Buzzzzz (make a loud sound) × 10** — mic metering detects a sustained loud burst (~1 second above threshold) with a quiet gap before the next one counts. This does **not** verify the sound actually resembles buzzing — it's an approximation using the same tech as ambient awareness, not new acoustic classification. A nice mascot-specific bit no other alarm app has.
5. **Tap the screen × 100** — an on-screen counter button, no permissions needed.
6. **Random** — "Surprise mission each morning," picked from the other five. **Open question, not yet decided**: does Random pick a fresh mission each time the alarm actually rings, or is it decided once at alarm-creation time and then fixed? Needs a decision before implementation.

**Chosen via a dedicated "Choose Mission" screen** (see Screens section below) — a card grid, not an inline picker on the Add/Edit Alarm screen. The Add/Edit screen shows a summary row (current mission + rep count) that navigates to Choose Mission.

**Reference note**: the Choose Mission screen's card-grid layout (icon, title, description, action) was inspired by a screenshot of a *different* competitor's mission-picker screen — very possibly the "Buzz - Morning Person Alarm" app mentioned above, given how closely its mission list (object hunt, push-ups, math, emoji/scavenger hunt, randomized) matches what was shown. We adopted the card-grid **layout** only; we explicitly did not adopt that competitor's specific mission types (no Push Ups, Object Hunt, or Sky Photo in BuzzBee) or its category-tab structure (All/Trending/Photo/Audio) — BuzzBee has 6 missions total, not "10+ tasks" across categories, so no tabs are needed.

**Honest notes**:
- These rep counts are high — Clucky's missions are typically solved in a few seconds; 50 claps/shakes or 100 taps take real, sustained effort. That's likely the point (harder to fake being awake), but worth user-testing before locking in these exact numbers for launch. A natural fast-follow is making the counts adjustable as a difficulty setting.
- **No new permission categories**: Clap and Buzzzzz both reuse the microphone access already required for ambient awareness; Shake reuses the accelerometer access already required for Smart Wake Window's sleep-depth sampling. Math and Tap need no device permissions at all.

## MVP Feature List

1. Create/edit alarm: wake-window start, hard-deadline end, repeat days, dismiss-mission choice (via Choose Mission screen), sound choice.
2. Smart Wake detection service: accelerometer sampling while app is foregrounded/backgrounded within the window; light-sleep heuristic; fallback to hard deadline; **Simulate/Test Mode** to compress the window to ~30–60s (see below — required for App Store review, not optional).
3. Ringing screen: escalating volume/haptics, one dismiss mission chosen from the six-mission library (with rep-count progress shown live), Buzz-voiced status line (text only, no illustration).
4. Wake history: list of past alarms with detected wake time vs. deadline, 7-day trend view, Buzz-voiced insight quote.
5. Alarm list / home screen, with a circular countdown dial to the next wake window and a streak count.
6. Local notification fallback so the alarm still fires if the OS kills background sampling (safety net — always schedule a hard-deadline notification/alarm regardless of what the sensor detects).
7. Wind-Down screen + global bedtime-offset notification scheduling.
8. Calendar read + evening auto-shift nudge notification, with a global "trust auto-shift" toggle.
9. Mic-metering ambient check before ringing (iOS: noise-level only), global toggle.
10. Settings screen: global toggles for the three features above, plus Notifications/Sound & Haptics/About.

## Tech Stack

- **Expo (managed, TypeScript)**, Expo Router for navigation.
- `expo-sqlite` — local database (chosen over AsyncStorage): Wake History needs date-range queries for the 7-day chart, and alarms/wake-events/future-group data is genuinely relational. Starting with a real embedded SQL database means a future Pro sync layer is "add sync columns to existing tables," not "migrate off AsyncStorage."
- `expo-sensors` — accelerometer sampling for the smart-wake heuristic and the Shake mission.
- `expo-notifications` + `expo-task-manager` / `expo-background-task` — scheduling the hard-deadline fallback alarm and background sampling ticks.
- `expo-audio` — alarm playback, looping, volume ramp, Wind-Down ambient sound, mic-level metering (Clap/Buzzzzz missions and ambient awareness).
- `expo-haptics` — escalation pulses.
- `expo-calendar` — reading the next day's earliest event for calendar-aware auto-shift.
- `expo-keep-awake` — keep screen/CPU active during wake-window sampling.

### Sound assets: sourcing, licensing, and loudness

**Sources (commercial-use-safe first)**:
1. **Mixkit** (mixkit.co/free-sound-effects) — dedicated "Alarms" category, free for commercial use, no attribution required. First choice.
2. **Pixabay Sound Effects** (pixabay.com/sound-effects) — fully free, no attribution needed.
3. **Notification Sounds** (notificationsounds.com) — built specifically for app alert/alarm tones.
4. **Freesound.org** — largest library, but licenses vary; filter to **CC0 only** for a commercial app (CC-BY needs in-app credit; CC-BY-NC isn't usable at all for a monetized app).

Explicitly avoid extracting/bundling Apple's own system alarm tones — not licensed for redistribution.

**"Loud" is partly a code concern**: actual playback loudness is driven by the device's Ringer/Media volume and the app's audio session setup at ring time (an "Extra Loud Mode"-style volume boost during ringing — implementation work, not an asset property). On the asset side, formal peak normalization (`ffmpeg -filter:a loudnorm` or Audacity's Normalize) was never run — but confirmed loud on a real device at max media volume, which is what normalization was actually a defense against, so this isn't treated as a blocker (see Milestone 8).

## Future: Pro tier & group sharing (Database & Backend Architecture)

Offline-first v1, with a paid **Pro tier later** adding Clucky-Flock-style group sharing with friends — this deliberately reintroduces something excluded above for v1, now scoped as a real paid v2+ feature rather than scope creep.

1. **Local database (v1): `expo-sqlite`** (see Tech Stack above) — everything local-only, single-device, no account required.
2. **Future Pro backend: Supabase** (Postgres + Auth + Realtime + Row Level Security). Auth natively supports the Apple/Google sign-in already designed into the Login screen; Realtime fits "see who's awake" live group features; RLS cleanly scopes each friend group's data.
3. **Sign-in is deferred, not shipped in v1.** The Login screen exists as a finished design (Apple/Google only, no email/password) but isn't wired to a real backend until Pro ships. v1 launches with zero account requirement — genuinely offline-first — and Apple's Sign-in-with-Apple review requirement doesn't apply yet since there's no live account system.
4. **Migration path when Pro ships**: add `remote_id` / `updated_at` / `synced_at` columns to the existing local tables (not a rebuild), stand up the matching Postgres schema, and build a sync job that only runs for accounts that joined/created a group. Free users' data never leaves the device.
5. **New Pro-only tables** (Supabase/Postgres, not local): `groups`, `group_members`, `group_wake_status` (Realtime-subscribed) — the actual "Flock" analogue, scoped for later.

**Not decided now**: the exact shape/UX of group-sharing itself, and Pro monetization mechanics — separate product-design pass when Pro is actually scheduled.

## Known technical risk (important, be upfront about this)

Reliable "ring even through silent mode, at the exact right second, while backgrounded for hours" is genuinely hard in a managed Expo app, especially on iOS (the current target platform):

- **iOS**: true silent-mode-piercing, force-quit-surviving alarms require Apple's **AlarmKit** (iOS 26+, confirmed via real device testing against a competitor — see Milestone 9). Unlike Critical Alerts (a restricted entitlement requiring a special Apple approval process), AlarmKit is a standard public framework — any app can use it with just a usage-description permission prompt, no approval request needed. **Decision reversal**: this plan previously scoped AlarmKit as an enhancement with the existing notification fallback covering pre-26 iOS. That's no longer the case — the only viable community wrapper forces the app's `ios.deploymentTarget` to 26.1 at the CocoaPods level (confirmed from the package's actual podspec, not just its README), so **BuzzBee's minimum supported iOS is now 26.1, full stop** — anyone on an older iOS can't install the app at all. Accepted deliberately (see Milestone 9) in exchange for real force-quit-surviving alarms this submission, rather than deferring AlarmKit further.
- iOS has no public ambient-light-sensor API — ambient awareness is mic-only on this platform.
- Continuous accelerometer sampling for hours while backgrounded is constrained by iOS's background execution budget — the practical MVP approach is sampling while foregrounded or via periodic background-task wake-ups (every 60–90s), enough resolution for the sleep-depth heuristic.
- Android is a later milestone, not current focus.

### General "BuzzBee is closed" warning ✅ built, not yet on-device tested

**Superseded an earlier, narrower per-alarm version** (scheduled a warning tied to one specific Smart-Wake alarm's window-start, cancelled the instant `useSmartWakeMonitor` confirmed live watching). Explicit product decision: this should run **unconditionally, independent of any alarm existing at all** — not just when a Smart-Wake alarm's window is about to open. Replaced rather than layered, to avoid two overlapping "reopen the app" notifications.

If the app is force-quit, light-sleep detection silently can't run (no third-party JS executes at all once killed — see above), and any Smart-Wake alarm quietly degrades to ringing only at the hard deadline. Bedtime Reminder is unaffected by this — it's a plain OS-scheduled `expo-notifications` local notification, which iOS delivers regardless of app state, unlike Smart Wake's detection which needs live JS. **There is no way to detect the actual moment of force-quit** — no third-party app code runs at all once truly killed, a hard OS-level constraint, not an Expo limitation.

**`useLivenessHeartbeat`** (`hooks/use-liveness-heartbeat.ts`, mounted unconditionally in `_layout.tsx`'s `AppShell` alongside `useSmartWakeMonitor`) approximates detection via a dead-man's-switch: every 5 minutes while the app is alive (foreground or backgrounded), it re-arms a local notification ("BuzzBee is closed — Smart Wake won't trigger until you reopen it") scheduled 6 minutes into the future, cancelling any previously-armed instance first (matched by `data.type === 'app-closed-warning'`, same cancel-by-type pattern as `wind-down-scheduling.ts`, rather than tracking a single id — this also clears a stale instance left over from a previous session on every fresh launch). As long as the heartbeat keeps renewing, the notification never reaches its fire time. The instant nothing renews it — the app was force-quit — the last-armed instance fires on its own within ~6 minutes (not instant; that delay is the real trade-off of not having true termination detection). Tapping it (`_layout.tsx`, `type: 'app-closed-warning'`) routes to Home, which is what actually matters since it's what lets the heartbeat and monitor resume.

None of this blocks building and demoing the core idea now — the first runnable version is tested with the app foregrounded / dev client, and "survives being killed for 8 hours" hardening is its own follow-up milestone.

## Simulate/Test Mode (App Store review requirement, not just a nice-to-have)

Smart Wake Window's core mechanism can't be verified in real time — no reviewer is sleeping 6–8 hours to confirm the alarm rings early, and neither can we when recording demo material.

**The fix**: a **Simulate/Test Mode** that compresses the wake window to ~30–60 seconds, so shaking/moving the phone during that short window immediately triggers "Light sleep detected" and the ring.

**How this gets used**:
1. **Recording App Store demo material** — this is how Smart Wake gets filmed working at all.
2. **App Store Connect's "App Review Information" notes** — "Enable Simulate Mode in Settings to compress the wake window to 60 seconds, then move the phone to trigger it."
3. **A real user-facing feature**: surfaced in Settings as "Test Smart Wake" — lets a skeptical user watch the mechanism work in under a minute. Reuses the same "Preview" pattern as the Choose Mission cards.

**Does not replace** real overnight testing with actual sleep data to tune the movement-magnitude threshold before launch.

## Onboarding Flow

Clucky's actual onboarding structure: personalization questions → a "120 min wasted" cost hook → wake-time picker → day-repeat selector → a permission-explainer → a 6-option mission picker → a **Ringer Check** → an "I promise"/egg-hatching commitment screen → a recap timeline → a reviews carousel → Flock social-account setup.

BuzzBee's onboarding reuses two generic, non-Clucky-specific UX conventions (Ringer Check; day-repeat chips with presets), restyled in BuzzBee's own visual language, and rebuilds everything else around its own mechanics:

1. **Welcome** — BuzzBee logo mark + one-line pitch ("Wakes you at the right moment, not just the loud one").
2. **Habit check** — "What usually happens when your alarm goes off?" (snooze to the last second / wake up but feel wrecked / sleep through it entirely).
3. **The science hook** — sleep inertia: being woken mid-deep-sleep costs real grogginess, and Smart Wake exists to avoid that.
4. **Set your wake window** — two time pickers, "Earliest OK" / "Latest (hard deadline)."
5. **Repeat days** — day chips + Every day/Weekdays/Weekends presets.
6. **Smart Wake permissions** — explains why motion + notification (and Critical Alerts, if available) access is needed.
7. **Choose your smart features** — one combined screen with three **global** toggles: Wind-Down, Calendar-aware auto-shift, Ambient awareness — each with an inline permission request, and for ambient awareness, explicit "on-device only, never recorded" copy.
8. **Choose your dismiss method** — the Choose Mission screen (6 options, single-select).
9. **Ringer Check** — plays the chosen alarm sound at current Ringtone & Alerts volume, prompts raising it if needed.
10. **Summary & confirm** — recap card ("Wake window 6:30–7:00 AM, Mon–Fri · Smart Wake on"), one "Set it up" button.
11. **Done** — lands on Home with the new alarm already created.

**Explicitly not carried over from Clucky's onboarding**: egg-hatching/pledge mechanic, review/testimonial carousel, Flock-style social-account screen, backup-alarms comparison graphic.

## Data Model (local, MVP)

```ts
type Alarm = {
  id: string;
  windowStart: string; // "06:30"
  windowEnd: string;   // "07:00" (hard deadline)
  repeatDays: number[]; // 0-6, empty = one-off
  smartWakeEnabled: boolean;
  dismissMethod: "math" | "clap" | "shake" | "buzz" | "tap" | "random";
  sound: string;
  enabled: boolean;
  vibrationEnabled: boolean; // per-alarm, unlike Wind-Down/Calendar/Ambient below
};

// Wind-Down / Calendar auto-shift / Ambient awareness are GLOBAL settings,
// not per-alarm — confirmed after reviewing the Settings screen mockup.
type AppSettings = {
  windDownEnabled: boolean;
  windDownOffsetMin: number;     // minutes before bedtime
  bedtime?: string;
  calendarAutoShiftEnabled: boolean;
  autoShiftTrusted: boolean;     // true = auto-apply, false = confirm-first nudge
  ambientAwarenessEnabled: boolean;
  simulateModeEnabled: boolean;  // Simulate/Test Mode toggle
  hasOnboarded: boolean;
  hapticsEnabled: boolean;       // global tap-feedback toggle (Settings → Sound & Haptics)
  defaultSound: string;          // used for a newly-created alarm draft
};

type WakeEvent = {
  id: string;
  alarmId: string;
  date: string;
  scheduledDeadline: string;
  actualRingTime: string;
  triggeredBy: "smart-detection" | "hard-deadline";
  dismissedAfterSeconds: number;
};

// Mission target constants (v1: fixed, not per-alarm configurable)
const MATH_PROBLEMS = 1;
const CLAP_TARGET = 50;
const SHAKE_TARGET = 50;
const BUZZ_TARGET = 10;
const TAP_TARGET = 100;
```

## Screens (see mockup)

1. **Login** — Apple/Google sign-in only (no email/password), BuzzBee logo mark, wave background. Finished design; not wired to a real backend until the Pro milestone.
2. **Home** — hero card with a circular countdown dial ("Xh Ym left" inside a progress ring) + wake-window range and repeat schedule as side text, a streak count badge, alarm list (mission icon + repeat label + window range + toggle per card), a floating pill tab bar (Home/History/Settings) + a squircle add button.
3. **Wake History** — 7-day dot-on-track chart (accent dot = smart-detected wake, gray dot = deadline reached), Buzz-voiced insight line (text only).
4. **Settings** — Smart Features group (Wind-Down / Calendar Auto-Shift / Ambient Awareness as global toggles, plus "Test Smart Wake") and a General group (Notifications, Sound & Haptics, About BuzzBee).
5. **Add/Edit Alarm** — wake-window pickers, Smart Wake toggle with a Buzz-voiced text explainer, repeat days, a "Choose a Mission" summary row (navigates to Choose Mission), sound row, Cancel/Save footer.
6. **Choose Mission** — rounded-top sheet-modal, 6 centered mission cards (Math, Clap, Shake Phone, Buzzzzz, Tap, Random), selected state shown with an accent border + green checkmark.
7. **Ringing** — 5 variants (Math, Clap, Shake, Buzzzzz, Tap; Random resolves to one of these at ring time) sharing one design language: no card wrapper, a top-wave amber/gray background, a large clock, a colored pill-eyebrow naming the mission, a big accent-colored counter/equation, a progress bar, and mission-specific art. Math uses a number keypad + input display.

## Milestones

1. **Scaffold + static UI**: Expo project scaffolded at `z:\Git\buzzbee-alarm` (renamed from `circa-alarm`), all packages installed including `expo-sqlite` and `expo-calendar`. ✅
2. **Full 11-screen mockup**: Login, Home, Wake History, Settings, Add/Edit, Choose Mission, and 5 Ringing variants — built, reviewed against this plan, and reconciled. ✅
3. **Smart Wake engine v1**: accelerometer sampling (rolling-buffer stddev heuristic) + light-sleep detection, foreground-only monitor wired into the root layout, plus a real Simulate/Test Mode screen (Settings → Test Smart Wake). Thresholds are untuned placeholders — real overnight calibration still needed before launch. ✅ (code), ⚠️ (tuning)
4. **Alarm scheduling + ringing flow**: local hard-deadline notifications, real Ringing screen, all six dismiss missions implemented (Math/Tap/Shake fully local; Clap/Buzz via real mic metering; Random confirmed as "fresh pick each time it rings" — see Open Questions). ✅
5. **Persistence** via `expo-sqlite` (alarms/wake_events/app_settings tables) + a real Wake History screen reading live data. ✅
6. **Global settings implementation**: Wind-Down (bedtime + offset, real scheduled notification, breathing-animation screen), Calendar auto-shift (real `expo-calendar` read + confirm-first nudge or auto-apply), Ambient awareness (real pre-ring mic check) — all real, all foreground-triggered only (no true background task yet, see Known Technical Risk). ✅
7. **Onboarding flow** implementation: all 10 real screens, writes into the same Alarm draft/Settings the rest of the app uses, creates a real alarm on completion. First-launch redirect + a Settings "Replay Onboarding" entry for retesting. ✅
8. **Sound assets**: 8 real tones sourced from Mixkit (free, commercial-use, no-attribution license — see `assets/sounds/SOURCES.md`), wired into real looping playback on the Ringing screen (skipped during Clap/Buzz to protect their mic detection) and a Choose Sound picker with live preview. **Native notification sound: ✅ done** — the OS fallback notification (fires when the app is backgrounded/killed) now plays the alarm's *actual* chosen sound on iOS, not the generic system chime. All 8 sounds were re-encoded as uncompressed PCM `.wav` (iOS notification sounds must be PCM/CAF/AIFF, ≤30s — the 4 `.mp3` sources didn't qualify; decoded via a WASM MP3 decoder since no `ffmpeg` was available) into `assets/sounds/notif/` with underscore-only filenames (Android's asset-name validator rejects the hyphens used by the in-app files), bundled via `expo-notifications`' config plugin `sounds` array. Android intentionally still uses the default sound — Android 8+ routes notification sound through notification channels rather than this per-notification field, and real per-channel custom sound is scoped together with the rest of Android support (a later milestone). **Peak-loudness normalization**: never run through `ffmpeg`/Audacity (no `ffmpeg` in this environment) — but confirmed loud on a real device at max media volume, which is the thing normalization was actually a defense against (a quietly-mastered file sounding weak regardless of device volume). Not treating this as a blocker anymore; worth revisiting only if a specific sound is ever reported as noticeably quieter than the others.
9. **Background hardening**: ✅ app-level audio keep-alive, ✅ **AlarmKit integration** for true force-quit survival — confirmed working on a real device (iOS alert fired through a force-quit, single Stop button, launched straight into the mission screen, matching Alarmy's own observed behavior). What's built:
   - The app declares iOS's `audio` background mode and keeps a near-silent audio session alive whenever an alarm is enabled, stopping iOS from suspending the JS process while backgrounded (screen off, another app open) — the alarm monitor's deadline checks keep firing in that state. This alone never covered a full force-quit.
   - **AlarmKit** (`expo-alarm-kit`, the only maintained Expo-native wrapper found) now schedules every enabled alarm's hard deadline as a real system alarm — it rings through Silent/Focus and survives a full force-quit, launching BuzzBee straight into the Ringing/mission screen via `launchAppOnDismiss` + `dismissPayload` (checked on launch in `_layout.tsx` via `checkAlarmKitLaunch()`). This runs *alongside*, not instead of, the existing JS Smart Wake monitor — while the app is alive, an early smart-detection ring or a JS-side deadline ring cancels the pending AlarmKit alarm (`cancelAlarmKitAlarm`, wired into all three trigger points in `use-smart-wake-monitor.ts`) so the OS alert doesn't also fire later. The old local notification (`scheduling.ts`) is kept as a defense-in-depth fallback alongside AlarmKit, not replaced.
   - **Patched dependency, not used as-is**: `expo-alarm-kit`'s native Swift code unconditionally added a Snooze button to every AlarmKit alert with no way to omit it — a direct conflict with BuzzBee's "finish a mission to dismiss, no snooze" design (confirmed this is *not* an AlarmKit limitation — Apple's own `AlarmPresentation.Alert` API supports a stop-only alert, and a real-device screenshot of Alarmy showed exactly that: a single-button alert that opens straight into its mission screen). Patched via `patch-package` (`patches/expo-alarm-kit+0.1.11.patch`) so the secondary/snooze button is only added when explicitly requested (`doSnoozeIntent`), which BuzzBee never sets. The patch must be manually reapplied/reviewed if this dependency is ever upgraded.
   - **Accepted trade-off, reversing this plan's earlier framing**: the package's podspec hardcodes `platforms: { ios: '26.1' }` at the CocoaPods level — there's no way to keep a lower app-wide deployment target with AlarmKit merely unavailable below 26. `ios.deploymentTarget` in `app.json` is now **26.1**, meaning **BuzzBee no longer supports any iOS version below 26.1** — a real reduction in addressable install base, accepted deliberately in exchange for shipping real force-quit-surviving alarms this submission rather than deferring further.
   - **Confirmation/anti-cheat safety net** (`armConfirmationAlarm`/`disarmConfirmationAlarm` in `lib/alarmkit.ts`, a second `confirmAlarmKitId` per alarm, distinct from the main deadline alarm's id): matching real-device-observed Alarmy behavior, tapping AlarmKit's Stop button only stops *that* alert and launches the app — it doesn't mean the mission was completed. Without a safety net, force-quitting the instant you land on the mission screen would silence the alarm for good. The Ringing screen now arms a second, one-shot AlarmKit alarm the moment it loads the alarm, and disarms it the moment `dismiss()` actually runs (mission genuinely completed, including the ambient-awareness "Yes, I'm up" shortcut). If the app is force-quit before that, the safety-net alarm fires on its own — fully OS-native, no live app process needed — and relaunches straight back into the same mission. **Confirmed working on a real device**: force-quitting mid-mission does re-ring and relaunch into the mission, as intended. Deliberately built on the already-patched, stop-only `scheduleAlarm` rather than `scheduleTimerAlarm`: the timer variant's pending countdown UI always ships with a native Pause button (same unconditional-secondary-button issue as the main alert, just not yet patched for that path) — a user could pause the safety-net timer from the Lock Screen and never finish the mission, defeating the point.
     - Delay: real-device testing at 30s confirmed the predicted false-positive — an unwanted duplicate re-ring during a legitimate (non-force-quit) mission attempt. Bumped to `CONFIRMATION_ALARM_DELAY_SEC = 90` in `ringing.tsx` (still its own constant, decoupled from the unrelated `INACTIVITY_TIMEOUT_MS` JS-only timer).
     - **Dynamic Island parity with Alarmy — investigated, deliberately deferred, not a blocker**: real-device testing showed no Dynamic Island presence while backgrounded mid-mission (unlike Alarmy). Best-informed read: Alarmy's Dynamic Island appearance is likely tied to AlarmKit's Countdown/Timer presentation (the same mechanism as the built-in Clock app's Timer feature), not the plain future-dated Alert schedule this safety net uses. Closing that gap would mean patching `scheduleTimerAlarm`'s Swift code too (same unconditional-Pause-button issue as the Snooze button fix above) so the confirmation alarm could safely use the Countdown presentation instead. Explicitly skipped for now per the human partner's call — not needed for submission, just parity polish.
   - **Native notification sound bug found and fixed, confirmed on-device**: neither the main deadline alarm nor the confirmation alarm ever set AlarmKit's `soundName` option, so both silently used AlarmKit's own default tone instead of the alarm's actual chosen BuzzBee sound (caught via real-device testing — "it uses a default sound from my phone"). Fixed by reusing the same bundled PCM `.wav` filenames already proven to work for the notification-fallback sound (`NOTIFICATION_SOUND_FILES`, see `sounds.ts`) — re-tested and confirmed playing the correct sound.
   - **Bugs found and fixed during first real-device testing**: (1) AlarmKit launching the app didn't tell the JS Smart Wake monitor the alarm had already rung, so its next 5s tick independently noticed the same overdue deadline and pushed a duplicate `/ringing` screen — fixed by moving the "already rang today" dedup out of the monitor's private state into a shared module (`lib/ring-dedup.ts`) that the AlarmKit-launch handler in `_layout.tsx` also writes to. (2) Mission Complete's "Go to Home" used `router.replace('/')`, which swaps only the current screen for a new Home instance while the original Home (still in the stack from before the alarm fired) stays underneath, producing a visible double-Home overlay — fixed with `router.dismissTo('/')`, which pops back to the existing Home instead of creating a second one.
   - **Still needed before this is fully submission-ready**: (1) the App Group entitlement (`group.com.cmtania.buzzbeealarm`, already in `app.json`) needs its capability enabled for the App ID — EAS Build's credential manager typically detects this from the entitlement and offers to provision it interactively during `eas build`; this apparently succeeded, since the real-device test above worked. (2) The confirmation/anti-cheat safety net above is code-complete but not yet on-device tested (does it actually re-ring after force-quit, does Dynamic Island show during the mission). (3) The 3-minute confirmation-alarm delay is a first guess (reusing the existing inactivity-timeout constant for consistency) — may need real tuning once tested.
10. **Future**: Pro tier + Supabase-backed group sharing (see Future section above) — not part of MVP.

## Open questions for you

- ~~**Random mission behavior**~~ — confirmed: stays as "fresh pick each time the alarm rings" (the current implementation).
- ~~Confirm folder rename from `circa-alarm` to `buzzbee-alarm`~~ — done.
- ~~Privacy policy~~ — drafted (`legal/privacy-policy.md`, `legal/terms-of-service.md`), deployed live via GitHub Pages at `cmtania.github.io/buzzbee-docs` (support/privacy/terms all verified returning 200), and now linked from the app's own About screen. All placeholders filled with real values. Ready to use as App Store Connect's Privacy Policy and Support URLs.
- ~~Trademark check~~ — web/App Store search still shows only "BuzzBee For Influencers" (unrelated influencer-marketing platform, buzzbee.com), no meaningful overlap. Caveat: this was a general web search, not an actual USPTO TESS database query — that database can't be searched this way, so a real trademark clearance (tmsearch.uspto.gov, or a trademark attorney) is still a manual step before serious branding investment, even though nothing concerning turned up here.

## Post-mockup polish & reliability pass (not reflected above — a real session of bug fixes and UX work after the milestones were first written)

- Real device testing surfaced and fixed: fixed-time alarms never ringing (three separate root causes across the monitor and deadline logic), a dedup bug that silently blocked retesting the same alarm within a day, Ringing-screen layout bugs, a mission stuck permanently blank after an inactivity-timeout dead end, and a Wind-Down bedtime box rendering blank (a flex-layout bug, not a data bug).
- UX changes made directly from user feedback: a Start-Mission gate + inactivity-timeout redesign (scoped to just Clap/Buzz, since only they conflict with the alarm's own mic use), swipe-to-dismiss bottom sheets (Choose Mission/Sound, Wind-Down Settings) built on core `PanResponder`/`Animated` rather than a gesture-handler dependency, haptic feedback wired onto every button app-wide via one shared component, Home's alarm list sorted (enabled-then-disabled, soonest-first within each) with a real Enable All/Disable All/Delete All menu, Home's hero + Wind-Down cards frozen above a scrolling alarm list, and a new "Mission Complete" screen shown after a successful dismiss.
- App icon replaced with the real bee-mark artwork, Clucky-reference-style (face bleeds to the screen edges, cropped by the rounded square, rather than shrunk with padding inside it).
- Settings' three previously-dead "General" rows (Notifications, Sound & Haptics, About BuzzBee) are now real screens, not no-ops — Notifications shows live OS permission status with a jump to system settings; Sound & Haptics has a real global Haptics toggle and a Default Alarm Sound picker; About shows the live app version. Wind-Down/Calendar/Ambient rows also got real explanatory copy instead of terse status lines.
- Native notification sound: the backgrounded/killed-app fallback notification now plays the alarm's actual chosen sound on iOS (re-encoded from the 4 `.mp3` sources to PCM `.wav`, since iOS notification sounds can't be compressed audio — decoded via a WASM MP3 decoder, no `ffmpeg` available) instead of the generic system chime. Android intentionally still uses the default sound, since Android 8+ routes notification sound through notification channels rather than this per-notification field — real per-channel sound is scoped with the rest of Android support.
- Per-alarm **Vibrate** toggle added (Add/Edit Alarm), defaulting on — wired into a real repeating vibration during ringing (`react-native`'s `Vibration` API re-triggered on an interval, since iOS ignores `Vibration`'s pattern/repeat arguments and only Android honors them).
- Every overlay-modal sheet (Choose Mission/Sound, Wind-Down/Notifications/Sound & Haptics/About Settings, and now Add/Edit Alarm) is dismissible consistently: swipe down, or tap the dimmed area outside the sheet — the backdrop is a real `Pressable` now, not a plain `View`, and the sheet itself absorbs its own internal taps (via a no-op `Pressable` root) so tapping non-interactive space *inside* the sheet doesn't also dismiss it.
- **"Wind-Down Mode" renamed to "Bedtime Reminder"** everywhere user-visible (Settings, Home's hero card, notifications, onboarding) — real user testing found "Wind-Down" wasn't a familiar term. Internal code identifiers (`windDownEnabled`, `wind-down-settings.tsx`, etc.) deliberately left unchanged. The live docs site (`support.html`, `privacy.html`) updated to match for consistency where they describe real app settings by name; the marketing landing page's own copy was explicitly left as "Wind-Down Mode" per a deliberate call not to touch that page's wording.
- Copy/clarity pass driven by real-device confusion: Add/Edit's Smart Wake explainer expanded from one terse line into plain language, plus a new caveat note (only shown when Smart Wake is on) explicitly warning that light-sleep detection needs the app running in the background and won't trigger if fully closed. Test Smart Wake's two result-screen emoji replaced with real icon badges. The ambient noise-check screen gained a live countdown number + progress bar instead of a static "checking for 1 minute" line. The "Already up?" screen's title/subtext enlarged and its secondary action turned into a real full-width button instead of easy-to-miss underlined text. Math mission's equation/keypad/input text sizes all increased for readability.
- **Pre-submission cleanup**: removed the "Replay Onboarding" dev-testing entry from Settings (resets onboarding state — not something a real user needs, and risked being tapped by accident). About screen gained real, live Support/Privacy Policy/Terms of Service links (`Linking.openURL` to the now-deployed `cmtania.github.io/buzzbee-docs` pages) — reviewers and users can now reach them from inside the app, not just via App Store Connect metadata.
- **Legal docs brought current with AlarmKit** (`support.html`, `privacy.html`, `terms.html` on the live docs site): the pre-AlarmKit "force-quit means only a backup notification fires" language was factually outdated and has been rewritten — the hard-deadline alarm now reliably rings even fully closed, and only Smart Wake's *early* light-sleep detection specifically needs the app open. Added an FAQ entry and a Privacy Policy bullet explaining the new "BuzzBee is closed" heartbeat notification (see Milestone 9's general-heartbeat subsection).
- **App Store submission assets** built and committed under `app-store/` (5 real device screenshots + 8 original promotional graphics, all 1320×2868 for the 6.9" Display slot) — see `app-store/README.md`. Also added `app-store/APP-REVIEW-GUIDE.md` (paste-ready App Review Information notes + a pre-empted-rejection-reasons table, format borrowed from the MiLuv project's `docs/RELEASE.md`) and `app-store/SCREEN-RECORDING-GUIDE.md` (shot-by-shot script proving the alarm survives a real force-quit through Silent mode, and that Record Your Own Alarm Sound never leaves the device).

### User-recordable alarm sounds (shipped)

Users can now record their own alarm sound and pick it anywhere the bundled tones show up. New pieces:

- **`record-sound.tsx`** (new bottom-sheet screen, opened from a "Record a New Sound" row in both Choose Sound and Sound & Haptics): tap-to-record (`expo-audio`'s `useAudioRecorder`, 15s cap, `.m4a`), then Preview (loops the take), Re-take, or **Save My Sound** / Cancel. Saved recordings are auto-named "My Sound N".
- **`lib/custom-sounds.ts`** copies the temp recording into permanent storage (`expo-file-system`'s `File`/`Directory`/`Paths.document`, new direct dependency — was already present transitively via Expo SDK 57) under `custom-sounds/`, and keeps a new `custom_sounds` SQLite table (`db.ts`) for listing/naming/deleting.
- **A custom sound's file path is stored directly** as the `Alarm.sound` / `AppSettings.defaultSound` string (a `file://` URI) rather than an id needing a lookup — so the existing `isSoundName(...)` guards in `scheduling.ts` and `alarmkit.ts` (which already branch to a bundled fallback for anything not a bundled name) needed zero changes and already degrade gracefully if a custom sound is later deleted.
- **Choose Sound** and **Sound & Haptics** both gained a "Your Sounds" section above "Default Sounds", each row previewable and delete-able (trash icon, confirm dialog); deleting the sound currently selected for that alarm/as the default falls back to "Classic Alarm".
- `ringing.tsx`'s in-app playback loop (`AlarmSoundLoop`) now plays a custom recording's actual file when that's the alarm's chosen sound, instead of silently falling back to Classic Alarm.
- **Known, honest limitation**: AlarmKit's native hard-deadline ring (the one that survives a full force-quit) requires its sound to be a filename bundled into the app at build time — a user's runtime recording can't be one. So a custom sound plays correctly during in-app/backgrounded ringing and every preview, but the native AlarmKit alert itself falls back to the system default alert tone if the app is fully closed when the deadline hits. Not yet surfaced as in-app copy — worth a short caveat note near the record button if this proves confusing in testing.
- `app.json`'s microphone permission description updated to disclose that a user's own recording is saved on-device (previously said audio is "never recorded," which was accurate before this feature and would otherwise now be misleading to reviewers).
