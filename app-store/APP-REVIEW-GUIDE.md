# BuzzBee — App Store review guide

Reference format borrowed from `MiLuv`'s `docs/RELEASE.md` (§5 App Review Information,
§8 pre-empted rejection reasons) and `docs/app-review-2.5.4-response.md` — same idea,
adapted to BuzzBee's actual risk areas. BuzzBee is simpler to review than MiLuv in one
big way: **no account, no login, no server** — every feature is available the moment
the app is installed, so there's no demo-pairing step needed.

---

## 0. App Store Description — paste-ready

Paste this into App Store Connect → App Store → Description. Kept in sync with what
actually ships — no Ambient Awareness bullet (that feature was designed, then removed
from the app entirely, not just hidden — see PLAN.md's "Ambient Awareness removed"
section), and Wake Window described as the deterministic gentle-to-loud ramp it
actually is, not a sensing feature.

```
Wakes you at the right moment, not just the loud one.

Most alarms only know one thing: the time you told them. BuzzBee also knows sleep science — waking you mid-deep-sleep costs real grogginess, so instead of one jarring instant, BuzzBee starts ringing gently and builds to full volume over your wake window, never any later than the hard deadline you set.

WAKE WINDOW
Instead of one fixed time, set a window (like 6:30–7:00 AM). BuzzBee starts ringing gently the moment the window opens and gradually builds to full volume by your hard deadline — so you ease awake instead of getting jolted awake, and it never rings later than the deadline you set.

BUILT TO ACTUALLY RING
BuzzBee uses Apple's AlarmKit, so your alarm rings at full volume, through Silent mode and Focus, even if the app has been fully closed. No missed mornings because an app got swiped away.

SIX WAYS TO PROVE YOU'RE AWAKE
No snooze button, no shortcuts. Pick the mission that works for you: solve a quick math problem, clap, shake your phone, make a sustained sound, tap the screen, or let BuzzBee pick a random one each morning.

RECORD YOUR OWN ALARM SOUND
Your voice, a song clip, anything — record up to 15 seconds and use it instead of the built-in tones. It's saved on your device only, never uploaded anywhere.

LOOKS AFTER YOUR WHOLE NIGHT
• Bedtime Reminder — a calm nudge before you sleep
• Calendar Auto-Shift — a heads-up if tomorrow's first event conflicts with your wake window

SEE YOUR PATTERNS
A real calendar in History — tap any day to see whether you finished the mission and how many alarms rang.

BUILT TO BE PRIVATE
• No account, no sign-in, no server — everything stays on your device
• No ads, no analytics, no tracking SDKs of any kind
• The microphone only ever reads a volume level, except for sounds you deliberately record yourself
• One tap in Settings deletes everything BuzzBee has ever stored about you
• Nothing is ever sold, because nothing is ever collected

Wakes you at the right moment, not just the loud one.
```

## 1. App Review Information — paste-ready notes

Paste this into App Store Connect → App Review Information → Notes (version 1.0.1).
The field caps at 4,000 characters (line breaks count as one); this version is 3,838.

