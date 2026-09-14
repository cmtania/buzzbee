# BuzzBee — screen recording guide for App Review

Same idea as MiLuv's `docs/app-review-2.5.4-response.md`: a short recording that
removes any doubt about the app's highest-scrutiny claim, attached alongside the
App Review Information notes in `APP-REVIEW-GUIDE.md`. For BuzzBee, that claim is
**"the alarm still rings — at full volume, through Silent mode — even if the app
has been fully force-quit."** That's the one thing a reviewer cannot verify just by
reading a description, and it's exactly the kind of claim App Review is trained to
be skeptical of for alarm apps, so show it happening, don't just say it.

**How to record:** use iOS's built-in screen recorder (Control Center → Screen
Recording), not an external camera. It captures the device's actual audio output
directly, which is what proves the alarm is genuinely loud/audible — a camera mic
recording a phone from across the room is much less convincing and can even sound
quiet by accident. Keep the whole thing to 2–4 minutes; a reviewer will not watch a
15-minute video.

Set the device's date/time visible in the status bar clock for all segments —
timestamps are your evidence that nothing happened until the alarm's actual time.

---

## Segment 1 (the important one): survives force-quit, full volume, Silent mode

This is the segment that matters most. Don't skip or rush it.

1. Show the Silent-mode switch (or Control Center's ring/silent toggle) flipped to
   **Silent**, on camera, so there's no question the phone was silenced.
2. Open BuzzBee, create an alarm with **Smart Wake off** and the hard deadline set
   about 2 minutes from now (so the recording doesn't need to be long). Show the
   alarm saved on Home with the correct time.
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

## Segment 2: Smart Wake's early detection (app open, not force-quit)

Shows the *other* half of the story — proving Smart Wake is a real, working
feature, and visually contrasting "app open" with segment 1's "app force-quit" so
the distinction in the App Review notes is obvious rather than just asserted.

1. Create or edit an alarm with **Smart Wake on** and a short window (e.g., a
   window opening now and a hard deadline ~3 minutes out).
2. While on the Add/Edit screen, let the camera linger a second on the on-screen
   note that explains Smart Wake needs the app open/backgrounded — this is the
   exact in-app copy the App Review notes reference.
3. **Background** the app with the Home button or gesture (it should still be
   visible in the app switcher — not force-quit this time).
4. Physically move/shake the phone a little to simulate the motion Smart Wake
   looks for.
5. The alarm rings early, before the hard deadline, showing the "Light sleep
   detected" status pill — demonstrating the early-ring path actually works when
   the app is alive, which is the condition the notes describe.

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

---

## What to write in the attached notes (paste alongside the recording)

```
Attached: a screen recording proving BuzzBee's core reliability claim and its
newest feature.

0:00–[x] — An alarm set with Smart Wake off is force-quit from the app switcher,
then rings at the scheduled hard deadline at full volume despite the device
being in Silent mode — recorded with no interaction with BuzzBee in between.

[x]–[y] — A second alarm with Smart Wake on rings early, before its hard
deadline, while the app is backgrounded (not force-quit) — showing the
distinction described in our review notes: the hard-deadline ring survives a
full close via AlarmKit; Smart Wake's earlier/gentler detection needs the app
alive.

[y]–[z] — The Clap mission dismissing an alarm, showing the microphone is only
ever used to read a volume level.

[z]–end — Recording a custom alarm sound (Settings → Sound & Haptics → Record a
New Sound) entirely in Airplane Mode, to demonstrate the recording never has
network access to be uploaded over — it's saved to local device storage only.
```

Fill in the real timestamps once the recording is edited/trimmed, attach it as a
video file (or a link if App Store Connect's notes field doesn't accept an
attachment directly — check the current upload limits when you get there), and
reference it in the App Review Information notes from `APP-REVIEW-GUIDE.md`.
