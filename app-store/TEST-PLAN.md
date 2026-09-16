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
- [ ] "What BuzzBee can do for you" screen: confirm there are **three** rows
      (Bedtime Reminder, Calendar Auto-Shift, Task After You're Awake) and **none**
      of them have a toggle — purely informational.
- [ ] Ringer Check screen: tap Play — volume audibly ramps up over ~8 seconds
      (not instant full volume). Toggle Vibrate off/on and confirm the phone
      actually buzzes only while it's on and playing.
- [ ] Finishing onboarding creates a real alarm on Home matching what you configured.

## 2. Core alarm — fixed-time (Wake Window off)

- [ ] Create an alarm, Wake Window **off**, deadline ~2 minutes out, Math mission.
- [ ] Flip Silent mode ON.
- [ ] Force-quit BuzzBee from the app switcher.
- [ ] Wait, untouched, until the deadline. Alarm rings audibly at full volume
      despite Silent mode, Lock Screen alert visible.
- [ ] Tap the alert — launches straight into the mission screen, not Home.
- [ ] Solve the mission — alarm stops, lands on Mission Complete.

## 3. Core alarm — Wake Window (gentle ramp)

- [ ] Create an alarm, Wake Window **on**, window opening in ~1 minute, 2-minute
      span (e.g. now+1 to now+3).
- [ ] Force-quit BuzzBee.
- [ ] At window start: alarm begins ringing **quietly** — noticeably softer than
      §2's full-volume ring — Lock Screen alert visible.
- [ ] Leave it running (don't dismiss yet) — volume audibly climbs over the next
      couple of minutes, reaching full volume by the window's end.
- [ ] Dismiss the mission — confirm it stops.

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

## 5. Record Your Own Alarm Sound

- [ ] Settings → Sound & Haptics → Record a New Sound (or from an alarm's Choose a
      Sound screen). Turn on Airplane Mode first if you want to double-check the
      "never uploaded" claim yourself.
- [ ] Record a few seconds, tap Preview — it loops back your exact clip.
- [ ] Save with a name — appears under "Your Sounds," selectable like a built-in tone.
- [ ] Set an alarm to use it, let it ring — your recorded sound actually plays.
- [ ] Delete the recording (trash icon) — row disappears immediately; an alarm
      that was using it falls back gracefully (doesn't crash, silently uses default).

## 6. Bedtime Reminder & Calendar Auto-Shift

- [ ] Settings → Bedtime Reminder — set a bedtime a few minutes from now, confirm
      the notification fires and tapping it opens the breathing screen (not Home).
- [ ] Add a real Calendar event for tomorrow starting before one of your alarms'
      hard deadline. After 6:00 PM local time, foreground BuzzBee (force-quit and
      relaunch first if you'd already opened it once today) — a "Shift your wake
      window?" notification appears within a few seconds.

## 7. Task After You're Awake (the newest feature — test this thoroughly)

### 7a. Adding/editing tasks

- [ ] Open an alarm, tap **+ Add Task** — a modal opens (not an inline row), with
      a task-name field and a time picker.
- [ ] Try scrolling the time picker to a time **before** the alarm's own deadline —
      confirm it snaps back / won't let you leave it there (task time must stay
      after the deadline).
- [ ] While the name field is focused, confirm the keyboard popping up does **not**
      hide the modal's buttons — everything stays reachable above the keyboard.
- [ ] Save it — appears in the task list on Add/Edit with a visible **Edit** button.
      Tap Edit — same modal reopens, pre-filled, with a working Delete button.
- [ ] Add a 6th task attempt — confirm it's blocked (cap is 5) with a visible note,
      not a silent failure.
- [ ] Save the alarm. Reopen it later — tasks persisted correctly, same order.

### 7b. Notification-only firing (not a second alarm)

- [ ] Create an alarm ~2 minutes out with one task ~3 minutes out. Let the alarm
      ring and **complete the mission**. Wait for the task's time.
- [ ] Confirm the task arrives as a **plain notification** — no full-screen ring,
      no Silent-mode override, no mission. Just a normal banner/lock-screen notification.
- [ ] Tap the notification — a small "Did you finish this?" dialog opens with
      **Not yet** / **Done!** buttons. Tap one — dialog closes.
- [ ] Repeat, but this time **ignore** the notification entirely (swipe it away,
      don't tap it) — confirm nothing else happens (no re-prompt, no crash) and
      note the date for §7d below.

### 7c. Cancel-on-ring, restore-on-dismiss (the tricky one — test both branches)

- [ ] **Branch A — mission finished:** alarm + task as in 7b, but this time
      complete the mission promptly. Confirm the task notification **does** arrive
      at its scheduled time.
- [ ] **Branch B — mission NOT finished:** create a fresh alarm + task pair. When
      the alarm rings, **do not** complete the mission (let it keep ringing, or
      force-quit and don't reopen). Confirm the task's notification **never
      arrives** at its scheduled time. This is the one most likely to regress —
      don't skip it.

### 7d. History reflects task completion correctly

- [ ] Open History (calendar view — see §8) and tap today's date.
- [ ] Confirm the task you answered "Done!" to in §7b shows as completed (green
      check), the one you answered "Not yet" to shows as not completed (red X),
      and the one you **ignored** also shows as not completed (red X) — ignoring
      and explicitly declining should look identical in the UI.

## 8. History — calendar view

- [ ] Open the History tab — a month-grid calendar, not the old 7-day chart.
- [ ] Today's date is visually distinct (highlighted/bold) and pre-selected.
- [ ] Tap a few different dates — the detail card below updates each time:
      alarms-triggered count, missions-finished ratio, and a task checklist (only
      for alarms that were actually dismissed that day).
- [ ] Navigate to the previous month and back using the arrows — calendar grid
      updates correctly, dots (green = mission completed, red = rang but wasn't)
      appear on the right dates.
- [ ] Tap a date with no alarm activity at all — detail card reads "No alarms
      rang this day" rather than showing stale data from a previously selected date.

## 9. Home screen — swipe-to-delete

- [ ] On an alarm card, swipe right-to-left — a delete button is revealed behind it.
- [ ] Tap it — the alarm is deleted immediately (no confirmation dialog by design).
- [ ] Confirm its notifications/AlarmKit registration are actually cancelled (best
      check: delete an alarm that's about to ring within the next minute, confirm
      it does **not** ring).
- [ ] Swipe a row open, then swipe it back closed (or tap elsewhere) without
      tapping delete — confirm nothing is deleted and the row returns to normal.
- [ ] Confirm normal tap-to-edit and the enable/disable toggle still work
      correctly on a row that hasn't been swiped.

## 10. Settings → Reset Data

**Do this test last** — it wipes everything else you just tested.

- [ ] Create at least one alarm with a task, some wake history, and a custom sound
      first, so there's actually something to lose.
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

## 11. Regression sweep (quick, but don't skip)

- [ ] Enable All / Disable All / Delete All from Home's "•••" menu still work.
- [ ] Editing an alarm's Wake Window toggle, repeat days, and sound all save correctly.
- [ ] Backgrounding the app (not force-quitting) mid-ring keeps the sound looping,
      doesn't cut out.
- [ ] App icon, splash screen, and general navigation all still look correct end
      to end (no leftover placeholder text or broken images from any of the
      screens touched by recent changes).

---

## If something fails

Note exactly which numbered item failed, what you expected vs. what happened, and
whether it's reproducible before treating it as fixed — several of these bugs in
the past (task notifications being cancelled, the scroll-vs-swipe-dismiss
conflict) only showed up under a specific sequence of actions, not on the first try.
