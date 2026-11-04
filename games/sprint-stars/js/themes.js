'use strict';
// Themes: terrain painting, parallax backgrounds and scenery for each world.
(function (G) {
  const D = () => G.Draw;

  // ---------- generic terrain painter driven by a palette ----------
  function makeTile(pal) {
    const s = pal.tile || 32;
    const c = G.makeCanvas(s, s);
    const x = G.ctxOf(c);
    const h = s / 2;
    if (pal.tileFn) { pal.tileFn(x, s, pal); return c; }
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const col = (i + j) % 2 ? pal.check1 : pal.check2;
        x.fillStyle = col; x.fillRect(i * h, j * h, h, h);
        x.fillStyle = G.shade(col, 0.16); x.fillRect(i * h, j * h, h, 2); x.fillRect(i * h, j * h, 2, h);
        x.fillStyle = G.shade(col, -0.22); x.fillRect(i * h, j * h + h - 2, h, 2); x.fillRect(i * h + h - 2, j * h, 2, h);
        // speckles
        const r = G.rng(i * 7 + j * 13 + 3);
        for (let k = 0; k < 5; k++) {
          x.fillStyle = G.shade(col, r() < 0.5 ? -0.12 : 0.1);
          x.fillRect(i * h + 3 + Math.floor(r() * (h - 6)), j * h + 3 + Math.floor(r() * (h - 6)), 2, 1);
        }
      }
    return c;
  }

  function vertexNormals(pts, closed, segNormalFn) {
    // per-vertex averaged normals (outward for clockwise polygons)
    const n = pts.length / 2;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const ip = closed ? (i - 1 + n) % n : Math.max(0, i - 1);
      const inx = closed ? (i + 1) % n : Math.min(n - 1, i + 1);
      const a = segNormalFn(ip, i), b = segNormalFn(i, inx);
      let nx = a[0] + b[0], ny = a[1] + b[1];
      const l = Math.hypot(nx, ny) || 1;
      out[i] = [nx / l, ny / l];
    }
    return out;
  }

  function topRuns(pts, threshold) {
    // runs of edges whose outward normal faces up
    const n = pts.length / 2;
    const segN = (i, j) => {
      const dx = pts[j * 2] - pts[i * 2], dy = pts[j * 2 + 1] - pts[i * 2 + 1];
      const l = Math.hypot(dx, dy) || 1;
      return [dy / l, -dx / l];
    };
    const isTop = [];
    for (let i = 0; i < n; i++) isTop.push(segN(i, (i + 1) % n)[1] < threshold);
    const runs = [];
    // find a start index that's not top to avoid splitting a wrapped run
    let start = isTop.indexOf(false);
    if (start < 0) start = 0;
    let cur = null;
    for (let k = 0; k < n; k++) {
      const i = (start + k) % n;
      if (isTop[i]) {
        if (!cur) cur = [i];
        cur.push((i + 1) % n);
      } else if (cur) { runs.push(cur); cur = null; }
    }
    if (cur) runs.push(cur);
    return runs.map((idx) => {
      const p = [];
      for (const i of idx) p.push(pts[i * 2], pts[i * 2 + 1]);
      return p;
    });
  }

  // split a run into the pieces that overlap [x0, x1]
  function clipRun(run, x0, x1) {
    const pieces = [];
    let cur = null;
    const n = run.length / 2;
    for (let i = 0; i < n; i++) {
      const x = run[i * 2];
      const xp = i > 0 ? run[i * 2 - 2] : x, xn = i < n - 1 ? run[i * 2 + 2] : x;
      if (Math.max(x, xp, xn) >= x0 && Math.min(x, xp, xn) <= x1) {
        if (!cur) cur = [];
        cur.push(run[i * 2], run[i * 2 + 1]);
      } else if (cur) { if (cur.length >= 4) pieces.push(cur); cur = null; }
    }
    if (cur && cur.length >= 4) pieces.push(cur);
    return pieces;
  }

  function strokeOffset(ctx, p, normals, off, width, color) {
    ctx.beginPath();
    for (let i = 0; i < p.length / 2; i++) {
      const x = p[i * 2] - normals[i][0] * off, y = p[i * 2 + 1] - normals[i][1] * off;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function polyPath(ctx, pts) {
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
  }

  function paintTop(ctx, pal, run, R) {
    const n = run.length / 2;
    const segN = (i, j) => {
      const dx = run[j * 2] - run[i * 2], dy = run[j * 2 + 1] - run[i * 2 + 1];
      const l = Math.hypot(dx, dy) || 1;
      return [dy / l, -dx / l];
    };
    const N = vertexNormals(run, false, segN);
    strokeOffset(ctx, run, N, 10, 5, pal.soilDark);
    strokeOffset(ctx, run, N, 4, 9, pal.grass);
    strokeOffset(ctx, run, N, 7.6, 1.6, pal.grassDark);
    strokeOffset(ctx, run, N, 1.2, 2.4, pal.grassLight);
    if (!pal.blades) return;
    // blades / tufts along the surface
    let acc = 0;
    for (let i = 0; i < n - 1; i++) {
      const x1 = run[i * 2], y1 = run[i * 2 + 1], x2 = run[i * 2 + 2], y2 = run[i * 2 + 3];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const [nx, ny] = segN(i, i + 1);
      for (let d = (3 - acc) % 3; d < len; d += 3) {
        const x = x1 + ((x2 - x1) * d) / len, y = y1 + ((y2 - y1) * d) / len;
        if (x < R.x - 8 || x > R.x + R.w + 8) continue;
        const hsh = Math.abs(Math.sin(Math.floor(x) * 12.9898) * 43758.5453) % 1;
        const hgt = 2 + hsh * 3;
        ctx.fillStyle = hsh > 0.5 ? pal.grassLight : pal.grass;
        ctx.beginPath();
        ctx.moveTo(x - 1.5 * -ny, y - 1.5 * nx);
        ctx.lineTo(x + nx * hgt + (hsh - 0.5) * 2, y + ny * hgt);
        ctx.lineTo(x + 1.5 * -ny, y + 1.5 * nx);
        ctx.fill();
        if (pal.flowersInGrass && hsh > 0.93) {
          ctx.fillStyle = hsh > 0.965 ? '#ffffff' : '#ffe14a';
          ctx.fillRect(Math.round(x + nx * hgt) - 1, Math.round(y + ny * hgt) - 1, 2, 2);
        }
      }
      acc = (acc + len) % 3;
    }
  }

  function makePainter(pal) {
    let tile = null, holeTile = null;
    return function paintTerrain(ctx, R) {
      if (!tile) {
        tile = makeTile(pal);
        holeTile = G.makeCanvas(tile.width, tile.height);
        const hx = G.ctxOf(holeTile);
        hx.drawImage(tile, 0, 0);
        hx.fillStyle = pal.caveTint || 'rgba(10,0,30,0.55)';
        hx.fillRect(0, 0, holeTile.width, holeTile.height);
      }
      const pat = ctx.createPattern(tile, 'repeat');
      const holePat = ctx.createPattern(holeTile, 'repeat');
      // solids
      for (const p of R.solids) {
        ctx.beginPath(); polyPath(ctx, p.pts);
        ctx.fillStyle = pat; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = pal.edge; ctx.stroke();
      }
      const x0 = R.x - 24, x1 = R.x + R.w + 24;
      for (const p of R.solids) {
        if (p.style === 'plain') continue;
        if (!p._runs) p._runs = topRuns(p.pts, -0.3);
        for (const r of p._runs) for (const piece of clipRun(r, x0, x1)) paintTop(ctx, pal, piece, R);
      }
      // caves (clipped to solids)
      if (R.holes.length) {
        ctx.save();
        ctx.beginPath();
        for (const p of R.solids) polyPath(ctx, p.pts);
        ctx.clip();
        for (const h of R.holes) {
          ctx.beginPath(); polyPath(ctx, h.pts);
          ctx.fillStyle = holePat; ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = pal.edge; ctx.stroke();
        }
        // cave floors: hole edges facing up (reverse order => use bottom edges)
        for (const h of R.holes) {
          if (!h._runs) {
            const rev = [];
            for (let i = h.pts.length - 2; i >= 0; i -= 2) rev.push(h.pts[i], h.pts[i + 1]);
            h._runs = topRuns(rev, -0.3);
          }
          for (const r of h._runs) for (const piece of clipRun(r, x0, x1)) paintTop(ctx, pal.caveFloor || pal, piece, R);
        }
        ctx.restore();
      }
      // loops
      for (const L of R.loops) {
        const t = 15;
        ctx.beginPath();
        ctx.arc(L.cx, L.cy, L.r + t, 0, G.TAU);
        ctx.arc(L.cx, L.cy, L.r, 0, G.TAU, true);
        ctx.fillStyle = pat; ctx.fill('evenodd');
        ctx.lineWidth = 2; ctx.strokeStyle = pal.edge;
        ctx.beginPath(); ctx.arc(L.cx, L.cy, L.r + t, 0, G.TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(L.cx, L.cy, L.r + 2.5, 0, G.TAU);
        ctx.lineWidth = 5; ctx.strokeStyle = pal.loopTrack || pal.grass; ctx.stroke();
        ctx.beginPath(); ctx.arc(L.cx, L.cy, L.r + 0.8, 0, G.TAU);
        ctx.lineWidth = 1.6; ctx.strokeStyle = pal.loopTrackLight || pal.grassLight; ctx.stroke();
        ctx.beginPath(); ctx.arc(L.cx, L.cy, L.r + 5.5, 0, G.TAU);
        ctx.lineWidth = 1.2; ctx.strokeStyle = pal.edge; ctx.stroke();
      }
    };
  }

  // ---------- background helpers ----------
  function tileLayer(w, h, fn) {
    const c = G.makeCanvas(w, h);
    const x = G.ctxOf(c);
    // draw three times for seamless wrap
    for (const ox of [-w, 0, w]) { x.save(); x.translate(ox, 0); fn(x, w, h); x.restore(); }
    return c;
  }
  function drawTiled(ctx, img, x, y, W) {
    const w = img.width;
    let sx = -(((x % w) + w) % w);
    for (; sx < W; sx += w) ctx.drawImage(img, Math.round(sx), Math.round(y));
  }
  function bandSky(ctx, W, H, y0, stops) {
    // stops: [[y, color],...] drawn as solid 16-bit style bands
    for (let i = 0; i < stops.length; i++) {
      const y = stops[i][0] + y0;
      const yn = i + 1 < stops.length ? stops[i + 1][0] + y0 : H + 400;
      ctx.fillStyle = stops[i][1];
      ctx.fillRect(0, Math.floor(y), W, Math.ceil(yn - y) + 1);
    }
  }
  function cloud(x, cx, cy, s, light, mid, dark) {
    const blobs = [[0, 0, 1], [-0.9, 0.25, 0.7], [0.9, 0.2, 0.75], [-0.4, -0.35, 0.65], [0.45, -0.4, 0.6], [1.6, 0.4, 0.5], [-1.6, 0.4, 0.45]];
    for (const [bx, by, r] of blobs) { x.fillStyle = dark; x.beginPath(); x.arc(cx + bx * s, cy + by * s + 2, r * s, 0, G.TAU); x.fill(); }
    for (const [bx, by, r] of blobs) { x.fillStyle = mid; x.beginPath(); x.arc(cx + bx * s, cy + by * s, r * s, 0, G.TAU); x.fill(); }
    for (const [bx, by, r] of blobs) { x.fillStyle = light; x.beginPath(); x.arc(cx + bx * s - r * s * 0.2, cy + by * s - r * s * 0.25, r * s * 0.7, 0, G.TAU); x.fill(); }
    x.fillStyle = dark; x.fillRect(cx - 2 * s, cy + 0.75 * s, 4 * s, 2);
  }
  function crispen(canvas) { return G.pixelize(canvas, null, 128); }
  function ridge(x, w, h, base, amp, seed, freq, col, edge) {
    const r = G.rng(seed);
    const ph = [r() * 6, r() * 6, r() * 6];
    x.beginPath();
    x.moveTo(0, h);
    for (let i = 0; i <= w; i += 2) {
      const t = (i / w) * G.TAU;
      const y = base - amp * (0.55 * Math.sin(t * freq + ph[0]) + 0.3 * Math.sin(t * freq * 2 + ph[1]) + 0.15 * Math.sin(t * freq * 5 + ph[2]));
      x.lineTo(i, y);
    }
    x.lineTo(w, h);
    x.closePath();
    x.fillStyle = col; x.fill();
    if (edge) { x.strokeStyle = edge; x.lineWidth = 2; x.stroke(); }
  }

  // ---------- Emerald Meadow ----------
  const MEADOW = {
    id: 'meadow', name: 'EMERALD MEADOW', music: 'meadow',
    pal: {
      check1: '#c06a26', check2: '#8e4518', edge: '#3c1806', soilDark: '#5a2a0c',
      grass: '#2aa83a', grassDark: '#16692a', grassLight: '#7ee35a', blades: true, flowersInGrass: true,
      loopTrack: '#e09a48', loopTrackLight: '#ffd27a', caveTint: 'rgba(20,4,20,0.6)',
      caveFloor: { soilDark: '#3a1a08', grass: '#7a4a24', grassDark: '#4a2a10', grassLight: '#a8703a', blades: false },
    },
    makeBG() {
      const L = {};
      L.clouds = crispen(tileLayer(512, 90, (x, w, h) => {
        const r = G.rng(11);
        for (let i = 0; i < 7; i++) cloud(x, r() * w, 20 + r() * 50, 7 + r() * 9, '#ffffff', '#dff1ff', '#9fcbf0');
      }));
      L.clouds2 = crispen(tileLayer(512, 60, (x, w, h) => {
        const r = G.rng(5);
        for (let i = 0; i < 9; i++) cloud(x, r() * w, 18 + r() * 30, 4 + r() * 5, '#f4fbff', '#cfe8ff', '#a6d0f2');
      }));
      L.mountains = crispen(tileLayer(512, 120, (x, w, h) => {
        ridge(x, w, h, 60, 40, 3, 3, '#6f8fd6', '#4c69b0');
        // snow caps / highlights
        ridge(x, w, h, 82, 30, 9, 4, '#5b7cc4');
      }));
      L.hills = crispen(tileLayer(1024, 140, (x, w, h) => {
        ridge(x, w, h, 70, 26, 21, 4, '#3aa65a', '#1c6b34');
        // stripes on hills
        x.save();
        x.globalCompositeOperation = 'source-atop';
        for (let y = 0; y < h; y += 10) { x.fillStyle = y % 20 ? '#2f9a4e' : '#46b866'; x.fillRect(0, y, w, 5); }
        x.restore();
        // background cliffs with waterfalls
        const r = G.rng(77);
        for (let i = 0; i < 4; i++) {
          const cx = 80 + i * 250 + r() * 60, top = 52 + r() * 18, cw = 70 + r() * 30;
          x.fillStyle = '#a85a22'; x.fillRect(cx, top, cw, h - top);
          for (let yy = top; yy < h; yy += 12) for (let xx = cx; xx < cx + cw; xx += 12) {
            x.fillStyle = ((xx - cx) / 12 + (yy - top) / 12) % 2 < 1 ? '#a85a22' : '#7e3e14';
            x.fillRect(xx, yy, 12, 12);
          }
          x.fillStyle = '#2aa83a'; x.fillRect(cx - 3, top - 4, cw + 6, 7);
          x.fillStyle = '#7ee35a'; x.fillRect(cx - 3, top - 4, cw + 6, 2);
          x.strokeStyle = '#3c1806'; x.lineWidth = 2; x.strokeRect(cx, top, cw, h - top);
          // waterfall slot
          x.fillStyle = '#6fc8ff'; x.fillRect(cx + cw * 0.35, top + 3, 14, h - top);
          x.fillStyle = '#c9f0ff'; x.fillRect(cx + cw * 0.35 + 2, top + 3, 3, h - top);
          // palm silhouettes
          for (let k = 0; k < 2; k++) {
            const px = cx + 10 + k * (cw - 20), py = top - 2;
            x.strokeStyle = '#1c6b34'; x.lineWidth = 3;
            x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 4, py - 14, px + 2, py - 26); x.stroke();
            x.fillStyle = '#1f8a3e';
            for (let f = 0; f < 5; f++) { x.beginPath(); x.ellipse(px + 2 + Math.cos(f * 1.3) * 8, py - 26 + Math.sin(f * 1.3) * 3, 9, 3, f * 1.3, 0, G.TAU); x.fill(); }
          }
        }
      }));
      // lake rows rendered with line scroll
      L.water = crispen(tileLayer(256, 64, (x, w, h) => {
        x.fillStyle = '#3d8be0'; x.fillRect(0, 0, w, h);
        const r = G.rng(4);
        for (let y = 0; y < h; y += 2) {
          for (let i = 0; i < 6; i++) {
            const wx = r() * w, ww = 6 + r() * 18;
            x.fillStyle = y < 8 ? '#d8f4ff' : r() < 0.5 ? '#7cc4ff' : '#2a6ec4';
            x.fillRect(wx, y, ww, 1);
          }
        }
      }));
      return L;
    },
    renderBG(ctx, L, camX, camY, W, H, t, lvl) {
      const vy = G.clamp((camY - (lvl.bgY || 800)) * 0.05, -40, 60);
      const horizon = 150 - vy;
      bandSky(ctx, W, H, horizon - 150, [[0, '#1f5ad0'], [24, '#2a6ee0'], [44, '#3a82ea'], [62, '#4f98f2'], [78, '#68aef6'], [92, '#86c4fa'], [104, '#a6d8fc'], [114, '#c8eaff']]);
      drawTiled(ctx, L.clouds2, camX * 0.03 + t * 0.08, horizon - 140, W);
      drawTiled(ctx, L.clouds, camX * 0.06 + t * 0.15, horizon - 110, W);
      drawTiled(ctx, L.mountains, camX * 0.1, horizon - 92, W);
      drawTiled(ctx, L.hills, camX * 0.22, horizon - 70, W);
      // lake with line scroll (each row moves faster the nearer it is)
      const wy = horizon + 62;
      for (let r = 0; r < 64; r++) {
        const f = 0.3 + (r / 64) * 0.35;
        const ox = camX * f + Math.sin(t * 0.03 + r * 0.6) * (r < 8 ? 0 : 2);
        const w = L.water.width;
        let sx = -(((ox % w) + w) % w);
        for (; sx < W; sx += w) ctx.drawImage(L.water, 0, r, w, 1, Math.round(sx), wy + r, w, 1);
      }
      ctx.fillStyle = '#2a6ec4';
      ctx.fillRect(0, wy + 64, W, H);
    },
  };

  // ---------- scenery sprites (shared, theme-coloured) ----------
  const decoCache = {};
  function deco(key, w, h, fn, outline = '#102010') {
    if (decoCache[key]) return decoCache[key];
    return (decoCache[key] = G.renderPixel(w, h, fn, outline));
  }
  G.Deco = {
    palm(f) {
      return deco('palm' + f, 64, 96, (c) => {
        const H = D();
        const sway = f ? 1.5 : 0;
        // trunk segments
        for (let i = 0; i < 9; i++) {
          const t = i / 9;
          const x = 30 + Math.sin(t * 2.2) * 7 + t * sway, y = 92 - i * 7.4;
          H.ell(c, x, y, 4.2 - t, 4.2, 0.2, i % 2 ? '#a0642a' : '#c27c38', '#5a3010', 0.8);
          H.ell(c, x + 1, y - 1, 1.5, 1.2, 0, '#e0a060');
        }
        const tx = 36 + sway, ty = 26;
        // coconuts
        H.ell(c, tx - 3, ty + 4, 3, 3, 0, '#7a4a1a', '#3a2008', 0.8);
        H.ell(c, tx + 3, ty + 5, 3, 3, 0, '#8a5a24', '#3a2008', 0.8);
        // fronds
        const fr = [[-2.6, 24], [-2.0, 26], [-1.2, 22], [-0.5, 20], [0.3, 22], [0.9, 25], [-3.1, 18]];
        for (const [a, l] of fr) {
          const aa = a + sway * 0.03;
          const ex = tx + Math.cos(aa) * l, ey = ty + Math.sin(aa) * l * 0.55 + 6;
          const mx = tx + Math.cos(aa) * l * 0.5, my = ty + Math.sin(aa) * l * 0.4 - 6;
          c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(mx, my, ex, ey);
          c.quadraticCurveTo(mx, my + 5, tx, ty + 2);
          c.fillStyle = '#2aa83a'; c.fill(); c.strokeStyle = '#155a22'; c.lineWidth = 0.9; c.stroke();
          c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(mx, my + 1, ex, ey);
          c.strokeStyle = '#8ef06a'; c.lineWidth = 0.8; c.stroke();
        }
      });
    },
    sunflower(f) {
      return deco('sunf' + f, 24, 48, (c) => {
        const H = D();
        H.line(c, 12, 46, 12, 18, '#2a8a2a', 2.2);
        H.ell(c, 8, 34, 4, 1.8, -0.5, '#3ab84a', '#155a22', 0.7);
        H.ell(c, 16, 28, 4, 1.8, 0.5, '#3ab84a', '#155a22', 0.7);
        const rot = (f * Math.PI) / 8;
        for (let i = 0; i < 8; i++) {
          const a = rot + (i * G.TAU) / 8;
          H.ell(c, 12 + Math.cos(a) * 5.5, 13 + Math.sin(a) * 5.5, 3.4, 1.8, a, i % 2 ? '#ffd21a' : '#ffb800', '#9a5a00', 0.6);
        }
        H.ell(c, 12, 13, 3.8, 3.8, 0, '#8a3a10', '#4a1a00', 0.7);
        H.ell(c, 11, 12, 1.2, 1.2, 0, '#c86a2a');
      });
    },
    flowers(f, hue = 0) {
      return deco('flw' + f + hue, 32, 20, (c) => {
        const H = D();
        const cols = [['#ff5aa0', '#ffffff'], ['#a070ff', '#ffe060'], ['#ff7a3a', '#ffffff']][hue % 3];
        for (let i = 0; i < 3; i++) {
          const x = 6 + i * 10, h = 8 + (i % 2) * 4, y = 19 - h + (f && i % 2 ? 1 : 0);
          H.line(c, x, 19, x, y + 2, '#2a8a2a', 1.4);
          for (let k = 0; k < 5; k++) { const a = (k * G.TAU) / 5 + f * 0.3; H.ell(c, x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.7, 1.7, 0, cols[0]); }
          H.ell(c, x, y, 1.2, 1.2, 0, cols[1]);
        }
      });
    },
    bush(f) {
      return deco('bush' + f, 56, 28, (c) => {
        const H = D();
        const b = [[12, 18, 10], [26, 13, 13], [42, 18, 10], [34, 20, 9], [19, 21, 8]];
        for (const [x, y, r] of b) H.ell(c, x, y + (f ? 0.5 : 0), r, r * 0.85, 0, '#1f7a32');
        for (const [x, y, r] of b) H.ell(c, x - 1, y - 2, r * 0.8, r * 0.65, 0, '#2fae46');
        for (const [x, y, r] of b) H.ell(c, x - 3, y - 5, r * 0.35, r * 0.25, 0, '#86ea6a');
        H.ell(c, 20, 14, 1.4, 1.4, 0, '#ff5a8a'); H.ell(c, 36, 16, 1.4, 1.4, 0, '#ffe04a');
      });
    },
    rock() {
      return deco('rock', 32, 20, (c) => {
        const H = D();
        H.path(c, [3, 19, 6, 8, 14, 3, 24, 5, 30, 12, 29, 19], '#8a8a9a', null);
        H.path(c, [7, 9, 14, 4, 23, 6, 18, 10], '#c0c0d0');
        H.path(c, [3, 19, 29, 19, 30, 15, 4, 16], '#5a5a6a');
      }, '#202030');
    },
    sign(id) {
      return deco('sign' + id, 32, 40, (c) => {
        const H = D();
        H.line(c, 16, 39, 16, 18, '#7a4a20', 3);
        H.path(c, [3, 4, 27, 4, 31, 11, 27, 18, 3, 18], '#e8c070', '#5a3010', 1);
        H.path(c, [9, 11, 20, 11, 20, 8, 25, 12, 20, 16, 20, 13, 9, 13], '#c0402a');
      });
    },
  };

  // waterfall rendered live (animated)
  G.drawWaterfall = function (ctx, x, y, w, h, t) {
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = '#4aa8f0';
    ctx.fillRect(x, y, w, h);
    for (let i = 0; i < w; i += 3) {
      const ph = (i * 37) % 23;
      ctx.fillStyle = i % 2 ? '#8fd4ff' : '#d8f6ff';
      for (let yy = ((t * 4 + ph * 5) % 24) - 24; yy < h; yy += 24) {
        const y0 = Math.max(0, yy), y1 = Math.min(h, yy + 10 + (ph % 6));
        if (y1 > y0) ctx.fillRect(x + i, y + y0, 1 + (ph % 2), y1 - y0);
      }
    }
    ctx.fillStyle = '#2a78d0';
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    // foam at the base
    for (let i = -4; i < w + 4; i += 4) {
      const r = 3 + Math.sin(t * 0.3 + i) * 1.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x + i + 2, y + h - 2, r, 0, G.TAU); ctx.fill();
    }
  };

  G.Themes = { meadow: MEADOW };
  G.makePainter = makePainter;
  G.BGUtil = { tileLayer, drawTiled, bandSky, cloud, crispen, ridge };
  G.registerTheme = function (t) {
    G.Themes[t.id] = t;
  };
  G.initTheme = function (t) {
    if (!t.paintTerrain) t.paintTerrain = makePainter(t.pal);
    if (!t.layers) t.layers = t.makeBG();
    return t;
  };
})(window.G);
