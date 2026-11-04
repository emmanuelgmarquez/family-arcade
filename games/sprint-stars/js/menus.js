'use strict';
// Menus: title, save slots, character select, world map, game over.
(function (G) {
  const F = () => G.Font;
  const YL = { color: '#fff26a', color2: '#ff9a1a' };
  const WH = { color: '#ffffff', color2: '#c8d8ff' };
  const GR = { color: '#8a8aa8', color2: '#5a5a78' };
  const hit = (t, x, y, w, h) => t.x >= x && t.x <= x + w && t.y >= y && t.y <= y + h;

  function menuBG(ctx, t, themeId = 'meadow', speed = 1) {
    const th = G.initTheme(G.Themes[themeId]);
    th.renderBG(ctx, th.layers, t * speed, 900, G.W, G.H, t, { bgY: 1000 });
  }
  function panel(ctx, x, y, w, h, col = 'rgba(10,16,60,0.82)', border = '#ffffff') {
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = col; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = border;
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x + 2, y + h, w, 2); ctx.fillRect(x + w, y + 2, 2, h);
  }
  function drawLogo(ctx, cx, y, t) {
    // star emblem
    const r = 34 + Math.sin(t * 0.05) * 2;
    G.Draw.star(ctx, cx, y + 24, r + 3, r * 0.45 + 2, 5, Math.sin(t * 0.02) * 0.1, '#7a2a00');
    G.Draw.star(ctx, cx, y + 24, r, r * 0.45, 5, Math.sin(t * 0.02) * 0.1, '#ffcf3a');
    G.Draw.star(ctx, cx - 2, y + 21, r * 0.55, r * 0.25, 5, Math.sin(t * 0.02) * 0.1, '#fff4b0');
    const bob = Math.round(Math.sin(t * 0.06) * 2);
    F().draw(ctx, 'SPRINT', cx, y + bob, { scale: 4, align: 'center', color: '#5ad0ff', color2: '#1a5ad8', outline: '#0a0a30' });
    F().draw(ctx, 'STARS', cx, y + 30 - bob, { scale: 4, align: 'center', color: '#fff26a', color2: '#ff7a1a', outline: '#3a1000' });
  }

  // ---------------- Title ----------------
  class TitleScene {
    enter() { this.t = 0; this.sel = 0; this.ready = false; G.Audio.play('title'); }
    items() {
      return ['START', 'MUSIC: ' + (G.Audio.musicOn ? 'ON' : 'OFF'), 'SOUND: ' + (G.Audio.sfxOn ? 'ON' : 'OFF')];
    }
    choose(i) {
      if (i === 0) { G.Audio.sfx('select'); G.Game.go(() => new SlotScene()); }
      else if (i === 1) { G.Audio.setMusic(!G.Audio.musicOn); G.Save.setting('music', G.Audio.musicOn); if (G.Audio.musicOn) G.Audio.play('title', { restart: true }); G.Audio.sfx('menu'); }
      else { G.Audio.setSfx(!G.Audio.sfxOn); G.Save.setting('sfx', G.Audio.sfxOn); G.Audio.sfx('menu'); }
    }
    update() {
      this.t++;
      const I = G.Input;
      if (!this.ready) {
        if ((I.confirm() || I.taps.length) && this.t > 20) { this.ready = true; G.Audio.unlock(); G.Audio.play('title'); G.Audio.sfx('select'); }
        return;
      }
      if (I.pressed.down) { this.sel = (this.sel + 1) % 3; G.Audio.sfx('menu'); }
      if (I.pressed.up) { this.sel = (this.sel + 2) % 3; G.Audio.sfx('menu'); }
      if (I.confirm()) this.choose(this.sel);
      for (const t of I.taps) this.items().forEach((s, i) => { if (hit(t, G.W / 2 - 60, 168 + i * 16 - 3, 120, 14)) { this.sel = i; this.choose(i); } });
    }
    render(ctx) {
      const W = G.W, t = this.t;
      menuBG(ctx, t, 'meadow', 1.5);
      drawLogo(ctx, W / 2, 34, t);
      // running characters
      const run = (id, x) => {
        const fr = G.Art.charFrames(id, 'run');
        ctx.drawImage(fr[Math.floor(t / 4) % fr.length], Math.round(x), 136);
      };
      run('bolt', 6 + Math.sin(t * 0.02) * 6);
      run('rosie', W - 70 + Math.sin(t * 0.02 + 2) * 6);
      if (!this.ready) {
        if ((t >> 5) % 2 === 0) F().draw(ctx, G.Input.usingTouch ? 'TAP TO START' : 'PRESS SPACE TO START', W / 2, 206, Object.assign({ align: 'center', scale: 1 }, WH));
      } else {
        panel(ctx, W / 2 - 62, 162, 124, 54);
        this.items().forEach((s, i) => F().draw(ctx, (i === this.sel ? '> ' : '  ') + s, W / 2 - 54, 168 + i * 16, i === this.sel ? YL : WH));
      }
      F().draw(ctx, 'AN ORIGINAL ADVENTURE', W / 2, 228, { align: 'center', color: '#c8d8ff', color2: '#8aa8e8' });
    }
  }

  // ---------------- Save slots ----------------
  class SlotScene {
    enter() { this.t = 0; this.sel = 0; this.mode = 'pick'; this.confirmSel = 1; G.Audio.play('map'); }
    cardRect(i) {
      const cw = Math.floor((G.W - 40) / 3), x = 10 + i * (cw + 10);
      return [x, 44, cw, 130];
    }
    pick(i) {
      if (this.mode === 'erase') {
        if (!G.Save.slot(i)) { G.Audio.sfx('back'); return; }
        this.mode = 'confirm'; this.sel = i; this.confirmSel = 1; G.Audio.sfx('menu');
        return;
      }
      G.Audio.sfx('select');
      if (G.Save.slot(i)) { G.Save.begin(i); G.Game.go(() => new MapScene({})); }
      else G.Game.go(() => new CharScene({ newSlot: i }));
    }
    update() {
      this.t++;
      const I = G.Input;
      if (this.mode === 'confirm') {
        if (I.pressed.left || I.pressed.right) { this.confirmSel = 1 - this.confirmSel; G.Audio.sfx('menu'); }
        const yes = () => { G.Save.erase(this.sel); this.mode = 'pick'; G.Audio.sfx('crumble'); };
        const no = () => { this.mode = 'pick'; G.Audio.sfx('back'); };
        if (I.confirm()) (this.confirmSel === 0 ? yes : no)();
        for (const t of I.taps) {
          if (hit(t, G.W / 2 - 60, 120, 50, 18)) yes();
          else if (hit(t, G.W / 2 + 10, 120, 50, 18)) no();
        }
        if (I.pressed.back || I.pressed.pause) no();
        return;
      }
      if (I.pressed.right) { this.sel = Math.min(3, this.sel + 1); if (this.sel === 3) this.sel = 2; G.Audio.sfx('menu'); }
      if (I.pressed.left) { this.sel = Math.max(0, this.sel - 1); G.Audio.sfx('menu'); }
      if (I.pressed.down) { this.focusErase = true; G.Audio.sfx('menu'); }
      if (I.pressed.up) { this.focusErase = false; G.Audio.sfx('menu'); }
      if (I.confirm()) {
        if (this.focusErase) { this.mode = this.mode === 'erase' ? 'pick' : 'erase'; this.focusErase = false; G.Audio.sfx('menu'); }
        else this.pick(this.sel);
      }
      if (I.pressed.back || I.pressed.pause) {
        if (this.mode === 'erase') this.mode = 'pick';
        else G.Game.go(() => new TitleScene());
      }
      for (const t of I.taps) {
        for (let i = 0; i < 3; i++) { const r = this.cardRect(i); if (hit(t, ...r)) { this.sel = i; this.pick(i); } }
        if (hit(t, G.W / 2 - 40, 188, 80, 16)) { this.mode = this.mode === 'erase' ? 'pick' : 'erase'; G.Audio.sfx('menu'); }
        if (hit(t, 4, 4, 50, 16)) G.Game.go(() => new TitleScene());
      }
    }
    render(ctx) {
      const W = G.W, t = this.t;
      menuBG(ctx, t, 'meadow', 0.6);
      F().draw(ctx, this.mode === 'erase' ? 'ERASE WHICH SAVE?' : 'CHOOSE YOUR SAVE', W / 2, 16, Object.assign({ scale: 2, align: 'center' }, this.mode === 'erase' ? { color: '#ff8a8a', color2: '#e83a3a' } : WH));
      F().draw(ctx, '< BACK', 6, 6, { color: '#c8d8ff' });
      for (let i = 0; i < 3; i++) {
        const [x, y, w, h] = this.cardRect(i);
        const sel = i === this.sel && !this.focusErase;
        const s = G.Save.slot(i);
        const bob = sel ? Math.round(Math.sin(t * 0.15) * 2) : 0;
        panel(ctx, x, y + bob, w, h, sel ? 'rgba(30,60,160,0.92)' : 'rgba(10,16,60,0.82)', sel ? '#ffe24a' : '#ffffff');
        F().draw(ctx, 'PLAYER ' + (i + 1), x + w / 2, y + 6 + bob, Object.assign({ align: 'center' }, sel ? YL : WH));
        if (!s) {
          F().draw(ctx, 'NEW', x + w / 2, y + 52 + bob, Object.assign({ align: 'center', scale: 2 }, WH));
          F().draw(ctx, 'GAME', x + w / 2, y + 72 + bob, Object.assign({ align: 'center', scale: 2 }, WH));
          continue;
        }
        const head = G.Art.head(s.char);
        ctx.drawImage(head, 0, 0, 28, 28, Math.round(x + w / 2 - 28), y + 18 + bob, 56, 56);
        const st = G.Save.stats(i);
        const order = G.levelOrder();
        const cur = order[Math.min(order.length - 1, st.unlocked - 1)];
        const wi = G.WORLDS.findIndex((wd) => wd.levels.includes(cur));
        const li = G.WORLDS[wi].levels.indexOf(cur);
        F().draw(ctx, G.CHARS[s.char].name, x + w / 2, y + 78 + bob, Object.assign({ align: 'center' }, YL));
        F().draw(ctx, `WORLD ${wi + 1}-${li === 2 ? 'B' : li + 1}`, x + w / 2, y + 92 + bob, Object.assign({ align: 'center' }, WH));
        ctx.drawImage(G.ObjArt.medal()[0], 0, 0, 24, 24, x + w / 2 - 26, y + 103 + bob, 16, 16);
        F().draw(ctx, 'X' + st.medals, x + w / 2 - 6, y + 108 + bob, WH);
      }
      const eb = this.focusErase || this.mode === 'erase';
      panel(ctx, W / 2 - 40, 188, 80, 16, eb ? 'rgba(160,30,30,0.9)' : 'rgba(60,10,10,0.8)', eb ? '#ffe24a' : '#ffffff');
      F().draw(ctx, this.mode === 'erase' ? 'CANCEL' : 'ERASE', W / 2, 192, Object.assign({ align: 'center' }, WH));
      F().draw(ctx, G.Input.usingTouch ? 'TAP A SAVE TO PLAY' : 'ARROWS + SPACE TO CHOOSE', W / 2, 222, { align: 'center', color: '#c8d8ff' });
      if (this.mode === 'confirm') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, G.H);
        panel(ctx, W / 2 - 90, 80, 180, 64, 'rgba(90,10,10,0.95)');
        F().draw(ctx, `ERASE PLAYER ${this.sel + 1}?`, W / 2, 92, Object.assign({ align: 'center' }, WH));
        F().draw(ctx, (this.confirmSel === 0 ? '>' : ' ') + 'YES', W / 2 - 40, 124, this.confirmSel === 0 ? YL : WH);
        F().draw(ctx, (this.confirmSel === 1 ? '>' : ' ') + 'NO', W / 2 + 20, 124, this.confirmSel === 1 ? YL : WH);
      }
    }
  }

  // ---------------- Character select ----------------
  class CharScene {
    constructor(o) { this.o = o; }
    enter() {
      this.t = 0;
      this.ids = Object.keys(G.CHARS);
      this.sel = Math.max(0, this.ids.indexOf(G.Session.charId));
      this.chosen = -1;
      G.Audio.play('map');
    }
    choose() {
      if (this.chosen >= 0) return;
      this.chosen = this.t;
      const id = this.ids[this.sel];
      G.Audio.sfx('life');
      if (this.o.newSlot !== undefined) { G.Save.newSlot(this.o.newSlot, id); G.Save.begin(this.o.newSlot); }
      else G.Save.setChar(id);
      setTimeout(() => G.Game.go(() => new MapScene({})), 700);
    }
    update() {
      this.t++;
      const I = G.Input;
      if (this.chosen >= 0) return;
      if (I.pressed.left || I.pressed.right) { this.sel = (this.sel + 1) % this.ids.length; G.Audio.sfx('menu'); }
      if (I.confirm()) this.choose();
      if (I.pressed.back || I.pressed.pause) G.Game.go(() => (this.o.newSlot !== undefined ? new SlotScene() : new MapScene({})));
      for (const t of I.taps) {
        this.ids.forEach((id, i) => {
          const cx = G.W / 2 + (i === 0 ? -1 : 1) * G.W * 0.24;
          if (hit(t, cx - 60, 30, 120, 170)) { if (this.sel === i) this.choose(); else { this.sel = i; G.Audio.sfx('menu'); } }
        });
        if (hit(t, 4, 4, 50, 16)) G.Game.go(() => (this.o.newSlot !== undefined ? new SlotScene() : new MapScene({})));
      }
    }
    render(ctx) {
      const W = G.W, t = this.t;
      menuBG(ctx, t, 'meadow', 0.8);
      F().draw(ctx, 'CHOOSE YOUR HERO', W / 2, 12, Object.assign({ scale: 2, align: 'center' }, WH));
      F().draw(ctx, '< BACK', 6, 6, { color: '#c8d8ff' });
      this.ids.forEach((id, i) => {
        const d = G.CHARS[id];
        const sel = i === this.sel;
        const cx = Math.round(W / 2 + (i === 0 ? -1 : 1) * W * 0.24);
        panel(ctx, cx - 72, 34, 144, 168, sel ? 'rgba(30,60,160,0.9)' : 'rgba(10,16,60,0.75)', sel ? '#ffe24a' : '#8a8aa8');
        const anim = sel ? (this.chosen >= 0 ? 'victory' : 'idle') : 'idle';
        const fr = G.Art.charFrames(id, anim);
        const img = fr[Math.floor(t / (anim === 'victory' ? 8 : 12)) % fr.length];
        ctx.save();
        if (!sel) ctx.globalAlpha = 0.6;
        ctx.drawImage(img, 0, 0, 64, 64, cx - 64, 36, 128, 128);
        ctx.restore();
        F().draw(ctx, d.name, cx, 158, Object.assign({ align: 'center', scale: 2 }, sel ? YL : GR));
        F().draw(ctx, d.title, cx, 176, Object.assign({ align: 'center' }, sel ? WH : GR));
        d.desc.forEach((s, k) => F().draw(ctx, s, cx, 186 + k * 9, { align: 'center', color: sel ? '#9ae8ff' : '#6a6a88' }));
        if (sel && (t >> 4) % 2) { F().draw(ctx, '<', cx - 68, 96, YL); F().draw(ctx, '>', cx + 62, 96, YL); }
      });
      F().draw(ctx, G.Input.usingTouch ? 'TAP YOUR HERO TWICE TO PLAY' : 'LEFT / RIGHT, THEN SPACE', W / 2, 226, { align: 'center', color: '#c8d8ff' });
    }
  }

  // ---------------- World map ----------------
  class MapScene {
    constructor(o) { this.o = o || {}; }
    enter() {
      this.t = 0;
      this.flat = [];
      G.WORLDS.forEach((w, wi) => w.levels.forEach((l, li) => this.flat.push({ id: l, wi, li })));
      const order = G.levelOrder();
      const s = G.Save.slot();
      this.unlocked = s ? s.unlocked : 1;
      // default selection: the furthest unlocked level (or next after the one just cleared)
      let target = order[Math.min(order.length - 1, this.unlocked - 1)];
      if (this.o.fromLevel) {
        const k = order.indexOf(this.o.fromLevel);
        if (k >= 0 && k + 1 < order.length && k + 1 < this.unlocked) target = order[k + 1];
        else if (k >= 0) target = order[k];
      }
      this.sel = Math.max(0, this.flat.findIndex((f) => f.id === target));
      this.slide = 0;
      G.Audio.play('map');
    }
    playable(i) {
      const f = this.flat[i];
      if (!G.LEVELS[f.id]) return false;
      return G.levelOrder().indexOf(f.id) < this.unlocked;
    }
    move(d) {
      const n = this.sel + d;
      if (n < 0 || n >= this.flat.length) return;
      this.sel = n; this.slide = d * 12;
      G.Audio.sfx('menu');
    }
    start() {
      if (!this.playable(this.sel)) { G.Audio.sfx('back'); return; }
      G.Audio.sfx('select');
      const id = this.flat[this.sel].id;
      G.Game.go(() => new G.PlayScene({ levelId: id, charId: G.Session.charId }));
    }
    update() {
      this.t++;
      if (this.slide) this.slide -= Math.sign(this.slide) * 2;
      const I = G.Input;
      if (I.pressed.right) this.move(1);
      if (I.pressed.left) this.move(-1);
      if (I.confirm()) this.start();
      if (I.pressed.up || I.pressed.dash) G.Game.go(() => new CharScene({}));
      if (I.pressed.back || I.pressed.pause) G.Game.go(() => new SlotScene());
      const W = G.W;
      for (const t of I.taps) {
        if (hit(t, 0, 70, 40, 60)) this.move(-1);
        else if (hit(t, W - 40, 70, 40, 60)) this.move(1);
        const f = this.flat[this.sel];
        for (let li = 0; li < 3; li++) {
          const nx = W / 2 + (li - 1) * 74;
          if (hit(t, nx - 30, 128, 60, 44)) {
            const idx = this.flat.findIndex((q) => q.wi === f.wi && q.li === li);
            if (idx === this.sel) this.start(); else { this.sel = idx; G.Audio.sfx('menu'); }
          }
        }
        if (hit(t, 4, G.H - 34, 110, 30)) G.Game.go(() => new CharScene({}));
        if (hit(t, 4, 4, 50, 16)) G.Game.go(() => new SlotScene());
      }
    }
    render(ctx) {
      const W = G.W, H = G.H, t = this.t;
      const f = this.flat[this.sel];
      const world = G.WORLDS[f.wi];
      const theme = G.Themes[world.theme] || G.Themes.meadow;
      G.initTheme(theme);
      theme.renderBG(ctx, theme.layers, t * 0.6, 900, W, H, t, { bgY: 1000 });
      ctx.fillStyle = 'rgba(0,0,30,0.25)'; ctx.fillRect(0, 0, W, H);
      F().draw(ctx, '< SAVES', 6, 6, { color: '#c8d8ff' });
      F().draw(ctx, `WORLD ${f.wi + 1}`, W / 2, 26, Object.assign({ align: 'center' }, YL));
      F().draw(ctx, world.name, W / 2 + this.slide, 40, Object.assign({ align: 'center', scale: 2 }, WH));
      // arrows
      if (this.sel > 0) F().draw(ctx, '<', 14 + ((t >> 4) % 2), 94, Object.assign({ scale: 3 }, YL));
      if (this.sel < this.flat.length - 1) F().draw(ctx, '>', W - 28 - ((t >> 4) % 2), 94, Object.assign({ scale: 3 }, YL));
      // world progress dots
      for (let i = 0; i < G.WORLDS.length; i++) {
        ctx.fillStyle = i === f.wi ? '#ffe24a' : '#ffffff';
        ctx.globalAlpha = i === f.wi ? 1 : 0.5;
        ctx.fillRect(Math.round(W / 2 - 40 + i * 18), 64, 10, 4);
      }
      ctx.globalAlpha = 1;
      // path between act nodes
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.5;
      for (let x = W / 2 - 74; x < W / 2 + 74; x += 8) ctx.fillRect(Math.round(x), 150, 4, 2);
      ctx.globalAlpha = 1;
      for (let li = 0; li < 3; li++) {
        const idx = this.flat.findIndex((q) => q.wi === f.wi && q.li === li);
        const q = this.flat[idx];
        const nx = Math.round(W / 2 + (li - 1) * 74);
        const sel = idx === this.sel;
        const ok = this.playable(idx);
        const built = !!G.LEVELS[q.id];
        const r = sel ? 18 + Math.sin(t * 0.15) : 15;
        ctx.fillStyle = '#101030'; ctx.beginPath(); ctx.arc(nx, 151, r + 3, 0, G.TAU); ctx.fill();
        ctx.fillStyle = ok ? world.color : '#4a4a5a'; ctx.beginPath(); ctx.arc(nx, 151, r, 0, G.TAU); ctx.fill();
        if (sel) { ctx.strokeStyle = '#ffe24a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(nx, 151, r + 3, 0, G.TAU); ctx.stroke(); }
        const label = li === 2 ? '!' : String(li + 1);
        if (ok) F().draw(ctx, label, nx, 145, Object.assign({ align: 'center', scale: 2 }, WH));
        else {
          // padlock
          ctx.fillStyle = '#c8c8d8'; ctx.fillRect(nx - 5, 149, 10, 8);
          ctx.strokeStyle = '#c8c8d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(nx, 149, 4, Math.PI, 0); ctx.stroke();
        }
        F().draw(ctx, li === 2 ? 'BOSS' : 'ACT ' + (li + 1), nx, 174, Object.assign({ align: 'center' }, sel ? YL : WH));
        if (!built && sel) F().draw(ctx, 'COMING SOON', nx, 184, { align: 'center', color: '#ff9a9a' });
      }
      // stats for the selected level
      const s = G.Save.slot();
      const L = s && s.levels[f.id];
      panel(ctx, W / 2 - 100, 192, 200, 22);
      if (L) {
        const secs = Math.floor(L.time / 60);
        F().draw(ctx, `BEST ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, W / 2 - 92, 199, WH);
        const n = G.LEVELS[f.id] ? (G.LEVELS[f.id].medalCount || 3) : 3;
        for (let i = 0; i < n; i++) {
          ctx.globalAlpha = (L.medals || [])[i] ? 1 : 0.25;
          ctx.drawImage(G.ObjArt.medal()[0], 0, 0, 24, 24, W / 2 + 30 + i * 18, 195, 16, 16);
        }
        ctx.globalAlpha = 1;
      } else F().draw(ctx, this.playable(this.sel) ? 'READY TO PLAY!' : 'LOCKED', W / 2, 199, Object.assign({ align: 'center' }, WH));
      // hero
      ctx.drawImage(G.Art.head(G.Session.charId), 6, H - 32);
      F().draw(ctx, G.CHARS[G.Session.charId].name + ' X' + G.Session.lives, 36, H - 26, YL);
      F().draw(ctx, G.Input.usingTouch ? 'TAP TO SWAP' : 'UP: SWAP HERO', 36, H - 16, { color: '#c8d8ff' });
      if ((t >> 5) % 2 === 0 && this.playable(this.sel)) F().draw(ctx, G.Input.usingTouch ? 'TAP THE ACT TO PLAY' : 'SPACE TO PLAY', W - 8, H - 16, { align: 'right', color: '#ffffff' });
    }
  }

  // ---------------- Game over ----------------
  class GameOverScene {
    constructor(o) { this.o = o; }
    enter() { this.t = 0; this.sel = 0; G.Audio.play('gameover'); }
    choose(i) {
      G.Audio.sfx('select');
      G.Session.lives = 3;
      G.Save.storeLives();
      if (i === 0) G.Game.go(() => new G.PlayScene({ levelId: this.o.levelId, charId: this.o.charId }));
      else G.Game.go(() => new MapScene({}));
    }
    update() {
      this.t++;
      const I = G.Input;
      if (this.t < 60) return;
      if (I.pressed.down || I.pressed.up) { this.sel = 1 - this.sel; G.Audio.sfx('menu'); }
      if (I.confirm()) this.choose(this.sel);
      for (const t of I.taps) for (let i = 0; i < 2; i++) if (hit(t, G.W / 2 - 70, 140 + i * 18 - 4, 140, 16)) this.choose(i);
    }
    render(ctx) {
      const W = G.W, H = G.H;
      ctx.fillStyle = '#05051a'; ctx.fillRect(0, 0, W, H);
      const k = Math.min(1, this.t / 40);
      F().draw(ctx, 'GAME', W / 2 - (1 - k) * W, 60, { scale: 4, align: 'center', color: '#ff8a5a', color2: '#e8402a' });
      F().draw(ctx, 'OVER', W / 2 + (1 - k) * W, 96, { scale: 4, align: 'center', color: '#ff8a5a', color2: '#e8402a' });
      if (this.t >= 60) {
        F().draw(ctx, 'DON\'T GIVE UP - TRY AGAIN!', W / 2, 124, { align: 'center', color: '#c8d8ff' });
        ['TRY AGAIN', 'WORLD MAP'].forEach((s, i) => F().draw(ctx, (i === this.sel ? '> ' : '  ') + s, W / 2 - 50, 140 + i * 18, i === this.sel ? YL : WH));
      }
      const fr = G.Art.charFrames(this.o.charId, 'hurt');
      ctx.drawImage(fr[(this.t >> 4) % fr.length], W / 2 - 32, 170);
    }
  }

  G.TitleScene = TitleScene;
  G.SlotScene = SlotScene;
  G.CharScene = CharScene;
  G.MapScene = MapScene;
  G.GameOverScene = GameOverScene;
})(window.G);
