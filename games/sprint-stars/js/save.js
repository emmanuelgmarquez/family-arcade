'use strict';
// World list, progression and the three local save slots.
(function (G) {
  G.WORLDS = [
    { id: 'w1', name: 'EMERALD MEADOW', theme: 'meadow', color: '#2aa83a', levels: ['w1a1', 'w1a2', 'w1b'] },
    { id: 'w2', name: 'CRYSTAL CAVERNS', theme: 'caverns', color: '#8a4ae8', levels: ['w2a1', 'w2a2', 'w2b'] },
    { id: 'w3', name: 'SUNSET SPEEDWAY', theme: 'sunset', color: '#ff7a3a', levels: ['w3a1', 'w3a2', 'w3b'] },
    { id: 'w4', name: 'FROSTFALL PEAKS', theme: 'frost', color: '#5ac8ff', levels: ['w4a1', 'w4a2', 'w4b'] },
    { id: 'w5', name: 'MECHANICAL FORTRESS', theme: 'fortress', color: '#9a9ab0', levels: ['w5a1', 'w5a2', 'w5b'] },
  ];
  G.levelOrder = () => {
    const out = [];
    for (const w of G.WORLDS) for (const l of w.levels) if (G.LEVELS[l]) out.push(l);
    return out;
  };

  G.Session = { slot: 0, charId: 'bolt', lives: 3, score: 0 };

  const KEY = 'sprintstars.save.v1';
  G.Save = {
    data: null,
    load() {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
      if (!d || !Array.isArray(d.slots)) d = { slots: [null, null, null], settings: { music: true, sfx: true } };
      this.data = d;
      G.Audio.setMusic(d.settings.music !== false);
      G.Audio.setSfx(d.settings.sfx !== false);
      return d;
    },
    persist() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage unavailable: progress lives for this session */ }
    },
    slot(i = G.Session.slot) { return this.data.slots[i]; },
    newSlot(i, charId) {
      this.data.slots[i] = { char: charId, unlocked: 1, levels: {}, lives: 3, score: 0, created: Date.now() };
      this.persist();
      return this.data.slots[i];
    },
    erase(i) { this.data.slots[i] = null; this.persist(); },
    begin(i) {
      const s = this.slot(i);
      G.Session.slot = i;
      G.Session.charId = s.char;
      G.Session.lives = Math.max(3, s.lives || 3);
      G.Session.score = s.score || 0;
    },
    setChar(charId) {
      const s = this.slot();
      if (s) { s.char = charId; this.persist(); }
      G.Session.charId = charId;
    },
    storeLives() {
      const s = this.slot();
      if (!s) return;
      s.lives = Math.max(1, G.Session.lives);
      s.score = G.Session.score;
      this.persist();
    },
    medalHad(levelId, idx) {
      const s = this.slot();
      if (!s || !s.levels[levelId]) return false;
      return !!(s.levels[levelId].medals || [])[idx];
    },
    completeLevel(levelId, res) {
      const s = this.slot();
      if (!s) return;
      const order = G.levelOrder();
      const idx = order.indexOf(levelId);
      s.unlocked = Math.max(s.unlocked, Math.min(order.length, idx + 2));
      const L = s.levels[levelId] || { medals: [], clears: 0 };
      L.clears = (L.clears || 0) + 1;
      if (!L.time || res.time < L.time) L.time = res.time;
      if (!L.score || res.score > L.score) L.score = res.score;
      L.rings = Math.max(L.rings || 0, res.rings || 0);
      (res.medals || []).forEach((m, i) => { if (m) L.medals[i] = true; });
      s.levels[levelId] = L;
      s.lives = G.Session.lives;
      s.score = res.score;
      s.lastLevel = levelId;
      this.persist();
    },
    stats(i) {
      const s = this.data.slots[i];
      if (!s) return null;
      let medals = 0, cleared = 0;
      for (const k in s.levels) { medals += (s.levels[k].medals || []).filter(Boolean).length; cleared++; }
      return { medals, cleared, unlocked: s.unlocked };
    },
    totalMedals() {
      let n = 0;
      for (const id of G.levelOrder()) n += G.LEVELS[id].medalCount || 3;
      return n;
    },
    setting(k, v) { this.data.settings[k] = v; this.persist(); },
  };
})(window.G);
