'use strict';
// Audio: synthesized sound effects and an original chiptune sequencer (WebAudio).
(function (G) {
  const SEMI = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function noteToMidi(n) {
    const m = /^([A-G][#b]?)(-?\d)$/.exec(n);
    if (!m) return null;
    return 12 * (parseInt(m[2], 10) + 1) + SEMI[m[1]];
  }
  function parseChord(name) {
    const m = /^([A-G][#b]?)(.*)$/.exec(name);
    const root = SEMI[m[1]];
    const q = m[2];
    let iv = [0, 4, 7];
    if (q === 'm') iv = [0, 3, 7];
    else if (q === '7') iv = [0, 4, 7, 10];
    else if (q === 'm7') iv = [0, 3, 7, 10];
    else if (q === 'maj7') iv = [0, 4, 7, 11];
    else if (q === 'dim') iv = [0, 3, 6];
    else if (q === 'sus4') iv = [0, 5, 7];
    return { root, iv };
  }

  // ---------------- songs ----------------
  const DR = {
    pop: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xx' },
    soft: { k: 'x.......x.......', s: '........x.......', h: '..x...x...x...x.' },
    drive: { k: 'x...x...x...x...', s: '....x.......x..x', h: 'x.xxx.xxx.xxx.xx' },
    heavy: { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    march: { k: 'x.x.....x.x.....', s: '....x..x....x.xx', h: 'xxxxxxxxxxxxxxxx' },
    light: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' },
  };
  const SONGS = {
    title: {
      bpm: 132, bass: 'bounce', arp: true, drums: 'pop',
      chords: 'G C D G Em C D D',
      lead: 'D5:2 G5:2 B5:2 D6:6 B5:2 D6:2 | E6:4 D6:2 C6:2 B5:2 C6:2 E6:4 | D6:3 C6:1 B5:2 A5:2 F#5:2 A5:2 D6:4 | B5:8 G5:4 r:4 | G5:2 B5:2 E6:4 D6:2 B5:2 G5:4 | C6:2 E6:2 G6:4 F#6:2 E6:2 C6:4 | D6:2 E6:2 F#6:2 G6:2 A6:4 F#6:4 | A6:8 r:8',
    },
    map: {
      bpm: 112, bass: 'long', arp: true, drums: 'light',
      chords: 'Bb Gm Eb F',
      lead: 'D5:4 F5:2 Bb5:2 A5:4 F5:4 | G5:4 Bb5:2 D6:2 C6:4 Bb5:4 | G5:2 Bb5:2 Eb6:4 D6:2 C6:2 Bb5:4 | C6:8 A5:4 F5:4',
    },
    meadow: {
      bpm: 150, bass: 'bounce', arp: false, drums: 'pop',
      chords: 'C G Am F C G F:8,G:8 C F G Em Am F G Dm7 G7',
      lead: 'E5:2 G5:2 C6:2 G5:2 A5:3 G5:1 E5:4 | D5:2 G5:2 B5:2 D6:2 C6:2 B5:2 G5:4 | A5:2 C6:2 E6:4 D6:2 C6:2 A5:4 | F5:2 A5:2 C6:3 A5:1 G5:6 r:2 | E5:2 G5:2 C6:2 E6:2 D6:3 C6:1 G5:4 | B5:2 D6:2 G6:4 F6:2 E6:2 D6:4 | C6:2 A5:2 F5:2 A5:2 B5:2 D6:2 G6:4 | E6:6 C6:2 G5:4 r:4 | A5:3 G5:1 F5:2 A5:2 C6:4 A5:4 | B5:3 A5:1 G5:2 B5:2 D6:4 B5:4 | G5:2 B5:2 E6:4 D6:2 B5:2 G5:4 | A5:2 C6:2 E6:2 A6:2 G6:4 E6:4 | F6:2 E6:2 C6:2 A5:2 F5:4 A5:4 | G5:2 B5:2 D6:2 G6:2 F6:4 D6:4 | C6:2 D6:2 F6:4 E6:2 D6:2 C6:4 | D6:4 B5:4 G5:4 r:4',
    },
    caverns: {
      bpm: 118, bass: 'long', arp: true, drums: 'soft', lead2: 'tri',
      chords: 'Am F G Em Am F E E',
      lead: 'A4:4 C5:2 E5:2 D5:4 C5:4 | F5:4 E5:2 C5:2 A4:8 | G4:2 B4:2 D5:4 C5:2 B4:2 G4:4 | E5:8 r:4 B4:4 | A4:2 C5:2 E5:2 A5:2 G5:4 E5:4 | F5:4 A5:4 G5:2 F5:2 E5:4 | E5:2 G#5:2 B5:4 A5:2 G#5:2 E5:4 | B5:6 A5:2 G#5:4 r:4',
    },
    sunset: {
      bpm: 160, bass: 'drive', arp: false, drums: 'drive',
      chords: 'D C G D Bm C D D',
      lead: 'F#5:2 A5:2 D6:2 A5:2 E6:3 D6:1 A5:4 | G5:2 E5:2 C6:4 B5:2 A5:2 G5:4 | B5:2 D6:2 G6:3 F#6:1 E6:2 D6:2 B5:4 | A5:6 F#5:2 D5:4 r:4 | D6:2 C#6:2 B5:2 F#5:2 B5:4 D6:4 | E6:2 D6:2 C6:2 G5:2 C6:4 E6:4 | F#6:2 E6:2 D6:2 A5:2 D6:2 E6:2 F#6:4 | A6:6 F#6:2 D6:4 r:4',
    },
    frost: {
      bpm: 126, bass: 'bounce', arp: true, drums: 'light', lead2: 'tri',
      chords: 'F Am Bb C Dm Bb C F',
      lead: 'C6:4 A5:2 F5:2 A5:4 C6:4 | E6:4 C6:2 A5:2 E5:8 | D6:4 F6:2 D6:2 Bb5:4 F5:4 | G5:2 A5:2 Bb5:2 C6:2 E6:8 | D6:4 A5:2 F5:2 D5:4 F5:4 | Bb5:4 D6:2 F6:2 Bb6:8 | A6:2 G6:2 E6:2 C6:2 G6:4 E6:4 | F6:8 r:8',
    },
    fortress: {
      bpm: 142, bass: 'drive', arp: false, drums: 'heavy',
      chords: 'Em C D Em Em C B B',
      lead: 'E5:2 E5:1 G5:1 B5:2 E5:2 D6:2 B5:2 G5:4 | E5:2 E5:1 G5:1 C6:2 E5:2 E6:2 C6:2 G5:4 | D5:2 F#5:2 A5:2 D6:2 C6:2 A5:2 F#5:4 | G5:4 F#5:4 E5:8 | B5:2 B5:1 B5:1 A5:2 G5:2 A5:2 B5:2 E6:4 | C6:2 B5:2 A5:2 G5:2 E5:4 G5:4 | F#5:2 A5:2 B5:2 D#6:2 F#6:4 D#6:4 | B5:8 r:8',
    },
    boss: {
      bpm: 168, bass: 'drive', arp: false, drums: 'march',
      chords: 'Cm Ab Bb Cm Cm Ab G G',
      lead: 'C5:1 C5:1 r:1 C5:1 Eb5:2 G5:2 C6:4 Bb5:2 G5:2 | Ab5:4 G5:2 Eb5:2 C5:8 | Bb4:2 D5:2 F5:2 Bb5:2 Ab5:4 F5:4 | G5:4 Eb5:4 C5:8 | C6:2 B5:2 C6:2 G5:2 Eb5:2 G5:2 C6:4 | Ab5:2 G5:2 Ab5:2 Eb5:2 C5:4 Eb5:4 | D5:2 F5:2 G5:2 B5:2 D6:4 B5:4 | G5:2 F5:2 D5:2 B4:2 G4:8',
    },
    inv: {
      bpm: 182, bass: 'drive', arp: true, drums: 'drive',
      chords: 'F Bb C F',
      lead: 'F5:2 A5:2 C6:2 F6:2 E6:2 C6:2 A5:4 | Bb5:2 D6:2 F6:2 Bb6:2 A6:2 F6:2 D6:4 | C6:2 E6:2 G6:2 C7:2 Bb6:2 G6:2 E6:4 | F6:4 C6:4 F6:8',
    },
    clear: {
      bpm: 150, bass: 'long', arp: true, drums: 'pop', once: true,
      chords: 'C G:8,C:8',
      lead: 'C5:1 E5:1 G5:1 C6:3 B5:1 C6:1 D6:2 E6:6 | D6:1 E6:1 F6:2 G6:12',
    },
    gameover: {
      bpm: 96, bass: 'long', arp: false, drums: null, once: true,
      chords: 'Cm G',
      lead: 'G5:4 F#5:4 F5:4 E5:4 | Eb5:4 D5:4 C5:8',
    },
  };

  function compile(song) {
    const ev = [];
    // lead
    let step = 0;
    const lead = song.lead.replace(/\|/g, ' ').trim().split(/\s+/);
    for (const tok of lead) {
      const [n, l] = tok.split(':');
      const len = l ? parseInt(l, 10) : 2;
      if (n !== 'r') ev.push({ s: step, ch: 'lead', m: noteToMidi(n), d: len });
      step += len;
    }
    const leadLen = step;
    // chords -> bass / arp
    step = 0;
    const bars = song.chords.trim().split(/\s+/);
    for (const bar of bars) {
      for (const part of bar.split(',')) {
        const [name, l] = part.split(':');
        const len = l ? parseInt(l, 10) : 16;
        const ch = parseChord(name);
        const root = 36 + ch.root; // C2 based
        const b = song.bass;
        for (let i = 0; i < len; i++) {
          const s = step + i;
          if (b === 'drive' && i % 2 === 0) ev.push({ s, ch: 'bass', m: root + (i % 4 === 2 ? 12 : 0), d: 2 });
          if (b === 'bounce' && i % 4 === 0) { const k = (i / 4) % 4; ev.push({ s, ch: 'bass', m: root + [0, 7, 12, 7][k], d: 3 }); }
          if (b === 'long' && i % 8 === 0) ev.push({ s, ch: 'bass', m: root + (i % 16 === 8 ? 7 : 0), d: 7 });
          if (song.arp && i % 2 === 0) {
            const iv = ch.iv;
            const k = (i / 2) % (iv.length * 2 - 2);
            const idx = k < iv.length ? k : iv.length * 2 - 2 - k;
            ev.push({ s, ch: 'arp', m: 60 + ch.root + iv[idx] + (ch.root > 6 ? -12 : 0) + 12, d: 1 });
          }
        }
        step += len;
      }
    }
    const chordLen = step;
    const L = Math.max(leadLen, chordLen);
    if (leadLen !== chordLen) console.warn('song length mismatch', leadLen, chordLen);
    // drums
    if (song.drums) {
      const p = DR[song.drums];
      for (let s = 0; s < L; s++) {
        const i = s % 16;
        if (p.k[i] === 'x') ev.push({ s, ch: 'kick' });
        if (p.s[i] === 'x') ev.push({ s, ch: 'snare' });
        if (p.h[i] === 'x') ev.push({ s, ch: 'hat' });
      }
    }
    // bucket by step
    const steps = [];
    for (let i = 0; i < L; i++) steps.push([]);
    for (const e of ev) if (e.s < L) steps[e.s].push(e);
    return { steps, len: L, spb: 60 / song.bpm / 4, once: !!song.once, lead2: song.lead2 };
  }

  const AU = (G.Audio = {
    ctx: null, enabled: true, musicOn: true, sfxOn: true,
    songName: null, song: null, step: 0, nextT: 0, timer: null, tempo: 1,
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { this.ctx = new AC(); } catch (e) { return; }
        const c = this.ctx;
        this.master = c.createGain(); this.master.gain.value = 0.7; this.master.connect(c.destination);
        this.sfxBus = c.createGain(); this.sfxBus.gain.value = this.sfxOn ? 0.55 : 0; this.sfxBus.connect(this.master);
        this.musBus = c.createGain(); this.musBus.gain.value = this.musicOn ? 0.32 : 0; this.musBus.connect(this.master);
        // echo for the lead
        this.echo = c.createDelay(); this.echo.delayTime.value = 0.19;
        const fb = c.createGain(); fb.gain.value = 0.28;
        const wet = c.createGain(); wet.gain.value = 0.22;
        this.echo.connect(fb); fb.connect(this.echo); this.echo.connect(wet); wet.connect(this.musBus);
        // noise
        const nb = c.createBuffer(1, c.sampleRate, c.sampleRate);
        const d = nb.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = nb;
        this.waves = {};
        for (const duty of [0.125, 0.25, 0.5]) {
          const n = 32, real = new Float32Array(n), imag = new Float32Array(n);
          for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
          this.waves[duty] = c.createPeriodicWave(real, imag);
        }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.pending) { const p = this.pending; this.pending = null; this.play(p); }
    },
    setMusic(on) { this.musicOn = on; if (this.musBus) this.musBus.gain.value = on ? 0.32 : 0; },
    setSfx(on) { this.sfxOn = on; if (this.sfxBus) this.sfxBus.gain.value = on ? 0.55 : 0; },

    // ---------- primitives ----------
    osc(type, f0, f1, dur, vol, when, bus, opt = {}) {
      const c = this.ctx;
      const o = c.createOscillator();
      if (typeof type === 'number') o.setPeriodicWave(this.waves[type]); else o.type = type;
      const g = c.createGain();
      const t = when || c.currentTime;
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) {
        if (opt.lin) o.frequency.linearRampToValueAtTime(f1, t + dur);
        else o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      }
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + (opt.atk || 0.005));
      if (opt.sustain) g.gain.setValueAtTime(vol, t + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let out = g;
      if (opt.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = opt.pan; g.connect(p); out = p; }
      o.connect(g); out.connect(bus || this.sfxBus);
      o.start(t); o.stop(t + dur + 0.02);
      return o;
    },
    noise(dur, vol, when, filt, f0, f1, bus) {
      const c = this.ctx;
      const s = c.createBufferSource();
      s.buffer = this.noiseBuf;
      s.loop = true;
      const f = c.createBiquadFilter();
      f.type = filt || 'bandpass';
      const t = when || c.currentTime;
      f.frequency.setValueAtTime(f0 || 1000, t);
      if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      f.Q.value = filt === 'bandpass' ? 1.2 : 0.7;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    },
    notes(list, wave, vol, gap, dur) {
      const t = this.ctx.currentTime;
      list.forEach((m, i) => this.osc(wave, mtof(m), 0, dur, vol, t + i * gap));
    },

    // ---------- sound effects ----------
    ringPan: 1,
    sfx(name, opt = {}) {
      if (!this.ctx || !this.sfxOn) return;
      const t = this.ctx.currentTime;
      switch (name) {
        case 'jump': this.osc(0.25, 280, 780, 0.16, 0.22); break;
        case 'twirl': this.osc('triangle', 600, 1400, 0.12, 0.25); this.osc('triangle', 1400, 900, 0.12, 0.2, t + 0.1); break;
        case 'ring':
          this.ringPan = -this.ringPan;
          this.osc(0.125, 1318, 0, 0.07, 0.2, t, null, { pan: this.ringPan * 0.6 });
          this.osc(0.125, 1976, 0, 0.32, 0.18, t + 0.06, null, { pan: this.ringPan * 0.6 });
          break;
        case 'charge': { const r = opt.rev || 0; this.osc('sawtooth', 300 + r * 60, 1100 + r * 120, 0.2, 0.12); this.noise(0.2, 0.15, t, 'bandpass', 800 + r * 200, 3000); break; }
        case 'release': this.noise(0.35, 0.35, t, 'bandpass', 3000, 300); this.osc('sawtooth', 900, 120, 0.3, 0.12); break;
        case 'roll': this.noise(0.18, 0.25, t, 'bandpass', 1600, 500); break;
        case 'spring': this.osc('triangle', 160, 900, 0.22, 0.32); this.osc(0.5, 320, 1200, 0.18, 0.08, t + 0.03); break;
        case 'skid': this.noise(0.22, 0.25, t, 'bandpass', 2600, 1800); break;
        case 'hurt': this.osc(0.5, 700, 160, 0.3, 0.18); break;
        case 'ringloss':
          for (let i = 0; i < 7; i++) this.osc(0.125, 2000 - i * 140, 0, 0.12, 0.12, t + i * 0.035, null, { pan: i % 2 ? -0.5 : 0.5 });
          break;
        case 'pop': this.noise(0.3, 0.45, t, 'lowpass', 2400, 200); this.osc(0.5, 300, 60, 0.25, 0.18); break;
        case 'checkpoint': this.notes([84, 88, 91, 96], 0.25, 0.14, 0.06, 0.14); break;
        case 'goal': this.osc('triangle', 400, 1600, 0.4, 0.25); this.notes([79, 84, 88, 91], 0.125, 0.1, 0.08, 0.2); break;
        case 'tick': this.osc(0.125, 2400, 0, 0.03, 0.08); break;
        case 'die': this.osc(0.5, 900, 70, 0.7, 0.22); this.noise(0.4, 0.15, t, 'lowpass', 1200, 100); break;
        case 'boost': this.noise(0.3, 0.3, t, 'highpass', 1500, 6000); this.osc('sine', 300, 1200, 0.25, 0.15); break;
        case 'crumble': this.noise(0.5, 0.4, t, 'lowpass', 900, 120); break;
        case 'shoot': this.osc(0.25, 900, 300, 0.12, 0.12); break;
        case 'deflect': this.osc('triangle', 1800, 2600, 0.1, 0.2); break;
        case 'medal': this.notes([84, 88, 91, 96, 100, 103], 0.125, 0.13, 0.05, 0.3); break;
        case 'menu': this.osc(0.25, 880, 0, 0.05, 0.12); break;
        case 'select': this.osc(0.25, 660, 1320, 0.12, 0.16); break;
        case 'back': this.osc(0.25, 660, 330, 0.1, 0.14); break;
        case 'shield': this.notes([72, 79, 84, 91], 'triangle', 0.2, 0.04, 0.2); break;
        case 'power': this.notes([72, 76, 79, 84], 0.25, 0.14, 0.05, 0.18); break;
        case 'life': this.notes([72, 76, 79, 84, 79, 84, 88], 0.25, 0.16, 0.09, 0.2); break;
        case 'bosshit': this.osc(0.5, 140, 60, 0.3, 0.3); this.noise(0.25, 0.4, t, 'highpass', 3000, 800); this.osc('square', 1200, 600, 0.12, 0.08); break;
        case 'boom': this.noise(0.9, 0.6, t, 'lowpass', 1600, 60); this.osc('sine', 120, 30, 0.6, 0.4); break;
        case 'laser': this.osc('sawtooth', 1800, 600, 0.25, 0.1); break;
        case 'thud': this.osc('sine', 120, 40, 0.25, 0.4); this.noise(0.2, 0.3, t, 'lowpass', 600, 80); break;
        case 'icicle': this.osc('triangle', 2400, 1200, 0.15, 0.15); break;
        case 'count': this.osc(0.25, 1600, 0, 0.03, 0.08); break;
      }
    },

    // ---------- music ----------
    play(name, opt = {}) {
      if (!this.ctx) { this.pending = name; return; }
      if (this.songName === name && this.song && !opt.restart) return;
      this.stop();
      const def = SONGS[name];
      if (!def) return;
      if (!def._c) def._c = compile(def);
      this.songName = name;
      this.song = def._c;
      this.step = 0;
      this.nextT = this.ctx.currentTime + 0.06;
      this.onEnd = opt.onEnd || null;
      this.timer = setInterval(() => this.tick(), 25);
    },
    stop() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null; this.song = null; this.songName = null;
    },
    setTempo(m) { this.tempo = m; },
    tick() {
      const c = this.ctx, S = this.song;
      if (!S) return;
      while (this.nextT < c.currentTime + 0.12) {
        if (this.step >= S.len) {
          if (S.once) { const cb = this.onEnd; this.stop(); if (cb) cb(); return; }
          this.step = 0;
        }
        const spb = S.spb / this.tempo;
        for (const e of S.steps[this.step]) this.voice(e, this.nextT, spb, S);
        this.step++;
        this.nextT += spb;
      }
    },
    voice(e, t, spb, S) {
      if (!this.musicOn) return;
      const bus = this.musBus;
      switch (e.ch) {
        case 'lead': {
          const f = mtof(e.m), dur = e.d * spb * 0.95;
          const o = this.osc(S.lead2 === 'tri' ? 'triangle' : 0.25, f, 0, dur, S.lead2 === 'tri' ? 0.34 : 0.2, t, bus, { sustain: true });
          // send to echo
          const g = this.ctx.createGain(); g.gain.value = 0.5;
          o.connect(g); g.connect(this.echo);
          setTimeout(() => { try { g.disconnect(); } catch (er) {} }, (dur + 1.5) * 1000);
          if (S.lead2 === 'tri') this.osc(0.125, f * 2, 0, dur * 0.6, 0.05, t, bus);
          break;
        }
        case 'bass': this.osc('triangle', mtof(e.m), 0, e.d * spb * 0.9, 0.5, t, bus, { sustain: true }); this.osc(0.5, mtof(e.m), 0, e.d * spb * 0.5, 0.06, t, bus); break;
        case 'arp': this.osc(0.125, mtof(e.m), 0, spb * 1.6, 0.06, t, bus); break;
        case 'kick': this.osc('sine', 160, 45, 0.14, 0.7, t, bus); break;
        case 'snare': this.noise(0.13, 0.32, t, 'bandpass', 1800, 900, bus); this.osc('triangle', 220, 120, 0.08, 0.2, t, bus); break;
        case 'hat': this.noise(0.035, 0.12, t, 'highpass', 7000, 0, bus); break;
      }
    },
  });
  G.SONGS = SONGS;
  G._compileSong = compile;
})(window.G);
