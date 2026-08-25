/* Guitar Buddy — fretboard trainer
   No dependencies. Everything is rendered from the data below. */

(function () {
  'use strict';

  // ---------------------------------------------------------------- data

  // Chromatic scale starting at C. `alt` is the enharmonic flat spelling.
  var NOTES = [
    { name: 'C',  alt: null },
    { name: 'C♯', alt: 'D♭' },
    { name: 'D',  alt: null },
    { name: 'D♯', alt: 'E♭' },
    { name: 'E',  alt: null },
    { name: 'F',  alt: null },
    { name: 'F♯', alt: 'G♭' },
    { name: 'G',  alt: null },
    { name: 'G♯', alt: 'A♭' },
    { name: 'A',  alt: null },
    { name: 'A♯', alt: 'B♭' },
    { name: 'B',  alt: null }
  ];

  // Standard tuning, low to high. `open` is the pitch class at fret 0.
  var STRINGS = [
    { name: 'E', open: 4 },
    { name: 'A', open: 9 },
    { name: 'D', open: 2 },
    { name: 'G', open: 7 },
    { name: 'B', open: 11 },
    { name: 'e', open: 4 }
  ];

  var FRETS = 12;                 // fret 0 (open string) through the 12th fret
  var QUESTIONS = 10;             // notes per session
  var SINGLE_INLAYS = [3, 5, 7, 9];
  var DOUBLE_INLAYS = [12];
  var DOT_FRETS = [3, 5, 7, 9, 12];
  var DELAY_GOOD = 550;
  var DELAY_BAD = 1300;

  // Practice zones. They are toggles, so the active frets are the union of
  // whatever is switched on — 5–9 and 9–12 overlapping at the 9th is harmless.
  var ZONES = [
    { id: 'low',  label: 'Open–4', from: 0, to: 4 },
    { id: 'mid',  label: '5–9',    from: 5, to: 9 },
    { id: 'high', label: '9–12',   from: 9, to: 12 }
  ];

  // Semitone steps from the root. `steps: null` means no scale filter.
  var SCALES = [
    { id: 'none',       name: 'All notes',        steps: null },
    { id: 'major',      name: 'Major',            steps: [0, 2, 4, 5, 7, 9, 11] },
    { id: 'minor',      name: 'Natural minor',    steps: [0, 2, 3, 5, 7, 8, 10] },
    { id: 'majorpent',  name: 'Major pentatonic', steps: [0, 2, 4, 7, 9] },
    { id: 'minorpent',  name: 'Minor pentatonic', steps: [0, 3, 5, 7, 10] },
    { id: 'blues',      name: 'Blues',            steps: [0, 3, 5, 6, 7, 10] },
    { id: 'dorian',     name: 'Dorian',           steps: [0, 2, 3, 5, 7, 9, 10] },
    { id: 'mixolydian', name: 'Mixolydian',       steps: [0, 2, 4, 5, 7, 9, 10] }
  ];

  function noteAt(stringIndex, fret) {
    return (STRINGS[stringIndex].open + fret) % 12;
  }

  function noteLabel(pitchClass) {
    var n = NOTES[pitchClass];
    return n.alt ? n.name + '/' + n.alt : n.name;
  }

  // ---------------------------------------------------------------- state

  var state = {
    mode: 'name',       // 'name' | 'find' | 'explore'
    running: false,
    locked: false,      // 'good' | 'bad' while feedback is showing
    asked: 0,
    score: 0,
    target: null,       // { string, fret, pitch }
    showAll: false,
    timer: null
  };

  // Practice filters. Every mode draws from the positions these leave active.
  var settings = {
    zones: ['low', 'mid', 'high'],
    dotsOnly: false,
    scale: 'none',
    root: 0,
    sound: true,
    drone: false,
    droneVoice: 'pad',
    beat: 'off',
    tempo: 90
  };

  var el = {
    modes: document.getElementById('modes'),
    filters: document.getElementById('filters'),
    prompt: document.getElementById('prompt'),
    progressFill: document.getElementById('progressFill'),
    neck: document.getElementById('neck'),
    board: document.getElementById('board'),
    stringHeads: document.getElementById('stringHeads'),
    pad: document.getElementById('notePad'),
    exploreTools: document.getElementById('exploreTools'),
    exploreHint: document.getElementById('exploreHint'),
    toggleAll: document.getElementById('toggleAll'),
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    startBtn: document.getElementById('startBtn'),
    soundBtn: document.getElementById('soundBtn'),
    gearBtn: document.getElementById('gearBtn'),
    sheet: document.getElementById('sheet'),
    zoneChips: document.getElementById('zoneChips'),
    dotsOnly: document.getElementById('dotsOnly'),
    scaleSel: document.getElementById('scaleSel'),
    rootSel: document.getElementById('rootSel'),
    droneToggle: document.getElementById('droneToggle'),
    droneVoiceSel: document.getElementById('droneVoiceSel'),
    beatSel: document.getElementById('beatSel'),
    tempoRange: document.getElementById('tempoRange'),
    tempoOut: document.getElementById('tempoOut'),
    tempoDown: document.getElementById('tempoDown'),
    tempoUp: document.getElementById('tempoUp'),
    sheetSummary: document.getElementById('sheetSummary')
  };

  var cells = [];   // cells[string][fret] -> element
  var rows = [];    // rows[fret] -> element

  // ---------------------------------------------------------------- render

  function buildBoard() {
    STRINGS.forEach(function (s, i) {
      if (i === 0) el.stringHeads.appendChild(document.createElement('div'));
      var head = document.createElement('div');
      head.className = 'head';
      head.textContent = s.name;
      el.stringHeads.appendChild(head);
    });

    for (var i = 0; i < STRINGS.length; i++) cells[i] = [];

    // Fret 0 is the open-string row; it sits above the nut, which is already
    // in the markup as the board's first child.
    el.board.insertBefore(makeRow(0), el.board.firstElementChild);

    for (var fret = 1; fret <= FRETS; fret++) {
      el.board.appendChild(makeRow(fret));
    }
  }

  function makeRow(fret) {
    var row = document.createElement('div');
    row.className = 'board-row' + (fret === 0 ? ' open-row' : '');

    var num = document.createElement('div');
    num.className = 'fret-no';
    num.textContent = fret;
    row.appendChild(num);

    for (var s = 0; s < STRINGS.length; s++) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.string = s;
      cell.dataset.fret = fret;

      if (SINGLE_INLAYS.indexOf(fret) !== -1 && s === 2) {
        cell.classList.add('inlay-r');
      }
      if (DOUBLE_INLAYS.indexOf(fret) !== -1 && (s === 1 || s === 3)) {
        cell.classList.add('inlay-r');
      }

      var marker = document.createElement('span');
      marker.className = 'marker';
      cell.appendChild(marker);

      row.appendChild(cell);
      cells[s][fret] = cell;
    }

    rows[fret] = row;
    return row;
  }

  function buildPad() {
    NOTES.forEach(function (note, pitch) {
      var btn = document.createElement('button');
      btn.className = 'note-btn';
      btn.dataset.pitch = pitch;
      btn.setAttribute('aria-label', noteLabel(pitch));

      var main = document.createElement('span');
      main.textContent = note.name;
      btn.appendChild(main);

      if (note.alt) {
        var alt = document.createElement('span');
        alt.className = 'alt';
        alt.textContent = note.alt;
        btn.appendChild(alt);
      }

      el.pad.appendChild(btn);
    });
  }

  // ---------------------------------------------------------------- audio

  // MIDI numbers for the open strings in standard tuning: E2 A2 D3 G3 B3 E4.
  var STRING_MIDI = [40, 45, 50, 55, 59, 64];

  // A plucked steel string: a strong fundamental with the upper partials
  // falling away faster than a bass, which is most of what separates the two.
  var PARTIALS = [0, 1, 0.62, 0.44, 0.3, 0.21, 0.15, 0.1, 0.07, 0.05, 0.035, 0.02, 0.015];

  var audio = { ctx: null, wave: null, voice: null, master: null, broken: false };

  // Notes, drone and drums can land on the same instant. A gentle master
  // compressor keeps that from clipping instead of trimming every voice.
  function masterOut(ac) {
    if (!audio.master) {
      var comp = ac.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.knee.value = 8;
      comp.ratio.value = 4;
      comp.attack.value = 0.004;
      comp.release.value = 0.16;
      comp.connect(ac.destination);
      audio.master = comp;
    }
    return audio.master;
  }

  function midiAt(stringIndex, fret) { return STRING_MIDI[stringIndex] + fret; }

  function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function ensureAudio() {
    if (audio.broken) return null;
    if (!audio.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { audio.broken = true; return null; }
      try {
        audio.ctx = new AC();
        audio.wave = audio.ctx.createPeriodicWave(
          new Float32Array(PARTIALS.length), new Float32Array(PARTIALS));
      } catch (e) {
        audio.broken = true;
        return null;
      }
    }
    // Mobile browsers hand back a suspended context until a user gesture.
    if (audio.ctx.state === 'suspended') {
      try { audio.ctx.resume(); } catch (e) { /* ignore */ }
    }
    return audio.ctx;
  }

  function stopVoice(now) {
    var v = audio.voice;
    if (!v) return;
    audio.voice = null;
    try {
      v.gain.gain.cancelScheduledValues(now);
      v.gain.gain.setValueAtTime(Math.max(v.gain.gain.value, 0.0001), now);
      v.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      v.osc.stop(now + 0.07);
    } catch (e) { /* already finished */ }
  }

  function playMidi(midi) {
    if (!settings.sound) return;
    var ac = ensureAudio();
    if (!ac) return;

    var now = ac.currentTime;
    stopVoice(now);

    var osc = ac.createOscillator();
    osc.setPeriodicWave(audio.wave);
    osc.frequency.value = midiToFreq(midi);

    // Sweeping the filter down is what gives the pluck its shape.
    var filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(5200, now);
    filter.frequency.exponentialRampToValueAtTime(1100, now + 0.7);

    var gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.5, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterOut(ac));

    osc.start(now);
    osc.stop(now + 1.7);

    audio.voice = { osc: osc, gain: gain };
    osc.onended = function () {
      if (audio.voice && audio.voice.osc === osc) audio.voice = null;
    };
  }

  function playPosition(stringIndex, fret) { playMidi(midiAt(stringIndex, fret)); }

  // ---- drone ---------------------------------------------------------------
  // A root to improvise against. It sits an octave or two above the bass roots
  // (C3–B3) so it stays clear of the notes being played on the neck.
  var DRONE_BASE = 48;

  // Sustained voices ring continuously; struck ones decay, so they re-strike
  // once a bar at the beat's tempo.
  var DRONE_VOICES = [
    { id: 'pad',    name: 'Pad',          sustained: true },
    { id: 'organ',  name: 'Organ',        sustained: true },
    { id: 'gfunk',  name: 'G-funk lead',  sustained: true },
    { id: 'piano',  name: 'Piano',        sustained: false },
    { id: 'rhodes', name: 'Rhodes',       sustained: false }
  ];

  var drone = { nodes: null, timer: null, nextTime: 0, struck: [], voice: '', midi: 0 };

  function droneVoiceDef() {
    for (var i = 0; i < DRONE_VOICES.length; i++) {
      if (DRONE_VOICES[i].id === settings.droneVoice) return DRONE_VOICES[i];
    }
    return DRONE_VOICES[0];
  }

  function droneMidi() { return DRONE_BASE + settings.root; }

  function droneShouldRing() {
    return settings.drone && settings.sound && state.mode === 'explore' &&
           hasScale() && !document.hidden;
  }

  // ---- sustained drone voices ----

  function dronePad(ac, freq, out) {
    var filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1600;
    filter.Q.value = 0.6;
    filter.connect(out);

    var oscs = [];
    // Two lightly detuned voices for warmth, plus a quiet octave on top so the
    // drone carries through a small speaker.
    [[freq, 1, -5], [freq, 1, 5], [freq * 2, 0.4, 0]].forEach(function (spec) {
      var osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = spec[0];
      osc.detune.value = spec[2];
      var mix = ac.createGain();
      mix.gain.value = spec[1];
      osc.connect(mix);
      mix.connect(filter);
      oscs.push(osc);
    });
    return { oscs: oscs, level: 0.055 };
  }

  function droneOrgan(ac, freq, out) {
    var filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;
    filter.connect(out);

    var oscs = [];
    // drawbar-ish harmonics
    [[1, 1], [2, 0.5], [3, 0.28], [4, 0.18], [6, 0.1], [8, 0.06]].forEach(function (spec) {
      var osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * spec[0];
      var mix = ac.createGain();
      mix.gain.value = spec[1];
      osc.connect(mix);
      mix.connect(filter);
      oscs.push(osc);
    });

    // a gentle rotary wobble, so it is not dead still
    var lfo = ac.createOscillator();
    lfo.frequency.value = 5.4;
    var depth = ac.createGain();
    depth.gain.value = 0.05;
    lfo.connect(depth);
    depth.connect(filter.detune);
    oscs.push(lfo);

    return { oscs: oscs, level: 0.05 };
  }

  function droneGfunk(ac, freq, out) {
    // The West-Coast lead: a bright saw through a resonant lowpass, with the
    // vibrato doing most of the talking.
    var filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq * 5;
    filter.Q.value = 7;
    filter.connect(out);

    var oscs = [];
    var vibrato = ac.createGain();
    vibrato.gain.value = 20;                 // cents

    var lfo = ac.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 5.2;
    lfo.connect(vibrato);
    oscs.push(lfo);

    [['sawtooth', freq, 1, -4], ['square', freq, 0.35, 6]].forEach(function (spec) {
      var osc = ac.createOscillator();
      osc.type = spec[0];
      osc.frequency.value = spec[1];
      osc.detune.value = spec[3];
      vibrato.connect(osc.detune);
      var mix = ac.createGain();
      mix.gain.value = spec[2];
      osc.connect(mix);
      mix.connect(filter);
      oscs.push(osc);
    });

    // slow sweep so the resonance moves
    var sweep = ac.createOscillator();
    sweep.type = 'sine';
    sweep.frequency.value = 0.13;
    var sweepDepth = ac.createGain();
    sweepDepth.gain.value = freq * 1.8;
    sweep.connect(sweepDepth);
    sweepDepth.connect(filter.frequency);
    oscs.push(sweep);

    return { oscs: oscs, level: 0.03 };
  }

  var SUSTAINED = { pad: dronePad, organ: droneOrgan, gfunk: droneGfunk };

  // ---- struck drone voices ----

  function strikePiano(ac, t, freq, out) {
    var gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.085, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    gain.connect(out);

    // Real strings are slightly inharmonic, and the upper partials fade first.
    [[1, 1, 2.8], [2.001, 0.45, 1.7], [3.004, 0.2, 1.0], [4.01, 0.09, 0.6]].forEach(function (spec) {
      var osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * spec[0];
      var env = ac.createGain();
      env.gain.setValueAtTime(spec[1], t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + spec[2]);
      osc.connect(env);
      env.connect(gain);
      osc.start(t);
      osc.stop(t + spec[2] + 0.05);
    });

    // hammer
    var noise = ac.createBufferSource();
    noise.buffer = noiseBuffer(ac);
    noise.playbackRate.value = 0.8 + Math.random() * 0.4;
    var hp = ac.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = freq * 6;
    hp.Q.value = 0.8;
    var nEnv = ac.createGain();
    nEnv.gain.setValueAtTime(0.25, t);
    nEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    noise.connect(hp);
    hp.connect(nEnv);
    nEnv.connect(gain);
    noise.start(t);
    noise.stop(t + 0.08);

    return { gain: gain, until: t + 2.9 };
  }

  function strikeRhodes(ac, t, freq, out) {
    var gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.11, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);

    // tremolo, the sound everyone thinks of as a Rhodes
    var trem = ac.createGain();
    trem.gain.value = 1;
    var lfo = ac.createOscillator();
    lfo.frequency.value = 4.6;
    var depth = ac.createGain();
    depth.gain.value = 0.22;
    lfo.connect(depth);
    depth.connect(trem.gain);
    lfo.start(t);
    lfo.stop(t + 3.5);

    gain.connect(trem);
    trem.connect(out);

    // FM tine: a fast-decaying modulator is what gives the bell attack
    var carrier = ac.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = freq;

    var mod = ac.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = freq * 2;
    var modEnv = ac.createGain();
    modEnv.gain.setValueAtTime(freq * 3.2, t);
    modEnv.gain.exponentialRampToValueAtTime(freq * 0.02, t + 0.5);
    mod.connect(modEnv);
    modEnv.connect(carrier.frequency);
    mod.start(t);
    mod.stop(t + 3.5);

    carrier.connect(gain);
    carrier.start(t);
    carrier.stop(t + 3.5);

    // a quiet bell partial on top
    var bell = ac.createOscillator();
    bell.type = 'sine';
    bell.frequency.value = freq * 4.8;
    var bEnv = ac.createGain();
    bEnv.gain.setValueAtTime(0.08, t);
    bEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    bell.connect(bEnv);
    bEnv.connect(gain);
    bell.start(t);
    bell.stop(t + 0.75);

    return { gain: gain, until: t + 3.5 };
  }

  var STRUCK = { piano: strikePiano, rhodes: strikeRhodes };

  // ---- drone lifecycle ----

  function barSeconds() { return 4 * 60 / settings.tempo; }

  // Line struck drones up with the beat's bar when one is running.
  function nextBarAfter(ac, after) {
    if (!beat.timer) return after;
    var six = sixteenthSeconds();
    var t = beat.nextTime - (beat.step % 16) * six;
    var bar = barSeconds();
    while (t < after) t += bar;
    return t;
  }

  function droneLoop() {
    var ac = audio.ctx;
    if (!ac) return;
    var out = masterOut(ac);
    var freq = midiToFreq(droneMidi());
    while (drone.nextTime < ac.currentTime + 0.2) {
      drone.struck.push(STRUCK[drone.voice](ac, drone.nextTime, freq, out));
      drone.nextTime += barSeconds();
    }
    drone.struck = drone.struck.filter(function (v) { return v.until > ac.currentTime; });
  }

  function startDrone() {
    if (drone.nodes || drone.timer) return;
    var ac = ensureAudio();
    if (!ac) return;

    var def = droneVoiceDef();
    drone.voice = def.id;
    drone.midi = droneMidi();

    if (!def.sustained) {
      drone.struck = [];
      drone.nextTime = nextBarAfter(ac, ac.currentTime + 0.1);
      drone.timer = setInterval(droneLoop, 25);
      droneLoop();
      return;
    }

    var now = ac.currentTime;
    var gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.connect(masterOut(ac));

    // Well under the plucked notes: a reference to play against, not over.
    var built = SUSTAINED[def.id](ac, midiToFreq(drone.midi), gain);
    gain.gain.exponentialRampToValueAtTime(built.level, now + 0.5);
    built.oscs.forEach(function (osc) { osc.start(now); });

    drone.nodes = { oscs: built.oscs, gain: gain };
  }

  function stopDrone() {
    if (drone.timer) { clearInterval(drone.timer); drone.timer = null; }

    var now = audio.ctx ? audio.ctx.currentTime : 0;

    drone.struck.forEach(function (v) {
      try {
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setValueAtTime(Math.max(v.gain.gain.value, 0.0001), now);
        v.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      } catch (e) { /* already finished */ }
    });
    drone.struck = [];

    var d = drone.nodes;
    if (!d) return;
    drone.nodes = null;
    if (!audio.ctx) return;
    try {
      d.gain.gain.cancelScheduledValues(now);
      d.gain.gain.setValueAtTime(Math.max(d.gain.gain.value, 0.0001), now);
      d.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      d.oscs.forEach(function (osc) { osc.stop(now + 0.4); });
    } catch (e) { /* already stopped */ }
  }

  function updateDrone() {
    if (!droneShouldRing()) return stopDrone();
    var running = drone.nodes || drone.timer;
    if (running && drone.voice === settings.droneVoice && drone.midi === droneMidi()) return;
    stopDrone();
    startDrone();
  }

  // ---- beat ----------------------------------------------------------------
  // One bar of sixteenths per instrument: 'x' hit, 'X' accent, '.' rest.
  var BEATS = [
    { id: 'off', name: 'Off' },
    {
      id: 'rock', name: 'Rock', swing: 0,
      kick:  'x.....x.x.......',
      snare: '....x.......x...',
      hat:   'X.x.X.x.X.x.X.x.'
    },
    {
      id: 'funk', name: 'Funk', swing: 0,
      kick:  'x..x..x...x.x...',
      snare: '..g.x..g.g..x..g',
      hat:   'Xxxx Xxxx Xxxx Xxxx'.replace(/ /g, '')
    },
    {
      id: 'shuffle', name: 'Shuffle', swing: 0.32,
      kick:  'x.......x.......',
      snare: '....x.......x...',
      hat:   'X.x.X.x.X.x.X.x.'
    },
    {
      id: 'bossa', name: 'Bossa nova', swing: 0,
      kick:  'x..x..x...x..x..',
      rim:   'x..x..x...x.x...',
      hat:   'x.x.x.x.x.x.x.x.'
    },
    {
      id: 'jazz', name: 'Jazz swing', swing: 0.33,
      ride:  'x...x.x.x...x.x.',
      hat:   '....x.......x...',
      kick:  'x...............'
    },
    {
      id: 'metronome', name: 'Metronome', swing: 0, human: false,
      click: 'X...x...x...x...'
    }
  ];

  var TEMPO_MIN = 40;
  var TEMPO_MAX = 200;

  function clampTempo(bpm) {
    bpm = Math.round(bpm) || 90;
    return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, bpm));
  }

  function beatDef() {
    for (var i = 0; i < BEATS.length; i++) {
      if (BEATS[i].id === settings.beat) return BEATS[i];
    }
    return BEATS[0];
  }

  var beat = { timer: null, step: 0, nextTime: 0, style: 'off',
               bus: null, noise: null, curve: null };

  // Real kits are never dry. A short synthetic room, sent in parallel, does
  // more for realism than any amount of work on the individual voices.
  function roomImpulse(ac, seconds, falloff) {
    var len = Math.floor(ac.sampleRate * seconds);
    var buf = ac.createBuffer(2, len, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, falloff);
      }
      // a couple of early reflections, offset per channel for width
      [0.011, 0.019, 0.031].forEach(function (delay, n) {
        var at = Math.floor((delay + ch * 0.003) * ac.sampleRate);
        if (at < len) d[at] += (n % 2 ? -1 : 1) * (0.5 - n * 0.13);
      });
    }
    return buf;
  }

  function beatBus(ac) {
    if (!beat.bus) {
      beat.bus = ac.createGain();
      beat.bus.gain.value = 0.5;
      beat.bus.connect(masterOut(ac));

      var room = ac.createConvolver();
      room.buffer = roomImpulse(ac, 0.42, 3.4);
      var wet = ac.createGain();
      wet.gain.value = 0.28;
      beat.bus.connect(room);
      room.connect(wet);
      wet.connect(masterOut(ac));
    }
    return beat.bus;
  }

  // Gentle saturation gives the kick harmonics a phone speaker can push.
  function driveCurve(ac) {
    if (!beat.curve) {
      var n = 1024;
      beat.curve = new Float32Array(n);
      for (var i = 0; i < n; i++) {
        var x = (i / (n - 1)) * 2 - 1;
        beat.curve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2);
      }
    }
    return beat.curve;
  }

  function noiseBuffer(ac) {
    if (!beat.noise) {
      var len = Math.floor(ac.sampleRate * 2);
      beat.noise = ac.createBuffer(1, len, ac.sampleRate);
      var data = beat.noise.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return beat.noise;
  }

  function hitNoise(ac, t, level, type, freq, q, decay, dest) {
    var src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac);
    src.playbackRate.value = 0.8 + Math.random() * 0.4;   // never the same noise twice

    var filter = ac.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;

    var gain = ac.createGain();
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest || beatBus(ac));
    src.start(t);
    src.stop(t + decay + 0.02);
  }

  function hitTone(ac, t, level, from, to, decay, type, dest) {
    var osc = ac.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(from, t);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + decay * 0.5);

    var gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(level, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    osc.connect(gain);
    gain.connect(dest || beatBus(ac));
    osc.start(t);
    osc.stop(t + decay + 0.02);
  }

  // Cymbals are metal: their partials are inharmonic, which is why filtered
  // white noise reads as static rather than as a hi-hat. These six ratios are
  // the classic drum-machine square-wave bank.
  var METAL = [1, 1.4826, 1.8003, 2.5460, 2.6303, 3.8967];

  function hitMetal(ac, t, level, base, bpFreq, bpQ, hpFreq, decay) {
    var bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = bpFreq;
    bp.Q.value = bpQ;

    var hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = hpFreq;

    var gain = ac.createGain();
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    METAL.forEach(function (ratio) {
      var osc = ac.createOscillator();
      osc.type = 'square';
      osc.frequency.value = base * ratio;
      osc.connect(bp);
      osc.start(t);
      osc.stop(t + decay + 0.02);
    });

    bp.connect(hp);
    hp.connect(gain);
    gain.connect(beatBus(ac));
  }

  var VOICES = {
    // beater click, then a two-stage pitch drop through a little saturation
    kick: function (ac, t, v) {
      var shaper = ac.createWaveShaper();
      shaper.curve = driveCurve(ac);
      shaper.oversample = '2x';
      var out = ac.createGain();
      out.gain.value = 0.95 * v;
      shaper.connect(out);
      out.connect(beatBus(ac));

      var osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(165, t);
      osc.frequency.exponentialRampToValueAtTime(72, t + 0.035);
      osc.frequency.exponentialRampToValueAtTime(46, t + 0.22);

      var env = ac.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.9, t + 0.006);
      env.gain.exponentialRampToValueAtTime(0.28, t + 0.09);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);

      osc.connect(env);
      env.connect(shaper);
      osc.start(t);
      osc.stop(t + 0.36);

      hitNoise(ac, t, 0.12 * v, 'bandpass', 2600, 1.2, 0.014, shaper);
    },

    // pitched shell plus the snare wires, which ring on after the shell dies
    snare: function (ac, t, v) {
      var bright = 0.75 + v * 0.35;
      hitTone(ac, t, 0.26 * v, 195, 168, 0.085, 'triangle');
      hitTone(ac, t, 0.16 * v, 331, 292, 0.06, 'triangle');
      hitNoise(ac, t, 0.55 * v, 'bandpass', 1750 * bright, 0.7, 0.11);
      hitNoise(ac, t, 0.48 * v, 'highpass', 3600 * bright, 0.6, 0.13 + v * 0.09);
    },

    // An acoustic cymbal is a dense wall of closely spaced modes — far closer
    // to shaped noise than to a handful of tuned oscillators. A bank of
    // inharmonic squares is the classic drum-machine hat, so it is kept here
    // only as a trace of shimmer under the noise.
    hat: function (ac, t, v) {
      var decay = 0.032 + v * 0.035;
      var src = ac.createBufferSource();
      src.buffer = noiseBuffer(ac);
      src.playbackRate.value = 0.9 + Math.random() * 0.3;

      var hp = ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 4800 + Math.random() * 500;

      // two resonances give it a voice without giving it a pitch
      var peak1 = ac.createBiquadFilter();
      peak1.type = 'peaking';
      peak1.frequency.value = 8400;
      peak1.Q.value = 1.1;
      peak1.gain.value = 7;

      var peak2 = ac.createBiquadFilter();
      peak2.type = 'peaking';
      peak2.frequency.value = 12500;
      peak2.Q.value = 1.4;
      peak2.gain.value = 4;

      // real hats darken as they die away
      var lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(17000, t);
      lp.frequency.exponentialRampToValueAtTime(8500, t + decay);

      var gain = ac.createGain();
      gain.gain.setValueAtTime(0.26 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

      src.connect(hp);
      hp.connect(peak1);
      peak1.connect(peak2);
      peak2.connect(lp);
      lp.connect(gain);
      gain.connect(beatBus(ac));
      src.start(t);
      src.stop(t + decay + 0.02);

      hitMetal(ac, t, 0.035 * v, 300 * (0.97 + Math.random() * 0.06), 11000, 0.9, 8000, decay * 0.7);
    },

    // a soft ping riding on a broad wash
    ride: function (ac, t, v) {
      var decay = 0.5 + v * 0.35;
      var src = ac.createBufferSource();
      src.buffer = noiseBuffer(ac);
      src.playbackRate.value = 0.85 + Math.random() * 0.3;

      var hp = ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2600;

      var peak = ac.createBiquadFilter();
      peak.type = 'peaking';
      peak.frequency.value = 6200;
      peak.Q.value = 0.9;
      peak.gain.value = 6;

      var lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(13000, t);
      lp.frequency.exponentialRampToValueAtTime(5200, t + decay);

      var gain = ac.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2 * v, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

      src.connect(hp);
      hp.connect(peak);
      peak.connect(lp);
      lp.connect(gain);
      gain.connect(beatBus(ac));
      src.start(t);
      src.stop(t + decay + 0.02);

      // the stick on the bell, brief and quiet
      hitTone(ac, t, 0.07 * v, 2450, 2380, 0.06, 'triangle');
      hitMetal(ac, t, 0.03 * v, 268, 5200, 0.7, 3200, decay * 0.5);
    },

    rim: function (ac, t, v) {
      hitTone(ac, t, 0.34 * v, 1700, 1500, 0.028, 'square');
      hitNoise(ac, t, 0.42 * v, 'bandpass', 2400, 4, 0.035);
    },

    click: function (ac, t, v) {
      var f = v > 0.9 ? 1600 : 1100;
      hitTone(ac, t, 0.35 * v, f, f, 0.045);
    }
  };

  // ---- optional sample kit -------------------------------------------------
  // Drop WAVs into audio/ with an audio/kit.json naming them and they replace
  // the synthesised voices. Without that file nothing is fetched and the kit
  // stays synthesised, which is how the app ships.
  var kit = { asked: false, buffers: {} };

  function loadKit(ac) {
    if (kit.asked) return;
    kit.asked = true;

    fetch('audio/kit.json').then(function (res) {
      if (!res.ok) throw new Error('no kit');
      return res.json();
    }).then(function (map) {
      Object.keys(map).forEach(function (voice) {
        if (!VOICES[voice]) return;
        var file = String(map[voice]).replace(/[^\w.\-]/g, '');
        if (!file) return;
        fetch('audio/' + file).then(function (res) {
          if (!res.ok) throw new Error('missing ' + file);
          return res.arrayBuffer();
        }).then(function (data) {
          return new Promise(function (resolve, reject) {
            ac.decodeAudioData(data, resolve, reject);
          });
        }).then(function (buffer) {
          kit.buffers[voice] = buffer;
        }).catch(function () { /* that voice stays synthesised */ });
      });
    }).catch(function () { /* no sample kit present */ });
  }

  function playSample(ac, voice, t, v) {
    var src = ac.createBufferSource();
    src.buffer = kit.buffers[voice];
    var gain = ac.createGain();
    gain.gain.value = v;
    src.connect(gain);
    gain.connect(beatBus(ac));
    src.start(t);
  }

  function sixteenthSeconds() { return 60 / settings.tempo / 4; }

  // Swing pushes the offbeat eighths late, which is what makes a shuffle shuffle.
  function swingOffset(def, step) {
    if (!def.swing) return 0;
    return (step % 4 === 2) ? def.swing * sixteenthSeconds() * 2 : 0;
  }

  var MARK_VELOCITY = { X: 1, x: 0.8, g: 0.32 };   // accent, normal, ghost

  function scheduleStep(ac, def, step, time) {
    // A drummer is not a grid: nudging velocity and timing per hit is most of
    // the difference between a groove and a machine. The metronome opts out.
    var loose = def.human !== false;
    Object.keys(VOICES).forEach(function (voice) {
      var pattern = def[voice];
      if (!pattern) return;
      var velocity = MARK_VELOCITY[pattern.charAt(step)];
      if (!velocity) return;
      var at = time;
      if (loose) {
        velocity = Math.min(velocity * (0.88 + Math.random() * 0.24), 1);
        at += (Math.random() - 0.5) * 0.006;
      }
      if (kit.buffers[voice]) playSample(ac, voice, at, velocity);
      else VOICES[voice](ac, at, velocity);
    });
  }

  // Look-ahead scheduler: the timer is coarse, the audio clock is not.
  function beatLoop() {
    var ac = audio.ctx;
    if (!ac) return;
    var def = beatDef();
    while (beat.nextTime < ac.currentTime + 0.15) {
      var step = beat.step % 16;
      scheduleStep(ac, def, step, beat.nextTime + swingOffset(def, step));
      beat.nextTime += sixteenthSeconds();
      beat.step++;
    }
  }

  function startBeat() {
    if (beat.timer) return;
    var ac = ensureAudio();
    if (!ac) return;
    loadKit(ac);
    beat.step = 0;
    beat.nextTime = ac.currentTime + 0.1;
    beat.timer = setInterval(beatLoop, 25);
    beatLoop();
  }

  function stopBeat() {
    if (!beat.timer) return;
    clearInterval(beat.timer);
    beat.timer = null;
  }

  function beatShouldPlay() {
    return settings.beat !== 'off' && settings.sound &&
           state.mode === 'explore' && !document.hidden;
  }

  function updateBeat() {
    var was = !!beat.timer;
    if (!beatShouldPlay()) { stopBeat(); }
    else if (beat.timer && beat.style === settings.beat) return;  // tempo rides along
    else {
      stopBeat();
      beat.style = settings.beat;
      startBeat();
    }
    // A struck drone follows the bar, so re-align it whenever the beat changes.
    if (was !== !!beat.timer && drone.timer) { stopDrone(); startDrone(); }
  }

  // In Find Note the question is a pitch class, so sound it at the lowest
  // position still in play — the one a bassist would reach for first.
  function lowestPositionFor(pitch) {
    var best = null;
    activePositions().forEach(function (pos) {
      if (pos.pitch !== pitch) return;
      var midi = midiAt(pos.string, pos.fret);
      if (!best || midi < best.midi) best = { string: pos.string, fret: pos.fret, midi: midi };
    });
    return best;
  }

  // The prompt only invites a tap while there is a question to replay.
  function updateReplayable() {
    el.prompt.classList.toggle('is-replayable',
      !!state.target && state.mode !== 'explore' && settings.sound);
  }

  function replayTarget() {
    if (!state.target) return;
    if (state.mode === 'name') playPosition(state.target.string, state.target.fret);
    else if (state.mode === 'find' && state.target.midi != null) playMidi(state.target.midi);
  }

  function showIcon(svg, visible) {
    if (visible) svg.removeAttribute('hidden');
    else svg.setAttribute('hidden', '');
  }

  function setSound(on) {
    settings.sound = on;
    saveSettings();
    el.soundBtn.setAttribute('aria-pressed', String(on));
    // `hidden` is an HTMLElement property; these are SVG elements, so the
    // content attribute has to be set directly.
    showIcon(el.soundBtn.querySelector('.ico-on'), on);
    showIcon(el.soundBtn.querySelector('.ico-off'), !on);
    el.soundBtn.classList.toggle('is-off', !on);
    updateReplayable();
    if (!on && audio.ctx) stopVoice(audio.ctx.currentTime);
    updateDrone();
    updateBeat();
  }

  // ---------------------------------------------------------------- filters

  function scaleDef() {
    for (var i = 0; i < SCALES.length; i++) {
      if (SCALES[i].id === settings.scale) return SCALES[i];
    }
    return SCALES[0];
  }

  // Pitch classes the current scale allows, or null when no scale is selected.
  function scalePitches() {
    var steps = scaleDef().steps;
    if (!steps) return null;
    return steps.map(function (step) { return (settings.root + step) % 12; });
  }

  function hasScale() { return scaleDef().steps !== null; }

  // A fret is in play when a switched-on zone covers it and, if "only on the
  // dots" is set, an inlay marks it. This part does not depend on the string.
  function fretAllowed(fret) {
    var inZone = settings.zones.some(function (id) {
      for (var i = 0; i < ZONES.length; i++) {
        if (ZONES[i].id === id) return fret >= ZONES[i].from && fret <= ZONES[i].to;
      }
      return false;
    });
    if (!inZone) return false;
    return !settings.dotsOnly || DOT_FRETS.indexOf(fret) !== -1;
  }

  function isActive(stringIndex, fret) {
    if (!fretAllowed(fret)) return false;
    var allowed = scalePitches();
    return !allowed || allowed.indexOf(noteAt(stringIndex, fret)) !== -1;
  }

  function activePositions() {
    var list = [];
    eachCell(function (cell, s, f) {
      if (isActive(s, f)) list.push({ string: s, fret: f, pitch: noteAt(s, f) });
    });
    return list;
  }

  function activePitches() {
    var seen = {}, list = [];
    activePositions().forEach(function (pos) {
      if (!seen[pos.pitch]) { seen[pos.pitch] = true; list.push(pos.pitch); }
    });
    return list;
  }

  function isRoot(pitch) { return hasScale() && pitch === settings.root; }

  // Grey out everything the filters exclude, so the neck shows the practice set.
  function applyFilter() {
    eachCell(function (cell, s, f) {
      cell.classList.toggle('is-off', !isActive(s, f));
    });
    for (var f = 0; f <= FRETS; f++) {
      rows[f].classList.toggle('row-off', !fretAllowed(f));
    }
    updateFilterSummary();
    updateStartState();
  }

  function scaleName() {
    return NOTES[settings.root].name + ' ' + scaleDef().name.toLowerCase();
  }

  function isDefaultSettings() {
    return settings.zones.length === ZONES.length && !settings.dotsOnly && !hasScale();
  }

  function summaryParts() {
    var parts = [];
    if (settings.zones.length !== ZONES.length) {
      parts.push(settings.zones.length
        ? ZONES.filter(function (z) { return settings.zones.indexOf(z.id) !== -1; })
               .map(function (z) { return z.label; }).join(' + ')
        : 'no zone');
    }
    if (settings.dotsOnly) parts.push('dots only');
    if (hasScale()) parts.push(scaleName());
    return parts;
  }

  function updateFilterSummary() {
    var parts = summaryParts();
    el.filters.hidden = parts.length === 0;
    el.filters.textContent = parts.join(' · ');

    var count = activePositions().length;
    el.sheetSummary.textContent = count
      ? count + ' of ' + (STRINGS.length * (FRETS + 1)) + ' positions in play' +
        (isDefaultSettings() ? ' — the whole neck' : '')
      : 'Nothing is in play. Switch a zone back on, or pick a wider scale.';
    el.sheetSummary.classList.toggle('is-empty', count === 0);
  }

  function canPlay() { return activePositions().length > 0; }

  function updateStartState() {
    el.startBtn.disabled = !canPlay();
  }

  // ---------------------------------------------------------------- helpers

  function eachCell(fn) {
    for (var s = 0; s < STRINGS.length; s++) {
      for (var f = 0; f <= FRETS; f++) fn(cells[s][f], s, f);
    }
  }

  function clearBoard() {
    eachCell(function (cell) {
      cell.classList.remove('is-target', 'is-good', 'is-bad', 'is-reveal',
                            'is-root', 'is-pick', 'is-pulse');
      cell.firstChild.textContent = '';
    });
  }

  function clearPad() {
    Array.prototype.forEach.call(el.pad.children, function (btn) {
      btn.classList.remove('is-good', 'is-bad');
    });
  }

  function setMarker(cell, cls, text) {
    cell.classList.add(cls);
    cell.firstChild.textContent = text || '';
  }

  function setPrompt(text, tone, big) {
    el.prompt.className = 'prompt' + (tone ? ' is-' + tone : '');
    el.prompt.textContent = text;
    if (big) {
      var span = document.createElement('span');
      span.className = 'big';
      span.textContent = big;
      el.prompt.appendChild(span);
    }
  }

  function updateScore() {
    el.score.innerHTML = state.score +
      '<span class="score-sep">/</span><span class="score-total">' + QUESTIONS + '</span>';
    el.progressFill.style.width = (state.asked / QUESTIONS * 100) + '%';
  }

  function bestKey() { return 'bassbuddy.best.' + state.mode; }

  function readBest() {
    try { return parseInt(localStorage.getItem(bestKey()), 10) || 0; }
    catch (e) { return 0; }
  }

  function writeBest(value) {
    try { localStorage.setItem(bestKey(), String(value)); } catch (e) { /* private mode */ }
  }

  function updateBest() {
    var b = readBest();
    el.best.textContent = b ? 'Best ' + b + '/' + QUESTIONS : 'Best —';
  }

  function loadSettings() {
    var raw;
    try { raw = localStorage.getItem('bassbuddy.settings'); } catch (e) { return; }
    if (!raw) return;
    var saved;
    try { saved = JSON.parse(raw); } catch (e) { return; }
    if (!saved || typeof saved !== 'object') return;

    if (Array.isArray(saved.zones)) {
      settings.zones = saved.zones.filter(function (id) {
        return ZONES.some(function (z) { return z.id === id; });
      });
    }
    settings.dotsOnly = !!saved.dotsOnly;
    if (SCALES.some(function (sc) { return sc.id === saved.scale; })) {
      settings.scale = saved.scale;
    }
    if (typeof saved.root === 'number' && saved.root >= 0 && saved.root < 12) {
      settings.root = saved.root;
    }
    if (typeof saved.sound === 'boolean') settings.sound = saved.sound;
    if (typeof saved.drone === 'boolean') settings.drone = saved.drone;
    if (DRONE_VOICES.some(function (v) { return v.id === saved.droneVoice; })) {
      settings.droneVoice = saved.droneVoice;
    }
    if (BEATS.some(function (b) { return b.id === saved.beat; })) settings.beat = saved.beat;
    if (typeof saved.tempo === 'number') settings.tempo = clampTempo(saved.tempo);
  }

  function saveSettings() {
    try {
      localStorage.setItem('bassbuddy.settings', JSON.stringify(settings));
    } catch (e) { /* private mode */ }
  }

  // Show a fade at the bottom edge while more frets sit below the fold.
  function updateScrollHint() {
    var b = el.board;
    el.neck.classList.toggle('has-more', b.scrollHeight - b.clientHeight - b.scrollTop > 2);
  }

  // On short screens the neck scrolls; keep the active position in view.
  function scrollIntoView(cell) {
    if (!cell.scrollIntoView) return;
    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      cell.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    } catch (e) {
      cell.scrollIntoView(false);
    }
    setTimeout(updateScrollHint, 400);
  }

  // After a filter change, bring the first fret that is still in play into view.
  function scrollToFirstActive() {
    for (var f = 0; f <= FRETS; f++) {
      if (!fretAllowed(f)) continue;
      var top = rows[f].getBoundingClientRect().top -
                el.board.getBoundingClientRect().top + el.board.scrollTop;
      el.board.scrollTop = Math.max(0, top - 4);
      break;
    }
    updateScrollHint();
  }

  function buzz(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } }
  }

  function pickRandom(list, isSameAsLast) {
    if (!list.length) return null;
    var pick, guard = 0;
    do {
      pick = list[Math.floor(Math.random() * list.length)];
      guard++;
    } while (list.length > 1 && guard < 25 && isSameAsLast && isSameAsLast(pick));
    return pick;
  }

  // ---------------------------------------------------------------- session

  function pickPosition() {
    var last = state.target;
    return pickRandom(activePositions(), function (pos) {
      return last && pos.string === last.string && pos.fret === last.fret;
    });
  }

  function pickPitch() {
    var last = state.target;
    return pickRandom(activePitches(), function (pitch) {
      return last && pitch === last.pitch;
    });
  }

  function startSession() {
    if (!canPlay()) return;
    stopTimer();
    state.running = true;
    state.locked = false;
    state.asked = 0;
    state.score = 0;
    state.target = null;
    clearBoard();
    clearPad();
    updateScore();
    el.startBtn.textContent = 'Stop';
    el.startBtn.classList.add('is-running');
    nextQuestion();
  }

  function endSession(finished) {
    stopTimer();
    state.running = false;
    state.locked = false;
    state.target = null;
    clearBoard();
    clearPad();
    el.startBtn.textContent = 'Start';
    el.startBtn.classList.remove('is-running');
    el.pad.classList.add('is-idle');
    updateReplayable();

    if (finished) {
      if (state.score > readBest()) writeBest(state.score);
      updateBest();
      var perfect = state.score === QUESTIONS;
      setPrompt((perfect ? 'Perfect run! ' : 'Session over: ') +
                state.score + '/' + QUESTIONS + ' — start again?', perfect ? 'good' : null);
    } else {
      el.progressFill.style.width = '0%';
      setPrompt(idleText());
    }
  }

  function nextQuestion() {
    clearBoard();
    clearPad();
    state.locked = false;

    if (state.mode === 'name') {
      state.target = pickPosition();
      if (!state.target) return endSession(false);
      var cell = cells[state.target.string][state.target.fret];
      setMarker(cell, 'is-target');
      cell.classList.add('is-pulse');
      scrollIntoView(cell);
      playPosition(state.target.string, state.target.fret);
      setPrompt('Which note is this?');
      updateReplayable();
      el.pad.classList.remove('is-idle');
    } else if (state.mode === 'find') {
      var pitch = pickPitch();
      if (pitch === null) return endSession(false);
      var ref = lowestPositionFor(pitch);
      state.target = { pitch: pitch, midi: ref ? ref.midi : null };
      if (ref) playMidi(ref.midi);
      setPrompt('Tap any', null, noteLabel(pitch));
      updateReplayable();
    }
  }

  function afterAnswer() {
    state.asked++;
    updateScore();

    state.timer = setTimeout(function () {
      state.timer = null;
      if (!state.running) return;
      if (state.asked >= QUESTIONS) endSession(true);
      else nextQuestion();
    }, state.locked === 'bad' ? DELAY_BAD : DELAY_GOOD);
  }

  function stopTimer() {
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
  }

  // Answer in "Name Note" mode: the player tapped a note button.
  function answerWithNote(pitch, button) {
    if (!state.running || state.locked || state.mode !== 'name' || !state.target) return;

    var cell = cells[state.target.string][state.target.fret];
    cell.classList.remove('is-pulse', 'is-target');

    if (pitch === state.target.pitch) {
      state.locked = 'good';
      state.score++;
      button.classList.add('is-good');
      setMarker(cell, 'is-good', NOTES[state.target.pitch].name);
      setPrompt('Correct — ' + noteLabel(state.target.pitch), 'good');
      buzz(20);
    } else {
      state.locked = 'bad';
      button.classList.add('is-bad');
      setMarker(cell, 'is-bad', NOTES[state.target.pitch].name);
      highlightPad(state.target.pitch);
      setPrompt('That was ' + noteLabel(state.target.pitch), 'bad');
      buzz([25, 60, 25]);
    }

    afterAnswer();
  }

  function highlightPad(pitch) {
    var btn = el.pad.querySelector('.note-btn[data-pitch="' + pitch + '"]');
    if (btn) btn.classList.add('is-good');
  }

  // Answer in "Find Note" mode: the player tapped a fretboard position.
  function answerWithPosition(stringIndex, fret) {
    if (!state.running || state.locked || state.mode !== 'find' || !state.target) return;

    var cell = cells[stringIndex][fret];
    var pitch = noteAt(stringIndex, fret);
    playPosition(stringIndex, fret);

    if (pitch === state.target.pitch) {
      state.locked = 'good';
      state.score++;
      setMarker(cell, 'is-good', NOTES[pitch].name);
      setPrompt('Correct — ' + noteLabel(pitch), 'good');
      buzz(20);
    } else {
      state.locked = 'bad';
      setMarker(cell, 'is-bad', NOTES[pitch].name);
      revealAll(state.target.pitch, stringIndex, fret);
      setPrompt('That is ' + noteLabel(pitch) + ' — green shows ' +
                noteLabel(state.target.pitch), 'bad');
      buzz([25, 60, 25]);
    }

    afterAnswer();
  }

  function revealAll(pitch, skipString, skipFret) {
    eachCell(function (cell, s, f) {
      if (s === skipString && f === skipFret) return;
      if (isActive(s, f) && noteAt(s, f) === pitch) {
        setMarker(cell, 'is-good', NOTES[pitch].name);
      }
    });
  }

  // ---------------------------------------------------------------- explore

  function renderExplore() {
    clearBoard();
    eachCell(function (cell, s, f) {
      if (!isActive(s, f)) return;
      var pitch = noteAt(s, f);
      // With a scale selected the roots stay lit in red; the rest of the scale
      // comes up on tap, or all at once via the toggle.
      if (isRoot(pitch)) setMarker(cell, 'is-root', NOTES[pitch].name);
      else if (state.showAll) setMarker(cell, 'is-reveal', NOTES[pitch].name);
    });
    updateExploreHint();
  }

  function updateExploreHint() {
    var parts = [hasScale()
      ? 'Red marks the root of ' + scaleName() + '.'
      : 'Tap any position on the neck to reveal its note.'];
    var backing = [];
    if (droneShouldRing()) {
      backing.push(droneVoiceDef().name.toLowerCase() + ' drone on ' + NOTES[settings.root].name);
    }
    if (beatShouldPlay()) backing.push(beatDef().name.toLowerCase() + ' at ' + settings.tempo + ' BPM');
    if (backing.length) parts.push('Playing ' + backing.join(', ') + '.');
    el.exploreHint.textContent = parts.join(' ');
  }

  function exploreTap(stringIndex, fret) {
    var cell = cells[stringIndex][fret];
    var pitch = noteAt(stringIndex, fret);
    playPosition(stringIndex, fret);

    if (!cell.classList.contains('is-root')) {
      if (cell.classList.contains('is-pick')) {
        cell.classList.remove('is-pick');
        if (state.showAll) setMarker(cell, 'is-reveal', NOTES[pitch].name);
        else cell.firstChild.textContent = '';
        return;
      }
      cell.classList.remove('is-reveal');
      setMarker(cell, 'is-pick', NOTES[pitch].name);
    }

    setPrompt(noteLabel(pitch) + (isRoot(pitch) ? ' (root)' : '') + ' — ' +
              STRINGS[stringIndex].name +
              (fret === 0 ? ' string, open' : ' string, fret ' + fret));
  }

  // ---------------------------------------------------------------- modes

  function idleText() {
    if (!canPlay()) return 'No positions match your settings.';
    if (state.mode === 'name') return 'Press start — name the red dot.';
    if (state.mode === 'find') return 'Press start — find the note on the neck.';
    return 'Tap the neck to explore the notes.';
  }

  function refreshMode() {
    stopTimer();
    state.running = false;
    state.locked = false;
    state.asked = 0;
    state.score = 0;
    state.target = null;

    el.startBtn.textContent = 'Start';
    el.startBtn.classList.remove('is-running');
    el.progressFill.style.width = '0%';
    el.pad.classList.add('is-idle');

    clearBoard();
    clearPad();
    updateScore();
    updateBest();

    updateBeat();
    updateDrone();
    if (state.mode === 'explore') renderExplore();
    setPrompt(idleText());
    updateReplayable();
    updateScrollHint();
  }

  function setMode(mode) {
    if (mode === state.mode) return;

    state.mode = mode;
    state.showAll = false;
    el.toggleAll.setAttribute('aria-pressed', 'false');
    el.toggleAll.textContent = 'Show all notes';

    Array.prototype.forEach.call(el.modes.children, function (btn) {
      var active = btn.dataset.mode === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    var explore = mode === 'explore';
    el.pad.hidden = explore || mode === 'find';
    el.exploreTools.hidden = !explore;
    el.startBtn.parentNode.hidden = explore;
    document.getElementById('scoreboard').hidden = explore;
    document.getElementById('progress').hidden = explore;

    refreshMode();
  }

  // ---------------------------------------------------------------- settings UI

  function buildSettings() {
    ZONES.forEach(function (zone) {
      var chip = document.createElement('button');
      chip.className = 'chip';
      chip.dataset.zone = zone.id;
      chip.textContent = zone.label;
      chip.setAttribute('aria-pressed', 'false');
      el.zoneChips.appendChild(chip);
    });

    SCALES.forEach(function (scale) {
      var opt = document.createElement('option');
      opt.value = scale.id;
      opt.textContent = scale.name;
      el.scaleSel.appendChild(opt);
    });

    NOTES.forEach(function (note, pitch) {
      var opt = document.createElement('option');
      opt.value = pitch;
      opt.textContent = noteLabel(pitch);
      el.rootSel.appendChild(opt);
    });

    DRONE_VOICES.forEach(function (voice) {
      var opt = document.createElement('option');
      opt.value = voice.id;
      opt.textContent = voice.name;
      el.droneVoiceSel.appendChild(opt);
    });

    BEATS.forEach(function (style) {
      var opt = document.createElement('option');
      opt.value = style.id;
      opt.textContent = style.name;
      el.beatSel.appendChild(opt);
    });
  }

  function setTempo(bpm) {
    settings.tempo = clampTempo(bpm);
    el.tempoRange.value = String(settings.tempo);
    el.tempoOut.textContent = settings.tempo + ' BPM';
    saveSettings();
    if (state.mode === 'explore') updateExploreHint();
  }

  function syncSettingsUI() {
    Array.prototype.forEach.call(el.zoneChips.children, function (chip) {
      var on = settings.zones.indexOf(chip.dataset.zone) !== -1;
      chip.classList.toggle('is-on', on);
      chip.setAttribute('aria-pressed', String(on));
    });
    el.dotsOnly.checked = settings.dotsOnly;
    el.scaleSel.value = settings.scale;
    el.rootSel.value = String(settings.root);
    el.droneToggle.checked = settings.drone;
    el.droneVoiceSel.value = settings.droneVoice;
    el.beatSel.value = settings.beat;
    el.tempoRange.value = String(settings.tempo);
    el.tempoOut.textContent = settings.tempo + ' BPM';
    el.rootSel.disabled = !hasScale();
    el.rootSel.parentNode.classList.toggle('is-disabled', !hasScale());
  }

  // Any filter change invalidates the question pool, so the session restarts.
  function settingsChanged() {
    saveSettings();
    syncSettingsUI();
    applyFilter();
    refreshMode();
    scrollToFirstActive();
  }

  function openSheet() {
    syncSettingsUI();
    updateFilterSummary();
    el.sheet.hidden = false;
    document.body.classList.add('sheet-open');
    el.gearBtn.setAttribute('aria-expanded', 'true');
  }

  function closeSheet() {
    el.sheet.hidden = true;
    document.body.classList.remove('sheet-open');
    el.gearBtn.setAttribute('aria-expanded', 'false');
    updateScrollHint();
  }

  // ---------------------------------------------------------------- events

  el.modes.addEventListener('click', function (e) {
    var btn = e.target.closest('.mode-btn');
    if (btn) setMode(btn.dataset.mode);
  });

  el.pad.addEventListener('click', function (e) {
    var btn = e.target.closest('.note-btn');
    if (btn) answerWithNote(parseInt(btn.dataset.pitch, 10), btn);
  });

  el.board.addEventListener('click', function (e) {
    var cell = e.target.closest('.cell');
    if (!cell) return;
    var s = parseInt(cell.dataset.string, 10);
    var f = parseInt(cell.dataset.fret, 10);
    if (!isActive(s, f)) return;          // filtered-out positions are inert
    if (state.mode === 'explore') exploreTap(s, f);
    else if (state.mode === 'find') answerWithPosition(s, f);
  });

  el.startBtn.addEventListener('click', function () {
    if (state.running) endSession(false);
    else startSession();
  });

  el.board.addEventListener('scroll', updateScrollHint, { passive: true });
  window.addEventListener('resize', updateScrollHint);

  el.toggleAll.addEventListener('click', function () {
    state.showAll = !state.showAll;
    el.toggleAll.setAttribute('aria-pressed', String(state.showAll));
    el.toggleAll.textContent = state.showAll ? 'Hide all notes' : 'Show all notes';
    renderExplore();
    setPrompt(idleText());
  });

  el.soundBtn.addEventListener('click', function () {
    setSound(!settings.sound);
    if (settings.sound) replayTarget();
  });

  // Tapping the prompt plays the question again.
  el.prompt.addEventListener('click', replayTarget);

  el.gearBtn.addEventListener('click', openSheet);
  el.filters.addEventListener('click', openSheet);

  el.sheet.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) closeSheet();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !el.sheet.hidden) closeSheet();
  });

  el.zoneChips.addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    var id = chip.dataset.zone;
    var at = settings.zones.indexOf(id);
    if (at === -1) settings.zones.push(id);
    else settings.zones.splice(at, 1);
    settingsChanged();
  });

  el.dotsOnly.addEventListener('change', function () {
    settings.dotsOnly = el.dotsOnly.checked;
    settingsChanged();
  });

  el.scaleSel.addEventListener('change', function () {
    settings.scale = el.scaleSel.value;
    settingsChanged();
  });

  el.rootSel.addEventListener('change', function () {
    settings.root = parseInt(el.rootSel.value, 10);
    settingsChanged();
  });

  // The drone changes nothing about the questions, so it leaves a session alone.
  el.droneToggle.addEventListener('change', function () {
    settings.drone = el.droneToggle.checked;
    saveSettings();
    updateDrone();
    if (state.mode === 'explore') updateExploreHint();
  });

  el.droneVoiceSel.addEventListener('change', function () {
    settings.droneVoice = el.droneVoiceSel.value;
    saveSettings();
    updateDrone();
    if (state.mode === 'explore') updateExploreHint();
  });

  // Never leave a drone or a beat running in someone's pocket.
  document.addEventListener('visibilitychange', function () {
    updateDrone();
    updateBeat();
  });

  el.beatSel.addEventListener('change', function () {
    settings.beat = el.beatSel.value;
    saveSettings();
    updateBeat();
    if (state.mode === 'explore') updateExploreHint();
  });

  el.tempoRange.addEventListener('input', function () {
    setTempo(parseInt(el.tempoRange.value, 10));
  });

  el.tempoDown.addEventListener('click', function () { setTempo(settings.tempo - 1); });
  el.tempoUp.addEventListener('click', function () { setTempo(settings.tempo + 1); });

  // ---------------------------------------------------------------- boot

  buildBoard();
  buildPad();
  buildSettings();
  loadSettings();
  syncSettingsUI();
  setSound(settings.sound);
  applyFilter();
  updateScore();
  updateBest();
  el.pad.classList.add('is-idle');
  setPrompt(idleText());
  updateScrollHint();
})();
