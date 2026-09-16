# BuzzBee — App Store review guide

Reference format borrowed from `MiLuv`'s `docs/RELEASE.md` (§5 App Review Information,
§8 pre-empted rejection reasons) and `docs/app-review-2.5.4-response.md` — same idea,
adapted to BuzzBee's actual risk areas. BuzzBee is simpler to review than MiLuv in one
big way: **no account, no login, no server** — every feature is available the moment
the app is installed, so there's no demo-pairing step needed.

---

## 0. App Store Description — paste-ready

Paste this into App Store Connect → App Store → Description. Kept in sync with what
actually ships — no Ambient Awareness bullet (still "Coming Soon," not active in this
build — see §1's MICROPHONE note below), and Wake Window described as the deterministic
gentle-to-loud ramp it actually is, not a sensing feature.

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

TASK AFTER YOU'RE AWAKE
Chain reminders to any alarm — "Taking a bath," "Walk for 10 minutes," whatever your morning needs — each with its own time. They only remind you once you've actually woken up and finished your alarm's mission; if you never do, they stay quiet.

LOOKS AFTER YOUR WHOLE NIGHT
• Bedtime Reminder — a calm nudge before you sleep
• Calendar Auto-Shift — a heads-up if tomorrow's first event conflicts with your wake window

SEE YOUR PATTERNS
A real calendar in History — tap any day to see whether you finished the mission, how many alarms rang, and which follow-up tasks got done.

BUILT TO BE PRIVATE
• No account, no sign-in, no server — everything stays on your device
• No ads, no analytics, no tracking SDKs of any kind
• The microphone only ever reads a volume level, except for sounds you deliberately record yourself
• One tap in Settings deletes everything BuzzBee has ever stored about you
• Nothing is ever sold, because nothing is ever collected

Wakes you at the right moment, not just the loud one.
```

## 1. App Review Information — paste-ready notes

Paste this into App Store Connect → App Review Information → Notes.

```
BuzzBee is a single-user alarm app — there's no account, login, or server, so
there's nothing to demo-pair. Every feature is available immediately after install.

CORE MECHANIC: instead of one fixed time, an alarm can use "Wake Window" (e.g.
6:30–7:00 AM). BuzzBee uses Apple's AlarmKit to start the alarm reliably at the
window's start time, even if the app has been fully force-quit — full volume,
through Silent mode and Focus. It then rings gently and gradually builds to full
volume by the window's end (the hard deadline), all handled by AlarmKit and the
app's own escalation timer once launched — no motion/sleep sensing involved, and no
dependency on the app being open beforehand. A fixed-time alarm (Wake Window off)
works exactly the same way, just as one instant instead of a ramp.

MINIMUM OS: BuzzBee requires iOS 26.1 or later — AlarmKit, the framework behind the
reliable alarm, only exists starting iOS 26. Please test on a device or simulator
running iOS 26.1+; on an older OS the app cannot install.

MICROPHONE: used for two dismiss missions (Clap, Buzzzzz) — in both cases BuzzBee
only reads a live volume level, no audio is stored. ("Ambient Awareness," a
planned pre-ring room-noise check, is shown in Settings as "Coming Soon" and is
not active in this build.) Separately, an optional "Record Your Own Alarm
Sound" feature (Settings → Sound & Haptics, or an alarm's Choose a Sound screen)
lets a user record a real clip (up to 15 seconds) as their alarm tone. That
recording is written to local device storage only and is never uploaded anywhere.

CALENDAR: "Calendar Auto-Shift" is on by default (Settings → Smart Features) and
reads only the next day's earliest timed event to suggest shifting an alarm's wake
window if it would conflict (less than 45 minutes of buffer before the alarm's
hard deadline) — it never modifies the calendar itself.

To see it in action: add a calendar event for tomorrow that starts at or before
one of your enabled alarms' hard deadline, then foreground the app after 6:00 PM
local time (the check only runs in the evening, once per calendar day — force-quit
and relaunch if you already opened the app once tonight before adding the event).
A local notification appears within a few seconds: "Shift your wake window? —
Tomorrow's [event title] is at [time] — move your window to [time]–[time]?" There
is currently no way to enable silent auto-apply from the UI, so this confirm-first
notification is the only reachable behavior — tapping it does not need to be
followed up on for review purposes, seeing the notification itself is the proof
the feature works.

TASK AFTER YOU'RE AWAKE: an alarm can have up to 5 follow-up tasks (e.g. "Taking a
bath," each with its own time). These are plain local notifications, NOT a second
AlarmKit alarm — they don't ring through Silent mode, have no full-screen alert, and
no dismiss mission. A task's notification only stays scheduled if the alarm's own
mission actually gets completed (it's provisionally cancelled the moment the alarm
rings, then restored on a genuine dismiss) — so a reviewer testing this should
complete the alarm's mission first, then wait for the task's own time. Tapping a
task's notification opens a small "Did you finish this?" dialog; ignoring the
notification is also a valid, intended outcome (silently recorded as not completed).

RESET DATA: Settings → Danger Zone → Reset Data deletes every alarm, all wake/task
history, custom sounds, and settings, cancels every pending native
alarm/notification, and returns the app to its just-installed state (onboarding
included). Confirmed by typing the word CONFIRM into a native text-input alert
(`Alert.prompt`, iOS-only — fine, since BuzzBee is iOS-only) before it proceeds;
there's no account to re-authenticate against, so this stands in for one.

BACKGROUND MODES: "audio" is declared because a ringing alarm's sound must keep
looping if the app is backgrounded mid-ring (not force-quit) rather than cutting
out; a near-silent keep-alive audio session also runs whenever any alarm is
enabled, so the app's own JS timers (the evening calendar check, the fixed-time/
Wake Window trigger loop) keep working while backgrounded rather than being
suspended by iOS. Neither does anything network-related.

