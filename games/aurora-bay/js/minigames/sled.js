/* Aurora Bay — Sled Run minigame.
 * Pseudo-3D downhill run: the slope streams toward the camera from the horizon, objects grow as
 * they approach, the child's own character rides a wooden sled near the bottom-centre.
 * Steer with the big corner arrows, by dragging anywhere, or with Left/Right (A/D).
 * Snowflakes = 1, stars = 5. Bumping an obstacle never ends the run: a snow-puff tumble, a shake,
 * a speed dip and a short invulnerable blink. Ramps launch a jump through a line of stars. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C;
  var W = 1280, H = 900;
  // Projection: screen y = HZ + (CAMH - height) * F / d, screen x = 640 + (x - camX) * F / d.
  var HZ = 250, F = 817, CAMH = 490, DP = 817, DFAR = 10500, DNEAR = 560;
  var PY = HZ + CAMH; // player's ground line on screen (740)
  var PISTE = 560, PXMAX = 490, T_RUN = 70, COIN_K = 0.2;
  var GRAV = 2200, JUMP_V = 1000, STOP_GAP = 260, BRAKE = 1100;
  // hit boxes: [half-width, half-depth] in world units
  var HB = { flake: [40, 70], star: [48, 80], snowman: [42, 40], rock: [50, 40], spine: [38, 40], ice: [112, 150], ramp: [92, 55], bump: [80, 55] };
  var BTN_L = { x: 125, y: 790 }, BTN_R = { x: 1155, y: 790 }, BTN_R_RAD = 88;

  function defaultLook() {
    try { if (AB.game && AB.game.profile && AB.game.look) return AB.game.look(); } catch (e) { /* ignore */ }
    return { species: 'penguin', palette: '', outfit: { neck: 'scarf_red', head: 'beanie_blue' } };
  }

  // ---------------------------------------------------------------------------
  // Baked sprites (built once, shared between rounds)
  // ---------------------------------------------------------------------------
  var SPR = null;
  function mk(w, h, ax, ay, fn) {
    return { c: A.bake(w, h, 2, function (x) { x.translate(ax, ay); fn(x); }), w: w, h: h, ax: ax, ay: ay };
  }
  function blit(ctx, sp, x, y, s) { ctx.drawImage(sp.c, x - sp.ax * s, y - sp.ay * s, sp.w * s, sp.h * s); }

  function ball(ctx, x, y, r) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = C.snowShade; ctx.fill(); ctx.clip();
    ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.18, r * 0.92, 0, Math.PI * 2); ctx.fillStyle = C.snow; ctx.fill(); ctx.restore();
    A.circle(ctx, x, y, r, null, 3);
    A.highlight(ctx, x - r * 0.42, y - r * 0.45, r * 0.22, r * 0.12, 0.9);
  }
  function stick(ctx, pts) { A.line(ctx, pts, 7, C.out); A.line(ctx, pts, 3.5, C.woodDark); }

  function drawSnowman(ctx) {
    A.shadow(ctx, 8, 2, 56, 13, 0.25);
    stick(ctx, [-20, -86, -54, -110]); stick(ctx, [-46, -104, -48, -120]);
    stick(ctx, [20, -86, 56, -104]); stick(ctx, [48, -99, 60, -92]);
    ball(ctx, 0, -38, 40);
    ball(ctx, 0, -92, 29);
    A.shape(ctx, function (c) { c.moveTo(-24, -118); c.quadraticCurveTo(0, -107, 24, -118); c.lineTo(24, -107); c.quadraticCurveTo(0, -96, -24, -107); c.closePath(); }, C.red, 3);
    ball(ctx, 0, -134, 22);
    A.box(ctx, 7, -112, 11, 32, 4, C.red, 3);
    ctx.fillStyle = '#fff'; ctx.fillRect(8.5, -92, 8, 3.5); ctx.fillRect(8.5, -86, 8, 3.5);
    [-102, -90, -78].forEach(function (y) { A.circle(ctx, -4, y, 3.4, C.out, 0); });
    A.circle(ctx, -4, -52, 3.8, C.out, 0);
    // face
    A.circle(ctx, -8, -139, 3.4, C.out, 0); A.circle(ctx, 7, -139, 3.4, C.out, 0);
    A.poly(ctx, [-1, -133, 20, -129, -1, -126], C.orange, 2);
    for (var i = 0; i < 5; i++) { var a = Math.PI * (0.2 + i * 0.15); A.circle(ctx, Math.cos(a) * 11 - 1, -134 + Math.sin(a) * 9, 1.8, C.out, 0); }
    ctx.save(); ctx.fillStyle = 'rgba(255,120,150,0.35)'; ctx.beginPath(); ctx.ellipse(-14, -129, 5, 3, 0, 0, Math.PI * 2); ctx.ellipse(14, -129, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // bucket hat
    A.ellipse(ctx, 0, -153, 24, 7, '#4a8fe0', 3);
    A.shape(ctx, function (c) { c.moveTo(-15, -154); c.lineTo(-12, -178); c.lineTo(12, -178); c.lineTo(15, -154); c.closePath(); }, '#4a8fe0', 3);
    ctx.save(); ctx.globalAlpha = 0.25; A.poly(ctx, [5, -154, 8, -178, 12, -178, 15, -154], '#1d3c78', 0); ctx.restore();
    A.ellipse(ctx, -2, -178, 13, 4, C.snow, 2);
  }
  function drawRamp(ctx) {
    A.shadow(ctx, 0, 4, 112, 16, 0.22);
    A.shape(ctx, function (c) { c.moveTo(-88, 0); c.lineTo(88, 0); c.lineTo(72, -94); c.lineTo(-72, -94); c.closePath(); }, C.woodLight, 3);
    ctx.save(); ctx.beginPath(); ctx.moveTo(-88, 0); ctx.lineTo(88, 0); ctx.lineTo(72, -94); ctx.lineTo(-72, -94); ctx.closePath(); ctx.clip();
    ctx.strokeStyle = 'rgba(125,74,43,0.6)'; ctx.lineWidth = 2.5;
    for (var k = 1; k < 4; k++) { var y = -k * 23.5; ctx.beginPath(); ctx.moveTo(-100, y); ctx.lineTo(100, y); ctx.stroke(); }
    ctx.globalAlpha = 0.2; ctx.fillStyle = '#5a3018'; ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(90, 0); ctx.lineTo(74, -94); ctx.lineTo(34, -94); ctx.fill();
    ctx.restore();
    // chevrons pointing up the ramp
    for (var j = 0; j < 2; j++) {
      var cy = -26 - j * 32;
      ctx.beginPath(); ctx.moveTo(-26, cy + 8); ctx.lineTo(0, cy - 10); ctx.lineTo(26, cy + 8);
      ctx.lineWidth = 11; ctx.strokeStyle = C.out; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = C.yellow; ctx.stroke();
    }
    A.box(ctx, -77, -106, 154, 15, 5, C.wood, 3);
    A.ellipse(ctx, -24, -106, 40, 5, C.snow, 2);
    A.drift(ctx, -94, 4, 64, 52); A.drift(ctx, 94, 4, 64, 52);
    // flags
    A.line(ctx, [-76, -102, -76, -150], 3.5);
    A.poly(ctx, [-76, -150, -46, -142, -76, -132], C.red, 2.5);
    A.line(ctx, [76, -102, 76, -150], 3.5);
    A.poly(ctx, [76, -150, 106, -142, 76, -132], C.yellow, 2.5);
  }
  function drawIce(ctx) {
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, 0, 126, 50, 0, 0, Math.PI * 2);
    var g = ctx.createLinearGradient(-120, -50, 120, 50);
    g.addColorStop(0, '#e4f7fd'); g.addColorStop(0.5, C.ice); g.addColorStop(1, C.iceMid);
    A.fs(ctx, g, 3, C.iceDeep);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-80, -10); ctx.lineTo(-40, -30); ctx.moveTo(-60, 14); ctx.lineTo(-6, -16); ctx.moveTo(30, 24); ctx.lineTo(70, 4); ctx.stroke();
    ctx.strokeStyle = 'rgba(79,159,204,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, -10); ctx.lineTo(30, 0); ctx.lineTo(26, 18); ctx.moveTo(30, 0); ctx.lineTo(56, -8); ctx.stroke();
    ctx.restore();
    A.ellipse(ctx, -108, 22, 26, 9, C.snow, 2, C.snowDeep);
    A.ellipse(ctx, 104, -24, 22, 8, C.snow, 2, C.snowDeep);
    A.sparkle(ctx, -50, -18, 9, 0.9); A.sparkle(ctx, 60, 10, 7, 0.8);
  }

  function buildSprites() {
    if (SPR) return SPR;
    SPR = {};
    SPR.pines = [240, 300, 360].map(function (h) {
      return mk(h * 0.95, h * 1.08 + 24, h * 0.47, h * 1.08 + 8, function (x) { A.pine(x, 0, 0, h); });
    });
    SPR.spine = mk(180, 150 * 1.08 + 40, 90, 150 * 1.08 + 18, function (x) { A.drift(x, 0, 10, 140, 28); A.pine(x, 0, 6, 150); });
    SPR.snowman = mk(160, 200, 80, 186, drawSnowman);
    SPR.rock = mk(210, 130, 105, 108, function (x) { A.rock(x, 0, 0, 124, 84, true); A.drift(x, -56, 6, 66, 20); A.drift(x, 56, 6, 56, 16); });
    SPR.bank = mk(320, 100, 160, 86, function (x) { A.drift(x, -36, 0, 250, 62); A.drift(x, 76, 4, 160, 38); });
    SPR.bump = mk(230, 80, 115, 64, function (x) { A.shadow(x, 0, 4, 100, 10, 0.16); A.drift(x, 0, 2, 200, 44); A.sparkle(x, -30, -26, 7, 0.9); });
    SPR.ramp = mk(260, 170, 130, 152, drawRamp);
    SPR.ice = mk(290, 130, 145, 65, drawIce);
    return SPR;
  }

  // ---------------------------------------------------------------------------
  // Background (sky + mountains), baked once
  // ---------------------------------------------------------------------------
  var BG = null;
  function ridge(ctx, w, base, n, hmin, hmax, col, cap, seed) {
    var r = U.seeded(seed), pts = [], step = (w + 80) / n;
    for (var i = 0; i <= n; i++) {
      var x = -40 + i * step + (r() - 0.5) * step * 0.3;
      pts.push([x, base - (hmin + r() * (hmax - hmin))]);
      if (i < n) pts.push([x + step * 0.5, base - hmin * (0.25 + r() * 0.35)]);
    }
    ctx.beginPath(); ctx.moveTo(-40, base + 4);
    pts.forEach(function (p) { ctx.lineTo(p[0], p[1]); });
    ctx.lineTo(w + 40, base + 4); ctx.closePath();
    A.fs(ctx, col, 2.5, '#5d6ea5');
    for (var k = 0; k < pts.length; k += 2) {
      var p = pts[k], L = pts[k - 1] || [p[0] - step * 0.5, base], R = pts[k + 1] || [p[0] + step * 0.5, base];
      var f = 0.36, lx = p[0] + (L[0] - p[0]) * f, ly = p[1] + (L[1] - p[1]) * f, rx = p[0] + (R[0] - p[0]) * f, ry = p[1] + (R[1] - p[1]) * f;
      A.poly(ctx, [p[0], p[1], rx, ry, (p[0] + rx) / 2 + 3, ry - 6, p[0] + 2, ry + 4, (p[0] + lx) / 2, ly - 5, lx, ly], cap, 2, '#5d6ea5');
    }
  }
  function buildBg() {
    if (BG) return BG;
    BG = {};
    BG.sky = A.bake(W, HZ + 4, 2, function (x) { A.sky(x, W, HZ + 4, HZ + 4); });
    BG.ground = A.bake(W, H - HZ, 1, function (x, w, h) {
      var g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#c2cdee'); g.addColorStop(0.18, '#d9e2f6'); g.addColorStop(1, '#eef3fc');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
    BG.haze = A.bake(W, 200, 1, function (x, w, h) {
      var g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(232,224,246,0.95)'); g.addColorStop(0.3, 'rgba(225,232,248,0.45)'); g.addColorStop(1, 'rgba(225,232,248,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
    BG.mtn = A.bake(W + 240, HZ + 4, 2, function (x, w) {
      ridge(x, w, HZ + 2, 9, 70, 150, '#a9b6e6', '#eef2ff', 11);
      ridge(x, w, HZ + 2, 13, 34, 82, '#8a99d2', '#f4f7ff', 23);
      // distant tree line
      var r = U.seeded(5);
      for (var tx = -10; tx < w + 10; tx += 9 + r() * 10) {
        var th = 12 + r() * 16, tw = th * 0.42;
        x.fillStyle = '#4e6d9c'; x.beginPath(); x.moveTo(tx, HZ + 3 - th); x.lineTo(tx + tw, HZ + 3); x.lineTo(tx - tw, HZ + 3); x.closePath(); x.fill();
        x.fillStyle = 'rgba(240,246,255,0.8)'; x.beginPath(); x.moveTo(tx, HZ + 3 - th); x.lineTo(tx + tw * 0.35, HZ + 3 - th * 0.62); x.lineTo(tx - tw * 0.35, HZ + 3 - th * 0.62); x.closePath(); x.fill();
      }
    });
    return BG;
  }

  // ---------------------------------------------------------------------------
  // Sled + rider (shared by the game and the tutorial cards). Origin = ground contact centre.
  // ---------------------------------------------------------------------------
  function drawSled(ctx) {
    [-1, 1].forEach(function (sx) {
      ctx.beginPath(); ctx.moveTo(sx * 50, 2); ctx.lineTo(sx * 46, -62);
      ctx.quadraticCurveTo(sx * 45, -94, sx * 31, -90); ctx.quadraticCurveTo(sx * 21, -86, sx * 29, -77);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = 11; ctx.strokeStyle = C.out; ctx.stroke();
      ctx.lineWidth = 5.5; ctx.strokeStyle = C.woodDark; ctx.stroke();
    });
    A.box(ctx, -40, -84, 80, 11, 5, C.woodLight, 3);
    A.poly(ctx, [-57, -8, 57, -8, 54, 5, -54, 5], C.woodDark, 3);
    A.shape(ctx, function (c) { c.moveTo(-57, -8); c.lineTo(57, -8); c.lineTo(47, -70); c.lineTo(-47, -70); c.closePath(); }, C.wood, 3);
    ctx.save(); ctx.beginPath(); ctx.moveTo(-57, -8); ctx.lineTo(57, -8); ctx.lineTo(47, -70); ctx.lineTo(-47, -70); ctx.closePath(); ctx.clip();
    ctx.strokeStyle = 'rgba(95,52,26,0.55)'; ctx.lineWidth = 2.5;
    for (var k = 1; k < 4; k++) { var y = -8 - k * 15.5; ctx.beginPath(); ctx.moveTo(-60, y); ctx.lineTo(60, y); ctx.stroke(); }
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#3d1e0c'; ctx.beginPath(); ctx.moveTo(30, -8); ctx.lineTo(60, -8); ctx.lineTo(50, -70); ctx.lineTo(26, -70); ctx.fill();
    ctx.restore();
    A.shape(ctx, function (c) { c.moveTo(-57, -8); c.lineTo(57, -8); c.lineTo(47, -70); c.lineTo(-47, -70); c.closePath(); }, null, 3);
    A.highlight(ctx, -30, -58, 14, 4, 0.45);
  }
  /** opts: { t, lean, pose, back, dir, blink } */
  function drawRider(ctx, look, pal, opts) {
    var lean = opts.lean || 0, pose = opts.pose || 'sit';
    drawSled(ctx);
    var cx = lean * 5;
    AB.chars.draw(ctx, cx, pose === 'sit' ? -26 : -30, look, { t: opts.t || 0, pose: pose, back: !!opts.back, dir: opts.dir || 1, noShadow: true, scale: 1 });
    if (pose === 'sit') {
      // red rope from the front bar to the mittens
      var mit = pal.shade || U.shade(pal.body, -0.12);
      [-1, 1].forEach(function (sx) {
        var hx = cx + sx * 36, hy = -50;
        ctx.beginPath(); ctx.moveTo(sx * 34, -80); ctx.quadraticCurveTo(sx * 52, -70, hx, hy);
        ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = C.out; ctx.stroke();
        ctx.lineWidth = 3.6; ctx.strokeStyle = C.red; ctx.stroke();
        A.circle(ctx, hx, hy, 7.5, mit, 2.5);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Small icons
  // ---------------------------------------------------------------------------
  function flakeVec(ctx, r) {
    A.snowflake(ctx, 0, 0, r, C.iceDeep, Math.max(3, r * 0.34));
    A.snowflake(ctx, 0, 0, r, '#ffffff', Math.max(1.6, r * 0.17));
    A.circle(ctx, 0, 0, r * 0.2, '#ffffff', Math.max(1.2, r * 0.07), C.iceDeep);
  }
  function starVec(ctx, r) {
    A.star(ctx, 0, 0, r, C.yellow, Math.max(2, r * 0.13), 5, 0.5);
    A.highlight(ctx, -r * 0.25, -r * 0.3, r * 0.2, r * 0.1, 0.85);
  }
  // Pre-rendered icons (radial glows and many strokes are slow to draw every frame).
  var ICO = null;
  function icons() {
    if (ICO) return ICO;
    var R = 40;
    ICO = {
      flake: mk(R * 2 + 12, R * 2 + 12, R + 6, R + 6, function (x) { flakeVec(x, R); }),
      star: mk(R * 2 + 12, R * 2 + 12, R + 6, R + 6, function (x) { starVec(x, R); }),
      fglow: mk(R * 4.4, R * 4.4, R * 2.2, R * 2.2, function (x) { A.glow(x, 0, 0, R * 2.1, 'rgba(120,220,255,', 1); }),
      sglow: mk(R * 4.6, R * 4.6, R * 2.3, R * 2.3, function (x) { A.glow(x, 0, 0, R * 2.2, 'rgba(255,214,90,', 1); }),
      R: R
    };
    return ICO;
  }
  function iconAt(ctx, sp, glow, ga, x, y, r, rot) {
    var I = icons(), k = r / I.R;
    if (ga) { var a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * ga; blit(ctx, glow, x, y, k); ctx.globalAlpha = a0; }
    if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); blit(ctx, sp, 0, 0, k); ctx.restore(); }
    else blit(ctx, sp, x, y, k);
  }
  function flakeIcon(ctx, x, y, r, rot, glow) { var I = icons(); iconAt(ctx, I.flake, I.fglow, glow || 0, x, y, r, rot); }
  function starIcon(ctx, x, y, r, rot, glow) { var I = icons(); iconAt(ctx, I.star, I.sglow, glow || 0, x, y, r, rot); }

  // ---------------------------------------------------------------------------
  // Tutorial cards
  // ---------------------------------------------------------------------------
  function tutScene(ctx, w, h, t, speed) {
    var hz = 74;
    var g = ctx.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, C.skyTop); g.addColorStop(1, C.skyLow);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, hz + 2);
    A.aurora(ctx, w, 4, 46, t, 0.45);
    A.poly(ctx, [-10, hz + 2, 40, 42, 90, 62, 150, 30, 210, 60, 270, 36, 330, 58, 370, 44, 370, hz + 2], '#a9b6e6', 2, '#5d6ea5');
    var gg = ctx.createLinearGradient(0, hz, 0, h); gg.addColorStop(0, '#cdd8f1'); gg.addColorStop(1, '#f5f9ff');
    ctx.fillStyle = gg; ctx.fillRect(0, hz, w, h - hz);
    A.poly(ctx, [w / 2 - 36, hz, w / 2 + 36, hz, w + 30, h, -30, h], '#f8fbff', 0);
    ctx.save(); ctx.beginPath(); ctx.moveTo(w / 2 - 36, hz); ctx.lineTo(w / 2 + 36, hz); ctx.lineTo(w + 30, h); ctx.lineTo(-30, h); ctx.closePath(); ctx.clip();
    for (var i = 0; i < 7; i++) {
      var p = ((i / 7) + t * (speed || 0.5)) % 1, p2 = ((i + 0.5) / 7 + t * (speed || 0.5)) % 1;
      if (p2 < p) continue;
      var y1 = hz + (h - hz) * p * p, y2 = hz + (h - hz) * p2 * p2;
      ctx.fillStyle = 'rgba(205,219,242,0.45)'; ctx.fillRect(0, y1, w, y2 - y1);
    }
    ctx.restore();
    A.line(ctx, [w / 2 - 36, hz, -30, h], 2.5, 'rgba(150,175,220,0.7)'); A.line(ctx, [w / 2 + 36, hz, w + 30, h], 2.5, 'rgba(150,175,220,0.7)');
    for (var k = 0; k < 4; k++) {
      var q = ((k / 4) + t * (speed || 0.5)) % 1, s = 0.12 + 0.75 * q * q, y = hz + (h - hz) * q * q;
      var half = 36 + (w / 2 + 30 - 36) * q * q;
      A.pine(ctx, w / 2 - half - 40 * s, y, 130 * s); A.pine(ctx, w / 2 + half + 40 * s, y, 130 * s);
    }
    return hz;
  }
  function tutLane(w, h, hz, p, u) { var half = 36 + (w / 2 + 30 - 36) * p * p; return { x: w / 2 + u * half, y: hz + (h - hz) * p * p, s: 0.12 + 0.75 * p * p }; }
  function tutRider(ctx, x, y, s, t, lean, extraY) {
    var look = defaultLook(), pal = AB.chars.palette(look);
    A.shadow(ctx, x, y + 2, 60 * s, 16 * s, 0.22);
    ctx.save(); ctx.translate(x, y - (extraY || 0)); ctx.scale(s, s); ctx.rotate((lean || 0) * 0.1);
    drawRider(ctx, look, pal, { t: t, lean: lean || 0, pose: 'sit', back: true, dir: (lean || 0) < -0.1 ? -1 : 1 });
    ctx.restore();
  }
  function tutArrow(ctx, x, y, r, dir, lit) {
    ctx.save(); ctx.globalAlpha = lit ? 0.95 : 0.55;
    A.circle(ctx, x, y, r, lit ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)', 3, 'rgba(38,50,77,0.6)');
    ctx.beginPath(); ctx.moveTo(x + dir * -r * 0.18, y - r * 0.42); ctx.lineTo(x + dir * r * 0.3, y); ctx.lineTo(x + dir * -r * 0.18, y + r * 0.42);
    ctx.lineWidth = r * 0.3; ctx.strokeStyle = C.out; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.lineWidth = r * 0.16; ctx.strokeStyle = lit ? C.teal : '#ffffff'; ctx.stroke();
    ctx.restore();
  }

  var tutorial = [
    {
      caption: 'Steer left and right',
      draw: function (ctx, w, h, t) {
        var hz = tutScene(ctx, w, h, t, 0.5);
        var ph = t * 1.6, x = w / 2 + Math.sin(ph) * 92, v = Math.cos(ph);
        // trail
        ctx.strokeStyle = 'rgba(140,165,210,0.6)'; ctx.lineWidth = 3;
        [-20, 20].forEach(function (o) { ctx.beginPath(); for (var i = 0; i <= 8; i++) { var tt = ph - i * 0.08, xx = w / 2 + Math.sin(tt) * 92 + o; if (i) ctx.lineTo(xx, h - 34 + i * 6); else ctx.moveTo(xx, h - 34); } ctx.stroke(); });
        tutRider(ctx, x, h - 30, 0.55, t, U.clamp(v * 1.4, -1, 1));
        tutArrow(ctx, 40, h - 40, 30, -1, v < -0.15); tutArrow(ctx, w - 40, h - 40, 30, 1, v > 0.15);
        var fx = v < 0 ? 40 : w - 40, pr = (t * 2) % 1;
        if (Math.abs(v) > 0.15) {
          ctx.save(); ctx.globalAlpha = 1 - pr; A.circle(ctx, fx, h - 40, 30 + pr * 16, null, 3, '#ffffff'); ctx.restore();
        }
        void hz;
      }
    },
    {
      caption: 'Catch snowflakes and stars',
      draw: function (ctx, w, h, t) {
        var hz = tutScene(ctx, w, h, t, 0.45);
        var sx = w / 2 + Math.sin(t * 0.9) * 30;
        for (var i = 0; i < 3; i++) {
          var p = (t * 0.42 + i / 3) % 1, isStar = i === 2;
          if (p < 0.9) {
            var L = tutLane(w, h, hz, p, 0);
            var ix = U.lerp(L.x, sx, p * p), iy = L.y - 40 * L.s + Math.sin(t * 4 + i) * 3;
            if (isStar) starIcon(ctx, ix, iy, 30 * L.s + 4, Math.sin(t * 3) * 0.2, 0.5);
            else flakeIcon(ctx, ix, iy, 24 * L.s + 4, t, 0.6);
          } else {
            var q = (p - 0.9) / 0.1;
            ctx.save(); ctx.globalAlpha = 1 - q; ctx.fillStyle = isStar ? C.coinDark : C.iceDeep; ctx.font = '900 30px ' + AB.FONT; ctx.textAlign = 'center';
            ctx.fillText(isStar ? '+5' : '+1', sx + 40, h - 90 - q * 40); ctx.restore();
            for (var k = 0; k < 5; k++) A.sparkle(ctx, sx + Math.cos(k * 1.3) * (20 + q * 40), h - 80 + Math.sin(k * 1.3) * (14 + q * 30), 7 * (1 - q), 1 - q);
          }
        }
        tutRider(ctx, sx, h - 30, 0.55, t, Math.cos(t * 0.9) * 0.5);
      }
    },
    {
      caption: 'Jump off ramps!',
      draw: function (ctx, w, h, t) {
        var hz = tutScene(ctx, w, h, t, 0.55);
        var c = (t % 3.2) / 3.2, pr = c / 0.5;
        var sp = buildSprites();
        if (pr < 1.08) { var L = tutLane(w, h, hz, Math.min(1, pr * 0.92), 0); blit(ctx, sp.ramp, L.x, L.y, L.s * 0.55); }
        var jh = 0;
        if (c > 0.5 && c < 0.88) jh = Math.sin((c - 0.5) / 0.38 * Math.PI) * 80;
        for (var k = 0; k < 3; k++) {
          var gone = c > 0.56 + k * 0.08;
          if (gone && c < 0.56 + k * 0.08 + 0.12) { var q = (c - 0.56 - k * 0.08) / 0.12; for (var m = 0; m < 4; m++) A.sparkle(ctx, w / 2 + Math.cos(m * 1.6) * q * 40, h - 140 + Math.sin(m * 1.6) * q * 30, 8 * (1 - q), 1 - q); }
          if (gone) continue;
          var pk = Math.max(0, pr * 0.92 - 0.14 * (k + 1)), L2 = tutLane(w, h, hz, Math.min(0.95, pk), 0);
          starIcon(ctx, L2.x, L2.y - (110 + (k === 1 ? 14 : 0)) * L2.s * 1.1 - 6, 26 * L2.s + 5, Math.sin(t * 3 + k) * 0.2, 0.45);
        }
        tutRider(ctx, w / 2, h - 30, 0.55, t, 0, jh);
      }
    }
  ];

  // ---------------------------------------------------------------------------
  // The game
  // ---------------------------------------------------------------------------
  AB.registerMinigame({
    id: 'sled',
    title: 'Sled Run',
    tutorial: tutorial,
    create: function (host) {
      var spr = buildSprites(), bg = buildBg();
      var look = host.look || defaultLook();
      var pal = AB.chars.palette(look);
      var spDef = AB.chars.species[look.species] || AB.chars.species.penguin;
      var snowfall = new A.SnowField(60, W, H, { wind: -10 });

      var phase = 'count', phaseT = 0, gameT = 0, elapsed = 0;
      var pz = 0, prevPz = 0, px = 0, vx = 0, camX = 0, lean = 0, hgt = 0, vh = 0, air = false;
      var state = 'ride', stateT = 0, invuln = 0, speedMul = 1, spinAng = 0, squash = 0, shakeT = 0;
      var bend = 0, bendTarget = 0, bendTimer = 2;
      var objs = [], parts = [], trail = [], lastTrailZ = -999, trailGap = false;
      var nextZ = 2600, nextTreeZ = -900, nextBankZ = -700, nextGlintZ = -600, patternsSinceRamp = 2, lastPattern = '';
      var finishObj = null, finishP0 = 0, finishPz0 = 0, endBase = 0;
      var flakes = 0, stars = 0, jumps = 0, crashes = 0;
      var keys = { left: false, right: false }, btn = 0, drag = false, dragX = 640;
      var finished = false, curSpeed = 0, curBase = 0, sprayAcc = 0, powderAcc = 0;
      var skyCv = null, skyFrame = 0, SKY_S = 0.8;
      var hudFlakePop = 0, hudStarPop = 0, lastCount = 3, goT = 0, edgeT = 0;

      function sfx(n) { try { if (host && host.sfx) host.sfx(n); } catch (e) { /* sound is optional */ } }

      // ---- projection ---------------------------------------------------------
      function bendOff(d) { var k = (d - DP) / 9000; return bend * 430 * k * Math.abs(k); }
      function depth(z) { return z - pz + DP; }
      function sxAt(x, d) { return 640 + (x - camX) * F / d + bendOff(d); }
      function syAt(d, hh) { return HZ + (CAMH - (hh || 0)) * F / d; }

      // ---- particles ------------------------------------------------------------
      function addPart(p) { if (parts.length < 450) parts.push(p); }
      function spray(x, y, dirx, n, power) {
        for (var i = 0; i < n; i++) addPart({ k: 'spray', x: x + U.rand(-8, 8), y: y + U.rand(-6, 4), vx: dirx * U.rand(80, 260) * (power || 1) + U.rand(-30, 30), vy: U.rand(-260, -80) * (power || 1), g: 700, drift: 260, r: U.rand(4, 9), life: U.rand(0.35, 0.7), max: 0.7 });
      }
      function puffBurst(x, y, n, size) {
        for (var i = 0; i < n; i++) {
          var a = Math.random() * Math.PI * 2, sp = U.rand(60, 260);
          addPart({ k: 'puff', x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6 - 60, g: 120, drift: 80, r: U.rand(14, 26) * (size || 1), grow: U.rand(20, 40), life: U.rand(0.5, 0.95), max: 0.95 });
        }
      }
      function sparkBurst(x, y, n, color) {
        for (var i = 0; i < n; i++) {
          var a = Math.random() * Math.PI * 2, sp = U.rand(80, 260);
          addPart({ k: 'spark', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0, drift: 120, r: U.rand(6, 12), life: U.rand(0.35, 0.65), max: 0.65, c: color });
        }
      }
      function floatText(x, y, txt, color) { addPart({ k: 'txt', x: x, y: y, vx: 0, vy: -110, g: 0, drift: 0, r: 0, life: 0.9, max: 0.9, txt: txt, c: color }); }
      function confetti(n) {
        var cols = [C.red, C.yellow, C.teal, C.pink, C.blue, C.purple, C.green];
        for (var i = 0; i < n; i++) addPart({ k: 'conf', x: U.rand(0, W), y: U.rand(-200, -10), vx: U.rand(-60, 60), vy: U.rand(120, 300), g: 60, drift: 0, r: U.rand(6, 11), life: U.rand(2.2, 3.4), max: 3.4, c: U.pick(cols), rot: Math.random() * 6, vr: U.rand(-8, 8) });
      }

      // ---- spawning ---------------------------------------------------------------
      function add(o) { o.done = false; o.hk = o.kind || o.type; objs.push(o); return o; }
      function flake(x, z, hh) { return add({ type: 'flake', x: U.clamp(x, -PXMAX + 10, PXMAX - 10), z: z, h: hh || 48, ph: Math.random() * 6 }); }
      function star(x, z, hh) { return add({ type: 'star', x: U.clamp(x, -PXMAX + 10, PXMAX - 10), z: z, h: hh || 56, ph: Math.random() * 6 }); }
      function obstacle(kind, x, z) { return add({ type: 'obs', kind: kind, x: x, z: z, wob: 0 }); }
      function offC(a, b) { return (Math.random() < 0.5 ? -1 : 1) * U.rand(a, b); }
      function obsKind() { return U.pick(['snowman', 'rock', 'spine', 'snowman']); }

      var PATTERNS = {
        flakeLine: function (z0) {
          var x0 = offC(110, 380), dx = U.rand(-24, 24);
          for (var i = 0; i < 5; i++) flake(x0 + i * dx, z0 + i * 170);
          return 5 * 170;
        },
        flakeWave: function (z0) {
          var xc = offC(60, 200), amp = U.rand(110, 200), ph = Math.random() * 6;
          for (var i = 0; i < 7; i++) flake(xc + amp * Math.sin(i * 0.8 + ph), z0 + i * 160);
          return 7 * 160;
        },
        obsFlakes: function (z0) {
          var ox = U.rand(-360, 360), side = ox > 0 ? -1 : 1, fx = ox + side * U.rand(230, 300);
          obstacle(obsKind(), ox, z0 + 320);
          for (var i = 0; i < 3; i++) flake(fx, z0 + 160 + i * 150);
          return 760;
        },
        ramp: function (z0) {
          var rx = offC(90, 320);
          for (var i = 0; i < 2; i++) flake(rx, z0 + 150 + i * 150);
          var r = add({ type: 'ramp', x: rx, z: z0 + 560, stars: [] });
          var hs = [240, 272, 240];
          for (var k = 0; k < 3; k++) { var s = star(rx, z0 + 560 + 360 + k * 230, hs[k]); s.air = true; r.stars.push(s); }
          flake(rx, z0 + 560 + 1400);
          return 560 + 1450;
        },
        ice: function (z0) {
          var ix = offC(60, 300);
          add({ type: 'ice', x: ix, z: z0 + 330 });
          for (var i = 0; i < 3; i++) flake(ix, z0 + 200 + i * 120);
          return 820;
        },
        bumps: function (z0) {
          var bx = U.rand(-240, 240);
          for (var i = 0; i < 3; i++) { var x = bx + (i % 2 ? 130 : -130); add({ type: 'bump', x: x, z: z0 + i * 340 }); flake(x, z0 + i * 340 + 120, 90); }
          return 1020;
        },
        gate: function (z0) {
          var gx = U.rand(-230, 230);
          obstacle(obsKind(), gx - 230, z0 + 330); obstacle(obsKind(), gx + 230, z0 + 330);
          for (var i = 0; i < 4; i++) flake(gx, z0 + 100 + i * 140);
          if (Math.random() < 0.3) star(gx, z0 + 720);
          return 820;
        },
        groundStar: function (z0) {
          var sx = offC(150, 330);
          star(sx, z0 + 320);
          for (var i = 0; i < 4; i++) { var a = i / 4 * Math.PI * 2 + 0.785; flake(sx + Math.cos(a) * 150, z0 + 320 + Math.sin(a) * 220); }
          return 700;
        },
        slalom: function (z0) {
          var s = Math.random() < 0.5 ? -1 : 1;
          for (var i = 0; i < 3; i++) {
            var ox = s * U.rand(140, 300);
            obstacle(obsKind(), ox, z0 + 200 + i * 460);
            flake(-ox * 0.6, z0 + 260 + i * 460);
            s = -s;
          }
          return 1500;
        }
      };
      function choosePattern(diff) {
        if (patternsSinceRamp >= 6) return 'ramp';
        var w = [['flakeLine', 3], ['flakeWave', 3], ['obsFlakes', 2.5 + diff * 2], ['ramp', patternsSinceRamp < 2 ? 0 : 1.3], ['ice', 1.3], ['bumps', 1.1], ['groundStar', 0.9]];
        if (diff > 0.25) w.push(['gate', 2.2 * diff]);
        if (diff > 0.45) w.push(['slalom', 2.2 * diff]);
        var tot = 0; w.forEach(function (e) { if (e[0] === lastPattern && e[0] !== 'flakeWave') e[1] *= 0.4; tot += e[1]; });
        var r = Math.random() * tot;
        for (var i = 0; i < w.length; i++) { r -= w[i][1]; if (r <= 0) return w[i][0]; }
        return 'flakeLine';
      }
      function spawnGameplay() {
        while (nextZ < pz + DFAR - 300 && !finishObj) {
          var diff = U.clamp((elapsed + (nextZ - pz) / Math.max(900, curSpeed || 1000)) / T_RUN, 0, 1);
          var name = nextZ < 3000 ? 'flakeLine' : choosePattern(diff);
          var len = nextZ < 3000 ? (function () { for (var i = 0; i < 5; i++) flake(0, nextZ + i * 170); return 850; })() : PATTERNS[name](nextZ);
          patternsSinceRamp = name === 'ramp' ? 0 : patternsSinceRamp + 1;
          lastPattern = name;
          nextZ += len + U.rand(700, 1000) - diff * 200;
        }
      }
      function spawnDecor() {
        var lim = pz + DFAR;
        while (nextTreeZ < lim) {
          for (var side = -1; side <= 1; side += 2) {
            if (Math.random() < 0.88) add({ type: 'tree', x: side * (PISTE + 150 + Math.pow(Math.random(), 1.3) * 1150), z: nextTreeZ + U.rand(0, 90), v: U.randi(0, 2), sz: U.rand(0.8, 1.15) });
          }
          if (Math.random() < 0.12) { var sd = Math.random() < 0.5 ? -1 : 1; add({ type: 'deco', kind2: Math.random() < 0.5 ? 'rock' : 'snowman', x: sd * (PISTE + 230 + Math.random() * 500), z: nextTreeZ + 40 }); }
          nextTreeZ += U.rand(85, 140);
        }
        while (nextBankZ < lim) {
          add({ type: 'bank', x: -(PISTE + 36 + Math.random() * 30), z: nextBankZ + U.rand(0, 40), sz: U.rand(0.8, 1.1) });
          add({ type: 'bank', x: (PISTE + 36 + Math.random() * 30), z: nextBankZ + U.rand(0, 40), sz: U.rand(0.8, 1.1) });
          nextBankZ += U.rand(190, 260);
        }
        while (nextGlintZ < lim) {
          add({ type: 'glint', x: U.rand(-PISTE + 40, PISTE - 40), z: nextGlintZ, ph: Math.random() * 6 });
          nextGlintZ += U.rand(70, 130);
        }
      }
      spawnDecor(); spawnGameplay();

      // ---- events -----------------------------------------------------------------
      function playerScreenX() { return 640 + (px - camX); }
      function collect(o) {
        o.done = true;
        var x = playerScreenX() + (o.x - px) * 0.6, y = PY - o.h - 10;
        if (o.type === 'star') {
          stars++; hudStarPop = 1; sfx('star');
          sparkBurst(x, y, 12, C.yellow); floatText(x, y - 30, '+5', C.coinDark);
        } else {
          flakes++; hudFlakePop = 1; sfx('ding');
          sparkBurst(x, y, 6, '#bff0ff'); floatText(x, y - 24, '+1', C.iceDeep);
        }
      }
      function crash(o) {
        state = 'tumble'; stateT = 0; speedMul = 0.3; vx = 0; crashes++; shakeT = 0.35;
        o.poof = true;
        sfx('oops'); sfx('pop');
        puffBurst(playerScreenX(), PY - 40, 18, 1.2);
        puffBurst(playerScreenX(), PY - 90, 10, 0.9);
        trailGap = true;
      }
      function startJump(o) {
        air = true; vh = JUMP_V; jumps++; sfx('jump');
        var taus = [0.28, 0.46, 0.64];
        (o.stars || []).forEach(function (s, i) { if (!s.done) { s.z = pz + curSpeed * taus[i]; s.x = px; } });
        spray(playerScreenX() - 40, PY, -1, 6); spray(playerScreenX() + 40, PY, 1, 6);
        sparkBurst(playerScreenX(), PY - 60, 8, C.yellow);
      }
      function hit(o) {
        if (o.type === 'flake' || o.type === 'star') {
          if (Math.abs(hgt + 50 - o.h) < 125) collect(o);
          return;
        }
        if (phase !== 'run') return;
        if (o.type === 'obs') {
          if (hgt < 45 && invuln <= 0 && state !== 'tumble') { o.done = true; crash(o); }
        } else if (o.type === 'ice') {
          if (!air && state === 'ride') { o.done = true; state = 'spin'; stateT = 0; sfx('whoosh'); sparkBurst(playerScreenX(), PY - 50, 8, '#c4ebf7'); }
        } else if (o.type === 'ramp') {
          if (hgt < 30 && state !== 'tumble') { o.done = true; startJump(o); }
        } else if (o.type === 'bump') {
          if (!air && state !== 'tumble') { o.done = true; air = true; vh = 430; sfx('tap'); spray(playerScreenX(), PY, 0, 5); }
        }
      }

      function progress() {
        if (phase === 'finish') return 1;
        if (phase === 'count') return 0;
        if (!finishObj) return Math.min(0.99, elapsed / T_RUN);
        return finishP0 + (1 - finishP0) * U.clamp((pz - finishPz0) / (finishObj.z - STOP_GAP - BRAKE - finishPz0), 0, 1);
      }

      function doFinish() {
        if (finished) return;
        finished = true;
        var score = flakes + stars * 5;
        var coins = U.clamp(Math.round(15 + COIN_K * score), 15, 120);
        try {
          host.finish({
            score: score, coins: coins,
            stats: [
              { icon: 'flake', label: 'Snowflakes', value: flakes },
              { icon: 'star', label: 'Stars', value: stars },
              { icon: 'coin', label: 'Jumps', value: jumps }
            ]
          });
        } catch (e) { /* shell problems must not break the loop */ }
      }

      // ---- update -------------------------------------------------------------------
      function update(dt) {
        if (finished) return;
        dt = Math.min(0.05, Math.max(0, dt || 0));
        gameT += dt; phaseT += dt;
        snowfall.update(dt);
        hudFlakePop = Math.max(0, hudFlakePop - dt * 4); hudStarPop = Math.max(0, hudStarPop - dt * 3);
        shakeT = Math.max(0, shakeT - dt); squash = Math.max(0, squash - dt * 5); goT = Math.max(0, goT - dt);

        for (var i = parts.length - 1; i >= 0; i--) {
          var p = parts[i];
          p.life -= dt;
          if (p.life <= 0) { parts.splice(i, 1); continue; }
          p.vy += p.g * dt; p.x += p.vx * dt; p.y += (p.vy + p.drift) * dt;
          if (p.grow) p.r += p.grow * dt;
          if (p.vr) p.rot += p.vr * dt;
          if (p.k === 'conf') p.x += Math.sin(gameT * 3 + p.rot) * 30 * dt;
        }

        bendTimer -= dt;
        if (bendTimer <= 0) { bendTarget = U.rand(-1, 1); bendTimer = U.rand(3, 6); }
        bend += (bendTarget - bend) * Math.min(1, dt * 0.45);

        if (phase === 'count') {
          var c = 3 - Math.floor(phaseT / 0.8);
          if (c !== lastCount && c > 0) { lastCount = c; sfx('tap'); }
          if (phaseT >= 2.4) { phase = 'run'; phaseT = 0; goT = 0.8; sfx('bell'); }
          camX += (px * 0.55 - camX) * Math.min(1, dt * 4);
          return;
        }

        // speed
        if (phase === 'run') {
          elapsed += dt;
          curBase = 1000 + 750 * Math.min(1, elapsed / T_RUN);
          curBase *= Math.min(1, 0.25 + phaseT / 1.0);
        } else {
          var rem = finishObj.z - pz - STOP_GAP;
          curBase = rem > 0 ? Math.max(40, endBase * Math.sqrt(U.clamp(rem / BRAKE, 0, 1))) : 0;
          if (curBase * dt > rem) curBase = Math.max(0, rem / dt);
        }
        if (state !== 'tumble') speedMul = Math.min(1, speedMul + dt * 0.42);
        curSpeed = curBase * speedMul;
        prevPz = pz; pz += curSpeed * dt;

        // states
        if (state === 'tumble') {
          var before = stateT; stateT += dt;
          if (before < 0.72 && stateT >= 0.72) {
            for (var k = 0; k < 10; k++) addPart({ k: 'chunk', x: playerScreenX() + U.rand(-20, 20), y: PY - 110 + U.rand(-10, 10), vx: U.rand(-240, 240), vy: U.rand(-320, -140), g: 900, drift: 0, r: U.rand(5, 9), life: 0.8, max: 0.8 });
            sfx('pop');
          }
          if (stateT >= 1.15) { state = 'ride'; stateT = 0; invuln = 1.4; puffBurst(playerScreenX(), PY - 10, 6, 0.6); }
        } else if (state === 'spin') {
          stateT += dt;
          spinAng = U.ease(Math.min(1, stateT / 0.9)) * Math.PI * 2;
          if (Math.random() < 0.5) addPart({ k: 'spark', x: playerScreenX() + Math.cos(gameT * 20) * 60, y: PY - 40 + Math.sin(gameT * 20) * 20, vx: 0, vy: 0, g: 0, drift: 150, r: 7, life: 0.4, max: 0.4, c: '#ffffff' });
          if (stateT >= 0.9) { state = 'ride'; stateT = 0; spinAng = 0; }
        }
        invuln = Math.max(0, invuln - dt);

        // steering
        var s = 0;
        if (btn) s = btn;
        else if (drag) { var tx = camX + (dragX - 640); s = Math.abs(tx - px) < 12 ? 0 : U.clamp((tx - px) / 80, -1, 1); }
        if (keys.left || keys.right) s = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        var ctl = state === 'tumble' ? 0 : state === 'spin' ? 0.6 : air ? 0.55 : 1;
        if (phase === 'finish') ctl *= 0.3;
        var tvx = s * 680 * ctl;
        vx += (tvx - vx) * (1 - Math.exp(-dt * 7));
        px += vx * dt;
        edgeT = Math.max(0, edgeT - dt);
        if (px > PXMAX || px < -PXMAX) {
          var side = px > 0 ? 1 : -1;
          px = side * PXMAX;
          if (vx * side > 0) { if (vx * side > 200 && edgeT <= 0) { spray(playerScreenX() + side * 50, PY - 4, side, 6, 1.1); edgeT = 0.25; } vx = 0; }
        }
        lean += (s * ctl - lean) * (1 - Math.exp(-dt * 8));
        camX += (px * 0.55 - camX) * (1 - Math.exp(-dt * 4));

        // jump physics
        if (air) {
          vh -= GRAV * dt; hgt += vh * dt;
          if (hgt <= 0) {
            hgt = 0; air = false; squash = 1; trailGap = true;
            if (vh < -600) { sfx('pop'); spray(playerScreenX() - 46, PY, -1, 7, 0.9); spray(playerScreenX() + 46, PY, 1, 7, 0.9); }
            vh = 0;
          }
        }

        // snow spray & powder
        if (!air && state === 'ride' && Math.abs(vx) > 220) {
          sprayAcc += dt * 45 * Math.abs(vx) / 680;
          var dir = vx > 0 ? 1 : -1;
          while (sprayAcc > 1) { sprayAcc -= 1; spray(playerScreenX() - dir * 52, PY - 2, -dir, 1); }
        }
        if (!air && state !== 'tumble' && curSpeed > 400) {
          powderAcc += dt * (curSpeed / 120);
          while (powderAcc > 1) {
            powderAcc -= 1;
            var sx2 = Math.random() < 0.5 ? -46 : 46;
            addPart({ k: 'spray', x: playerScreenX() + sx2 + U.rand(-6, 6), y: PY + 4, vx: sx2 * 0.8 + U.rand(-20, 20), vy: U.rand(-60, -10), g: 200, drift: curSpeed * 0.35, r: U.rand(2.5, 5), life: U.rand(0.25, 0.45), max: 0.45 });
          }
        }

        // trail
        if (air || state === 'tumble') trailGap = true;
        else if (pz - lastTrailZ > 16) { trail.push({ x: px, z: pz, gap: trailGap }); trailGap = false; lastTrailZ = pz; }
        while (trail.length && pz - trail[0].z > DP - DNEAR + 260) trail.shift();

        // collisions (swept along z so fast frames never skip)
        for (var j = 0; j < objs.length; j++) {
          var o = objs[j], hb = HB[o.hk];
          if (o.done || !hb) continue;
          if (o.z + hb[1] < prevPz || o.z - hb[1] > pz) continue;
          if (Math.abs(o.x - px) > hb[0] + (o.type === 'flake' || o.type === 'star' ? 30 : 36)) continue;
          hit(o);
        }
        for (var w = 0; w < objs.length; w++) if (objs[w].wob) objs[w].wob = Math.max(0, objs[w].wob - dt * 1.5);

        // world housekeeping
        spawnDecor(); spawnGameplay();
        if (gameT % 0.5 < dt) objs = objs.filter(function (ob) { return ob.z - pz + DP > 300 && !(ob.done && (ob.type === 'flake' || ob.type === 'star')); });

        // finish line
        if (phase === 'run' && !finishObj && elapsed >= T_RUN - 5.3) {
          finishP0 = progress(); finishPz0 = pz;
          finishObj = add({ type: 'finish', x: 0, z: pz + 9900 });
          var cut = finishObj.z - STOP_GAP - BRAKE - 400;
          objs = objs.filter(function (ob) { return !(ob.z > cut && (ob.type === 'flake' || ob.type === 'star' || ob.type === 'obs' || ob.type === 'ramp' || ob.type === 'ice' || ob.type === 'bump')); });
        }
        if (phase === 'run' && finishObj && pz >= finishObj.z - STOP_GAP - BRAKE) {
          phase = 'finish'; phaseT = 0; endBase = curBase * speedMul;
          if (state === 'tumble') { state = 'ride'; stateT = 0; }
          invuln = 0; sfx('success'); confetti(140);
          sparkBurst(playerScreenX(), PY - 90, 16, C.yellow);
        }
        if (phase === 'finish' && phaseT >= 3.6) doFinish();
      }

      // ---- drawing ------------------------------------------------------------------
      function drawGround(ctx) {
        ctx.drawImage(bg.ground, 0, HZ, W, H - HZ);
        // rows at band boundaries
        var BAND = 300, rows = [], zA = pz - DP + DNEAR - 80, zB = pz - DP + DFAR;
        rows.push(zA);
        for (var z = Math.ceil(zA / BAND) * BAND; z < zB; z += BAND) rows.push(z);
        rows.push(zB);
        var R = rows.map(function (z) {
          var d = depth(z), s = F / d, off = bendOff(d);
          return { z: z, d: d, y: HZ + CAMH * s, l: 640 + (-PISTE - camX) * s + off, r: 640 + (PISTE - camX) * s + off, s: s, off: off };
        });
        // piste body
        ctx.beginPath();
        ctx.moveTo(R[0].l, R[0].y);
        for (var i = 1; i < R.length; i++) ctx.lineTo(R[i].l, R[i].y);
        for (var j = R.length - 1; j >= 0; j--) ctx.lineTo(R[j].r, R[j].y);
        ctx.closePath(); ctx.fillStyle = '#f7faff'; ctx.fill();
        // alternating bands (speed cue), fading out toward the horizon
        for (var k = 0; k < R.length - 1; k++) {
          var a = R[k], b = R[k + 1];
          if (Math.floor(b.z / BAND + 0.001) % 2) continue;
          var al = 0.42 * U.clamp((6500 - b.d) / 4000, 0, 1);
          if (al <= 0.01) continue;
          ctx.fillStyle = 'rgba(196,212,240,' + al + ')';
          ctx.beginPath(); ctx.moveTo(a.l, a.y); ctx.lineTo(a.r, a.y); ctx.lineTo(b.r, b.y); ctx.lineTo(b.l, b.y); ctx.closePath(); ctx.fill();
        }
        // groomed corduroy lines
        ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(150,172,214,0.16)';
        ctx.beginPath();
        for (var lx = -480; lx <= 480; lx += 80) {
          for (var m = 0; m < R.length; m++) { var xx = 640 + (lx - camX) * R[m].s + R[m].off; if (m) ctx.lineTo(xx, R[m].y); else ctx.moveTo(xx, R[m].y); }
        }
        ctx.stroke();
        // piste edges
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(140,165,212,0.55)';
        ctx.beginPath(); for (var e = 0; e < R.length; e++) { if (e) ctx.lineTo(R[e].l, R[e].y); else ctx.moveTo(R[e].l, R[e].y); } ctx.stroke();
        ctx.beginPath(); for (var f = 0; f < R.length; f++) { if (f) ctx.lineTo(R[f].r, R[f].y); else ctx.moveTo(R[f].r, R[f].y); } ctx.stroke();
        // horizon haze
        ctx.drawImage(bg.haze, 0, HZ - 4, W, 200);
      }

      function drawTrail(ctx) {
        if (trail.length < 2) return;
        [-40, 40].forEach(function (o) {
          for (var pass = 0; pass < 2; pass++) {
            ctx.beginPath();
            var started = false;
            for (var i = 0; i < trail.length; i++) {
              var p = trail[i], d = depth(p.z);
              if (d < 400) continue;
              var x = sxAt(p.x + o, d), y = syAt(d);
              if (!started || p.gap) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
            }
            if (started && !air && state !== 'tumble') ctx.lineTo(sxAt(px + o, DP), PY);
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.lineWidth = pass ? 3 : 9; ctx.strokeStyle = pass ? 'rgba(255,255,255,0.7)' : 'rgba(150,172,216,0.5)';
            ctx.stroke();
          }
        });
      }

      function hazeAlpha(d) { return U.clamp((DFAR - d) / 2600, 0, 1); }

      function drawObj(ctx, o, d) {
        var s = F / d, x = sxAt(o.x, d), y = syAt(d);
        var al = hazeAlpha(d);
        if (al <= 0) return;
        ctx.globalAlpha = al;
        switch (o.type) {
          case 'tree': blit(ctx, spr.pines[o.v], x, y, s * o.sz); break;
          case 'bank': blit(ctx, spr.bank, x, y, s * o.sz); break;
          case 'deco': blit(ctx, o.kind2 === 'rock' ? spr.rock : spr.snowman, x, y, s * (o.kind2 === 'rock' ? 0.9 : 0.75)); break;
          case 'obs': {
            if (o.poof) break;
            var sp = spr[o.kind], sc = o.kind === 'snowman' ? 0.8 : o.kind === 'spine' ? 0.95 : 0.85;
            if (o.wob > 0) {
              ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(o.wob * 22) * 0.2 * o.wob); blit(ctx, sp, 0, 0, s * sc); ctx.restore();
            } else blit(ctx, sp, x, y, s * sc);
            break;
          }
          case 'flake': {
            if (o.done) break;
            var bob = Math.sin(gameT * 3 + o.ph) * 8, fy = syAt(d, o.h + bob);
            if (o.h < 120) A.shadow(ctx, x, y + 2, 20 * s, 6 * s, 0.14);
            flakeIcon(ctx, x, fy, 30 * s, gameT * 1.2 + o.ph, 0.8);
            break;
          }
          case 'star': {
            if (o.done) break;
            var bob2 = Math.sin(gameT * 3.4 + o.ph) * 9, sy2 = syAt(d, o.h + bob2), pulse = 1 + Math.sin(gameT * 6 + o.ph) * 0.07;
            if (o.h < 120) A.shadow(ctx, x, y + 2, 24 * s, 7 * s, 0.16);
            starIcon(ctx, x, sy2, 36 * s * pulse, Math.sin(gameT * 2 + o.ph) * 0.25, 0.75);
            A.sparkle(ctx, x + 30 * s, sy2 - 26 * s, 8 * s, 0.5 + 0.5 * Math.sin(gameT * 7 + o.ph));
            break;
          }
          case 'finish': drawFinish(ctx, d, s); break;
        }
        ctx.globalAlpha = 1;
      }
      function drawFlat(ctx, o, d) {
        var s = F / d, x = sxAt(o.x, d), y = syAt(d), al = hazeAlpha(d);
        if (al <= 0) return;
        ctx.globalAlpha = al;
        if (o.type === 'ice') blit(ctx, spr.ice, x, y, s);
        else if (o.type === 'bump') blit(ctx, spr.bump, x, y, s * 0.9);
        else if (o.type === 'ramp') blit(ctx, spr.ramp, x, y, s);
        else if (o.type === 'glint') { var tw = Math.sin(gameT * 2.5 + o.ph); if (tw > 0.55 && d < 5000) A.sparkle(ctx, x, y - 2, 9 * s * (tw - 0.5) * 2, 0.9); }
        else if (o.type === 'finish') {
          // checkered finish line across the piste
          var n = 14, d2 = depth(o.z + 60);
          for (var i = 0; i < n; i++) {
            for (var r = 0; r < 2; r++) {
              var xa = -PISTE + i * (2 * PISTE / n), xb = xa + 2 * PISTE / n, za = r ? d2 : d, zb = r ? depth(o.z + 120) : d2;
              ctx.fillStyle = (i + r) % 2 ? '#3d4c6e' : '#ffffff';
              ctx.beginPath(); ctx.moveTo(sxAt(xa, za), syAt(za)); ctx.lineTo(sxAt(xb, za), syAt(za)); ctx.lineTo(sxAt(xb, zb), syAt(zb)); ctx.lineTo(sxAt(xa, zb), syAt(zb)); ctx.closePath(); ctx.fill();
            }
          }
        }
        ctx.globalAlpha = 1;
      }
      function drawFinish(ctx, d, s) {
        var lx = sxAt(-PISTE + 10, d), rx = sxAt(PISTE - 10, d), gy = syAt(d);
        var poleH = 380 * s, bt = gy - poleH, bh = 70 * s;
        [lx, rx].forEach(function (x) {
          A.shadow(ctx, x, gy + 2, 24 * s, 7 * s, 0.25);
          A.box(ctx, x - 9 * s, bt - 10 * s, 18 * s, poleH + 10 * s, 6 * s, '#ffffff', Math.max(1.5, 3 * s));
          ctx.save(); ctx.beginPath(); A.rrect(ctx, x - 9 * s, bt - 10 * s, 18 * s, poleH + 10 * s, 6 * s); ctx.clip();
          ctx.fillStyle = C.red; for (var k = 0; k < 8; k++) ctx.fillRect(x - 10 * s, bt + k * poleH / 7 - 4 * s, 20 * s, poleH / 14);
          ctx.restore();
          A.box(ctx, x - 9 * s, bt - 10 * s, 18 * s, poleH + 10 * s, 6 * s, null, Math.max(1.5, 3 * s));
          A.circle(ctx, x, bt - 16 * s, 12 * s, C.yellow, Math.max(1.5, 3 * s));
        });
        // checkered banner
        var cols = 16, cw = (rx - lx) / cols;
        ctx.save(); ctx.beginPath(); A.rrect(ctx, lx, bt, rx - lx, bh, 10 * s); ctx.clip();
        for (var i = 0; i < cols; i++) for (var r = 0; r < 2; r++) { ctx.fillStyle = (i + r) % 2 ? '#3d4c6e' : '#ffffff'; ctx.fillRect(lx + i * cw, bt + r * bh / 2, cw + 1, bh / 2 + 1); }
        ctx.restore();
        A.box(ctx, lx, bt, rx - lx, bh, 10 * s, null, Math.max(2, 3.5 * s));
        var mx = (lx + rx) / 2;
        A.circle(ctx, mx, bt + bh / 2, 52 * s, C.coin, Math.max(2, 3.5 * s));
        starIcon(ctx, mx, bt + bh / 2 + 2 * s, 36 * s, Math.sin(gameT * 2) * 0.15, 0);
        // bunting under the banner
        var flagsN = 14, sag = 40 * s, cs = [C.red, C.yellow, C.teal, C.pink, C.blue];
        ctx.beginPath(); ctx.moveTo(lx, bt + bh + 6 * s);
        ctx.quadraticCurveTo(mx, bt + bh + 6 * s + sag * 2, rx, bt + bh + 6 * s);
        ctx.lineWidth = Math.max(1, 2.5 * s); ctx.strokeStyle = C.out; ctx.stroke();
        for (var f = 1; f < flagsN; f++) {
          var u = f / flagsN, fx = U.lerp(lx, rx, u), fy = bt + bh + 6 * s + sag * 4 * u * (1 - u);
          A.poly(ctx, [fx - 12 * s, fy, fx + 12 * s, fy, fx, fy + 26 * s + Math.sin(gameT * 5 + f) * 2 * s], cs[f % cs.length], Math.max(1, 2 * s));
        }
      }

      function drawPlayer(ctx) {
        var x = playerScreenX(), y = PY - hgt;
        var hs = Math.max(0.45, 1 - hgt / 420);
        A.shadow(ctx, x, PY + 4, 68 * hs, 18 * hs, 0.22 * hs + 0.06);
        var blinkOff = invuln > 0 && Math.floor(gameT * 10) % 2 === 0;
        if (blinkOff) ctx.globalAlpha = 0.4;
        ctx.save(); ctx.translate(x, y);
        if (state === 'tumble') {
          var tt = stateT;
          // sled flipped on its side
          ctx.save(); ctx.translate(78 + Math.min(1, tt / 0.3) * 10, 4);
          ctx.rotate(Math.min(1, tt / 0.3) * 1.35 + (tt < 0.3 ? tt * 8 : 0)); ctx.scale(0.85, 0.85); drawSled(ctx); ctx.restore();
          A.drift(ctx, 0, 6, 150, 44);
          var shake = tt > 0.4 && tt < 1.0 ? Math.sin(tt * 48) * 6 : 0;
          var pop = U.easeOutBack(U.clamp((tt - 0.12) / 0.3, 0, 1));
          ctx.save(); ctx.translate(shake, 0); ctx.scale(1, 0.4 + pop * 0.6);
          AB.chars.draw(ctx, 0, -8, look, { t: gameT, pose: 'sit', back: false, dir: Math.sin(tt * 48) > 0 ? 1 : -1, noShadow: true, scale: 1 });
          if (tt < 0.72) {
            var top = -8 + spDef.anchors.top * 0.92;
            A.ellipse(ctx, 4, top, 34, 18, C.snow, 2.5, C.snowDeep); A.circle(ctx, -12, top - 6, 12, C.snow, 2.5, C.snowDeep); A.circle(ctx, 14, top - 8, 10, C.snow, 2.5, C.snowDeep);
          }
          ctx.restore();
          A.drift(ctx, -30, 10, 80, 26); A.drift(ctx, 34, 12, 70, 22);
          if (tt > 0.4 && tt < 1.0) { A.line(ctx, [-58, -60, -70, -66], 3, C.snowDeep); A.line(ctx, [58, -64, 70, -70], 3, C.snowDeep); A.line(ctx, [-56, -40, -70, -40], 3, C.snowDeep); A.line(ctx, [56, -44, 70, -44], 3, C.snowDeep); }
        } else {
          var rot = lean * 0.1;
          if (state === 'spin') rot = spinAng;
          if (air) rot += Math.sin(Math.min(1, (JUMP_V - vh) / (2 * JUMP_V)) * Math.PI) * -0.08;
          ctx.rotate(rot);
          var sq = squash * 0.16;
          ctx.scale(1 + sq, 1 - sq);
          var fin = phase === 'finish';
          var dir = state === 'spin' ? (Math.cos(spinAng) > 0 ? 1 : -1) : lean < -0.15 ? -1 : 1;
          drawRider(ctx, look, pal, { t: gameT, lean: lean, pose: fin ? 'happy' : 'sit', back: !fin && !(state === 'spin' && Math.cos(spinAng) < 0), dir: dir });
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      function drawParts(ctx) {
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i], a = U.clamp(p.life / p.max, 0, 1);
          if (p.k === 'spray' || p.k === 'puff') {
            ctx.globalAlpha = a * (p.k === 'puff' ? 0.95 : 0.9);
            A.circle(ctx, p.x, p.y, p.r, '#ffffff', p.k === 'puff' ? 2 : 0, C.snowShade);
          } else if (p.k === 'chunk') {
            ctx.globalAlpha = a; A.circle(ctx, p.x, p.y, p.r, C.snow, 2, C.snowDeep);
          } else if (p.k === 'spark') {
            ctx.globalAlpha = 1; A.sparkle(ctx, p.x, p.y, p.r * (0.4 + a * 0.6), a);
            if (p.c && p.c !== '#ffffff') { ctx.globalAlpha = a * 0.6; A.circle(ctx, p.x, p.y, p.r * 0.35, p.c, 0); }
          } else if (p.k === 'conf') {
            ctx.globalAlpha = Math.min(1, a * 2);
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.rot * 1.3));
            ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 3, p.r, p.r * 0.66); ctx.restore();
          } else if (p.k === 'txt') {
            ctx.globalAlpha = Math.min(1, a * 1.6);
            ctx.font = '900 40px ' + AB.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.lineWidth = 7; ctx.strokeStyle = '#ffffff'; ctx.lineJoin = 'round'; ctx.strokeText(p.txt, p.x, p.y);
            ctx.fillStyle = p.c; ctx.fillText(p.txt, p.x, p.y);
          }
        }
        ctx.globalAlpha = 1;
      }

      function hillY(u) { return 44 + u * 34 + Math.sin(u * Math.PI * 3) * 6; }
      function drawHud(ctx) {
        // progress: a little hill path with the sled sliding down
        var x0 = 420, x1 = 860, py = 18;
        A.box(ctx, x0 - 34, py, x1 - x0 + 68, 92, 26, 'rgba(255,255,255,0.88)', 3);
        ctx.save(); ctx.beginPath(); A.rrect(ctx, x0 - 34, py, x1 - x0 + 68, 92, 26); ctx.clip();
        ctx.beginPath(); ctx.moveTo(x0 - 40, py + 100);
        for (var i = 0; i <= 30; i++) { var u = i / 30; ctx.lineTo(U.lerp(x0, x1, u), py + hillY(u) + 6); }
        ctx.lineTo(x1 + 40, py + 100); ctx.closePath(); ctx.fillStyle = '#dde7f8'; ctx.fill();
        ctx.restore();
        var prog = progress();
        ctx.beginPath(); for (var j = 0; j <= 30; j++) { var u2 = j / 30; var xx = U.lerp(x0, x1, u2), yy = py + hillY(u2); if (j) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = 12; ctx.strokeStyle = C.out; ctx.stroke(); ctx.lineWidth = 7; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        ctx.beginPath(); var nP = Math.max(1, Math.round(prog * 30));
        for (var k = 0; k <= nP; k++) { var u3 = Math.min(prog, k / 30); var x3 = U.lerp(x0, x1, u3), y3 = py + hillY(u3); if (k) ctx.lineTo(x3, y3); else ctx.moveTo(x3, y3); }
        ctx.lineWidth = 7; ctx.strokeStyle = C.teal; ctx.stroke();
        A.pine(ctx, x0 - 6, py + hillY(0) - 2, 34);
        // finish flag
        var fx = x1 + 4, fy = py + hillY(1);
        A.line(ctx, [fx, fy, fx, fy - 44], 3.5);
        ctx.save(); ctx.beginPath(); ctx.rect(fx, fy - 44, 30, 20); ctx.clip();
        for (var a = 0; a < 5; a++) for (var b = 0; b < 3; b++) { ctx.fillStyle = (a + b) % 2 ? C.out : '#fff'; ctx.fillRect(fx + a * 6, fy - 44 + b * 6.7, 6, 6.7); }
        ctx.restore(); ctx.strokeStyle = C.out; ctx.lineWidth = 2.5; ctx.strokeRect(fx, fy - 44, 30, 20);
        // mini sled
        var ux = U.lerp(x0, x1, prog), uy = py + hillY(prog), ang = Math.atan2(hillY(Math.min(1, prog + 0.01)) - hillY(Math.max(0, prog - 0.01)), (x1 - x0) * 0.02);
        ctx.save(); ctx.translate(ux, uy - 6); ctx.rotate(ang);
        A.circle(ctx, 0, -20, 11, pal.body, 2.5);
        A.circle(ctx, 4, -22, 2, C.out, 0);
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(16, 0); ctx.quadraticCurveTo(24, 0, 22, -8); ctx.lineWidth = 6; ctx.strokeStyle = C.out; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = C.woodDark; ctx.stroke();
        A.box(ctx, -18, -9, 32, 8, 3, C.red, 2.5);
        ctx.restore();

        // counters (top-right)
        var cx = 908, cy = 18;
        A.box(ctx, cx, cy, 350, 92, 26, 'rgba(255,255,255,0.88)', 3);
        ctx.font = '900 46px ' + AB.FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        var fp = 1 + hudFlakePop * 0.25;
        flakeIcon(ctx, cx + 48, cy + 46, 24 * fp, gameT, 0.5);
        ctx.fillStyle = C.out; ctx.fillText(String(flakes), cx + 84, cy + 49);
        var sp2 = 1 + hudStarPop * 0.3;
        starIcon(ctx, cx + 226, cy + 46, 28 * sp2, Math.sin(gameT * 2) * 0.15, 0.4);
        ctx.fillStyle = C.out; ctx.fillText(String(stars), cx + 262, cy + 49);
      }
      function drawButtons(ctx) {
        var hint = phase === 'count' ? 0.5 + 0.5 * Math.sin(gameT * 6) : 0;
        [[BTN_L, -1], [BTN_R, 1]].forEach(function (b) {
          var on = btn === b[1] || (b[1] < 0 ? keys.left : keys.right);
          var p = b[0], r = BTN_R_RAD * (on ? 0.94 : 1);
          ctx.save();
          A.circle(ctx, p.x, p.y, r, on ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,' + (0.3 + hint * 0.25) + ')', 4, 'rgba(38,50,77,0.45)');
          ctx.beginPath(); ctx.moveTo(p.x - b[1] * r * 0.16, p.y - r * 0.4); ctx.lineTo(p.x + b[1] * r * 0.26, p.y); ctx.lineTo(p.x - b[1] * r * 0.16, p.y + r * 0.4);
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.lineWidth = 26; ctx.strokeStyle = 'rgba(38,50,77,' + (on ? 0.8 : 0.5) + ')'; ctx.stroke();
          ctx.lineWidth = 15; ctx.strokeStyle = on ? C.teal : 'rgba(255,255,255,0.95)'; ctx.stroke();
          ctx.restore();
        });
      }
      function drawCountdown(ctx) {
        var txt = null, k = 0;
        if (phase === 'count') { var c = 3 - Math.floor(phaseT / 0.8); txt = String(Math.max(1, c)); k = (phaseT % 0.8) / 0.8; }
        else if (goT > 0) { txt = 'GO!'; k = 1 - goT / 0.8; }
        if (!txt) return;
        var sc = U.easeOutBack(Math.min(1, k * 3)), a = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(640, 430); ctx.scale(sc, sc);
        A.circle(ctx, 0, 0, txt === 'GO!' ? 120 : 96, txt === 'GO!' ? C.green : C.yellow, 5);
        A.highlight(ctx, -40, -46, 26, 12, 0.6);
        ctx.font = '900 ' + (txt === 'GO!' ? 84 : 110) + 'px ' + AB.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 10; ctx.strokeStyle = C.out; ctx.lineJoin = 'round'; ctx.strokeText(txt, 0, 6);
        ctx.fillStyle = '#ffffff'; ctx.fillText(txt, 0, 6);
        ctx.restore();
      }

      function draw(ctx, t) {
        ctx.save();
        if (shakeT > 0) ctx.translate(Math.sin(gameT * 70) * shakeT * 18, Math.cos(gameT * 55) * shakeT * 10);
        skyFrame = (skyFrame + 1) % 2;
        if (!skyCv) { skyCv = document.createElement('canvas'); skyCv.width = Math.round(W * SKY_S); skyCv.height = Math.round((HZ + 4) * SKY_S); skyFrame = 0; }
        if (skyFrame === 0) {
          var sc = skyCv.getContext('2d');
          sc.setTransform(SKY_S, 0, 0, SKY_S, 0, 0); sc.globalCompositeOperation = 'source-over';
          sc.drawImage(bg.sky, 0, 0, W, HZ + 4);
          A.aurora(sc, W, 24, 170, gameT + 3, 0.38);
        }
        ctx.drawImage(skyCv, 0, 0, W, HZ + 4);
        ctx.drawImage(bg.mtn, -120 - bend * 50 - camX * 0.05, 0, W + 240, HZ + 4);
        drawGround(ctx);

        // flat things first so upright things (and the rider) always sit on top of them
        var flat = [], up = [];
        for (var i = 0; i < objs.length; i++) {
          var o = objs[i], d = depth(o.z);
          if (d > DFAR || d < 380) continue;
          if (o.type === 'ice' || o.type === 'bump' || o.type === 'ramp' || o.type === 'glint') { if (d > DNEAR - 150) flat.push([d, o]); }
          else if (o.type === 'finish') { flat.push([d, o]); up.push([d, o]); }
          else up.push([d, o]);
        }
        flat.sort(function (a, b) { return b[0] - a[0]; });
        up.sort(function (a, b) { return b[0] - a[0]; });
        for (var f = 0; f < flat.length; f++) drawFlat(ctx, flat[f][1], flat[f][0]);
        drawTrail(ctx);
        var drawn = false;
        for (var u = 0; u < up.length; u++) {
          if (!drawn && up[u][0] < DP) { drawPlayer(ctx); drawn = true; }
          drawObj(ctx, up[u][1], up[u][0]);
        }
        if (!drawn) drawPlayer(ctx);
        snowfall.draw(ctx);
        drawParts(ctx);
        ctx.restore();

        drawHud(ctx);
        drawButtons(ctx);
        drawCountdown(ctx);
        void t;
      }

      // ---- input -----------------------------------------------------------------------
      function inBtn(x, y, b) { return U.dist(x, y, b.x, b.y) <= BTN_R_RAD + 22; }
      function pointer(type, x, y) {
        if (type === 'down') {
          if (inBtn(x, y, BTN_L)) { btn = -1; drag = false; }
          else if (inBtn(x, y, BTN_R)) { btn = 1; drag = false; }
          else if (y > host.safeTop || x > host.safeTop) { btn = 0; drag = true; dragX = x; }
        } else if (type === 'move') {
          if (drag) dragX = x;
        } else if (type === 'up') {
          btn = 0; drag = false;
        }
      }
      function key(type, k) {
        var down = type === 'down';
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = down;
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = down;
      }

      return {
        update: function (dt) { try { update(dt); } catch (e) { if (window.console) console.error('[sled]', e); } },
        draw: function (ctx, t) { try { draw(ctx, t); } catch (e) { if (window.console) console.error('[sled]', e); } },
        pointer: pointer,
        key: key,
        destroy: function () { objs = []; parts = []; trail = []; },
        // debug hooks for tests
        _debug: function () { return { phase: phase, elapsed: elapsed, pz: pz, px: px, flakes: flakes, stars: stars, jumps: jumps, crashes: crashes, state: state, objs: objs, speed: curSpeed, air: air }; },
        _steerTo: function (x) { if (x == null) { drag = false; return; } drag = true; dragX = x; },
        _steerWorld: function (wx) { drag = true; dragX = 640 + (wx - camX); }
      };
    }
  });
})();