```
BuzzBee is a single-user app — no account, login, or server. Every feature is available right after install. No widgets: alarm alerts come from AlarmKit.

NEW IN 1.0.1:
• Clap & Buzz calibration (Settings → Sound & Haptics → Calibrate Clap / Calibrate Buzz): BuzzBee listens to the room for 2s, then to 3 claps or one long "bzzzz", and saves a loudness threshold so those missions hear the user, not room noise. Only that one number per mission is stored — no audio. Hold a row to reset it.
• A slept-through alarm now rings again (see below).
• Fixed: an alarm could ring again after its mission was finished.

QUICK TEST: create an alarm 2 minutes ahead. To try any mission without waiting, open Choose Mission while editing an alarm and tap Preview — a silent copy of the ringing screen.

CORE MECHANIC: a "Wake Window" alarm (e.g. 6:30–7:00 AM) is started by Apple's AlarmKit at the window's start — even force-quit, through Silent mode and Focus — and ramps from gentle to full volume by the deadline. A fixed-time alarm (Wake Window off) rings at one time. No motion/sleep sensing.

MISSIONS: no snooze. Dismissing requires Math (1 problem), Clap ×50, Shake ×50, Buzz ×10, Tap ×100, or Random.

EXPECTED BEHAVIOR, NOT BUGS:
• Stop on the AlarmKit alert opens the mission instead of silencing the alarm. If the mission is abandoned (app closed or phone locked), it re-rings ~90s later.
• If an alarm is ignored entirely, it rings again 10, 20 and 30 min later (Wake Window: at the deadline, then +10 and +20 min). Finishing the mission cancels these.
• While the mission screen rings, volume is held at max; the volume buttons can't lower it. It's restored after dismissal.

MINIMUM OS: iOS 26.1+ (AlarmKit doesn't exist before iOS 26).

MICROPHONE: Clap and Buzz missions, and their calibration, read only a live volume level — no audio is stored. "Record Your Own Alarm Sound" (Settings → Sound & Haptics) records up to 15s as an alarm tone, saved on-device only, never uploaded. With the app fully closed, the lock-screen alert plays a built-in tone (iOS allows only bundled sounds there).

CALENDAR: "Calendar Auto-Shift" (on by default) reads only tomorrow's earliest timed event and suggests a wake-window shift if there's under 45 min before the deadline. It never edits the calendar. To test: add an event for tomorrow at/before an enabled alarm's deadline, then open the app between 1:00 PM and 11:59 PM (once per day — force-quit and relaunch if already opened since 1:00 PM). A "Shift your wake window?" notification appears within seconds.

RESET DATA: Settings → Danger Zone → Reset Data (type CONFIRM) deletes all alarms, history, custom sounds, calibration and settings, cancels pending alarms, and returns to onboarding.

BACKGROUND MODES: "audio" keeps a ringing alarm's sound looping in the background, and a near-silent session keeps the app's alarm and calendar timers running. Nothing network-related. Notifications are all local.

PRIVACY: no account, server, analytics or tracking SDK. Nothing leaves the device except opening a Support/Privacy/Terms link.

Videos: https://drive.google.com/drive/folders/1wEgA_JkiuvTpFZUxrdq3JIe7kU0nqE_c?usp=sharing
1 — Fixed-time alarm, phone on Silent, app force-quit: still rings at full volume.
2 — Wake Window alarm, app force-quit: starts quietly, builds to full volume by the deadline.
3 — Buzz mission: the mic reads a volume level only; nothing is recorded.
4 — A custom sound recorded in Airplane Mode: saved on-device only.
5 — Calendar Auto-Shift: a conflicting event, app opened after 1:00 PM, notification appears.
6 — Bedtime Reminder notification opens the breathing screen.
7 — Reset Data with CONFIRM returns the app to onboarding.
8 — New in 1.0.1, Clap & Buzz calibration: https://drive.google.com/file/d/1DIgTJT52FonqYdIqU9kFrHumJWfjJvHD/view?usp=sharing
```

## 2. Permissions declared, and why

| Permission | Declared via | User-facing string | Feature(s) |
|---|---|---|---|
| AlarmKit | `NSAlarmKitUsageDescription` (app.json `ios.infoPlist`) | "BuzzBee schedules your alarms with AlarmKit so they can still ring — and open BuzzBee straight to your mission — even if the app is fully closed." | The hard-deadline alarm itself |
| Microphone | `expo-audio` plugin's `microphonePermission` | "BuzzBee listens for claps and buzzing sounds to dismiss the alarm — that audio is analyzed on-device only and never recorded or uploaded. If you record your own alarm sound, that recording is saved only on your device and never uploaded." | Clap/Buzzzzz missions, Record Your Own Alarm Sound. |
| Calendar | `expo-calendar` plugin's `calendarPermission` | "BuzzBee checks tomorrow's first calendar event so it can suggest shifting your wake window if there's a conflict." | Calendar Auto-Shift (on by default, permission requested the first time the evening check actually needs it) |
| Notifications | Runtime prompt (no Info.plist string required) | — | Backup alarm notification, Bedtime Reminder, Calendar nudge |
| Motion (accelerometer) | None needed — raw `CMAccelerometer` data doesn't require an iOS usage-description prompt | — | Shake mission only |

Every permission string above was double-checked against what the feature actually
does right before this submission (the microphone string in particular was updated
this cycle to disclose the new recording feature — see §3).

## 3. Likely rejection risks — pre-empted