PRIVACY: no user account, no server, no analytics or tracking SDK of any kind. No
data ever leaves the device except when the user taps a Support/Privacy/Terms link
(static webpages, not an API).

Support: https://cmtania.github.io/buzzbee-docs/support.html
Privacy Policy: https://cmtania.github.io/buzzbee-docs/privacy.html
Contact: tania.dev.ph@gmail.com
```

## 2. Permissions declared, and why

| Permission | Declared via | User-facing string | Feature(s) |
|---|---|---|---|
| AlarmKit | `NSAlarmKitUsageDescription` (app.json `ios.infoPlist`) | "BuzzBee schedules your alarms with AlarmKit so they can still ring — and open BuzzBee straight to your mission — even if the app is fully closed." | The hard-deadline alarm itself |
| Microphone | `expo-audio` plugin's `microphonePermission` | "BuzzBee listens for claps and buzzing sounds to dismiss the alarm, and can optionally sense room noise before ringing — that audio is analyzed on-device only and never recorded or uploaded. If you record your own alarm sound, that recording is saved only on your device and never uploaded." | Clap/Buzzzzz missions, Record Your Own Alarm Sound. (The permission string's "sense room noise before ringing" clause describes Ambient Awareness, currently disabled — see §1's note above; harmless to leave as-is since it doesn't claim anything false, just an inactive capability.) |
| Calendar | `expo-calendar` plugin's `calendarPermission` | "BuzzBee checks tomorrow's first calendar event so it can suggest shifting your wake window if there's a conflict." | Calendar Auto-Shift (on by default, permission requested the first time the evening check actually needs it) |
| Notifications | Runtime prompt (no Info.plist string required) | — | Backup alarm notification, Bedtime Reminder, Calendar nudge, Task after you're awake reminders |
| Motion (accelerometer) | None needed — raw `CMAccelerometer` data doesn't require an iOS usage-description prompt | — | Shake mission only |

Every permission string above was double-checked against what the feature actually
does right before this submission (the microphone string in particular was updated
this cycle to disclose the new recording feature — see §3).

## 3. Likely rejection risks — pre-empted

| Risk | Guideline | Mitigation |
|---|---|---|
| Reviewer force-quits the app expecting Wake Window to fail, since that's the common pattern for competing "smart alarm" apps | 2.1 (App Completeness) | It won't fail — both a Wake Window's gentle start and a fixed-time alarm's ring are scheduled through AlarmKit, so they survive a full force-quit identically to the hard deadline always has. There's no foreground/screen-on requirement left in this build; the screen recording demonstrates this directly (see `SCREEN-RECORDING-GUIDE.md`). |
| Microphone usage string doesn't match actual behavior now that real audio can be recorded | 5.1.1, 2.3.1 (Accuracy) | Already fixed: `microphonePermission` in `app.json` explicitly discloses the new recording feature and that recordings stay on-device. Verify the *submitted build* actually contains this string (rebuild after any later app.json edit). |
| `"audio"` background mode declared without an obvious matching feature | 2.5.4 (Background modes must match use) | Justified in App Review notes: keeps an in-progress ring's sound looping while backgrounded, and a near-silent keep-alive session keeps the app's own JS timers (evening calendar check, alarm trigger loop) running while backgrounded rather than suspended. Nothing networked. |
| Reviewer's test device/simulator is on an iOS version below 26.1 | 2.1 (App Completeness — app fails to install) | Called out explicitly and first in the App Review notes: **iOS 26.1+ required**, because AlarmKit doesn't exist before it. |
| Placeholder/stale screenshots or metadata | 2.3 (Accurate metadata) | `app-store/screenshots-6.9-raw/` are real device captures; `app-store/promo-6.9/` are original marketing graphics built from the app's real logo/colors/copy (not screenshots, but not misleading either — every feature they depict is real). Re-capture the raw set if UI changes before submitting. |
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
- [ ] Watch the screen recording once yourself before attaching it (see `SCREEN-RECORDING-GUIDE.md`) — confirm it actually shows the alarm surviving a real force-quit, not just a backgrounded app.
- [ ] Paste the §1 notes into App Review Information, attach the recording, and submit.
