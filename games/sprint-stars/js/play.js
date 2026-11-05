'use strict';
// PlayScene: runs one act — physics, objects, camera, HUD, pause, results.
(function (G) {
  const TIME_BONUS = [[30, 50000], [45, 10000], [60, 5000], [90, 4000], [120, 3000], [180, 2000], [240, 1000], [300, 500]];

  class PlayScene {
    constructor(opts) {
      this.opts = opts;
      this.levelId = opts.levelId;
      this.charId = opts.charId || 'bolt';
    }
    enter() {
      const o = this.opts;
      const def = (this.def = G.LEVELS[this.levelId]());
      this.theme = G.initTheme(G.Themes[def.theme]);
      const T = (this.terrain = new G.Terrain(this.theme));
      for (const s of def.solids) T.addSolid(s.pts, s.style, s.opts);
      for (const h of def.holes) T.addHole(h.pts, h.style, h.opts);
      for (const c of def.chains) T.addChain(c.pts, c.opts);
      T.loops = def.loops;
      T.build();
      this.fx = new G.FX();
      this.objects = [];
      this.newObjects = [];
      this.time = o.cp ? o.cp.time : 0;
      this.frame = 0;
      this.ringFrame = 0;
      this.score = G.Session.score;
      this.camBottom = def.camBottom || def.bottom - 40;
      this.camTop = def.camTop || 0;
      for (const d of def.objects) {
        const ob = G.Objects.create(this, d);
        if (ob) this.objects.push(ob);
      }
      const st = o.cp ? { x: o.cp.x, y: o.cp.y } : def.start;
      this.player = new G.Player(this, G.CHARS[this.charId], st.x, st.y);
      this.player.facing = 1;
      if (o.cp) for (const ob of this.objects) if (ob.d.type === 'checkpoint' && ob.x <= o.cp.x + 1) ob.on = true;
      this.checkpoint = o.cp || null;
      this.medalsGot = [];
      this.cam = { x: st.x - G.W / 2, y: st.y - G.H / 2 };
      this.lookAhead = 0; this.lookT = 0; this.camLag = 0;
      this.clampCam(true);
      this.terrain.prewarm(this.cam.x, this.cam.y, G.W, G.H);
      this.card = o.cp ? 70 : 150; // title card timer
      this.paused = false; this.pauseSel = 0;
      this.finish = null;
      this.deadT = 0;
      this.trail = [];
      this.boss = null;
      this.flash = 0;
      this.shake = 0;
      this.player.frozen = true;
      G.Audio.play(def.music || this.theme.music);
      G.Art.preloadChar(this.charId);
      const A = G.ObjArt;
      A.ring(); A.sparkle(); A.explosion(); A.medal(); A.spring('y', 0); A.spring('y', 1); A.spring('r', 0); A.spring('r', 1);
      A.beetbot(); A.buzzwing(); A.prickler(); A.snapper(); A.orb();
      for (const k of ['ring', 'shield', 'inv', 'shoes', 'life']) { A.monitor(k, this.charId); A.iconOnly(k, this.charId); }
      A.goal('boss', 0); A.goal(this.charId, 0); for (let f = 0; f < 4; f++) A.goal('spin', f);
      A.checkpoint(false, 0); A.checkpoint(true, 0); A.checkpoint(true, 1);
      A.critter(0); A.critter(1); A.critter(2); A.monitorBroken(); A.spikes(); A.spikeball(); A.chain(); A.boost(0); A.boost(1);
      A.breakwall(this.theme.pal); for (const w of [64, 72, 76, 80, 96]) A.platform(this.theme.pal, w);
      G.Font.draw({ drawImage() {} }, '0', 0, 0, { color: '#ffffff', color2: '#ffe24a' });
      // scenery sprites: render each animation frame once so nothing is generated mid-run
      const seen = {};
      for (const d of def.decos.concat(def.decosFront)) {
        if (seen[d.type + (d.hue || 0)]) continue;
        seen[d.type + (d.hue || 0)] = 1;
        const saveFrame = this.frame;
        for (let t = 0; t < 64; t += 8) { this.frame = t; this.renderDecos({ drawImage() {} }, [d], d.x - 10, 0); }
        this.frame = saveFrame;
      }
    }

    // ---------------- scene API used by objects ----------------
    addObject(d) { const ob = G.Objects.create(this, d); if (ob) this.newObjects.push(ob); return ob; }
    addRings(n) {
      const p = this.player;
      const before = p.rings;
      p.rings += n;
      G.Audio.sfx('ring');
      if (Math.floor(p.rings / 100) > Math.floor(before / 100)) this.addLife();
    }
    addLife() { G.Session.lives++; G.Audio.sfx('life'); }
    addScore(pts, x, y, popup) {
      this.score += pts;
      if (popup) this.fx.spawn('score', x, y, 0, 0, pts);
    }
    givePower(kind) {
      const p = this.player;
      switch (kind) {
        case 'ring': this.addRings(10); break;
        case 'shield': p.shield = true; G.Audio.sfx('shield'); break;
        case 'inv': p.inv = 1200; G.Audio.sfx('power'); if (!this.boss) G.Audio.play('inv'); break;
        case 'shoes': p.shoes = 1200; G.Audio.sfx('power'); G.Audio.setTempo(1.25); break;
        case 'life': this.addLife(); break;
      }
    }
    onPowerEnd(kind) {
      if (kind === 'inv' && !this.boss && !this.finish) G.Audio.play(this.def.music || this.theme.music);
      if (kind === 'shoes') G.Audio.setTempo(1);
    }
    setCheckpoint(cp) { this.checkpoint = { x: cp.x, y: cp.y - 4, time: this.time }; }
    medalHad(idx) { return G.Save.medalHad(this.levelId, idx); }
    collectMedal(idx, x, y) {
      this.medalsGot[idx] = true;
      G.Audio.sfx('medal');
      this.fx.burst(x, y, 'sparkle', 14);
      this.addScore(1000, x, y - 12, true);
    }
    scatterRings(x, y, n) {
      n = Math.min(n, 32);
      let ang = 101.25 * (Math.PI / 180), spd = 4;
      let flip = false;
      for (let i = 0; i < n; i++) {
        if (i === 16) { spd = 2; ang = 101.25 * (Math.PI / 180); }
        const vx = Math.cos(ang) * spd * (flip ? -1 : 1);
        const vy = -Math.sin(ang) * spd;
        this.addObject({ type: 'loosering', x, y, vx, vy });
        if (flip) ang += 22.5 * (Math.PI / 180);
        flip = !flip;
      }
    }
    spawnCritter(x, y) {
      this.addObject({ type: 'critter', x, y, kind: Math.floor(Math.random() * 3), dir: Math.random() < 0.5 ? -1 : 1 });
    }
    onPlayerDeath() {
      this.deadT = 1;
      G.Audio.stop();
    }
    onGoal() {
      this.finish = { t: 0, stage: 0 };
      G.Audio.stop();
    }
    onGoalShown() {
      if (!this.finish) this.finish = { t: 0, stage: 0 };
      this.finish.stage = 1;
      this.finish.t = 0;
    }
    onBossDefeated(x) {
      // capsule / goal appears after the boss explodes
      this.addObject({ type: 'goal', x: x, y: this.def.bossFloor });
    }

    // ---------------- update ----------------
    update() {
      const I = G.Input;
      this.frame++;
      if (this.paused) { this.updatePause(); return; }
      if ((I.pressed.pause || I.pressed.start) && !this.finish && !this.player.dead && this.card < 60) {
        this.paused = true; this.pauseSel = 0; G.Audio.sfx('menu');
        return;
      }
      if (this.card > 0) this.card--;
      if (this.card < 100 && !this.finish) this.player.frozen = false;
      const p = this.player;
      if (!this.finish && !p.dead && this.card < 100) this.time++;
      if (this.frame % 8 === 0) this.ringFrame++;

      // objects
      const cx = this.cam.x + G.W / 2;
      const range = G.W + 320;
      this.terrain.dyn.length = 0;
      for (const o of this.objects) {
        o.active = o.always || Math.abs(o.x - cx) < range;
        if (!o.active || !o.alive) continue;
        o.update();
        if (o.segments && Math.abs(o.x - p.x) < 480 + (o.w || 0) / 2) {
          const segs = o.segments();
          if (segs) for (const s of segs) this.terrain.dyn.push(s);
        }
      }
      // ride moving platforms
      if (p.onGround && p.groundSeg && p.groundSeg.ref && p.groundSeg.ref.pdx !== undefined) {
        p.x += p.groundSeg.ref.pdx; p.y += p.groundSeg.ref.pdy;
      }
      p.update();
      // sky ceiling: flyers and big springs stop at the top of the level so they stay on screen
      const ceil = this.camTop + 64;
      if (!p.dead && p.y < ceil) { p.y = ceil; if (p.vy < 0) p.vy = 0; }
      if (p.shoes > 0 && this.frame % 2 === 0) {
        this.trail.push({ x: p.x, y: p.y, anim: p.anim, f: Math.floor(p.animT), facing: p.facing, ball: p.ball });
        if (this.trail.length > 4) this.trail.shift();
      } else if (p.shoes <= 0) this.trail.length = 0;
      if (p.inv > 0 && this.frame % 4 === 0) this.fx.spawn('star', p.x + (Math.random() - 0.5) * 28, p.y + (Math.random() - 0.5) * 32, 0, -0.3);
      if (p.boostT > 0 && this.frame % 3 === 0) this.fx.spawn('dust', p.x - p.facing * 10, p.y + 14, -p.facing, -0.3);

      // overlaps
      if (!p.dead) {
        const pb = [p.x - 8, p.y - p.hr + 3, 16, p.hr * 2 - 6];
        for (const o of this.objects) {
          if (!o.alive || !o.active || !o.touch) continue;
          const b = o.box();
          if (pb[0] < b[0] + b[2] && pb[0] + pb[2] > b[0] && pb[1] < b[1] + b[3] && pb[1] + pb[3] > b[1]) o.touch(p);
          if (p.dead) break;
        }
      }
      if (this.newObjects.length) { this.objects.push(...this.newObjects); this.newObjects.length = 0; }
      if (this.frame % 30 === 0) this.objects = this.objects.filter((o) => o.alive);

      // fell into a pit
      if (!p.dead && p.y > this.camBottom + 48) { p.rings = 0; p.die(); }
      if (p.dead) {
        this.deadT++;
        if (this.deadT === 150) this.respawn();
      }
      this.fx.update();
      this.updateCamera();
      // pre-build terrain just ahead of the camera
      const dir = (p.onGround ? p.gsp : p.vx) >= 0 ? 1 : -1;
      this.terrain.warmOne(this.cam.x + dir * G.W * 0.75, this.cam.y - 60, G.W, G.H + 120);
      if (this.finish) this.updateFinish();
      if (this.flash > 0) this.flash--;
      if (this.shake > 0) this.shake--;
    }

    respawn() {
      G.Session.lives--;
      G.Session.score = this.score;
      G.Save.storeLives();
      if (G.Session.lives <= 0) {
        G.Game.go(() => new G.GameOverScene({ levelId: this.levelId, charId: this.charId }));
      } else {
        const cp = this.checkpoint;
        G.Game.go(() => new PlayScene({ levelId: this.levelId, charId: this.charId, cp }));
      }
    }

    updateFinish() {
      const F = this.finish, p = this.player;
      F.t++;
      if (F.stage === 1) {
        p.autoRun = 0;
        if (p.onGround && Math.abs(p.gsp) < 0.5 && !p.victory) { p.victory = true; p.gsp = 0; }
        if (F.t === 30) G.Audio.play('clear');
        if (F.t > 90) {
          F.stage = 2; F.t = 0;
          const secs = Math.floor(this.time / 60);
          let tb = 0;
          for (const [s, b] of TIME_BONUS) if (secs < s) { tb = b; break; }
          F.timeBonus = tb; F.ringBonus = p.rings * 100;
          F.medalBonus = this.medalsGot.filter(Boolean).length * 1000;
          F.total = 0;
          for (let i = 0; i < 60; i++) this.fx.spawn('confetti', this.cam.x + Math.random() * G.W, this.cam.y - 10 - Math.random() * 60, (Math.random() - 0.5) * 1.5, Math.random());
        }
      } else if (F.stage === 2) {
        if (F.t > 60) {
          let moved = false;
          for (const k of ['timeBonus', 'ringBonus', 'medalBonus']) {
            if (F[k] > 0) { const d = Math.min(F[k], 100); F[k] -= d; F.total += d; this.score += d; moved = true; }
          }
          if (moved && F.t % 3 === 0) G.Audio.sfx('count');
          if (!moved || G.Input.pressed.jump) {
            if (moved) { for (const k of ['timeBonus', 'ringBonus', 'medalBonus']) { F.total += F[k]; this.score += F[k]; F[k] = 0; } }
            F.stage = 3; F.t = 0; G.Audio.sfx('select');
          }
        }
      } else if (F.stage === 3) {
        if (F.t > 30 && (G.Input.confirm() || G.Input.taps.length || F.t > 300)) {
          F.stage = 4;
          G.Session.score = this.score;
          G.Save.completeLevel(this.levelId, { time: this.time, medals: this.medalsGot, score: this.score, rings: p.rings });
          G.Game.go(() => new G.MapScene({ fromLevel: this.levelId }));
        }
      }
    }

    updatePause() {
      const I = G.Input;
      const items = ['CONTINUE', 'RESTART ACT', 'QUIT TO MAP'];
      if (I.pressed.down) { this.pauseSel = (this.pauseSel + 1) % 3; G.Audio.sfx('menu'); }
      if (I.pressed.up) { this.pauseSel = (this.pauseSel + 2) % 3; G.Audio.sfx('menu'); }
      for (const t of I.taps) {
        for (let i = 0; i < 3; i++) {
          const y = 104 + i * 18;
          if (Math.abs(t.y - y - 4) < 9 && Math.abs(t.x - G.W / 2) < 70) { this.pauseSel = i; this.pauseChoose(i); return; }
        }
      }
      if (I.pressed.pause) { this.paused = false; return; }
      if (I.pressed.jump || I.pressed.start) this.pauseChoose(this.pauseSel);
    }
    pauseChoose(i) {
      G.Audio.sfx('select');
      if (i === 0) this.paused = false;
      else if (i === 1) G.Game.go(() => new PlayScene({ levelId: this.levelId, charId: this.charId }));
      else G.Game.go(() => new G.MapScene({}));
    }

    clampCam(snap) {
      const def = this.def;
      this.cam.x = G.clamp(this.cam.x, def.camLeft || 0, (def.camRight || def.width) - G.W);
      this.cam.y = G.clamp(this.cam.y, this.camTop, this.camBottom - G.H);
    }
    updateCamera() {
      const p = this.player, W = G.W, H = G.H;
      if (p.dead) return;
      const spd = p.onGround ? p.gsp * Math.cos(p.ang) : p.vx;
      const ahead = G.clamp(spd * 9, -72, 72);
      this.lookAhead = G.approach(this.lookAhead, ahead, Math.abs(spd) > 6 ? 2.5 : 1.2);
      const tx = p.x - W / 2 + this.lookAhead;
      if (this.camLag > 0) this.camLag--;
      else this.cam.x += G.clamp(tx - this.cam.x, -24, 24);
      // look up / down after holding
      if ((p.lookUp || p.crouch) && p.onGround) this.lookT++; else this.lookT = 0;
      const shift = this.lookT > 50 ? (p.lookUp ? -72 : 72) : 0;
      this.lookShift = G.approach(this.lookShift || 0, shift, 2);
      const centerY = p.y - H / 2 + 12 + this.lookShift + (G.Input.usingTouch ? 18 : 0);
      if (p.onGround) {
        const vs = Math.abs(p.gsp) >= 8 ? 24 : 6;
        this.cam.y += G.clamp(centerY - this.cam.y, -vs, vs);
      } else {
        const d = centerY - this.cam.y;
        if (d < -40) this.cam.y += Math.max(d + 40, -24);
        else if (d > 24) this.cam.y += Math.min(d - 24, 24);
      }
      this.clampCam();
    }

    // ---------------- render ----------------
    render(ctx) {
      const W = G.W, H = G.H;
      let cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
      if (this.shake > 0) { cx += Math.round((Math.random() - 0.5) * 6); cy += Math.round((Math.random() - 0.5) * 4); }
      this.theme.renderBG(ctx, this.theme.layers, cx, cy, W, H, this.frame, this.def);
      const t = this.frame;
      for (const wf of this.def.waterfalls) {
        if (wf.x + wf.w < cx || wf.x > cx + W) continue;
        G.drawWaterfall(ctx, wf.x - cx, wf.y - cy, wf.w, wf.h, t);
      }
      this.renderDecos(ctx, this.def.decos, cx, cy);
      this.terrain.render(ctx, cx, cy, W, H);
      for (const o of this.objects) if (o.alive && o.active && !o.front) o.render(ctx, cx, cy);
      // speed shoes afterimages
      const p = this.player;
      if (this.trail.length) {
        ctx.globalAlpha = 0.35;
        for (const tr of this.trail) {
          const fr = G.Art.charFrames(this.charId, tr.anim);
          const img = fr[tr.f % fr.length];
          ctx.save(); ctx.translate(Math.round(tr.x - cx), Math.round(tr.y - cy));
          if (tr.facing < 0) ctx.scale(-1, 1);
          ctx.drawImage(img, -G.SPR.cx, -G.SPR.cy); ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      p.render(ctx, cx, cy);
      if (p.shield && !p.dead) this.drawShield(ctx, p.x - cx, p.y - cy);
      for (const o of this.objects) if (o.alive && o.active && o.front) o.render(ctx, cx, cy);
      this.fx.render(ctx, cx, cy);
      this.renderDecos(ctx, this.def.decosFront, cx, cy);
      if (G.debug) {
        this.terrain.debugDraw(ctx, cx, cy);
        G.Font.draw(ctx, `X${Math.round(p.x)} Y${Math.round(p.y)} G${p.gsp.toFixed(1)} A${(p.ang * 57.3).toFixed(0)} L${p.layer}`, 4, H - 22, { color: '#fff' });
      }
      if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash / 20})`; ctx.fillRect(0, 0, W, H); }
      this.renderHUD(ctx);
      if (this.boss) this.boss.renderHUD && this.boss.renderHUD(ctx);
      if (this.card > 0) this.renderCard(ctx);
      if (this.finish && this.finish.stage >= 2) this.renderResults(ctx);
      if (this.paused) this.renderPause(ctx);
    }
    drawShield(ctx, x, y) {
      const r = 21 + Math.sin(this.frame * 0.3);
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(this.frame * 0.2) * 0.1;
      ctx.fillStyle = '#7ad8ff';
      ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), r, 0, G.TAU); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), r, 0, G.TAU); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(x - 9), Math.round(y - 12), 4, 2);
      ctx.restore();
    }
    renderDecos(ctx, list, cx, cy) {
      const t = this.frame;
      for (const d of list) {
        if (d.x < cx - 80 || d.x > cx + G.W + 80) continue;
        let img;
        switch (d.type) {
          case 'palm': img = G.Deco.palm((t >> 5) % 2 && d.x % 3 === 0 ? 1 : 0); break;
          case 'sunflower': img = G.Deco.sunflower(((t >> 3) + (d.x >> 4)) % 4); break;
          case 'flowers': img = G.Deco.flowers(((t >> 4) + (d.x >> 5)) % 2, d.hue || 0); break;
          case 'bush': img = G.Deco.bush(0); break;
          case 'rock': img = G.Deco.rock(); break;
          case 'sign': img = G.Deco.sign(0); break;
          default:
            img = this.theme.deco ? this.theme.deco(d.type, t, d) : null;
        }
        if (!img) continue;
        const sink = d.sink === undefined ? 4 : d.sink;
        ctx.drawImage(img, Math.round(d.x - img.width / 2 - cx), Math.round(d.y - img.height + sink - cy));
      }
    }
    renderHUD(ctx) {
      const p = this.player;
      const F = G.Font;
      const yl = { color: '#fff26a', color2: '#ff9a1a' };
      const wh = { color: '#ffffff', color2: '#c8d8ff' };
      // shift the HUD away from Family Arcade's return button
      const fa = G.faCorner;
      ctx.save();
      if (fa === 'tl') ctx.translate(30, 0);
      F.draw(ctx, 'SCORE', 10, 8, yl);
      F.draw(ctx, String(this.score), 100, 8, Object.assign({ align: 'right' }, wh));
      const secs = Math.floor(this.time / 60);
      F.draw(ctx, 'TIME', 10, 20, yl);
      F.draw(ctx, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 100, 20, Object.assign({ align: 'right' }, wh));
      const zero = p.rings === 0 && (this.frame >> 4) % 2;
      F.draw(ctx, 'RINGS', 10, 32, zero ? { color: '#ff4a4a', color2: '#a01010' } : yl);
      F.draw(ctx, String(p.rings), 100, 32, Object.assign({ align: 'right' }, wh));
      // lives
      ctx.restore();
      const head = G.Art.head(this.charId);
      let ly = G.Input.usingTouch ? 48 : G.H - 30;
      if (!G.Input.usingTouch && fa === 'bl') ly = 48;
      ctx.drawImage(head, 4, ly);
      F.draw(ctx, G.CHARS[this.charId].name, 30, ly + 6, yl);
      F.draw(ctx, 'X' + G.Session.lives, 30, ly + 16, wh);
      // medals
      const total = this.def.medals || 0;
      const mf = G.ObjArt.medal()[0];
      const mx = fa === 'tr' ? 30 : 0;
      for (let i = 0; i < total; i++) {
        const got = this.medalsGot[i] || G.Save.medalHad(this.levelId, i);
        ctx.globalAlpha = got ? 1 : 0.25;
        ctx.drawImage(mf, G.W - 28 - mx - (total - 1 - i) * 22, 4);
      }
      ctx.globalAlpha = 1;
      // power-ups
      let ix = G.W - 30;
      const iy = 30;
      const icon = (k) => { ctx.drawImage(G.ObjArt.iconOnly(k), ix, iy); ix -= 30; };
      if (p.shield) icon('shield');
      if (p.inv > 0 && (p.inv > 120 || (this.frame >> 2) % 2)) icon('inv');
      if (p.shoes > 0 && (p.shoes > 120 || (this.frame >> 2) % 2)) icon('shoes');
    }
    renderCard(ctx) {
      const W = G.W, H = G.H, c = this.card;
      const total = this.opts.cp ? 70 : 150;
      const el = total - c; // elapsed
      const inT = Math.min(1, el / 18), outT = c < 20 ? c / 20 : 1;
      const k = Math.min(inT, outT);
      if (!this.opts.cp) {
        // black wipe at the very start
        if (el < 14) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
      }
      // diagonal band
      const bandX = -W + k * W;
      ctx.fillStyle = '#1a3aa8';
      ctx.beginPath(); ctx.moveTo(bandX, 70); ctx.lineTo(bandX + W + 40, 70); ctx.lineTo(bandX + W, 130); ctx.lineTo(bandX - 40, 130); ctx.fill();
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(bandX, 126, W + 20, 4);
      const tx = W + 10 - k * (W / 2 + 10);
      const name = this.def.name || this.theme.name;
      G.Font.draw(ctx, name, tx, 84, { scale: 2, align: 'center', color: '#ffffff', color2: '#a8c8ff' });
      G.Font.draw(ctx, this.def.act ? 'ACT ' + this.def.act : this.def.subtitle || '', tx + 40, 108, { scale: 1, align: 'center', color: '#fff26a', color2: '#ff9a1a' });
      // ACT badge
      const bx = W - k * 90 + 20, by = 150;
      if (this.def.act) {
        ctx.fillStyle = '#e8402a'; ctx.beginPath(); ctx.arc(bx, by, 18, 0, G.TAU); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
        G.Font.draw(ctx, String(this.def.act), bx, by - 7, { scale: 2, align: 'center', color: '#ffffff' });
      }
    }
    renderResults(ctx) {
      const F = this.finish, W = G.W;
      const fo = G.Font;
      const slide = Math.min(1, F.t / 20);
      const x = W / 2;
      const name = G.CHARS[this.charId].name;
      fo.draw(ctx, `${name} GOT THROUGH`, x - (1 - slide) * W, 56, { scale: 2, align: 'center', color: '#ffffff', color2: '#a8c8ff' });
      fo.draw(ctx, this.def.act ? `ACT ${this.def.act}` : 'THE BOSS!', x + (1 - slide) * W, 80, { scale: 2, align: 'center', color: '#fff26a', color2: '#ff9a1a' });
      const yl = { color: '#fff26a', color2: '#ff9a1a' }, wh = { color: '#ffffff' };
      const rows = [['TIME BONUS', F.timeBonus], ['RING BONUS', F.ringBonus], ['MEDAL BONUS', F.medalBonus], ['TOTAL', F.total]];
      rows.forEach(([k, v], i) => {
        const y = 112 + i * 16;
        fo.draw(ctx, k, x - 100, y, yl);
        fo.draw(ctx, String(v), x + 100, y, Object.assign({ align: 'right' }, wh));
      });
      if (F.stage === 3 && (this.frame >> 4) % 2) fo.draw(ctx, G.Input.usingTouch ? 'TAP TO CONTINUE' : 'PRESS JUMP TO CONTINUE', x, 190, { align: 'center', color: '#ffffff' });
    }
    renderPause(ctx) {
      const W = G.W, H = G.H;
      ctx.fillStyle = 'rgba(0,0,30,0.6)';
      ctx.fillRect(0, 0, W, H);
      G.Font.draw(ctx, 'PAUSED', W / 2, 64, { scale: 3, align: 'center', color: '#ffffff', color2: '#a8c8ff' });
      ['CONTINUE', 'RESTART ACT', 'QUIT TO MAP'].forEach((s, i) => {
        const sel = i === this.pauseSel;
        G.Font.draw(ctx, (sel ? '> ' : '  ') + s, W / 2 - 50, 104 + i * 18, sel ? { color: '#fff26a', color2: '#ff9a1a' } : { color: '#ffffff' });
      });
    }
  }
  G.PlayScene = PlayScene;
})(window.G);
