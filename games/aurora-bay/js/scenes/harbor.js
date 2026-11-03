/* Harbor — a snowy pebble beach, a wooden pier over the dark sea, boats, puffins and the lighthouse. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C, K = AB.kit;

  // ---- shared geometry ------------------------------------------------------
  var HORIZON = 226;
  var SHORE = [[0, 488], [120, 500], [260, 522], [400, 546], [500, 560], [620, 566], [760, 566], [880, 552], [935, 540]];
  var HEAD = [[935, 540], [962, 474], [1000, 424], [1050, 390], [1120, 376], [1200, 382], [1280, 396]];
  // pier: walkway (near/far edges) + end platform
  var WALK_NEAR_Y = 590, WALK_FAR_Y = 366;
  var WL = [500, 516], WR = [620, 604];          // walkway x at near / far
  var PLAT = [468, 302, 652, 366];               // x1, y1, x2, y2 of the end platform deck
  var LH = { x: 1120, base: 446 };               // lighthouse
  var LAMP = [LH.x, 150];

  function walkX(side, y) { var k = (y - WALK_FAR_Y) / (WALK_NEAR_Y - WALK_FAR_Y); return U.lerp(side[1], side[0], k); }
  function seaPath(ctx) {
    ctx.moveTo(0, HORIZON); ctx.lineTo(AB.W, HORIZON); ctx.lineTo(AB.W, HEAD[HEAD.length - 1][1]);
    for (var i = HEAD.length - 1; i >= 0; i--) ctx.lineTo(HEAD[i][0], HEAD[i][1]);
    for (var j = SHORE.length - 1; j >= 0; j--) ctx.lineTo(SHORE[j][0], SHORE[j][1]);
    ctx.closePath();
  }
  function dockPath(ctx) {
    ctx.moveTo(PLAT[0] - 4, PLAT[1] - 4); ctx.lineTo(PLAT[2] + 4, PLAT[1] - 4); ctx.lineTo(PLAT[2] + 4, PLAT[3] + 34);
    ctx.lineTo(WR[1] + 6, PLAT[3] + 34); ctx.lineTo(WR[0] + 8, WALK_NEAR_Y); ctx.lineTo(WL[0] - 8, WALK_NEAR_Y);
    ctx.lineTo(WL[1] - 6, PLAT[3] + 34); ctx.lineTo(PLAT[0] - 4, PLAT[3] + 34); ctx.closePath();
  }
  /** Clip to open water (not the pier, not the headland). */
  function clipSea(ctx) {
    ctx.beginPath(); seaPath(ctx); dockPath(ctx); ctx.clip('evenodd');
    // keep the net shed and the lighthouse tower in front of drifting ice
    ctx.beginPath(); ctx.rect(0, 0, AB.W, AB.H); ctx.rect(0, 250, 206, 250);
    ctx.moveTo(LH.x - 70, LH.base); ctx.lineTo(LH.x - 48, 60); ctx.lineTo(LH.x + 48, 60); ctx.lineTo(LH.x + 70, LH.base); ctx.closePath();
    ctx.clip('evenodd');
  }

  // ---- small drawing helpers -----------------------------------------------
  function waterline(ctx, x, y, w, t) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    var o = Math.sin(t * 2) * 4;
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 6 + o, y); ctx.quadraticCurveTo(x - w / 4, y + 5, x + o * 0.5, y); ctx.quadraticCurveTo(x + w / 4, y - 4, x + w / 2 + 6 - o, y); ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x - w / 2 + 14 - o, y + 8); ctx.lineTo(x - w / 2 + 40 - o, y + 8); ctx.moveTo(x + w / 2 - 50 + o, y + 9); ctx.lineTo(x + w / 2 - 18 + o, y + 9); ctx.stroke();
    ctx.restore();
  }
  function crate(ctx, x, y, s) {
    var w = 50 * s, h = 40 * s;
    A.box(ctx, x - w / 2, y - h, w, h, 3, C.woodLight, 3);
    ctx.save(); ctx.beginPath(); A.rrect(ctx, x - w / 2, y - h, w, h, 3); ctx.clip();
    ctx.fillStyle = 'rgba(29,43,82,0.16)'; ctx.fillRect(x + w * 0.18, y - h, w, h); ctx.restore();
    A.line(ctx, [x - w / 2 + 4, y - h + 4, x + w / 2 - 4, y - 4], 2.5, C.woodDark);
    A.line(ctx, [x - w / 2 + 3, y - h / 2, x + w / 2 - 3, y - h / 2], 2, 'rgba(90,50,25,0.5)');
    A.box(ctx, x - w / 2, y - h, w, h, 3, null, 3);
    A.ellipse(ctx, x - w * 0.1, y - h - 1, w * 0.4, 5 * s, C.snow, 2);
  }
  function barrel(ctx, x, y, s) {
    var w = 40 * s, h = 52 * s;
    A.shape(ctx, function (c) { c.moveTo(x - w / 2, y - h + 6); c.quadraticCurveTo(x - w / 2 - 6 * s, y - h / 2, x - w / 2, y - 4); c.quadraticCurveTo(x, y + 4, x + w / 2, y - 4); c.quadraticCurveTo(x + w / 2 + 6 * s, y - h / 2, x + w / 2, y - h + 6); c.closePath(); }, '#a8673d', 3);
    ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#1d2b52'; ctx.fillRect(x + w * 0.15, y - h, w * 0.5, h); ctx.restore();
    A.line(ctx, [x - w / 2 - 3, y - h * 0.72, x + w / 2 + 3, y - h * 0.72], 3.5, '#5a6582');
    A.line(ctx, [x - w / 2 - 3, y - h * 0.28, x + w / 2 + 3, y - h * 0.28], 3.5, '#5a6582');
    A.ellipse(ctx, x, y - h + 6, w / 2, 7 * s, '#c88b5c', 3);
    A.ellipse(ctx, x - 2, y - h + 4, w * 0.36, 5 * s, C.snow, 1.5);
    A.highlight(ctx, x - w * 0.25, y - h * 0.5, 2.5, 9, 0.45);
  }
  function lobsterPot(ctx, x, y, s) {
    var w = 58 * s, h = 34 * s;
    A.shape(ctx, function (c) { c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h * 0.55); c.quadraticCurveTo(x - w / 2, y - h, x, y - h); c.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h * 0.55); c.lineTo(x + w / 2, y); c.closePath(); }, 'rgba(225,200,150,0.35)', 3);
    ctx.strokeStyle = '#8a5a34'; ctx.lineWidth = 2;
    for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * w / 5, y); ctx.lineTo(x + i * w / 5, y - h * (0.95 - Math.abs(i) * 0.12)); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(38,50,77,0.45)'; ctx.lineWidth = 1.2;
    for (var k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - w / 2, y - h * k / 4.4); ctx.lineTo(x + w / 2, y - h * k / 4.4); ctx.stroke(); }
    A.box(ctx, x - w / 2 - 2, y - 5, w + 4, 6, 2, '#8a5a34', 2.5);
    A.ellipse(ctx, x - 4, y - h - 1, w * 0.3, 4 * s, C.snow, 1.5);
  }
  function ropeCoil(ctx, x, y, s) {
    A.ellipse(ctx, x, y - 6 * s, 24 * s, 10 * s, '#d9b77e', 3);
    A.ellipse(ctx, x, y - 8 * s, 16 * s, 6 * s, null, 2, '#9c7a45');
    A.ellipse(ctx, x, y - 9 * s, 8 * s, 3 * s, '#7d5a30', 2);
    A.line(ctx, [x + 20 * s, y - 4 * s, x + 34 * s, y - 2 * s], 3.5, '#9c7a45');
  }
  function puffin(ctx, x, y, s, dir, flap, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    var wing = flap > 0 ? Math.sin(t * 30) * 0.9 : 0;
    // wings (behind when flapping)
    if (flap > 0) {
      ctx.save(); ctx.translate(-6, -26); ctx.rotate(-1.2 - wing); A.ellipse(ctx, 0, -12, 6, 15, '#2b3247', 2.5); ctx.restore();
      ctx.save(); ctx.translate(6, -26); ctx.rotate(1.2 + wing); A.ellipse(ctx, 0, -12, 6, 15, '#2b3247', 2.5); ctx.restore();
    }
    A.ellipse(ctx, -5, 0, 6, 3, C.orange, 2); A.ellipse(ctx, 6, 0, 6, 3, C.orange, 2);
    A.ellipse(ctx, 0, -18, 14, 19, '#2b3247', 3);
    A.ellipse(ctx, 3, -14, 9, 13, '#ffffff', 0);
    A.circle(ctx, 2, -38, 11, '#2b3247', 3);
    A.ellipse(ctx, 4, -37, 7, 6, '#f2f2f6', 0);
    A.circle(ctx, 4, -38, 2, C.out, 0);
    A.shape(ctx, function (c) { c.moveTo(10, -42); c.quadraticCurveTo(22, -39, 18, -32); c.lineTo(10, -33); c.closePath(); }, '#ff7d2a', 2);
    A.line(ctx, [12, -38, 17, -36], 1.5, '#ffd34a');
    if (flap <= 0) { ctx.save(); ctx.translate(-6, -18); ctx.rotate(0.15); A.ellipse(ctx, 0, 0, 5, 13, '#1f2536', 2); ctx.restore(); }
    ctx.restore();
  }

  // ---- props -----------------------------------------------------------------
  var bellSwing = 0, puffFlap = 0, potPeek = 0, barrelPeek = 0, boatRock = 0, boatPuff = 0, rowRock = 0, rackSwing = 0, splashT = -9, anchorWob = 0;

  var fireBoost = 0, gemDue = 0;
  function logSeat(ctx, x, y) {
    A.shadow(ctx, x, y + 2, 40, 7);
    A.box(ctx, x - 36, y - 24, 72, 24, 11, '#9a5a32', 3);
    ctx.save(); ctx.beginPath(); A.rrect(ctx, x - 36, y - 24, 72, 24, 11); ctx.clip(); ctx.fillStyle = 'rgba(29,43,82,0.2)'; ctx.fillRect(x - 40, y - 10, 80, 12); ctx.restore();
    A.box(ctx, x - 36, y - 24, 72, 24, 11, null, 3);
    A.ellipse(ctx, x + 30, y - 12, 7, 11, '#e0b07c', 2.5); A.ellipse(ctx, x + 30, y - 12, 3, 5, null, 1.5, '#9a5a32');
    A.ellipse(ctx, x - 8, y - 24, 22, 4, C.snow, 1.5);
  }
  function tree(x, y, h) {
    var shake = { until: 0 };
    return { x: x, y: y, hit: [x - h * 0.3, y - h, h * 0.6, h], at: [x + (x < 640 ? 70 : -70), y + (y > 860 ? -20 : 30)],
      draw: function (ctx, t) {
        ctx.save();
        if (t < shake.until) { ctx.translate(x, y); ctx.rotate(Math.sin(t * 40) * 0.03); ctx.translate(-x, -y); }
        A.pine(ctx, x, y, h); ctx.restore();
      },
      tap: function () {
        shake.until = AB.world.t + 0.5; AB.audio.sfx('snow');
        for (var i = 0; i < 18; i++) AB.world.particles.push({ k: 'snow', x: x + U.rand(-h * 0.3, h * 0.3), y: y - h * U.rand(0.3, 0.9), vx: U.rand(-30, 30), vy: U.rand(-40, 40), t: 0, life: U.rand(0.8, 1.4), r: U.rand(3, 7) });
      } };
  }
  function sitOn(x, y, dir) { var p = AB.world.player; p.x = x; p.y = y; p.dir = dir || 1; p.pose = 'sit'; p.poseUntil = AB.world.t + 6; AB.audio.sfx('soft'); }

  function dockLantern(x, y) {
    return { x: x, y: y, draw: function (ctx, t) {
      A.shadow(ctx, x, y + 2, 12, 4);
      A.box(ctx, x - 5, y - 74, 10, 76, 3, C.woodDark, 2.5);
      A.ellipse(ctx, x, y - 75, 7, 3, C.snow, 1.5);
      A.line(ctx, [x, y - 70, x + 14, y - 70], 3);
      A.glow(ctx, x + 14, y - 52, 44 + Math.sin(t * 2.3 + x) * 3, C.lampGlow, 0.5);
      A.line(ctx, [x + 14, y - 70, x + 14, y - 64], 2);
      A.box(ctx, x + 6, y - 64, 16, 20, 4, '#ffe7a3', 2.5);
      A.line(ctx, [x + 14, y - 64, x + 14, y - 44], 1.5, 'rgba(38,50,77,0.5)');
      A.poly(ctx, [x + 4, y - 64, x + 24, y - 64, x + 14, y - 72], '#3c4a6b', 2);
    } };
  }

  var PROPS = [
    // red fishing boat, moored to the left of the pier
    { x: 350, y: 452, hit: [250, 300, 210, 160], at: [526, 450],
      draw: function (ctx, t) {
        var r = Math.max(0, boatRock - t), bob = Math.sin(t * 1.4) * 3 + Math.sin(t * 14) * r * 4, rot = Math.sin(t * 1.1) * 0.015 + Math.sin(t * 12) * r * 0.03;
        A.shadow(ctx, 350, 456, 110, 10, 0.3);
        // mooring rope to the pier
        A.line(ctx, [440, 420 + bob, 470, 432, 508, 440], 2.5, '#9c7a45');
        ctx.save(); ctx.translate(350, 448 + bob); ctx.rotate(rot);
        // mast + light + flag line
        A.box(ctx, -42, -150, 7, 112, 2, C.woodDark, 2.5);
        A.line(ctx, [-38, -146, 60, -78], 1.6, 'rgba(38,50,77,0.8)');
        A.line(ctx, [-38, -146, -104, -24], 1.6, 'rgba(38,50,77,0.8)');
        [[-2, -124, C.yellow], [24, -110, C.red], [46, -96, '#7fe3ff'], [-62, -106, C.green], [-82, -68, C.pink]].forEach(function (f) { A.poly(ctx, [f[0] - 5, f[1], f[0] + 5, f[1] + 3, f[0] - 1, f[1] + 10], f[2], 1.5); });
        A.glow(ctx, -38, -154, 22, 'rgba(255,240,180,', 0.5 + 0.3 * Math.sin(t * 3));
        A.circle(ctx, -38, -154, 4.5, '#fff6c8', 2);
        // wheelhouse
        A.box(ctx, 4, -96, 70, 64, 5, '#f4f7ff', 3);
        ctx.save(); ctx.beginPath(); A.rrect(ctx, 4, -96, 70, 64, 5); ctx.clip(); ctx.fillStyle = 'rgba(29,43,82,0.14)'; ctx.fillRect(50, -96, 30, 70); ctx.restore();
        A.window(ctx, 14, -84, 22, 20, { snow: false, lw: 2.5 }); A.window(ctx, 44, -84, 22, 20, { snow: false, lw: 2.5 });
        A.box(ctx, -2, -108, 82, 14, 4, '#3b6fd1', 3);
        A.ellipse(ctx, 38, -110, 40, 7, C.snow, 2.5);
        // stove pipe
        A.box(ctx, 58, -128, 10, 22, 2, '#3c4a6b', 2.5);
        var puff = U.clamp(boatPuff - t, 0, 1.2);
        for (var i = 0; i < 3; i++) { var p = ((t * 0.4 + i / 3) % 1); ctx.fillStyle = 'rgba(235,240,255,' + (0.4 * (1 - p)) + ')'; ctx.beginPath(); ctx.arc(63 + p * 26, -132 - p * 50, 5 + p * 10, 0, 7); ctx.fill(); }
        if (puff > 0) { for (var j = 0; j < 4; j++) { var q = 1 - puff / 1.2; ctx.fillStyle = 'rgba(245,248,255,' + (0.8 * (1 - q)) + ')'; ctx.beginPath(); ctx.arc(63 + j * 8 * q, -140 - q * 70 - j * 10, 10 + q * 18, 0, 7); ctx.fill(); } }
        // hull
        A.shape(ctx, function (c) { c.moveTo(-108, -42); c.lineTo(104, -42); c.quadraticCurveTo(102, -10, 84, 4); c.lineTo(-88, 4); c.quadraticCurveTo(-104, -14, -108, -42); c.closePath(); }, '#d8483f', 3.5);
        ctx.save(); ctx.beginPath(); ctx.moveTo(-108, -42); ctx.lineTo(104, -42); ctx.quadraticCurveTo(102, -10, 84, 4); ctx.lineTo(-88, 4); ctx.closePath(); ctx.clip();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-120, -30, 240, 8);
        ctx.fillStyle = '#2b3a66'; ctx.fillRect(-120, -6, 240, 14);
        ctx.fillStyle = 'rgba(29,43,82,0.2)'; ctx.fillRect(40, -45, 80, 60);
        ctx.restore();
        A.box(ctx, -112, -48, 220, 9, 4, '#f4f7ff', 3);
        A.ellipse(ctx, -60, -50, 40, 5, C.snow, 2);
        // fenders + life ring
        A.ellipse(ctx, -70, -22, 6, 10, '#ffffff', 2.5); A.ellipse(ctx, -10, -22, 6, 10, C.yellow, 2.5);
        A.circle(ctx, 40, -24, 10, '#ff7d2a', 2.5); A.circle(ctx, 40, -24, 4.5, '#d8483f', 2);
        A.highlight(ctx, -80, -36, 18, 2, 0.6);
        ctx.restore();
        waterline(ctx, 350, 452 + bob * 0.5, 210, t);
      },
      tap: function () { boatRock = AB.world.t + 1; boatPuff = AB.world.t + 1.2; AB.audio.sfx('whoosh'); AB.world.burst(410, 300, 'note', 3); } },

    // little rowboat tied to the pier
    { x: 720, y: 520, hit: [655, 470, 140, 70], at: [660, 604],
      draw: function (ctx, t) {
        var r = Math.max(0, rowRock - t), bob = Math.sin(t * 1.9 + 1) * 2.5 + Math.sin(t * 16) * r * 5, rot = Math.sin(t * 1.6) * 0.04 + Math.sin(t * 13) * r * 0.08;
        A.line(ctx, [624, 540, 650, 520, 668, 512 + bob], 2.5, '#9c7a45');
        ctx.save(); ctx.translate(720, 512 + bob); ctx.rotate(rot);
        A.shape(ctx, function (c) { c.moveTo(-62, -18); c.quadraticCurveTo(0, -12, 64, -22); c.quadraticCurveTo(56, 6, 34, 8); c.lineTo(-40, 8); c.quadraticCurveTo(-58, 2, -62, -18); c.closePath(); }, '#4aa3c8', 3);
        ctx.save(); ctx.beginPath(); ctx.moveTo(-62, -18); ctx.quadraticCurveTo(0, -12, 64, -22); ctx.quadraticCurveTo(56, 6, 34, 8); ctx.lineTo(-40, 8); ctx.closePath(); ctx.clip();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-70, -12, 140, 5); ctx.fillStyle = 'rgba(29,43,82,0.2)'; ctx.fillRect(10, -30, 70, 45); ctx.restore();
        A.shape(ctx, function (c) { c.moveTo(-56, -18); c.quadraticCurveTo(0, -24, 58, -22); c.quadraticCurveTo(0, -14, -56, -18); c.closePath(); }, '#8a5a34', 2.5);
        A.box(ctx, -10, -24, 24, 6, 2, C.woodLight, 2);
        // oars
        A.line(ctx, [-30, -22, 34, -40], 5, C.out); A.line(ctx, [-30, -22, 34, -40], 2.5, C.woodLight);
        A.ellipse(ctx, 40, -42, 10, 4, C.woodLight, 2, null, -0.3);
        A.ellipse(ctx, -24, -20, 18, 4, C.snow, 1.5);
        ctx.restore();
        waterline(ctx, 720, 520 + bob * 0.4, 130, t + 1);
      },
      tap: function () { rowRock = AB.world.t + 1; AB.audio.sfx('splash'); AB.world.burst(720, 520, 'snow', 8); } },

    // puffins on a snowy rock in the water
    { x: 875, y: 488, hit: [800, 380, 150, 115], at: [860, 604],
      draw: function (ctx, t) {
        var f = Math.max(0, puffFlap - t);
        A.shadow(ctx, 875, 490, 80, 9, 0.3);
        A.shape(ctx, function (c) { c.moveTo(800, 488); c.quadraticCurveTo(796, 450, 830, 436); c.quadraticCurveTo(860, 418, 900, 428); c.quadraticCurveTo(944, 440, 950, 488); c.closePath(); }, '#7f8db0', 3);
        ctx.save(); ctx.globalAlpha = 0.35; A.shape(ctx, function (c) { c.moveTo(890, 488); c.quadraticCurveTo(930, 470, 920, 438); c.quadraticCurveTo(944, 450, 950, 488); c.closePath(); }, '#4c5878', 0); ctx.restore();
        A.shape(ctx, function (c) { c.moveTo(810, 452); c.quadraticCurveTo(840, 424, 880, 424); c.quadraticCurveTo(920, 424, 940, 450); c.quadraticCurveTo(900, 440, 870, 446); c.quadraticCurveTo(840, 440, 810, 452); c.closePath(); }, C.snow, 2);
        waterline(ctx, 875, 490, 160, t + 2);
        var hop = function (k) { return f > 0 ? -Math.abs(Math.sin((t + k) * 10)) * 10 * Math.min(1, f) : 0; };
        puffin(ctx, 838, 446 + hop(0), 0.9, 1, f, t);
        puffin(ctx, 878, 432 + hop(0.3), 1, -1, f, t + 0.2);
        puffin(ctx, 916, 444 + hop(0.6), 0.85, -1, f, t + 0.4);
      },
      tap: function () { puffFlap = AB.world.t + 1.4; AB.audio.sfx('chirp'); AB.world.burst(878, 400, 'heart', 3); } },

    // ship's bell on the end of the pier
    { x: 486, y: 316, hit: [450, 210, 75, 115], at: [516, 330],
      draw: function (ctx, t) {
        A.shadow(ctx, 486, 318, 18, 5);
        A.box(ctx, 481, 236, 10, 82, 2, C.woodDark, 2.5);
        A.box(ctx, 468, 232, 50, 10, 3, C.wood, 2.5);
        A.ellipse(ctx, 490, 230, 20, 4, C.snow, 1.5);
        var sw = Math.sin(t * 14) * Math.max(0, bellSwing - t) * 0.5;
        ctx.save(); ctx.translate(508, 244); ctx.rotate(sw);
        A.line(ctx, [0, -2, 0, 4], 2);
        A.shape(ctx, function (c) { c.moveTo(-10, 24); c.quadraticCurveTo(-11, 4, 0, 3); c.quadraticCurveTo(11, 4, 10, 24); c.lineTo(14, 28); c.lineTo(-14, 28); c.closePath(); }, '#ffc93c', 2.5);
        A.circle(ctx, 0, 31, 3.5, '#c58a12', 1.5); A.highlight(ctx, -4, 12, 2, 6, 0.6);
        A.line(ctx, [0, 32, 2, 50], 2, '#9c7a45');
        ctx.restore();
      },
      tap: function () { bellSwing = AB.world.t + 1.6; AB.audio.sfx('bell'); AB.world.burst(508, 250, 'note', 4); } },

    // bollard + rope coil on the pier end
    { x: 632, y: 352, draw: function (ctx) {
        A.shadow(ctx, 632, 354, 14, 4);
        A.box(ctx, 624, 330, 16, 24, 5, '#3c4a6b', 2.5); A.ellipse(ctx, 632, 330, 11, 4, '#56668c', 2.5); A.ellipse(ctx, 632, 328, 7, 2.5, C.snow, 1.5);
        ropeCoil(ctx, 600, 356, 0.6);
      } },

    // splash spot in the water beside the pier end
    { x: 710, y: 360, hit: [656, 296, 110, 90], at: [636, 336],
      draw: function (ctx, t) {
        var ph = (t * 0.6) % 1;
        ctx.save(); ctx.strokeStyle = 'rgba(200,235,255,' + (0.45 * (1 - ph)) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(712, 344, 8 + ph * 26, 3 + ph * 9, 0, 0, 7); ctx.stroke(); ctx.restore();
        var s = t - splashT;
        if (s >= 0 && s < 1.1) {
          var k = s / 1.1, fx = 712 - k * 110, fy = 344 - Math.sin(k * Math.PI) * 90;
          ctx.save(); ctx.translate(fx, fy); ctx.rotate(-Math.cos(k * Math.PI) * 0.9);
          ctx.scale(-1, 1); A.fish(ctx, 0, 0, 0.7, 'mint', t); ctx.restore();
          ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k) + ')'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(712, 344, 14 + k * 50, 4 + k * 14, 0, 0, 7); ctx.stroke(); ctx.restore();
        }
      },
      tap: function () {
        var W = AB.world; splashT = W.t; AB.audio.sfx('splash');
        for (var i = 0; i < 14; i++) W.particles.push({ k: 'snow', x: 690 + U.rand(-14, 14), y: 340, vx: U.rand(-80, 60), vy: U.rand(-260, -120), t: 0, life: U.rand(0.6, 1), r: U.rand(2.5, 5) });
        W.player.pose = 'happy'; W.player.poseUntil = W.t + 1.2;
        gemDue = W.t + 0.9;   // the leaping fish flips a glimmer stone onto the pier
      } },

    // lobster pots stacked by the pier
    { x: 420, y: 630, hit: [365, 545, 115, 95], at: [420, 670],
      draw: function (ctx, t) {
        A.shadow(ctx, 420, 632, 60, 9);
        lobsterPot(ctx, 392, 630, 0.95); lobsterPot(ctx, 448, 632, 0.95);
        var pk = U.clamp(potPeek - t, 0, 1.6), up = pk > 0 ? Math.sin(Math.min(1, (1.6 - pk) * 3) * Math.PI / 2) * (pk < 0.4 ? pk / 0.4 : 1) : 0;
        lobsterPot(ctx, 420, 600, 0.9);
        if (up > 0) {
          ctx.save(); ctx.translate(420, 572 - up * 16);
          A.ellipse(ctx, 0, 6, 16, 10, '#e2574c', 2.5);
          A.ellipse(ctx, -18, 0, 7, 5, '#e2574c', 2, null, -0.5); A.ellipse(ctx, 18, 0, 7, 5, '#e2574c', 2, null, 0.5);
          A.line(ctx, [-5, -2, -6, -10], 2); A.line(ctx, [5, -2, 6, -10], 2);
          A.circle(ctx, -6, -11, 3.5, '#fff', 1.5); A.circle(ctx, 6, -11, 3.5, '#fff', 1.5);
          A.circle(ctx, -6, -11, 1.6, C.out, 0); A.circle(ctx, 6, -11, 1.6, C.out, 0);
          A.line(ctx, [-4, 8, 0, 10, 4, 8], 1.6);
          ctx.restore();
        }
        // red-white buoy
        A.ellipse(ctx, 476, 618, 9, 14, '#ffffff', 2.5); ctx.save(); ctx.beginPath(); ctx.ellipse(476, 618, 9, 14, 0, 0, 7); ctx.clip(); ctx.fillStyle = C.red; ctx.fillRect(466, 604, 20, 9); ctx.fillRect(466, 620, 20, 6); ctx.restore(); A.ellipse(ctx, 476, 618, 9, 14, null, 2.5);
      },
      tap: function () { potPeek = AB.world.t + 1.6; AB.audio.sfx('pop'); AB.world.burst(420, 560, 'star', 3); AB.quests.revealGem('gem_harbor_1', 470, 670); } },

    // crates — sit on the low one
    { x: 690, y: 640, hit: [640, 570, 120, 80], at: [700, 664],
      draw: function (ctx) {
        A.shadow(ctx, 700, 642, 64, 9);
        crate(ctx, 738, 628, 1); crate(ctx, 740, 590, 0.85);
        crate(ctx, 680, 642, 0.8);
      },
      tap: function () { sitOn(680, 646, -1); } },

    // barrels — a lemming peeks out
    { x: 250, y: 610, hit: [205, 540, 88, 80], at: [250, 650],
      draw: function (ctx, t) {
        A.shadow(ctx, 252, 612, 50, 8);
        barrel(ctx, 232, 606, 1);
        var pk = U.clamp(barrelPeek - t, 0, 1.6), up = pk > 0 ? Math.min(1, (1.6 - pk) * 4, pk * 3) : 0;
        if (up > 0) {
          ctx.save(); ctx.beginPath(); ctx.rect(250, 520, 60, 52); ctx.clip();
          ctx.translate(272, 570 - up * 22);
          A.ellipse(ctx, 0, 0, 13, 12, '#c98d5a', 2.5); A.ellipse(ctx, 0, 4, 8, 6, '#f4dcc0', 0);
          A.circle(ctx, -9, -10, 4, '#c98d5a', 2); A.circle(ctx, 9, -10, 4, '#c98d5a', 2);
          A.circle(ctx, -4, -2, 2, C.out, 0); A.circle(ctx, 4, -2, 2, C.out, 0); A.circle(ctx, 0, 2, 1.8, '#ff8fb1', 0);
          ctx.restore();
        }
        barrel(ctx, 272, 618, 0.9);
        ctx.save(); ctx.translate(222, 612); A.ellipse(ctx, 0, 0, 0.1, 0.1, null, 0); ctx.restore();
      },
      tap: function () { barrelPeek = AB.world.t + 1.6; AB.audio.sfx('chirp'); AB.world.burst(272, 540, 'heart', 2); } },

    // fish-drying rack
    { x: 150, y: 700, hit: [70, 570, 160, 140], at: [150, 740],
      draw: function (ctx, t) {
        A.shadow(ctx, 150, 702, 82, 10);
        A.line(ctx, [86, 702, 100, 600, 114, 702], 7, C.out); A.line(ctx, [86, 702, 100, 600, 114, 702], 4, C.wood);
        A.line(ctx, [186, 702, 200, 600, 214, 702], 7, C.out); A.line(ctx, [186, 702, 200, 600, 214, 702], 4, C.wood);
        A.line(ctx, [92, 606, 208, 606], 8, C.out); A.line(ctx, [92, 606, 208, 606], 5, C.woodLight);
        A.ellipse(ctx, 150, 602, 52, 4, C.snow, 1.5);
        var sw = Math.max(0, rackSwing - t), kinds = ['sunny', 'bluegill', 'rosy', 'sunny', 'mint'];
        for (var i = 0; i < 5; i++) {
          var fx = 112 + i * 19, a = Math.sin(t * 1.5 + i) * 0.06 + Math.sin(t * 12 + i) * sw * 0.35;
          ctx.save(); ctx.translate(fx, 608); ctx.rotate(a);
          A.line(ctx, [0, 0, 0, 10], 1.5);
          ctx.save(); ctx.translate(0, 34); ctx.rotate(Math.PI / 2); A.fish(ctx, 0, 0, 0.5, kinds[i], 0); ctx.restore();
          ctx.restore();
        }
        A.line(ctx, [92, 650, 208, 650], 6, C.out); A.line(ctx, [92, 650, 208, 650], 3, C.woodLight);
      },
      tap: function () { rackSwing = AB.world.t + 1.2; AB.audio.sfx('whoosh'); AB.world.burst(150, 620, 'snow', 8); } },

    // old anchor half-buried in snow
    { x: 1150, y: 830, hit: [1090, 720, 120, 120], at: [1070, 850],
      draw: function (ctx, t) {
        var w = Math.max(0, anchorWob - t), a = Math.sin(t * 25) * w * 0.08;
        A.shadow(ctx, 1150, 832, 60, 9);
        ctx.save(); ctx.translate(1150, 826); ctx.rotate(-0.2 + a);
        A.line(ctx, [0, 0, 0, -96], 12, C.out); A.line(ctx, [0, 0, 0, -96], 7, '#5a6a8f');
        A.line(ctx, [-26, -74, 26, -74], 11, C.out); A.line(ctx, [-26, -74, 26, -74], 6, '#5a6a8f');
        A.circle(ctx, 0, -106, 11, null, 9, C.out); A.circle(ctx, 0, -106, 11, null, 5, '#5a6a8f');
        ctx.beginPath(); ctx.arc(0, -18, 40, 0.2, Math.PI - 0.2); ctx.lineWidth = 12; ctx.strokeStyle = C.out; ctx.stroke(); ctx.lineWidth = 7; ctx.strokeStyle = '#5a6a8f'; ctx.stroke();
        A.highlight(ctx, -3, -60, 1.5, 14, 0.5);
        A.line(ctx, [11, -106, 40, -90, 52, -60, 64, -40], 3.5, '#9c7a45');
        ctx.restore();
        A.drift(ctx, 1150, 836, 130, 26);
      },
      tap: function () { anchorWob = AB.world.t + 0.8; AB.audio.sfx('ding'); AB.world.burst(1150, 780, 'snow', 10); } },

    // beach campfire — tap for sparks
    { x: 820, y: 792, hit: [770, 720, 100, 90], at: [820, 840],
      draw: function (ctx, t) {
        var b = Math.max(0, fireBoost - t);
        A.glow(ctx, 820, 770, 120 + Math.sin(t * 5) * 6 + b * 40, 'rgba(255,170,80,', 0.35 + b * 0.2);
        A.shadow(ctx, 820, 796, 50, 10);
        for (var i = 0; i < 9; i++) { var a = i / 9 * Math.PI * 2; A.ellipse(ctx, 820 + Math.cos(a) * 40, 790 + Math.sin(a) * 12, 11, 7, i % 2 ? '#9aa6bd' : '#b3bdd3', 2.5); }
        A.line(ctx, [796, 792, 842, 778], 9, C.out); A.line(ctx, [796, 792, 842, 778], 5, C.woodDark);
        A.line(ctx, [798, 778, 846, 792], 9, C.out); A.line(ctx, [798, 778, 846, 792], 5, C.wood);
        var fl = 1 + b * 0.6;
        [[0, 56, '#ff7d2a'], [0, 40, C.yellow], [0, 22, '#fff3c0']].forEach(function (f, k) {
          var h = f[1] * fl * (0.9 + 0.1 * Math.sin(t * 9 + k)), w = h * 0.42, sw = Math.sin(t * 6 + k) * 4;
          A.shape(ctx, function (c) { c.moveTo(820 - w, 786); c.quadraticCurveTo(820 - w, 786 - h * 0.5, 820 + sw, 786 - h); c.quadraticCurveTo(820 + w, 786 - h * 0.5, 820 + w, 786); c.closePath(); }, f[2], k ? 0 : 2.5);
        });
        for (var e = 0; e < 4; e++) { var p = ((t * 0.7 + e / 4) % 1); A.circle(ctx, 820 + Math.sin(p * 8 + e) * 14, 760 - p * 80, 2.4 * (1 - p), '#ffcf4a', 0); }
      },
      tap: function () { fireBoost = AB.world.t + 1; AB.audio.sfx('whoosh'); AB.world.burst(820, 740, 'star', 5); } },
    // log seats by the fire
    { x: 735, y: 808, hit: [692, 770, 86, 50], at: [735, 830],
      draw: function (ctx) { logSeat(ctx, 735, 808); },
      tap: function () { sitOn(735, 812, 1); } },
    { x: 905, y: 808, hit: [862, 770, 86, 50], at: [905, 830],
      draw: function (ctx) { logSeat(ctx, 905, 808); },
      tap: function () { sitOn(905, 812, -1); } },
    tree(1236, 704, 190), tree(40, 896, 160),
    dockLantern(486, 598), dockLantern(634, 600)
  ];

  // ---- the scene -------------------------------------------------------------
  AB.registerScene({
    id: 'harbor', name: 'Harbor', music: 'harbor', ambient: 'waves', outdoor: true, snow: true, footprints: true, aurora: true,
    map: { x: 800, y: 380, icon: 'map' },
    depth: [300, 0.64, 880, 1.04],
    paint: function (ctx) {
      K.skyAndMountains(ctx, 188, 21);
      // ---- sea
      ctx.save(); ctx.beginPath(); seaPath(ctx);
      var g = ctx.createLinearGradient(0, HORIZON, 0, 560);
      g.addColorStop(0, '#6f8fd0'); g.addColorStop(0.08, '#3b63a6'); g.addColorStop(0.45, '#1f4a86'); g.addColorStop(1, '#173d70');
      ctx.fillStyle = g; ctx.fill(); ctx.clip();
      // horizon glow + pink reflection band
      ctx.fillStyle = 'rgba(243,201,216,0.35)'; ctx.fillRect(0, HORIZON, AB.W, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, HORIZON + 6, AB.W, 2);
      // aurora reflection smudges
      var ar = U.seeded(5);
      for (var a = 0; a < 7; a++) { var ax = ar() * AB.W; A.ellipse(ctx, ax, HORIZON + 30 + ar() * 70, 90 + ar() * 80, 6, 'rgba(110,255,200,0.10)', 0); }
      // lighthouse light reflection on the water
      for (var rl = 0; rl < 9; rl++) { A.ellipse(ctx, LH.x - 40 + Math.sin(rl * 1.7) * 18, 300 + rl * 9, 30 - rl * 2, 2.2, 'rgba(255,220,140,' + (0.35 - rl * 0.03) + ')', 0); }
      // static ripple dashes, smaller toward the horizon
      var r = U.seeded(17);
      for (var i = 0; i < 140; i++) {
        var y = HORIZON + 10 + Math.pow(r(), 1.3) * 330, k = (y - HORIZON) / 330, x = r() * AB.W, w = 8 + k * 30;
        ctx.strokeStyle = r() < 0.5 ? 'rgba(140,190,240,0.35)' : 'rgba(10,30,70,0.35)'; ctx.lineWidth = 1 + k * 1.5;
        ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x, y - 2 - k * 3, x + w, y); ctx.stroke();
      }
      // shallows near the beach
      ctx.beginPath(); ctx.moveTo(SHORE[0][0], SHORE[0][1] - 30);
      SHORE.forEach(function (p) { ctx.lineTo(p[0], p[1] - 30); }); ctx.lineTo(980, 520);
      for (var s = SHORE.length - 1; s >= 0; s--) ctx.lineTo(SHORE[s][0], SHORE[s][1] + 4);
      ctx.closePath(); ctx.fillStyle = 'rgba(80,170,210,0.35)'; ctx.fill();
      ctx.restore();
      // distant island with a tiny cabin light
      A.shape(ctx, function (c) { c.moveTo(560, HORIZON + 4); c.quadraticCurveTo(600, HORIZON - 16, 650, HORIZON - 12); c.quadraticCurveTo(700, HORIZON - 18, 740, HORIZON + 4); c.closePath(); }, '#7d90c4', 2, '#6d80b6');
      A.poly(ctx, [620, HORIZON - 12, 626, HORIZON - 28, 632, HORIZON - 12], '#4d6aa0', 0); A.poly(ctx, [700, HORIZON - 10, 705, HORIZON - 22, 710, HORIZON - 10], '#4d6aa0', 0);
      A.glow(ctx, 662, HORIZON - 14, 10, C.lampGlow, 0.7); ctx.fillStyle = '#ffe7a3'; ctx.fillRect(660, HORIZON - 16, 4, 4);

      // ---- beach
      ctx.beginPath(); ctx.moveTo(0, AB.H); ctx.lineTo(0, SHORE[0][1]); SHORE.forEach(function (p) { ctx.lineTo(p[0], p[1]); });
      ctx.lineTo(1000, 620); ctx.lineTo(AB.W, 640); ctx.lineTo(AB.W, AB.H); ctx.closePath();
      var bg = ctx.createLinearGradient(0, 480, 0, AB.H); bg.addColorStop(0, '#dfe8f8'); bg.addColorStop(0.4, '#eef3fd'); bg.addColorStop(1, '#f8fbff');
      ctx.fillStyle = bg; ctx.fill();
      // pebble band along the waterline
      ctx.save(); ctx.beginPath();
      ctx.moveTo(SHORE[0][0], SHORE[0][1]); SHORE.forEach(function (p) { ctx.lineTo(p[0], p[1]); });
      ctx.lineTo(1000, 610);
      for (var b = SHORE.length - 1; b >= 0; b--) { var bp = SHORE[b]; ctx.lineTo(bp[0], bp[1] + 46 + Math.sin(b * 2.1) * 12); }
      ctx.closePath(); ctx.fillStyle = '#b8c4d9'; ctx.fill(); ctx.clip();
      var pr = U.seeded(29), pcols = ['#9aa6bd', '#c9d1e2', '#8590ab', '#d8c9b8', '#aab5cb'];
      for (var pi = 0; pi < 260; pi++) {
        var px = pr() * 1000, py = 486 + pr() * 130, pw = 4 + pr() * 7;
        A.ellipse(ctx, px, py, pw, pw * 0.55, pcols[Math.floor(pr() * pcols.length)], 1.2, 'rgba(38,50,77,0.45)');
      }
      ctx.restore();
      // wet dark edge
      ctx.save(); ctx.beginPath(); ctx.moveTo(SHORE[0][0], SHORE[0][1]); SHORE.forEach(function (p) { ctx.lineTo(p[0], p[1]); });
      ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(70,90,130,0.35)'; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = C.out; ctx.stroke(); ctx.restore();
      // snow tongues reaching over the pebbles
      var sr = U.seeded(33);
      for (var sn = 0; sn < 22; sn++) {
        var sx = sr() * 920, sy0 = SHORE[0][1]; for (var q = 1; q < SHORE.length; q++) if (sx <= SHORE[q][0]) { sy0 = U.lerp(SHORE[q - 1][1], SHORE[q][1], (sx - SHORE[q - 1][0]) / (SHORE[q][0] - SHORE[q - 1][0])); break; }
        A.ellipse(ctx, sx, sy0 + 50 + sr() * 26, 40 + sr() * 60, 9 + sr() * 6, sr() < 0.5 ? '#f2f6fe' : '#e6edf9', 0);
      }
      // drifts + sparkles on the snow
      var dr = U.seeded(41);
      ctx.save(); ctx.globalAlpha = 0.55;
      for (var d = 0; d < 18; d++) { A.ellipse(ctx, dr() * AB.W, 640 + dr() * 250, 70 + dr() * 140, 9 + dr() * 6, dr() < 0.5 ? '#ffffff' : '#dbe5f6', 0); }
      ctx.restore();
      for (var sp = 0; sp < 50; sp++) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(dr() * AB.W, 600 + dr() * 300, 2, 2); }
      // driftwood + seaweed + small shells (decor)
      A.line(ctx, [300, 700, 380, 712], 9, C.out); A.line(ctx, [300, 700, 380, 712], 5, '#c9b49a'); A.line(ctx, [340, 706, 352, 694], 4, C.out); A.line(ctx, [340, 706, 352, 694], 2, '#c9b49a');
      [[540, 610], [860, 600], [170, 560], [980, 650]].forEach(function (p) { A.line(ctx, [p[0] - 14, p[1], p[0] - 4, p[1] - 4, p[0] + 6, p[1] + 1, p[0] + 14, p[1] - 3], 4, '#3d8c6a'); });
      // flat rock by the shore (for the special shell)
      A.shadow(ctx, 332, 578, 50, 8, 0.25);
      A.shape(ctx, function (c) { c.moveTo(286, 578); c.quadraticCurveTo(288, 552, 320, 549); c.quadraticCurveTo(364, 548, 378, 576); c.quadraticCurveTo(330, 590, 286, 578); c.closePath(); }, '#a3afc6', 3);
      ctx.save(); ctx.globalAlpha = 0.3; A.shape(ctx, function (c) { c.moveTo(340, 586); c.quadraticCurveTo(372, 576, 362, 556); c.quadraticCurveTo(376, 562, 378, 576); c.quadraticCurveTo(360, 584, 340, 586); c.closePath(); }, C.stoneDark, 0); ctx.restore();
      A.ellipse(ctx, 322, 556, 24, 4, 'rgba(255,255,255,0.6)', 0);

      // ---- rocky headland + steps
      ctx.beginPath(); ctx.moveTo(HEAD[0][0], HEAD[0][1]); HEAD.forEach(function (p) { ctx.lineTo(p[0], p[1]); });
      ctx.lineTo(AB.W, 640); ctx.lineTo(1000, 620); ctx.closePath();
      A.fs(ctx, '#8592b3', 3.5);
      ctx.save(); ctx.clip();
      var rr = U.seeded(61);
      for (var bo = 0; bo < 26; bo++) {
        var bx = 940 + rr() * 360, by = 390 + rr() * 230, bw = 40 + rr() * 50;
        A.shape(ctx, function (c) { c.moveTo(bx - bw / 2, by + bw * 0.3); c.quadraticCurveTo(bx - bw / 2, by - bw * 0.35, bx, by - bw * 0.4); c.quadraticCurveTo(bx + bw / 2, by - bw * 0.3, bx + bw / 2, by + bw * 0.3); c.closePath(); }, rr() < 0.5 ? '#97a3c2' : '#7a87a9', 2.5);
      }
      ctx.fillStyle = 'rgba(29,43,82,0.18)'; ctx.fillRect(1180, 380, 120, 260);
      ctx.restore();
      // snowy plateau in front of the lighthouse
      A.shape(ctx, function (c) { c.moveTo(990, 448); c.quadraticCurveTo(1010, 430, 1060, 432); c.lineTo(1250, 432); c.quadraticCurveTo(1280, 436, 1280, 446); c.lineTo(1280, 512); c.quadraticCurveTo(1170, 528, 1080, 518); c.quadraticCurveTo(1010, 510, 990, 448); c.closePath(); }, '#eef3fd', 3, C.snowDeep);
      ctx.save(); ctx.globalAlpha = 0.5; A.ellipse(ctx, 1150, 500, 110, 12, C.snowShade, 0); ctx.restore();
      // snow caps on the boulders up top
      [[1010, 418, 40], [1200, 392, 50], [1260, 404, 30], [1050, 396, 34]].forEach(function (p) { A.ellipse(ctx, p[0], p[1], p[2], 8, C.snow, 2); });
      // stone steps from the beach
      for (var st = 0; st < 6; st++) {
        var k2 = st / 5, sx2 = U.lerp(985, 1050, k2), sy2 = U.lerp(588, 506, k2);
        A.box(ctx, sx2 - 36, sy2 - 8, 82, 18, 6, '#b3bdd3', 2.5);
        A.ellipse(ctx, sx2 + 2, sy2 - 7, 34, 4, C.snow, 0);
      }
      // rope rail with posts beside the steps
      [[960, 572], [1000, 528], [1036, 486]].forEach(function (p) { A.box(ctx, p[0] - 4, p[1] - 40, 8, 42, 2, C.woodDark, 2); A.ellipse(ctx, p[0], p[1] - 41, 6, 2.5, C.snow, 1.5); });
      A.line(ctx, [960, 548, 980, 516, 1000, 504, 1018, 474, 1036, 462], 2.5, '#9c7a45');

      // ---- lighthouse
      var x = LH.x, base = LH.base, top = 176, wb = 64, wt = 42;
      A.shadow(ctx, x, base + 6, 90, 14, 0.3);
      function towerPath(c) { c.moveTo(x - wb, base); c.lineTo(x - wt, top); c.lineTo(x + wt, top); c.lineTo(x + wb, base); c.closePath(); }
      A.shape(ctx, towerPath, '#ffffff', 3.5);
      ctx.save(); ctx.beginPath(); towerPath(ctx); ctx.clip();
      var bands = [[176, 218], [262, 306], [350, 394]];
      bands.forEach(function (bb) { ctx.fillStyle = '#d8483f'; ctx.fillRect(x - 80, bb[0], 160, bb[1] - bb[0]); });
      ctx.strokeStyle = 'rgba(38,50,77,0.25)'; ctx.lineWidth = 2;
      for (var bl = 176; bl < base; bl += 22) { ctx.beginPath(); ctx.moveTo(x - 80, bl); ctx.lineTo(x + 80, bl); ctx.stroke(); }
      ctx.fillStyle = 'rgba(29,43,82,0.18)'; ctx.beginPath(); ctx.moveTo(x + 12, top); ctx.lineTo(x + wt, top); ctx.lineTo(x + wb, base); ctx.lineTo(x + 18, base); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - 36, 180, 7, 260);
      ctx.restore();
      A.shape(ctx, towerPath, null, 3.5);
      // small tower windows
      A.window(ctx, x - 9, 236, 18, 24, { arch: true, snow: true, lw: 2.5 });
      A.window(ctx, x - 10, 320, 20, 26, { arch: true, snow: true, lw: 2.5 });
      // stone plinth + door
      A.box(ctx, x - 78, base - 20, 156, 26, 6, '#a8b4cc', 3);
      ctx.save(); ctx.strokeStyle = 'rgba(38,50,77,0.3)'; ctx.lineWidth = 2; for (var pl = 0; pl < 6; pl++) { ctx.beginPath(); ctx.moveTo(x - 70 + pl * 28, base - 20); ctx.lineTo(x - 70 + pl * 28, base + 6); ctx.stroke(); } ctx.restore();
      A.door(ctx, x - 24, base - 18, 48, 72, '#2e6e9e');
      A.circle(ctx, x, base - 72, 7, '#bfe3ff', 2);
      A.glow(ctx, x + 44, base - 62, 40, C.lampGlow, 0.55);
      A.box(ctx, x + 37, base - 72, 14, 18, 4, '#ffe7a3', 2.5); A.poly(ctx, [x + 35, base - 72, x + 53, base - 72, x + 44, base - 80], '#3c4a6b', 2);
      A.ellipse(ctx, x, base - 22, 60, 6, C.snow, 2);
      // gallery
      A.box(ctx, x - 62, top - 10, 124, 14, 4, '#3c4a6b', 3);
      A.ellipse(ctx, x - 10, top - 11, 52, 5, C.snow, 2);
      for (var rl2 = 0; rl2 <= 8; rl2++) A.line(ctx, [x - 56 + rl2 * 14, top - 10, x - 56 + rl2 * 14, top - 32], 2.5);
      A.line(ctx, [x - 58, top - 32, x + 58, top - 32], 3.5);
      // lantern room
      A.box(ctx, x - 34, top - 64, 68, 54, 4, '#fff1b8', 3);
      var lg = ctx.createLinearGradient(0, top - 64, 0, top - 10); lg.addColorStop(0, '#fffbe6'); lg.addColorStop(1, '#ffc95a');
      A.box(ctx, x - 30, top - 60, 60, 48, 3, lg, 0);
      A.line(ctx, [x - 12, top - 64, x - 12, top - 10], 3); A.line(ctx, [x + 12, top - 64, x + 12, top - 10], 3);
      A.box(ctx, x - 34, top - 64, 68, 54, 4, null, 3);
      // dome + finial
      A.shape(ctx, function (c) { c.moveTo(x - 44, top - 62); c.quadraticCurveTo(x - 40, top - 104, x, top - 108); c.quadraticCurveTo(x + 40, top - 104, x + 44, top - 62); c.closePath(); }, '#d8483f', 3.5);
      ctx.save(); ctx.globalAlpha = 0.22; A.shape(ctx, function (c) { c.moveTo(x + 6, top - 106); c.quadraticCurveTo(x + 40, top - 104, x + 44, top - 62); c.lineTo(x + 14, top - 62); c.closePath(); }, '#000', 0); ctx.restore();
      A.shape(ctx, function (c) { c.moveTo(x - 36, top - 82); c.quadraticCurveTo(x - 26, top - 108, x, top - 108); c.quadraticCurveTo(x + 22, top - 106, x + 30, top - 90); c.quadraticCurveTo(x, top - 96, x - 36, top - 82); c.closePath(); }, C.snow, 2);
      A.line(ctx, [x, top - 108, x, top - 120], 3); A.circle(ctx, x, top - 123, 5, C.coin, 2.5);

      // ---- net shed on stilts at the far left
      for (var pst = 0; pst < 4; pst++) { A.box(ctx, 20 + pst * 50, 448, 9, 44, 2, C.woodDark, 2.5); }
      A.box(ctx, 6, 440, 192, 14, 3, C.wood, 3);
      A.box(ctx, 16, 340, 172, 104, 5, '#c4473d', 3.5);
      ctx.save(); ctx.beginPath(); A.rrect(ctx, 16, 340, 172, 104, 5); ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 2; for (var vb = 36; vb < 190; vb += 20) { ctx.beginPath(); ctx.moveTo(vb, 340); ctx.lineTo(vb, 444); ctx.stroke(); }
      ctx.fillStyle = 'rgba(20,30,70,0.15)'; ctx.fillRect(130, 340, 70, 110); ctx.restore();
      A.window(ctx, 36, 366, 46, 40, {});
      // hanging net + floats
      ctx.save(); ctx.strokeStyle = 'rgba(240,240,255,0.75)'; ctx.lineWidth = 1.4;
      for (var nx = 0; nx < 6; nx++) { ctx.beginPath(); ctx.moveTo(100 + nx * 12, 358); ctx.quadraticCurveTo(106 + nx * 12, 395, 104 + nx * 9, 430); ctx.stroke(); }
      for (var ny = 0; ny < 5; ny++) { ctx.beginPath(); ctx.moveTo(100, 366 + ny * 15); ctx.quadraticCurveTo(130, 372 + ny * 15, 164, 366 + ny * 14); ctx.stroke(); }
      ctx.restore();
      [[104, 360, C.yellow], [130, 362, C.orange], [158, 360, C.yellow]].forEach(function (f) { A.circle(ctx, f[0], f[1], 5, f[2], 2); });
      A.circle(ctx, 170, 410, 14, '#ffffff', 3); A.circle(ctx, 170, 410, 7, null, 2); ctx.save(); ctx.beginPath(); ctx.arc(170, 410, 14, 0, 7); ctx.arc(170, 410, 7, 0, 7, true); ctx.clip(); ctx.fillStyle = C.red; ctx.fillRect(156, 396, 8, 8); ctx.fillRect(176, 416, 8, 8); ctx.fillRect(176, 396, 8, 8); ctx.fillRect(156, 416, 8, 8); ctx.restore();
      K.roof(ctx, 16, 340, 172, 56, '#3d4c6e', 18);
      A.box(ctx, 150, 268, 12, 30, 2, '#3c4a6b', 2.5);

      // ---- the pier (deck, pilings, front faces)
      // pilings under the walkway sides
      for (var pk = 0; pk < 7; pk++) {
        var yy = U.lerp(WALK_FAR_Y + 18, WALK_NEAR_Y - 30, pk / 6), sc = U.lerp(0.75, 1, pk / 6);
        [walkX(WL, yy) - 2, walkX(WR, yy) + 2].forEach(function (px2) {
          A.box(ctx, px2 - 5 * sc, yy - 4, 10 * sc, 26 * sc, 2, '#5c3a22', 2.5);
          A.ellipse(ctx, px2, yy + 22 * sc, 11 * sc, 3 * sc, 'rgba(200,235,255,0.5)', 0);
        });
      }
      // under-deck shadow on the water
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#0c2347';
      ctx.beginPath(); ctx.moveTo(WL[1] - 6, WALK_FAR_Y + 10); ctx.lineTo(WR[1] + 10, WALK_FAR_Y + 10); ctx.lineTo(WR[0] + 12, WALK_NEAR_Y - 20); ctx.lineTo(WL[0] - 4, WALK_NEAR_Y - 20); ctx.closePath(); ctx.fill(); ctx.restore();
      // walkway deck
      ctx.beginPath(); ctx.moveTo(WL[1], WALK_FAR_Y - 2); ctx.lineTo(WR[1], WALK_FAR_Y - 2); ctx.lineTo(WR[0], WALK_NEAR_Y); ctx.lineTo(WL[0], WALK_NEAR_Y); ctx.closePath();
      A.fs(ctx, C.woodLight, 3);
      ctx.save(); ctx.clip();
      for (var pl2 = 0; pl2 < 22; pl2++) {
        var py2 = WALK_FAR_Y + Math.pow(pl2 / 22, 1.15) * (WALK_NEAR_Y - WALK_FAR_Y);
        ctx.fillStyle = pl2 % 3 === 0 ? 'rgba(125,74,43,0.18)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(480, py2, 160, 10);
        ctx.strokeStyle = 'rgba(90,50,25,0.45)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(480, py2); ctx.lineTo(640, py2); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(29,43,82,0.12)'; ctx.fillRect(590, WALK_FAR_Y, 60, 240);
      // snow along the deck edges
      ctx.fillStyle = 'rgba(245,249,255,0.9)';
      ctx.beginPath(); ctx.moveTo(WL[1], WALK_FAR_Y); ctx.lineTo(WL[1] + 12, WALK_FAR_Y); ctx.lineTo(WL[0] + 20, WALK_NEAR_Y); ctx.lineTo(WL[0], WALK_NEAR_Y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(WR[1] - 8, WALK_FAR_Y); ctx.lineTo(WR[1], WALK_FAR_Y); ctx.lineTo(WR[0], WALK_NEAR_Y); ctx.lineTo(WR[0] - 14, WALK_NEAR_Y); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(WL[1], WALK_FAR_Y - 2); ctx.lineTo(WR[1], WALK_FAR_Y - 2); ctx.lineTo(WR[0], WALK_NEAR_Y); ctx.lineTo(WL[0], WALK_NEAR_Y); ctx.closePath(); A.fs(ctx, null, 3);
      // end platform: pilings, front face, deck
      for (var pp = 0; pp < 6; pp++) { var ppx = U.lerp(PLAT[0] + 8, PLAT[2] - 8, pp / 5); if (ppx > WL[1] - 4 && ppx < WR[1] + 4) continue; A.box(ctx, ppx - 5, PLAT[3] + 6, 10, 22, 2, '#5c3a22', 2.5); A.ellipse(ctx, ppx, PLAT[3] + 28, 10, 3, 'rgba(200,235,255,0.5)', 0); }
      A.box(ctx, PLAT[0], PLAT[3] - 4, PLAT[2] - PLAT[0], 14, 2, C.woodDark, 3);
      A.box(ctx, PLAT[0], PLAT[1], PLAT[2] - PLAT[0], PLAT[3] - PLAT[1], 3, C.woodLight, 3);
      ctx.save(); ctx.beginPath(); ctx.rect(PLAT[0], PLAT[1], PLAT[2] - PLAT[0], PLAT[3] - PLAT[1]); ctx.clip();
      for (var pl3 = 0; pl3 < 8; pl3++) { var py3 = PLAT[1] + pl3 * 8.5; ctx.strokeStyle = 'rgba(90,50,25,0.45)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(PLAT[0], py3); ctx.lineTo(PLAT[2], py3); ctx.stroke(); if (pl3 % 3 === 0) { ctx.fillStyle = 'rgba(125,74,43,0.16)'; ctx.fillRect(PLAT[0], py3, PLAT[2] - PLAT[0], 8.5); } }
      ctx.fillStyle = 'rgba(29,43,82,0.12)'; ctx.fillRect(600, PLAT[1], 60, 70);
      ctx.fillStyle = 'rgba(245,249,255,0.9)'; ctx.fillRect(PLAT[0], PLAT[1], PLAT[2] - PLAT[0], 6);
      ctx.restore();
      A.box(ctx, PLAT[0], PLAT[1], PLAT[2] - PLAT[0], PLAT[3] - PLAT[1], 3, null, 3);
      // posts sticking up at the back corners of the platform
      [[PLAT[0] + 6, PLAT[1] + 2], [PLAT[2] - 6, PLAT[1] + 2]].forEach(function (p) { A.box(ctx, p[0] - 6, p[1] - 30, 12, 32, 3, '#6a4128', 2.5); A.ellipse(ctx, p[0], p[1] - 31, 8, 3.5, C.snow, 1.5); });
      // rope between posts
      A.line(ctx, [PLAT[0] + 6, PLAT[1] - 20, 560, PLAT[1] - 10, PLAT[2] - 6, PLAT[1] - 20], 2.5, '#9c7a45');
    },
    animate: function (ctx, t) {
      ctx.save(); clipSea(ctx);
      // drifting ice floes in three lanes
      var lanes = [[262, 14, 0.55, 4], [300, 20, 0.8, 3], [420, 30, 1, 3]];
      for (var L = 0; L < lanes.length; L++) {
        var ln = lanes[L];
        for (var i = 0; i < ln[3]; i++) {
          var span = AB.W + 300, x = ((i * span / ln[3] + t * ln[1] + L * 170) % span) - 150, y = ln[0] + Math.sin(t * 0.8 + i * 2 + L) * 2 + (i % 2) * 14, s = ln[2] * (0.8 + ((i * 37) % 5) * 0.08);
          ctx.fillStyle = 'rgba(10,30,70,0.35)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 6 * s, 46 * s, 9 * s, 0, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x - 44 * s, y); ctx.lineTo(x - 30 * s, y - 8 * s); ctx.lineTo(x + 6 * s, y - 10 * s); ctx.lineTo(x + 40 * s, y - 6 * s); ctx.lineTo(x + 46 * s, y + 2 * s); ctx.lineTo(x + 20 * s, y + 9 * s); ctx.lineTo(x - 30 * s, y + 8 * s); ctx.closePath();
          A.fs(ctx, '#e9f4ff', 2.2, '#3d5c8e');
          ctx.fillStyle = '#a9c9ee'; ctx.beginPath(); ctx.moveTo(x - 44 * s, y); ctx.lineTo(x - 30 * s, y + 8 * s); ctx.lineTo(x + 20 * s, y + 9 * s); ctx.lineTo(x + 46 * s, y + 2 * s); ctx.lineTo(x + 20 * s, y + 4 * s); ctx.lineTo(x - 26 * s, y + 3 * s); ctx.closePath(); ctx.fill();
        }
      }
      // gentle moving wave crests
      ctx.lineCap = 'round';
      for (var w = 0; w < 46; w++) {
        var wy = HORIZON + 20 + ((w * 53) % 320), k = (wy - HORIZON) / 330, ww = 10 + k * 26;
        var wx = ((w * 197 + t * (10 + k * 22)) % (AB.W + 80)) - 40, a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6 + w));
        ctx.strokeStyle = 'rgba(220,240,255,' + a + ')'; ctx.lineWidth = 1.5 + k * 1.5;
        ctx.beginPath(); ctx.moveTo(wx - ww, wy); ctx.quadraticCurveTo(wx, wy - 4 - k * 4, wx + ww, wy); ctx.stroke();
      }
      ctx.restore();
      // foam lapping at the shore
      ctx.save(); clipSea(ctx);
      var lap = Math.sin(t * 1.2) * 5;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); SHORE.forEach(function (p, i) { var yy = p[1] - 8 + lap + Math.sin(i * 1.7 + t * 2) * 2; if (i) ctx.lineTo(p[0], yy); else ctx.moveTo(p[0], yy); }); ctx.stroke();
      ctx.globalAlpha = 0.45; ctx.beginPath(); SHORE.forEach(function (p, i) { var yy = p[1] - 20 - lap * 0.6; if (i) ctx.lineTo(p[0], yy); else ctx.moveTo(p[0], yy); }); ctx.stroke();
      ctx.restore();
      // smoke from the net shed
      K.smoke(ctx, 156, 262, t);
      // lighthouse beam sweeping the sky
      var ang = t * 0.9, cx = Math.cos(ang), toward = Math.sin(ang);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (Math.abs(cx) > 0.05) {
        var len = 1100 * Math.abs(cx), dir = cx > 0 ? 1 : -1, spread = 26 + 40 * (1 - Math.abs(cx));
        var ex = LAMP[0] + dir * len, ey = LAMP[1] - 30 * Math.abs(cx);
        var bgr = ctx.createLinearGradient(LAMP[0], LAMP[1], ex, ey);
        var ba = 0.5 * Math.min(1, Math.abs(cx) * 2.5) * (toward < 0 ? 0.6 : 1);
        bgr.addColorStop(0, 'rgba(255,240,170,' + ba + ')'); bgr.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = bgr; ctx.beginPath(); ctx.moveTo(LAMP[0], LAMP[1] - 8); ctx.lineTo(ex, ey - spread); ctx.lineTo(ex, ey + spread); ctx.lineTo(LAMP[0], LAMP[1] + 8); ctx.closePath(); ctx.fill();
      }
      var flash = toward > 0 ? Math.pow(Math.max(0, 1 - Math.abs(cx)), 3) * toward : 0;
      A.glow(ctx, LAMP[0], LAMP[1], 50 + flash * 110, 'rgba(255,230,150,', 0.45 + flash * 0.5);
      ctx.restore();
      A.circle(ctx, LAMP[0], LAMP[1], 10, 'rgba(255,252,230,' + (0.7 + flash * 0.3) + ')', 0);
    },
    walk: [[0, 512], [120, 522], [260, 544], [400, 566], [498, 580], [513, 368], [470, 368], [470, 304], [650, 304], [650, 368], [607, 368], [622, 582], [760, 586], [880, 576], [945, 566], [1002, 500], [1006, 456], [1240, 456], [1240, 508], [1092, 514], [1050, 598], [1280, 616], [1280, 900], [0, 900]],
    blocks: [
      { e: [486, 318, 16, 9] }, { e: [632, 352, 14, 7] }, { e: [600, 356, 16, 6] },
      { e: [420, 628, 62, 16] }, { e: [710, 634, 58, 16] }, { e: [252, 610, 46, 14] }, { e: [150, 700, 70, 12] },
      { e: [1150, 830, 60, 14] }, { e: [820, 790, 50, 16] }, { e: [735, 806, 38, 9] }, { e: [905, 806, 38, 9] }, { e: [1236, 706, 44, 14] }, { e: [40, 896, 46, 12] }, { e: [486, 598, 10, 6] }, { e: [634, 600, 10, 6] }, { e: [252, 612, 1, 1] }
    ],
    spawns: { 'default': [560, 720], town: [80, 660], lighthouse: [1120, 486], map: [560, 720] },
    hotspots: [
      { id: 'toTown', hit: [0, 560, 90, 170], at: [30, 660], icon: 'left', badge: [50, 580], action: function () { AB.go('town', 'harbor'); } },
      { id: 'lighthouseDoor', hit: [1080, 350, 80, 100], at: [1120, 476], icon: 'door', badge: [1120, 338], action: function () { AB.audio.sfx('door'); AB.go('lighthouse', 'harbor'); } }
    ],
    props: PROPS,
    npcSpots: { finn: { at: [560, 470], wander: [530, 400, 60, 150], dir: -1 } },
    update: function () { if (gemDue && AB.world.t >= gemDue) { gemDue = 0; AB.quests.revealGem('gem_harbor_2', 560, 334); } },
    questSpots: { shell1: [180, 550], shell2: [360, 790], shell3: [930, 690], shell4: [1210, 486], shell5: [580, 326], sculptShell: [330, 568] }
  });
})();
