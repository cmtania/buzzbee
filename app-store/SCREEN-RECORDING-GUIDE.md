# BuzzBee — screen recording guide for App Review

Same idea as MiLuv's `docs/app-review-2.5.4-response.md`: a short recording that
removes any doubt about the app's highest-scrutiny claims, attached alongside the
App Review Information notes in `APP-REVIEW-GUIDE.md`. For BuzzBee, the headline
claim is **"the alarm still rings — at full volume, through Silent mode — even if
the app has been fully force-quit."** That's the one thing a reviewer cannot verify
just by reading a description, and it's exactly the kind of claim App Review is
trained to be skeptical of for alarm apps, so show it happening, don't just say it.

**How to record:** use iOS's built-in screen recorder (Control Center → Screen
Recording), not an external camera. It captures the device's actual audio output
directly, which is what proves the alarm is genuinely loud/audible — a camera mic
recording a phone from across the room is much less convincing and can even sound
quiet by accident. Keep the whole thing to 2–4 minutes where possible, trimming
segments rather than letting the whole recording sprawl — a reviewer will not
watch a 15-minute video.

Set the device's date/time visible in the status bar clock for all segments —
timestamps are your evidence that nothing happened until the alarm's actual time.

---

## Segment 1 (the important one): survives force-quit, full volume, Silent mode

This is the segment that matters most. Don't skip or rush it.

