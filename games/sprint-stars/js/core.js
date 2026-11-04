'use strict';
// Core: namespace, math helpers, input, bitmap font, color helpers.
window.G = window.G || {};
(function (G) {
  G.H = 240;
  G.W = 424;
  G.DT = 1 / 60;
  G.TAU = Math.PI * 2;
  G.frame = 0;
  G.debug = false;

  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
  G.approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
  G.angDiff = (a, b) => {
    let d = a - b;
    while (d > Math.PI) d -= G.TAU;
    while (d < -Math.PI) d += G.TAU;
    return d;
  };
  G.wrapAng = (a) => {
    while (a > Math.PI) a -= G.TAU;
    while (a <= -Math.PI) a += G.TAU;
    return a;
  };
  G.rng = function (seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  G.makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };
  G.ctxOf = (c) => {
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return x;
  };

  // ---------- colour helpers ----------
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    const c = (v) => G.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }
  G.hexToRgb = hexToRgb;
  G.shade = (hex, amt) => {
    // amt -1..1 : darken / lighten
    const [r, g, b] = hexToRgb(hex);
    if (amt < 0) return rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
    return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  };
  G.mix = (h1, h2, t) => {
    const a = hexToRgb(h1), b = hexToRgb(h2);
    return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  };

  // ---------- pixelize: hard alpha + 1px outline ----------
  G.pixelize = function (canvas, outline, threshold) {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const th = threshold == null ? 110 : threshold;
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (d[i * 4 + 3] >= th) {
        solid[i] = 1;
        // un-premultiply semi transparent edge colours
        const a = d[i * 4 + 3] / 255;
        if (a < 1) {
          d[i * 4] = Math.min(255, d[i * 4] / a);
          d[i * 4 + 1] = Math.min(255, d[i * 4 + 1] / a);
          d[i * 4 + 2] = Math.min(255, d[i * 4 + 2] / a);
        }
        d[i * 4 + 3] = 255;
      } else d[i * 4 + 3] = 0;
    }
    if (outline) {
      const [or, og, ob] = hexToRgb(outline);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (solid[i]) continue;
          if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
            d[i * 4] = or; d[i * 4 + 1] = og; d[i * 4 + 2] = ob; d[i * 4 + 3] = 255;
          }
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  };

  // ---------- Input ----------
  const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'dash', 'pause', 'start', 'back'];
  const I = (G.Input = {
    kb: {}, touch: {}, pad: {}, held: {}, prev: {}, latch: {}, pressed: {}, released: {},
    taps: [], usingTouch: false,
    keyMap: {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
      Space: 'jump', KeyZ: 'jump', KeyK: 'jump', KeyJ: 'jump',
      KeyX: 'dash', KeyC: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash', KeyL: 'dash',
      Escape: 'pause', KeyP: 'pause', Enter: 'start', Backspace: 'back',
    },
    init(canvas) {
      addEventListener('keydown', (e) => {
        if (G.Audio) G.Audio.unlock();
        if (e.code === 'F2') { G.debug = !G.debug; return; }
        const a = this.keyMap[e.code];
        if (a) {
          if (!this.kb[a]) this.latch[a] = true;
          this.kb[a] = true;
          e.preventDefault();
        }
      });
      addEventListener('keyup', (e) => {
        const a = this.keyMap[e.code];
        if (a) { this.kb[a] = false; e.preventDefault(); }
      });
      addEventListener('blur', () => { this.kb = {}; this.touch = {}; });
      // menu taps / clicks in internal coordinates
      const toInternal = (cx, cy) => {
        const r = canvas.getBoundingClientRect();
        return { x: ((cx - r.left) / r.width) * G.W, y: ((cy - r.top) / r.height) * G.H };
      };
      canvas.addEventListener('pointerdown', (e) => {
        if (G.Audio) G.Audio.unlock();
        this.taps.push(toInternal(e.clientX, e.clientY));
      });
      this.toInternal = toInternal;
      // iOS Safari only starts audio from touchend in some versions
      addEventListener('touchend', () => { if (G.Audio) G.Audio.unlock(); }, { passive: true });
    },
    poll() {
      // gamepad
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const p = {};
      for (const gp of pads) {
        if (!gp) continue;
        const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        const b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
        p.left = p.left || ax < -0.4 || b(14);
        p.right = p.right || ax > 0.4 || b(15);
        p.up = p.up || ay < -0.5 || b(12);
        p.down = p.down || ay > 0.5 || b(13);
        p.jump = p.jump || b(0) || b(3);
        p.dash = p.dash || b(1) || b(2) || b(5) || b(7);
        p.pause = p.pause || b(9);
        p.start = p.start || b(9);
        p.back = p.back || b(8);
      }
      this.pad = p;
      for (const a of ACTIONS) {
        const h = !!(this.kb[a] || this.touch[a] || this.pad[a]);
        this.held[a] = h;
        this.pressed[a] = !!this.latch[a] || (h && !this.prev[a]);
        this.released[a] = !h && this.prev[a];
      }
    },
    endStep() {
      for (const a of ACTIONS) { this.prev[a] = this.held[a]; this.latch[a] = false; }
      this.taps.length = 0;
    },
    setTouch(a, v) {
      if (v && !this.touch[a]) this.latch[a] = true;
      this.touch[a] = v;
    },
    confirm() { return this.pressed.jump || this.pressed.start; },
  });

  // ---------- Bitmap font (5x7) ----------
  const GLYPHS = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
    D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
    G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
    J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17], O: [14, 17, 17, 17, 17, 17, 14],
    P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
    S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14],
    V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31],
    3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
    6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14],
    9: [14, 17, 17, 15, 1, 2, 12],
    ':': [0, 12, 12, 0, 12, 12, 0], '.': [0, 0, 0, 0, 0, 12, 12], '!': [4, 4, 4, 4, 4, 0, 4],
    '?': [14, 17, 1, 2, 4, 0, 4], '-': [0, 0, 0, 31, 0, 0, 0], "'": [4, 4, 8, 0, 0, 0, 0],
    ',': [0, 0, 0, 0, 12, 4, 8], '/': [1, 1, 2, 4, 8, 16, 16], '+': [0, 4, 4, 31, 4, 4, 0],
    '"': [10, 10, 0, 0, 0, 0, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8],
    '&': [12, 18, 20, 8, 21, 18, 13], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8],
    '*': [0, 21, 14, 31, 14, 21, 0], '#': [10, 31, 10, 10, 10, 31, 10], ' ': [0, 0, 0, 0, 0, 0, 0],
    '=': [0, 0, 31, 0, 31, 0, 0], '%': [24, 25, 2, 4, 8, 19, 3],
  };
  const CHARS = Object.keys(GLYPHS);
  const atlasCache = {};
  // style: {fill:[top,bottom], outline}
  function buildAtlas(key, top, bottom, outline) {
    const cw = 7, ch = 9;
    const c = G.makeCanvas(CHARS.length * cw, ch);
    const x = G.ctxOf(c);
    CHARS.forEach((k, i) => {
      const rows = GLYPHS[k];
      for (let r = 0; r < 7; r++)
        for (let b = 0; b < 5; b++)
          if (rows[r] & (16 >> b)) {
            x.fillStyle = G.mix(top, bottom, r / 6);
            x.fillRect(i * cw + 1 + b, 1 + r, 1, 1);
          }
    });
    if (outline) G.pixelize(c, outline);
    const a = { canvas: c, index: {} };
    CHARS.forEach((k, i) => (a.index[k] = i));
    atlasCache[key] = a;
    return a;
  }
  G.Font = {
    width(text, scale = 1) { return text.length * 6 * scale; },
    draw(ctx, text, x, y, opt = {}) {
      text = String(text).toUpperCase();
      const top = opt.color || '#ffffff';
      const bottom = opt.color2 || top;
      const outline = opt.outline === undefined ? '#101020' : opt.outline;
      const key = top + bottom + outline;
      const atlas = atlasCache[key] || buildAtlas(key, top, bottom, outline);
      const s = opt.scale || 1;
      let w = this.width(text, s);
      if (opt.align === 'center') x -= Math.round(w / 2);
      else if (opt.align === 'right') x -= w;
      x = Math.round(x); y = Math.round(y);
      for (let i = 0; i < text.length; i++) {
        const gi = atlas.index[text[i]];
        if (gi === undefined) continue;
        ctx.drawImage(atlas.canvas, gi * 7, 0, 7, 9, x + i * 6 * s - s, y - s, 7 * s, 9 * s);
      }
      return w;
    },
  };
})(window.G);
