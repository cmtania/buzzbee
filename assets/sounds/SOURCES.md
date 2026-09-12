# Alarm sound sourcing

All four alarm tones are free sound effects from [Mixkit](https://mixkit.co/free-sound-effects/alarm/),
used under Mixkit's [Sound Effects Free License](https://mixkit.co/license/free-sound-effects/)
(commercial use permitted, no attribution required). Downloaded 2026-09-12.

| File | Mixkit title | Source URL |
|---|---|---|
| `classic-alarm.mp3` | Classic alarm | https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3 |
| `digital-buzzer.mp3` | Digital clock digital alarm buzzer | https://assets.mixkit.co/active_storage/sfx/992/992-preview.mp3 |
| `warning-buzzer.mp3` | Warning alarm buzzer | https://assets.mixkit.co/active_storage/sfx/991/991-preview.mp3 |
| `morning-alarm.mp3` | Morning clock alarm | https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3 |

**Not yet done** (see PLAN.md's Sound Assets section): peak-normalizing each file to ~0dB with
`ffmpeg -filter:a loudnorm` before shipping — these are the raw Mixkit preview files, whose
mastering loudness hasn't been verified. Do this pass before launch, not just once at bundling time,
since re-encoding could change relative levels.
