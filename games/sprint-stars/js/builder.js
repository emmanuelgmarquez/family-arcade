'use strict';
// LevelBuilder: a small DSL for authoring smooth terrain, loops, platforms,
// caves, objects and scenery. Levels are plain functions that call this.
(function (G) {
  const STEP = 8;

  class Surface {
    constructor(x, y) { this.pts = [x, y]; this.x = x; this.y = y; }
    _add(x, y) { this.pts.push(x, y); this.x = x; this.y = y; return this; }
    flat(len) { return this._add(this.x + len, this.y); }
    line(len, dy) { return this._add(this.x + len, this.y + dy); }
    // smooth S-curve height change
    slope(len, dy) {
      const x0 = this.x, y0 = this.y, n = Math.max(2, Math.ceil(len / STEP));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        this._add(x0 + len * t, y0 + dy * (0.5 - 0.5 * Math.cos(Math.PI * t)));
      }
      return this;
    }
    // bump: h>0 is a hill, h<0 is a dip
    hill(len, h) {
      const x0 = this.x, y0 = this.y, n = Math.max(2, Math.ceil(len / STEP));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        this._add(x0 + len * t, y0 - h * (0.5 - 0.5 * Math.cos(G.TAU * t)));
      }
      return this;
    }
    wave(len, amp, count) {
      const x0 = this.x, y0 = this.y, n = Math.max(2, Math.ceil(len / STEP));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        this._add(x0 + len * t, y0 - amp * (0.5 - 0.5 * Math.cos(G.TAU * count * t)));
      }
      return this;
    }
    // quarter pipe rising to angle (degrees), radius r
    ramp(r, deg) {
      const x0 = this.x, y0 = this.y;
      const a1 = (deg * Math.PI) / 180, n = Math.max(3, Math.ceil((r * a1) / STEP));
      for (let i = 1; i <= n; i++) {
        const a = (a1 * i) / n;
        this._add(x0 + r * Math.sin(a), y0 - r * (1 - Math.cos(a)));
      }
      return this;
    }
    // convex curve from current slope down (a rounded lip)
    lipDown(r, deg) {
      const x0 = this.x, y0 = this.y;
      const a1 = (deg * Math.PI) / 180, n = Math.max(3, Math.ceil((r * a1) / STEP));
      for (let i = 1; i <= n; i++) {
        const a = (a1 * i) / n;
        this._add(x0 + r * Math.sin(a), y0 + r * (1 - Math.cos(a)));
      }
      return this;
    }
    up(h) { return this._add(this.x, this.y - h); }
    down(h) { return this._add(this.x, this.y + h); }
    to(x, y) { return this._add(x, y); }
  }

  class LevelBuilder {
    constructor(opt) {
      this.opt = opt;
      this.bottom = opt.bottom || 1600;
      this.solids = []; this.holes = []; this.chains = []; this.loops = [];
      this.objects = []; this.decos = []; this.decosFront = []; this.waterfalls = [];
      this.surfaces = []; // for groundY lookups
      this.g = null;
      this.medals = 0;
    }
    // ----- main ground -----
    ground(x, y) {
      this.g = new Surface(x, y);
      this.gStart = x;
      return this;
    }
    endGround() {
      if (!this.g) return this;
      const s = this.g;
      const pts = [this.gStart, this.bottom].concat(s.pts, [s.x, this.bottom]);
      this.solids.push({ pts, style: 'ground', opts: {} });
      this.surfaces.push(s.pts.slice());
      this.g = null;
      return this;
    }
    gap(len, dy = 0) {
      const x = this.g.x + len, y = this.g.y + dy;
      this.endGround();
      return this.ground(x, y);
    }
    get gx() { return this.g.x; }
    get gy() { return this.g.y; }
    // surface DSL passthrough
    flat(l) { this.g.flat(l); return this; }
    line(l, dy) { this.g.line(l, dy); return this; }
    slope(l, dy) { this.g.slope(l, dy); return this; }
    hill(l, h) { this.g.hill(l, h); return this; }
    wave(l, a, n) { this.g.wave(l, a, n); return this; }
    ramp(r, d) { this.g.ramp(r, d); return this; }
    lipDown(r, d) { this.g.lipDown(r, d); return this; }
    up(h) { this.g.up(h); return this; }
    down(h) { this.g.down(h); return this; }

    // A full 360 loop sitting on the current ground
    loop(R, opts = {}) {
      const pad = opts.pad || 40;
      const cx = this.g.x + pad + R, cy = this.g.y - R;
      this.g.flat(pad * 2 + R * 2);
      this.addLoop(cx, cy, R);
      return this;
    }
    addLoop(cx, cy, R) {
      const right = [], left = [];
      for (let a = 90; a >= -90; a -= 5) {
        const r = (a * Math.PI) / 180;
        right.push(cx + Math.cos(r) * R, cy + Math.sin(r) * R);
      }
      for (let a = 270; a >= 90; a -= 5) {
        const r = (a * Math.PI) / 180;
        left.push(cx + Math.cos(r) * R, cy + Math.sin(r) * R);
      }
      this.chains.push({ pts: right, opts: { mask: 1 } });
      this.chains.push({ pts: left, opts: { mask: 2 } });
      this.loops.push({ cx, cy, r: R });
      this.objects.push({ type: 'loop', x: cx, y: cy, r: R });
    }

    // ----- extra geometry -----
    // elevated track built with the same DSL; fn(surface)
    track(x, y, fn, opts = {}) {
      const s = new Surface(x, y);
      fn(s);
      const th = opts.thick || 40;
      const top = s.pts;
      const pts = top.slice();
      // underside: offset down, slightly rounded at the ends
      const under = [];
      for (let i = top.length - 2; i >= 0; i -= 2) {
        const t = i / (top.length - 2);
        const taper = Math.min(1, Math.min(t, 1 - t) * 8 + 0.35);
        under.push(top[i], top[i + 1] + th * taper);
      }
      const poly = pts.concat(under);
      this.solids.push({ pts: poly, style: opts.style || 'ground', opts: { oneWay: !!opts.oneWay } });
      this.surfaces.push(top.slice());
      return s;
    }
    // floating island platform
    platform(x, y, w, opts = {}) {
      const d = opts.depth || 22;
      const pts = [x, y, x + w, y, x + w - 4, y + d * 0.6, x + w * 0.7, y + d, x + w * 0.5, y + d + 8, x + w * 0.3, y + d, x + 4, y + d * 0.6];
      this.solids.push({ pts, style: 'ground', opts: { oneWay: opts.oneWay !== false } });
      this.surfaces.push([x, y, x + w, y]);
      return this;
    }
    block(x, y, w, h, opts = {}) {
      const pts = [x, y, x + w, y, x + w, y + h, x, y + h];
      this.solids.push({ pts, style: opts.style || 'ground', opts: {} });
      this.surfaces.push([x, y, x + w, y]);
      return this;
    }
    poly(pts, opts = {}) { this.solids.push({ pts, style: opts.style || 'ground', opts }); return this; }
    // kid-friendly pit: a lower floor with a red spring back up to the far ledge
    rescue(x0, x1, y, opts = {}) {
      const fy = y + (opts.depth || 170);
      this.block(x0, fy, x1 - x0, this.bottom - fy);
      this.obj('spring', x1 - 30, fy, { dir: 'up', color: 'r' });
      this.rings(x0 + 40, fy - 26, Math.max(1, Math.floor((x1 - x0 - 120) / 30)), 30);
      return this;
    }
    cave(x, y, w, h, r = 16) {
      const pts = [];
      const corner = (cx, cy, a0) => { for (let i = 0; i <= 4; i++) { const a = a0 + (i * Math.PI) / 8; pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } };
      corner(x + r, y + r, Math.PI); corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2);
      this.holes.push({ pts, style: 'cave', opts: {} });
      return this;
    }
    holePoly(pts) { this.holes.push({ pts, style: 'cave', opts: {} }); return this; }

    // ----- queries -----
    groundY(x, below = -Infinity) {
      let best = null;
      const list = this.g ? this.surfaces.concat([this.g.pts]) : this.surfaces;
      for (const p of list) {
        for (let i = 0; i + 3 < p.length; i += 2) {
          const x1 = p[i], x2 = p[i + 2];
          if (x2 === x1) continue;
          if ((x >= x1 && x <= x2) || (x >= x2 && x <= x1)) {
            const y = p[i + 1] + ((p[i + 3] - p[i + 1]) * (x - x1)) / (x2 - x1);
            if (y > below && (best === null || y < best)) best = y;
          }
        }
      }
      return best === null ? this.bottom : best;
    }

    // ----- objects -----
    obj(type, x, y, props = {}) {
      const o = Object.assign({ type, x, y }, props);
      if (type === 'medal') o.idx = this.medals++;
      this.objects.push(o);
      return this;
    }
    on(type, x, props = {}, lift = 0) {
      // place on the main ground at x
      const y = this.groundY(x, props.below);
      return this.obj(type, x, y - lift, props);
    }
    rings(x, y, n, dx = 20, dy = 0) {
      for (let i = 0; i < n; i++) this.obj('ring', x + i * dx, y + i * dy);
      return this;
    }
    ringsGround(x, n, dx = 20, h = 26, below) {
      for (let i = 0; i < n; i++) this.obj('ring', x + i * dx, this.groundY(x + i * dx, below) - h);
      return this;
    }
    ringArc(x, y, n, w, h) {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        this.obj('ring', x + w * t, y - h * Math.sin(Math.PI * t));
      }
      return this;
    }
    ringCircle(cx, cy, r, n) {
      for (let i = 0; i < n; i++) { const a = (i / n) * G.TAU; this.obj('ring', cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      return this;
    }
    deco(type, x, opts = {}) {
      const y = opts.y !== undefined ? opts.y : this.groundY(x, opts.below);
      (opts.front ? this.decosFront : this.decos).push(Object.assign({ type, x, y }, opts));
      return this;
    }
    waterfall(x, y, w, h) { this.waterfalls.push({ x, y, w, h }); return this; }

    build(extra = {}) {
      if (this.g) this.endGround();
      let maxX = 0;
      for (const p of this.solids) for (let i = 0; i < p.pts.length; i += 2) maxX = Math.max(maxX, p.pts[i]);
      return Object.assign({
        width: maxX, bottom: this.bottom,
        solids: this.solids, holes: this.holes, chains: this.chains, loops: this.loops,
        objects: this.objects, decos: this.decos, decosFront: this.decosFront, waterfalls: this.waterfalls,
        medals: this.medals,
      }, this.opt, extra);
    }
  }
  G.LevelBuilder = LevelBuilder;
  G.Surface = Surface;
  G.LEVELS = G.LEVELS || {};
})(window.G);
