# Sample kit (optional)

The drums are synthesised by default. To play real samples instead, drop the
audio files in this folder and name them in `kit.json`:

```json
{
  "kick":  "kick.wav",
  "snare": "snare.wav",
  "hat":   "hat.wav",
  "ride":  "ride.wav",
  "rim":   "rim.wav",
  "click": "click.wav"
}
```

Notes:

- Every key is optional. Any voice you leave out — or whose file fails to
  load — stays synthesised, so you can replace just the cymbals if that is all
  you want.
- One-shots, not loops: each file is a single hit, played from its start. The
  app handles the timing.
- Anything the browser can decode works (`.wav`, `.mp3`, `.ogg`, `.m4a`).
  Mono is fine and halves the download.
- Velocity scales the playback gain, so record or trim the samples at a
  consistent level.
- `kit.json` shipping as `{}` is what keeps the app synthesised out of the box.

Whatever you add here is served as part of the site, so use samples you have the
right to publish — CC0 or public domain is the safe choice.