| Risk | Guideline | Mitigation |
|---|---|---|
| Reviewer force-quits the app expecting Wake Window to fail, since that's the common pattern for competing "smart alarm" apps | 2.1 (App Completeness) | It won't fail — both a Wake Window's gentle start and a fixed-time alarm's ring are scheduled through AlarmKit, so they survive a full force-quit identically to the hard deadline always has. There's no foreground/screen-on requirement left in this build; the screen recording demonstrates this directly (see `SCREEN-RECORDING-GUIDE.md`). |
| Microphone usage string doesn't match actual behavior | 5.1.1, 2.3.1 (Accuracy) | `microphonePermission` in `app.json` discloses both live-use cases (Clap/Buzzzzz missions, Record Your Own Alarm Sound) and that recordings stay on-device. A stale clause referencing "Ambient Awareness" (a feature designed, then fully removed from the app before this build) was caught and cut from the string during this review-doc pass — the string no longer describes anything the app doesn't do. Verify the *submitted build* actually contains this string (rebuild after any later app.json edit). |
| `"audio"` background mode declared without an obvious matching feature | 2.5.4 (Background modes must match use) | Justified in App Review notes: keeps an in-progress ring's sound looping while backgrounded, and a near-silent keep-alive session keeps the app's own JS timers (evening calendar check, alarm trigger loop) running while backgrounded rather than suspended. Nothing networked. |
| Reviewer's test device/simulator is on an iOS version below 26.1 | 2.1 (App Completeness — app fails to install) | Called out explicitly and first in the App Review notes: **iOS 26.1+ required**, because AlarmKit doesn't exist before it. |
| Placeholder/stale screenshots or metadata | 2.3, 2.3.3 (Accurate metadata; screenshots must show the app in use) | `app-store/promo-6.9/` are original marketing graphics (not device screenshots). **Promo slides: current** — regenerated 2026-09-23 via `promo-src/build.mjs`. That pass removed two false claims ("senses you're already stirring" / "finds the moment" on 02 and 07 — Wake Window is a fixed quiet-to-loud ramp, no sensing), dropped the removed Task After You're Awake feature from 04, moved 05 onto the real dark ringing screen, and softened 08 so it no longer implies a custom recording plays on the closed-app lock-screen alert (iOS only allows bundled sounds there). **Raw device screenshots: deleted** (2026-09-23) because they predated the redesign. That leaves only promo graphics, and guideline 2.3.3 expects screenshots to show the app in use, not just title art. Slides 05 and 08 mirror real screens, but the rest are marketing art — capturing a few real device screenshots (Home, the ringing screen, Choose Mission) to upload alongside the promos is the safer set. |
| No account / no data collection claims don't match reality | 5.1.1, App Privacy nutrition label | True as of this writing — no login, no server, no analytics SDK anywhere in the dependency tree. Nutrition label should read "Data Not Collected" across the board; re-verify this table if a backend/account feature is ever added later (see PLAN.md's deferred Pro/group-sharing tier, which is explicitly not part of this build). |

## 4. App Privacy nutrition label (App Store Connect)

Answer **"No data collected"** — BuzzBee has no server, no account, no analytics,
and no third-party SDKs that transmit anything. This is the simplest possible
answer and it's accurate; don't over-declare data types "just in case."

## 5. Category & age rating

- **Category:** Utilities or Health & Fitness (primary) — no strong reason to
  prefer one; pick based on how you want BuzzBee to be browsed/discovered.
- **Age rating:** almost certainly 4+. No user-generated content is shared with
  anyone else (custom recordings stay local to the recording device), no account
  system, no social features.

## 6. Before you submit — checklist

- [ ] Confirm the build actually targets iOS 26.1+ (`eas.json` / Xcode project) and that you're testing App Review Information's claims against *this exact build*.
- [ ] Re-read `microphonePermission` in `app.json` against the built IPA's Info.plist (a prebuild can go stale if you edit app.json after the last `expo prebuild`).
- [ ] Verify `support.html` / `privacy.html` / `terms.html` are live and reflect the Record Your Own Alarm Sound feature (updated this cycle — see buzzbee-docs repo).
- [ ] Decide on screenshots: upload `promo-6.9/` (skip `test.png`), ideally plus a few fresh 1320×2868 device captures of the real app (Home, ringing screen, Choose Mission) — see §3's 2.3.3 note. The old raw set was deleted as out of date.
- [ ] Watch the screen recording once yourself before attaching it (see `SCREEN-RECORDING-GUIDE.md`) — confirm it actually shows the alarm surviving a real force-quit, not just a backgrounded app.
- [ ] Paste the §1 notes into App Review Information, attach the recording, and submit.
