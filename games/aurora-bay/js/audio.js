/* Aurora Bay — all sound is synthesised with Web Audio (no audio files to download).
 * AB.audio.sfx(name), AB.audio.music(trackId|null), AB.audio.ambient(kind|null),
 * AB.audio.setMusic(on), AB.audio.setSound(on). Music and sound are toggled separately. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util;
  var AU = AB.audio = { musicOn: true, soundOn: true };
  var ctx = null, master, musicBus, sfxBus, ambBus, noiseBuf;
  var current = null, nextNoteTime = 0, step = 0, schedTimer = null, ambNodes = null, ambKind = null;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = AU.musicOn ? 0.32 : 0; musicBus.connect(comp);
    sfxBus = ctx.createGain(); sfxBus.gain.value = AU.soundOn ? 0.55 : 0; sfxBus.connect(comp);
    ambBus = ctx.createGain(); ambBus.gain.value = AU.soundOn ? 0.5 : 0; ambBus.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0), last = 0;
    for (var i = 0; i < d.length; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    return ctx;
  }
  AU.unlock = function () {
    var c = ensure(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    // iOS needs a sound started inside the gesture.
    try { var o = c.createOscillator(), g = c.createGain(); g.gain.value = 0; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.01); } catch (e) { /* ignore */ }
    if (current && !schedTimer) startScheduler();
    if (ambKind && !ambNodes) AU.ambient(ambKind);
  };
  AU.setMusic = function (on) { AU.musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.2); };
  AU.setSound = function (on) {
    AU.soundOn = on;
    if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.05);
    if (ambBus) ambBus.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.3);
  };

  // ------------------------------------------------------------ voices
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function tone(bus, freq, t, dur, opt) {
    opt = opt || {};
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = opt.type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, opt.slide), t + dur);
    var v = opt.vol == null ? 0.3 : opt.vol, a = opt.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var node = o;
    if (opt.filter) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.filter; o.connect(f); node = f; }
    node.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
    if (opt.harm) { // music-box sparkle partial
      var o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.type = 'sine'; o2.frequency.value = freq * opt.harm;
      g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(v * 0.25, t + a); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.4);
      o2.connect(g2); g2.connect(bus); o2.start(t); o2.stop(t + dur);
    }
  }
  function noise(bus, t, dur, opt) {
    opt = opt || {};
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = opt.ftype || 'bandpass'; f.frequency.setValueAtTime(opt.freq || 1200, t);
    if (opt.sweep) f.frequency.exponentialRampToValueAtTime(opt.sweep, t + dur);
    f.Q.value = opt.q || 1;
    var g = ctx.createGain(); var v = opt.vol == null ? 0.3 : opt.vol;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (opt.attack || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  // ------------------------------------------------------------ sfx
  var SFX = {
    tap: function (t) { tone(sfxBus, 880, t, 0.08, { type: 'triangle', vol: 0.18 }); },
    step: function (t) { noise(sfxBus, t, 0.09, { freq: 2600, q: 0.8, vol: 0.06 }); },
    coin: function (t) { tone(sfxBus, 1318, t, 0.12, { type: 'square', vol: 0.08, filter: 4000 }); tone(sfxBus, 1760, t + 0.08, 0.3, { type: 'square', vol: 0.08, filter: 4000 }); },
    buy: function (t) { [0, 4, 7, 12].forEach(function (n, i) { tone(sfxBus, mtof(72 + n), t + i * 0.07, 0.35, { type: 'triangle', vol: 0.18, harm: 3 }); }); },
    splash: function (t) { noise(sfxBus, t, 0.45, { freq: 900, sweep: 300, q: 0.7, vol: 0.3 }); tone(sfxBus, 500, t, 0.2, { slide: 160, vol: 0.12 }); },
    success: function (t) { [0, 4, 7, 12, 16].forEach(function (n, i) { tone(sfxBus, mtof(67 + n), t + i * 0.08, 0.45, { type: 'triangle', vol: 0.18, harm: 2 }); }); },
    oops: function (t) { tone(sfxBus, 420, t, 0.18, { type: 'triangle', slide: 260, vol: 0.2 }); tone(sfxBus, 330, t + 0.16, 0.25, { type: 'triangle', slide: 200, vol: 0.18 }); },
    whoosh: function (t) { noise(sfxBus, t, 0.35, { freq: 400, sweep: 2400, q: 0.9, vol: 0.18, attack: 0.08 }); },
    pop: function (t) { tone(sfxBus, 600, t, 0.09, { slide: 1300, vol: 0.22 }); },
    bell: function (t) { [0, 7, 12].forEach(function (n) { tone(sfxBus, mtof(79 + n), t, 1.6, { vol: 0.12, harm: 2.76 }); }); },
    star: function (t) { tone(sfxBus, 1568, t, 0.12, { type: 'triangle', vol: 0.15 }); tone(sfxBus, 2093, t + 0.07, 0.25, { type: 'triangle', vol: 0.15 }); },
    catch: function (t) { tone(sfxBus, 300, t, 0.12, { type: 'triangle', slide: 700, vol: 0.2 }); },
    slurp: function (t) { noise(sfxBus, t, 0.3, { freq: 600, sweep: 1600, q: 3, vol: 0.12 }); },
    ding: function (t) { tone(sfxBus, 1760, t, 0.6, { vol: 0.18, harm: 2.4 }); },
    jump: function (t) { tone(sfxBus, 320, t, 0.22, { type: 'triangle', slide: 820, vol: 0.18 }); },
    door: function (t) { noise(sfxBus, t, 0.18, { freq: 300, q: 1.2, vol: 0.18 }); tone(sfxBus, 180, t, 0.12, { type: 'triangle', vol: 0.12 }); },
    snow: function (t) { noise(sfxBus, t, 0.5, { freq: 3000, sweep: 900, q: 0.5, vol: 0.2, attack: 0.03 }); },
    open: function (t) { tone(sfxBus, 660, t, 0.1, { type: 'triangle', vol: 0.14 }); tone(sfxBus, 990, t + 0.06, 0.14, { type: 'triangle', vol: 0.14 }); },
    close: function (t) { tone(sfxBus, 990, t, 0.1, { type: 'triangle', vol: 0.12 }); tone(sfxBus, 660, t + 0.06, 0.14, { type: 'triangle', vol: 0.12 }); },
    chirp: function (t) { tone(sfxBus, 1400, t, 0.08, { slide: 2000, vol: 0.12 }); tone(sfxBus, 1600, t + 0.1, 0.1, { slide: 2400, vol: 0.12 }); },
    purr: function (t) { tone(sfxBus, 70, t, 0.7, { type: 'sawtooth', vol: 0.05, filter: 300, attack: 0.1 }); },
    sparkle: function (t) { [0, 3, 7, 10].forEach(function (n, i) { tone(sfxBus, mtof(88 + n), t + i * 0.05, 0.3, { vol: 0.07 }); }); },
    place: function (t) { tone(sfxBus, 220, t, 0.1, { type: 'triangle', vol: 0.2 }); noise(sfxBus, t, 0.06, { freq: 800, vol: 0.08 }); },
    soft: function (t) { tone(sfxBus, 520, t, 0.12, { type: 'sine', vol: 0.12 }); },
    hey: function (t) { tone(sfxBus, mtof(74), t, 0.12, { type: 'triangle', vol: 0.12 }); tone(sfxBus, mtof(79), t + 0.1, 0.18, { type: 'triangle', vol: 0.12 }); }
  };
  var lastSfx = {};
  AU.sfx = function (name) {
    if (!AU.soundOn) return;
    var c = ensure(); if (!c || c.state !== 'running') return;
    var now = c.currentTime;
    if (lastSfx[name] && now - lastSfx[name] < 0.03) return; lastSfx[name] = now;
    var f = SFX[name]; if (f) try { f(now + 0.005); } catch (e) { /* ignore */ }
  };

  // ------------------------------------------------------------ music
  // Each track: tempo, beats per bar, chords (MIDI roots + quality), scale for the melody,
  // and a seed that fixes the melody so the loop sounds the same every time.
  var Q = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], d7: [0, 4, 7, 10], s4: [0, 5, 7] };
  var TRACKS = {
    town: { bpm: 100, beats: 3, chords: [[60, 'M'], [57, 'm'], [65, 'M'], [67, 'M'], [60, 'M'], [64, 'm'], [65, 'M'], [67, 'd7']], scale: [0, 2, 4, 7, 9], seed: 11, lead: 'box' },
    cafe: { bpm: 84, beats: 4, chords: [[65, 'M7'], [62, 'm7'], [58, 'M7'], [60, 'd7'], [65, 'M7'], [69, 'm7'], [58, 'M7'], [60, 'd7']], scale: [0, 2, 4, 7, 9], seed: 23, lead: 'keys', swing: true },
    lake: { bpm: 76, beats: 4, chords: [[62, 'M'], [59, 'm'], [55, 'M'], [57, 's4'], [62, 'M'], [66, 'm'], [55, 'M'], [57, 'M']], scale: [0, 2, 4, 7, 9], seed: 5, lead: 'bell' },
    harbor: { bpm: 108, beats: 3, chords: [[67, 'M'], [64, 'm'], [60, 'M'], [62, 'M'], [67, 'M'], [59, 'm'], [60, 'M'], [62, 'd7']], scale: [0, 2, 4, 5, 7, 9], seed: 41, lead: 'box' },
    igloo: { bpm: 70, beats: 3, chords: [[57, 'M'], [62, 'M'], [64, 'M'], [57, 'M'], [54, 'm'], [62, 'M'], [64, 's4'], [64, 'M']], scale: [0, 2, 4, 7, 9], seed: 3, lead: 'bell' },
    shop: { bpm: 112, beats: 4, chords: [[60, 'M7'], [65, 'M7'], [62, 'm7'], [67, 'd7']], scale: [0, 2, 4, 7, 9], seed: 31, lead: 'keys' },
    game: { bpm: 128, beats: 4, chords: [[60, 'M'], [67, 'M'], [69, 'm'], [65, 'M'], [60, 'M'], [67, 'M'], [65, 'M'], [67, 'M']], scale: [0, 2, 4, 7, 9], seed: 17, lead: 'box', drums: true },
    title: { bpm: 90, beats: 3, chords: [[64, 'm'], [60, 'M'], [55, 'M'], [62, 'M'], [64, 'm'], [60, 'M'], [62, 'M'], [62, 'M']], scale: [0, 2, 3, 7, 10], seed: 9, lead: 'bell' }
  };
  function buildMelody(tr) {
    var r = U.seeded(tr.seed * 7919), notes = [], perBar = tr.beats * 2; // eighth notes
    var deg = 2;
    for (var b = 0; b < tr.chords.length; b++) {
      for (var s = 0; s < perBar; s++) {
        var play = s === 0 || r() < (s % 2 ? 0.28 : 0.6);
        if (b % 4 === 3 && s > perBar / 2) play = false; // breathe at phrase ends
        if (!play) { notes.push(null); continue; }
        deg += Math.round((r() - 0.5) * 3); deg = U.clamp(deg, 0, tr.scale.length * 2 - 1);
        var oct = Math.floor(deg / tr.scale.length), n = tr.scale[deg % tr.scale.length];
        var root = tr.chords[b][0] % 12;
        if (s === 0) { var ct = Q[tr.chords[b][1]]; n = (root + ct[Math.floor(r() * ct.length)]) % 12; }
        notes.push(72 + n + oct * 12 - (n > 9 ? 12 : 0));
      }
    }
    tr.melody = notes;
  }
  Object.keys(TRACKS).forEach(function (k) { buildMelody(TRACKS[k]); });

  function scheduleStep(tr, t, i) {
    var perBar = tr.beats * 2, bar = Math.floor(i / perBar) % tr.chords.length, s = i % perBar;
    var spb = 60 / tr.bpm, eighth = spb / 2;
    var ch = tr.chords[bar], tones = Q[ch[1]];
    if (s === 0) {
      tone(musicBus, mtof(ch[0] - 24), t, spb * tr.beats * 0.95, { type: 'triangle', vol: 0.16, attack: 0.02 });
      tones.forEach(function (iv) { tone(musicBus, mtof(ch[0] - 12 + iv), t, spb * tr.beats, { type: 'sine', vol: 0.05, attack: 0.25 }); });
    }
    if (s % 2 === 0 && s > 0) { // gentle arpeggio
      var iv2 = tones[(s / 2) % tones.length];
      tone(musicBus, mtof(ch[0] + iv2), t, spb * 0.9, { type: 'triangle', vol: 0.045, filter: 2200 });
    }
    var m = tr.melody[(i) % tr.melody.length];
    if (m) {
      var opt = tr.lead === 'box' ? { vol: 0.11, harm: 3.01 } : tr.lead === 'keys' ? { type: 'triangle', vol: 0.1, filter: 1800, harm: 2 } : { vol: 0.1, harm: 2.76 };
      tone(musicBus, mtof(m), t + (tr.swing && s % 2 ? eighth * 0.18 : 0), eighth * 3, opt);
    }
    if (tr.drums) {
      if (s % 4 === 0) tone(musicBus, 110, t, 0.15, { slide: 45, vol: 0.25 });
      if (s % 4 === 2) noise(musicBus, t, 0.12, { freq: 1800, q: 0.7, vol: 0.08 });
      noise(musicBus, t, 0.03, { freq: 8000, ftype: 'highpass', vol: 0.025 });
    }
  }
  function startScheduler() {
    if (!ctx || schedTimer) return;
    nextNoteTime = Math.max(nextNoteTime, ctx.currentTime + 0.1);
    schedTimer = setInterval(function () {
      if (!current || !ctx || ctx.state !== 'running') return;
      var tr = TRACKS[current], eighth = 60 / tr.bpm / 2;
      while (nextNoteTime < ctx.currentTime + 0.25) {
        if (AU.musicOn) scheduleStep(tr, nextNoteTime, step);
        step++; nextNoteTime += eighth;
      }
    }, 60);
  }
  AU.music = function (id) {
    if (id === current) return;
    current = id && TRACKS[id] ? id : null;
    step = 0;
    if (!ctx) return;
    if (musicBus && AU.musicOn) { musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setValueAtTime(0, ctx.currentTime); musicBus.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 1.2); }
    nextNoteTime = ctx.currentTime + 0.15;
    if (current) startScheduler();
  };

  // ------------------------------------------------------------ ambience
  AU.ambient = function (kind) {
    ambKind = kind;
    var c = ensure(); if (!c) return;
    if (ambNodes) { var old = ambNodes; ambNodes = null; try { old.g.gain.setTargetAtTime(0, c.currentTime, 0.3); setTimeout(function () { old.stop(); }, 1500); } catch (e) { /* ignore */ } }
    if (!kind || c.state !== 'running') return;
    var g = c.createGain(); g.gain.value = 0; g.connect(ambBus);
    var nodes = [];
    function loopNoise(freq, q, vol, lfoRate, lfoAmt) {
      var s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
      var vg = c.createGain(); vg.gain.value = vol;
      if (lfoRate) { var l = c.createOscillator(), lg = c.createGain(); l.frequency.value = lfoRate; lg.gain.value = lfoAmt; l.connect(lg); lg.connect(vg.gain); l.start(); nodes.push(l); }
      s.connect(f); f.connect(vg); vg.connect(g); s.start(0, Math.random()); nodes.push(s);
    }
    if (kind === 'wind') loopNoise(500, 0.6, 0.05, 0.08, 0.035);
    if (kind === 'waves') { loopNoise(700, 0.5, 0.07, 0.12, 0.06); loopNoise(300, 0.4, 0.03, 0.05, 0.02); }
    if (kind === 'fire') {
      loopNoise(300, 0.4, 0.025, 0, 0);
      var crackle = setInterval(function () { if (ambNodes && ambNodes.g === g && AU.soundOn && c.state === 'running') noise(g, c.currentTime + Math.random() * 0.2, 0.04, { freq: 2000 + Math.random() * 2000, q: 2, vol: 0.12 }); }, 260);
      nodes.push({ stop: function () { clearInterval(crackle); } });
    }
    if (kind === 'indoor') loopNoise(250, 0.4, 0.015, 0, 0);
    g.gain.setTargetAtTime(1, c.currentTime, 0.8);
    ambNodes = { g: g, stop: function () { nodes.forEach(function (n) { try { n.stop(); } catch (e) { /* ignore */ } }); g.disconnect(); } };
  };
})();
