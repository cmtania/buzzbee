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

1. **Gentle escalation, not instant blast.** Alarm starts at low volume/haptic pulse and ramps over ~60–90 seconds, unless the hard deadline is reached, in which case it goes straight to full volume. Clucky is loud-instantly, always.
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

Clucky's entire product only ever acts at the moment of waking. BuzzBee additionally acts the night before: starting a user-configurable offset before bedtime (a **global setting**, not per-alarm — see Data Model), it fires a calm local notification and offers an in-app **Wind-Down screen** — dimmed theme, a slow breathing animation, and an optional soft ambient sound loop (`expo-audio`, already installed).

**Scope honestly**: true system-wide "lock distracting apps" (like iOS Screen Time) requires Apple's DeviceActivity/FamilyControls entitlement — a heavy, separate approval process, not v1. Wind-Down Mode ships as an in-app calm space + reminder notification only; app-locking is a flagged fast-follow.

### 2. Calendar-aware auto-shift

Clucky's alarms are static per weekday with no schedule awareness. BuzzBee reads the device's calendar (`expo-calendar`, needs calendar read permission) for the next day's earliest event. If it would conflict with the current wake window, BuzzBee surfaces an evening nudge notification — "Tomorrow's first event is at 8:00 — move your wake window to 5:45–6:15?" — rather than silently changing the alarm. A single **global** "trust auto-shift" toggle (in Settings, not per-alarm) lets a user opt into silent auto-apply instead of the confirmation step.

### 3. On-device ambient awareness

Clucky has zero environmental context. BuzzBee uses the microphone's input level (metering via `expo-audio`'s recording APIs) to notice the room is already active — partner up, TV on — and softens or skips the ring accordingly. Everything is on-device only: no audio is recorded, stored, or transmitted; only a running noise-level number is read and immediately discarded. This is a **global setting**, not per-alarm.

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

**"Loud" is partly a code concern**: actual playback loudness is driven by the device's Ringer/Media volume and the app's audio session setup at ring time (an "Extra Loud Mode"-style volume boost during ringing — implementation work, not an asset property). On the asset side: normalize candidate files to peak near 0dB before bundling (`ffmpeg -filter:a loudnorm` or Audacity's Normalize), and prefer harsh/piercing tones (buzzers, sirens, sharp beeps) over bass-heavy or soft/ambient sounds.

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

- **iOS**: true silent-mode-piercing alarms require Apple's AlarmKit (iOS 26+) or a Critical Alerts entitlement (Apple approval required, restricted to certain app categories) — a plain local notification/audio session will *not* reliably override the silent switch or long backgrounding. Scope v1 realistically and flag AlarmKit/Critical Alerts as a fast-follow requiring an Apple entitlement request.
- iOS has no public ambient-light-sensor API — ambient awareness is mic-only on this platform.
- Continuous accelerometer sampling for hours while backgrounded is constrained by iOS's background execution budget — the practical MVP approach is sampling while foregrounded or via periodic background-task wake-ups (every 60–90s), enough resolution for the sleep-depth heuristic.
- Android is a later milestone, not current focus.

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

1. **Scaffold + static UI**: Expo project scaffolded at `z:\Git\circa-alarm` (packages installed: sensors, notifications, task-manager, background-task, audio, haptics, keep-awake, linear-gradient, Manrope font — `expo-sqlite` and `expo-calendar` still to be added). ✅
2. **Full 11-screen mockup**: Login, Home, Wake History, Settings, Add/Edit, Choose Mission, and 5 Ringing variants — built, reviewed against this plan, and reconciled. ✅
3. **Smart Wake engine v1**: accelerometer sampling + light-sleep heuristic, foreground-only, plus Simulate/Test Mode (App Store review requirement).
4. **Alarm scheduling + ringing flow**: local notifications for hard-deadline fallback, ringing screen, all six dismiss missions (resolve Random's exact behavior first).
5. **Persistence** via `expo-sqlite` + history/insights screen.
6. **Global settings implementation**: Wind-Down, calendar auto-shift, ambient awareness as app-wide toggles.
7. **Onboarding flow** implementation.
8. **Sound assets**: source, license-check, and normalize alarm sounds (see Tech Stack).
9. **Background hardening**: iOS Critical Alerts/AlarmKit entitlement investigation; Android support as a later milestone.
10. **Future**: Pro tier + Supabase-backed group sharing (see Future section above) — not part of MVP.

## Open questions for you

- **Random mission behavior** (new): does Random pick a fresh mission each time the alarm rings, or is it fixed once at alarm-creation time? Needs a decision before the Ringing-flow milestone.
- Confirm folder rename from `circa-alarm` to `buzzbee-alarm` — purely housekeeping, not urgent.
- iOS App Store review requires disclosing background sensor (motion, mic) and calendar use in the privacy policy — fine for later, just flagging it exists.
- Trademark check: worth a quick search on "BuzzBee" beyond the App Store (USPTO / general web) before any real branding investment, given how the "Buzz" naming conflict was discovered this late — cheap insurance.
