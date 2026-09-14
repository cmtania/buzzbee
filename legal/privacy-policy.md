---
title: Privacy Policy
---

# Privacy Policy for BuzzBee

**Effective date:** [INSERT DATE — e.g. the date you publish this page]

BuzzBee ("**BuzzBee**," "**we**," "**us**," or "**our**") is a smart alarm clock app for iOS (and, in the future, Android). This Privacy Policy explains what information the app uses, how it's processed, and what control you have over it.

**The short version:** BuzzBee is designed to work entirely on your device. It does not require an account, does not send your data to our servers, and does not use analytics, advertising, or tracking of any kind. The sections below explain exactly what each permission is for and, most importantly, what BuzzBee does *not* do with it.

---

## 1. Information BuzzBee Processes

BuzzBee does not collect personal information in the traditional sense — there is no sign-up, no account, and no server that stores your data. Everything below is processed **on your device only**, using the local database and sensors already built into your phone.

### 1.1 Alarm and app data (stored locally only)

- Alarms you create (times, repeat days, chosen dismiss mission, chosen sound)
- Wake history (when an alarm rang, when you dismissed it, whether it triggered early via Smart Wake or at the hard deadline)
- App settings (Wind-Down Mode, Calendar Auto-Shift, Ambient Awareness, sound and haptic preferences)

This data is stored in a local database on your device (via `expo-sqlite`) and is never transmitted to us or to any third party. If you delete the app, this data is deleted with it.

### 1.2 Motion sensor (accelerometer)

BuzzBee uses your device's built-in motion sensor for two features:

- **Smart Wake**: while a Smart Wake alarm's wake window is open, BuzzBee samples motion data to estimate whether you're in a lighter stage of sleep, so it can ring earlier and more gently instead of always waking you at the hard deadline.
- **Shake mission**: if you choose "Shake" as your dismiss method, motion data is used to count shakes.

Motion data is processed in memory, in real time, on your device. It is never stored, logged, or transmitted anywhere.

### 1.3 Microphone (on-device audio level only — never recorded)

BuzzBee uses your device's microphone for:

- **Ambient Awareness** (optional, off by default): before a Smart Wake alarm rings early, BuzzBee briefly checks the room's ambient noise level to detect whether you might already be up, so it can offer a lighter check-in instead of a full alarm.
- **Clap mission**: counts clap sounds to dismiss the alarm.
- **Buzzzzz mission**: detects a sustained loud sound to dismiss the alarm.
- **Ringer Check** (during setup): plays your chosen alarm sound so you can confirm your volume is loud enough.

**BuzzBee only ever reads a live volume/loudness level from the microphone — it does not listen to, interpret, store, or transmit the content of any sound or speech.** No audio recording is uploaded, saved permanently, played back, or shared with us or anyone else.

### 1.4 Calendar (read-only, optional)

If you enable **Calendar Auto-Shift** (off by default), BuzzBee reads the next day's earliest calendar event so it can suggest shifting your wake window if there's a scheduling conflict (for example, "Tomorrow's first event is at 8:00 — move your wake window to 5:45–6:15?"). BuzzBee only reads calendar event times for this purpose — it does not modify your calendar, and calendar data is never transmitted off your device.

### 1.5 Notifications

BuzzBee schedules **local notifications only** — these are generated and delivered entirely by your device's operating system. BuzzBee does not use a push notification service, and no notification content is routed through our servers (we don't have any). Local notifications are used for:

- The hard-deadline alarm safety net (in case the app is backgrounded or closed)
- Wind-Down Mode reminders (before and at your set bedtime)
- Calendar conflict nudges

---

## 2. Information We Do *Not* Collect

- No account or sign-in is required to use BuzzBee.
- We do not collect your name, email address, contacts, or precise location.
- We do not use analytics, crash reporting, advertising, or tracking SDKs of any kind.
- We do not sell, rent, or share any data with third parties, because none is collected in the first place.
- We do not record, store, or transmit microphone audio content.

---

## 3. Third-Party Services

BuzzBee's alarm sounds are sourced from [Mixkit](https://mixkit.co), used under their free commercial license. This is a static bundled asset, not a data-sharing relationship — no information about you or your usage is sent to Mixkit.

BuzzBee does not currently integrate any other third-party analytics, advertising, or data-processing service.

---

## 4. Future Features (Not Yet Active)

We're considering an optional **Pro** tier in a future update that would let you share your wake status with friends or family, using an account (Sign in with Apple / Google) and a cloud backend. **This feature does not exist in the current version of BuzzBee** — no account system, sign-in, or cloud sync is active today. If and when this ships, this Privacy Policy will be updated first, and using that feature will always be optional.

---

## 5. Data Retention and Deletion

Because all data stays on your device, you are always in control of it:

- You can delete an individual alarm or wake-history entry at any time within the app.
- Uninstalling BuzzBee permanently deletes all locally stored data (alarms, history, settings).
- Revoking microphone, motion, or calendar permissions in your device's Settings app immediately stops BuzzBee from accessing them — the app will simply disable the affected feature (with an in-app message) rather than crashing.

## 6. Children's Privacy

BuzzBee is not directed to children under 13, and we do not knowingly collect personal information from children. Because BuzzBee does not collect personal information from any user, this is true for users of all ages.

## 7. Changes to This Policy

We may update this Privacy Policy as BuzzBee's features change. If we make material changes, we'll update the effective date above and, where appropriate, notify you within the app.

## 8. Contact Us

If you have questions about this Privacy Policy or BuzzBee's data practices, contact us at:

**[INSERT SUPPORT EMAIL]**
