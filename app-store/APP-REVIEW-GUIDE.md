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

Paste this into App Store Connect → App Review Information → Notes.

```
BuzzBee is a single-user app — no account, login, or server, so there's nothing
to demo-pair. Every feature is available right after install.

CORE MECHANIC: instead of one fixed time, an alarm can use a "Wake Window" (e.g.
6:30–7:00 AM). Apple's AlarmKit reliably starts it at the window's start — even
fully force-quit, through Silent mode and Focus — then it rings gently and ramps
to full volume by the window's end (the hard deadline). No motion/sleep sensing
involved, no dependency on the app being open. A fixed-time alarm (Wake Window
off) works the same way, just as one instant instead of a ramp.

MINIMUM OS: iOS 26.1+ required — AlarmKit (the framework behind the reliable
alarm) doesn't exist before iOS 26. Please test on a device/simulator running
26.1+; on an older OS the app cannot install.

MICROPHONE: used for two dismiss missions (Clap, Buzzzzz) — only a live volume
level is read, no audio stored. Separately, "Record Your Own Alarm Sound"
(Settings → Sound & Haptics, or an alarm's Choose a Sound screen) lets a user
record up to 15s as their alarm tone, saved to local storage only, never
uploaded.

CALENDAR: "Calendar Auto-Shift" (on by default, Settings → Smart Features)
reads only tomorrow's earliest timed event, suggesting a wake-window shift if
there's under 45 minutes of buffer before the alarm's hard deadline — it never
edits the calendar.

To test: add a calendar event for tomorrow starting at/before an enabled
alarm's hard deadline, then foreground the app between 1:00 PM and 11:59 PM
local time (once per calendar day — force-quit and relaunch if you already
opened the app since 1:00 PM today). A notification appears within seconds: "Shift your
wake window? — Tomorrow's [event] is at [time] — move to [time]–[time]?"
There's no auto-apply toggle in the UI yet, so this confirm-first notification
is the only reachable behavior — seeing it is proof enough; no need to tap it
through.

RESET DATA: Settings → Danger Zone → Reset Data deletes every alarm, all
history, custom sounds and settings, cancels every pending alarm/notification,
and returns the app to its just-installed state (onboarding included).
Requires typing CONFIRM into a native text-input alert first — there's no
account to re-authenticate against, so this stands in for one.

BACKGROUND MODES: "audio" is declared so a ringing alarm's sound keeps looping
if backgrounded mid-ring (not force-quit), and a near-silent keep-alive session
runs whenever any alarm is enabled so the app's own JS timers (evening calendar
check, alarm trigger loop) keep working while backgrounded instead of
suspended. Nothing network-related.

PRIVACY: no account, no server, no analytics or tracking SDK. No data leaves
the device except when tapping a Support/Privacy/Terms link (static webpages,
not an API).

Support: https://cmtania.github.io/buzzbee-docs/support.html
Privacy Policy: https://cmtania.github.io/buzzbee-docs/privacy.html
Contact: tania.dev.ph@gmail.com
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
