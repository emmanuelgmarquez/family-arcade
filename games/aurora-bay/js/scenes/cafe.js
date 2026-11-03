/* Cocoa Café — a warm wood-panelled café with a crackling fireplace. Mabel serves cocoa behind the counter. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C, K = AB.kit;

  var WALL_B = 370;                 // where the back wall meets the floor
  var CTR = { x: 460, w: 410, front: 474, depth: 24, h: 50 };   // serving counter
  var FIRE = { x: 195, y: 382 };    // fireplace hearth centre
  var fireBoost = 0, crackleUntil = 0, nextCrackle = 0;
  var sparks = [];
  var foxWake = 0, heartUntil = 0, bellRing = 0, rackWobble = 0;
  var windowSnow = null;

  function sit(x, y, dir) {
    var p = AB.world.player; p.x = x; p.y = y; p.dir = dir; p.pose = 'sit'; p.poseUntil = AB.world.t + 6; AB.audio.sfx('soft');
  }
  function wobbleProp(x, y, draw, hit, at, onTap) {
    var st = { until: 0 };
    return { x: x, y: y, hit: hit, at: at,
      draw: function (ctx, t) {
        ctx.save();
        if (t < st.until) { ctx.translate(x, y); ctx.rotate(Math.sin(t * 30) * 0.06 * (st.until - t)); ctx.translate(-x, -y); }
        draw(ctx, t); ctx.restore();
      },
      tap: function () { st.until = AB.world.t + 0.8; if (onTap) onTap(); else AB.audio.sfx('soft'); }
    };
  }
  function furn(ctx, id, x, y, s, t, flip) {
    var f = AB.furniture && AB.furniture[id]; if (!f) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (flip ? -1 : 1), s); f.draw(ctx, { t: t || 0 }); ctx.restore();
  }

  // ---------------------------------------------------------------- static painting helpers
  function wallpaper(ctx) {
    // warm apricot wallpaper with soft cream stripes and tiny mugs
    var g = ctx.createLinearGradient(0, 0, 0, 250);
    g.addColorStop(0, '#d98d58'); g.addColorStop(1, '#eeac74');
    ctx.fillStyle = g; ctx.fillRect(0, 0, AB.W, 250);
    for (var x = 0; x < AB.W; x += 64) { ctx.fillStyle = 'rgba(255,236,205,0.22)'; ctx.fillRect(x, 0, 26, 250); }
    ctx.save(); ctx.globalAlpha = 0.18;
    for (var yy = 60; yy < 240; yy += 70) for (var xx = 45 + (yy % 140 ? 32 : 0); xx < AB.W; xx += 128) A.heart(ctx, xx, yy, 6, '#fff3df', 0);
    ctx.restore();
    // wainscot panels
    A.box(ctx, -10, 236, AB.W + 20, 16, 0, '#7d4426', 3);
    ctx.fillStyle = '#9a5a33'; ctx.fillRect(0, 252, AB.W, WALL_B - 252);
    for (var px = 10; px < AB.W; px += 104) {
      A.box(ctx, px, 266, 84, WALL_B - 290, 6, '#a9663c', 2.5, '#6e3b20');
      A.highlight(ctx, px + 18, 276, 10, 3, 0.25);
    }
    // ceiling beam
    A.box(ctx, -10, -8, AB.W + 20, 34, 0, '#7a4125', 3);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, 14, AB.W, 10);
    for (var bx = 60; bx < AB.W; bx += 210) A.circle(ctx, bx, 9, 3, '#5a2e18', 0);
  }
  function floor(ctx) {
    var g = ctx.createLinearGradient(0, WALL_B, 0, AB.H);
    g.addColorStop(0, '#a8693e'); g.addColorStop(1, '#d39a62');
    ctx.fillStyle = g; ctx.fillRect(0, WALL_B, AB.W, AB.H - WALL_B);
    ctx.strokeStyle = 'rgba(80,38,14,0.22)'; ctx.lineWidth = 2;
    for (var k = 0; k < 14; k++) { var yy = WALL_B + Math.pow(k / 14, 1.35) * (AB.H - WALL_B); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(AB.W, yy); ctx.stroke(); }
    var r = U.seeded(12);
    for (var row = 0; row < 14; row++) {
      var y0 = WALL_B + Math.pow(row / 14, 1.35) * (AB.H - WALL_B), y1 = WALL_B + Math.pow((row + 1) / 14, 1.35) * (AB.H - WALL_B);
      for (var j = 0; j < 9; j++) {
        var fx = (j + r()) * 150 - 20, sp = (fx - 640) / 640;
        ctx.beginPath(); ctx.moveTo(fx + sp * (y0 - WALL_B) * 0.5, y0); ctx.lineTo(fx + sp * (y1 - WALL_B) * 0.5, y1); ctx.stroke();
      }
    }
    // skirting
    A.box(ctx, -10, WALL_B - 6, AB.W + 20, 12, 0, '#5e3119', 3);
  }
  function fireplace(ctx) {
    var x = FIRE.x;
    // stone chimney breast up to the ceiling
    A.box(ctx, x - 100, 20, 200, FIRE.y - 16, 4, '#b8a596', 3.5);
    ctx.save(); ctx.beginPath(); A.rrect(ctx, x - 100, 20, 200, FIRE.y - 16, 4); ctx.clip();
    var r = U.seeded(5);
    for (var row = 0; row < 18; row++) for (var k = 0; k < 6; k++) {
      var sx = x - 112 + k * 42 + (row % 2) * 21 + r() * 5, sy = 30 + row * 21;
      A.ellipse(ctx, sx, sy, 18 + r() * 4, 9, r() < 0.4 ? '#cdbcad' : (r() < 0.5 ? '#a79282' : '#bfae9f'), 2, 'rgba(60,40,40,0.45)');
    }
    ctx.fillStyle = 'rgba(40,20,30,0.16)'; ctx.fillRect(x + 50, 0, 60, 400);
    ctx.restore();
    A.box(ctx, x - 100, 20, 200, FIRE.y - 16, 4, null, 3.5);
    // mantel
    A.box(ctx, x - 122, 238, 244, 20, 6, '#8a4a2a', 3);
    A.box(ctx, x - 116, 254, 232, 8, 3, '#6e3820', 2.5);
    A.highlight(ctx, x - 70, 244, 30, 3, 0.35);
    // painting of the bay above the mantel
    furn(ctx, 'pic_aurora', x, 150, 1.05, 0);
    // candle holders + a little tea pot
    A.box(ctx, x - 98, 210, 12, 28, 3, '#fff6e3', 2.5); A.box(ctx, x - 78, 218, 12, 20, 3, '#fff6e3', 2.5);
    A.ellipse(ctx, x - 86, 238, 22, 4, '#d6a24a', 2);
    ctx.save(); ctx.translate(x + 82, 238);
    A.ellipse(ctx, 0, -14, 17, 14, '#4fa6e8', 2.5); A.box(ctx, -5, -32, 10, 6, 3, '#4fa6e8', 2);
    A.line(ctx, [15, -16, 26, -24], 4); A.line(ctx, [15, -16, 26, -24], 2, '#4fa6e8');
    A.circle(ctx, -17, -14, 6, null, 3); A.circle(ctx, -17, -14, 6, null, 1.5, '#4fa6e8');
    A.snowflake(ctx, 0, -14, 6, '#fff', 1.5);
    ctx.restore();
    // garland of pine + berries on the mantel
    for (var i = 0; i < 9; i++) {
      var gx = x - 110 + i * 27.5, gy = 262 + Math.sin(i / 8 * Math.PI) * 14;
      A.ellipse(ctx, gx, gy, 16, 9, i % 2 ? C.pine : C.pineDark, 2);
      if (i % 2 === 0) A.circle(ctx, gx + 4, gy + 4, 3.5, C.red, 1.5);
    }
    // firebox opening
    var op = function (c) { c.moveTo(x - 64, FIRE.y); c.lineTo(x - 64, 318); c.arc(x, 318, 64, Math.PI, 0); c.lineTo(x + 64, FIRE.y); c.closePath(); };
    ctx.beginPath(); op(ctx);
    var ig = ctx.createLinearGradient(0, 254, 0, FIRE.y); ig.addColorStop(0, '#23182e'); ig.addColorStop(1, '#5a2a26');
    A.fs(ctx, ig, 3.5);
    // arch keystones
    for (var a = 0; a <= 6; a++) {
      var ang = Math.PI + a / 6 * Math.PI, kx = x + Math.cos(ang) * 74, ky = 318 + Math.sin(ang) * 74;
      ctx.save(); ctx.translate(kx, ky); ctx.rotate(ang + Math.PI / 2); A.box(ctx, -11, -8, 22, 16, 4, a === 3 ? '#e4d6c8' : '#cfc0b2', 2.5); ctx.restore();
    }
    // logs + grate
    A.box(ctx, x - 48, FIRE.y - 22, 96, 16, 7, C.woodDark, 2.5);
    ctx.save(); ctx.translate(x, FIRE.y - 26); ctx.rotate(-0.16); A.box(ctx, -44, -8, 88, 15, 7, C.wood, 2.5); A.ellipse(ctx, 40, -0.5, 6, 7, C.woodLight, 2); ctx.restore();
    A.line(ctx, [x - 54, FIRE.y - 4, x + 54, FIRE.y - 4], 5, '#2c2433');
    // hearth slab
    A.box(ctx, x - 118, FIRE.y - 4, 236, 20, 6, '#8d7f88', 3);
    A.highlight(ctx, x - 70, FIRE.y + 2, 30, 3, 0.35);
    // log basket beside the hearth
    A.box(ctx, x + 108, FIRE.y - 40, 52, 46, 10, '#c9934e', 3);
    for (var w = 0; w < 4; w++) A.line(ctx, [x + 112, FIRE.y - 30 + w * 10, x + 156, FIRE.y - 30 + w * 10], 1.6, 'rgba(90,50,20,0.5)');
    A.ellipse(ctx, x + 120, FIRE.y - 44, 9, 8, C.woodLight, 2.5); A.ellipse(ctx, x + 138, FIRE.y - 48, 9, 8, C.woodLight, 2.5); A.ellipse(ctx, x + 150, FIRE.y - 42, 8, 7, C.woodLight, 2.5);
  }
  function mugShelves(ctx) {
    var cols = [C.red, C.blue, C.yellow, C.teal, C.pink, C.purple, C.orange, '#ffffff', C.green];
    for (var s = 0; s < 3; s++) {
      var sy = 118 + s * 62;
      A.box(ctx, 312, sy, 126, 10, 3, '#8a4a2a', 2.5);
      A.poly(ctx, [322, sy + 10, 334, sy + 10, 322, sy + 24], '#6e3820', 2);
      A.poly(ctx, [428, sy + 10, 416, sy + 10, 428, sy + 24], '#6e3820', 2);
      for (var m = 0; m < 3; m++) A.mug(ctx, 334 + m * 40, sy, 0.62, cols[s * 3 + m], 'none');
    }
    // a little jar of candy canes on top
    A.box(ctx, 350, 70, 44, 48, 10, 'rgba(220,240,255,0.7)', 2.5);
    for (var c = 0; c < 3; c++) { A.line(ctx, [358 + c * 12, 108, 358 + c * 12, 70, 364 + c * 12, 62], 5, C.out); A.line(ctx, [358 + c * 12, 108, 358 + c * 12, 70, 364 + c * 12, 62], 3, c % 2 ? '#fff' : C.red); }
    A.box(ctx, 346, 112, 52, 8, 3, '#8a4a2a', 2.5);
  }
  function menuBoard(ctx) {
    var x = 478, y = 66, w = 222, h = 170;
    A.line(ctx, [x + 40, 26, x + 70, y], 2.5, '#5a2e18'); A.line(ctx, [x + w - 40, 26, x + w - 70, y], 2.5, '#5a2e18');
    A.box(ctx, x, y, w, h, 10, '#8a4a2a', 3.5);
    A.box(ctx, x + 10, y + 10, w - 20, h - 20, 6, '#2f4a40', 2.5);
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff'; ctx.fillRect(x + 14, y + 14, w - 28, 40); ctx.restore();
    // three drinks, each with a price in coin dots
    var drinks = [[C.red, 'cream', 1], [C.blue, 'marsh', 2], [C.pink, 'sprinkles', 3]];
    drinks.forEach(function (d, i) {
      var cx = x + 46 + i * 65;
      A.mug(ctx, cx, y + 100, 0.85, d[0], d[1]);
      // chalk steam
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 4, y + 52); ctx.quadraticCurveTo(cx - 10, y + 44, cx - 4, y + 36); ctx.quadraticCurveTo(cx + 2, y + 28, cx - 4, y + 22); ctx.stroke();
      ctx.restore();
      for (var c = 0; c < d[2]; c++) A.coin(ctx, cx - (d[2] - 1) * 9 + c * 18, y + 128, 7);
    });
    // chalk doodles
    A.snowflake(ctx, x + 24, y + 26, 7, 'rgba(255,255,255,0.55)', 1.5);
    A.star(ctx, x + w - 26, y + 26, 7, 'rgba(255,230,140,0.7)', 0);
    A.ellipse(ctx, x + 40, y - 1, 34, 5, '#fff', 0);
  }
  function backCounter(ctx) {
    // cabinet along the wall behind the counter
    A.box(ctx, 452, 288, 456, 84, 6, '#8e4f2c', 3);
    for (var d = 0; d < 5; d++) { A.box(ctx, 464 + d * 88, 302, 78, 58, 5, '#a2603a', 2.5); A.circle(ctx, 503 + d * 88, 331, 3.5, C.coin, 2); }
    A.box(ctx, 444, 278, 472, 14, 5, '#f1e2c8', 3);
    // copper cocoa pots
    [[506, 30, '#d9844d'], [572, 24, '#c96a4a']].forEach(function (p) {
      A.box(ctx, p[0] - p[1], 278 - p[1] * 1.3, p[1] * 2, p[1] * 1.3, 8, p[2], 3);
      A.box(ctx, p[0] - p[1] - 4, 278 - p[1] * 1.3 - 6, p[1] * 2 + 8, 9, 4, U.shade(p[2], -0.15), 2.5);
      A.line(ctx, [p[0] - p[1] - 4, 278 - p[1] * 0.9, p[0] - p[1] - 14, 278 - p[1] * 1.0], 4);
      A.highlight(ctx, p[0] - p[1] * 0.5, 278 - p[1] * 0.8, 4, 7, 0.5);
    });
    // the big cocoa machine
    var mx = 764;
    A.box(ctx, mx - 56, 254, 112, 26, 6, '#6c7894', 3);
    A.box(ctx, mx - 48, 150, 96, 108, 14, '#d07a45', 3.5);
    ctx.save(); ctx.beginPath(); A.rrect(ctx, mx - 48, 150, 96, 108, 14); ctx.clip();
    ctx.fillStyle = 'rgba(80,20,10,0.18)'; ctx.fillRect(mx + 18, 140, 40, 130);
    ctx.fillStyle = '#e8a26b'; ctx.fillRect(mx - 48, 196, 96, 12);
    ctx.restore();
    A.box(ctx, mx - 48, 150, 96, 108, 14, null, 3.5);
    ctx.beginPath(); ctx.moveTo(mx - 42, 152); ctx.quadraticCurveTo(mx, 100, mx + 42, 152); ctx.closePath(); A.fs(ctx, '#e8955a', 3.5);
    A.circle(ctx, mx, 104, 9, C.coin, 2.5);
    A.highlight(ctx, mx - 28, 180, 6, 16, 0.5);
    // gauge
    A.circle(ctx, mx - 18, 176, 14, '#fff8ea', 3); A.line(ctx, [mx - 18, 176, mx - 10, 168], 2.5, C.red); A.circle(ctx, mx - 18, 176, 2.5, C.out, 0);
    // big mug icon emblem
    A.mug(ctx, mx + 16, 192, 0.5, '#fff4dc', 'cream');
    // spout + mug under it
    A.box(ctx, mx - 8, 226, 16, 14, 3, '#6c7894', 2.5);
    A.mug(ctx, mx + 2, 274, 0.55, C.red, 'none');
    // levers
    A.line(ctx, [mx + 48, 224, mx + 66, 210], 5); A.line(ctx, [mx + 48, 224, mx + 66, 210], 2.5, '#9aa6bd'); A.circle(ctx, mx + 67, 209, 6, C.red, 2.5);
    // jar of marshmallows + cookie jar
    A.box(ctx, 850, 222, 46, 56, 12, 'rgba(225,242,255,0.75)', 3);
    [[862, 262], [878, 266], [870, 250], [884, 248], [860, 240]].forEach(function (m, i) { A.box(ctx, m[0] - 6, m[1] - 5, 12, 10, 3, i % 2 ? '#ffd6e6' : '#fff', 1.6); });
    A.box(ctx, 846, 214, 54, 10, 4, C.pink, 2.5);
    A.highlight(ctx, 858, 236, 3, 10, 0.6);
  }
  function frostyWindow(ctx, x, y, w, h) {
    // outside: night sky, snowy hill, pine silhouette
    A.box(ctx, x - 12, y - 12, w + 24, h + 24, 8, '#7a4125', 3);
    ctx.save(); ctx.beginPath(); A.rrect(ctx, x, y, w, h, 4); ctx.clip();
    var g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#1f3b78'); g.addColorStop(0.7, '#5b78c2'); g.addColorStop(1, '#a9b9e6');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    var r = U.seeded(x);
    for (var i = 0; i < 12; i++) A.circle(ctx, x + r() * w, y + r() * h * 0.5, 0.8 + r() * 1.2, 'rgba(255,255,255,0.8)', 0);
    A.ellipse(ctx, x + w * 0.3, y + h + 10, w * 0.8, 50, '#eaf1ff', 0);
    A.ellipse(ctx, x + w * 0.9, y + h + 20, w * 0.6, 50, '#d6e2f8', 0);
    A.poly(ctx, [x + w * 0.72, y + h - 90, x + w * 0.86, y + h - 34, x + w * 0.58, y + h - 34], '#2b5a63', 0);
    A.poly(ctx, [x + w * 0.72, y + h - 66, x + w * 0.9, y + h - 10, x + w * 0.54, y + h - 10], '#2b5a63', 0);
    ctx.restore();
    // frost in the corners
    ctx.save(); ctx.beginPath(); A.rrect(ctx, x, y, w, h, 4); ctx.clip();
    ctx.fillStyle = 'rgba(235,246,255,0.75)';
    [[x, y, 34], [x + w, y, 28], [x, y + h, 40], [x + w, y + h, 46]].forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = 'rgba(235,246,255,0.45)';
    [[x + 20, y + 30, 18], [x + w - 24, y + h - 40, 22], [x + 14, y + h - 50, 16]].forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); ctx.fill(); });
    A.snowflake(ctx, x + 18, y + 18, 9, 'rgba(255,255,255,0.9)', 1.6);
    A.snowflake(ctx, x + w - 22, y + h - 22, 11, 'rgba(255,255,255,0.9)', 1.6);
    ctx.restore();
    // glazing bars
    A.box(ctx, x, y, w, h, 4, null, 3);
    A.line(ctx, [x + w / 2, y, x + w / 2, y + h], 7, '#7a4125'); A.line(ctx, [x, y + h * 0.45, x + w, y + h * 0.45], 7, '#7a4125');
    // café curtains on a rod across the lower half
    A.line(ctx, [x - 16, y + h * 0.5, x + w + 16, y + h * 0.5], 4, '#c58a12');
    [[x - 6, x + w * 0.42], [x + w * 0.58, x + w + 6]].forEach(function (c, k) {
      ctx.beginPath(); ctx.moveTo(c[0], y + h * 0.5);
      ctx.lineTo(c[1], y + h * 0.5);
      ctx.quadraticCurveTo(c[1] + (k ? -14 : 14), y + h * 0.75, c[1] + (k ? 2 : -2), y + h + 6);
      for (var s = 0; s <= 4; s++) { var sx = U.lerp(c[1], c[0], s / 4); ctx.quadraticCurveTo(sx + (k ? 6 : -6) * 0, y + h + 14, sx, y + h + 6); }
      ctx.closePath();
      A.fs(ctx, '#fff6ea', 2.5);
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(226,87,76,0.55)';
      for (var cx = c[0] - 20; cx < c[1] + 20; cx += 16) ctx.fillRect(cx, y + h * 0.5, 8, h);
      for (var cy = y + h * 0.5; cy < y + h + 20; cy += 16) ctx.fillRect(c[0] - 20, cy, w, 8);
      ctx.restore();
    });
    // sill with a candle
    A.box(ctx, x - 20, y + h + 8, w + 40, 14, 4, '#8a4a2a', 3);
    A.ellipse(ctx, x + w * 0.3, y + h + 8, w * 0.32, 4, '#fff', 0);
  }

  AB.registerScene({
    id: 'cafe', name: 'Cocoa Café', music: 'cafe', ambient: 'fire', outdoor: false, snow: false, footprints: false, aurora: false,
    map: null,
    depth: [400, 0.86, 880, 1.08],
    paint: function (ctx) {
      wallpaper(ctx);
      floor(ctx);
      fireplace(ctx);
      mugShelves(ctx);
      menuBoard(ctx);
      backCounter(ctx);
      frostyWindow(ctx, 942, 112, 124, 168);
      frostyWindow(ctx, 1110, 112, 124, 168);
      // cosy rug in front of the fire
      A.ellipse(ctx, 230, 480, 175, 50, '#b8423a', 3);
      A.ellipse(ctx, 230, 480, 150, 40, null, 4, '#ffcf4a');
      A.ellipse(ctx, 230, 480, 112, 28, '#d9604f', 2);
      for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; A.star(ctx, 230 + Math.cos(a) * 130, 480 + Math.sin(a) * 34, 6, '#ffe3a0', 0); }
      A.snowflake(ctx, 230, 480, 18, '#ffe3a0', 3);
      // rug under the right tables
      A.ellipse(ctx, 1005, 690, 210, 70, '#3d6a8c', 3);
      A.ellipse(ctx, 1005, 690, 186, 58, null, 3, '#9fd0f0');
      // long striped runner from the door to the counter
      ctx.save();
      ctx.beginPath(); ctx.moveTo(588, 500); ctx.lineTo(692, 500); ctx.lineTo(724, 846); ctx.lineTo(556, 846); ctx.closePath();
      A.fs(ctx, '#2f7d6a', 3);
      ctx.clip();
      for (var b = 0; b < 9; b++) { var yb = 520 + b * 38; ctx.fillStyle = b % 2 ? '#ffcf4a' : '#fff4dc'; ctx.fillRect(540, yb, 200, 8); }
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(600, 506); ctx.lineTo(680, 506); ctx.lineTo(708, 840); ctx.lineTo(572, 840); ctx.closePath(); A.fs(ctx, null, 2, 'rgba(255,244,220,0.6)');
      // doormat
      K.exitMat(ctx, 640, 860);
      // soft vignette over everything
      var v = ctx.createRadialGradient(640, 520, 320, 640, 520, 900);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,18,10,0.38)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, AB.W, AB.H);
    },
    animate: function (ctx, t) {
      var x = FIRE.x, y = FIRE.y, boost = Math.max(0, fireBoost - t);
      // warm light pooled on the floor and wall
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      A.glow(ctx, x, y + 40, 260 + Math.sin(t * 3) * 10 + boost * 60, 'rgba(255,140,50,', 0.16 + 0.03 * Math.sin(t * 7) + boost * 0.08);
      ctx.restore();
      // flames
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x - 64, y); ctx.lineTo(x - 64, 318); ctx.arc(x, 318, 64, Math.PI, 0); ctx.lineTo(x + 64, y); ctx.closePath(); ctx.clip();
      A.glow(ctx, x, y - 30, 90, 'rgba(255,150,60,', 0.6 + 0.1 * Math.sin(t * 5));
      var tall = 1 + boost * 0.35;
      [[C.red, 1, 46], [C.orange, 0.8, 36], [C.yellow, 0.58, 26], ['#fff6cf', 0.32, 14]].forEach(function (L, li) {
        ctx.beginPath(); ctx.moveTo(-L[2] - 8 + x, y - 26);
        for (var i = 0; i < 4; i++) {
          var fx = x - L[2] + (i + 0.5) * (2 * L[2] / 4), fh = (62 + 14 * Math.sin(t * 6 + i * 2.1 + li)) * L[1] * tall;
          ctx.quadraticCurveTo(fx - L[2] / 4, y - 26 - fh * 0.5, fx + Math.sin(t * 4 + i) * 4, y - 26 - fh);
          ctx.quadraticCurveTo(fx + L[2] / 4 * 0.2, y - 26 - fh * 0.45, fx + L[2] / 4, y - 28);
        }
        ctx.lineTo(x + L[2] + 8, y - 26); ctx.closePath(); ctx.fillStyle = L[0]; ctx.fill();
      });
      for (var e = 0; e < 5; e++) {
        var ph = (t * 0.7 + e * 0.23) % 1;
        ctx.fillStyle = 'rgba(255,210,120,' + (1 - ph) + ')';
        ctx.beginPath(); ctx.arc(x - 24 + e * 12 + Math.sin(t * 3 + e) * 5, y - 34 - ph * 70, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // front log on top of the flames
      A.box(ctx, x - 40, y - 16, 80, 13, 6, C.woodDark, 2.5);
      // mantel candles
      [[x - 92, 208], [x - 72, 216]].forEach(function (c, i) {
        A.glow(ctx, c[0], c[1] - 6, 22, C.lampGlow, 0.5);
        A.ellipse(ctx, c[0] + Math.sin(t * 9 + i) * 0.8, c[1] - 7, 3.2, 6, C.orange, 1.5);
        A.ellipse(ctx, c[0], c[1] - 6, 1.5, 3, '#fff6cf', 0);
      });
      // string lights along the beam
      K.stringLights(ctx, 300, 30, 920, 30, 16, t, 14);
      K.stringLights(ctx, 920, 30, 1270, 30, 10, t, 8);
      // steam from the cocoa machine and pots
      for (var s = 0; s < 3; s++) {
        var sp = (t * 0.45 + s / 3) % 1;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - sp)) + ')';
        ctx.beginPath(); ctx.arc(764 + Math.sin(sp * 6 + s) * 8, 92 - sp * 60, 6 + sp * 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(506 + Math.sin(sp * 5 + s) * 6, 232 - sp * 50, 4 + sp * 8, 0, Math.PI * 2); ctx.fill();
      }
      // snow falling outside the windows
      [[942, 112], [1110, 112]].forEach(function (wp, k) {
        ctx.save(); ctx.beginPath(); ctx.rect(wp[0], wp[1], 124, 168); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (var f = 0; f < 14; f++) {
          var fy = ((t * (22 + (f % 4) * 7) + f * 37 + k * 50) % 190) + wp[1] - 10;
          var fx = wp[0] + ((f * 53 + k * 29) % 124) + Math.sin(t + f) * 6;
          ctx.beginPath(); ctx.arc(fx, fy, 1.4 + (f % 3) * 0.7, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      });
      // a heart drawn in the frost after tapping the windows
      if (t < heartUntil) {
        var ha = Math.min(1, (heartUntil - t) / 1.2);
        ctx.save(); ctx.globalAlpha = ha;
        A.heart(ctx, 975, 168, 18, 'rgba(255,255,255,0.75)', 2.5);
        A.heart(ctx, 1200, 190, 12, 'rgba(255,255,255,0.75)', 2);
        A.sparkle(ctx, 1000, 140, 7, 0.6 + 0.4 * Math.sin(t * 8));
        ctx.restore();
      }
    },
    overlay: function (ctx, t) {
      sparks.forEach(function (s) {
        var a = 1 - s.t / s.life;
        ctx.fillStyle = 'rgba(255,' + Math.round(170 + 60 * a) + ',80,' + a + ')';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.5 + a * 0.5), 0, Math.PI * 2); ctx.fill();
      });
    },
    update: function (dt) {
      var t = AB.world.t;
      sparks.forEach(function (s) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 60 * dt; s.vx *= 0.98; });
      sparks = sparks.filter(function (s) { return s.t < s.life; });
      if (t < crackleUntil && t > nextCrackle) { nextCrackle = t + U.rand(0.12, 0.3); AB.audio.sfx('pop'); }
    },
    walk: [[30, 402], [1250, 402], [1266, 892], [14, 892]],
    blocks: [
      { r: [CTR.x - 5, 438, CTR.w + 10, 40] },        // serving counter
      { e: [330, 428, 44, 16] },                       // fox plush cushion
      { e: [290, 650, 56, 22] }, { e: [208, 646, 24, 12] }, { e: [372, 646, 24, 12] },
      { e: [1010, 560, 56, 22] }, { e: [928, 556, 24, 12] }, { e: [1092, 556, 24, 12] },
      { e: [1000, 780, 56, 22] }, { e: [918, 776, 24, 12] }, { e: [1082, 776, 24, 12] },
      { e: [64, 452, 40, 18] }, { e: [1218, 446, 36, 16] }, { e: [470, 846, 30, 14] }, { e: [64, 846, 40, 18] }
    ],
    spawns: { 'default': [640, 750], town: [640, 750], map: [640, 750] },
    hotspots: [
      { id: 'exit', hit: [550, 806, 180, 94], at: [640, 860], icon: 'door', badge: [640, 816], action: function () { AB.audio.sfx('door'); AB.go('town', 'cafe'); } },
      { id: 'counter', hit: [660, 120, 220, 356], at: [760, 506], icon: 'mug', badge: [764, 120], action: function () { AB.playMinigame('cocoa'); } }
    ],
    npcSpots: { mabel: { at: [585, 428], wander: null, dir: 1 } },
    questSpots: {},
    props: [
      // the serving counter: Mabel stands behind it
      { x: 640, y: CTR.front, draw: function (ctx, t) {
          var x = CTR.x, w = CTR.w, F = CTR.front, top = F - CTR.h, back = top - CTR.depth;
          A.shadow(ctx, x + w / 2, F + 2, w * 0.52, 10, 0.25);
          // top surface (seen from above)
          A.box(ctx, x - 8, back, w + 16, CTR.depth + 12, 8, '#f1e2c8', 3);
          ctx.fillStyle = 'rgba(160,110,60,0.18)'; ctx.fillRect(x, back + 4, w, 6);
          // front face: wood panels with a scalloped awning trim
          A.box(ctx, x, top + 4, w, CTR.h - 4, 6, '#9a5730', 3);
          ctx.save(); ctx.beginPath(); A.rrect(ctx, x, top + 4, w, CTR.h - 4, 6); ctx.clip();
          for (var p = 0; p < 5; p++) A.box(ctx, x + 12 + p * 80, top + 22, 66, CTR.h - 30, 5, '#b06a3d', 2.2, '#6e3b20');
          ctx.fillStyle = 'rgba(40,10,0,0.18)'; ctx.fillRect(x + w - 50, top, 60, 80);
          ctx.restore();
          for (var s = 0; s < 14; s++) {
            var sx = x + s * (w / 14);
            ctx.beginPath(); ctx.moveTo(sx, top + 4); ctx.lineTo(sx + w / 14, top + 4); ctx.arc(sx + w / 28, top + 4, w / 28, 0, Math.PI); ctx.closePath();
            A.fs(ctx, s % 2 ? '#fff6ea' : C.red, 2);
          }
          A.box(ctx, x - 8, back, w + 16, CTR.depth + 12, 8, null, 3);
          A.highlight(ctx, x + 50, back + 8, 30, 3, 0.5);
          // cake dome with cookies
          var cx = x + 330;
          A.ellipse(ctx, cx, top - 2, 30, 7, '#fff', 2.5);
          A.ellipse(ctx, cx - 10, top - 8, 9, 4, '#d39a68', 1.8); A.ellipse(ctx, cx + 8, top - 9, 9, 4, '#d39a68', 1.8); A.ellipse(ctx, cx, top - 14, 9, 4, '#e2b07a', 1.8);
          ctx.beginPath(); ctx.moveTo(cx - 26, top - 2); ctx.bezierCurveTo(cx - 28, top - 50, cx + 28, top - 50, cx + 26, top - 2);
          A.fs(ctx, 'rgba(220,240,255,0.45)', 2.5);
          A.circle(ctx, cx, top - 40, 4, '#fff', 2);
          A.highlight(ctx, cx - 12, top - 26, 3, 9, 0.7);
          // tip jar
          A.box(ctx, x + 380, top - 26, 22, 26, 6, 'rgba(225,242,255,0.7)', 2.5);
          A.coin(ctx, x + 391, top - 8, 6); A.coin(ctx, x + 388, top - 15, 5, 1);
          // stack of mugs
          A.mug(ctx, x + 270, top + 2, 0.5, C.teal, 'none'); A.mug(ctx, x + 300, top + 2, 0.5, C.yellow, 'cream');
          // steam from the ready mug
          for (var q = 0; q < 2; q++) { var ph = (t * 0.6 + q * 0.5) % 1; ctx.fillStyle = 'rgba(255,255,255,' + 0.6 * (1 - ph) + ')'; ctx.beginPath(); ctx.arc(x + 300 + Math.sin(ph * 6) * 3, top - 26 - ph * 26, 3 + ph * 4, 0, Math.PI * 2); ctx.fill(); }
        } },
      // the service bell on the counter
      { x: 500, y: CTR.front + 1, hit: [474, 380, 52, 50], at: [500, 510],
        draw: function (ctx, t) {
          var top = CTR.front - CTR.h, j = t < bellRing ? Math.sin(t * 60) * 2 * (bellRing - t) : 0;
          A.ellipse(ctx, 500, top - 2, 18, 5, '#c58a12', 2.5);
          ctx.save(); ctx.translate(j, 0);
          A.shape(ctx, function (c) { c.moveTo(486, top - 4); c.quadraticCurveTo(486, top - 24, 500, top - 24); c.quadraticCurveTo(514, top - 24, 514, top - 4); c.closePath(); }, '#ffc93c', 2.5);
          A.circle(ctx, 500, top - 27, 3.5, '#ffc93c', 2);
          A.highlight(ctx, 494, top - 15, 2.5, 5, 0.7);
          ctx.restore();
        },
        tap: function () { bellRing = AB.world.t + 0.6; AB.audio.sfx('ding'); AB.world.burst(500, 400, 'note', 2); } },
      // fireplace (painted; this prop makes it tappable)
      { x: FIRE.x, y: 395, hit: [FIRE.x - 88, 236, 176, 152], at: [FIRE.x + 10, 450],
        draw: function () {},
        tap: function () {
          var t = AB.world.t;
          fireBoost = t + 1.6; crackleUntil = t + 1.2; nextCrackle = t;
          AB.audio.sfx('whoosh');
          for (var i = 0; i < 22; i++) sparks.push({ x: FIRE.x + U.rand(-30, 30), y: FIRE.y - 40, vx: U.rand(-60, 60), vy: U.rand(-220, -90), t: 0, life: U.rand(0.6, 1.3), r: U.rand(2, 4) });
          AB.quests.revealGem('gem_cafe_1', FIRE.x + 30, 470);
        } },
      // a little arctic fox plush asleep on a cushion by the fire
      { x: 330, y: 432, hit: [282, 362, 96, 84], at: [330, 482],
        draw: function (ctx, t) {
          var awake = t < foxWake, wig = awake ? Math.sin(t * 24) * 0.08 * (foxWake - t) : 0;
          A.shadow(ctx, 330, 434, 44, 9, 0.25);
          A.ellipse(ctx, 330, 424, 44, 14, '#5b4aa8', 3);
          A.ellipse(ctx, 330, 418, 40, 12, '#8e6bd8', 2.5);
          [[288, 424], [372, 424]].forEach(function (k) { A.circle(ctx, k[0], k[1], 4, C.yellow, 1.8); });
          ctx.save(); ctx.translate(330, 414); ctx.rotate(wig);
          // curled body with a big bushy tail wrapped around the front
          A.ellipse(ctx, 6, -14, 30, 17, '#fbfcff', 3);
          ctx.save(); ctx.globalAlpha = 0.45; A.ellipse(ctx, 14, -8, 22, 9, '#d6dfee', 0); ctx.restore();
          A.shape(ctx, function (c) { c.moveTo(34, -14); c.bezierCurveTo(46, 6, 10, 10, -8, 4); c.bezierCurveTo(-26, 0, -38, -2, -40, -10); c.bezierCurveTo(-30, -14, -12, -6, 6, -6); c.bezierCurveTo(22, -6, 30, -8, 34, -14); c.closePath(); }, '#ffffff', 2.5);
          A.shape(ctx, function (c) { c.moveTo(-40, -10); c.bezierCurveTo(-36, -2, -28, 0, -22, 1); c.bezierCurveTo(-28, -6, -34, -9, -40, -10); c.closePath(); }, '#cfdcf0', 2);
          // head resting on the tail, pointy snout to the left
          A.shape(ctx, function (c) { c.moveTo(-2, -26); c.bezierCurveTo(-2, -40, -20, -40, -24, -30); c.lineTo(-38, -20); c.quadraticCurveTo(-36, -14, -26, -13); c.bezierCurveTo(-14, -10, -2, -14, -2, -26); c.closePath(); }, '#fbfcff', 2.5);
          A.poly(ctx, [-22, -34, -26, -50, -13, -37], '#fbfcff', 2.2); A.poly(ctx, [-11, -37, -4, -50, -2, -32], '#fbfcff', 2.2);
          A.poly(ctx, [-21, -37, -23, -45, -16, -38], '#ffc1d0', 0);
          A.circle(ctx, -38, -19, 2.8, C.out, 0);
          if (awake) { A.circle(ctx, -20, -26, 3, C.out, 0); A.circle(ctx, -19, -27, 1, '#fff', 0); }
          else { ctx.beginPath(); ctx.arc(-20, -27, 3.5, 0.2, Math.PI - 0.2); ctx.lineWidth = 2; ctx.strokeStyle = C.out; ctx.stroke(); }
          ctx.save(); ctx.fillStyle = 'rgba(255,120,150,0.45)'; ctx.beginPath(); ctx.ellipse(-16, -18, 4, 2.5, 0, 0, 7); ctx.fill(); ctx.restore();
          // tiny scarf so it reads as a cherished plush
          A.shape(ctx, function (c) { c.moveTo(-6, -36); c.quadraticCurveTo(0, -26, -6, -14); c.lineTo(0, -14); c.quadraticCurveTo(6, -26, 0, -36); c.closePath(); }, C.teal, 2);
          ctx.restore();
          if (!awake && AB.pets && AB.pets.bubble) AB.pets.bubble(ctx, 352, 378, 'zzz', t);
          if (awake && AB.pets && AB.pets.bubble) AB.pets.bubble(ctx, 316, 370, 'heart', t);
        },
        tap: function () {
          foxWake = AB.world.t + 2.4; AB.audio.sfx('soft'); AB.world.burst(320, 390, 'heart', 3);
          AB.quests.revealGem('gem_cafe_2', 390, 480);
        } },
      // frosty windows: draw a heart in the frost
      { x: 1088, y: 380, hit: [930, 100, 316, 200], at: [1100, 470],
        draw: function () {},
        tap: function () { heartUntil = AB.world.t + 5; AB.audio.sfx('sparkle'); AB.world.burst(1090, 220, 'sparkle', 6); } },
      // tables with chairs (tap a table to sit down)
      chair(208, 648), chair(372, 648, true), table(290, 650, C.red, 'marsh', C.yellow, 'cream'),
      chair(928, 558), chair(1092, 558, true), table(1010, 560, C.teal, 'sprinkles', C.pink, 'cream'),
      chair(918, 778), chair(1082, 778, true), table(1000, 780, C.blue, 'cream', C.orange, 'marsh'),
      // plants
      wobbleProp(64, 456, function (ctx, t) { furn(ctx, 'plant_fern', 64, 456, 1.25, t); }, [20, 340, 90, 120], [110, 480]),
      wobbleProp(1218, 450, function (ctx, t) { furn(ctx, 'plant_flower', 1218, 450, 1.2, t); }, [1180, 350, 76, 104], [1170, 480]),
      wobbleProp(64, 850, function (ctx, t) { furn(ctx, 'ice_tree', 64, 850, 0.95, t); }, [20, 720, 90, 134], [130, 840], function () { AB.audio.sfx('sparkle'); AB.world.burst(64, 760, 'sparkle', 6); }),
      // coat rack by the door with scarves and a hat
      { x: 470, y: 850, hit: [436, 690, 70, 164], at: [520, 850],
        draw: function (ctx, t) {
          var w = t < rackWobble ? Math.sin(t * 22) * 0.07 * (rackWobble - t) : 0;
          A.shadow(ctx, 470, 852, 30, 7);
          ctx.save(); ctx.translate(470, 850); ctx.rotate(w);
          A.line(ctx, [-22, 0, 0, -12, 22, 0], 6); A.line(ctx, [-22, 0, 0, -12, 22, 0], 3, C.woodDark);
          A.box(ctx, -5, -150, 10, 142, 4, C.wood, 2.5);
          A.circle(ctx, 0, -154, 7, C.woodLight, 2.5);
          A.line(ctx, [0, -140, -20, -150], 5); A.line(ctx, [0, -140, 20, -150], 5);
          // red scarf hanging
          A.shape(ctx, function (c) { c.moveTo(-20, -146); c.quadraticCurveTo(-26, -120, -22, -90); c.lineTo(-12, -90); c.quadraticCurveTo(-14, -120, -10, -142); c.closePath(); }, C.red, 2.5);
          ctx.fillStyle = '#fff'; ctx.fillRect(-23, -104, 10, 4); ctx.fillRect(-23, -96, 10, 4);
          // blue beanie on top
          A.shape(ctx, function (c) { c.moveTo(-15, -158); c.quadraticCurveTo(-14, -182, 0, -182); c.quadraticCurveTo(14, -182, 15, -158); c.closePath(); }, C.blue, 2.5);
          A.box(ctx, -17, -162, 34, 9, 4, '#fff', 2); A.circle(ctx, 0, -186, 6, '#fff', 2);
          // teal scarf on the right peg
          A.shape(ctx, function (c) { c.moveTo(18, -148); c.quadraticCurveTo(26, -126, 22, -104); c.lineTo(13, -106); c.quadraticCurveTo(14, -126, 10, -144); c.closePath(); }, C.teal, 2.5);
          ctx.restore();
        },
        tap: function () { rackWobble = AB.world.t + 0.9; AB.audio.sfx('soft'); } }
    ]
  });

  function chair(x, y, flip) {
    return { x: x, y: y - 2, draw: function (ctx, t) { furn(ctx, 'chair_wood', x, y, 0.78, t, flip); } };
  }
  function table(x, y, c1, top1, c2, top2) {
    var steamOff = x * 0.01;
    return { x: x, y: y, hit: [x - 120, y - 110, 240, 120], at: [x, y + 46],
      draw: function (ctx, t) {
        A.shadow(ctx, x, y + 2, 50, 11, 0.25);
        A.ellipse(ctx, x, y - 2, 22, 7, C.woodDark, 3);
        A.box(ctx, x - 6, y - 52, 12, 50, 4, C.woodDark, 2.5);
        // round tabletop with a scalloped cream cloth
        A.ellipse(ctx, x, y - 54, 54, 18, '#8a4a2a', 3);
        ctx.beginPath();
        for (var i = 0; i <= 16; i++) { var a = i / 16 * Math.PI * 2, rx = x + Math.cos(a) * 58, ry = y - 58 + Math.sin(a) * 20 + (Math.sin(a) > 0 ? 6 : 0); if (i) ctx.lineTo(rx, ry); else ctx.moveTo(rx, ry); }
        ctx.closePath(); A.fs(ctx, '#fff6ea', 2.5);
        A.ellipse(ctx, x, y - 60, 40, 12, null, 2, 'rgba(226,87,76,0.6)');
        A.highlight(ctx, x - 30, y - 64, 10, 3, 0.6);
        // two mugs and a tiny vase
        A.mug(ctx, x - 22, y - 54, 0.48, c1, top1);
        A.mug(ctx, x + 24, y - 56, 0.48, c2, top2);
        A.box(ctx, x - 2, y - 76, 8, 16, 3, '#bfe8f6', 1.8); A.circle(ctx, x + 2, y - 80, 4, C.pink, 1.5);
        for (var q = 0; q < 2; q++) {
          var ph = (t * 0.5 + q * 0.5 + steamOff) % 1;
          ctx.fillStyle = 'rgba(255,255,255,' + 0.55 * (1 - ph) + ')';
          ctx.beginPath(); ctx.arc(x + (q ? 24 : -22) + Math.sin(ph * 6) * 3, y - 80 - ph * 28, 2.5 + ph * 4, 0, Math.PI * 2); ctx.fill();
        }
      },
      tap: function () {
        var p = AB.world.player, left = p.x < x;
        if (left) sit(x - 80, y + 2, 1); else sit(x + 80, y + 2, -1);
      }
    };
  }
})();
