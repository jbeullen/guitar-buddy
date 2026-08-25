# guitar-buddy

Learn guitar on the go — a mobile-first web app for learning the guitar fretboard.

It is the guitar counterpart to [bass-buddy](https://github.com/jbeullen/bass-buddy):
same modes, same practice settings, six strings instead of four.

No build step, no dependencies, no framework. Three static files plus an icon.

## Modes

Switch modes with the tabs at the top.

| Mode | What it does |
| --- | --- |
| **Name Note** | A red dot appears somewhere on the neck — open string or fretted. Tap the matching note on the pad. |
| **Find Note** | A note name is shown. Tap any position on the neck that plays it. |
| **Explore** | Free practice — tap any position to hear it and reveal its note, or show the whole neck at once. With a scale selected it draws the scale, roots in red. |

### Sessions

Press **Start** to begin a session. It runs for 10 notes and the counter tracks
your score (`3/10`). A correct answer turns green and moves on; a wrong one shows
the right answer before continuing. After 10 notes the session ends and **Start**
begins a new one. Your best result per mode is kept in `localStorage`.

## Sound

Notes are synthesised in the browser with the Web Audio API — no audio files, so
there is nothing extra to download.

- **Name Note** and **Find Note** play the note as the question appears. In Find
  Note, where the question is a pitch rather than a position, it sounds at the
  lowest position still in play. Tap the prompt to hear it again.
- **Explore** plays whatever position you touch, and Find Note plays the position
  you tap as well, so a wrong guess is audible as well as visible.
- The speaker button in the top bar mutes and unmutes; the choice is remembered.

Pitches are the real thing: standard tuning, low E at 82.4 Hz through to the high
E at the 12th fret at 659.3 Hz. The synth models a plucked steel string — a strong
fundamental with the upper partials falling away faster than a bass, which is most
of what separates the two instruments by ear.

Mobile browsers only allow audio to start from a user gesture, which is why the
first note you hear follows a tap on **Start** or on the neck.

### Using real samples instead

The kit is synthesised, but any voice can be replaced with a sample: drop the
files into `audio/` and name them in `audio/kit.json`. Voices you leave out stay
synthesised, so replacing only the cymbals is a valid thing to do. See
`audio/README.md` for the format.

## Practice settings

The sliders button in the top right opens the settings sheet. Everything there
filters the pool of positions the app draws from, so the three modes all follow
it. Positions the filters exclude are greyed out on the neck and cannot be
tapped. Settings are remembered in `localStorage`.

| Setting | What it does |
| --- | --- |
| **Zone** | Three toggles — `Open–4`, `5–9`, `9–12`. The active frets are the union of whatever is switched on, so they combine freely. |
| **Only on the dots** | Restricts practice to the inlay frets: 3, 5, 7, 9 and 12. |
| **Scale** | Restricts practice to the notes of a scale. Pick the scale and its root; `All notes` turns the filter off. |
| **Drone** | Sounds the root in Explore mode, to improvise or run the scale against, in one of five voices. |
| **Beat** | A drum pattern in Explore mode, with a tempo from 40 to 200 BPM (90 by default). |

Scales available: major, natural minor, major and minor pentatonic, blues,
dorian and mixolydian.

In **Explore** mode, choosing a scale lays it out on the neck and marks every
**root in red**. The rest of the scale comes up on tap, or all at once with
*Show all notes*.

Changing a filter ends any session in progress, since it changes what can be
asked. The drone is not a filter, so toggling it leaves a session alone. If a
combination leaves nothing in play, **Start** is disabled and the sheet says so.

### The drone and the beat

Both are practice backing for **Explore** mode, and neither sounds during a
drill. The drone additionally needs a scale selected — it has a root to ring.
The beat does not, so it works as a plain metronome or groove to play over.
Toggling either leaves a running session alone.

Beat styles: rock, funk, shuffle, bossa nova, jazz swing and a plain metronome.
Shuffle and jazz swing their offbeat eighths towards a triplet feel. Steps are
scheduled against the audio clock rather than fired from `setInterval`, so the
timing does not drift.

Everything is synthesised — there are no audio files anywhere in this project.
What keeps it from sounding like a drum machine:

- **Cymbals are shaped noise.** A real cymbal is a dense wall of closely spaced
  modes, so hats and ride are noise through a highpass, two resonant peaks and a
  lowpass that closes as the hit decays — the resonances give them a voice
  without giving them a pitch. A bank of inharmonic square waves, which is the
  classic drum-machine hat, sits underneath at a trace level for shimmer;
  leaning on it makes the kit sound like an 808 rather than a kit.
- **Layered kick and snare.** The kick is a beater click plus a two-stage pitch
  drop through gentle saturation; the snare is two detuned shell tones plus two
  noise bands, the brighter of which rings on after the shell dies, the way real
  snare wires do.
- **A room.** The kit runs in parallel through a short synthetic impulse
  response with a few early reflections. Dryness is most of what makes
  synthesised drums sound artificial.
- **No two hits alike.** Velocity varies about 12% per hit and timing by a few
  milliseconds; harder hits are brighter, not just louder; the noise layers read
  from a different point of the buffer each time; funk carries ghost notes on
  the snare. The metronome opts out of all of it and stays exact — a click that
  wanders is not a metronome.

Notes, drone and drums share a master compressor, so a kick landing under a note
and the drone cannot clip.

### The drone

The drone only sounds in **Explore** with a scale selected — it is a practice
backing, not a game sound. It sounds the root in the C3–B3 octave, well below the
level of the notes you play, so the neck stays audible over it. It follows the root you pick, stops when you leave Explore,
clear the scale, or mute, and never keeps ringing while the page is in the
background.

**Drone sound** picks the voice:

| Voice | |
| --- | --- |
| **Pad** | Detuned triangles with an octave on top. The plain reference tone. |
| **Organ** | Additive drawbar harmonics with a slow rotary wobble. |
| **G-funk lead** | Saw and square through a resonant lowpass, vibrato and a slow filter sweep. |
| **Piano** | Inharmonic partials plus a hammer, each partial decaying at its own rate. |
| **Rhodes** | An FM tine with a bell partial and tremolo. |

Pad, organ and the lead sustain. Piano and Rhodes decay, so they re-strike once
a bar at the tempo set under **Beat** — and when a beat is playing they lock to
its bar, landing within a couple of milliseconds of beat one.

## The fretboard

- Standard tuning, low to high: **E A D G B e** (left to right).
- Open strings through the **12th fret**, with the usual inlay markers at 3, 5, 7,
  9 and 12. Open strings are fret `0`: their dot sits above the nut, so the neck
  reads the same way as a chord chart.
- The neck runs top-to-bottom so it fits a phone in portrait. On short screens it
  scrolls, and the current question is always scrolled into view.
- Six strings at true guitar spacing would be narrower than a finger, so the neck
  is drawn at 44px a string — the floor for a reliable tap — rather than to scale.

## Publishing to GitHub Pages

The app is entirely static — no backend, no build step — so Pages can serve the
repository as-is.

1. Merge this branch into `main`.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
4. Pick branch `main` and folder `/ (root)`, then **Save**.
5. Wait for the *pages build and deployment* run to finish under the **Actions**
   tab (about a minute the first time).

The site then lives at `https://<user>.github.io/guitar-buddy/`. Every later push to
`main` redeploys it automatically.

Every asset path is relative, so the app works from that project subpath as well
as from a custom domain or the repository root. `.nojekyll` tells Pages to serve
the files verbatim instead of running them through Jekyll.

### Custom domain (optional)

Add the domain under **Settings → Pages → Custom domain**, point a `CNAME` DNS
record at `<user>.github.io`, and enable **Enforce HTTPS** once the certificate
is issued.

## Running it

Any static file server works:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly from disk works too, though `manifest.json` is only
picked up over HTTP. Deploying is a matter of serving the directory — GitHub Pages,
Netlify, or anything else that hosts static files.

On iOS/Android you can add it to the home screen and it runs full screen.

## Files

```
index.html     markup and layout
audio/         optional drop-in sample kit; empty by default
styles.css     all styling; dark, mobile-first, safe-area aware
app.js         fretboard rendering and game logic
manifest.json  web app manifest
icon.svg       app icon
icon-180.png   home-screen icon for iOS (which ignores SVG icons)
icon-512.png   install icon for Android / desktop
.nojekyll      serve the files as-is on GitHub Pages
```
