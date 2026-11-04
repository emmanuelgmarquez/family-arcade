'use strict';
// World-specific gadgets: icicles, lasers, conveyor belts, mine carts.
(function (G) {
  const cache = {};
  const spr = (key, w, h, fn, outline = '#101018') => cache[key] || (cache[key] = G.renderPixel(w, h, fn, outline));
  const D = () => G.Draw;

  // ---------- falling icicle ----------
  class Icicle extends G.Obj {
    constructor(s, d) { super(s, d); this.w = 12; this.h = 26; this.hx = d.x; this.hy = d.y; this.reset(); }
    reset() { this.x = this.hx; this.y = this.hy + 13; this.state = 0; this.vy = 0; this.st = 0; }
    get always() { return this.state > 0; }
    update() {
      this.t++; this.st++;
      const p = this.s.player;
      if (this.state === 0 && Math.abs(p.x - this.x) < 70 && p.y > this.y && p.y - this.y < 260) { this.state = 1; this.st = 0; G.Audio.sfx('icicle'); }
      else if (this.state === 1 && this.st > 26) { this.state = 2; this.st = 0; }
      else if (this.state === 2) {
        this.vy = Math.min(this.vy + 0.35, 10);
        this.y += this.vy;
        const h = this.s.terrain.raycast(this.x, this.y, 0, 1, 14 + this.vy, { mask: 3, oneWay: true });
        if (h || this.st > 120) {
          this.state = 3; this.st = 0;
          for (let i = 0; i < 6; i++) this.s.fx.spawn('snow', this.x, this.y + 10, (Math.random() - 0.5) * 3, -Math.random() * 3);
          G.Audio.sfx('deflect');
        }
      } else if (this.state === 3 && this.st > 200) this.reset();
    }
    touch(p) { if (this.state === 2 || this.state === 1) { if (p.inv > 0) { this.state = 3; this.st = 0; } else p.hit(this.x); } }
    box() { return this.state === 3 ? [0, 0, 0, 0] : [this.x - 5, this.y - 12, 10, 24]; }
    render(ctx, cx, cy) {
      if (this.state === 3) return;
      const img = spr('icicle', 16, 32, (c) => { D().path(c, [1, 0, 15, 0, 8, 31], '#bde8ff'); D().path(c, [8, 0, 15, 0, 8, 31], '#7ac0f0'); D().line(c, 4, 2, 7, 20, '#ffffff', 1); }, '#2a5a9a');
      const sh = this.state === 1 ? (this.st % 4 < 2 ? -1 : 1) : 0;
      ctx.drawImage(img, Math.round(this.x - 8 - cx + sh), Math.round(this.y - 13 - cy));
      ctx.fillStyle = '#e8f8ff'; ctx.fillRect(Math.round(this.hx - 9 - cx), Math.round(this.hy - cy - 2), 18, 3);
    }
  }
  G.Objects.register('icicle', Icicle);

  // ---------- laser gate (vertical beam that pulses) ----------
  class Laser extends G.Obj {
    constructor(s, d) {
      super(s, d);
      this.top = d.y - (d.len || 120); this.bot = d.y; this.period = d.period || 180; this.ph = d.ph || 0;
      this.w = 8; this.h = this.bot - this.top; this.y = (this.top + this.bot) / 2;
    }
    phase() { return (this.s.time + this.ph) % this.period; }
    on() { const p = this.phase(); return p > this.period * 0.55; }
    warn() { const p = this.phase(); return p > this.period * 0.4 && p <= this.period * 0.55; }
    update() { this.t++; if (this.phase() === Math.floor(this.period * 0.55) + 1 && Math.abs(this.s.player.x - this.x) < 300) G.Audio.sfx('laser'); }
    touch(p) { if (this.on()) p.hit(this.x); }
    box() { return this.on() ? [this.x - 3, this.top, 6, this.h] : [0, 0, 0, 0]; }
    render(ctx, cx, cy) {
      const x = Math.round(this.x - cx), t = Math.round(this.top - cy), b = Math.round(this.bot - cy);
      ctx.fillStyle = '#3a3a50'; ctx.fillRect(x - 7, t - 10, 14, 10); ctx.fillRect(x - 7, b - 4, 14, 6);
      ctx.fillStyle = '#ff3a3a'; ctx.fillRect(x - 3, t - 3, 6, 3);
      if (this.on()) {
        ctx.fillStyle = 'rgba(255,60,90,0.45)'; ctx.fillRect(x - 4, t, 8, b - t - 4);
        ctx.fillStyle = (this.t >> 1) % 2 ? '#ff8aa0' : '#ffffff'; ctx.fillRect(x - 1, t, 3, b - t - 4);
      } else if (this.warn() && (this.t >> 2) % 2) {
        ctx.fillStyle = 'rgba(255,60,90,0.6)'; ctx.fillRect(x, t, 1, b - t - 4);
      }
    }
  }
  G.Objects.register('laser', Laser);

  // ---------- conveyor belt (solid block whose top carries you) ----------
  class Conveyor extends G.Obj {
    constructor(s, d) {
      super(s, d);
      this.w = d.w || 160; this.h = 16; this.spd = d.spd || 2;
      this.y = d.y + 8;
      this.seg = G.makeSeg(this.x - this.w / 2, d.y, this.x + this.w / 2, d.y, { ref: this, conveyor: this.spd });
      const x0 = this.x - this.w / 2, x1 = this.x + this.w / 2, y0 = d.y, y1 = d.y + 16;
      this.segs = [this.seg, G.makeSeg(x1, y0, x1, y1, { ref: this }), G.makeSeg(x1, y1, x0, y1, { ref: this }), G.makeSeg(x0, y1, x0, y0, { ref: this })];
    }
    segments() { return this.segs; }
    render(ctx, cx, cy) {
      const x = Math.round(this.x - this.w / 2 - cx), y = Math.round(this.y - 8 - cy);
      ctx.fillStyle = '#2a2a38'; ctx.fillRect(x, y, this.w, 16);
      ctx.fillStyle = '#5a5a70'; ctx.fillRect(x + 2, y + 2, this.w - 4, 12);
      const off = ((this.s.time * this.spd) % 8 + 8) % 8;
      ctx.fillStyle = '#ffd23a';
      for (let i = -8; i < this.w; i += 8) { const xx = x + i + off; if (xx >= x && xx < x + this.w - 3) ctx.fillRect(xx, y + 1, 3, 2); }
      ctx.fillStyle = '#8a8aa0';
      for (let i = 0; i < this.w; i += 16) { ctx.beginPath(); ctx.arc(x + i + 8, y + 9, 3, 0, G.TAU); ctx.fill(); }
      ctx.fillStyle = '#14141e'; ctx.fillRect(x, y + 15, this.w, 1);
    }
  }
  G.Objects.register('conveyor', Conveyor);

  // ---------- mine cart: hop in and it rolls along the track ----------
  class MineCart extends G.Obj {
    constructor(s, d) {
      super(s, d);
      this.w = 40; this.h = 20; this.hx = d.x; this.hy = d.y;
      this.seg = G.makeSeg(0, 0, 1, 0, { oneWay: true, ref: this });
      this.reset();
    }
    reset() { this.x = this.hx; this.y = this.hy - 12; this.vx = 0; this.vy = 0; this.state = 0; this.st = 0; this.pdx = 0; this.pdy = 0; }
    get always() { return this.state > 0; }
    update() {
      this.t++; this.st++;
      const ox = this.x, oy = this.y;
      const p = this.s.player;
      const riding = p.onGround && p.groundSeg === this.seg;
      const T = this.s.terrain;
      if (this.state === 0 && riding) { this.state = 1; this.st = 0; G.Audio.sfx('roll'); }
      if (this.state === 1) {
        this.vx = Math.min(this.vx + 0.12, this.d.spd || 7);
        this.x += this.vx;
        const g = T.raycast(this.x, this.y - 20, 0, 1, 60, { mask: 3 });
        const wall = T.raycast(this.x, this.y - 6, 1, 0, 24, { mask: 3 });
        if (!g || (wall && Math.abs(wall.nx) > 0.6)) { this.state = 2; this.st = 0; this.vy = -2; G.Audio.sfx('thud'); }
        else this.y = g.y - 12;
        if (this.t % 6 === 0) this.s.fx.spawn('dust', this.x - 18, this.y + 10, -1, -0.3);
      } else if (this.state === 2) {
        this.vy += 0.3; this.y += this.vy; this.x += this.vx * 0.5;
        if (this.st > 90) { this.state = 3; this.st = 0; this.y = -9999; }
      } else if (this.state === 3 && this.st > 200 && Math.abs(p.x - this.hx) > 300) this.reset();
      this.pdx = this.x - ox; this.pdy = this.y - oy;
      G.setSeg(this.seg, this.x - 18, this.y - 10, this.x + 18, this.y - 10);
    }
    segments() { return this.state === 3 ? null : [this.seg]; }
    render(ctx, cx, cy) {
      if (this.state === 3) return;
      const img = spr('cart', 44, 28, (c) => {
        const d = D();
        d.path(c, [2, 4, 42, 4, 38, 20, 6, 20], '#8a5a2a', '#3a2008', 1);
        d.path(c, [2, 4, 42, 4, 42, 7, 2, 7], '#c8c8d8');
        d.line(c, 10, 8, 10, 19, '#5a3a18', 1); d.line(c, 22, 8, 22, 19, '#5a3a18', 1); d.line(c, 34, 8, 34, 19, '#5a3a18', 1);
        d.ell(c, 12, 23, 4, 4, 0, '#3a3a4a'); d.ell(c, 32, 23, 4, 4, 0, '#3a3a4a');
        d.ell(c, 12, 23, 1.5, 1.5, 0, '#c8c8d8'); d.ell(c, 32, 23, 1.5, 1.5, 0, '#c8c8d8');
      });
      ctx.drawImage(img, Math.round(this.x - 22 - cx), Math.round(this.y - 14 - cy));
    }
  }
  G.Objects.register('minecart', MineCart);
})(window.G);
