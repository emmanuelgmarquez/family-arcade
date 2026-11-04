'use strict';
// Sprites for collectibles, gadgets, enemies, critters and effects.
(function (G) {
  const cache = {};
  const H = () => G.Draw;
  function spr(key, w, h, fn, outline = '#1a1020') {
    if (cache[key]) return cache[key];
    return (cache[key] = G.renderPixel(w, h, fn, outline));
  }
  function frames(key, n, w, h, fn, outline) {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(spr(key + i, w, h, (c) => fn(c, i, n), outline));
    return arr;
  }
  const A = (G.ObjArt = {});

  A.ring = () => frames('ring', 8, 16, 16, (c, i, n) => {
    const d = H();
    const w = Math.max(1.4, Math.abs(Math.cos((i / n) * Math.PI)) * 6.5);
    d.ell(c, 8, 8, w, 6.5, 0, '#b86a00');
    d.ell(c, 8, 8, Math.max(0.1, w - 1.0), 5.5, 0, '#ffd23a');
    if (w > 3) d.ell(c, 8, 8, w - 2.8, 3.6, 0, '#000', null);
    c.globalCompositeOperation = 'destination-out';
    if (w > 3) d.ell(c, 8, 8, w - 2.8, 3.6, 0, '#000');
    c.globalCompositeOperation = 'source-over';
    d.ell(c, 8 - w * 0.5, 4.5, Math.max(0.5, w * 0.25), 1.2, -0.6, '#fff6c0');
  }, '#5a2a00');

  A.sparkle = () => frames('spark', 4, 16, 16, (c, i) => {
    const d = H();
    const r = [3, 6, 5, 2][i];
    d.star(c, 8, 8, r, r * 0.25, 4, i * 0.3, i % 2 ? '#ffffff' : '#fff2a0');
  }, null);

  A.spring = (color, ext) => spr('spring' + color + ext, 32, 32, (c) => {
    const d = H();
    const top = color === 'r' ? '#ff4a3a' : '#ffd21a';
    const topD = color === 'r' ? '#a01a10' : '#c08000';
    const h = ext ? 16 : 6;
    // base
    d.path(c, [3, 31, 29, 31, 29, 26, 3, 26], '#6a6a7a', '#202030', 1);
    d.path(c, [4, 27, 28, 27, 28, 26, 4, 26], '#a8a8b8');
    // coil
    for (let k = 0; k < 3; k++) {
      const y = 26 - (k + 0.5) * (h / 3);
      d.ell(c, 16, y, 9, 1.6, 0, null, '#c8c8d8', 1.4);
    }
    // plate
    const py = 26 - h - 6;
    d.path(c, [2, py + 6, 30, py + 6, 30, py + 1, 26, py, 6, py, 2, py + 1], top, '#202030', 1);
    d.path(c, [4, py + 2, 28, py + 2, 28, py + 3, 4, py + 3], G.shade(top, 0.5));
    d.path(c, [2, py + 6, 30, py + 6, 30, py + 5, 2, py + 5], topD);
  });

  const ICON = {
    ring(c, d) { d.ell(c, 14, 12, 5, 5, 0, null, '#ffd23a', 2.4); },
    shield(c, d) { d.ell(c, 14, 12, 5.5, 5.5, 0, '#5ad0ff', '#ffffff', 1); d.ell(c, 12.5, 10, 1.8, 1.4, 0, '#ffffff'); },
    inv(c, d) { d.star(c, 14, 12, 6, 2.6, 5, 0, '#ffe24a', '#ffffff'); },
    shoes(c, d) {
      c.beginPath(); c.moveTo(9, 10); c.lineTo(15, 10); c.lineTo(20, 13); c.lineTo(20, 16); c.lineTo(8, 16); c.closePath();
      c.fillStyle = '#ff5a2a'; c.fill(); c.fillStyle = '#ffffff'; c.fillRect(8, 15, 12, 1.5); c.fillRect(12, 10, 1.6, 5);
      d.line(c, 4, 11, 7, 11, '#ffffff', 1); d.line(c, 5, 14, 7, 14, '#ffffff', 1);
    },
    life(c, d, ch) {
      c.save(); c.translate(14, 12); c.scale(0.42, 0.42); c.translate(-13, -19);
      c.drawImage(G.Art.head(ch || 'bolt'), 0, 0);
      c.restore();
    },
  };
  A.monitor = (type, ch) => spr('mon' + type + (ch || ''), 28, 32, (c) => {
    const d = H();
    d.path(c, [1, 4, 27, 4, 27, 30, 1, 30], '#b8b8c8', '#202030', 1);
    d.path(c, [2, 5, 26, 5, 26, 7, 2, 7], '#e8e8f0');
    d.path(c, [3, 27, 25, 27, 25, 30, 3, 30], '#6a6a7a');
    // screen
    d.path(c, [4, 6, 24, 6, 24, 21, 4, 21], '#1a2440', '#0a0a18', 1);
    c.save(); c.translate(0, 2);
    if (type === 'life') {
      // draw head icon later in-game (image can't be drawn mid hi-res), use placeholder star face
      ICON.life(c, d, ch);
    } else ICON[type](c, d);
    c.restore();
    d.path(c, [5, 7, 10, 7, 6, 11], 'rgba(255,255,255,0.4)');
    // feet
    d.path(c, [3, 30, 8, 30, 8, 31, 3, 31], '#404050');
    d.path(c, [20, 30, 25, 30, 25, 31, 20, 31], '#404050');
  });
  A.monitorBroken = () => spr('monb', 28, 32, (c) => {
    const d = H();
    d.path(c, [1, 22, 6, 18, 10, 23, 16, 17, 21, 23, 27, 19, 27, 30, 1, 30], '#8a8a98', '#202030', 1);
  });
  A.iconOnly = (type, ch) => spr('ico' + type + (ch || ''), 28, 24, (c) => {
    const d = H();
    d.path(c, [4, 2, 24, 2, 24, 22, 4, 22], '#1a2440', '#ffffff', 1);
    if (type === 'life') ICON.life(c, d, ch); else ICON[type](c, d);
  });

  A.checkpoint = (on, f) => spr('cp' + on + f, 16, 56, (c) => {
    const d = H();
    d.line(c, 8, 55, 8, 14, '#3a3a5a', 3.4);
    d.line(c, 8, 55, 8, 14, '#9a9ac8', 1.6);
    d.path(c, [3, 55, 13, 55, 12, 50, 4, 50], '#5a5a7a', '#202030', 1);
    const col = on ? (f % 2 ? '#ff3a3a' : '#ff9a3a') : '#3a7aff';
    d.ell(c, 8, 8, 5.5, 5.5, 0, col, '#202030', 1);
    d.ell(c, 6.5, 6.5, 1.8, 1.6, 0, '#ffffff');
  });

  A.goal = (face, f) => spr('goal' + face + f, 48, 72, (c) => {
    const d = H();
    d.line(c, 24, 71, 24, 40, '#5a5a6a', 3.6);
    d.line(c, 24, 71, 24, 40, '#c8c8d8', 1.6);
    // spinning panel width
    const w = face === 'spin' ? [20, 12, 3, 12][f % 4] : 20;
    d.ell(c, 24, 22, w, 18, 0, '#f0f0f8', '#202030', 1.2);
    d.ell(c, 24, 22, Math.max(1, w - 3), 15, 0, face === 'spin' ? '#bfc8ff' : '#ffffff');
    if (face === 'boss') {
      // grumpy robot face (the villain's emblem)
      d.ell(c, 24, 23, 12, 11, 0, '#9a9ab0', '#202030', 1);
      d.path(c, [15, 18, 21, 20, 21, 22, 15, 21], '#ff3a3a');
      d.path(c, [33, 18, 27, 20, 27, 22, 33, 21], '#ff3a3a');
      d.path(c, [17, 28, 31, 28, 31, 30, 17, 30], '#303040');
      d.line(c, 24, 12, 24, 7, '#202030', 1.2); d.ell(c, 24, 6, 2, 2, 0, '#ffd23a');
    } else if (face !== 'spin') {
      c.save(); c.translate(24, 24); c.scale(0.9, 0.9); c.translate(-14, -19);
      c.drawImage(G.Art.head(face), 0, 0);
      c.restore();
    }
  });

  A.spikes = () => spr('spikes', 32, 16, (c) => {
    const d = H();
    d.path(c, [0, 16, 32, 16, 32, 12, 0, 12], '#6a6a7a');
    for (let i = 0; i < 4; i++) {
      d.path(c, [i * 8 + 0.5, 12.5, i * 8 + 4, 0.5, i * 8 + 7.5, 12.5], '#c8c8d8');
      d.path(c, [i * 8 + 4, 0.5, i * 8 + 7.5, 12.5, i * 8 + 4, 12.5], '#7a7a8a');
    }
  });

  A.medal = () => frames('medal', 6, 24, 24, (c, i, n) => {
    const d = H();
    const sx = Math.max(0.15, Math.abs(Math.cos((i / n) * Math.PI)));
    c.translate(12, 12); c.scale(sx, 1);
    d.ell(c, 0, 0, 10.5, 10.5, 0, '#c87a00');
    d.ell(c, 0, 0, 9, 9, 0, '#ffcf3a');
    d.star(c, 0, 0.5, 6.5, 2.8, 5, 0, '#fff4b0', '#c87a00');
    d.ell(c, -4, -5, 2, 1.2, -0.6, '#ffffff');
  }, '#4a2a00');

  A.spikeball = () => spr('sball', 24, 24, (c) => {
    const d = H();
    d.star(c, 12, 12, 11.5, 6, 8, 0, '#8a8aa0');
    d.ell(c, 12, 12, 7, 7, 0, '#5a5a70');
    d.ell(c, 10, 10, 2.5, 2, 0, '#c8c8e0');
  });
  A.chain = () => spr('chain', 8, 8, (c) => { G.Draw.ell(c, 4, 4, 2.6, 2.6, 0, '#a0a0b8'); });

  A.boost = (f) => spr('boost' + f, 32, 10, (c) => {
    const d = H();
    d.path(c, [0, 10, 32, 10, 30, 2, 2, 2], '#40405a', '#202030', 1);
    for (let k = 0; k < 3; k++) {
      const x = 6 + k * 8 + (f ? 2 : 0);
      d.path(c, [x, 3.5, x + 4, 6, x, 8.5, x + 2, 6], (k + f) % 2 ? '#ffe24a' : '#ff8a2a');
    }
  });

  A.breakwall = (pal) => spr('bw' + pal.check1, 32, 64, (c) => {
    const d = H();
    for (let y = 0; y < 64; y += 16)
      for (let x = 0; x < 32; x += 16) {
        const col = ((x + y) / 16) % 2 ? pal.check1 : pal.check2;
        d.path(c, [x + 0.5, y + 0.5, x + 15.5, y + 0.5, x + 15.5, y + 15.5, x + 0.5, y + 15.5], col, G.shade(col, -0.4), 1);
        d.line(c, x + 3, y + 5, x + 9, y + 10, G.shade(col, -0.35), 0.8);
      }
  });

  // ---------- enemies ----------
  A.beetbot = () => frames('beet', 2, 32, 26, (c, i) => {
    const d = H();
    // wheels / legs
    d.ell(c, 9, 22, 3.4, 3.4, 0, '#3a3a4a'); d.ell(c, 23, 22, 3.4, 3.4, 0, '#3a3a4a');
    d.line(c, 9 + (i ? 1.5 : -1.5), 20, 9 - (i ? 1.5 : -1.5), 24, '#9a9ab0', 1);
    d.line(c, 23 - (i ? 1.5 : -1.5), 20, 23 + (i ? 1.5 : -1.5), 24, '#9a9ab0', 1);
    // shell
    c.beginPath(); c.moveTo(3, 19); c.quadraticCurveTo(4, 3, 17, 3); c.quadraticCurveTo(29, 4, 29, 19); c.closePath();
    c.fillStyle = '#c81e2a'; c.fill();
    c.save(); c.clip();
    d.ell(c, 19, 7, 8, 4, -0.2, '#ff5a4a');
    d.ell(c, 9, 10, 2.6, 2.6, 0, '#1a1020'); d.ell(c, 17, 12, 2.8, 2.8, 0, '#1a1020'); d.ell(c, 23, 9, 2.2, 2.2, 0, '#1a1020');
    c.restore();
    d.line(c, 16, 3.5, 16, 19, '#6a0a10', 1);
    // face
    d.ell(c, 28.5, 15, 4.2, 4.6, 0, '#5a5a70');
    d.ell(c, 29.5, 13.5, 1.8, 1.8, 0, '#ffe24a');
    d.ell(c, 30, 13.5, 0.8, 0.8, 0, '#1a1020');
    d.line(c, 27, 9.5, 30, 5, '#5a5a70', 1); d.ell(c, 30.5, 4.6, 1.2, 1.2, 0, '#ff3a3a');
    d.path(c, [2, 19, 30, 19, 30, 20.5, 2, 20.5], '#6a6a80');
  });
  A.buzzwing = () => frames('buzz', 2, 32, 26, (c, i) => {
    const d = H();
    // wings
    if (i) { d.ell(c, 13, 6, 8, 3.6, -0.3, 'rgba(200,240,255,0.95)', '#4a7aa0', 0.8); }
    else { d.ell(c, 13, 3, 4, 7, 0.4, 'rgba(200,240,255,0.95)', '#4a7aa0', 0.8); }
    // body
    d.ell(c, 14, 14, 9, 6, 0, '#2a8ae8');
    d.ell(c, 14, 12, 7, 2.5, 0, '#6ac0ff');
    for (let k = 0; k < 3; k++) d.line(c, 8 + k * 4, 9.5, 8 + k * 4, 19, '#ffd23a', 1.4);
    // tail stinger
    d.path(c, [5, 13, 0, 17, 6, 17], '#c8c8d8');
    // head
    d.ell(c, 24, 13, 5, 5, 0, '#5a5a70');
    d.ell(c, 25.5, 12, 2.4, 2.4, 0, '#ff3a3a');
    d.ell(c, 26, 11.5, 0.8, 0.8, 0, '#ffffff');
    // legs
    d.line(c, 12, 19, 10, 23, '#5a5a70', 1); d.line(c, 17, 19, 18, 23, '#5a5a70', 1);
  });
  A.prickler = () => frames('prick', 2, 32, 28, (c, i) => {
    const d = H();
    // spikes on top
    for (let k = 0; k < 6; k++) {
      const a = Math.PI + 0.35 + (k * (Math.PI - 0.7)) / 5;
      const x = 16 + Math.cos(a) * 9, y = 17 + Math.sin(a) * 9;
      const tx = 16 + Math.cos(a) * 16, ty = 17 + Math.sin(a) * 15;
      d.path(c, [x - Math.sin(a) * 2.6, y + Math.cos(a) * 2.6, tx, ty, x + Math.sin(a) * 2.6, y - Math.cos(a) * 2.6], k % 2 ? '#e8e8f8' : '#b0b0c8');
    }
    d.ell(c, 16, 18, 11, 7.5, 0, '#7a3ac8');
    d.ell(c, 18, 15.5, 6, 2.5, 0, '#a874f0');
    d.ell(c, 25, 19, 4, 4, 0, '#5a5a70');
    d.ell(c, 26, 18, 1.6, 1.6, 0, '#ffe24a');
    d.ell(c, 10, 25, 3, 2, 0, '#3a3a4a'); d.ell(c, 21, 25, 3, 2, 0, '#3a3a4a');
    d.line(c, 8 + (i ? 1 : 0), 25, 12 + (i ? 1 : 0), 25, '#8a8aa0', 0.8);
  });
  A.snapper = () => frames('snap', 2, 36, 28, (c, i) => {
    const d = H();
    // legs
    for (let k = 0; k < 3; k++) {
      d.line(c, 10 + k * 3, 20, 5 + k * 2, 27, '#a02a10', 1.4);
      d.line(c, 26 - k * 3, 20, 31 - k * 2, 27, '#a02a10', 1.4);
    }
    // claws
    const up = i ? -3 : 0;
    d.ell(c, 4, 12 + up, 4, 3.4, 0.4, '#ff6a3a'); d.path(c, [1, 10 + up, 5, 7 + up, 6, 10 + up], '#ffd0a0');
    d.ell(c, 32, 12 + up, 4, 3.4, -0.4, '#ff6a3a'); d.path(c, [35, 10 + up, 31, 7 + up, 30, 10 + up], '#ffd0a0');
    // body
    d.ell(c, 18, 17, 11, 7, 0, '#e8401e');
    d.ell(c, 20, 14, 6, 2.5, 0, '#ff8a5a');
    // cannon on back
    d.path(c, [14, 11, 22, 11, 21, 4, 15, 4], '#5a5a70', '#202030', 0.8);
    d.ell(c, 18, 4, 3.2, 1.4, 0, '#202030');
    // eyes on stalks
    d.line(c, 14, 12, 13, 8, '#a02a10', 1); d.line(c, 22, 12, 23, 8, '#a02a10', 1);
    d.ell(c, 13, 7.5, 1.8, 1.8, 0, '#ffffff'); d.ell(c, 23, 7.5, 1.8, 1.8, 0, '#ffffff');
    d.ell(c, 13.3, 7.5, 0.8, 0.8, 0, '#1a1020'); d.ell(c, 23.3, 7.5, 0.8, 0.8, 0, '#1a1020');
  });
  A.orb = () => frames('orb', 2, 10, 10, (c, i) => {
    const d = H();
    d.ell(c, 5, 5, 4, 4, 0, i ? '#ff3a6a' : '#ff8a2a');
    d.ell(c, 4, 4, 1.6, 1.6, 0, '#ffffff');
  });
  A.critter = (kind) => frames('crit' + kind, 2, 16, 16, (c, i) => {
    const d = H();
    if (kind === 0) { // bunny
      d.ell(c, 6, 4 + (i ? 1 : 0), 1.6, 4, -0.2, '#ffffff'); d.ell(c, 9, 4 + (i ? 1 : 0), 1.6, 4, 0.2, '#ffffff');
      d.ell(c, 8, 10, 5, 4.5, 0, '#ffffff'); d.ell(c, 10, 9, 1, 1, 0, '#1a1020'); d.ell(c, 12.5, 10.5, 0.8, 0.6, 0, '#ff7a9a');
      d.ell(c, 6, 15, 2.6, 1.2, 0, '#ffffff'); d.ell(c, 2.5, 11, 1.6, 1.6, 0, '#ffffff');
    } else if (kind === 1) { // bird
      d.ell(c, 8, 9, 5, 4, 0, '#5ab8ff'); d.ell(c, 10, 9.5, 3, 2.4, 0, '#d8f0ff');
      d.ell(c, 6, i ? 5 : 11, 4, 1.8, i ? -0.6 : 0.6, '#2a7ad8');
      d.ell(c, 11, 7.5, 0.9, 0.9, 0, '#1a1020'); d.path(c, [13, 8, 15.5, 9, 13, 10], '#ffb02a');
    } else { // piglet
      d.ell(c, 8, 10, 6, 4.5, 0, '#ff9ab8'); d.ell(c, 13.5, 10, 1.6, 1.4, 0, '#ff6a90');
      d.ell(c, 11, 8, 0.8, 0.8, 0, '#1a1020'); d.path(c, [7, 6, 8, 3, 10, 6], '#ff7aa0');
      d.line(c, 5, 14, 5, 15.5 + (i ? 0 : -1), '#ff7aa0', 1.4); d.line(c, 11, 14, 11, 15.5 + (i ? -1 : 0), '#ff7aa0', 1.4);
    }
  }, '#202030');
  A.explosion = () => frames('expl', 6, 32, 32, (c, i) => {
    const d = H();
    const r = [5, 9, 12, 13, 12, 9][i];
    const cols = ['#ffffff', '#fff2a0', '#ffd23a', '#ff8a2a', '#c8c8d0', '#9a9aa8'];
    for (let k = 0; k < 6; k++) {
      const a = k + i * 0.4;
      d.ell(c, 16 + Math.cos(a) * r * 0.45, 16 + Math.sin(a) * r * 0.45, r * 0.55, r * 0.55, 0, cols[Math.min(5, i + (k % 2))]);
    }
    d.ell(c, 16, 16, r * 0.45, r * 0.45, 0, cols[Math.max(0, i - 1)]);
  }, null);
  A.platform = (pal, w) => spr('plat' + pal.check1 + w, w, 28, (c) => {
    const d = H();
    // rocky underside with checker
    c.beginPath();
    c.moveTo(1, 3); c.lineTo(w - 1, 3); c.lineTo(w - 4, 14); c.quadraticCurveTo(w / 2, 30, 4, 14); c.closePath();
    c.fillStyle = pal.check2; c.fill();
    c.save(); c.clip();
    for (let x = 0; x < w; x += 8) for (let y = 0; y < 28; y += 8) if (((x + y) / 8) % 2) { c.fillStyle = pal.check1; c.fillRect(x, y, 8, 8); }
    c.restore();
    c.strokeStyle = pal.edge; c.lineWidth = 1; c.stroke();
    d.path(c, [0, 1, w, 1, w, 7, 0, 7], pal.grass);
    d.path(c, [0, 1, w, 1, w, 2.5, 0, 2.5], pal.grassLight);
    d.path(c, [0, 6, w, 6, w, 7.4, 0, 7.4], pal.grassDark);
  }, pal.edge);
})(window.G);