1. Show the Silent-mode switch (or Control Center's ring/silent toggle) flipped to
   **Silent**, on camera, so there's no question the phone was silenced.
2. Open BuzzBee, create an alarm with **Wake Window off** (fixed-time) and the
   deadline set about 2 minutes from now (so the recording doesn't need to be
   long). Show the alarm saved on Home with the correct time.
3. Open the app switcher and **swipe BuzzBee away** — a real force-quit, shown
   clearly on camera, not just pressing Home.
4. Lock the device (or sit on the Home Screen) and wait, without touching
   BuzzBee again, until the alarm's time.
5. **The alarm rings** — audibly, at full volume, despite the Silent switch still
   being on — with the Lock Screen / Dynamic Island alert visible. This is the
   moment that matters; make sure it's unambiguous on the recording.
6. Tap the alert to open BuzzBee — it should launch straight to the
   ringing/mission screen, not the Home screen.
7. Complete the dismiss mission (Tap or Math is fastest on camera) and show the
   alarm actually stops.

## Segment 2: Wake Window's gentle-to-loud ramp — also surviving force-quit

Shows the _other_ half of the story: a Wake Window alarm behaves exactly like the
fixed-time one in segment 1 (force-quit doesn't break it — it's the same AlarmKit
mechanism, just triggered at the window's start instead of a single fixed time),
but rings gently at first and audibly builds to full volume rather than blasting
instantly.

1. Create or edit an alarm with **Wake Window on**, window opening in about 1
   minute and a 2-minute-wide window (e.g. now+1min to now+3min).
2. Open the app switcher and **swipe BuzzBee away** — force-quit again, shown
   clearly on camera.
3. Wait, without touching BuzzBee, until the window opens.
4. **The alarm starts ringing quietly** — noticeably softer than segment 1's
   full-volume ring — with the Lock Screen alert visible, despite the app having
   been force-quit the whole time.
5. Keep the recording running and let it continue: the volume audibly climbs over
   the next couple of minutes, reaching full volume by the window's end (the hard
   deadline) — the same escalation shown in the in-app status pill's countdown.
6. Dismiss the mission to stop it.

## Segment 3: mic-based missions only read a volume level

1. Let an alarm ring with the **Clap** or **Buzzzzz** mission selected.
2. Perform the claps / buzzing sound on camera, show the counter incrementing,
   and dismiss it.

## Segment 4: Record Your Own Alarm Sound — and prove it never leaves the device

Do this segment with the device in **Airplane Mode** — turned on visibly at the
start of the segment. It's the single most convincing way to show "this recording
never gets uploaded anywhere": there's no network connection available for it to
travel over, on camera, while the feature is used start to finish.

1. Turn on Airplane Mode, shown on screen (Control Center or Settings).
2. Go to **Settings → Sound & Haptics** (or an alarm's **Choose a Sound** screen)
   and tap **Record a New Sound**.
3. Tap the mic button, say something for a few seconds, tap stop.
4. Tap **Preview** — it loops back the exact clip just recorded.
5. Tap **Save My Sound**, type a name in the prompt that appears, confirm.
6. Show the new recording now listed under **Your Sounds**, selectable and
   playable like any built-in tone, with a delete (trash) icon next to it.
7. Optionally: delete it, showing the row disappears immediately.

## Segment 5: Calendar Auto-Shift catching a real conflict

This one is gated by real-world timing, so plan the recording session around it
rather than trying to force it — see `APP-REVIEW-GUIDE.md`'s CALENDAR section for
the exact rule (checks only run between 1:00 PM and 11:59 PM local time, once per
calendar day).

1. Beforehand, in the **iOS Calendar app**, add a real timed event for **tomorrow**
   that starts at or before one of your enabled alarms' hard deadline (so it's an
   unambiguous conflict — no need to cut it close).
2. Confirm **Settings → Smart Features → Calendar Auto-Shift** is on (it's on by
   default).
3. Make sure it's between 1:00 PM and 11:59 PM local time on camera — the status
   bar clock is your proof. (If you already opened the app after 1:00 PM today
   before adding the event, force-quit and relaunch first, since the check only
   runs once per day.)
4. Foreground/open BuzzBee — the check runs automatically within a few seconds of
   launch, no button to tap.
5. A local notification appears: **"Shift your wake window?"** with the
   conflicting event's name and the suggested new window times — capture it on the
   Lock Screen or in Notification Center.

There's no UI path to a silent auto-apply variant (see `APP-REVIEW-GUIDE.md`), so
this confirm-first notification appearing is the complete proof — no need to tap
into it or show anything beyond the notification itself.

## Segment 6: Bedtime Reminder

## Segment 7: Reset Data

---

## What to write in the attached notes (paste alongside the recording)

```
Attached: screen recordings proving BuzzBee's core claims.

1 — A fixed-time alarm (Wake Window off) is set, the phone is switched to Silent, and BuzzBee is force-quit from the app switcher. At the scheduled time it still rings at full volume, with no interaction with BuzzBee in between.

2 — A Wake Window alarm is set and BuzzBee is force-quit the same way. It starts ringing quietly when the window opens and builds to full volume by the hard deadline.

3 — The Buzz mission dismisses a ringing alarm by listening for a sustained "bzzzz" sound. The microphone only reads a live volume level; no audio is recorded or stored.

4 — A custom alarm sound is recorded (Settings → Sound & Haptics → Record a New Sound) with Airplane Mode on the whole time. With no network available, this shows the recording is saved only on the device and never uploaded.

5 — A calendar event that conflicts with an alarm's hard deadline is added for tomorrow, and BuzzBee is opened between 1:00 PM and 11:59 PM (visible on the status bar clock). Within seconds a "Shift your wake window?" notification appears, with no other interaction.

6 — A Bedtime Reminder is set, BuzzBee is closed, and the reminder notification arrives. Tapping it opens BuzzBee straight to the Bedtime breathing screen.

7 — In Settings → Danger Zone, Reset Data is tapped and CONFIRM is typed. Every alarm, all alarm history, custom sounds and settings are deleted, and the app returns to its first-launch onboarding.
```

Keep the numbers matching the order of the videos you attach, and attach each as a
video file (or a link if App Store Connect's notes field doesn't accept an
attachment directly — check the current upload limits when you get there), and
reference it in the App Review Information notes from `APP-REVIEW-GUIDE.md`.
