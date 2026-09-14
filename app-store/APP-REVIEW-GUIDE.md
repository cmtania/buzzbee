# BuzzBee — App Store review guide

Reference format borrowed from `MiLuv`'s `docs/RELEASE.md` (§5 App Review Information,
§8 pre-empted rejection reasons) and `docs/app-review-2.5.4-response.md` — same idea,
adapted to BuzzBee's actual risk areas. BuzzBee is simpler to review than MiLuv in one
big way: **no account, no login, no server** — every feature is available the moment
the app is installed, so there's no demo-pairing step needed.

---

## 1. App Review Information — paste-ready notes

Paste this into App Store Connect → App Review Information → Notes.

```
BuzzBee is a single-user alarm app — there's no account, login, or server, so
there's nothing to demo-pair. Every feature is available immediately after install.

CORE MECHANIC: instead of one fixed time, an alarm has a wake window (e.g.
6:30–7:00 AM) and a hard deadline. BuzzBee uses Apple's AlarmKit to guarantee the
hard-deadline ring even if the app has been fully force-quit — full volume, through
Silent mode and Focus. Separately, an optional "Smart Wake" feature watches the
device's motion sensor for signs of lighter sleep and can ring earlier and more
gently. This early-detection part specifically requires BuzzBee to be running
(foreground or background) — if the app is fully force-quit, the alarm still
reliably rings at the hard deadline via AlarmKit, just without the earlier/gentler
part. This distinction is explained in-app (Add/Edit Alarm's Smart Wake note) and
in our Support FAQ (link below).

MINIMUM OS: BuzzBee requires iOS 26.1 or later — AlarmKit, the framework behind the
reliable alarm, only exists starting iOS 26. Please test on a device or simulator
running iOS 26.1+; on an older OS the app cannot install.

MICROPHONE: used for three dismiss missions (Clap, Buzzzzz) and an optional
pre-ring "Ambient Awareness" check — in all three cases BuzzBee only reads a live
volume level, no audio is stored. Separately, an optional "Record Your Own Alarm
Sound" feature (Settings → Sound & Haptics, or an alarm's Choose a Sound screen)
lets a user record a real clip (up to 15 seconds) as their alarm tone. That
recording is written to local device storage only and is never uploaded anywhere.

CALENDAR: optional, off by default — reads only the next day's earliest event time
to suggest shifting the wake window; never modifies the calendar.

BACKGROUND MODES: "audio" is declared because a ringing alarm's sound must keep
looping if the app is backgrounded mid-ring (not force-quit) rather than cutting
out; background task scheduling is used to periodically re-arm the "BuzzBee is
closed" reminder notification (see below) and the Smart Wake monitor — neither
does anything network-related.

THE "BuzzBee is closed" NOTIFICATION: while the app is open (foreground or
background), it continuously re-arms a local notification a few minutes into the
future. If the app is then force-quit, nothing cancels that pending notification,
so it fires on its own — telling the user Smart Wake's early detection won't work
until they reopen the app. This is a one-time-per-closure heads-up, not a
recurring or promotional notification; you may see it appear during testing if you
force-quit the app, which is expected.

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
| Microphone | `expo-audio` plugin's `microphonePermission` | "BuzzBee listens for claps and buzzing sounds to dismiss the alarm, and can optionally sense room noise before ringing — that audio is analyzed on-device only and never recorded or uploaded. If you record your own alarm sound, that recording is saved only on your device and never uploaded." | Clap/Buzzzzz missions, Ambient Awareness, Record Your Own Alarm Sound |
| Calendar | `expo-calendar` plugin's `calendarPermission` | "BuzzBee checks tomorrow's first calendar event so it can suggest shifting your wake window if there's a conflict." | Calendar Auto-Shift (optional, off by default) |
| Notifications | Runtime prompt (no Info.plist string required) | — | Hard-deadline backup notification, Bedtime Reminder, Calendar nudge, "BuzzBee is closed" reminder |
| Motion (accelerometer) | None needed — raw `CMAccelerometer` data doesn't require an iOS usage-description prompt | — | Smart Wake's light-sleep sampling, Shake mission |

Every permission string above was double-checked against what the feature actually
does right before this submission (the microphone string in particular was updated
this cycle to disclose the new recording feature — see §3).

## 3. Likely rejection risks — pre-empted

| Risk | Guideline | Mitigation |
|---|---|---|
| Reviewer force-quits the app, expects **Smart Wake's early ring** to still fire, and reports the alarm as broken | 2.1 (App Completeness) | The hard-deadline ring (AlarmKit) *does* still fire fully closed — only the early/gentle part needs the app open. Spelled out in the App Review notes above, in-app (Add/Edit's Smart Wake caveat), and demonstrated in the screen recording (see `SCREEN-RECORDING-GUIDE.md`). |
| Microphone usage string doesn't match actual behavior now that real audio can be recorded | 5.1.1, 2.3.1 (Accuracy) | Already fixed: `microphonePermission` in `app.json` explicitly discloses the new recording feature and that recordings stay on-device. Verify the *submitted build* actually contains this string (rebuild after any later app.json edit). |
| Reviewer sees "BuzzBee is closed" and assumes it's a re-engagement / spam notification pattern | 4.5.4 (push notifications not required for use) / general confusion | It's a one-shot local reminder, off by default in the sense that it only appears if the user force-quits — explained plainly in the App Review notes so it isn't a surprise mid-test. |
| `"audio"` and background-task modes declared without an obvious matching feature | 2.5.4 (Background modes must match use) | Both justified in App Review notes: `audio` keeps an in-progress ring's sound looping while backgrounded; background-task re-arms the closed-app reminder and Smart Wake's monitor. Neither does anything networked. |
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
