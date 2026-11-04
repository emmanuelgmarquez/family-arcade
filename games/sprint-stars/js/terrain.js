'use strict';
// Terrain: vector collision geometry (segments in a spatial hash), raycasts,
// and a chunked render cache painted by the active theme.
(function (G) {
  const CELL = 128;
  const MAXSEG = 16; // long edges are subdivided so caves can carve openings

  function pointInPoly(px, py, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  G.pointInPoly = pointInPoly;

  function bboxOf(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
      y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
    }
    return { x0, y0, x1, y1 };
  }

  G.makeSeg = function (x1, y1, x2, y2, o) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    return {
      x1, y1, x2, y2, nx: dy / len, ny: -dx / len, len,
      mask: (o && o.mask) || 3, oneWay: !!(o && o.oneWay), ice: !!(o && o.ice),
      conveyor: (o && o.conveyor) || 0, ref: (o && o.ref) || null, tag: (o && o.tag) || null,
    };
  };
  G.setSeg = function (s, x1, y1, x2, y2) {
    s.x1 = x1; s.y1 = y1; s.x2 = x2; s.y2 = y2;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    s.nx = dy / len; s.ny = -dx / len; s.len = len;
  };

  class Terrain {
    constructor(theme) {
      this.theme = theme;
      this.solids = []; // {pts, bbox, style, opts}
      this.holes = [];
      this.chains = []; // open surfaces e.g. loop arcs {pts, opts}
      this.loops = []; // {cx, cy, r}
      this.raw = []; // pending segments before indexing
      this.segs = [];
      this.grid = new Map();
      this.dyn = [];
      this.stamp = 1;
      this.chunks = new Map();
      this.chunkOrder = [];
      this.chunkSize = 256;
      this.maxChunks = 72;
    }
    addSolid(pts, style, opts = {}) {
      const p = { pts, bbox: bboxOf(pts), style: style || 'ground', opts };
      this.solids.push(p);
      return p;
    }
    addHole(pts, style, opts = {}) {
      const p = { pts, bbox: bboxOf(pts), style: style || 'cave', opts };
      this.holes.push(p);
      return p;
    }
    addChain(pts, opts = {}) {
      this.chains.push({ pts, bbox: bboxOf(pts), opts });
    }
    _pushEdge(x1, y1, x2, y2, opts, src) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 0.01) return;
      const n = Math.max(1, Math.ceil(len / MAXSEG));
      for (let i = 0; i < n; i++) {
        const a = i / n, b = (i + 1) / n;
        const s = G.makeSeg(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b, opts);
        s.src = src;
        this.raw.push(s);
      }
    }
    build() {
      // solids: closed, clockwise (screen space) => outward normals
      for (const p of this.solids) {
        const pts = p.pts;
        for (let i = 0; i < pts.length; i += 2) {
          const j = (i + 2) % pts.length;
          this._pushEdge(pts[i], pts[i + 1], pts[j], pts[j + 1], p.opts, 'solid');
        }
      }
      // holes: reversed so normals point into the hole
      for (const p of this.holes) {
        const pts = p.pts;
        for (let i = pts.length - 2; i >= 0; i -= 2) {
          const j = i === 0 ? pts.length - 2 : i - 2;
          this._pushEdge(pts[i], pts[i + 1], pts[j], pts[j + 1], p.opts, 'hole');
        }
      }
      for (const c of this.chains) {
        const pts = c.pts;
        for (let i = 0; i + 3 < pts.length; i += 2) this._pushEdge(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], c.opts, 'chain');
      }
      // carve: solid edges inside a hole vanish; hole edges outside every solid vanish
      for (const s of this.raw) {
        const mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2;
        if (s.src === 'solid') {
          let cut = false;
          for (const h of this.holes) {
            const b = h.bbox;
            if (mx < b.x0 - 1 || mx > b.x1 + 1 || my < b.y0 - 1 || my > b.y1 + 1) continue;
            // nudge test point slightly inward so edges on the hole boundary count
            if (pointInPoly(mx - s.nx * 0.5, my - s.ny * 0.5, h.pts) && pointInPoly(mx + s.nx * 0.5, my + s.ny * 0.5, h.pts)) { cut = true; break; }
          }
          if (cut) continue;
        } else if (s.src === 'hole') {
          let inSolid = false;
          const tx = mx - s.nx * 1.5, ty = my - s.ny * 1.5; // point just behind the hole wall
          for (const p of this.solids) {
            const b = p.bbox;
            if (tx < b.x0 || tx > b.x1 || ty < b.y0 || ty > b.y1) continue;
            if (pointInPoly(tx, ty, p.pts)) { inSolid = true; break; }
          }
          if (!inSolid) continue;
        }
        this.segs.push(s);
      }
      this.raw = null;
      for (const s of this.segs) this._insert(s);
    }
    _insert(s) {
      const x0 = Math.floor(Math.min(s.x1, s.x2) / CELL), x1 = Math.floor(Math.max(s.x1, s.x2) / CELL);
      const y0 = Math.floor(Math.min(s.y1, s.y2) / CELL), y1 = Math.floor(Math.max(s.y1, s.y2) / CELL);
      for (let cx = x0; cx <= x1; cx++)
        for (let cy = y0; cy <= y1; cy++) {
          const k = cx * 8192 + cy;
          let a = this.grid.get(k);
          if (!a) this.grid.set(k, (a = []));
          a.push(s);
        }
      s.st = 0;
    }
    // Ray cast. q: {mask, oneWay, ignore(seg)}
    raycast(ox, oy, dx, dy, len, q) {
      const ex = ox + dx * len, ey = oy + dy * len;
      const x0 = Math.floor(Math.min(ox, ex) / CELL), x1 = Math.floor(Math.max(ox, ex) / CELL);
      const y0 = Math.floor(Math.min(oy, ey) / CELL), y1 = Math.floor(Math.max(oy, ey) / CELL);
      const st = ++this.stamp;
      let best = null, bestT = len;
      const test = (s) => {
        if (!(s.mask & q.mask)) return;
        const dot = s.nx * dx + s.ny * dy;
        if (dot >= -0.02) return; // back face
        if (s.oneWay && !q.oneWay) return;
        if (q.ignore && q.ignore(s)) return;
        const exx = s.x2 - s.x1, eyy = s.y2 - s.y1;
        const den = dx * eyy - dy * exx;
        if (Math.abs(den) < 1e-9) return;
        const ax = s.x1 - ox, ay = s.y1 - oy;
        const t = (ax * eyy - ay * exx) / den;
        if (t < -0.001 || t > bestT) return;
        const u = (ax * dy - ay * dx) / den;
        if (u < -0.002 || u > 1.002) return;
        bestT = t; best = s;
      };
      for (let cx = x0; cx <= x1; cx++)
        for (let cy = y0; cy <= y1; cy++) {
          const a = this.grid.get(cx * 8192 + cy);
          if (!a) continue;
          for (let i = 0; i < a.length; i++) {
            const s = a[i];
            if (s.st === st) continue;
            s.st = st;
            test(s);
          }
        }
      for (let i = 0; i < this.dyn.length; i++) test(this.dyn[i]);
      if (!best) return null;
      return { t: Math.max(0, bestT), seg: best, x: ox + dx * bestT, y: oy + dy * bestT, nx: best.nx, ny: best.ny };
    }
    // find ground height under x (first upward-facing surface below y)
    groundBelow(x, y, maxLen = 2000) {
      const h = this.raycast(x, y, 0, 1, maxLen, { mask: 3, oneWay: true });
      return h ? h.y : null;
    }

    // ---------------- rendering ----------------
    _chunk(cx, cy) {
      const key = cx * 8192 + cy;
      let c = this.chunks.get(key);
      if (c !== undefined) return c;
      const S = this.chunkSize;
      const wx = cx * S, wy = cy * S, m = 24;
      const inter = (b) => !(b.x1 < wx - m || b.x0 > wx + S + m || b.y1 < wy - m || b.y0 > wy + S + m);
      const solids = this.solids.filter((p) => inter(p.bbox));
      const holes = this.holes.filter((p) => inter(p.bbox));
      const chains = this.chains.filter((p) => inter(p.bbox));
      const loops = this.loops.filter((l) => inter({ x0: l.cx - l.r - 40, x1: l.cx + l.r + 40, y0: l.cy - l.r - 40, y1: l.cy + l.r + 40 }));
      if (!solids.length && !holes.length && !chains.length && !loops.length) {
        this.chunks.set(key, null);
        return null;
      }
      const canvas = G.makeCanvas(S, S);
      const ctx = G.ctxOf(canvas);
      ctx.translate(-wx, -wy);
      this.theme.paintTerrain(ctx, { solids, holes, chains, loops, x: wx, y: wy, w: S, h: S }, this);
      c = { canvas };
      this.chunks.set(key, c);
      this.chunkOrder.push(key);
      if (this.chunkOrder.length > this.maxChunks) {
        const old = this.chunkOrder.shift();
        this.chunks.delete(old);
      }
      return c;
    }
    render(ctx, camX, camY, W, H) {
      const S = this.chunkSize;
      const cx0 = Math.floor(camX / S), cx1 = Math.floor((camX + W) / S);
      const cy0 = Math.floor(camY / S), cy1 = Math.floor((camY + H) / S);
      for (let cx = cx0; cx <= cx1; cx++)
        for (let cy = cy0; cy <= cy1; cy++) {
          const c = this._chunk(cx, cy);
          if (c) ctx.drawImage(c.canvas, cx * S - camX, cy * S - camY);
        }
    }
    prewarm(camX, camY, W, H) {
      const S = this.chunkSize;
      for (let cx = Math.floor((camX - S) / S); cx <= Math.floor((camX + W + S) / S); cx++)
        for (let cy = Math.floor(camY / S); cy <= Math.floor((camY + H) / S); cy++) this._chunk(cx, cy);
    }
    // build at most one missing chunk in the given region (spreads the cost over frames)
    warmOne(x, y, W, H) {
      const S = this.chunkSize;
      for (let cx = Math.floor(x / S); cx <= Math.floor((x + W) / S); cx++)
        for (let cy = Math.floor(y / S); cy <= Math.floor((y + H) / S); cy++)
          if (!this.chunks.has(cx * 8192 + cy)) { this._chunk(cx, cy); return; }
    }
    debugDraw(ctx, camX, camY) {
      ctx.lineWidth = 1;
      for (const s of this.segs.concat(this.dyn)) {
        if (s.x2 < camX - 20 || s.x1 > camX + G.W + 20) continue;
        ctx.strokeStyle = s.oneWay ? '#ff0' : s.mask === 1 ? '#f0f' : s.mask === 2 ? '#0ff' : '#f00';
        ctx.beginPath();
        ctx.moveTo(s.x1 - camX, s.y1 - camY);
        ctx.lineTo(s.x2 - camX, s.y2 - camY);
        ctx.stroke();
      }
    }
  }
  G.Terrain = Terrain;
})(window.G);
