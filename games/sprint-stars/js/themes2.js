'use strict';
// Themes for worlds 2-5: Crystal Caverns, Sunset Speedway, Frostfall Peaks, Mechanical Fortress.
(function (G) {
  const { tileLayer, drawTiled, bandSky, cloud, crispen, ridge } = G.BGUtil;
  const D = () => G.Draw;
  const cache = {};
  const spr = (key, w, h, fn, outline = '#101018') => cache[key] || (cache[key] = G.renderPixel(w, h, fn, outline));

  function crystal(c, x, y, h, w, col, lean = 0) {
    const d = D();
    d.path(c, [x - w, y, x - w * 0.7 + lean, y - h * 0.8, x + lean, y - h, x + w * 0.7 + lean, y - h * 0.8, x + w, y], col);
    d.path(c, [x + lean * 0.3, y, x + lean, y - h, x + w * 0.7 + lean, y - h * 0.8, x + w, y], G.shade(col, -0.25));
    d.line(c, x - w * 0.4, y - 2, x - w * 0.3 + lean * 0.7, y - h * 0.75, G.shade(col, 0.6), 0.8);
  }

  // ================= Crystal Caverns =================
  G.registerTheme({
    id: 'caverns', name: 'CRYSTAL CAVERNS', music: 'caverns',
    pal: {
      check1: '#5a3a8e', check2: '#3c2668', edge: '#140a2a', soilDark: '#241040',
      grass: '#3ec8c0', grassDark: '#1a6a78', grassLight: '#a8fff0', blades: false,
      loopTrack: '#8a5ae8', loopTrackLight: '#d8b8ff', caveTint: 'rgba(0,0,20,0.6)',
      tileFn(x, s, pal) {
        const h = s / 2;
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
          const col = (i + j) % 2 ? pal.check1 : pal.check2;
          x.fillStyle = col; x.fillRect(i * h, j * h, h, h);
          x.fillStyle = G.shade(col, -0.25); x.fillRect(i * h, j * h + h - 2, h, 2);
          x.fillStyle = G.shade(col, 0.12); x.fillRect(i * h, j * h, h, 1);
        }
        x.fillStyle = '#7ae8ff'; x.fillRect(6, 9, 2, 2); x.fillRect(22, 25, 2, 2);
        x.fillStyle = '#ff8ad8'; x.fillRect(25, 6, 1, 1); x.fillRect(9, 23, 1, 1);
      },
    },
    makeBG() {
      const L = {};
      L.far = crispen(tileLayer(512, 200, (x, w, h) => {
        // cave wall columns
        const r = G.rng(31);
        for (let i = 0; i < 9; i++) {
          const cx = r() * w, cw = 30 + r() * 50;
          x.fillStyle = '#1e1240'; x.fillRect(cx, 0, cw, h);
          x.fillStyle = '#2a1a58'; x.fillRect(cx + 4, 0, cw * 0.3, h);
        }
        for (let i = 0; i < 18; i++) { const cx = r() * w; x.fillStyle = '#2a1a58'; x.beginPath(); x.moveTo(cx - 12, 0); x.lineTo(cx, 30 + r() * 50); x.lineTo(cx + 12, 0); x.fill(); }
      }));
      L.mid = crispen(tileLayer(512, 140, (x, w, h) => {
        const r = G.rng(7);
        ridge(x, w, h, 90, 30, 13, 3, '#2a1a5a', '#140a30');
        for (let i = 0; i < 14; i++) {
          const cx = r() * w, by = 100 + r() * 30;
          const cols = ['#5ae8ff', '#ff6ad8', '#9a7aff', '#6affb0'];
          crystal(x, cx, by, 20 + r() * 34, 5 + r() * 6, cols[i % 4], (r() - 0.5) * 8);
        }
        // stalactites
        for (let i = 0; i < 12; i++) { const cx = r() * w; x.fillStyle = '#3a2a70'; x.beginPath(); x.moveTo(cx - 8, 0); x.lineTo(cx, 20 + r() * 40); x.lineTo(cx + 8, 0); x.fill(); }
      }));
      L.pool = crispen(tileLayer(256, 40, (x, w, h) => {
        x.fillStyle = '#1a6a8a'; x.fillRect(0, 0, w, h);
        const r = G.rng(9);
        for (let y = 0; y < h; y += 2) for (let i = 0; i < 5; i++) { x.fillStyle = y < 6 ? '#8affff' : r() < 0.5 ? '#3ac8e8' : '#0e4a6a'; x.fillRect(r() * w, y, 6 + r() * 14, 1); }
      }));
      return L;
    },
    renderBG(ctx, L, camX, camY, W, H, t, lvl) {
      const vy = G.clamp((camY - (lvl.bgY || 800)) * 0.05, -40, 60);
      bandSky(ctx, W, H, -vy, [[0, '#0a0620'], [40, '#120a30'], [80, '#1a0e40'], [120, '#22124e'], [160, '#2a165c']]);
      drawTiled(ctx, L.far, camX * 0.08, -20 - vy, W);
      // glowing motes
      for (let i = 0; i < 24; i++) {
        const x = ((i * 97 - camX * 0.15 + t * 0.2) % (W + 20) + W + 20) % (W + 20) - 10;
        const y = (i * 53 + Math.sin(t * 0.02 + i) * 10) % H;
        ctx.fillStyle = i % 3 ? '#7ae8ff' : '#ff8ad8';
        ctx.globalAlpha = 0.5 + Math.sin(t * 0.1 + i) * 0.4;
        ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      }
      ctx.globalAlpha = 1;
      drawTiled(ctx, L.mid, camX * 0.2, 70 - vy, W);
      const py = 206 - vy;
      for (let r = 0; r < 40; r++) {
        const ox = camX * (0.3 + r * 0.006) + Math.sin(t * 0.04 + r) * 1.5;
        const w = L.pool.width;
        let sx = -(((ox % w) + w) % w);
        for (; sx < W; sx += w) ctx.drawImage(L.pool, 0, r, w, 1, Math.round(sx), py + r, w, 1);
      }
      ctx.fillStyle = '#0e4a6a'; ctx.fillRect(0, py + 40, W, H);
    },
    deco(type, t) {
      if (type === 'crystal') return spr('dcry', 32, 40, (c) => { crystal(c, 10, 40, 30, 6, '#5ae8ff', -2); crystal(c, 20, 40, 38, 7, '#9a7aff', 2); crystal(c, 27, 40, 18, 4, '#ff6ad8', 3); }, '#100830');
      if (type === 'crystalPink') return spr('dcryp', 24, 32, (c) => { crystal(c, 12, 32, 30, 7, '#ff6ad8', 1); crystal(c, 5, 32, 14, 4, '#ffb0f0', -2); }, '#100830');
      if (type === 'mushroom') return spr('dmush' + ((t >> 4) % 2), 24, 24, (c) => { const d = D(); d.line(c, 12, 24, 12, 12, '#e8e0ff', 3); d.ell(c, 12, 11, 10, 6 + ((t >> 4) % 2) * 0.5, 0, '#4ad8c8'); d.ell(c, 8, 9, 2, 1.5, 0, '#c8fff8'); d.ell(c, 15, 10, 1.5, 1.2, 0, '#c8fff8'); }, '#100830');
      if (type === 'lantern') return spr('dlan' + ((t >> 3) % 2), 16, 40, (c) => { const d = D(); d.line(c, 8, 40, 8, 10, '#5a3a20', 2); d.path(c, [3, 4, 13, 4, 12, 14, 4, 14], (t >> 3) % 2 ? '#ffe24a' : '#ffc21a', '#3a2008', 1); }, '#100818');
      return null;
    },
  });

  // ================= Sunset Speedway =================
  G.registerTheme({
    id: 'sunset', name: 'SUNSET SPEEDWAY', music: 'sunset',
    pal: {
      check1: '#e0843a', check2: '#b85a26', edge: '#4a1a08', soilDark: '#6a2a10',
      grass: '#e8b83a', grassDark: '#a8701a', grassLight: '#fff07a', blades: true,
      loopTrack: '#ff5a5a', loopTrackLight: '#ffd0a0', caveTint: 'rgba(40,0,20,0.55)',
      tileFn(x, s, pal) {
        // sandstone strata
        for (let y = 0; y < s; y++) {
          const band = Math.floor(y / 8) % 2;
          x.fillStyle = band ? pal.check1 : pal.check2;
          x.fillRect(0, y, s, 1);
        }
        x.fillStyle = G.shade(pal.check1, 0.2); x.fillRect(0, 0, s, 1); x.fillRect(0, 16, s, 1);
        x.fillStyle = G.shade(pal.check2, -0.25); x.fillRect(4, 12, 6, 1); x.fillRect(18, 28, 8, 1); x.fillRect(22, 5, 4, 1);
      },
    },
    makeBG() {
      const L = {};
      L.clouds = crispen(tileLayer(512, 80, (x, w) => { const r = G.rng(12); for (let i = 0; i < 6; i++) cloud(x, r() * w, 20 + r() * 40, 6 + r() * 8, '#ffd8b0', '#ffa0a0', '#c86a9a'); }));
      L.mesas = crispen(tileLayer(512, 110, (x, w, h) => {
        const r = G.rng(44);
        for (let i = 0; i < 6; i++) {
          const cx = r() * w, mw = 50 + r() * 80, top = 20 + r() * 50;
          x.fillStyle = '#7a2a4a'; x.fillRect(cx, top, mw, h - top);
          x.fillStyle = '#9a3a5a'; x.fillRect(cx, top, mw, 4);
          x.fillStyle = '#5a1a3a'; x.fillRect(cx + mw * 0.7, top + 4, mw * 0.3, h - top);
        }
      }));
      L.road = crispen(tileLayer(512, 60, (x, w, h) => {
        // elevated highway silhouette
        x.fillStyle = '#4a1a3a'; x.fillRect(0, 10, w, 8);
        x.fillStyle = '#ff9a5a'; x.fillRect(0, 10, w, 1);
        for (let i = 0; i < w; i += 64) { x.fillStyle = '#4a1a3a'; x.fillRect(i + 20, 18, 10, h); }
        for (let i = 0; i < w; i += 16) { x.fillStyle = '#ffd23a'; x.fillRect(i, 13, 6, 1); }
      }));
      L.dunes = crispen(tileLayer(512, 80, (x, w, h) => { ridge(x, w, h, 40, 16, 5, 3, '#c85a3a', '#8a3020'); ridge(x, w, h, 56, 10, 8, 5, '#a8442a'); }));
      return L;
    },
    renderBG(ctx, L, camX, camY, W, H, t, lvl) {
      const vy = G.clamp((camY - (lvl.bgY || 800)) * 0.05, -40, 60);
      const hz = 150 - vy;
      bandSky(ctx, W, H, hz - 150, [[0, '#3a1a6a'], [20, '#5a2278'], [40, '#8a2a7a'], [60, '#c0387a'], [78, '#e8566a'], [94, '#ff7a5a'], [108, '#ffa04a'], [120, '#ffc85a'], [130, '#ffe08a']]);
      // sun
      ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(W * 0.7, hz - 30, 34, 0, G.TAU); ctx.fill();
      ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(W * 0.7, hz - 30, 26, 0, G.TAU); ctx.fill();
      for (let i = 0; i < 4; i++) { ctx.fillStyle = '#ff9a6a'; ctx.fillRect(W * 0.7 - 40, hz - 30 + i * 7, 80, 2); }
      drawTiled(ctx, L.clouds, camX * 0.04 + t * 0.1, hz - 130, W);
      drawTiled(ctx, L.mesas, camX * 0.1, hz - 90, W);
      drawTiled(ctx, L.road, camX * 0.2, hz - 10, W);
      drawTiled(ctx, L.dunes, camX * 0.3, hz + 10, W);
      ctx.fillStyle = '#8a3020'; ctx.fillRect(0, hz + 90, W, H);
    },
    deco(type, t) {
      if (type === 'cactus') return spr('dcac', 28, 44, (c) => {
        const d = D();
        d.line(c, 14, 44, 14, 6, '#2a8a4a', 7); d.line(c, 14, 40, 14, 8, '#4ab86a', 3);
        d.line(c, 14, 26, 5, 26, '#2a8a4a', 5); d.line(c, 5, 26, 5, 14, '#2a8a4a', 5);
        d.line(c, 14, 20, 23, 20, '#2a8a4a', 5); d.line(c, 23, 20, 23, 10, '#2a8a4a', 5);
        d.ell(c, 14, 5, 2.5, 2, 0, '#ff6aa0');
      }, '#0e3a1a');
      if (type === 'rockArch') return spr('darch', 64, 48, (c) => {
        const d = D();
        c.beginPath(); c.moveTo(2, 48); c.lineTo(6, 8); c.quadraticCurveTo(32, -4, 58, 8); c.lineTo(62, 48); c.lineTo(48, 48); c.quadraticCurveTo(46, 22, 32, 22); c.quadraticCurveTo(18, 22, 16, 48); c.closePath();
        c.fillStyle = '#c0602a'; c.fill();
        d.path(c, [6, 10, 58, 10, 58, 14, 6, 14], '#e0843a');
      }, '#4a1a08');
      if (type === 'signArrow') return spr('dsarr', 32, 40, (c) => { const d = D(); d.line(c, 16, 40, 16, 18, '#5a5a6a', 3); d.path(c, [2, 4, 24, 4, 31, 11, 24, 18, 2, 18], '#ffd23a', '#5a3000', 1); d.path(c, [8, 9, 18, 9, 18, 6, 23, 11, 18, 16, 18, 13, 8, 13], '#e8402a'); });
      if (type === 'palm') return G.Deco.palm((t >> 5) % 2);
      return null;
    },
  });

  // ================= Frostfall Peaks =================
  G.registerTheme({
    id: 'frost', name: 'FROSTFALL PEAKS', music: 'frost',
    pal: {
      check1: '#a8d0f0', check2: '#7aaedc', edge: '#1a3a6a', soilDark: '#5a8ac0',
      grass: '#f4fbff', grassDark: '#b8d8f0', grassLight: '#ffffff', blades: false,
      loopTrack: '#5ac8ff', loopTrackLight: '#e8f8ff', caveTint: 'rgba(0,20,60,0.5)',
      tileFn(x, s, pal) {
        const h = s / 2;
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
          const col = (i + j) % 2 ? pal.check1 : pal.check2;
          x.fillStyle = col; x.fillRect(i * h, j * h, h, h);
          x.fillStyle = G.shade(col, 0.35); x.fillRect(i * h + 2, j * h + 2, 4, 1); x.fillRect(i * h + 2, j * h + 2, 1, 4);
          x.fillStyle = G.shade(col, -0.18); x.fillRect(i * h, j * h + h - 1, h, 1); x.fillRect(i * h + h - 1, j * h, 1, h);
        }
      },
    },
    makeBG() {
      const L = {};
      L.peaks = crispen(tileLayer(512, 130, (x, w, h) => {
        const r = G.rng(3);
        for (let i = 0; i < 7; i++) {
          const cx = r() * w, ph = 60 + r() * 60, pw = 60 + r() * 50;
          x.fillStyle = '#7a9ad8'; x.beginPath(); x.moveTo(cx - pw, h); x.lineTo(cx, h - ph); x.lineTo(cx + pw, h); x.fill();
          x.fillStyle = '#5a7ac0'; x.beginPath(); x.moveTo(cx, h - ph); x.lineTo(cx + pw, h); x.lineTo(cx + pw * 0.3, h); x.fill();
          x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(cx - pw * 0.3, h - ph * 0.7); x.lineTo(cx, h - ph); x.lineTo(cx + pw * 0.3, h - ph * 0.7); x.lineTo(cx + pw * 0.1, h - ph * 0.62); x.lineTo(cx - pw * 0.1, h - ph * 0.72); x.fill();
        }
      }));
      L.pines = crispen(tileLayer(512, 80, (x, w, h) => {
        ridge(x, w, h, 50, 12, 17, 3, '#e8f4ff', '#a8c8e8');
        const r = G.rng(23);
        for (let i = 0; i < 30; i++) {
          const cx = r() * w, ph = 20 + r() * 24, by = 56 + r() * 10;
          x.fillStyle = '#1e5a6a';
          for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(cx - (8 - k * 2), by - k * ph * 0.28); x.lineTo(cx, by - ph + k * 2 - k * ph * 0.1); x.lineTo(cx + (8 - k * 2), by - k * ph * 0.28); x.fill(); }
          x.fillStyle = '#ffffff'; x.fillRect(cx - 2, by - ph + 6, 4, 1);
        }
      }));
      L.clouds = crispen(tileLayer(512, 60, (x, w) => { const r = G.rng(8); for (let i = 0; i < 6; i++) cloud(x, r() * w, 20 + r() * 30, 5 + r() * 7, '#ffffff', '#e0ecff', '#b8c8e8'); }));
      return L;
    },
    renderBG(ctx, L, camX, camY, W, H, t, lvl) {
      const vy = G.clamp((camY - (lvl.bgY || 800)) * 0.05, -40, 60);
      const hz = 150 - vy;
      bandSky(ctx, W, H, hz - 150, [[0, '#3a6ac8'], [30, '#4a7ed4'], [56, '#6294e0'], [80, '#7eaae8'], [100, '#9cc0f0'], [118, '#bcd6f6'], [130, '#dce8fa']]);
      drawTiled(ctx, L.clouds, camX * 0.04 + t * 0.1, hz - 140, W);
      drawTiled(ctx, L.peaks, camX * 0.1, hz - 100, W);
      drawTiled(ctx, L.pines, camX * 0.25, hz + 10, W);
      ctx.fillStyle = '#e8f4ff'; ctx.fillRect(0, hz + 88, W, H);
      // snowfall
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const x = (((i * 71 + t * (0.3 + (i % 3) * 0.2) - camX * 0.5) % (W + 10)) + W + 10) % (W + 10);
        const y = (((i * 37 + t * (0.6 + (i % 4) * 0.25) - camY * 0.3) % (H + 10)) + H + 10) % (H + 10);
        ctx.fillRect(Math.round(x + Math.sin(t * 0.03 + i) * 3), Math.round(y), i % 5 ? 1 : 2, i % 5 ? 1 : 2);
      }
    },
    deco(type, t) {
      if (type === 'pine') return spr('dpine', 40, 64, (c) => {
        const d = D();
        d.line(c, 20, 64, 20, 50, '#5a3a20', 4);
        for (let k = 0; k < 4; k++) {
          const y = 54 - k * 12, w = 18 - k * 3.5;
          d.path(c, [20 - w, y, 20, y - 18, 20 + w, y], '#1e6a5a');
          d.path(c, [20 - w, y, 20 - w * 0.4, y - 3, 20, y - 1, 20 + w * 0.5, y - 3, 20 + w, y], '#ffffff');
        }
      }, '#0a2a2a');
      if (type === 'snowman') return spr('dsnow', 28, 40, (c) => {
        const d = D();
        d.ell(c, 14, 31, 10, 9, 0, '#ffffff'); d.ell(c, 14, 15, 7, 7, 0, '#ffffff');
        d.ell(c, 12, 13, 1, 1, 0, '#1a1020'); d.ell(c, 17, 13, 1, 1, 0, '#1a1020');
        d.path(c, [14, 15, 22, 16, 14, 17], '#ff8a1a');
        d.path(c, [7, 9, 21, 9, 19, 2, 9, 2], '#2a2a3a');
        d.line(c, 8, 21, 20, 21, '#e8402a', 2.4);
      }, '#3a4a6a');
      if (type === 'iceFall') {
        const f = (t >> 3) % 3;
        return spr('dice' + f, 32, 96, (c) => {
          const d = D();
          d.path(c, [4, 0, 28, 0, 30, 96, 2, 96], '#8ad8ff');
          for (let i = 0; i < 6; i++) d.line(c, 6 + i * 4, ((f * 8 + i * 13) % 30), 6 + i * 4, 96, i % 2 ? '#c8f0ff' : '#5ab8f0', 1.4);
          d.path(c, [0, 86, 32, 86, 32, 96, 0, 96], '#e8f8ff');
        }, '#2a5a9a');
      }
      return null;
    },
  });

  // ================= Mechanical Fortress =================
  G.registerTheme({
    id: 'fortress', name: 'MECHANICAL FORTRESS', music: 'fortress',
    pal: {
      check1: '#6a6a80', check2: '#4e4e62', edge: '#14141e', soilDark: '#2a2a38',
      grass: '#c8c8d8', grassDark: '#7a7a8a', grassLight: '#ffffff', blades: false,
      loopTrack: '#ffd23a', loopTrackLight: '#fff6a0', caveTint: 'rgba(10,0,0,0.5)',
      tileFn(x, s, pal) {
        x.fillStyle = pal.check2; x.fillRect(0, 0, s, s);
        const h = s / 2;
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
          x.fillStyle = (i + j) % 2 ? pal.check1 : G.shade(pal.check1, -0.08);
          x.fillRect(i * h + 1, j * h + 1, h - 2, h - 2);
          x.fillStyle = G.shade(pal.check1, 0.3); x.fillRect(i * h + 1, j * h + 1, h - 2, 1);
          x.fillStyle = '#9a9ab0'; x.fillRect(i * h + 3, j * h + 3, 1, 1); x.fillRect(i * h + h - 4, j * h + 3, 1, 1); x.fillRect(i * h + 3, j * h + h - 4, 1, 1); x.fillRect(i * h + h - 4, j * h + h - 4, 1, 1);
        }
      },
    },
    makeBG() {
      const L = {};
      L.factory = crispen(tileLayer(512, 150, (x, w, h) => {
        const r = G.rng(5);
        for (let i = 0; i < 10; i++) {
          const cx = r() * w, fw = 30 + r() * 60, top = 30 + r() * 70;
          x.fillStyle = '#2a2238'; x.fillRect(cx, top, fw, h - top);
          for (let yy = top + 6; yy < h; yy += 10) for (let xx = cx + 4; xx < cx + fw - 4; xx += 8) { x.fillStyle = r() < 0.3 ? '#ffb03a' : '#3a3048'; x.fillRect(xx, yy, 3, 4); }
          if (r() < 0.6) { x.fillStyle = '#2a2238'; x.fillRect(cx + fw * 0.6, top - 30, 8, 30); }
        }
      }));
      L.gears = crispen(tileLayer(512, 120, (x, w, h) => {
        const r = G.rng(19);
        x.fillStyle = '#3a3a50';
        x.fillRect(0, 70, w, 8); x.fillRect(0, 100, w, 4);
        for (let i = 0; i < 12; i++) { x.fillRect(r() * w, 0, 6, h); }
      }));
      return L;
    },
    renderBG(ctx, L, camX, camY, W, H, t, lvl) {
      const vy = G.clamp((camY - (lvl.bgY || 800)) * 0.05, -40, 60);
      const hz = 150 - vy;
      bandSky(ctx, W, H, hz - 150, [[0, '#120a1e'], [30, '#1e1030'], [60, '#2e1640'], [90, '#4a1a40'], [110, '#6a2238'], [126, '#8a2a30']]);
      drawTiled(ctx, L.factory, camX * 0.1, hz - 110, W);
      // big rotating gears
      for (let i = 0; i < 3; i++) {
        const gx = (((i * 220 - camX * 0.18) % (W + 200)) + W + 200) % (W + 200) - 100, gy = hz + 20 + (i % 2) * 30;
        const r = 30 + i * 6, a = t * 0.01 * (i % 2 ? -1 : 1);
        ctx.fillStyle = '#3a3048';
        for (let k = 0; k < 10; k++) { const aa = a + (k * G.TAU) / 10; ctx.fillRect(Math.round(gx + Math.cos(aa) * r - 4), Math.round(gy + Math.sin(aa) * r - 4), 8, 8); }
        ctx.beginPath(); ctx.arc(gx, gy, r - 2, 0, G.TAU); ctx.fill();
        ctx.fillStyle = '#1e1030'; ctx.beginPath(); ctx.arc(gx, gy, r * 0.35, 0, G.TAU); ctx.fill();
      }
      drawTiled(ctx, L.gears, camX * 0.3, hz, W);
      ctx.fillStyle = '#1a1424'; ctx.fillRect(0, hz + 110, W, H);
      // smoke puffs
      for (let i = 0; i < 6; i++) {
        const x = (((i * 130 - camX * 0.1 + t * 0.2) % (W + 60)) + W + 60) % (W + 60) - 30;
        const y = hz - 100 - ((t * 0.3 + i * 40) % 80);
        ctx.fillStyle = 'rgba(90,70,110,0.5)'; ctx.beginPath(); ctx.arc(x, y, 8 + ((t * 0.3 + i * 40) % 80) * 0.1, 0, G.TAU); ctx.fill();
      }
    },
    deco(type, t) {
      if (type === 'pipe') return spr('dpipe', 24, 64, (c) => { const d = D(); d.path(c, [6, 0, 18, 0, 18, 64, 6, 64], '#7a7a90'); d.path(c, [8, 0, 11, 0, 11, 64, 8, 64], '#b0b0c8'); d.path(c, [3, 20, 21, 20, 21, 26, 3, 26], '#5a5a70'); d.path(c, [3, 48, 21, 48, 21, 54, 3, 54], '#5a5a70'); });
      if (type === 'gearDeco') {
        const f = (t >> 3) % 4;
        return spr('dgear' + f, 40, 40, (c) => { const d = D(); d.star(c, 20, 20, 19, 15, 10, f * 0.08, '#8a8aa0'); d.ell(c, 20, 20, 12, 12, 0, '#6a6a80'); d.ell(c, 20, 20, 4, 4, 0, '#2a2a38'); });
      }
      if (type === 'warning') return spr('dwarn', 32, 40, (c) => { const d = D(); d.line(c, 16, 40, 16, 20, '#5a5a6a', 3); d.path(c, [16, 2, 30, 24, 2, 24], '#ffd23a', '#2a2000', 1); d.path(c, [15, 9, 17, 9, 17, 17, 15, 17], '#2a2000'); d.path(c, [15, 19, 17, 19, 17, 21, 15, 21], '#2a2000'); });
      return null;
    },
  });
})(window.G);
