# BuzzBee — screen recording guide for App Review

Same idea as MiLuv's `docs/app-review-2.5.4-response.md`: a short recording that
removes any doubt about the app's highest-scrutiny claims, attached alongside the
App Review Information notes in `APP-REVIEW-GUIDE.md`. For BuzzBee, the headline
claim is **"the alarm still rings — at full volume, through Silent mode — even if
the app has been fully force-quit."** That's the one thing a reviewer cannot verify
just by reading a description, and it's exactly the kind of claim App Review is
trained to be skeptical of for alarm apps, so show it happening, don't just say it.
Segment 6 covers a second, subtler risk: Task After You're Awake's deliberately
conditional firing (see its own section below) could read as broken rather than
intentional if a reviewer stumbles into it without context.

**How to record:** use iOS's built-in screen recorder (Control Center → Screen
Recording), not an external camera. It captures the device's actual audio output
directly, which is what proves the alarm is genuinely loud/audible — a camera mic
recording a phone from across the room is much less convincing and can even sound
quiet by accident. Keep the whole thing to 2–4 minutes where possible; Segment 6
makes that tight, so trim the others rather than letting the whole recording sprawl
— a reviewer will not watch a 15-minute video.

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

Shows the *other* half of the story: a Wake Window alarm behaves exactly like the
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
the exact rule (checks only run after 6:00 PM local time, once per calendar day).

1. Beforehand, in the **iOS Calendar app**, add a real timed event for **tomorrow**
   that starts at or before one of your enabled alarms' hard deadline (so it's an
   unambiguous conflict — no need to cut it close).
2. Confirm **Settings → Smart Features → Calendar Auto-Shift** is on (it's on by
   default).
3. Make sure it's actually after 6:00 PM local time on camera — the status bar
   clock is your proof. (If you already opened the app once tonight before adding
   the event, force-quit and relaunch first, since the check only runs once per
   day.)
4. Foreground/open BuzzBee — the check runs automatically within a few seconds of
   launch, no button to tap.
5. A local notification appears: **"Shift your wake window?"** with the
   conflicting event's name and the suggested new window times — capture it on the
   Lock Screen or in Notification Center.

There's no UI path to a silent auto-apply variant (see `APP-REVIEW-GUIDE.md`), so
this confirm-first notification appearing is the complete proof — no need to tap
into it or show anything beyond the notification itself.

## Segment 6: Task After You're Awake — only fires if the mission was actually completed

This one earns its spot here for the opposite reason from the others: it's not
proving a claim works, it's pre-empting a reviewer concluding the feature is
*broken* when it behaves exactly as designed. A task's notification is
provisionally cancelled the instant its alarm starts ringing, and only restored if
the mission is genuinely completed — so a reviewer who lets an alarm ring out
without dismissing it, then waits for the task's time, will correctly see nothing
happen. Without this segment, that reads as a bug report waiting to happen.

**Part A — mission completed, task fires:**
1. Create an alarm with **Wake Window off**, deadline ~2 minutes out. On the same
   Add/Edit screen, scroll to **Task After You're Awake** and tap **+ Add Task** to
   add one task scheduled ~2 minutes after the deadline.
2. Let the alarm ring and **complete the mission**.
3. Wait for the task's time — a plain notification arrives (no full-screen alert,
   no Silent-mode override — this is deliberately just a normal local notification,
   not a second alarm). Tap it — a small **"Did you finish this?"** dialog opens.

**Part B — mission NOT completed, task correctly stays silent:**
1. Create a second alarm + task pair the same way.
2. Let the alarm ring, but this time **do not** complete the mission (let it keep
   ringing, or force-quit and don't reopen).
3. Wait past the task's scheduled time on camera, with the status bar clock
   visible — **no task notification arrives**. This silence is the point of the
   segment; hold the shot long enough that it's unambiguous, not just a quick cut.

---

## What to write in the attached notes (paste alongside the recording)

```
Attached: a screen recording proving BuzzBee's core reliability claim and its
newest feature.

0:00–[x] — A fixed-time alarm (Wake Window off) is force-quit from the app
switcher, then rings at the scheduled time at full volume despite the device
being in Silent mode — recorded with no interaction with BuzzBee in between.

[x]–[y] — A second, Wake Window alarm is also force-quit, then starts ringing
quietly right at its window's start and audibly builds to full volume by its
deadline — showing the alarm survives a full close the same way in both modes,
with Wake Window adding the gentle ramp on top.

[y]–[z] — The Clap mission dismissing an alarm, showing the microphone is only
ever used to read a volume level.

[z]–[w] — Recording a custom alarm sound (Settings → Sound & Haptics → Record a
New Sound) entirely in Airplane Mode, to demonstrate the recording never has
network access to be uploaded over — it's saved to local device storage only.

[w]–[v] — Calendar Auto-Shift: a real event added for tomorrow that conflicts
with an alarm's hard deadline, checked after 6:00 PM local time (visible on the
status bar clock), producing a "Shift your wake window?" notification with no
interaction beyond opening the app.

[v]–end — Task After You're Awake: a follow-up task's notification arrives
normally once its alarm's mission is completed (tapping it opens a "Did you
finish this?" prompt), then a second example shows the same task type
deliberately NOT firing when the mission is left unfinished — this is intended
behavior (tasks only remind you once you're confirmed awake), not a bug.
```

Fill in the real timestamps once the recording is edited/trimmed, attach it as a
video file (or a link if App Store Connect's notes field doesn't accept an
attachment directly — check the current upload limits when you get there), and
reference it in the App Review Information notes from `APP-REVIEW-GUIDE.md`.
