# BuzzBee — manual test plan (run on a real device before a production build)

Run this on a real iOS 26.1+ device (not the simulator — AlarmKit's force-quit
survival, real notifications, and Silent-mode ringing can't be verified any other
way). Use a physical device you can actually put down and walk away from for a few
of these. Check items off as you go; anything that fails, fix and re-run that
section (not the whole plan) before moving on.

Where a scenario says "force-quit," that means swiping the app away in the app
switcher — not just pressing Home. That distinction is the whole point of several
of these tests.

---

## 0. Before you start

- [ ] Fresh install (or Settings → Reset Data first — see §8) so you're testing
      real first-run behavior, not a device with weeks of leftover alarms/history.
- [ ] Device date/time is correct and set to your real timezone.
- [ ] Notifications permission and AlarmKit ("Alarms") permission both granted —
      onboarding should have asked for both; check Settings app → BuzzBee if unsure.
- [ ] Silent mode switch accessible (you'll flip it mid-test).

---

## 1. Onboarding (8 steps, since the deep-sleep science screen was removed)

- [ ] Fresh install → onboarding launches automatically, lands on Welcome first
      (no flash of the Home screen before it).
- [ ] Step order: Habit check → Set your wake window → Repeat days → Permissions →
      "What BuzzBee can do for you" (informational, no toggles) → Choose a Mission →
      Ringer Check → Summary. Progress bar fills smoothly across all 8, reaching
      100% on the Summary screen.
- [ ] "What BuzzBee can do for you" screen: confirm there are **five** rows in
      one glass card (Bedtime Reminder, Calendar Auto-Shift, Wake Calendar,
      Name Every Alarm, Record Your Own Sound) and **none** has a toggle —
      purely informational. On a small phone the list scrolls and the Continue
      button stays reachable.
- [ ] Ringer Check screen: tap Play — volume audibly ramps up over ~8 seconds
      (not instant full volume). Toggle Vibrate off/on and confirm the phone
      actually buzzes only while it's on and playing.
- [ ] Finishing onboarding creates a real alarm on Home matching what you configured.

## 2. Core alarm — fixed-time (Wake Window off)

- [ ] Create an alarm, Wake Window **off**, deadline ~2 minutes out, Math mission,
      and type a name into the **Alarm name** field (e.g. "Meds").
- [ ] Confirm the name shows on the Home alarm card, above the time.
- [ ] Flip Silent mode ON.
- [ ] Force-quit BuzzBee from the app switcher.
- [ ] Wait, untouched, until the deadline. Alarm rings audibly at full volume
      despite Silent mode, Lock Screen alert visible.
- [ ] Tap the alert — launches straight into the mission screen, not Home —
      and confirm the name entered above appears on the ringing screen too.
- [ ] Solve the mission — alarm stops, lands on Mission Complete.
- [ ] Repeat with the app **backgrounded, not force-quit** (open BuzzBee, go
      to the Home Screen, lock the phone, media volume turned low). At the
      deadline it must ring at **full volume** (AlarmKit's native alert, not a
      quiet in-app ring).
- [ ] From that same backgrounded state, tap the AlarmKit alert — you should
      see the bee splash, then the mission screen. Home must **never** appear
      or be tappable in between.
- [ ] Same again, but instead of tapping the alert, unlock and open BuzzBee
      from its Home Screen icon — same result: bee splash, then the mission.
- [ ] With **no** alarm due, switch away from BuzzBee and back a few times —
      no bee splash; it returns straight to where you were.
- [ ] Let an alarm ring and sit on the mission screen **without solving it for
      5+ minutes**, phone unlocked and on screen. No AlarmKit alert should pop
      up over it, and the sound must keep playing the whole time.
- [ ] Now lock the phone while the mission screen is ringing and wait — within
      ~90s the AlarmKit alert fires at full volume. Tap it: back on the mission
      screen, with the **sound playing again** (not just vibrating).
- [ ] While the mission screen is ringing, press volume-down repeatedly — the
      volume snaps back to max each time. (On a Wake Window alarm it snaps
      back to the ramp's current level instead, not max.)
- [ ] Separately, create/edit an alarm leaving the name blank — confirm no name
      row appears on its Home card or ringing screen (not a blank line, not a
      placeholder — nothing).

## 3. Core alarm — Wake Window (gentle ramp)

- [ ] Create an alarm, Wake Window **on**, window opening in ~1 minute, 2-minute
      span (e.g. now+1 to now+3).
- [ ] Force-quit BuzzBee.
- [ ] At window start: alarm begins ringing **quietly** — noticeably softer than
      §2's full-volume ring — Lock Screen alert visible.
- [ ] Leave it running (don't dismiss yet) — volume audibly climbs over the next
      couple of minutes, reaching full volume by the window's end.
- [ ] Dismiss the mission — confirm it stops.
- [ ] **Deadline backstop.** Same setup, but a 3-minute window, the app
      **backgrounded (not force-quit)**, the phone locked, and media volume
      turned almost all the way down. Don't touch it. The gentle in-app ring
      may stay quiet — that's the case this covers: **at the hard deadline,
      AlarmKit's native alert must ring at full volume.** Also confirm nothing
      full-volume fires *before* the deadline (the gentle build shouldn't be
      cut off after 90 seconds anymore).
- [ ] Tap that deadline alert — the mission opens ringing at **full volume
      straight away**, not restarting the quiet build.

## 3b. Repeating alarm still rings the next day

The one test that needs two days. Before this fix, dismissing a repeating
alarm removed its native registration for every future day.

- [ ] Create a repeating alarm (e.g. every day) a couple of minutes out. Let it
      ring and finish the mission.
- [ ] **Force-quit** BuzzBee and don't open it again.
- [ ] Next day, at the same time, it must ring (AlarmKit alert, full volume).

## 4. All six missions at least once

For each, create/edit an alarm to use that mission, let it ring, and confirm it
actually dismisses on completion:

- [ ] **Math** — numeric keypad, correct answer dismisses, wrong answer shakes/clears.
- [ ] **Tap** — counter increments per tap, dismisses at 100.
- [ ] **Shake** — physically shake the phone, counter increments, dismisses at 50.
- [ ] **Clap** — mic-based, claps increment the counter, dismisses at 50.
- [ ] **Buzzzzz** — sustained "bzzzzz" sound increments the counter, dismisses at 10.
- [ ] **Random** — rings, resolves to one of the above (not literally "Random" as
      the mission itself) — confirm it's actually solvable.

## 4b. Choose Mission — Preview

- [ ] From Add/Edit Alarm → Choose Mission, tap **Preview** on any mission card
      (not the card itself, and not the Choose/Selected button) — it opens the
      real ringing screen with that mission live and playable.
- [ ] Confirm the preview is inert: no sound plays, no vibration, volume isn't
      boosted, and the status pill reads "Preview — this alarm isn't really
      ringing" instead of the normal ringing status.
- [ ] Try the mission through to completion — it just closes the preview
      (no Mission Complete screen, no wake history recorded).
- [ ] Tap **Close** instead of finishing the mission — returns to Choose
      Mission without changing the alarm's selected mission.
- [ ] Tap **Pick this mission** from inside a preview — returns to the Add/Edit
      form with that mission now selected (confirm on the form, not just that
      it navigated back).
- [ ] Preview a mission while the Alarm Name field has text in it — the name
      appears on the preview's ringing screen, live, matching what's typed.

## 5. Record Your Own Alarm Sound

- [ ] Settings → Sound & Haptics → Record a New Sound (or from an alarm's Choose a
      Sound screen). Turn on Airplane Mode first if you want to double-check the
      "never uploaded" claim yourself.
- [ ] Record a few seconds, tap Preview — it loops back your exact clip.
- [ ] Save with a name — appears under "Your Sounds," selectable like a built-in tone.
- [ ] Set an alarm to use it, let it ring — your recorded sound actually plays.
- [ ] Delete the recording (trash icon) — row disappears immediately; an alarm
      that was using it falls back gracefully (doesn't crash, silently uses default).
- [ ] Record several sounds so the Choose a Sound list is taller than the sheet
      — confirm the list scrolls and every sound (including the last default
      tone) is reachable, with "Record a New Sound" staying pinned at the top
      rather than scrolling away.
- [ ] On that same screen, drag down from the title/handle to dismiss the sheet
      — confirm a downward drag *inside the sound list* scrolls it instead of
      closing the sheet.

## 6. Bedtime Reminder & Calendar Auto-Shift

- [ ] Settings → Bedtime Reminder — set a bedtime a few minutes from now, confirm
      the notification fires and tapping it opens the breathing screen (not Home).
- [ ] Add a real Calendar event for tomorrow starting before one of your alarms'
      hard deadline. Between 1:00 PM and 11:59 PM local time, foreground BuzzBee
      (force-quit and relaunch first if you'd already opened it since 1:00 PM
      today) — a "Shift your wake window?" notification appears within a few
      seconds.
- [ ] Before 1:00 PM, the same setup must **not** produce a notification.

## 7. History — calendar view

- [ ] Open the History tab — a month-grid calendar, not the old 7-day chart.
- [ ] Today's date is visually distinct (highlighted/bold) and pre-selected.
- [ ] Tap a few different dates — the detail card below updates each time:
      alarms-triggered count and missions-finished ratio.
- [ ] Navigate to the previous month and back using the arrows — calendar grid
      updates correctly, dots (green = mission completed, red = rang but wasn't)
      appear on the right dates.
- [ ] Tap a date with no alarm activity at all — detail card reads "No alarms
      rang this day" rather than showing stale data from a previously selected date.

## 8. Home screen — alarm card delete

- [ ] On an alarm card, tap the trash icon (always visible, right side of the
      card next to the enable toggle — not a swipe-to-reveal gesture).
- [ ] Tap it — the alarm is deleted immediately (no confirmation dialog by design).
- [ ] Confirm its notifications/AlarmKit registration are actually cancelled (best
      check: delete an alarm that's about to ring within the next minute, confirm
      it does **not** ring).
- [ ] Confirm normal tap-to-edit and the enable/disable toggle still work
      correctly, and that tapping the trash icon never also triggers edit.

## 9. Settings → Reset Data

**Do this test last** — it wipes everything else you just tested.

- [ ] Create at least one alarm, some wake history, and a custom sound first, so
      there's actually something to lose.
- [ ] Settings → Danger Zone → Reset Data. Confirm the dialog requires typing
      **CONFIRM** exactly — try leaving it blank or typing something else first
      and confirm it's rejected with a clear message, no data lost.
- [ ] Type CONFIRM and proceed. Confirm: every alarm is gone, History's calendar
      shows no data, custom sounds list is empty, and the app drops you into
      onboarding again (fresh-install state).
- [ ] Force-quit and relaunch — confirm nothing you just deleted "comes back"
      (i.e. no stray scheduled notification still fires later for a
      now-nonexistent alarm). This is the real proof the native
      AlarmKit/notification cancellation actually ran, not just the DB wipe.

## 10. Regression sweep (quick, but don't skip)

- [ ] Enable All / Disable All / Delete All from Home's "•••" menu still work.
- [ ] Editing an alarm's Wake Window toggle, repeat days, and sound all save correctly.
- [ ] Backgrounding the app (not force-quitting) mid-ring keeps the sound looping,
      doesn't cut out.
- [ ] App icon, splash screen, and general navigation all still look correct end
      to end (no leftover placeholder text or broken images from any of the
      screens touched by recent changes).
- [ ] Bottom tab bar (Home/History/Settings) is the OS's native tab bar, reads
      as Liquid Glass on iOS 26, and the floating "+" create-alarm button tracks
      correctly above it on all three tabs — drag it around and confirm it
      still lands above the tab bar row, not behind or overlapping it.
- [ ] Glass surfaces (hero card, alarm cards, Settings groups, Choose Mission/
      Choose Sound cards, Bedtime modal) render with no color tint — reads as
      clear/frosted glass, not an orange- or amber-tinted card.
- [ ] Every icon app-wide (nav, mission icons, Settings rows, alarm card) is a
      real lucide icon, not a missing-icon box or blank space.

---

## If something fails

Note exactly which numbered item failed, what you expected vs. what happened, and
whether it's reproducible before treating it as fixed — several of these bugs in
the past (task notifications being cancelled, the scroll-vs-swipe-dismiss
conflict) only showed up under a specific sequence of actions, not on the first try.
