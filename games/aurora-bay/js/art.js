/* Aurora Bay — shared illustration kit.
 * House style: flat cartoon shapes with a navy outline (never pure black), one darker
 * "shade" shape per object, a small white highlight, soft blue ground shadows.
 * All functions draw in logical units on a 2D context. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util;
  var A = AB.art = {};

  A.C = {
    out: '#26324d', outSoft: '#3d4c6e',
    snow: '#f5f9ff', snowShade: '#cddbf2', snowDeep: '#a9bfe3',
    ice: '#c4ebf7', iceMid: '#8fd0ea', iceDeep: '#4f9fcc', water: '#2d6c9f', waterDeep: '#1d4f7d',
    skyTop: '#22407e', skyMid: '#5677bf', skyLow: '#a9b9e6', horizon: '#f3c9d8',
    warm: '#ffd37a', warmGlow: '#ffb54d', lampGlow: 'rgba(255,200,110,',
    wood: '#b06f43', woodDark: '#7d4a2b', woodLight: '#d39a68',
    red: '#e2574c', redDark: '#b43a33', teal: '#35b5a4', tealDark: '#23877b',
    yellow: '#ffcf4a', orange: '#ff9a3c', pink: '#ff8fb1', purple: '#8e6bd8', blue: '#4a8fe0', green: '#5dbb63', greenDark: '#3d8c48',
    pine: '#2f7d6a', pineDark: '#1f5a4d', stone: '#9aa6bd', stoneDark: '#6c7894',
    cream: '#fff4dc', ink: '#26324d', white: '#ffffff', coin: '#ffc93c', coinDark: '#e09a1a'
  };
  var C = A.C;

  // ---- primitives -------------------------------------------------------
  A.rrect = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  /** Fill the current path, then outline it. lw=0 skips the outline. */
  A.fs = function (ctx, fill, lw, stroke) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw !== 0) {
      ctx.lineWidth = lw == null ? 3 : lw;
      ctx.strokeStyle = stroke || C.out;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.stroke();
    }
  };
  A.shape = function (ctx, build, fill, lw, stroke) { ctx.beginPath(); build(ctx); A.fs(ctx, fill, lw, stroke); };
  A.ellipse = function (ctx, x, y, rx, ry, fill, lw, stroke, rot) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); A.fs(ctx, fill, lw, stroke);
  };
  A.circle = function (ctx, x, y, r, fill, lw, stroke) { A.ellipse(ctx, x, y, r, r, fill, lw, stroke); };
  A.box = function (ctx, x, y, w, h, r, fill, lw, stroke) { ctx.beginPath(); A.rrect(ctx, x, y, w, h, r); A.fs(ctx, fill, lw, stroke); };
  A.line = function (ctx, pts, lw, color) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.lineWidth = lw || 3; ctx.strokeStyle = color || C.out; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  };
  A.poly = function (ctx, pts, fill, lw, stroke) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); A.fs(ctx, fill, lw, stroke);
  };
  /** Soft oval shadow under objects and characters. */
  A.shadow = function (ctx, x, y, rx, ry, a) {
    ctx.save();
    ctx.fillStyle = 'rgba(40,60,110,' + (a == null ? 0.22 : a) + ')';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  A.glow = function (ctx, x, y, r, rgbaPrefix, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgbaPrefix + (a == null ? 0.55 : a) + ')');
    g.addColorStop(1, rgbaPrefix + '0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  };
  A.highlight = function (ctx, x, y, rx, ry, a) {
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.55 : a) + ')';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  A.star = function (ctx, x, y, r, fill, lw, points, inner, rot) {
    points = points || 5; inner = inner || 0.48;
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var a = (rot || -Math.PI / 2) + i * Math.PI / points, rr = i % 2 ? r * inner : r;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); A.fs(ctx, fill, lw);
  };
  A.heart = function (ctx, x, y, s, fill, lw) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35);
    ctx.closePath(); A.fs(ctx, fill || '#ff6f91', lw == null ? 2 : lw);
  };
  A.snowflake = function (ctx, x, y, r, color, lw) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color || '#fff'; ctx.lineWidth = lw || Math.max(1.5, r * 0.18); ctx.lineCap = 'round';
    for (var i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r);
      ctx.moveTo(0, -r * 0.55); ctx.lineTo(-r * 0.25, -r * 0.78); ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.25, -r * 0.78);
      ctx.stroke();
    }
    ctx.restore();
  };
  A.coin = function (ctx, x, y, r, spin) {
    var sx = spin == null ? 1 : Math.max(0.15, Math.abs(Math.cos(spin)));
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1);
    A.circle(ctx, 0, 0, r, C.coin, Math.max(2, r * 0.16));
    A.circle(ctx, 0, 0, r * 0.68, null, Math.max(1.5, r * 0.1), C.coinDark);
    A.snowflake(ctx, 0, 0, r * 0.42, C.coinDark, Math.max(1.2, r * 0.1));
    A.highlight(ctx, -r * 0.38, -r * 0.4, r * 0.22, r * 0.12, 0.8);
    ctx.restore();
  };
  A.sparkle = function (ctx, x, y, r, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a; ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
    ctx.restore();
  };

  // ---- sky & atmosphere -------------------------------------------------
  A.sky = function (ctx, w, h, horizonY) {
    var g = ctx.createLinearGradient(0, 0, 0, horizonY);
    g.addColorStop(0, C.skyTop); g.addColorStop(0.55, C.skyMid); g.addColorStop(0.85, C.skyLow); g.addColorStop(1, C.horizon);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizonY + 2);
    var rnd = U.seeded(77);
    for (var i = 0; i < 70; i++) {
      var sx = rnd() * w, sy = rnd() * horizonY * 0.6, sr = 0.6 + rnd() * 1.6;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + rnd() * 0.55) + ')';
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }
  };
  /** Animated northern lights ribbons. Draw over the sky each frame (cheap: 3 ribbons). */
  A.aurora = function (ctx, w, top, height, t, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var cols = [['rgba(90,255,180,', 0.0], ['rgba(120,200,255,', 1.7], ['rgba(220,120,255,', 3.1]];
    for (var k = 0; k < cols.length; k++) {
      var base = top + k * height * 0.22, ph = cols[k][1];
      ctx.beginPath();
      var steps = 24;
      for (var i = 0; i <= steps; i++) {
        var x = (i / steps) * w;
        var y = base + Math.sin(i * 0.45 + t * 0.35 + ph) * height * 0.22 + Math.sin(i * 0.17 - t * 0.2 + ph) * height * 0.18;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      for (var j = steps; j >= 0; j--) {
        var x2 = (j / steps) * w;
        var y2 = base + height * 0.55 + Math.sin(j * 0.45 + t * 0.35 + ph + 0.6) * height * 0.2;
        ctx.lineTo(x2, y2);
      }
      ctx.closePath();
      var g = ctx.createLinearGradient(0, base - height * 0.3, 0, base + height * 0.8);
      var a = (alpha == null ? 0.32 : alpha) * (0.75 + 0.25 * Math.sin(t * 0.6 + ph));
      g.addColorStop(0, cols[k][0] + '0)'); g.addColorStop(0.45, cols[k][0] + a + ')'); g.addColorStop(1, cols[k][0] + '0)');
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.restore();
  };
  /** Falling snow particle field. Create once per scene, then update/draw each frame. */
  A.SnowField = function (count, w, h, opts) {
    opts = opts || {};
    this.w = w; this.h = h; this.p = [];
    for (var i = 0; i < count; i++) this.p.push({ x: Math.random() * w, y: Math.random() * h, r: 1 + Math.random() * 2.6, s: 18 + Math.random() * 40, ph: Math.random() * 6 });
    this.wind = opts.wind || 8;
  };
  A.SnowField.prototype.update = function (dt) {
    for (var i = 0; i < this.p.length; i++) {
      var f = this.p[i];
      f.y += f.s * dt; f.ph += dt; f.x += (Math.sin(f.ph) * 10 + this.wind) * dt;
      if (f.y > this.h + 5) { f.y = -5; f.x = Math.random() * this.w; }
      if (f.x > this.w + 5) f.x = -5; if (f.x < -5) f.x = this.w + 5;
    }
  };
  A.SnowField.prototype.draw = function (ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    for (var i = 0; i < this.p.length; i++) { var f = this.p[i]; ctx.moveTo(f.x + f.r, f.y); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); }
    ctx.fill();
  };

  // ---- scenery pieces ------------------------------------------------------
  /** Snowy pine tree, base at (x,y). */
  A.pine = function (ctx, x, y, h, seed) {
    var w = h * 0.62;
    A.shadow(ctx, x + h * 0.08, y + 2, w * 0.55, h * 0.08);
    A.box(ctx, x - h * 0.05, y - h * 0.16, h * 0.1, h * 0.18, 3, C.woodDark, 2.5);
    var tiers = 3;
    for (var i = 0; i < tiers; i++) {
      var ty = y - h * 0.12 - i * h * 0.26, tw = w * (1 - i * 0.24) / 2, th = h * 0.42;
      A.poly(ctx, [x, ty - th, x + tw, ty, x - tw, ty], i % 2 ? C.pine : C.pineDark, 3);
      // shade side
      ctx.save(); ctx.globalAlpha = 0.25; A.poly(ctx, [x, ty - th, x + tw, ty, x + tw * 0.15, ty], '#0e3a30', 0); ctx.restore();
      // snow on tier
      ctx.beginPath();
      ctx.moveTo(x - tw * 0.82, ty - th * 0.08);
      ctx.quadraticCurveTo(x - tw * 0.45, ty - th * 0.36, x - tw * 0.2, ty - th * 0.2);
      ctx.quadraticCurveTo(x, ty - th * 0.48, x + tw * 0.25, ty - th * 0.22);
      ctx.quadraticCurveTo(x + tw * 0.55, ty - th * 0.3, x + tw * 0.82, ty - th * 0.06);
      ctx.quadraticCurveTo(x + tw * 0.5, ty - th * 0.16, x + tw * 0.2, ty - th * 0.08);
      ctx.quadraticCurveTo(x, ty - th * 0.2, x - tw * 0.3, ty - th * 0.1);
      ctx.quadraticCurveTo(x - tw * 0.55, ty - th * 0.02, x - tw * 0.82, ty - th * 0.08);
      A.fs(ctx, C.snow, 2);
    }
    // snow cap at tip
    A.poly(ctx, [x, y - h * 0.12 - 2 * h * 0.26 - h * 0.42, x + w * 0.1, y - h * 0.12 - 2 * h * 0.26 - h * 0.3, x - w * 0.1, y - h * 0.12 - 2 * h * 0.26 - h * 0.3], C.snow, 2);
  };
  /** Rounded snow drift / hill blob. */
  A.drift = function (ctx, x, y, w, h, fill) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.bezierCurveTo(x - w * 0.42, y - h * 1.1, x + w * 0.38, y - h * 1.1, x + w / 2, y);
    ctx.closePath();
    A.fs(ctx, fill || C.snow, 2.5, C.snowDeep);
    ctx.save(); ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(x + w * 0.05, y); ctx.bezierCurveTo(x + w * 0.2, y - h * 0.7, x + w * 0.4, y - h * 0.5, x + w / 2, y); ctx.closePath();
    ctx.fillStyle = C.snowShade; ctx.fill(); ctx.restore();
  };
  A.rock = function (ctx, x, y, w, h, snowy) {
    A.shadow(ctx, x, y + 2, w * 0.55, h * 0.18);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w * 0.5, y - h * 0.8, x - w * 0.1, y - h);
    ctx.quadraticCurveTo(x + w * 0.45, y - h * 0.95, x + w / 2, y); ctx.closePath();
    A.fs(ctx, C.stone, 3);
    ctx.save(); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(x + w * 0.1, y); ctx.quadraticCurveTo(x + w * 0.35, y - h * 0.6, x + w * 0.5, y); ctx.fillStyle = C.stoneDark; ctx.fill(); ctx.restore();
    if (snowy) {
      ctx.beginPath(); ctx.moveTo(x - w * 0.42, y - h * 0.6); ctx.quadraticCurveTo(x - w * 0.15, y - h * 1.12, x + w * 0.3, y - h * 0.86);
      ctx.quadraticCurveTo(x + w * 0.05, y - h * 0.7, x - w * 0.42, y - h * 0.6); A.fs(ctx, C.snow, 2);
    }
  };
  /** Glowing window. lit=true gives warm light. */
  A.window = function (ctx, x, y, w, h, opts) {
    opts = opts || {};
    var round = opts.round;
    if (opts.lit !== false) A.glow(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 1.1, C.lampGlow, 0.35);
    ctx.beginPath();
    if (round) ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (opts.arch) { ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); }
    else A.rrect(ctx, x, y, w, h, 4);
    var g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, opts.lit === false ? '#9fc4e6' : '#fff1b8'); g.addColorStop(1, opts.lit === false ? '#6d97c4' : C.warmGlow);
    A.fs(ctx, g, opts.lw || 3, opts.frame || C.out);
    ctx.save(); ctx.clip();
    ctx.strokeStyle = opts.frameColor || C.woodDark; ctx.lineWidth = Math.max(2, w * 0.07);
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h * 0.5); ctx.lineTo(x + w, y + h * 0.5); ctx.stroke();
    ctx.restore();
    if (opts.snow !== false) {
      ctx.beginPath(); ctx.moveTo(x - 4, y + h + 1); ctx.quadraticCurveTo(x + w / 2, y + h - 7, x + w + 4, y + h + 1); ctx.quadraticCurveTo(x + w / 2, y + h + 7, x - 4, y + h + 1);
      A.fs(ctx, C.snow, 2);
    }
  };
  /** Wooden door with frame. (x,y) is bottom-left. */
  A.door = function (ctx, x, y, w, h, color, opts) {
    opts = opts || {};
    A.box(ctx, x - 6, y - h - 6, w + 12, h + 6, 6, C.woodDark, 3);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h + w / 2); ctx.arc(x + w / 2, y - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y); ctx.closePath();
    A.fs(ctx, color || C.red, 3);
    ctx.save(); ctx.clip(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#000'; ctx.fillRect(x + w * 0.6, y - h, w, h); ctx.restore();
    A.circle(ctx, x + w * 0.78, y - h * 0.42, Math.max(3, w * 0.07), C.coin, 2);
    if (opts.wreath) { A.circle(ctx, x + w / 2, y - h * 0.7, w * 0.2, null, 5, C.greenDark); A.circle(ctx, x + w / 2, y - h * 0.7 + w * 0.2, 3, C.red, 0); }
  };
  A.lampPost = function (ctx, x, y, h, t, lit) {
    A.shadow(ctx, x, y + 2, 14, 5);
    A.box(ctx, x - 4, y - h, 8, h, 3, '#3c4a6b', 2.5);
    A.box(ctx, x - 10, y - 10, 20, 10, 3, '#3c4a6b', 2.5);
    A.glow(ctx, x, y - h - 14, 60 + Math.sin((t || 0) * 2) * 4, C.lampGlow, 0.5);
    A.box(ctx, x - 13, y - h - 30, 26, 30, 6, '#ffe7a3', 3);
    A.poly(ctx, [x - 17, y - h - 30, x + 17, y - h - 30, x, y - h - 44], '#3c4a6b', 3);
    A.ellipse(ctx, x, y - h - 40, 12, 5, C.snow, 2);
  };
  A.bench = function (ctx, x, y, w) {
    A.shadow(ctx, x, y + 3, w * 0.55, 8);
    A.box(ctx, x - w / 2 + 8, y - 22, 7, 22, 2, C.woodDark, 2.5);
    A.box(ctx, x + w / 2 - 15, y - 22, 7, 22, 2, C.woodDark, 2.5);
    A.box(ctx, x - w / 2, y - 30, w, 11, 4, C.wood, 3);
    A.box(ctx, x - w / 2 + 2, y - 58, w - 4, 10, 4, C.wood, 3);
    A.box(ctx, x - w / 2 + 2, y - 44, w - 4, 9, 4, C.woodLight, 3);
    A.ellipse(ctx, x - w * 0.15, y - 32, w * 0.3, 5, C.snow, 2);
  };
  /** Classic snow-block igloo. (x,y) = floor center. */
  A.igloo = function (ctx, x, y, s, opts) {
    opts = opts || {};
    var r = 90 * s;
    A.shadow(ctx, x, y + 4, r * 1.15, r * 0.22);
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.arc(x, y, r, Math.PI, 0); ctx.closePath();
    var g = ctx.createLinearGradient(x - r, y - r, x + r, y);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, opts.tint || '#d4e4f8');
    A.fs(ctx, g, 3.5);
    ctx.save(); ctx.beginPath(); ctx.moveTo(x - r, y); ctx.arc(x, y, r, Math.PI, 0); ctx.closePath(); ctx.clip();
    ctx.strokeStyle = 'rgba(120,150,200,0.55)'; ctx.lineWidth = 2;
    for (var row = 1; row < 5; row++) {
      var yy = y - row * r * 0.21;
      ctx.beginPath(); ctx.moveTo(x - r, yy); ctx.lineTo(x + r, yy); ctx.stroke();
      var off = row % 2 ? 0 : r * 0.17;
      for (var k = -3; k <= 3; k++) { var xx = x + k * r * 0.34 + off; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + r * 0.21); ctx.stroke(); }
    }
    ctx.restore();
    // entrance tunnel
    var ew = r * 0.62, eh = r * 0.62;
    ctx.beginPath(); ctx.moveTo(x - ew / 2 - 8 * s, y); ctx.lineTo(x - ew / 2 - 8 * s, y - eh + ew / 2); ctx.arc(x, y - eh + ew / 2, ew / 2 + 8 * s, Math.PI, 0); ctx.lineTo(x + ew / 2 + 8 * s, y); ctx.closePath();
    A.fs(ctx, '#eef4ff', 3);
    ctx.beginPath(); ctx.moveTo(x - ew / 2, y); ctx.lineTo(x - ew / 2, y - eh + ew / 2); ctx.arc(x, y - eh + ew / 2, ew / 2, Math.PI, 0); ctx.lineTo(x + ew / 2, y); ctx.closePath();
    var dg = ctx.createLinearGradient(x, y - eh, x, y);
    dg.addColorStop(0, '#ffcf73'); dg.addColorStop(1, '#ff9f45');
    A.fs(ctx, opts.dark ? '#46557a' : dg, 3);
    if (opts.flag) {
      A.line(ctx, [x + r * 0.45, y - r * 0.88, x + r * 0.45, y - r * 1.35], 3);
      A.poly(ctx, [x + r * 0.45, y - r * 1.35, x + r * 0.45 + 34 * s, y - r * 1.25, x + r * 0.45, y - r * 1.14], opts.flag, 2.5);
    }
  };
  /** Wooden sign. text optional. */
  A.sign = function (ctx, x, y, w, h, text, opts) {
    opts = opts || {};
    A.box(ctx, x - 5, y - h * 0.2, 10, h * 0.2 + 2, 2, C.woodDark, 2.5);
    A.box(ctx, x - w / 2, y - h, w, h * 0.82, 8, opts.fill || C.woodLight, 3);
    A.ellipse(ctx, x - w * 0.15, y - h, w * 0.32, 5, C.snow, 2);
    if (text) {
      ctx.fillStyle = opts.color || C.out; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 ' + (opts.size || Math.round(h * 0.34)) + 'px ' + AB.FONT;
      ctx.fillText(text, x, y - h * 0.58);
    }
  };
  AB.FONT = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", "Trebuchet MS", system-ui, sans-serif';

  // ---- small objects used across scenes and minigames ----------------------
  A.FISH = {
    sunny: { body: '#ffb53c', fin: '#ff7d2a', belly: '#ffe39a' },
    bluegill: { body: '#4fa6e8', fin: '#2a6fb8', belly: '#bfe3ff' },
    rosy: { body: '#ff8fb1', fin: '#e35d88', belly: '#ffd3e1' },
    mint: { body: '#5fd3a6', fin: '#2f9e78', belly: '#c9f5e4' },
    gold: { body: '#ffd84a', fin: '#e8a713', belly: '#fff3b0' },
    star: { body: '#a98bff', fin: '#6f50d8', belly: '#e1d8ff' }
  };
  /** Cartoon fish facing right, centred at (x,y). */
  A.fish = function (ctx, x, y, s, kind, t) {
    var p = A.FISH[kind] || A.FISH.sunny, wag = Math.sin((t || 0) * 10) * 0.25;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.save(); ctx.translate(-22, 0); ctx.rotate(wag);
    A.poly(ctx, [0, 0, -18, -14, -14, 0, -18, 14], p.fin, 2.5); ctx.restore();
    A.ellipse(ctx, 0, 0, 26, 16, p.body, 3);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 26, 16, 0, 0, Math.PI * 2); ctx.clip();
    A.ellipse(ctx, 2, 10, 22, 8, p.belly, 0); ctx.restore();
    A.ellipse(ctx, 0, 0, 26, 16, null, 3);
    A.poly(ctx, [-4, -14, 8, -24, 10, -13], p.fin, 2.5);
    A.circle(ctx, 13, -4, 5, '#fff', 2); A.circle(ctx, 14.5, -4, 2.6, C.out, 0);
    A.line(ctx, [18, 6, 22, 7], 2);
    if (kind === 'star') A.star(ctx, -6, -1, 6, '#fff', 1.5);
    if (kind === 'gold') A.highlight(ctx, -6, -6, 8, 3, 0.8);
    ctx.restore();
  };
  A.mug = function (ctx, x, y, s, color, topping) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    A.circle(ctx, 17, -14, 9, null, 5, C.out); A.circle(ctx, 17, -14, 9, null, 3, color || C.red);
    A.shape(ctx, function (c) { c.moveTo(-16, -30); c.lineTo(16, -30); c.lineTo(13, 0); c.quadraticCurveTo(0, 4, -13, 0); c.closePath(); }, color || C.red, 3);
    A.ellipse(ctx, 0, -30, 16, 5, '#7a4528', 2.5);
    if (topping === 'cream' || topping == null) {
      A.circle(ctx, -6, -34, 7, '#fffaf0', 2); A.circle(ctx, 5, -35, 8, '#fffaf0', 2); A.circle(ctx, 0, -41, 6, '#fffaf0', 2);
    } else if (topping === 'marsh') {
      A.box(ctx, -10, -38, 9, 8, 2, '#fff', 2); A.box(ctx, 1, -39, 9, 8, 2, '#ffd6e6', 2);
    } else if (topping === 'sprinkles') {
      A.circle(ctx, -6, -34, 7, '#fffaf0', 2); A.circle(ctx, 5, -35, 8, '#fffaf0', 2);
      ['#ff6f91', '#4fa6e8', '#ffcf4a'].forEach(function (cc, i) { A.box(ctx, -7 + i * 6, -40 + (i % 2) * 4, 4, 2, 1, cc, 0); });
    }
    ctx.restore();
  };
  A.shell = function (ctx, x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    A.shape(ctx, function (c) { c.moveTo(0, 8); c.lineTo(-16, -6); c.quadraticCurveTo(0, -24, 16, -6); c.closePath(); }, color || '#ffc2a8', 2.5);
    ctx.strokeStyle = 'rgba(160,80,60,0.6)'; ctx.lineWidth = 1.6;
    for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(i * 6, -15 + Math.abs(i) * 3); ctx.stroke(); }
    A.box(ctx, -5, 5, 10, 6, 2, color || '#ffc2a8', 2);
    ctx.restore();
  };
  /** Glimmer stone (hidden collectible). */
  A.gem = function (ctx, x, y, s, color, t) {
    ctx.save(); ctx.translate(x, y + Math.sin((t || 0) * 3) * 3 * s); ctx.scale(s, s);
    A.glow(ctx, 0, -2, 26, 'rgba(180,240,255,', 0.5);
    A.poly(ctx, [0, -16, 12, -4, 0, 14, -12, -4], color || '#7fe3ff', 2.5);
    A.poly(ctx, [0, -16, 5, -4, 0, 14, -5, -4], 'rgba(255,255,255,0.45)', 0);
    A.line(ctx, [-12, -4, 12, -4], 1.5, 'rgba(38,50,77,0.6)');
    ctx.restore();
    A.sparkle(ctx, x + 10 * s, y - 14 * s, 5 * s, 0.6 + 0.4 * Math.sin((t || 0) * 5));
  };
  A.scarfIcon = function (ctx, x, y, s, c1, c2) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    A.shape(ctx, function (c) { c.moveTo(-22, -10); c.quadraticCurveTo(0, 4, 22, -10); c.lineTo(20, 2); c.quadraticCurveTo(0, 14, -20, 2); c.closePath(); }, c1, 2.5);
    A.box(ctx, 6, 0, 12, 24, 4, c1, 2.5);
    ctx.fillStyle = c2; ctx.fillRect(7.5, 8, 9, 4); ctx.fillRect(7.5, 16, 9, 4);
    ctx.restore();
  };
  A.pinecone = function (ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    A.ellipse(ctx, 0, 0, 10, 15, '#9a5a32', 2.5);
    ctx.strokeStyle = '#5e321a'; ctx.lineWidth = 1.6;
    for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-9, i * 5); ctx.quadraticCurveTo(0, i * 5 + 5, 9, i * 5); ctx.stroke(); }
    A.box(ctx, -2, -19, 4, 6, 1, C.greenDark, 1.5);
    ctx.restore();
  };
  A.tracks = function (ctx, x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 0.8 : a; ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#7d93bf';
    [[0, 0], [10, -4], [-10, -4], [-6, -12], [6, -12]].forEach(function (p, i) {
      ctx.beginPath(); ctx.ellipse(p[0], p[1], i ? 3 : 7, i ? 4 : 6, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  };
  /** Cached offscreen render helper: build(ctx) runs once at w×h (logical) × scale. */
  A.bake = function (w, h, scale, build) {
    var c = document.createElement('canvas');
    c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
    var x = c.getContext('2d'); x.scale(scale, scale); build(x, w, h);
    return c;
  };
})();
