# Alarm sound sourcing

All eight alarm tones are free sound effects from [Mixkit](https://mixkit.co/free-sound-effects/),
used under Mixkit's [Sound Effects Free License](https://mixkit.co/license/free-sound-effects/)
(commercial use permitted, no attribution required).

| File | Mixkit title | Source URL |
|---|---|---|
| `classic-alarm.mp3` | Classic alarm | https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3 |
| `digital-buzzer.mp3` | Digital clock digital alarm buzzer | https://assets.mixkit.co/active_storage/sfx/992/992-preview.mp3 |
| `warning-buzzer.mp3` | Warning alarm buzzer | https://assets.mixkit.co/active_storage/sfx/991/991-preview.mp3 |
| `morning-alarm.mp3` | Morning clock alarm | https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3 |

Downloaded 2026-09-12 by Claude via the Mixkit alarms category page (source URLs extracted directly
from the page's audio-player markup).

The four below were downloaded directly by the human developer from the same site
(https://mixkit.co/free-sound-effects/), also 2026-09-12 — same license, exact per-file source URL
not recorded since Claude didn't do the downloading:

| File | Display name |
|---|---|
| `intense-electricity.wav` | Intense Electricity |
| `sound-alert.wav` | Sound Alert |
| `space-shooter.wav` | Space Shooter |
| `vintage-telephone.wav` | Vintage Telephone |

**Not yet done** (see PLAN.md's Sound Assets section): peak-normalizing each file to ~0dB with
`ffmpeg -filter:a loudnorm` before shipping — these are the raw Mixkit files, whose mastering
loudness hasn't been verified. Do this pass before launch, not just once at bundling time, since
re-encoding could change relative levels.
