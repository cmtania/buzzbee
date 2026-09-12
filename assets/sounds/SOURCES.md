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

Four more were added directly by the human developer on 2026-09-12 — **source/license not verified by me, flagging rather than assuming**:

| File | Display name |
|---|---|
| `intense-electricity.wav` | Intense Electricity |
| `sound-alert.wav` | Sound Alert |
| `space-shooter.wav` | Space Shooter |
| `vintage-telephone.wav` | Vintage Telephone |

**Before shipping**: confirm these four are commercial-use-safe (matching PLAN.md's Sound Assets
sourcing rules — CC0, or a free-for-commercial-use license like Mixkit's/Pixabay's) and add their
source URL/license here, the same as the four above.

**Not yet done** (see PLAN.md's Sound Assets section): peak-normalizing each file to ~0dB with
`ffmpeg -filter:a loudnorm` before shipping — these are the raw Mixkit preview files, whose
mastering loudness hasn't been verified. Do this pass before launch, not just once at bundling time,
since re-encoding could change relative levels.
