/* Aurora Bay — Cocoa Café minigame.
 * The child's character is the barista behind a cosy café counter. Animal customers walk up with a
 * picture order (mug colour + drink + topping). Tap a mug, pour a drink, add a topping, then ring the
 * bell (or drag the mug to a customer) to serve. Gentle: wrong orders still earn a small thank-you tip,
 * and customers never get cross — at worst they shrug and leave a coin.
 * Keyboard: 1–9 station buttons, Enter/Space/ArrowUp serve, Backspace/Delete bin,
 * ArrowLeft/Right move a focus ring, ArrowDown presses the focused button. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C, CH = AB.chars;

  var ROUND = 80;
  var FEET_Y = 482, CUST_S = 1.75;
  var BAR_X = 178, BAR_Y = 614, BAR_S = 1.9;
  var MAT_X = 640, MAT_Y = 626, MUG_S = 1.9;
  var TILE_Y = 700, TILE_H = 178, TILE_W = 116;
  var TRASH = { x: 405, y: 642 }, BELL = { x: 868, y: 638 }, JAR = { x: 1100, y: 642 };
  var WINDOWS = [{ x: 350, y: 100, w: 190, h: 200 }, { x: 880, y: 100, w: 190, h: 200 }];
  var FIRE = { x: 710, y: 424 };
  var SPOTS = { 1: [860], 2: [720, 1030], 3: [600, 840, 1080] };

  var CUPS = {
    red: { col: '#e2574c', decal: 'heart' },
    blue: { col: '#4a8fe0', decal: 'flake' },
    yellow: { col: '#ffcf4a', decal: 'star' }
  };
  var CUP_IDS = ['red', 'blue', 'yellow'];
  var DRINKS = {
    cocoa: { col: '#8a5232', hi: '#b98058' },
    pink: { col: '#ff94bf', hi: '#ffd0e3' },
    mint: { col: '#5fd3a2', hi: '#b8f3da' }
  };
  var TOP_IDS = ['cream', 'marsh', 'sprinkles'];
  var TILE_DEFS = [
    { kind: 'cup', val: 'red', cx: 105, unlock: 0 }, { kind: 'cup', val: 'blue', cx: 235, unlock: 0 }, { kind: 'cup', val: 'yellow', cx: 365, unlock: 0 },
    { kind: 'drink', val: 'cocoa', cx: 520, unlock: 0 }, { kind: 'drink', val: 'pink', cx: 650, unlock: 2 }, { kind: 'drink', val: 'mint', cx: 780, unlock: 2 },
    { kind: 'top', val: 'cream', cx: 935, unlock: 1 }, { kind: 'top', val: 'marsh', cx: 1065, unlock: 1 }, { kind: 'top', val: 'sprinkles', cx: 1195, unlock: 1 }
  ];
  var SPRINKLES = [[-18, -59, 0.5, '#ff5d8f'], [-9, -62, -0.6, '#4a8fe0'], [0, -58, 0.2, '#ffcf4a'], [9, -61, 1.1, '#8e6bd8'],
    [18, -58, -0.3, '#5dbb63'], [-4, -65, 1.4, '#ff9a3c'], [13, -66, 0.4, '#ff5d8f'], [-14, -67, -1.2, '#ffcf4a'],
    [4, -70, -0.4, '#4a8fe0'], [-23, -62, 1.0, '#8e6bd8'], [23, -62, -1, '#ffcf4a'], [-6, -73, 0.8, '#5dbb63']];
  var BULB_COLS = ['#ff6f6f', '#ffd84a', '#5fe0c0', '#ff9fd0', '#7fb8ff'];

  // ---------------------------------------------------------------------------
  // Drawing helpers (shared by the game and the tutorial cards)
  // ---------------------------------------------------------------------------
  function drawDecal(ctx, kind, x, y, s, lw) {
    if (kind === 'heart') A.heart(ctx, x, y + s * 0.35, s, '#fff4ea', lw * 0.7);
    else if (kind === 'star') A.star(ctx, x, y, s * 1.05, '#fff4ea', lw * 0.7);
    else { A.snowflake(ctx, x, y, s, C.out, lw * 1.5); A.snowflake(ctx, x, y, s, '#fff4ea', lw * 0.75); }
  }
  function mugBody(c) {
    c.moveTo(-32, -58); c.lineTo(-28, -9); c.quadraticCurveTo(-27, 0, -17, 0); c.lineTo(17, 0);
    c.quadraticCurveTo(27, 0, 28, -9); c.lineTo(32, -58); c.closePath();
  }
  function drawTopping(ctx, top, lw) {
    if (top === 'cream') {
      var cr = '#fffaf0';
      A.circle(ctx, -10, -61, 8.5, cr, lw); A.circle(ctx, 10, -61, 8.5, cr, lw);
      A.circle(ctx, 0, -65, 10, cr, lw); A.circle(ctx, 0, -74, 7.5, cr, lw);
      A.shape(ctx, function (c) { c.moveTo(-4, -79); c.quadraticCurveTo(1, -91, 8, -85); c.quadraticCurveTo(3, -80, -4, -79); c.closePath(); }, cr, lw);
      ctx.fillStyle = 'rgba(200,160,120,0.25)'; ctx.beginPath(); ctx.ellipse(5, -61, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    } else if (top === 'marsh') {
      var cube = function (x, y, r, col) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(r);
        A.box(ctx, -7, -6.5, 14, 13, 4, col, lw); A.highlight(ctx, -2.5, -3, 2.6, 1.4, 0.8);
        ctx.restore();
      };
      cube(-14, -62, -0.2, '#ffffff'); cube(14, -62, 0.25, '#ffffff'); cube(0, -67, 0.1, '#ffc2da');
    } else if (top === 'sprinkles') {
      for (var i = 0; i < SPRINKLES.length; i++) {
        var sp = SPRINKLES[i];
        ctx.save(); ctx.translate(sp[0], sp[1]); ctx.rotate(sp[2]);
        A.box(ctx, -5, -2, 10, 4, 2, sp[3], lw * 0.45); ctx.restore();
      }
    }
  }
  /** Mug with (x,y) = bottom centre. o = { cup, drink, fill, top, topPop, t, steam, steamCol, rot } */
  function drawMug(ctx, x, y, s, o) {
    var cup = CUPS[o.cup] || CUPS.red, col = cup.col, lw = 3.4 / Math.max(1, s * 0.75);
    var dr = o.drink ? DRINKS[o.drink] : null, fill = dr ? (o.fill == null ? 1 : o.fill) : 0;
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(s, s);
    // handle
    ctx.beginPath(); ctx.arc(31, -33, 13, -Math.PI / 2, Math.PI / 2);
    ctx.lineCap = 'round'; ctx.lineWidth = 7 + lw * 2; ctx.strokeStyle = C.out; ctx.stroke();
    ctx.lineWidth = 7; ctx.strokeStyle = col; ctx.stroke();
    // body + shade
    ctx.beginPath(); mugBody(ctx); A.fs(ctx, col, 0);
    ctx.save(); ctx.beginPath(); mugBody(ctx); ctx.clip();
    ctx.fillStyle = 'rgba(30,40,90,0.17)'; ctx.fillRect(13, -64, 30, 70);
    ctx.fillStyle = 'rgba(30,40,90,0.10)'; ctx.fillRect(-40, -8, 90, 12);
    ctx.restore();
    A.highlight(ctx, -21, -38, 3.5, 12, 0.5);
    drawDecal(ctx, cup.decal, 0, -29, 11, lw);
    if (dr && fill >= 1) {
      A.shape(ctx, function (c) {
        c.moveTo(-29, -58); c.lineTo(-28, -44); c.quadraticCurveTo(-28, -36, -22, -36);
        c.quadraticCurveTo(-15, -36, -15, -44); c.lineTo(-14, -58); c.closePath();
      }, dr.col, lw * 0.8);
    }
    ctx.beginPath(); mugBody(ctx); A.fs(ctx, null, lw);
    // rim + inside
    A.ellipse(ctx, 0, -58, 32, 9, U.shade(col, 0.28), lw);
    A.ellipse(ctx, 0, -57.5, 26.5, 6, U.shade(col, -0.45), 0);
    if (dr && fill > 0) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, -57.5, 26.5, 6, 0, 0, Math.PI * 2); ctx.clip();
      var ly = -57.5 + (1 - Math.min(1, fill)) * 9;
      A.ellipse(ctx, 0, ly, 26.5, 6, dr.col, 0);
      A.ellipse(ctx, -8, ly - 1.5, 9, 1.8, dr.hi, 0);
      ctx.restore();
    }
    if (dr && o.top && fill >= 1) {
      var p = o.topPop == null ? 1 : U.clamp(o.topPop, 0, 1);
      if (p > 0) {
        ctx.save(); ctx.globalAlpha *= Math.min(1, p * 3); ctx.translate(0, -(1 - U.easeOutBack(p)) * 40);
        drawTopping(ctx, o.top, lw); ctx.restore();
      }
    }
    if (dr && o.steam && fill >= 1) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = o.steamCol || 'rgba(255,255,255,0.75)';
      var base = o.top === 'cream' ? -92 : -78;
      for (var i = 0; i < 3; i++) {
        var sx = -12 + i * 12, ph = (o.t || 0) * 2.2 + i * 1.7;
        ctx.globalAlpha = 0.45 + 0.3 * Math.sin(ph);
        ctx.beginPath();
        for (var k = 0; k <= 7; k++) {
          var yy = base - k * 4, xx = sx + Math.sin(ph + k * 0.7) * 4;
          if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function drawDrinkSymbol(ctx, id, x, y, lw) {
    if (id === 'cocoa') {
      A.box(ctx, x - 10, y - 9, 20, 18, 3, '#6b3b20', lw * 0.7);
      A.line(ctx, [x, y - 8, x, y + 8], 1.6, '#4a2814'); A.line(ctx, [x - 9, y, x + 9, y], 1.6, '#4a2814');
      A.highlight(ctx, x - 5, y - 5, 2.5, 1.5, 0.6);
    } else if (id === 'pink') {
      A.shape(ctx, function (c) {
        c.moveTo(x, y + 12); c.bezierCurveTo(x - 14, y + 2, x - 12, y - 9, x, y - 6);
        c.bezierCurveTo(x + 12, y - 9, x + 14, y + 2, x, y + 12); c.closePath();
      }, '#e8434f', lw * 0.7);
      ctx.fillStyle = '#ffe28a';
      [[-4, -1], [4, -1], [0, 4], [-5, 5], [5, 5]].forEach(function (d) { ctx.beginPath(); ctx.arc(x + d[0], y + d[1], 1.3, 0, Math.PI * 2); ctx.fill(); });
      A.star(ctx, x, y - 8, 6.5, '#5dbb63', lw * 0.5, 5, 0.45);
    } else {
      A.ellipse(ctx, x, y, 7.5, 12.5, '#3fbf7f', lw * 0.7, null, 0.6);
      A.line(ctx, [x - 6, y + 7, x + 6, y - 7], 1.6, '#1f7d52');
    }
  }
  function drawDispenser(ctx, x, y, s, id, lw) {
    var dr = DRINKS[id];
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    A.box(ctx, -38, -14, 76, 14, 5, C.woodDark, lw);
    ctx.beginPath(); A.rrect(ctx, -32, -108, 64, 94, 16); A.fs(ctx, 'rgba(228,244,255,0.95)', 0);
    ctx.save(); ctx.beginPath(); A.rrect(ctx, -32, -108, 64, 94, 16); ctx.clip();
    ctx.fillStyle = dr.col; ctx.fillRect(-40, -84, 80, 80);
    A.ellipse(ctx, 0, -84, 34, 5, dr.hi, 0);
    ctx.fillStyle = 'rgba(30,40,90,0.15)'; ctx.fillRect(14, -112, 30, 112);
    ctx.restore();
    ctx.beginPath(); A.rrect(ctx, -32, -108, 64, 94, 16); A.fs(ctx, null, lw);
    A.box(ctx, -24, -100, 7, 70, 3.5, 'rgba(255,255,255,0.6)', 0);
    A.box(ctx, -28, -120, 56, 15, 7, '#c3cde0', lw); A.circle(ctx, 0, -124, 6, '#c3cde0', lw);
    A.highlight(ctx, -14, -116, 7, 2, 0.7);
    // tap on the side
    A.box(ctx, 28, -36, 16, 9, 3, '#aeb9cf', lw * 0.8); A.box(ctx, 37, -32, 8, 11, 2.5, '#aeb9cf', lw * 0.8);
    A.circle(ctx, 36, -41, 5, C.red, lw * 0.7);
    // label
    A.circle(ctx, 0, -52, 17, '#fffaf0', lw * 0.8);
    drawDrinkSymbol(ctx, id, 0, -52, lw);
    ctx.restore();
  }
  function drawToppingIcon(ctx, id, x, y, s, lw) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (id === 'cream') {
      var cr = '#fffaf0';
      A.ellipse(ctx, 0, -44, 44, 9, '#a9d0f2', lw);
      A.circle(ctx, -22, -50, 15, cr, lw); A.circle(ctx, 22, -50, 15, cr, lw); A.circle(ctx, 0, -58, 19, cr, lw);
      A.circle(ctx, 0, -80, 13, cr, lw);
      A.shape(ctx, function (c) { c.moveTo(-6, -90); c.quadraticCurveTo(2, -112, 14, -100); c.quadraticCurveTo(6, -94, -6, -90); c.closePath(); }, cr, lw);
      ctx.fillStyle = 'rgba(200,160,120,0.22)'; ctx.beginPath(); ctx.ellipse(10, -54, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
      A.shape(ctx, function (c) { c.moveTo(-46, -44); c.quadraticCurveTo(-44, 0, 0, 0); c.quadraticCurveTo(44, 0, 46, -44); c.quadraticCurveTo(0, -34, -46, -44); c.closePath(); }, '#6fa9e3', lw);
      ctx.fillStyle = '#ffffff';
      [[-26, -26], [0, -18], [26, -26], [-12, -10], [13, -10]].forEach(function (d) { ctx.beginPath(); ctx.arc(d[0], d[1], 3.6, 0, Math.PI * 2); ctx.fill(); });
      A.highlight(ctx, -30, -34, 6, 3, 0.5);
    } else if (id === 'marsh') {
      ctx.beginPath(); A.rrect(ctx, -34, -96, 68, 96, 16); A.fs(ctx, 'rgba(228,244,255,0.95)', 0);
      ctx.save(); ctx.beginPath(); A.rrect(ctx, -34, -96, 68, 96, 16); ctx.clip();
      var rows = [[-14, [-20, 0, 20]], [-30, [-10, 10]], [-46, [-22, 0, 20]], [-62, [-11, 11]]];
      rows.forEach(function (r, ri) {
        r[1].forEach(function (cx, ci) {
          ctx.save(); ctx.translate(cx, r[0]); ctx.rotate(((ri * 3 + ci) % 5 - 2) * 0.12);
          A.box(ctx, -9, -8, 18, 16, 5, (ri + ci) % 3 === 1 ? '#ffc2da' : '#ffffff', lw * 0.8); ctx.restore();
        });
      });
      ctx.fillStyle = 'rgba(30,40,90,0.12)'; ctx.fillRect(16, -100, 30, 100);
      ctx.restore();
      ctx.beginPath(); A.rrect(ctx, -34, -96, 68, 96, 16); A.fs(ctx, null, lw);
      A.box(ctx, -26, -88, 6, 60, 3, 'rgba(255,255,255,0.65)', 0);
      A.box(ctx, -30, -108, 60, 16, 7, '#ff8fb1', lw); A.highlight(ctx, -16, -103, 7, 2, 0.7);
    } else {
      ctx.beginPath(); A.rrect(ctx, -30, -88, 60, 88, 18); A.fs(ctx, 'rgba(228,244,255,0.95)', 0);
      ctx.save(); ctx.beginPath(); A.rrect(ctx, -30, -88, 60, 88, 18); ctx.clip();
      var rnd = U.seeded(41), cols = ['#ff5d8f', '#4a8fe0', '#ffcf4a', '#8e6bd8', '#5dbb63', '#ff9a3c'];
      for (var i = 0; i < 46; i++) {
        var px = -26 + rnd() * 52, py = -4 - rnd() * 58;
        ctx.save(); ctx.translate(px, py); ctx.rotate(rnd() * 3);
        ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); A.rrect(ctx, -5, -2, 10, 4, 2); ctx.fill(); ctx.restore();
      }
      ctx.fillStyle = 'rgba(30,40,90,0.12)'; ctx.fillRect(14, -92, 30, 92);
      ctx.restore();
      ctx.beginPath(); A.rrect(ctx, -30, -88, 60, 88, 18); A.fs(ctx, null, lw);
      A.box(ctx, -22, -78, 6, 54, 3, 'rgba(255,255,255,0.65)', 0);
      A.shape(ctx, function (c) { c.moveTo(-28, -86); c.quadraticCurveTo(-28, -118, 0, -118); c.quadraticCurveTo(28, -118, 28, -86); c.closePath(); }, '#8e6bd8', lw);
      ctx.fillStyle = C.out;
      [[-10, -104], [0, -108], [10, -104], [-5, -96], [5, -96]].forEach(function (d) { ctx.beginPath(); ctx.arc(d[0], d[1], 2.4, 0, Math.PI * 2); ctx.fill(); });
      A.highlight(ctx, -12, -110, 6, 2.5, 0.6);
    }
    ctx.restore();
  }
  function drawBell(ctx, x, y, s, ring, pressed) {
    var jig = Math.sin(ring * 40) * ring * 0.12;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    A.shadow(ctx, 0, 2, 64, 10);
    A.box(ctx, -60, -20, 120, 20, 8, C.woodDark, 3);
    A.box(ctx, -52, -17, 104, 5, 2.5, 'rgba(255,255,255,0.18)', 0);
    ctx.save(); ctx.translate(0, -20); ctx.rotate(jig);
    var bp = pressed ? 5 : 0;
    A.box(ctx, -5, -58 + bp, 10, 16, 3, '#e8a713', 3); A.circle(ctx, 0, -60 + bp, 8, C.yellow, 3);
    ctx.beginPath(); ctx.moveTo(-46, 0); ctx.arc(0, 0, 46, Math.PI, 0); ctx.closePath(); A.fs(ctx, C.yellow, 0);
    ctx.save(); ctx.beginPath(); ctx.moveTo(-46, 0); ctx.arc(0, 0, 46, Math.PI, 0); ctx.closePath(); ctx.clip();
    ctx.fillStyle = 'rgba(190,110,10,0.28)'; ctx.fillRect(14, -50, 40, 52); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-46, 0); ctx.arc(0, 0, 46, Math.PI, 0); ctx.closePath(); A.fs(ctx, null, 3);
    A.highlight(ctx, -20, -28, 9, 5, 0.75);
    A.box(ctx, -52, -6, 104, 10, 5, '#e8a713', 3);
    ctx.restore();
    if (ring > 0.05) {
      ctx.globalAlpha = ring; ctx.strokeStyle = C.out; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (var side = -1; side <= 1; side += 2) {
        for (var k = 0; k < 2; k++) {
          ctx.beginPath(); ctx.arc(0, -46, 62 + k * 16 + (1 - ring) * 14, side < 0 ? Math.PI * 1.1 : -0.55, side < 0 ? Math.PI * 1.45 : -0.2); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function drawFinger(ctx, x, y, s, press) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (1 - press * 0.1), s * (1 - press * 0.1)); ctx.rotate(-0.18);
    A.shadow(ctx, 6, 6, 14, 5, 0.18);
    A.box(ctx, -9, -58, 18, 58, 9, '#ffffff', 3);
    A.box(ctx, -24, -86, 48, 40, 16, '#ffffff', 3);
    A.ellipse(ctx, 25, -62, 9, 13, '#ffffff', 3, null, -0.4);
    A.line(ctx, [-12, -50, -12, -58], 2.2); A.line(ctx, [0, -48, 0, -56], 2.2);
    A.box(ctx, -22, -102, 44, 18, 7, '#7fb8ff', 3);
    ctx.restore();
  }
  function bubblePath(ctx, w, h, tipX, tipY) {
    // tail first, then the rounded body, then hide the seam
    A.poly(ctx, [-18, -4, 18, -4, tipX, tipY], '#ffffff', 3);
    ctx.beginPath(); A.rrect(ctx, -w / 2, -h, w, h, 28); A.fs(ctx, '#ffffff', 3);
    A.poly(ctx, [-15, -6, 15, -6, tipX * 0.85, tipY - 5], '#ffffff', 0);
  }
  function wallBg(ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#e2ad7c'); g.addColorStop(1, '#f3d3a6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (var x = 0; x < w; x += 48) ctx.fillRect(x, 0, 20, h);
  }

  // ---------------------------------------------------------------------------
  // Static paintings (baked once)
  // ---------------------------------------------------------------------------
  function paintWindow(c, wd, seed) {
    var x = wd.x, y = wd.y, w = wd.w, h = wd.h;
    A.glow(c, x + w / 2, y + h / 2, w * 0.9, 'rgba(160,200,255,', 0.25);
    A.box(c, x - 14, y - 14, w + 28, h + 28, 10, C.wood, 3);
    A.box(c, x - 8, y - 8, w + 16, h + 16, 6, C.woodDark, 2.5);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    var g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#1d3168'); g.addColorStop(0.6, '#4a66b0'); g.addColorStop(1, '#a6b8ea');
    c.fillStyle = g; c.fillRect(x, y, w, h);
    var rnd = U.seeded(seed);
    for (var i = 0; i < 18; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.4 + rnd() * 0.5) + ')'; c.beginPath(); c.arc(x + rnd() * w, y + rnd() * h * 0.5, 0.8 + rnd() * 1.4, 0, Math.PI * 2); c.fill(); }
    if (seed === 3) { A.circle(c, x + w * 0.72, y + 42, 18, '#fff6d6', 2.5); A.circle(c, x + w * 0.72 + 8, y + 36, 15, '#3a5596', 0); }
    // snowy hills + little pines
    c.beginPath(); c.moveTo(x, y + h * 0.72); c.quadraticCurveTo(x + w * 0.35, y + h * 0.56, x + w * 0.7, y + h * 0.7); c.quadraticCurveTo(x + w * 0.9, y + h * 0.76, x + w, y + h * 0.66); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath();
    A.fs(c, '#dfe9fb', 2.5, C.snowDeep);
    A.pine(c, x + w * 0.22, y + h * 0.7, 54); A.pine(c, x + w * 0.8, y + h * 0.74, 64); A.pine(c, x + w * 0.55, y + h * 0.78, 40);
    c.beginPath(); c.moveTo(x, y + h * 0.86); c.quadraticCurveTo(x + w * 0.5, y + h * 0.78, x + w, y + h * 0.88); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath();
    A.fs(c, '#f5f9ff', 2.5, C.snowDeep);
    // frost in the corners
    [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(function (p) {
      var fg = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], 60);
      fg.addColorStop(0, 'rgba(255,255,255,0.85)'); fg.addColorStop(0.5, 'rgba(235,245,255,0.35)'); fg.addColorStop(1, 'rgba(235,245,255,0)');
      c.fillStyle = fg; c.fillRect(p[0] - 60, p[1] - 60, 120, 120);
    });
    for (var f = 0; f < 6; f++) A.snowflake(c, x + 10 + rnd() * (w - 20), y + 10 + rnd() * (h - 20), 4 + rnd() * 4, 'rgba(255,255,255,0.6)', 1.5);
    c.restore();
    A.box(c, x, y, w, h, 2, null, 3);
    A.box(c, x + w / 2 - 5, y - 2, 10, h + 4, 2, C.woodLight, 2.5);
    A.box(c, x - 2, y + h / 2 - 5, w + 4, 10, 2, C.woodLight, 2.5);
    // sill with a candle and a tiny potted pine
    A.box(c, x - 26, y + h + 8, w + 52, 16, 5, C.woodLight, 3);
    A.shadow(c, x + 30, y + h + 9, 16, 3);
    A.box(c, x + 22, y + h - 18, 16, 26, 4, '#fff4dc', 2.5);
    A.glow(c, x + 30, y + h - 30, 26, C.lampGlow, 0.6);
    A.ellipse(c, x + 30, y + h - 27, 4, 7, C.warm, 2);
    A.box(c, x + w - 46, y + h - 8, 26, 16, 4, C.red, 2.5);
    A.poly(c, [x + w - 33, y + h - 44, x + w - 20, y + h - 8, x + w - 46, y + h - 8], C.pine, 2.5);
  }
  function paintRoom(c) {
    wallBg(c, 1280, 432);
    var rnd = U.seeded(11);
    for (var i = 0; i < 40; i++) A.snowflake(c, rnd() * 1280, 30 + rnd() * 300, 4, 'rgba(255,255,255,0.22)', 1.5);
    // ceiling beam
    A.box(c, -10, -10, 1300, 24, 0, C.woodDark, 3);
    // wainscot
    c.fillStyle = '#a7653b'; c.fillRect(0, 352, 1280, 82);
    for (var px = 8; px < 1280; px += 122) A.box(c, px, 370, 104, 72, 6, '#96572f', 2.5, '#6f3d20');
    A.box(c, -10, 344, 1300, 14, 4, C.woodLight, 3);
    // chalkboard menu (pictures only)
    A.shadow(c, 172, 340, 120, 6, 0.12);
    A.line(c, [100, 136, 170, 112, 240, 136], 2.5, C.woodDark);
    A.circle(c, 170, 112, 4, C.coin, 2);
    A.box(c, 34, 134, 272, 202, 12, C.woodDark, 3);
    A.box(c, 48, 148, 244, 174, 8, '#2f4a45', 2.5);
    c.save(); c.globalAlpha = 0.9;
    function chalkMug(cx, cy, col) {
      c.strokeStyle = col; c.lineWidth = 3.5; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(cx - 20, cy - 34); c.lineTo(cx - 17, cy); c.lineTo(cx + 17, cy); c.lineTo(cx + 20, cy - 34); c.closePath(); c.stroke();
      c.beginPath(); c.arc(cx + 21, cy - 18, 8, -Math.PI / 2, Math.PI / 2); c.stroke();
      for (var s = -1; s <= 1; s++) { c.beginPath(); c.moveTo(cx + s * 8, cy - 42); c.quadraticCurveTo(cx + s * 8 + 5, cy - 50, cx + s * 8, cy - 58); c.stroke(); }
    }
    chalkMug(100, 260, '#ffb3c8'); chalkMug(170, 260, '#ffffff'); chalkMug(240, 260, '#a8f0cf');
    c.strokeStyle = '#ffe08a'; c.lineWidth = 3;
    A.star(c, 170, 180, 14, null, 3); A.heart(c, 100, 190, 12, null, 3); A.heart(c, 240, 190, 12, null, 3);
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.moveTo(70, 296); c.quadraticCurveTo(170, 286, 270, 296); c.stroke();
    c.restore();
    c.save(); c.beginPath(); A.rrect(c, 48, 148, 244, 174, 8); c.clip(); c.fillStyle = 'rgba(255,255,255,0.07)';
    c.beginPath(); c.moveTo(60, 148); c.lineTo(110, 148); c.lineTo(48, 230); c.lineTo(48, 164); c.closePath(); c.fill(); c.restore();
    // windows
    paintWindow(c, WINDOWS[0], 3); paintWindow(c, WINDOWS[1], 9);
    // fireplace chimney breast
    A.box(c, 600, -10, 220, 445, 0, '#b8a596', 3);
    var r2 = U.seeded(23), stoneCols = ['#c9b8aa', '#ad9b8e', '#bfae9f', '#a69385'];
    for (var row = 0; row < 16; row++) {
      var yy = 18 + row * 26, off = row % 2 ? 0 : 26;
      for (var sx = 600 - off; sx < 820; sx += 52) {
        var x0 = Math.max(604, sx + 3), x1 = Math.min(816, sx + 49);
        if (x1 - x0 < 10) continue;
        A.box(c, x0, yy, x1 - x0, 22, 7, stoneCols[Math.floor(r2() * 4)], 2, '#7d6b60');
      }
    }
    // opening
    c.beginPath(); c.moveTo(642, 440); c.lineTo(642, 334); c.arc(710, 334, 68, Math.PI, 0); c.lineTo(778, 440); c.closePath();
    A.fs(c, '#8f7b6e', 3);
    c.beginPath(); c.moveTo(654, 440); c.lineTo(654, 336); c.arc(710, 336, 56, Math.PI, 0); c.lineTo(766, 440); c.closePath();
    var og = c.createLinearGradient(0, 280, 0, 440); og.addColorStop(0, '#2b1a14'); og.addColorStop(1, '#4a2c1c');
    A.fs(c, og, 3);
    A.box(c, 666, 404, 88, 18, 9, '#7d4a2b', 2.5); A.circle(c, 670, 413, 8, '#c08a5c', 2);
    c.save(); c.translate(710, 406); c.rotate(-0.25); A.box(c, -40, -8, 80, 16, 8, '#8f5634', 2.5); c.restore();
    // mantel
    A.box(c, 574, 250, 272, 22, 6, C.woodDark, 3);
    A.box(c, 586, 272, 248, 10, 3, '#5e3520', 2.5);
    A.highlight(c, 620, 255, 20, 3, 0.35);
    // garland with berries
    for (var gx = 580; gx <= 840; gx += 14) {
      var gy = 276 + Math.sin((gx - 580) / 260 * Math.PI) * 18;
      A.circle(c, gx, gy, 9, gx % 28 ? C.pine : C.pineDark, 2);
    }
    for (var bx = 594; bx <= 830; bx += 40) A.circle(c, bx, 282 + Math.sin((bx - 580) / 260 * Math.PI) * 18, 4, C.red, 1.5);
    // stockings
    [[618, C.red], [802, C.teal]].forEach(function (s) {
      A.shape(c, function (p) { p.moveTo(s[0] - 11, 292); p.lineTo(s[0] - 11, 330); p.quadraticCurveTo(s[0] - 11, 346, s[0] + 4, 346); p.lineTo(s[0] + 14, 346); p.quadraticCurveTo(s[0] + 20, 336, s[0] + 9, 330); p.lineTo(s[0] + 11, 292); p.closePath(); }, s[1], 2.5);
      A.box(c, s[0] - 14, 286, 28, 12, 5, '#ffffff', 2.5);
    });
    // mugs on the mantel
    A.mug(c, 612, 250, 0.8, C.yellow, 'marsh'); A.mug(c, 808, 250, 0.8, C.blue, 'cream');
    A.box(c, 700, 222, 20, 28, 4, '#fff4dc', 2.5); A.glow(c, 710, 210, 30, C.lampGlow, 0.6); A.ellipse(c, 710, 212, 4, 7, C.warm, 2);
    // door
    A.box(c, 1106, 112, 162, 330, 8, C.woodDark, 3);
    c.beginPath(); A.rrect(c, 1120, 126, 134, 320, 6); A.fs(c, '#3f7d6a', 3);
    c.save(); c.beginPath(); A.rrect(c, 1120, 126, 134, 320, 6); c.clip(); c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(1200, 120, 60, 330); c.restore();
    c.beginPath(); c.moveTo(1144, 260); c.lineTo(1144, 196); c.arc(1187, 196, 43, Math.PI, 0); c.lineTo(1230, 260); c.closePath();
    var dg = c.createLinearGradient(0, 150, 0, 260); dg.addColorStop(0, '#2a4688'); dg.addColorStop(1, '#93aae0');
    A.fs(c, dg, 3);
    A.line(c, [1187, 153, 1187, 260], 3, C.woodDark); A.line(c, [1144, 210, 1230, 210], 3, C.woodDark);
    A.box(c, 1144, 290, 86, 60, 6, '#357060', 2.5, '#26324d');
    A.circle(c, 1236, 330, 7, C.coin, 2.5);
    A.circle(c, 1187, 182, 26, null, 9, C.out); A.circle(c, 1187, 182, 26, null, 6, C.greenDark);
    A.poly(c, [1187, 206, 1176, 216, 1198, 216], C.red, 2);
    // shop bell over the door
    A.line(c, [1187, 100, 1187, 116], 2.5); A.shape(c, function (p) { p.moveTo(1176, 126); p.quadraticCurveTo(1176, 108, 1187, 108); p.quadraticCurveTo(1198, 108, 1198, 126); p.closePath(); }, C.yellow, 2.5);
    // warm vignette at the bottom of the wall
    var vg = c.createLinearGradient(0, 300, 0, 432); vg.addColorStop(0, 'rgba(80,40,20,0)'); vg.addColorStop(1, 'rgba(80,40,20,0.18)');
    c.fillStyle = vg; c.fillRect(0, 300, 1280, 132);
  }
  function paintLedge(c) {
    c.translate(0, -420);
    c.fillStyle = '#9a5a34'; c.fillRect(0, 456, 1280, 110);
    for (var px = 14; px < 1280; px += 158) A.box(c, px, 474, 138, 80, 8, '#8a4f2d', 2.5, '#5e3520');
    A.box(c, -10, 424, 1300, 26, 6, '#dca777', 3);
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, 428, 1280, 4);
    A.box(c, -10, 446, 1300, 14, 4, '#b06f43', 3);
    // little garland along the lip
    for (var gx = 0; gx <= 1290; gx += 13) {
      var gy = 462 + Math.abs(Math.sin(gx / 160 * Math.PI)) * 12;
      A.circle(c, gx, gy, 7, gx % 26 ? C.pine : C.pineDark, 1.8);
    }
    for (var bx = 40; bx < 1280; bx += 80) A.circle(c, bx, 462 + Math.abs(Math.sin(bx / 160 * Math.PI)) * 12 + 3, 3.5, C.red, 1.5);
  }
  function paintFront(c) {
    c.translate(0, -540);
    var g = c.createLinearGradient(0, 545, 0, 652);
    g.addColorStop(0, '#e9c79a'); g.addColorStop(1, '#f4dcb6');
    c.fillStyle = g; c.fillRect(0, 545, 1280, 110);
    c.strokeStyle = 'rgba(150,90,50,0.16)'; c.lineWidth = 2;
    for (var bx = 70; bx < 1280; bx += 120) { c.beginPath(); c.moveTo(bx, 546); c.lineTo(bx - 8, 650); c.stroke(); }
    var rnd = U.seeded(5);
    for (var i = 0; i < 26; i++) { var gx = rnd() * 1280, gy = 556 + rnd() * 86; c.beginPath(); c.moveTo(gx, gy); c.quadraticCurveTo(gx + 30, gy - 4, gx + 64, gy + 1); c.stroke(); }
    A.line(c, [-5, 545, 1285, 545], 3);
    A.box(c, -10, 650, 1300, 40, 6, '#b06f43', 3);
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(0, 655, 1280, 5);
    // station board
    c.fillStyle = '#6f3f25'; c.fillRect(0, 690, 1280, 220);
    A.line(c, [-5, 690, 1285, 690], 3);
    [[36, 400], [452, 396], [866, 398]].forEach(function (p) {
      A.box(c, p[0], 694, p[1], 196, 20, '#8f5634', 3);
      c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(p[0] + 12, 700, p[1] - 24, 6);
    });
    TILE_DEFS.forEach(function (d) { A.shadow(c, d.cx, TILE_Y + TILE_H + 4, 54, 6, 0.3); });
    // the build mat
    A.shadow(c, MAT_X, MAT_Y + 2, 104, 26, 0.18);
    A.ellipse(c, MAT_X, MAT_Y - 4, 96, 24, C.teal, 3);
    A.ellipse(c, MAT_X, MAT_Y - 5, 78, 18, null, 3, C.tealDark);
    A.ellipse(c, MAT_X, MAT_Y - 6, 56, 12, null, 2.5, '#7fe0d0');
  }

  // ---------------------------------------------------------------------------
  // Tutorial cards
  // ---------------------------------------------------------------------------
  var TUT_LOOK_1 = { species: 'fox', palette: 'cream', outfit: { head: 'beanie_red' } };
  var TUT_LOOK_2 = { species: 'penguin', palette: 'slate', outfit: { head: 'earmuffs' } };
  function tutCounter(ctx, w, h, y) {
    A.box(ctx, -10, y, w + 20, 16, 5, '#dca777', 2.5);
    ctx.fillStyle = '#9a5a34'; ctx.fillRect(0, y + 16, w, h - y);
    A.line(ctx, [-5, y + 16, w + 5, y + 16], 2.5);
  }
  var tutorial = [
    {
      caption: 'See what they want',
      draw: function (ctx, w, h, t) {
        wallBg(ctx, w, h);
        CH.draw(ctx, 262, 236, TUT_LOOK_1, { t: t, scale: 1.2, dir: -1 });
        tutCounter(ctx, w, h, 196);
        var k = U.easeOutBack(Math.min(1, (t % 4) / 0.45));
        ctx.save(); ctx.translate(112, 156); ctx.scale(k, k);
        bubblePath(ctx, 170, 136, 70, 26);
        drawMug(ctx, -8, -20, 0.98, { cup: 'blue', drink: 'cocoa', top: 'cream', t: t, steam: true, steamCol: 'rgba(130,150,200,0.6)' });
        ctx.restore();
      }
    },
    {
      caption: 'Tap to make it',
      draw: function (ctx, w, h, t) {
        wallBg(ctx, w, h);
        ctx.fillStyle = '#efd1a6'; ctx.fillRect(0, 118, w, 34); A.line(ctx, [-5, 118, w + 5, 118], 2.5);
        ctx.fillStyle = '#6f3f25'; ctx.fillRect(0, 150, w, 90); A.line(ctx, [-5, 150, w + 5, 150], 2.5);
        var ph = t % 4.8;
        var xs = [62, 180, 298];
        A.ellipse(ctx, 180, 140, 52, 12, C.teal, 2.5);
        xs.forEach(function (x, i) {
          var tapAt = 0.8 + i * 1.6, pr = ph > tapAt && ph < tapAt + 0.25 ? 1 : 0;
          ctx.save(); ctx.translate(x, 196); ctx.scale(1 - pr * 0.08, 1 - pr * 0.08);
          A.box(ctx, -46, -40, 92, 80, 14, '#fff6e6', 2.5);
          if (i === 0) drawMug(ctx, -4, 30, 0.75, { cup: 'red' });
          else if (i === 1) drawDispenser(ctx, -3, 36, 0.56, 'cocoa', 3);
          else drawToppingIcon(ctx, 'cream', 0, 34, 0.6, 3);
          ctx.restore();
        });
        if (ph > 0.8) {
          var cp = Math.min(1, (ph - 0.8) / 0.25);
          var fill = ph < 2.4 ? 0 : Math.min(1, (ph - 2.4) / 0.5);
          var tp = ph < 4.0 ? 0 : (ph - 4.0) / 0.3;
          drawMug(ctx, 176, 142 - (1 - cp) * 30, 0.86 * (0.6 + 0.4 * cp), { cup: 'red', drink: ph > 2.4 ? 'cocoa' : null, fill: fill, top: ph > 4.0 ? 'cream' : null, topPop: tp, t: t, steam: true });
        }
        // finger moves between the three buttons
        var seg = Math.floor(ph / 1.6), local = (ph - seg * 1.6) / 1.6;
        var from = seg === 0 ? 330 : xs[seg - 1], to = xs[seg];
        var fx = U.lerp(from, to, U.ease(Math.min(1, local / 0.45)));
        var down = local > 0.45 && local < 0.65 ? 1 : 0;
        drawFinger(ctx, fx + 6, 196 + down * 6, 0.62, down);
      }
    },
    {
      caption: 'Ring the bell to serve',
      draw: function (ctx, w, h, t) {
        wallBg(ctx, w, h);
        var ph = t % 3.8;
        var happy = ph > 1.4;
        CH.draw(ctx, 292, 196, TUT_LOOK_2, { t: t, scale: 1.05, dir: -1, pose: happy ? 'happy' : 'stand' });
        tutCounter(ctx, w, h, 150);
        drawBell(ctx, 180, 214, 0.55, ph > 0.7 && ph < 1.5 ? 1 - (ph - 0.7) / 0.8 : 0, ph > 0.7 && ph < 0.9);
        var mx = 78, my = 222, ms = 0.8;
        if (ph > 0.9) { var p = Math.min(1, (ph - 0.9) / 0.5); mx = U.lerp(78, 250, p); my = U.lerp(222, 162, p) - Math.sin(p * Math.PI) * 60; ms = U.lerp(0.8, 0.62, p); }
        if (ph < 0.9 || ph < 3.5) drawMug(ctx, mx, my, ms, { cup: 'yellow', drink: 'pink', top: 'sprinkles', t: t, steam: true });
        if (happy) {
          var q = ph - 1.4;
          for (var i = 0; i < 4; i++) {
            var hy = 120 - q * 50 - i * 18, hx = 280 + Math.sin(q * 4 + i * 2) * 18 + (i - 1.5) * 16;
            ctx.globalAlpha = Math.max(0, 1 - q / 2.2); A.heart(ctx, hx, hy, 9 + i % 2 * 3, '#ff6f91', 2); ctx.globalAlpha = 1;
          }
          var cq = Math.min(1, q / 0.6);
          if (q < 0.9) A.coin(ctx, U.lerp(280, 340, cq), U.lerp(110, 28, cq) - Math.sin(cq * Math.PI) * 30, 12, t * 8);
          else { A.coin(ctx, 340, 28, 12, t * 2); }
        }
        var fx, fy, press = 0;
        if (ph < 0.7) { var a = ph / 0.7; fx = U.lerp(80, 186, U.ease(a)); fy = U.lerp(120, 172, U.ease(a)); }
        else if (ph < 0.95) { fx = 186; fy = 178; press = 1; }
        else { fx = 186; fy = 172 - (ph - 0.95) * 30; }
        if (ph < 1.6) drawFinger(ctx, fx, fy, 0.6, press);
      }
    }
  ];

  // ---------------------------------------------------------------------------
  // The game
  // ---------------------------------------------------------------------------
  AB.registerMinigame({
    id: 'cocoa',
    title: 'Cocoa Café',
    tutorial: tutorial,
    create: function (host) {
      function sfx(n) { try { if (host.sfx) host.sfx(n); } catch (e) { /* sound is optional */ } }

      // Bake static art.
      var bgBake = A.bake(1280, 432, 2, paintRoom);
      var ledgeBake = A.bake(1280, 140, 2, paintLedge);
      var frontBake = A.bake(1280, 360, 2, paintFront);
      var snow = new A.SnowField(70, 1280, 320, { wind: 10 });

      // The barista (child's own character) wears a café apron if no sweater is on.
      var bLook;
      try { bLook = JSON.parse(JSON.stringify(host.look || { species: 'penguin' })); } catch (e) { bLook = { species: 'penguin' }; }
      bLook.outfit = bLook.outfit || {};
      if (!bLook.outfit.body) bLook.outfit.body = 'apron';

      var HEADS = [], NECKS = [], BODIES = [];
      Object.keys(CH.clothes).forEach(function (k) {
        var it = CH.clothes[k]; if (it.price < 0) return;
        if (it.slot === 'head') HEADS.push(k); else if (it.slot === 'neck') NECKS.push(k); else if (it.slot === 'body') BODIES.push(k);
      });

      // String-light bulbs along three swags.
      var bulbs = [];
      var anchors = [120, 470, 860, 1280];
      for (var ai = 0; ai < anchors.length - 1; ai++) {
        for (var bi = 1; bi < 8; bi++) {
          var u = bi / 8, bxp = U.lerp(anchors[ai], anchors[ai + 1], u);
          bulbs.push({ x: bxp, y: 18 + 44 * 4 * u * (1 - u), c: BULB_COLS[bulbs.length % BULB_COLS.length], ph: bulbs.length * 1.3 });
        }
      }

      var st = {
        time: 0, left: ROUND, done: false, endT: 0, finished: false,
        served: 0, perfect: 0, earned: 0, shown: 15, stage: 0,
        spawnT: 0.6, idle: 0, taughtTop: false, taughtDrink: false,
        bPose: 'stand', bPoseT: 0, bellRing: 0, bellPress: 0, trashAnim: 0, jarJig: 0, matWig: 0, coinSfxT: 0
      };
      var tiles = TILE_DEFS.map(function (d) { return { kind: d.kind, val: d.val, cx: d.cx, unlock: d.unlock, press: 0, wig: 0, pop: 1 }; });
      var customers = [];
      var particles = [];
      var build = newBuild();
      var pour = null, fly = null, binFly = null, drag = null;
      var focus = { show: false, i: 0 };
      var lastOrder = null, lastSpecies = null;

      function newBuild() { return { cup: null, drink: null, top: null, fill: 0, topPop: 1, cupFly: 1, fromX: 0, fromY: 0, pop: 0 }; }
      function orderKey(o) { return o.cup + '|' + o.drink + '|' + (o.top || '-'); }
      function matches(o, m) { return (o.cup === m.cup ? 1 : 0) + (o.drink === m.drink ? 1 : 0) + ((o.top || null) === (m.top || null) ? 1 : 0); }
      function spotCount() { return st.stage >= 4 ? 3 : st.stage >= 3 ? 2 : 1; }
      function calcStage() {
        var s = 0, n = st.served, t = st.time;
        if (n >= 3 || t >= 20) s = 1;
        if (s >= 1 && (n >= 6 || t >= 40)) s = 2;
        if (s >= 2 && (n >= 9 || t >= 55)) s = 3;
        if (s >= 3 && n >= 13) s = 4;
        return s;
      }
      function tileTop(i) { return { x: tiles[i].cx, y: TILE_Y + 40 }; }

      // ---- customers ---------------------------------------------------------
      function randomLook() {
        var sp, guard = 0;
        do { sp = U.pick(CH.ORDER); guard++; } while (sp === lastSpecies && guard < 6);
        lastSpecies = sp;
        var outfit = {};
        if (Math.random() < 0.8 && HEADS.length) outfit.head = U.pick(HEADS);
        if (Math.random() < 0.5 && NECKS.length) outfit.neck = U.pick(NECKS);
        if (Math.random() < 0.35 && BODIES.length) outfit.body = U.pick(BODIES);
        return { species: sp, palette: U.pick(CH.species[sp].palettes).id, outfit: outfit };
      }
      function newOrder() {
        var used = {};
        customers.forEach(function (c) { if (c.order && c.state !== 'leave') used[orderKey(c.order)] = true; });
        var o;
        for (var k = 0; k < 10; k++) {
          o = { cup: U.pick(CUP_IDS), drink: 'cocoa', top: null };
          if (st.stage >= 2) o.drink = (!st.taughtDrink || Math.random() < 0.66) ? U.pick(['pink', 'mint']) : 'cocoa';
          if (st.stage >= 1) o.top = (!st.taughtTop || Math.random() > 0.22) ? U.pick(TOP_IDS) : null;
          if (used[orderKey(o)]) continue;
          if (lastOrder && orderKey(o) === orderKey(lastOrder)) continue;
          break;
        }
        if (o.top) st.taughtTop = true;
        if (o.drink !== 'cocoa') st.taughtDrink = true;
        lastOrder = o;
        return o;
      }
      function spawnCustomer() {
        var n = spotCount(), taken = {};
        customers.forEach(function (c) { if (c.state !== 'leave') taken[c.slot] = true; });
        var slot = -1;
        for (var i = 0; i < n; i++) if (!taken[i]) { slot = i; break; }
        if (slot < 0) return;
        var look = randomLook();
        customers.push({
          look: look, slot: slot, x: 1400, tx: SPOTS[n][slot], dir: -1, moving: true, state: 'walk',
          order: newOrder(), patience: 1, rate: 1 / (n > 1 ? 60 : 50), t: 0, seed: Math.random() * 10,
          bubble: 0, pose: 'stand', timer: 0, result: null, carry: null,
          top: Math.abs(CH.species[look.species].anchors.top) * CUST_S
        });
      }
      function shrug(c) {
        c.state = 'served'; c.result = 'shrug'; c.timer = 1.5; c.pose = 'stand'; c.bubble = 0;
        give(1, c.x, FEET_Y - c.top * 0.6);
        sfx('pop');
      }
      function give(v, x, y) {
        st.earned += v;
        var n = Math.min(v, 6), base = Math.floor(v / n), extra = v - base * n;
        for (var i = 0; i < n; i++) {
          particles.push({ k: 'coin', x0: x + U.rand(-20, 20), y0: y + U.rand(-10, 10), x1: JAR.x, y1: JAR.y - 70, t: -i * 0.1, dur: 0.75, val: base + (i < extra ? 1 : 0), spin: Math.random() * 6 });
        }
      }
      function burst(kind, x, y, n, opt) {
        opt = opt || {};
        for (var i = 0; i < n; i++) {
          var a = Math.random() * Math.PI * 2, sp = U.rand(60, 220) * (opt.speed || 1);
          particles.push({
            k: kind, x: x + U.rand(-10, 10), y: y + U.rand(-10, 10),
            vx: kind === 'heart' ? U.rand(-70, 70) : Math.cos(a) * sp, vy: kind === 'heart' ? U.rand(-170, -90) : Math.sin(a) * sp,
            life: 0, max: kind === 'heart' ? U.rand(1.1, 1.6) : U.rand(0.4, 0.8), s: kind === 'heart' ? U.rand(10, 18) * (opt.size || 1) : U.rand(6, 13),
            col: opt.col || U.pick(['#ff6f91', '#ff8fb1', '#ffb3c8']), ph: Math.random() * 6
          });
        }
      }
      function resolve(c, mug) {
        var m = matches(c.order, mug);
        c.state = 'served'; c.carry = mug; c.timer = 2.0; c.bubble = 0;
        st.served++;
        var hx = c.x, hy = FEET_Y - c.top;
        if (m === 3) {
          var tip = c.patience > 0.5 ? 1 : 0;
          c.result = 'perfect'; c.pose = 'happy';
          st.perfect++;
          give(6 + tip, hx, hy + 40);
          burst('heart', hx, hy, 7); burst('spark', hx, hy + 30, 10);
          sfx('success');
          st.bPose = 'happy'; st.bPoseT = 1.5;
          burst('heart', BAR_X + 10, BAR_Y - 200, 3, { size: 0.8 });
        } else {
          c.result = 'ok'; c.pose = 'wave';
          give(m >= 2 ? 2 : 1, hx, hy + 40);
          burst('heart', hx, hy, 2, { size: 0.8 });
          sfx('ding');
          st.bPose = 'wave'; st.bPoseT = 1.0;
        }
        st.spawnT = Math.max(st.spawnT, 1.2);
      }

      // ---- player actions ------------------------------------------------------
      function hintKind(kind) {
        tiles.forEach(function (tl) { if (tl.kind === kind && tl.unlock <= st.stage) tl.wig = 1; });
        sfx('tap');
      }
      function pressTile(i) {
        var tl = tiles[i]; if (!tl) return;
        if (tl.unlock > st.stage) { tl.wig = 0.6; sfx('tap'); return; }
        tl.press = 1;
        if (tl.kind === 'cup') {
          if (build.cup === tl.val) { build.pop = 1; sfx('tap'); return; }
          if (!build.cup) { build.cupFly = 0; build.fromX = tl.cx; build.fromY = TILE_Y + 150; }
          else build.pop = 1;
          build.cup = tl.val;
          sfx('pop');
          st.bPose = 'wave'; st.bPoseT = 0.35;
        } else if (tl.kind === 'drink') {
          if (!build.cup) { hintKind('cup'); return; }
          if (build.drink === tl.val && (build.fill >= 1 || pour)) { build.pop = 1; sfx('tap'); return; }
          build.drink = tl.val; build.fill = 0;
          pour = { t: 0, dur: 0.95, drink: tl.val, fromX: tl.cx, fromY: TILE_Y + 60, b: build };
          sfx('splash');
          st.bPose = 'wave'; st.bPoseT = 0.9;
        } else {
          if (!build.cup) { hintKind('cup'); return; }
          if (!build.drink) { hintKind('drink'); return; }
          if (build.top === tl.val) { build.pop = 1; sfx('tap'); return; }
          build.top = tl.val; build.topPop = 0;
          sfx('pop');
          st.bPose = 'wave'; st.bPoseT = 0.35;
        }
      }
      function binIt() {
        st.trashAnim = 1;
        if (!build.cup) { sfx('tap'); return; }
        binFly = { mug: build, t: 0, x0: MAT_X, y0: MAT_Y };
        if (pour && pour.b === build) pour = null;
        build = newBuild();
        sfx('whoosh');
      }
      function waitingCustomers() { return customers.filter(function (c) { return c.state === 'wait'; }); }
      function bestCustomer(list, mug) {
        var best = null, bs = -1;
        list.forEach(function (c) {
          var s = matches(c.order, mug) * 10 + (1 - c.patience);
          if (s > bs) { bs = s; best = c; }
        });
        return best;
      }
      function serve(target, how, fromX, fromY) {
        if (fly) return false;
        if (how === 'bell') { st.bellRing = 1; st.bellPress = 0.2; }
        if (!build.cup) { hintKind('cup'); return false; }
        if (!build.drink) { hintKind('drink'); return false; }
        if (build.fill < 1) return false;
        var list = waitingCustomers();
        if (!list.length) { st.matWig = 1; if (how === 'bell') sfx('bell'); else sfx('tap'); return false; }
        if (!target || target.state !== 'wait') target = bestCustomer(list, build);
        sfx(how === 'bell' ? 'bell' : 'whoosh');
        if (how === 'bell') sfx('whoosh');
        fly = { mug: build, c: target, t: 0, x0: fromX == null ? MAT_X : fromX, y0: fromY == null ? MAT_Y : fromY, s0: MUG_S };
        target.state = 'incoming';
        build = newBuild();
        return true;
      }
      function activateFocus() {
        if (focus.i < 9) pressTile(focus.i);
        else if (focus.i === 9) binIt();
        else serve(null, 'bell');
      }
      function customerAt(x, y) {
        var best = null, bd = 1e9;
        customers.forEach(function (c) {
          if (c.state !== 'wait') return;
          var dx = Math.abs(x - c.x);
          if (dx < 105 && y > FEET_Y - c.top - 190 && y < FEET_Y + 10 && dx < bd) { bd = dx; best = c; }
        });
        return best;
      }

      // ---- update --------------------------------------------------------------
      function updateCustomers(dt) {
        var n = spotCount(), spots = SPOTS[n];
        for (var i = customers.length - 1; i >= 0; i--) {
          var c = customers[i];
          c.t += dt;
          if (c.state !== 'leave' && c.slot < spots.length) c.tx = spots[c.slot];
          var dx = c.tx - c.x, sp = 320 * dt;
          if (Math.abs(dx) > 2) { c.x += U.clamp(dx, -sp, sp); c.moving = true; c.dir = dx < 0 ? -1 : 1; }
          else { c.x = c.tx; c.moving = false; if (c.state !== 'leave') c.dir = -1; }
          if (c.state === 'walk') {
            if (!c.moving) { c.state = 'wait'; c.bubble = 0; sfx('pop'); }
          } else if (c.state === 'wait' || c.state === 'incoming') {
            c.bubble = Math.min(1, c.bubble + dt * 2.5);
            if (c.state === 'wait' && !st.done) { c.patience -= c.rate * dt; if (c.patience <= 0) { c.patience = 0; shrug(c); } }
          } else if (c.state === 'served') {
            c.bubble = Math.min(1, c.bubble + dt * 3);
            c.timer -= dt;
            if (c.timer <= 0) { c.state = 'leave'; c.tx = 1470; c.pose = 'stand'; }
          } else if (c.state === 'leave' && c.x > 1430) customers.splice(i, 1);
        }
      }
      function updateParticles(dt) {
        for (var i = particles.length - 1; i >= 0; i--) {
          var p = particles[i];
          if (p.k === 'coin') {
            p.t += dt;
            if (p.t >= p.dur) {
              st.shown = Math.min(120, st.shown + p.val); st.jarJig = 1;
              if (st.coinSfxT <= 0) { sfx('coin'); st.coinSfxT = 0.07; }
              particles.splice(i, 1);
            }
            continue;
          }
          p.life += dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.k === 'spark') { p.vx *= 0.92; p.vy *= 0.92; }
          if (p.k === 'heart') p.x += Math.sin(p.life * 5 + p.ph) * 30 * dt;
          if (p.life >= p.max) particles.splice(i, 1);
        }
      }
      function finish() {
        if (st.finished) return;
        st.finished = true;
        var coins = Math.max(15, Math.min(120, Math.round(15 + st.earned)));
        try {
          host.finish({
            score: st.earned,
            coins: coins,
            stats: [
              { icon: 'mug', label: 'Drinks', value: st.served },
              { icon: 'star', label: 'Perfect', value: st.perfect }
            ]
          });
        } catch (e) { /* shell problems must not break the loop */ }
      }

      function update(dt) {
        if (st.finished) return;
        st.time += dt;
        snow.update(dt);
        st.coinSfxT -= dt;
        st.bellRing = Math.max(0, st.bellRing - dt * 1.6);
        st.bellPress = Math.max(0, st.bellPress - dt);
        st.trashAnim = Math.max(0, st.trashAnim - dt * 2.5);
        st.jarJig = Math.max(0, st.jarJig - dt * 3);
        st.matWig = Math.max(0, st.matWig - dt * 2.5);
        if (st.bPoseT > 0) { st.bPoseT -= dt; if (st.bPoseT <= 0) st.bPose = 'stand'; }
        tiles.forEach(function (tl) { tl.press = Math.max(0, tl.press - dt * 4); tl.wig = Math.max(0, tl.wig - dt * 1.8); tl.pop = Math.min(1, tl.pop + dt * 1.8); });

        if (!st.done) {
          st.left = Math.max(0, ROUND - st.time);
          var ns = calcStage();
          if (ns > st.stage) {
            var prev = st.stage; st.stage = ns;
            var any = false;
            tiles.forEach(function (tl) {
              if (tl.unlock > prev && tl.unlock <= ns) { tl.pop = 0; any = true; burst('spark', tl.cx, TILE_Y + 90, 10, { speed: 0.8 }); }
            });
            if (any) sfx('star');
          }
          st.spawnT -= dt;
          var active = customers.filter(function (c) { return c.state !== 'leave'; }).length;
          if (active < spotCount() && st.spawnT <= 0 && st.left > 4) { spawnCustomer(); st.spawnT = 1.3; }
          if (waitingCustomers().length && !fly && !drag) st.idle += dt; else st.idle = 0;
          if (st.left <= 0) {
            st.done = true; st.endT = 0; drag = null; focus.show = false;
            sfx('bell');
            st.bPose = 'happy'; st.bPoseT = 3;
            for (var b = 0; b < 4; b++) burst('heart', 640, 320, 4, { size: 1.2 });
          }
        } else {
          st.endT += dt;
          if (st.endT > 2.2) { finish(); return; }
        }

        // build animations
        build.pop = Math.max(0, build.pop - dt * 4);
        build.cupFly = Math.min(1, build.cupFly + dt / 0.28);
        if (pour) {
          pour.t += dt;
          var p = pour.t / pour.dur;
          if (pour.b === build) build.fill = p < 0.27 ? 0 : Math.min(1, (p - 0.27) / 0.53);
          if (p > 0.3 && p < 0.8 && Math.random() < dt * 14) burst('spark', MAT_X + U.rand(-30, 30), MAT_Y - 110, 1, { speed: 0.3 });
          if (p >= 1) { if (pour.b === build) build.fill = 1; pour = null; }
        }
        if (build.top && build.fill >= 1 && build.topPop < 1) {
          var was = build.topPop;
          build.topPop = Math.min(1, build.topPop + dt / 0.32);
          if (was < 0.6 && build.topPop >= 0.6) burst('spark', MAT_X, MAT_Y - 120, 6, { speed: 0.6 });
        }
        if (fly) {
          fly.t += dt / 0.48;
          if (fly.t >= 1) { var fc = fly.c, fm = fly.mug; fly = null; if (customers.indexOf(fc) >= 0) resolve(fc, fm); }
        }
        if (binFly) { binFly.t += dt / 0.38; if (binFly.t >= 1) { binFly = null; st.trashAnim = 1; burst('spark', TRASH.x, TRASH.y - 80, 6, { speed: 0.6 }); } }
        updateCustomers(dt);
        updateParticles(dt);
      }

      // ---- draw ------------------------------------------------------------------
      function drawLights(ctx, t) {
        ctx.save();
        ctx.strokeStyle = C.out; ctx.lineWidth = 2;
        for (var ai = 0; ai < anchors.length - 1; ai++) {
          ctx.beginPath(); ctx.moveTo(anchors[ai], 18);
          ctx.quadraticCurveTo((anchors[ai] + anchors[ai + 1]) / 2, 18 + 88, anchors[ai + 1], 18); ctx.stroke();
        }
        for (var i = 0; i < bulbs.length; i++) {
          var b = bulbs[i], on = 0.55 + 0.45 * Math.sin(t * 2.2 + b.ph);
          A.glow(ctx, b.x, b.y + 9, 22, 'rgba(255,220,150,', 0.35 * on);
          A.box(ctx, b.x - 3, b.y - 2, 6, 6, 1, '#4d5a78', 1.5);
          A.ellipse(ctx, b.x, b.y + 10, 5.5, 8, b.c, 2);
          A.highlight(ctx, b.x - 1.5, b.y + 7, 1.5, 2.5, 0.4 + 0.5 * on);
        }
        ctx.restore();
      }
      function drawFire(ctx, t) {
        A.glow(ctx, FIRE.x, FIRE.y - 50, 300 + Math.sin(t * 3) * 10, C.lampGlow, 0.22);
        ctx.save();
        ctx.beginPath(); ctx.moveTo(654, 440); ctx.lineTo(654, 336); ctx.arc(710, 336, 56, Math.PI, 0); ctx.lineTo(766, 440); ctx.closePath(); ctx.clip();
        A.glow(ctx, FIRE.x, FIRE.y - 20, 80, 'rgba(255,150,60,', 0.6);
        var layers = [['#ff7a3c', 1, 0], ['#ffb347', 0.72, 1.3], ['#fff0a0', 0.42, 2.6]];
        for (var L = 0; L < layers.length; L++) {
          var sc = layers[L][1], ph = layers[L][2];
          for (var f = -1; f <= 1; f++) {
            var fx = FIRE.x + f * 22 * sc, hgt = (64 - Math.abs(f) * 18) * sc * (0.85 + 0.15 * Math.sin(t * 9 + f * 2 + ph)), wd = 18 * sc;
            var sway = Math.sin(t * 6 + f + ph) * 5 * sc;
            ctx.beginPath(); ctx.moveTo(fx - wd, FIRE.y - 14);
            ctx.quadraticCurveTo(fx - wd, FIRE.y - 14 - hgt * 0.55, fx + sway, FIRE.y - 14 - hgt);
            ctx.quadraticCurveTo(fx + wd, FIRE.y - 14 - hgt * 0.55, fx + wd, FIRE.y - 14);
            ctx.closePath(); A.fs(ctx, layers[L][0], L === 0 ? 2.5 : 0);
          }
        }
        ctx.restore();
      }
      function drawCustomer(ctx, c, t) {
        CH.draw(ctx, c.x, FEET_Y, c.look, { t: t + c.seed, moving: c.moving, dir: c.dir, pose: c.pose, scale: CUST_S, blinkOffset: c.seed });
        if (c.state === 'leave' && c.carry) {
          drawMug(ctx, c.x + 26 * c.dir, FEET_Y - c.top * 0.42 + Math.sin(t * 12) * 2, 0.75, { cup: c.carry.cup, drink: c.carry.drink, top: c.carry.top, t: t, steam: true });
        }
      }
      function drawBubble(ctx, c, t) {
        var bottom = Math.max(FEET_Y - c.top - 16, 290);
        var bx = U.clamp(c.x - 10, 120, 1170);
        var k = U.easeOutBack(U.clamp(c.bubble, 0, 1));
        if (k <= 0.01) return;
        ctx.save(); ctx.translate(bx, bottom); ctx.scale(k, k);
        if (c.state === 'wait' || c.state === 'incoming') {
          ctx.save(); ctx.translate(4, 6); ctx.globalAlpha = 0.15; ctx.fillStyle = C.out; ctx.beginPath(); A.rrect(ctx, -100, -170, 200, 170, 28); ctx.fill(); ctx.restore();
          bubblePath(ctx, 200, 170, (c.x - bx) - 4, 24);
          drawMug(ctx, -10, -30, 1.3, { cup: c.order.cup, drink: c.order.drink, top: c.order.top, t: t + c.seed, steam: true, steamCol: 'rgba(130,150,200,0.55)' });
          if (st.stage >= 2) {
            // drink badge so pink / mint / cocoa stay readable under any topping
            A.circle(ctx, -76, -34, 21, DRINKS[c.order.drink].hi, 3);
            drawDrinkSymbol(ctx, c.order.drink, -76, -34, 3);
          }
          // patience hearts (slowly fade; never angry)
          var n = Math.ceil(c.patience * 3 - 0.001);
          for (var i = 0; i < 3; i++) {
            var hy = -128 + i * 36, full = (2 - i) < n;
            var pulse = (full && n === 1) ? 1 + Math.sin(t * 6) * 0.12 : 1;
            ctx.save(); ctx.translate(78, hy + 6); ctx.scale(pulse, pulse);
            A.heart(ctx, 0, 0, 10, full ? '#ff6f91' : '#ece6ef', full ? 2 : 1.6);
            ctx.restore();
          }
        } else if (c.state === 'served') {
          var w = c.result === 'perfect' ? 150 : 120, h = c.result === 'perfect' ? 130 : 104;
          bubblePath(ctx, w, h, (c.x - bx) - 4, 22);
          if (c.result === 'perfect') {
            var pul = 1 + Math.sin(t * 8) * 0.07;
            ctx.save(); ctx.translate(0, -62); ctx.scale(pul, pul); A.heart(ctx, 0, 14, 40, '#ff5f87', 3); A.highlight(ctx, -14, -6, 7, 4, 0.7); ctx.restore();
            A.sparkle(ctx, -54, -102, 9, 0.8 + 0.2 * Math.sin(t * 7)); A.sparkle(ctx, 52, -30, 7, 0.8 + 0.2 * Math.sin(t * 6 + 1));
          } else if (c.result === 'ok') {
            A.heart(ctx, 0, -40, 26, '#ffa3bd', 2.5);
          } else {
            for (var d = -1; d <= 1; d++) A.circle(ctx, d * 24, -52, 8, '#aab6cf', 2);
          }
        }
        ctx.restore();
      }
      function drawTrash(ctx, t) {
        var x = TRASH.x, y = TRASH.y, lid = Math.sin(st.trashAnim * Math.PI) * 0.8;
        A.shadow(ctx, x, y + 2, 50, 10);
        A.shape(ctx, function (c) { c.moveTo(x - 38, y - 82); c.lineTo(x - 30, y); c.lineTo(x + 30, y); c.lineTo(x + 38, y - 82); c.closePath(); }, '#62b6cc', 0);
        ctx.save(); ctx.beginPath(); ctx.moveTo(x - 38, y - 82); ctx.lineTo(x - 30, y); ctx.lineTo(x + 30, y); ctx.lineTo(x + 38, y - 82); ctx.closePath(); ctx.clip();
        ctx.fillStyle = 'rgba(30,40,90,0.18)'; ctx.fillRect(x + 12, y - 90, 30, 92); ctx.restore();
        A.shape(ctx, function (c) { c.moveTo(x - 38, y - 82); c.lineTo(x - 30, y); c.lineTo(x + 30, y); c.lineTo(x + 38, y - 82); c.closePath(); }, null, 3);
        // undo arrow
        ctx.save(); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(x, y - 40, 17, Math.PI * 0.95, Math.PI * 2.55);
        ctx.lineWidth = 10; ctx.strokeStyle = C.out; ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        ctx.restore();
        A.poly(ctx, [x - 27, y - 46, x - 9, y - 46, x - 18, y - 30], '#ffffff', 2.5);
        A.highlight(ctx, x - 24, y - 66, 4, 9, 0.45);
        ctx.save(); ctx.translate(x - 42, y - 82); ctx.rotate(-lid);
        A.box(ctx, 0, -12, 84, 14, 6, '#4aa0b8', 3); A.box(ctx, 32, -21, 20, 10, 4, '#4aa0b8', 3);
        ctx.restore();
      }
      function drawJar(ctx, t) {
        var x = JAR.x, y = JAR.y, jig = Math.sin(st.jarJig * 20) * st.jarJig * 0.06;
        A.shadow(ctx, x, y + 2, 50, 9);
        ctx.save(); ctx.translate(x, y); ctx.rotate(jig);
        ctx.beginPath(); A.rrect(ctx, -40, -100, 80, 100, 20); A.fs(ctx, 'rgba(228,244,255,0.9)', 0);
        ctx.save(); ctx.beginPath(); A.rrect(ctx, -40, -100, 80, 100, 20); ctx.clip();
        var n = Math.min(30, Math.max(0, st.shown - 15));
        for (var i = 0; i < n; i++) {
          var row = Math.floor(i / 5), col = i % 5;
          A.coin(ctx, -26 + col * 13 + (row % 2) * 6, -10 - row * 13, 10, 0.4 + col);
        }
        ctx.fillStyle = 'rgba(30,40,90,0.12)'; ctx.fillRect(18, -104, 30, 104);
        ctx.restore();
        ctx.beginPath(); A.rrect(ctx, -40, -100, 80, 100, 20); A.fs(ctx, null, 3);
        A.ellipse(ctx, 0, -100, 36, 8, 'rgba(240,250,255,0.9)', 3);
        A.box(ctx, -30, -86, 7, 60, 3.5, 'rgba(255,255,255,0.6)', 0);
        A.box(ctx, -40, -60, 80, 22, 4, C.red, 2.5);
        A.heart(ctx, 0, -46, 8, '#ffffff', 2);
        ctx.restore();
      }
      function drawTiles(ctx, t) {
        for (var i = 0; i < tiles.length; i++) {
          var tl = tiles[i], locked = tl.unlock > st.stage;
          ctx.save(); ctx.translate(tl.cx, TILE_Y + TILE_H / 2);
          var sc = 1 - 0.1 * Math.sin(tl.press * Math.PI);
          if (tl.pop < 1) sc *= Math.max(0.01, U.easeOutBack(tl.pop));
          ctx.scale(sc, sc);
          if (tl.wig > 0) ctx.rotate(Math.sin(t * 28) * 0.08 * tl.wig);
          if (locked) {
            ctx.setLineDash([10, 8]);
            A.box(ctx, -TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 18, 'rgba(255,240,220,0.08)', 3, 'rgba(255,230,200,0.35)');
            ctx.setLineDash([]);
            A.snowflake(ctx, 0, 0, 18, 'rgba(255,240,220,0.35)', 3);
            ctx.restore(); continue;
          }
          A.box(ctx, -TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 18, '#fff6e6', 3);
          ctx.save(); ctx.beginPath(); A.rrect(ctx, -TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 18); ctx.clip();
          ctx.fillStyle = 'rgba(210,150,100,0.18)'; ctx.fillRect(-70, 52, 140, 50);
          ctx.restore();
          ctx.beginPath(); A.rrect(ctx, -TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 18); A.fs(ctx, null, 3);
          if (tl.kind === 'cup') {
            A.ellipse(ctx, -2, 56, 46, 9, '#ecd9bb', 2.5);
            drawMug(ctx, -7, 56, 1.4, { cup: tl.val });
          } else if (tl.kind === 'drink') {
            drawDispenser(ctx, -4, 72, 1.02, tl.val, 3);
          } else {
            drawToppingIcon(ctx, tl.val, 0, 66, tl.val === 'cream' ? 1.0 : 1.04, 3);
          }
          // small keycap number for keyboard players
          A.circle(ctx, -TILE_W / 2 + 18, -TILE_H / 2 + 18, 13, '#f3dcbc', 2);
          ctx.fillStyle = C.out; ctx.font = '800 17px ' + AB.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(i + 1), -TILE_W / 2 + 18, -TILE_H / 2 + 19);
          ctx.restore();
        }
        if (focus.show && !st.done) {
          var r;
          if (focus.i < 9) r = { x: tiles[focus.i].cx - TILE_W / 2 - 8, y: TILE_Y - 8, w: TILE_W + 16, h: TILE_H + 16 };
          else if (focus.i === 9) r = { x: TRASH.x - 60, y: TRASH.y - 112, w: 120, h: 124 };
          else r = { x: BELL.x - 72, y: BELL.y - 100, w: 144, h: 112 };
          ctx.save(); ctx.setLineDash([14, 9]); ctx.lineDashOffset = -t * 30;
          A.box(ctx, r.x, r.y, r.w, r.h, 22, null, 6, C.yellow);
          ctx.setLineDash([]); ctx.restore();
        }
      }
      function buildMugOpts(b, t) { return { cup: b.cup, drink: b.drink, fill: b.fill, top: b.top, topPop: b.topPop, t: t, steam: true }; }
      function drawBuild(ctx, t) {
        if (!build.cup || drag) return;
        var x = MAT_X, y = MAT_Y, s = MUG_S;
        if (build.cupFly < 1) {
          var p = U.ease(build.cupFly);
          x = U.lerp(build.fromX, MAT_X, p); y = U.lerp(build.fromY, MAT_Y, p) - Math.sin(p * Math.PI) * 80; s = U.lerp(1.4, MUG_S, p);
        }
        var bounce = 1 + Math.sin(build.pop * Math.PI) * 0.1;
        var rot = st.matWig > 0 ? Math.sin(t * 30) * 0.06 * st.matWig : 0;
        var o = buildMugOpts(build, t); o.rot = rot;
        if (build.cupFly >= 1) A.shadow(ctx, x, y - 2, 56, 10, 0.18);
        drawMug(ctx, x, y, s * bounce, o);
      }
      function drawPour(ctx, t) {
        if (!pour) return;
        var p = pour.t / pour.dur, dr = DRINKS[pour.drink];
        var hx = MAT_X - 76, hy = 432, x, y, rot = 0, a = 1;
        if (p < 0.27) { var q = U.ease(p / 0.27); x = U.lerp(pour.fromX, hx, q); y = U.lerp(pour.fromY, hy, q) - Math.sin(q * Math.PI) * 60; rot = q * 0.2; }
        else if (p < 0.8) { x = hx; y = hy; rot = 0.2 + Math.min(1, (p - 0.27) / 0.1) * 0.7; }
        else { var r = (p - 0.8) / 0.2; x = U.lerp(hx, hx - 40, r); y = U.lerp(hy, hy - 60, r); rot = 0.9 * (1 - r); a = 1 - r; }
        if (p > 0.33 && p < 0.8 && pour.b === build) {
          // stream
          var sx = hx + 58, sy = hy + 10, ey = MAT_Y - 112 + (1 - build.fill) * 14;
          var wob = Math.sin(t * 30) * 1.5;
          ctx.save(); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 10, sy + 20, MAT_X - 14 + wob, ey);
          ctx.lineWidth = 15; ctx.strokeStyle = C.out; ctx.stroke(); ctx.lineWidth = 9; ctx.strokeStyle = dr.col; ctx.stroke();
          ctx.restore();
        }
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1.3, 1.3);
        ctx.beginPath(); ctx.arc(-24, -2, 12, Math.PI * 0.5, Math.PI * 1.5); ctx.lineWidth = 9; ctx.strokeStyle = C.out; ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = '#f7f2ea'; ctx.stroke();
        A.poly(ctx, [16, -22, 36, -28, 22, -10], '#f7f2ea', 2.5);
        ctx.beginPath(); A.rrect(ctx, -22, -26, 44, 50, 14); A.fs(ctx, '#f7f2ea', 0);
        ctx.save(); ctx.beginPath(); A.rrect(ctx, -22, -26, 44, 50, 14); ctx.clip();
        ctx.fillStyle = dr.col; ctx.fillRect(-30, -6, 60, 14);
        ctx.fillStyle = 'rgba(30,40,90,0.15)'; ctx.fillRect(8, -30, 20, 60); ctx.restore();
        ctx.beginPath(); A.rrect(ctx, -22, -26, 44, 50, 14); A.fs(ctx, null, 2.5);
        A.highlight(ctx, -12, -14, 3, 7, 0.6);
        ctx.restore();
      }
      function drawFlying(ctx, t) {
        if (fly) {
          var c = fly.c, p = U.clamp(fly.t, 0, 1);
          var x1 = c.x - 46, y1 = 446;
          var x = U.lerp(fly.x0, x1, p), y = U.lerp(fly.y0, y1, p) - Math.sin(p * Math.PI) * 140;
          drawMug(ctx, x, y, U.lerp(fly.s0, 0.95, p), { cup: fly.mug.cup, drink: fly.mug.drink, top: fly.mug.top, t: t, steam: true });
          if (Math.random() < 0.5) burst('spark', x, y - 40, 1, { speed: 0.2 });
        }
        if (binFly) {
          var q = U.clamp(binFly.t, 0, 1);
          var bx = U.lerp(binFly.x0, TRASH.x, q), by = U.lerp(binFly.y0, TRASH.y - 70, q) - Math.sin(q * Math.PI) * 120;
          var o = buildMugOpts(binFly.mug, t); o.rot = -q * 3; o.steam = false;
          ctx.save(); ctx.globalAlpha = q > 0.85 ? (1 - q) / 0.15 : 1;
          drawMug(ctx, bx, by, U.lerp(MUG_S, 0.6, q), o);
          ctx.restore();
        }
        if (drag && build.cup) {
          A.shadow(ctx, drag.x, drag.y + 70, 40, 8, 0.15);
          var od = buildMugOpts(build, t); od.rot = Math.sin(t * 8) * 0.04;
          drawMug(ctx, drag.x, drag.y + 60, MUG_S * 0.95, od);
        }
      }
      function drawParticles(ctx, t) {
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          if (p.k === 'coin') {
            if (p.t < 0) continue;
            var q = U.clamp(p.t / p.dur, 0, 1), e = U.ease(q);
            var x = U.lerp(p.x0, p.x1, e), y = U.lerp(p.y0, p.y1, e) - Math.sin(q * Math.PI) * 110;
            A.coin(ctx, x, y, 15, p.spin + t * 9);
            continue;
          }
          var a = 1 - p.life / p.max;
          ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.5));
          if (p.k === 'heart') A.heart(ctx, p.x, p.y, p.s, p.col, 2);
          else A.sparkle(ctx, p.x, p.y, p.s * (0.5 + a * 0.5), 1);
          ctx.restore();
        }
      }
      function hintTarget() {
        var list = waitingCustomers(); if (!list.length) return null;
        var c = list.reduce(function (m, x) { return x.patience < m.patience ? x : m; }, list[0]);
        var o = c.order, idx = function (kind, val) { for (var i = 0; i < tiles.length; i++) if (tiles[i].kind === kind && tiles[i].val === val) return i; return -1; };
        if (build.cup !== o.cup) return tileTop(idx('cup', o.cup));
        if (build.drink !== o.drink) return tileTop(idx('drink', o.drink));
        if (build.fill < 1) return null;
        if ((build.top || null) !== (o.top || null)) return o.top ? tileTop(idx('top', o.top)) : { x: TRASH.x, y: TRASH.y - 70 };
        return { x: BELL.x, y: BELL.y - 70 };
      }
      function drawHint(ctx, t) {
        if (st.done || drag || pour) return;
        var thr = st.served === 0 ? 2.5 : 6;
        if (st.idle < thr) return;
        var tg = hintTarget(); if (!tg) return;
        var a = Math.min(1, (st.idle - thr) / 0.4), bob = Math.abs(Math.sin(t * 4)) * 14;
        ctx.save(); ctx.globalAlpha = a;
        drawFinger(ctx, tg.x + 8, tg.y - bob, 1, bob < 3 ? 1 : 0);
        ctx.restore();
      }
      function drawHUD(ctx, t) {
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '800 34px ' + AB.FONT;
        // drinks served
        A.box(ctx, 836, 30, 132, 62, 31, 'rgba(255,250,240,0.96)', 3);
        drawMug(ctx, 874, 83, 0.62, { cup: 'red', drink: 'cocoa', top: 'cream' });
        ctx.fillStyle = C.out; ctx.fillText(String(st.served), 930, 63);
        // coins
        A.box(ctx, 984, 30, 150, 62, 31, 'rgba(255,250,240,0.96)', 3);
        A.coin(ctx, 1020, 61, 20, 0);
        ctx.fillStyle = C.out; ctx.fillText(String(Math.round(st.shown)), 1084, 63);
        // picture clock: a shrinking golden pie around a little mug
        var frac = st.left / ROUND, cx = 1212, cy = 62, R = 46;
        var pulse = st.left < 10 && !st.done ? 1 + Math.sin(t * 8) * 0.05 : 1;
        ctx.translate(cx, cy); ctx.scale(pulse, pulse);
        A.circle(ctx, 0, 0, R, '#2c3e6b', 3);
        if (frac > 0) {
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.closePath();
          A.fs(ctx, st.left < 10 ? '#ffa04a' : C.yellow, 0);
        }
        for (var k = 0; k < 12; k++) { var ang = k / 12 * Math.PI * 2; A.circle(ctx, Math.cos(ang) * (R - 3), Math.sin(ang) * (R - 3), 2, 'rgba(255,255,255,0.7)', 0); }
        A.circle(ctx, 0, 0, 24, '#fff6e6', 3);
        drawMug(ctx, -4, 13, 0.42, { cup: 'blue', drink: 'cocoa' });
        ctx.restore();
      }
      function drawEnd(ctx, t) {
        if (!st.done) return;
        var k = U.easeOutBack(Math.min(1, st.endT / 0.5));
        ctx.save();
        ctx.fillStyle = 'rgba(30,40,80,' + (0.25 * Math.min(1, st.endT * 2)) + ')'; ctx.fillRect(0, 0, 1280, 900);
        ctx.translate(640, 330 - (1 - k) * 300); ctx.rotate(Math.sin(t * 2.5) * 0.03);
        A.line(ctx, [-120, -170, 0, -260, 120, -170], 4, C.woodDark);
        A.box(ctx, -210, -170, 420, 260, 30, C.woodLight, 4);
        A.box(ctx, -190, -150, 380, 220, 22, '#fff6e6', 3);
        drawMug(ctx, -10, 40, 2.1, { cup: 'red', drink: 'cocoa', top: 'cream', t: t, steam: true, steamCol: 'rgba(130,150,200,0.6)' });
        for (var i = 0; i < 3; i++) {
          var on = i < (st.perfect >= 8 ? 3 : st.perfect >= 4 ? 2 : 1);
          A.star(ctx, -130 + i * 130 * (i === 1 ? 1 : 1), -110 + (i === 1 ? -20 : 0) + Math.sin(t * 4 + i) * 3, 26, on ? C.yellow : '#e6dccb', 3);
        }
        ctx.restore();
      }

      function draw(ctx, t) {
        ctx.drawImage(bgBake, 0, 0, 1280, 432);
        // live snow + aurora inside the window panes
        ctx.save();
        ctx.beginPath();
        WINDOWS.forEach(function (w) {
          var hw = w.w / 2 - 5, hh = w.h / 2 - 5;
          ctx.rect(w.x, w.y, hw, hh); ctx.rect(w.x + w.w / 2 + 5, w.y, hw, hh);
          ctx.rect(w.x, w.y + w.h / 2 + 5, hw, hh); ctx.rect(w.x + w.w / 2 + 5, w.y + w.h / 2 + 5, hw, hh);
        });
        ctx.clip();
        A.aurora(ctx, 1280, 96, 80, t, 0.22);
        snow.draw(ctx);
        ctx.restore();
        drawFire(ctx, t);
        drawLights(ctx, t);
        // customers behind the pickup ledge (leavers at the back)
        customers.forEach(function (c) { if (c.state === 'leave') drawCustomer(ctx, c, t); });
        customers.forEach(function (c) { if (c.state !== 'leave') drawCustomer(ctx, c, t); });
        ctx.drawImage(ledgeBake, 0, 420, 1280, 140);
        customers.forEach(function (c) {
          if (c.state === 'served' && c.carry) drawMug(ctx, c.x - 46, 446, 0.95, { cup: c.carry.cup, drink: c.carry.drink, top: c.carry.top, t: t, steam: true });
        });
        // the barista
        CH.draw(ctx, BAR_X, BAR_Y, bLook, { t: t, pose: st.bPose, scale: BAR_S, dir: 1 });
        ctx.drawImage(frontBake, 0, 540, 1280, 360);
        drawTrash(ctx, t);
        drawBell(ctx, BELL.x, BELL.y, 1, st.bellRing, st.bellPress > 0);
        drawJar(ctx, t);
        drawBuild(ctx, t);
        drawTiles(ctx, t);
        customers.forEach(function (c) { drawBubble(ctx, c, t); });
        drawPour(ctx, t);
        drawFlying(ctx, t);
        drawParticles(ctx, t);
        drawHint(ctx, t);
        drawHUD(ctx, t);
        drawEnd(ctx, t);
      }

      // ---- input -------------------------------------------------------------------
      function pointer(type, x, y) {
        if (st.done || st.finished) { drag = null; return; }
        if (type === 'down') {
          st.idle = 0; focus.show = false;
          if (build.cup && build.cupFly >= 1 && Math.abs(x - MAT_X) < 100 && y > MAT_Y - 170 && y < MAT_Y + 40) {
            drag = { x: x, y: y, sx: x, sy: y, moved: false }; return;
          }
          for (var i = 0; i < tiles.length; i++) {
            if (Math.abs(x - tiles[i].cx) <= TILE_W / 2 + 6 && y >= TILE_Y - 6 && y <= TILE_Y + TILE_H + 6) { pressTile(i); return; }
          }
          if (Math.abs(x - TRASH.x) < 62 && y > TRASH.y - 120 && y < TRASH.y + 16) { binIt(); return; }
          if (Math.abs(x - BELL.x) < 74 && y > BELL.y - 104 && y < BELL.y + 16) { serve(null, 'bell'); return; }
          var c = customerAt(x, y);
          if (c && build.cup) serve(c, 'tap');
        } else if (type === 'move') {
          if (drag) { drag.x = x; drag.y = y; if (U.dist(x, y, drag.sx, drag.sy) > 22) drag.moved = true; }
        } else if (type === 'up') {
          if (!drag) return;
          var d = drag; drag = null;
          if (!d.moved) { serve(null, 'tap'); return; }
          var tc = customerAt(x, y);
          if (tc) serve(tc, 'drag', x, y + 60);
          else if (y < 470) serve(null, 'drag', x, y + 60);
          else if (Math.abs(x - TRASH.x) < 70 && y > TRASH.y - 130 && y < TRASH.y + 20) binIt();
          else if (Math.abs(x - BELL.x) < 80 && y > BELL.y - 110 && y < BELL.y + 20) serve(null, 'bell');
          else { build.pop = 1; }
        }
      }
      function key(type, k) {
        if (type !== 'down' || st.done || st.finished) return;
        st.idle = 0;
        if (k && k.length === 1 && k >= '1' && k <= '9') { focus.show = false; pressTile(+k - 1); return; }
        if (k === 'Enter' || k === ' ' || k === 'Spacebar' || k === 'ArrowUp') { serve(null, 'bell'); return; }
        if (k === 'Backspace' || k === 'Delete') { binIt(); return; }
        if (k === 'ArrowLeft' || k === 'ArrowRight') {
          if (focus.show) focus.i = (focus.i + (k === 'ArrowLeft' ? -1 : 1) + 11) % 11;
          focus.show = true; sfx('tap'); return;
        }
        if (k === 'ArrowDown') { if (!focus.show) { focus.show = true; return; } activateFocus(); }
      }

      return {
        update: function (dt) { try { update(dt); } catch (e) { if (window.console) console.error('[cocoa]', e); } },
        draw: function (ctx, t) { try { draw(ctx, t); } catch (e) { if (window.console) console.error('[cocoa]', e); } },
        pointer: function (type, x, y) { try { pointer(type, x, y); } catch (e) { if (window.console) console.error('[cocoa]', e); } },
        key: function (type, k) { try { key(type, k); } catch (e) { if (window.console) console.error('[cocoa]', e); } },
        _debug: function () { return { stage: st.stage, served: st.served, perfect: st.perfect, earned: st.earned, build: { cup: build.cup, drink: build.drink, top: build.top, fill: build.fill }, customers: customers.map(function (c) { return { state: c.state, x: c.x, order: c.order, patience: c.patience }; }) }; },
        destroy: function () { customers.length = 0; particles.length = 0; pour = fly = binFly = drag = null; }
      };
    }
  });
})();
