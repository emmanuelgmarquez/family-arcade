'use strict';
// Gameplay objects. Each has update(), render(ctx, camX, camY) and
// optionally touch(player) when the player's box overlaps its box.
(function (G) {
  const A = G.ObjArt;
  const REG = {};
  G.Objects = {
    register(type, cls) { REG[type] = cls; },
    create(scene, def) {
      const C = REG[def.type];
      if (!C) { console.warn('unknown object', def.type); return null; }
      return new C(scene, def);
    },
  };

  class Obj {
    constructor(s, d) {
      this.s = s; this.d = d; this.x = d.x; this.y = d.y;
      this.w = 16; this.h = 16; this.alive = true; this.t = 0;
    }
    box() { return [this.x - this.w / 2, this.y - this.h / 2, this.w, this.h]; }
    update() { this.t++; }
    render() {}
    draw(ctx, img, cx, cy, ox, oy, flip) {
      const x = Math.round(this.x - cx + (ox || 0)), y = Math.round(this.y - cy + (oy || 0));
      if (flip) { ctx.save(); ctx.translate(x + img.width, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
      else ctx.drawImage(img, x, y);
    }
  }
  G.Obj = Obj;

  // ---------- rings ----------
  class Ring extends Obj {
    constructor(s, d) { super(s, d); this.w = 14; this.h = 14; }
    touch(p) {
      if (p.hurt || p.dead) return;
      this.alive = false;
      this.s.addRings(1);
      this.s.fx.spawn('sparkle', this.x, this.y, 0, 0);
    }
    render(ctx, cx, cy) {
      const f = A.ring();
      this.draw(ctx, f[(this.s.ringFrame) % 8], cx, cy, -8, -8);
    }
  }
  G.Objects.register('ring', Ring);

  class LooseRing extends Obj {
    constructor(s, d) {
      super(s, d); this.w = 14; this.h = 14;
      this.vx = d.vx; this.vy = d.vy; this.life = 256;
    }
    get always() { return true; }
    update() {
      this.t++;
      this.life--;
      if (this.life <= 0) { this.alive = false; return; }
      this.vy += 0.09375;
      this.x += this.vx; this.y += this.vy;
      if (this.t % 4 === 0 || this.vy > 3) {
        const q = { mask: 3, oneWay: true };
        if (this.vy > 0) {
          const h = this.s.terrain.raycast(this.x, this.y - 4, 0, 1, 12 + this.vy, q);
          if (h) { this.y = h.y - 8; this.vy = -this.vy * 0.75; if (Math.abs(this.vy) < 1) this.vy = -1.5; }
        }
        const hw = this.s.terrain.raycast(this.x, this.y, Math.sign(this.vx) || 1, 0, 8, { mask: 3 });
        if (hw && Math.abs(hw.nx) > 0.6) this.vx = -this.vx;
      }
    }
    touch(p) {
      if (this.t < 40 || p.hurt || p.dead) return;
      this.alive = false;
      this.s.addRings(1);
      this.s.fx.spawn('sparkle', this.x, this.y, 0, 0);
    }
    render(ctx, cx, cy) {
      if (this.life < 64 && (this.t >> 1) % 2) return;
      const f = A.ring();
      this.draw(ctx, f[(this.s.ringFrame * 2) % 8], cx, cy, -8, -8);
    }
  }
  G.Objects.register('loosering', LooseRing);

  // ---------- springs ----------
  class Spring extends Obj {
    constructor(s, d) {
      super(s, d);
      this.dir = d.dir || 'up';
      this.pow = d.color === 'r' ? 16 : 10;
      this.ext = 0;
      if (this.dir === 'up') { this.w = 28; this.h = 16; this.y = d.y - 8; }
      else if (this.dir === 'down') { this.w = 28; this.h = 16; this.y = d.y + 8; }
      else if (this.dir === 'left' || this.dir === 'right') { this.w = 16; this.h = 28; this.y = d.y - 14; }
      else { this.w = 24; this.h = 24; this.y = d.y - 12; }
    }
    update() { this.t++; if (this.ext > 0) this.ext--; }
    touch(p) {
      if (p.dead) return;
      const P = this.pow;
      const dg = P * 0.75;
      let fired = false;
      switch (this.dir) {
        case 'up': if (p.vy >= -1 || p.onGround) { p.spring(p.onGround ? p.gsp * Math.cos(p.ang) : p.vx, -P); p.y = this.y - 8 - p.hr; fired = true; } break;
        case 'down': p.spring(p.vx, P); fired = true; break;
        case 'right': if (p.onGround) p.spring(P, 0); else { p.vx = P; p.facing = 1; p.airLock = 16; } fired = true; break;
        case 'left': if (p.onGround) p.spring(-P, 0); else { p.vx = -P; p.facing = -1; p.airLock = 16; } fired = true; break;
        case 'upright': p.spring(dg, -dg, { lock: 16 }); fired = true; break;
        case 'upleft': p.spring(-dg, -dg, { lock: 16 }); fired = true; break;
      }
      if (fired && this.ext < 6) { this.ext = 12; G.Audio.sfx('spring'); }
    }
    render(ctx, cx, cy) {
      const img = A.spring(this.d.color || 'y', this.ext > 0);
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
      ctx.save();
      ctx.translate(x, y);
      const rot = { up: 0, right: Math.PI / 2, left: -Math.PI / 2, down: Math.PI, upright: Math.PI / 4, upleft: -Math.PI / 4 }[this.dir];
      if (this.dir === 'up') ctx.translate(0, 8);
      else if (this.dir === 'down') ctx.translate(0, -8);
      else if (this.dir === 'right') ctx.translate(-8, 0);
      else if (this.dir === 'left') ctx.translate(8, 0);
      ctx.rotate(rot);
      ctx.drawImage(img, -16, -32);
      ctx.restore();
    }
  }
  G.Objects.register('spring', Spring);

  // ---------- solid box helper ----------
  function boxSegs(o) {
    if (!o.segs) {
      o.segs = [G.makeSeg(0, 0, 1, 0, { ref: o }), G.makeSeg(0, 0, 0, 1, { ref: o }), G.makeSeg(0, 0, -1, 0, { ref: o }), G.makeSeg(0, 0, 0, -1, { ref: o })];
    }
    const x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, y0 = o.y - o.h / 2, y1 = o.y + o.h / 2;
    G.setSeg(o.segs[0], x0, y0, x1, y0);
    G.setSeg(o.segs[1], x1, y0, x1, y1);
    G.setSeg(o.segs[2], x1, y1, x0, y1);
    G.setSeg(o.segs[3], x0, y1, x0, y0);
    return o.segs;
  }

  // ---------- monitors ----------
  class Monitor extends Obj {
    constructor(s, d) {
      super(s, d);
      this.w = 26; this.h = 28; this.y = d.y - 14;
      this.kind = d.kind || 'ring';
      this.broken = false; this.iconT = 0;
    }
    passable(p) { return this.broken || p.ball || p.inv > 0; }
    get solid() { return !this.broken; }
    segments() { return this.broken ? null : boxSegs(this); }
    touch(p) {
      if (this.broken) return;
      if (!(p.ball || p.inv > 0)) return;
      // falling onto it or rolling into it breaks it
      this.broken = true;
      this.iconT = 1;
      if (!p.onGround && p.vy > 0) p.vy = -p.vy;
      else if (!p.onGround && p.y > this.y) p.vy = Math.max(p.vy, 0);
      this.s.fx.spawn('explode', this.x, this.y, 0, 0);
      this.s.addScore(10, this.x, this.y);
      G.Audio.sfx('pop');
    }
    update() {
      this.t++;
      if (this.iconT > 0) {
        this.iconT++;
        if (this.iconT === 40) this.s.givePower(this.kind);
      }
    }
    render(ctx, cx, cy) {
      if (this.broken) {
        this.draw(ctx, A.monitorBroken(), cx, cy, -14, -18);
        if (this.iconT > 0 && this.iconT < 70) {
          const lift = Math.min(this.iconT, 30);
          this.draw(ctx, A.iconOnly(this.kind, this.s.charId), cx, cy, -14, -24 - lift);
        }
        return;
      }
      this.draw(ctx, A.monitor(this.kind, this.s.charId), cx, cy, -14, -18);
      // static flicker
      if ((this.t >> 2) % 6 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(Math.round(this.x - cx - 10), Math.round(this.y - cy - 12), 20, 15);
      }
    }
  }
  G.Objects.register('monitor', Monitor);

  // ---------- checkpoint ----------
  class Checkpoint extends Obj {
    constructor(s, d) { super(s, d); this.w = 16; this.h = 56; this.y = d.y - 28; this.on = false; this.spin = 0; }
    update() {
      this.t++;
      if (this.spin > 0) this.spin--;
      const p = this.s.player;
      if (!this.on && !p.dead && p.x > this.x && Math.abs(p.y - this.y) < 120) this.activate(true);
    }
    activate(fx) {
      this.on = true;
      this.spin = 60;
      this.s.setCheckpoint(this);
      if (fx) { G.Audio.sfx('checkpoint'); this.s.fx.burst(this.x, this.y - 22, 'sparkle', 8); }
    }
    render(ctx, cx, cy) {
      this.draw(ctx, A.checkpoint(this.on, this.t >> 3), cx, cy, -8, -28);
      if (this.spin > 0) {
        const a = this.spin * 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(this.x - cx + Math.cos(a) * 10) - 1, Math.round(this.y - cy - 22 + Math.sin(a) * 4) - 1, 3, 3);
      }
    }
  }
  G.Objects.register('checkpoint', Checkpoint);

  // ---------- goal sign ----------
  class Goal extends Obj {
    constructor(s, d) { super(s, d); this.w = 40; this.h = 400; this.y = d.y - 36; this.state = 0; this.st = 0; }
    get always() { return this.state === 1; }
    update() {
      this.t++;
      const p = this.s.player;
      if (this.state === 0 && p.x > this.x && !p.dead) {
        this.state = 1; this.st = 0;
        G.Audio.sfx('goal');
        this.s.onGoal(this);
      } else if (this.state === 1) {
        this.st++;
        if (this.st % 6 === 0 && this.st < 120) G.Audio.sfx('tick');
        if (this.st === 130) { this.state = 2; this.s.fx.burst(this.x, this.y - 14, 'sparkle', 12); this.s.onGoalShown(); }
      }
    }
    render(ctx, cx, cy) {
      let face = 'boss', f = 0;
      if (this.state === 1) { face = 'spin'; f = Math.floor(this.st / (this.st < 90 ? 2 : 4)); }
      if (this.state === 2) face = this.s.charId;
      this.draw(ctx, A.goal(face, f % 4), cx, cy, -24, -36);
    }
  }
  G.Objects.register('goal', Goal);

  // ---------- hazards ----------
  class Spikes extends Obj {
    constructor(s, d) { super(s, d); this.n = d.n || 1; this.w = 32 * this.n; this.h = 16; this.y = d.y - 8; }
    segments() { return boxSegs(this); }
    touch(p) { if (p.y < this.y) p.hit(this.x); else p.hit(this.x); }
    box() { return [this.x - this.w / 2 + 2, this.y - this.h / 2 - 3, this.w - 4, this.h + 3]; }
    render(ctx, cx, cy) {
      for (let i = 0; i < this.n; i++) this.draw(ctx, A.spikes(), cx, cy, -this.w / 2 + i * 32, -8);
    }
  }
  G.Objects.register('spikes', Spikes);

  class SpikeBall extends Obj {
    constructor(s, d) {
      super(s, d);
      this.px = d.x; this.py = d.y; this.r = d.r || 64; this.spd = d.spd || 0.03; this.ph = d.ph || 0;
      this.w = 18; this.h = 18;
    }
    update() {
      this.t++;
      const a = this.ph + this.s.time * this.spd;
      this.x = this.px + Math.cos(a) * this.r;
      this.y = this.py + Math.sin(a) * this.r;
    }
    touch(p) { p.hit(this.x); }
    render(ctx, cx, cy) {
      const ch = A.chain();
      const n = Math.floor(this.r / 10);
      for (let i = 0; i <= n; i++) {
        const t = i / (n + 1);
        ctx.drawImage(ch, Math.round(this.px + (this.x - this.px) * t - cx - 4), Math.round(this.py + (this.y - this.py) * t - cy - 4));
      }
      this.draw(ctx, A.spikeball(), cx, cy, -12, -12);
    }
  }
  G.Objects.register('spikeball', SpikeBall);

  // ---------- platforms ----------
  class Platform extends Obj {
    constructor(s, d) {
      super(s, d);
      this.w = d.w || 64; this.h = 16;
      this.bx = d.x; this.by = d.y;
      this.mode = d.mode || 'line';
      this.dx = d.dx || 0; this.dy = d.dy || 0; this.period = d.period || 240; this.ph = d.ph || 0;
      this.seg = G.makeSeg(0, 0, 1, 0, { oneWay: true, ref: this });
      this.pdx = 0; this.pdy = 0;
      this.fall = 0; this.vy = 0; this.stand = 0; this.gone = 0;
      this.pos(0);
    }
    get always() { return this.mode !== 'line' || this.dx !== 0 || this.dy !== 0; }
    pos(t) {
      const a = ((t + this.ph) / this.period) * G.TAU;
      if (this.mode === 'line') { this.x = this.bx + Math.sin(a) * this.dx; this.y = this.by + Math.sin(a) * this.dy; }
      else if (this.mode === 'circle') { this.x = this.bx + Math.cos(a) * this.dx; this.y = this.by + Math.sin(a) * this.dx; }
      else if (this.mode === 'swing') {
        const ang = Math.sin(a) * (this.d.amp || 1.0);
        this.x = this.bx + Math.sin(ang) * this.dx; this.y = this.by + Math.cos(ang) * this.dx;
      } else if (this.mode === 'fall') { /* collapsing */ }
    }
    standing(p) { return p.onGround && p.groundSeg === this.seg; }
    update() {
      this.t++;
      const ox = this.x, oy = this.y;
      if (this.mode === 'fall') {
        const p = this.s.player;
        if (this.gone > 0) {
          this.gone--;
          if (this.gone === 0) { this.x = this.bx; this.y = this.by; this.fall = 0; this.vy = 0; this.stand = 0; }
        } else if (this.fall) {
          this.fall++;
          if (this.fall > 24) { this.vy += 0.25; this.y += this.vy; }
          if (this.fall > 160) { this.gone = 240; this.y = -9999; }
        } else if (this.standing(p)) {
          this.stand++;
          if (this.stand > 12) { this.fall = 1; G.Audio.sfx('crumble'); }
        }
      } else this.pos(this.s.time);
      this.pdx = this.x - ox; this.pdy = this.y - oy;
      G.setSeg(this.seg, this.x - this.w / 2, this.y - 8, this.x + this.w / 2, this.y - 8);
    }
    segments() { return this.gone > 0 ? null : [this.seg]; }
    render(ctx, cx, cy) {
      if (this.gone > 0) return;
      if (this.mode === 'swing') {
        const ch = A.chain();
        const n = Math.floor(this.dx / 9);
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          ctx.drawImage(ch, Math.round(this.bx + (this.x - this.bx) * t - cx - 4), Math.round(this.by + (this.y - 8 - this.by) * t - cy - 4));
        }
        ctx.fillStyle = '#5a5a70';
        ctx.fillRect(Math.round(this.bx - cx - 4), Math.round(this.by - cy - 4), 8, 8);
      }
      let sx = 0;
      if (this.mode === 'fall' && this.fall > 0 && this.fall < 25) sx = (this.t % 4 < 2 ? -1 : 1);
      const img = A.platform(this.s.theme.pal, this.w);
      this.draw(ctx, img, cx, cy, -this.w / 2 + sx, -9);
      if (this.mode === 'fall') {
        ctx.fillStyle = 'rgba(40,10,0,0.55)';
        const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
        ctx.fillRect(x - this.w / 4, y - 1, 1, 8); ctx.fillRect(x + this.w / 5, y, 1, 7);
      }
    }
  }
  G.Objects.register('platform', Platform);

  // ---------- breakable wall ----------
  class BreakWall extends Obj {
    constructor(s, d) { super(s, d); this.w = 32; this.h = d.h || 64; this.y = d.y - this.h / 2; }
    passable(p) { return p.inv > 0 || (p.ball && Math.abs(p.onGround ? p.gsp : p.vx) >= 4.5); }
    segments() { return boxSegs(this); }
    box() { return [this.x - this.w / 2 - 3, this.y - this.h / 2, this.w + 6, this.h]; }
    touch(p) {
      if (!this.passable(p)) return;
      this.alive = false;
      G.Audio.sfx('crumble');
      for (let i = 0; i < 10; i++) this.s.fx.spawn('debris', this.x + (Math.random() - 0.5) * 24, this.y + (Math.random() - 0.5) * this.h, (Math.random() - 0.3) * 4 * Math.sign(p.onGround ? p.gsp : p.vx || 1), -2 - Math.random() * 3);
      this.s.addScore(50, this.x, this.y);
    }
    render(ctx, cx, cy) {
      const img = A.breakwall(this.s.theme.pal);
      for (let y = 0; y < this.h; y += 64) ctx.drawImage(img, 0, 0, 32, Math.min(64, this.h - y), Math.round(this.x - 16 - cx), Math.round(this.y - this.h / 2 + y - cy), 32, Math.min(64, this.h - y));
    }
  }
  G.Objects.register('breakwall', BreakWall);

  // ---------- boost pad ----------
  class Boost extends Obj {
    constructor(s, d) { super(s, d); this.w = 32; this.h = 14; this.y = d.y - 5; this.dir = d.dir || 1; this.cool = 0; }
    update() { this.t++; if (this.cool > 0) this.cool--; }
    touch(p) {
      if (!p.onGround || p.dead) return;
      p.gsp = this.dir * Math.max(Math.abs(p.gsp), 12);
      p.facing = this.dir;
      p.boostT = 30;
      if (this.cool === 0) { G.Audio.sfx('boost'); this.cool = 20; }
    }
    render(ctx, cx, cy) { this.draw(ctx, A.boost((this.t >> 3) % 2), cx, cy, -16, -5, this.dir < 0); }
  }
  G.Objects.register('boost', Boost);

  // ---------- medal ----------
  class Medal extends Obj {
    constructor(s, d) { super(s, d); this.w = 22; this.h = 22; this.idx = d.idx; this.had = s.medalHad(d.idx); }
    touch(p) {
      if (p.dead) return;
      this.alive = false;
      this.s.collectMedal(this.idx, this.x, this.y);
    }
    render(ctx, cx, cy) {
      const f = A.medal();
      if (this.had) ctx.globalAlpha = 0.5;
      this.draw(ctx, f[(this.t >> 3) % f.length], cx, cy, -12, -12 + Math.sin(this.t * 0.06) * 2);
      ctx.globalAlpha = 1;
      if (this.t % 20 === 0) this.s.fx.spawn('sparkle', this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, 0, 0);
    }
  }
  G.Objects.register('medal', Medal);

  // ---------- loop layer switching ----------
  class Loop extends Obj {
    constructor(s, d) { super(s, d); this.r = d.r; this.w = 0; this.h = 0; }
    get always() { return true; }
    update() {
      const p = this.s.player;
      const cx = this.x, cy = this.y, R = this.r;
      if (Math.abs(p.x - cx) > R + 120 || Math.abs(p.y - cy) > R + 120) { this.px = p.x; return; }
      const px = this.px === undefined ? p.x : this.px;
      if (p.onGround && Math.abs(p.ang) < 0.35 && p.y > cy) {
        if (p.x < cx - R * 0.6 && p.gsp > 0) p.layer = 1;
        if (p.x > cx + R * 0.6 && p.gsp < 0) p.layer = 2;
      }
      if (p.y < cy) {
        if (px >= cx && p.x < cx) p.layer = 2;
        else if (px <= cx && p.x > cx) p.layer = 1;
      }
      // airborne far outside the loop: reset to the default layer
      if (!p.onGround && (p.x < cx - R - 40 || p.x > cx + R + 40)) p.layer = 1;
      this.px = p.x;
    }
  }
  G.Objects.register('loop', Loop);

  // ---------- enemies ----------
  class Enemy extends Obj {
    constructor(s, d) {
      super(s, d);
      this.dir = d.dir || -1;
      this.hp = 1;
    }
    hurtsFromTop() { return false; }
    touch(p) {
      if (p.dead) return;
      // a flying fox's spinning tail knocks out enemies it bumps from below
      const attacking = p.isAttacking || (p.flying && p.y > this.y + 4);
      if (attacking && !(this.hurtsFromTop() && p.y < this.y - 6 && p.inv <= 0)) {
        this.kill(p);
      } else {
        p.hit(this.x);
      }
    }
    kill(p) {
      this.alive = false;
      this.s.fx.spawn('explode', this.x, this.y, 0, 0);
      this.s.spawnCritter(this.x, this.y);
      G.Audio.sfx('pop');
      if (!p.onGround) {
        if (p.y < this.y && p.vy > 0) p.bounce(p.vy);
        else if (p.vy < 0) p.vy += 1;
      }
      const chain = [100, 200, 500, 1000, 1000];
      const pts = p.onGround ? 100 : chain[Math.min(p.chain, 4)];
      if (!p.onGround) p.chain++;
      this.s.addScore(pts, this.x, this.y - 10, true);
    }
    // keep a walker glued to terrain, turn at edges and walls
    walk(speed) {
      const T = this.s.terrain;
      const q = { mask: 3, oneWay: true };
      if (this.pause > 0) { this.pause--; return; }
      const nx = this.x + this.dir * speed;
      const ahead = T.raycast(nx + this.dir * 10, this.y - 12, 0, 1, 40, q);
      const wall = T.raycast(this.x, this.y - 4, this.dir, 0, this.w / 2 + 2, { mask: 3 });
      const out = this.d.range && Math.abs(nx - this.d.x) > this.d.range;
      if (!ahead || Math.abs(ahead.y - (this.y + this.h / 2)) > 14 || (wall && Math.abs(wall.nx) > 0.6) || out) {
        this.dir = -this.dir;
        this.pause = 20;
        return;
      }
      this.x = nx;
      const g = T.raycast(this.x, this.y - 12, 0, 1, 40, q);
      if (g) this.y = g.y - this.h / 2;
    }
  }

  class Beetbot extends Enemy {
    constructor(s, d) { super(s, d); this.w = 26; this.h = 20; this.y = d.y - 10; this.pause = 0; }
    update() { this.t++; this.walk(0.8); }
    render(ctx, cx, cy) {
      const f = A.beetbot();
      this.draw(ctx, f[(this.t >> 3) % 2], cx, cy, -16, -16, this.dir < 0);
    }
  }
  G.Objects.register('beetbot', Beetbot);

  class Prickler extends Enemy {
    constructor(s, d) { super(s, d); this.w = 24; this.h = 18; this.y = d.y - 9; this.pause = 0; }
    hurtsFromTop() { return true; }
    update() { this.t++; this.walk(0.5); }
    box() { return [this.x - 12, this.y - 16, 24, 25]; }
    render(ctx, cx, cy) {
      const f = A.prickler();
      this.draw(ctx, f[(this.t >> 4) % 2], cx, cy, -16, -19, this.dir < 0);
    }
  }
  G.Objects.register('prickler', Prickler);

  class Buzzwing extends Enemy {
    constructor(s, d) { super(s, d); this.w = 24; this.h = 16; this.bx = d.x; this.by = d.y; this.range = d.range || 80; }
    update() {
      this.t++;
      const ox = this.x;
      this.x = this.bx + Math.sin(this.t * 0.015 + (this.d.ph || 0)) * this.range;
      this.y = this.by + Math.sin(this.t * 0.06) * 8;
      this.dir = this.x < ox ? -1 : 1;
    }
    render(ctx, cx, cy) {
      const f = A.buzzwing();
      this.draw(ctx, f[(this.t >> 1) % 2], cx, cy, -16, -14, this.dir < 0);
    }
  }
  G.Objects.register('buzzwing', Buzzwing);

  class Snapper extends Enemy {
    constructor(s, d) { super(s, d); this.w = 28; this.h = 20; this.y = d.y - 10; this.cool = 60 + (d.ph || 0); }
    update() {
      this.t++;
      const p = this.s.player;
      if (this.cool > 0) this.cool--;
      if (this.cool === 0 && Math.abs(p.x - this.x) < 240 && Math.abs(p.y - this.y) < 160) {
        this.cool = 150;
        this.shoot = 16;
      }
      if (this.shoot > 0) {
        this.shoot--;
        if (this.shoot === 8) {
          for (const dir of [-1, 1]) this.s.addObject({ type: 'orb', x: this.x, y: this.y - 14, vx: dir * 1.4, vy: -3.6 });
          G.Audio.sfx('shoot');
        }
      }
    }
    render(ctx, cx, cy) {
      const f = A.snapper();
      this.draw(ctx, f[this.shoot > 0 ? 1 : (this.t >> 5) % 2], cx, cy, -18, -18);
    }
  }
  G.Objects.register('snapper', Snapper);

  class Orb extends Obj {
    constructor(s, d) { super(s, d); this.w = 8; this.h = 8; this.vx = d.vx; this.vy = d.vy; this.g = d.g === undefined ? 0.09 : d.g; }
    get always() { return true; }
    update() {
      this.t++;
      this.vy += this.g; this.x += this.vx; this.y += this.vy;
      if (this.t > 300) this.alive = false;
      if (this.t % 3 === 0) {
        const h = this.s.terrain.raycast(this.x, this.y, 0, 1, 5, { mask: 3 });
        if (h && this.vy > 0) { this.alive = false; this.s.fx.spawn('puff', this.x, this.y, 0, 0); }
      }
    }
    touch(p) {
      if (p.shield) { this.vx = -this.vx * 2; this.vy = -3; G.Audio.sfx('deflect'); return; }
      if (p.hit(this.x)) this.alive = false;
    }
    render(ctx, cx, cy) { this.draw(ctx, A.orb()[(this.t >> 2) % 2], cx, cy, -5, -5); }
  }
  G.Objects.register('orb', Orb);

  // freed critters hop away happily
  class Critter extends Obj {
    constructor(s, d) { super(s, d); this.kind = d.kind; this.vx = d.dir * 2; this.vy = -3; this.w = 0; this.h = 0; }
    get always() { return true; }
    update() {
      this.t++;
      if (this.kind === 1) { this.vy = Math.max(this.vy - 0.08, -2.5); this.x += this.vx; this.y += this.vy; }
      else {
        this.vy += 0.21; this.x += this.vx; this.y += this.vy;
        if (this.vy > 0) {
          const h = this.s.terrain.raycast(this.x, this.y - 4, 0, 1, 12 + this.vy, { mask: 3, oneWay: true });
          if (h) { this.y = h.y - 8; this.vy = -4; }
        }
      }
      if (this.t > 240) this.alive = false;
    }
    render(ctx, cx, cy) { this.draw(ctx, A.critter(this.kind)[(this.t >> 3) % 2], cx, cy, -8, -8, this.vx < 0); }
  }
  G.Objects.register('critter', Critter);

  // decorative waterfall object is handled by the level renderer
})(window.G);
