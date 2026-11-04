'use strict';
// Bosses: Baron Gearwick's machines. One class, five attack personalities.
(function (G) {
  const cache = {};
  const KINDS = {
    charger: { name: 'BULLDOZER BEETLE', body: '#e8402a', trim: '#ffd23a', hp: 8 },
    driller: { name: 'CRYSTAL DRILLER', body: '#8a4ae8', trim: '#5ae8d8', hp: 8 },
    bomber: { name: 'SUNSET HAWK', body: '#ff7a1a', trim: '#ffe24a', hp: 8 },
    froster: { name: 'BLIZZARD BOT', body: '#3a8ae8', trim: '#e8f8ff', hp: 8 },
    final: { name: 'MEGA GEARWICK', body: '#6a6a80', trim: '#ff3a3a', hp: 12 },
  };
  G.BOSS_KINDS = KINDS;

  // the villain's hover pod with a machine attachment underneath
  function bossArt(kind, frame, hurt) {
    const key = kind + frame + hurt;
    if (cache[key]) return cache[key];
    const K = KINDS[kind];
    const D = G.Draw;
    const body = hurt ? '#ffffff' : K.body, trim = hurt ? '#ffffff' : K.trim;
    const img = G.renderPixel(80, 72, (c) => {
      // attachment
      if (kind === 'charger') {
        D.path(c, [6, 50, 74, 50, 70, 66, 10, 66], G.shade(body, -0.2));
        for (let i = 0; i < 4; i++) D.ell(c, 16 + i * 16, 64, 6, 6, 0, '#3a3a4a', null);
        for (let i = 0; i < 4; i++) D.ell(c, 16 + i * 16, 64, 2.5, 2.5, frame * 0.8 + i, '#9a9ab0');
        // horn / plow
        D.path(c, [72, 40, 80, 44, 80, 64, 72, 62], '#c8c8d8');
        D.path(c, [74, 36, 79, 22, 76, 40], trim);
      } else if (kind === 'driller') {
        const s = frame % 2 ? 2 : 0;
        D.path(c, [26, 52, 54, 52, 40, 72], '#c8c8d8');
        for (let i = 0; i < 4; i++) D.line(c, 28 + i * 3 + s, 54 + i * 4, 52 - i * 3 + s, 54 + i * 4, '#6a6a80', 1.2);
        D.ell(c, 10, 48, 7, 4, -0.5, trim); D.ell(c, 70, 48, 7, 4, 0.5, trim);
      } else if (kind === 'bomber') {
        const w = frame % 2 ? 6 : -4;
        D.path(c, [2, 36 + w, 24, 40, 24, 46, 4, 44 + w], trim);
        D.path(c, [78, 36 + w, 56, 40, 56, 46, 76, 44 + w], trim);
        D.ell(c, 40, 56, 8, 6, 0, '#3a3a4a');
        D.ell(c, 40, 60, 3, 3, 0, '#ff3a3a');
      } else if (kind === 'froster') {
        D.path(c, [14, 50, 66, 50, 58, 64, 22, 64], '#c8e8ff');
        for (let i = 0; i < 5; i++) D.path(c, [20 + i * 10, 62, 24 + i * 10, 72, 28 + i * 10, 62], '#e8f8ff');
      } else {
        // final: big mech arms
        D.path(c, [0, 44, 14, 40, 18, 62, 4, 66], '#5a5a70');
        D.path(c, [80, 44, 66, 40, 62, 62, 76, 66], '#5a5a70');
        D.ell(c, 6, 66, 6, 5, 0, '#ff3a3a'); D.ell(c, 74, 66, 6, 5, 0, '#ff3a3a');
        D.path(c, [20, 50, 60, 50, 56, 62, 24, 62], '#3a3a4a');
      }
      // pod
      D.ell(c, 40, 40, 30, 15, 0, G.shade(body, -0.35));
      D.ell(c, 40, 38, 29, 13, 0, body);
      D.ell(c, 34, 33, 14, 4, 0, G.shade(body, 0.35));
      D.path(c, [10, 44, 70, 44, 66, 48, 14, 48], trim);
      // glass dome with the villain inside
      c.save();
      c.beginPath(); c.ellipse(40, 28, 17, 16, 0, Math.PI, 0); c.closePath();
      c.fillStyle = 'rgba(160,220,255,0.95)'; c.fill();
      c.clip();
      // Baron Gearwick: round robot head with goggles and a pointy grin
      D.ell(c, 40, 24, 10, 9, 0, '#9a9ab0');
      D.ell(c, 36, 22, 3.2, 3.2, 0, '#ffe24a'); D.ell(c, 44, 22, 3.2, 3.2, 0, '#ffe24a');
      D.ell(c, 36, 22, 1.4, 1.4, 0, frame % 4 === 3 ? '#ffe24a' : '#1a1020'); D.ell(c, 44, 22, 1.4, 1.4, 0, '#1a1020');
      D.path(c, [33, 28, 47, 28, 40, 31], '#1a1020');
      D.line(c, 40, 15, 40, 11, '#5a5a70', 1.2); D.ell(c, 40, 10, 1.6, 1.6, 0, '#ff3a3a');
      c.restore();
      D.ell(c, 34, 18, 4, 2, -0.4, 'rgba(255,255,255,0.8)');
      c.beginPath(); c.ellipse(40, 28, 17, 16, 0, Math.PI, 0); c.strokeStyle = '#1a1a3a'; c.lineWidth = 1; c.stroke();
      // thrusters
      D.ell(c, 18, 50, 4, 2, 0, '#5a5a70'); D.ell(c, 62, 50, 4, 2, 0, '#5a5a70');
    }, '#100818');
    cache[key] = img;
    return img;
  }

  class Boss extends G.Obj {
    constructor(s, d) {
      super(s, d);
      this.kind = d.kind || 'charger';
      this.K = KINDS[this.kind];
      this.hp = this.K.hp;
      this.maxHp = this.hp;
      this.w = 56; this.h = 40;
      this.left = d.left; this.right = d.right; this.floor = d.floor;
      this.x = (this.left + this.right) / 2;
      this.y = this.floor - 260;
      this.state = 'wait'; this.st = 0; this.dir = -1; this.flash = 0; this.vx = 0; this.vy = 0;
      this.baseY = this.floor - 110;
      this.attacks = 0;
    }
    get always() { return true; }
    box() { return [this.x - 26, this.y - 22, 52, 46]; }
    touch(p) {
      if (this.state === 'dead' || this.state === 'wait' || p.dead) return;
      if (p.isAttacking && this.flash === 0) {
        this.hp--;
        this.flash = 44;
        G.Audio.sfx('bosshit');
        this.s.shake = 8;
        // knock the player away
        const dir = Math.sign(p.x - this.x) || -1;
        if (p.onGround) { p.gsp = dir * 4; p.leaveGround(); p.vy = -3; }
        else { p.vx = dir * 3.5; p.vy = p.y < this.y ? -4.5 : 2; }
        this.s.addScore(100, this.x, this.y - 30, true);
        if (this.hp <= 0) { this.state = 'dead'; this.st = 0; G.Audio.stop(); }
      } else if (this.flash === 0 || !p.isAttacking) {
        p.hit(this.x);
      }
    }
    update() {
      this.t++; this.st++;
      if (this.flash > 0) this.flash--;
      const p = this.s.player;
      const midX = (this.left + this.right) / 2;
      // kid-friendly: rain a few rings into the arena when the player has none
      if (this.state !== 'wait' && this.state !== 'dead' && p.rings === 0 && !p.dead && this.t % 240 === 0) {
        for (let i = 0; i < 5; i++) this.s.addObject({ type: 'loosering', x: this.left + 60 + Math.random() * (this.right - this.left - 120), y: this.floor - 260, vx: (Math.random() - 0.5) * 1.5, vy: 0 });
      }
      switch (this.state) {
        case 'wait':
          if (Math.abs(p.x - midX) < 160 && p.x > this.left - 20) {
            this.state = 'enter'; this.st = 0; G.Audio.play('boss'); this.s.boss = this;
            this.s.def.camLeft = this.left - 40; this.s.def.camRight = this.right + 40;
          }
          break;
        case 'enter':
          this.y = G.lerp(this.y, this.baseY, 0.05);
          if (this.st > 90) this.next();
          break;
        case 'hover': {
          const spd = this.kind === 'final' && this.hp < 6 ? 2.2 : 1.6;
          this.x += this.dir * spd;
          if (this.x < this.left + 50) this.dir = 1;
          if (this.x > this.right - 50) this.dir = -1;
          this.y = this.baseY + Math.sin(this.t * 0.06) * 8;
          if (this.kind === 'bomber' && this.st % 50 === 25) this.s.addObject({ type: 'orb', x: this.x, y: this.y + 24, vx: this.dir * 0.4, vy: 0.5, g: 0.12 });
          if (this.kind === 'final' && this.st % 70 === 35) this.fireSpread(3);
          if (this.st > 150) this.attack();
          break;
        }
        case 'charge': {
          // drop to the floor, pause, then charge across
          if (this.st < 30) this.y = G.lerp(this.y, this.floor - 34, 0.15);
          else if (this.st < 60) { this.x += Math.sin(this.st) * 1.2; }
          else {
            if (this.st === 60) { this.vx = (p.x < this.x ? -1 : 1) * 5.5; this.dir = Math.sign(this.vx); G.Audio.sfx('boost'); }
            this.x += this.vx;
            if (this.st % 4 === 0) this.s.fx.spawn('dust', this.x - this.vx * 4, this.floor - 4, -this.vx * 0.2, -0.5);
            if (this.x < this.left + 40 || this.x > this.right - 40) {
              this.x = G.clamp(this.x, this.left + 40, this.right - 40);
              this.s.shake = 12; G.Audio.sfx('thud');
              this.next();
            }
          }
          break;
        }
        case 'dive': {
          // telegraph at the player's x, then burst up from the floor
          if (this.st === 1) { this.tx = p.x; }
          if (this.st < 40) this.y -= 4;
          else if (this.st < 80) { this.x = G.clamp(this.tx, this.left + 40, this.right - 40); this.y = this.floor + 60; if (this.st % 6 === 0) this.s.fx.spawn('debris', this.x + (Math.random() - 0.5) * 30, this.floor - 4, (Math.random() - 0.5) * 2, -2); }
          else if (this.st < 110) { this.y -= 8; if (this.st === 80) { G.Audio.sfx('crumble'); this.s.shake = 10; } }
          else { this.y = G.lerp(this.y, this.baseY, 0.1); if (this.st > 140) this.next(); }
          break;
        }
        case 'bombrun': {
          this.x += this.dir * 3.2;
          this.y = this.baseY - 20 + Math.sin(this.t * 0.1) * 4;
          if (this.st % 30 === 0) { this.s.addObject({ type: 'orb', x: this.x, y: this.y + 24, vx: 0, vy: 1, g: 0.15 }); G.Audio.sfx('shoot'); }
          if (this.x < this.left + 50) this.dir = 1;
          if (this.x > this.right - 50) this.dir = -1;
          if (this.st > 160) this.next();
          break;
        }
        case 'spray': {
          this.y = G.lerp(this.y, this.baseY - 20, 0.1);
          if (this.st === 30 || this.st === 70 || this.st === 110) this.fireSpread(this.kind === 'final' ? 7 : 5);
          if (this.st > 140) this.next();
          break;
        }
        case 'dead':
          if (this.st % 6 === 0) { this.s.fx.spawn('explode', this.x + (Math.random() - 0.5) * 60, this.y + (Math.random() - 0.5) * 40, 0, 0); G.Audio.sfx('pop'); }
          if (this.st === 30) { this.s.flash = 20; G.Audio.sfx('boom'); }
          if (this.st > 120) { this.y -= 2; this.x += 3; }
          if (this.st === 150) {
            this.alive = false;
            this.s.boss = null;
            this.s.addScore(1000, this.x, this.y, true);
            for (let i = 0; i < 6; i++) this.s.spawnCritter(midX + (i - 3) * 20, this.floor - 20);
            this.s.def.camLeft = 0; this.s.def.camRight = this.s.def.width;
            this.s.onBossDefeated(Math.min(this.right + 200, Math.max(p.x + 140, midX + 60)));
            G.Audio.play(this.s.def.music || this.s.theme.music);
          }
          break;
      }
    }
    segments() {
      if (this.state === 'wait' || this.state === 'dead') return null;
      if (!this.walls) {
        this.walls = [
          G.makeSeg(this.left - 40, this.floor - 600, this.left - 40, this.floor + 4, { ref: this }),
          G.makeSeg(this.right + 40, this.floor + 4, this.right + 40, this.floor - 600, { ref: this }),
        ];
      }
      return this.walls;
    }
    fireSpread(n) {
      G.Audio.sfx('laser');
      for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 + ((i - (n - 1) / 2) / n) * 1.8;
        this.s.addObject({ type: 'orb', x: this.x, y: this.y + 20, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, g: 0.02 });
      }
    }
    next() {
      this.attacks++;
      this.state = 'hover'; this.st = 0;
    }
    attack() {
      this.st = 0;
      const k = this.kind;
      const pick = {
        charger: ['charge'], driller: ['dive'], bomber: ['bombrun'], froster: ['spray', 'charge'], final: ['charge', 'spray', 'dive', 'bombrun'],
      }[k];
      this.state = pick[this.attacks % pick.length];
    }
    render(ctx, cx, cy) {
      if (this.state === 'dive' && this.st >= 40 && this.st < 80) return;
      const hurt = this.flash > 0 && (this.flash >> 2) % 2 === 0;
      const img = bossArt(this.kind, (this.t >> 3) % 4, hurt);
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
      ctx.save();
      ctx.translate(x, y);
      if (this.dir > 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -40, -40);
      ctx.restore();
      if (this.state !== 'dead' && this.state !== 'wait' && this.t % 4 < 2) {
        ctx.fillStyle = '#ffd23a';
        ctx.fillRect(x - 24, y + 12, 4, 3 + (this.t % 3)); ctx.fillRect(x + 20, y + 12, 4, 3 + (this.t % 3));
      }
    }
    renderHUD(ctx) {
      if (this.state === 'wait') return;
      const W = G.W;
      const w = 120, x = Math.round(W / 2 - w / 2), y = G.H - 18;
      G.Font.draw(ctx, this.K.name, W / 2, y - 10, { align: 'center', color: '#ffffff', color2: '#ffb0b0' });
      ctx.fillStyle = '#100818'; ctx.fillRect(x - 1, y - 1, w + 2, 8);
      ctx.fillStyle = '#5a1010'; ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = '#ff3a3a'; ctx.fillRect(x, y, Math.round((w * Math.max(0, this.hp)) / this.maxHp), 6);
      ctx.fillStyle = '#ff9a9a'; ctx.fillRect(x, y, Math.round((w * Math.max(0, this.hp)) / this.maxHp), 2);
    }
  }
  G.Objects.register('boss', Boss);

  // standard arena: flat floor with walls; safe rings + monitors
  G.buildBossLevel = function (opt) {
    const b = new G.LevelBuilder(Object.assign({ bottom: 1500, camTop: 200 }, opt));
    const floor = 1000;
    b.block(-200, 300, 200, 1200);
    b.ground(0, floor).flat(500);
    b.ringsGround(160, 6, 24, 30);
    b.on('monitor', 230, { kind: 'shield' });
    const left = b.gx;
    b.flat(560);
    const right = b.gx;
    b.flat(500);
    const end = b.gx;
    b.endGround();
    b.block(end, 300, 200, 1200);
    b.obj('boss', (left + right) / 2, floor, { kind: opt.boss, left, right, floor });
    b.on('monitor', left + 40, { kind: 'ring' });
    b.on('monitor', right - 40, { kind: 'ring' });
    b.platform(left + 120, floor - 70, 64);
    b.platform(right - 184, floor - 70, 64);
    for (const dx of [80, 180, 260, 340, 420]) b.deco(opt.decoType || 'palm', left + dx + (dx % 3) * 7);
    return b.build({ start: { x: 120, y: floor - 25 }, camLeft: 0, camRight: end, camBottom: floor + 200, bossFloor: floor, music: opt.music });
  };
})(window.G);
