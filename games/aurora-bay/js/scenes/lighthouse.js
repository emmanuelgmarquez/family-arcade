/* Lighthouse — Bramble's round stone room at the foot of the tower: spiral stairs up to the great lens. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C, K = AB.kit;

  // ---- round-room geometry ----------------------------------------------------
  var R = 720;
  function semi(x) { var k = (x - 640) / R; return Math.sqrt(Math.max(0, 1 - k * k)); }
  function floorY(x) { return 700 - 300 * semi(x); }   // where the curved wall meets the floor (402 at centre)
  function ceilY(x) { return 22 + 108 * semi(x); }     // where the wall meets the ceiling (130 at centre)
  function rowY(x, k) { return U.lerp(ceilY(x), floorY(x), k); }
  var WIN = { x: 872, y: 262, rx: 70, ry: 78 };
  var HOLE = { x: 430, y: 66, rx: 122, ry: 36 };
  var STEPS = 17;
  function stepAt(i) {
    var s = i / (STEPS - 1);
    return { x: 150 + 205 * Math.sin(s * Math.PI / 2), y: 712 - s * 600, w: 132 - s * 46 };
  }

  // ---- state for little reactions --------------------------------------------
  var wheelSpin = 0, wheelAng = 0, lastT = 0, stoveFlare = 0, deskWobble = 0, scopeT = -9, lensPulse = 0, jarGlow = 0;

  function sitOn(x, y, dir) { var p = AB.world.player; p.x = x; p.y = y; p.dir = dir || 1; p.pose = 'sit'; p.poseUntil = AB.world.t + 6; AB.audio.sfx('soft'); }

  function shipInBottle(ctx, x, y, t, wob) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 9) * wob * 0.12);
    A.box(ctx, -30, 2, 10, 8, 2, C.woodDark, 2); A.box(ctx, 20, 2, 10, 8, 2, C.woodDark, 2);
    A.shape(ctx, function (c) { c.moveTo(-34, -6); c.quadraticCurveTo(-36, -26, -14, -26); c.lineTo(22, -26); c.quadraticCurveTo(30, -26, 32, -20); c.lineTo(42, -18); c.lineTo(42, -10); c.lineTo(32, -8); c.quadraticCurveTo(30, 2, 22, 2); c.lineTo(-14, 2); c.quadraticCurveTo(-34, 2, -34, -6); c.closePath(); }, 'rgba(190,235,225,0.45)', 2.5);
    A.box(ctx, 42, -18, 8, 8, 2, '#c98d5a', 2);
    // tiny ship inside
    var bob = Math.sin(t * 2) * 1.2;
    A.shape(ctx, function (c) { c.moveTo(-22, -6 + bob); c.lineTo(16, -6 + bob); c.lineTo(10, 0 + bob); c.lineTo(-18, 0 + bob); c.closePath(); }, C.red, 1.5);
    A.line(ctx, [-4, -6 + bob, -4, -24 + bob], 1.5);
    A.poly(ctx, [-3, -23 + bob, 10, -10 + bob, -3, -10 + bob], '#fff', 1.2);
    A.poly(ctx, [-5, -21 + bob, -16, -10 + bob, -5, -10 + bob], '#fff', 1.2);
    A.ellipse(ctx, -2, -4, 26, 2.5, 'rgba(60,140,200,0.5)', 0);
    A.highlight(ctx, -18, -20, 8, 2, 0.75);
    ctx.restore();
  }

  var PROPS = [
    // chart desk with compass and a ship in a bottle
    { x: 520, y: 486, hit: [420, 360, 200, 130], at: [600, 540],
      draw: function (ctx, t) {
        var wob = U.clamp(deskWobble - t, 0, 1.2);
        A.shadow(ctx, 520, 488, 112, 12);
        // legs + drawer pedestal
        A.box(ctx, 424, 420, 14, 66, 3, C.woodDark, 3);
        A.box(ctx, 548, 416, 66, 70, 5, C.wood, 3);
        A.box(ctx, 555, 424, 52, 24, 4, C.woodLight, 2.5); A.circle(ctx, 581, 436, 3.5, C.coin, 1.5);
        A.box(ctx, 555, 454, 52, 24, 4, C.woodLight, 2.5); A.circle(ctx, 581, 466, 3.5, C.coin, 1.5);
        ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#1d2b52'; ctx.fillRect(592, 416, 22, 70); ctx.restore();
        // top
        A.box(ctx, 410, 400, 220, 22, 6, C.woodLight, 3);
        A.box(ctx, 414, 412, 212, 10, 4, C.wood, 0);
        A.box(ctx, 410, 400, 220, 22, 6, null, 3);
        // chart
        ctx.save(); ctx.translate(486, 396); ctx.rotate(-0.04);
        A.box(ctx, -52, -14, 104, 22, 3, '#f6e7c4', 2.5);
        A.line(ctx, [-44, 2, -30, -6, -14, -2, 0, -9, 14, -4, 26, -10], 2, '#5c9fd1');
        ctx.save(); ctx.setLineDash([3, 4]); A.line(ctx, [-36, -10, -6, 0, 30, -2], 1.6, C.red); ctx.restore();
        A.line(ctx, [34, -6, 42, 2], 2, C.red); A.line(ctx, [42, -6, 34, 2], 2, C.red);
        A.circle(ctx, -52, -4, 6, '#e8d3a6', 2); A.circle(ctx, 52, -4, 6, '#e8d3a6', 2);
        ctx.restore();
        // compass
        A.circle(ctx, 446, 386, 12, '#d9a83a', 2.5); A.circle(ctx, 446, 386, 8.5, '#fff8e6', 1.5);
        var na = -0.6 + Math.sin(t * 0.9) * 0.15 + (wob > 0 ? (1.2 - wob) * 14 : 0);
        ctx.save(); ctx.translate(446, 386); ctx.rotate(na); A.poly(ctx, [0, -7, 2.2, 0, 0, 7, -2.2, 0], C.red, 0); A.poly(ctx, [0, 7, 2.2, 0, -2.2, 0], C.out, 0); ctx.restore();
        // ship in a bottle on its stand
        shipInBottle(ctx, 572, 386, t, wob);
        // inkpot + quill
        A.box(ctx, 600, 384, 14, 14, 4, '#3c4a6b', 2); A.line(ctx, [607, 384, 622, 356], 2.5, C.out); A.shape(ctx, function (c) { c.moveTo(622, 356); c.quadraticCurveTo(628, 366, 614, 374); c.quadraticCurveTo(616, 364, 622, 356); c.closePath(); }, '#ffffff', 1.6);
        // oil lamp
        A.glow(ctx, 422, 360, 56 + Math.sin(t * 3) * 3, C.lampGlow, 0.45);
        A.ellipse(ctx, 422, 398, 12, 4, '#c58a12', 2.5); A.box(ctx, 414, 380, 16, 18, 6, '#d9a83a', 2.5);
        A.shape(ctx, function (c) { c.moveTo(414, 380); c.quadraticCurveTo(410, 362, 418, 348); c.lineTo(426, 348); c.quadraticCurveTo(434, 362, 430, 380); c.closePath(); }, 'rgba(255,240,190,0.7)', 2);
        A.ellipse(ctx, 422, 366, 3, 6, '#ffb54d', 0);
      },
      tap: function () { deskWobble = AB.world.t + 1.2; AB.audio.sfx('ding'); AB.world.burst(560, 360, 'sparkle', 4); } },

    // shelves of books and jars above the desk (jar of sea glass hides a glimmer stone)
    { x: 520, y: 404, hit: [420, 180, 200, 150], at: [620, 530],
      draw: function (ctx, t) {
        var g = U.clamp(jarGlow - t, 0, 1.5);
        var pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
        A.glow(ctx, 588, 214, 22 + g * 30, 'rgba(140,255,220,', 0.18 + pulse * 0.12 + g * 0.4);
        if (g > 0) { for (var i = 0; i < 4; i++) A.sparkle(ctx, 588 + Math.cos(t * 5 + i * 1.6) * 22, 210 + Math.sin(t * 5 + i * 1.6) * 16, 6, g / 1.5); }
      },
      tap: function () { jarGlow = AB.world.t + 1.5; AB.audio.sfx('sparkle'); AB.world.burst(588, 220, 'sparkle', 6); AB.quests.revealGem('gem_lighthouse_2', 650, 580); } },

    // ship's wheel on the wall
    { x: 724, y: 400, hit: [672, 168, 104, 104], at: [760, 520],
      draw: function (ctx, t) {
        var dt = t - lastT; lastT = t; if (dt > 0 && dt < 0.2) wheelAng += dt * 9 * U.clamp(wheelSpin - t, 0, 1.5);
        ctx.save(); ctx.translate(724, 220); ctx.rotate(wheelAng + Math.sin(t * 0.6) * 0.04);
        for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; A.line(ctx, [Math.cos(a) * 14, Math.sin(a) * 14, Math.cos(a) * 50, Math.sin(a) * 50], 9, C.out); A.line(ctx, [Math.cos(a) * 14, Math.sin(a) * 14, Math.cos(a) * 50, Math.sin(a) * 50], 5, C.woodLight); A.circle(ctx, Math.cos(a) * 50, Math.sin(a) * 50, 5, C.wood, 2.5); }
        A.circle(ctx, 0, 0, 36, null, 11, C.out); A.circle(ctx, 0, 0, 36, null, 7, C.wood);
        A.circle(ctx, 0, 0, 13, '#d9a83a', 3); A.circle(ctx, 0, 0, 5, '#fff3c0', 1.5);
        ctx.restore();
      },
      tap: function () { wheelSpin = AB.world.t + 1.5; AB.audio.sfx('whoosh'); } },

    // brass telescope by the window — look out to sea
    { x: 1012, y: 512, hit: [940, 330, 120, 190], at: [1010, 560],
      draw: function (ctx, t) {
        A.shadow(ctx, 1012, 514, 46, 8);
        A.line(ctx, [1012, 420, 980, 512], 7, C.out); A.line(ctx, [1012, 420, 980, 512], 3.5, C.woodDark);
        A.line(ctx, [1012, 420, 1046, 512], 7, C.out); A.line(ctx, [1012, 420, 1046, 512], 3.5, C.wood);
        A.line(ctx, [1012, 420, 1016, 506], 7, C.out); A.line(ctx, [1012, 420, 1016, 506], 3.5, C.wood);
        A.circle(ctx, 1012, 418, 8, '#c58a12', 2.5);
        var look = U.clamp(t - scopeT, 0, 9) < 2.5 ? 0.05 : 0;
        ctx.save(); ctx.translate(1012, 410); ctx.rotate(-2.62 + look + Math.sin(t * 0.5) * 0.02);
        var tube = function (c) { c.moveTo(-34, -8); c.lineTo(44, -12); c.lineTo(44, 12); c.lineTo(-34, 8); c.closePath(); };
        A.box(ctx, -48, -6, 16, 12, 3, '#9a6a1c', 2.5);
        A.shape(ctx, tube, '#e3b443', 3);
        ctx.save(); ctx.beginPath(); tube(ctx); ctx.clip(); ctx.fillStyle = 'rgba(120,70,10,0.28)'; ctx.fillRect(-40, 2, 90, 14); ctx.restore();
        A.shape(ctx, tube, null, 3);
        A.box(ctx, -2, -11, 7, 22, 1, '#b8861e', 2); A.box(ctx, 40, -16, 12, 32, 4, '#b8861e', 2.5);
        A.ellipse(ctx, 52, 0, 3.5, 13, '#bfe3ff', 2);
        A.highlight(ctx, 10, -6, 18, 2, 0.7);
        ctx.restore();
        var tw = 0.5 + 0.5 * Math.sin(t * 2.5); A.sparkle(ctx, 950, 360, 5, tw);
      },
      tap: function () {
        var W = AB.world; scopeT = W.t; W.player.dir = -1; W.player.pose = 'happy'; W.player.poseUntil = W.t + 1.5;
        AB.audio.sfx('sparkle'); W.burst(WIN.x, WIN.y, 'sparkle', 10); W.burst(950, 360, 'star', 3);
        AB.quests.revealGem('gem_lighthouse_1', 940, 580);
      } },

    // pot-belly stove with a kettle
    { x: 1172, y: 604, hit: [1110, 450, 125, 160], at: [1110, 640],
      draw: function (ctx, t) {
        var f = U.clamp(stoveFlare - t, 0, 1.2);
        A.glow(ctx, 1172, 560, 150 + Math.sin(t * 4) * 6 + f * 50, 'rgba(255,160,70,', 0.3 + f * 0.25);
        A.shadow(ctx, 1172, 606, 58, 10);
        // pipe up to the ceiling
        A.box(ctx, 1162, 60, 20, 430, 3, '#3a4258', 3);
        ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.fillRect(1173, 62, 8, 426); ctx.restore();
        A.box(ctx, 1158, 300, 28, 10, 3, '#4c5674', 2.5);
        // legs + body
        A.box(ctx, 1140, 588, 10, 18, 2, '#2b3247', 2.5); A.box(ctx, 1194, 588, 10, 18, 2, '#2b3247', 2.5);
        A.box(ctx, 1132, 576, 80, 16, 5, '#3a4258', 3);
        A.shape(ctx, function (c) { c.moveTo(1138, 578); c.quadraticCurveTo(1120, 530, 1144, 492); c.lineTo(1200, 492); c.quadraticCurveTo(1224, 530, 1206, 578); c.closePath(); }, '#45506e', 3);
        ctx.save(); ctx.globalAlpha = 0.25; A.shape(ctx, function (c) { c.moveTo(1186, 578); c.quadraticCurveTo(1210, 530, 1196, 492); c.lineTo(1200, 492); c.quadraticCurveTo(1224, 530, 1206, 578); c.closePath(); }, '#000', 0); ctx.restore();
        A.highlight(ctx, 1144, 530, 3, 16, 0.35);
        // fire door
        var fl = 0.75 + 0.25 * Math.sin(t * 11) * Math.sin(t * 7.3) + f * 0.4;
        A.box(ctx, 1150, 520, 44, 36, 8, '#2b3247', 3);
        var fg = ctx.createLinearGradient(0, 524, 0, 552); fg.addColorStop(0, 'rgba(255,240,150,' + Math.min(1, fl) + ')'); fg.addColorStop(1, 'rgba(255,120,40,' + Math.min(1, fl) + ')');
        A.box(ctx, 1155, 525, 34, 26, 6, fg, 0);
        for (var b = 0; b < 3; b++) A.line(ctx, [1162 + b * 10, 525, 1162 + b * 10, 551], 2.5, '#2b3247');
        A.box(ctx, 1150, 520, 44, 36, 8, null, 3);
        // top + kettle
        A.ellipse(ctx, 1172, 492, 32, 8, '#566184', 3);
        A.shape(ctx, function (c) { c.moveTo(1150, 488); c.quadraticCurveTo(1148, 464, 1172, 462); c.quadraticCurveTo(1196, 464, 1194, 488); c.closePath(); }, C.red, 3);
        A.line(ctx, [1194, 478, 1210, 466], 5, C.out); A.line(ctx, [1194, 478, 1210, 466], 2.5, C.red);
        ctx.beginPath(); ctx.arc(1172, 462, 14, Math.PI, 0); ctx.lineWidth = 3; ctx.strokeStyle = C.out; ctx.stroke();
        A.circle(ctx, 1172, 461, 4, C.redDark, 2); A.highlight(ctx, 1162, 472, 4, 5, 0.6);
        // steam
        for (var s = 0; s < 3; s++) { var p = ((t * 0.5 + s / 3) % 1), big = 1 + f * 1.2; ctx.fillStyle = 'rgba(255,255,255,' + (0.45 * (1 - p) * Math.min(1, 0.5 + f)) + ')'; ctx.beginPath(); ctx.arc(1214 + p * 20 + Math.sin(p * 6 + s) * 6, 460 - p * 60 * big, (4 + p * 10) * big, 0, 7); ctx.fill(); }
      },
      tap: function () { stoveFlare = AB.world.t + 1.2; AB.audio.sfx('whoosh'); AB.world.burst(1214, 450, 'note', 3); } },

    // cosy armchair with a footstool and a little side table
    { x: 1046, y: 772, hit: [966, 640, 170, 140], at: [1046, 800],
      draw: function (ctx) {
        A.shadow(ctx, 1052, 774, 92, 14);
        // side table + mug + book
        A.box(ctx, 1150, 700, 8, 72, 2, C.woodDark, 2.5); A.ellipse(ctx, 1154, 772, 20, 5, C.woodDark, 2);
        A.ellipse(ctx, 1154, 698, 34, 10, C.woodLight, 3);
        A.box(ctx, 1134, 684, 30, 10, 2, C.blue, 2); A.box(ctx, 1136, 676, 26, 8, 2, C.yellow, 2);
        A.mug(ctx, 1170, 698, 0.5, C.teal, 'marsh');
        // chair back (wingback)
        A.shape(ctx, function (c) { c.moveTo(986, 720); c.quadraticCurveTo(978, 640, 1010, 628); c.quadraticCurveTo(1046, 616, 1082, 628); c.quadraticCurveTo(1112, 640, 1104, 720); c.closePath(); }, '#b8433b', 3.5);
        ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#1d2b52'; ctx.fillRect(1062, 620, 50, 110); ctx.restore();
        // tufts
        [[1022, 660], [1046, 652], [1070, 660], [1034, 690], [1058, 690]].forEach(function (p) { A.circle(ctx, p[0], p[1], 2.4, '#7d2a25', 0); });
        // seat cushion
        A.box(ctx, 990, 714, 112, 30, 12, '#d3564c', 3);
        // arms (wings)
        A.shape(ctx, function (c) { c.moveTo(968, 770); c.lineTo(968, 708); c.quadraticCurveTo(966, 684, 990, 684); c.quadraticCurveTo(1008, 686, 1006, 708); c.lineTo(1006, 770); c.closePath(); }, '#c94b42', 3);
        A.shape(ctx, function (c) { c.moveTo(1086, 770); c.lineTo(1086, 708); c.quadraticCurveTo(1084, 686, 1102, 684); c.quadraticCurveTo(1126, 684, 1124, 708); c.lineTo(1124, 770); c.closePath(); }, '#a93d36', 3);
        // front
        A.box(ctx, 1000, 740, 92, 32, 6, '#b8433b', 3);
        ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#1d2b52'; ctx.fillRect(1000, 760, 92, 12); ctx.restore();
        A.box(ctx, 978, 768, 10, 8, 2, C.woodDark, 2); A.box(ctx, 1104, 768, 10, 8, 2, C.woodDark, 2);
        // knitted blanket over the back
        A.shape(ctx, function (c) { c.moveTo(1060, 628); c.quadraticCurveTo(1086, 620, 1100, 640); c.lineTo(1096, 700); c.quadraticCurveTo(1080, 708, 1066, 700); c.closePath(); }, '#f3e3b8', 3);
        A.line(ctx, [1066, 648, 1096, 646], 2.5, C.teal); A.line(ctx, [1066, 666, 1096, 664], 2.5, C.red); A.line(ctx, [1066, 684, 1096, 682], 2.5, C.teal);
        A.highlight(ctx, 1004, 650, 4, 12, 0.35);
        // footstool
        A.box(ctx, 934, 760, 48, 20, 8, '#d3564c', 3); A.box(ctx, 938, 776, 6, 8, 2, C.woodDark, 2); A.box(ctx, 972, 776, 6, 8, 2, C.woodDark, 2);
      },
      tap: function () { sitOn(1046, 744, -1); } },

    // spiral stairs (painted) — tap to make the great lens glow
    { x: 200, y: 600, hit: [96, 430, 220, 270], at: [300, 690], draw: function () {},
      tap: function () { lensPulse = AB.world.t + 1.6; AB.audio.sfx('sparkle'); AB.world.burst(HOLE.x, HOLE.y + 50, 'sparkle', 8); var p = AB.world.player; p.pose = 'happy'; p.poseUntil = AB.world.t + 1.2; } },

    // basket of yarn by the chair
    { x: 900, y: 812, hit: [862, 760, 76, 60], at: [900, 840],
      draw: function (ctx, t) {
        A.shadow(ctx, 900, 814, 34, 7);
        A.circle(ctx, 888, 784, 13, C.teal, 2.5); A.circle(ctx, 908, 782, 12, C.pink, 2.5); A.circle(ctx, 898, 774, 11, C.yellow, 2.5);
        ctx.save(); ctx.strokeStyle = 'rgba(38,50,77,0.4)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(898, 774, 6, 0.5, 3); ctx.stroke(); ctx.restore();
        A.line(ctx, [892, 770, 878, 752], 2.5, '#9a6a1c'); A.line(ctx, [902, 770, 916, 750], 2.5, '#9a6a1c');
        A.shape(ctx, function (c) { c.moveTo(870, 790); c.lineTo(930, 790); c.lineTo(922, 814); c.lineTo(878, 814); c.closePath(); }, '#c99a5e', 3);
        ctx.save(); ctx.strokeStyle = 'rgba(110,70,30,0.5)'; ctx.lineWidth = 1.5; for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(876 + i * 10, 792); ctx.lineTo(880 + i * 8.5, 812); ctx.stroke(); } ctx.restore();
        A.line(ctx, [908, 792, 930, 806, 960, 812], 2.5, C.pink);
      },
      tap: function () { AB.audio.sfx('pop'); AB.world.burst(900, 770, 'heart', 3); } }
  ];

  AB.registerScene({
    id: 'lighthouse', name: 'Lighthouse', music: 'harbor', ambient: 'indoor', outdoor: false, snow: false, footprints: false, aurora: false,
    map: null,
    depth: [420, 0.88, 880, 1.08],
    paint: function (ctx) {
      var x, k;
      // ---- ceiling: dark planks with beams radiating from above
      ctx.fillStyle = '#5a3a26'; ctx.fillRect(0, 0, AB.W, 140);
      ctx.save(); ctx.strokeStyle = 'rgba(30,15,5,0.35)'; ctx.lineWidth = 2;
      for (x = -400; x < 1700; x += 46) { ctx.beginPath(); ctx.moveTo(640, -260); ctx.lineTo(x, 140); ctx.stroke(); }
      ctx.restore();
      for (var bm = -3; bm <= 3; bm++) { var bx = 640 + bm * 240; A.poly(ctx, [640 + bm * 30, -40, 640 + bm * 30 + 16, -40, bx + 22, 150, bx - 6, 150], '#7a4b2c', 3); }

      // ---- curved stone wall
      ctx.save();
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (x = 0; x <= AB.W; x += 20) ctx.lineTo(x, ceilY(x));
      for (x = AB.W; x >= 0; x -= 20) ctx.lineTo(x, floorY(x) + 2);
      ctx.closePath(); ctx.fillStyle = '#c2ad97'; ctx.fill(); ctx.clip();
      var rnd = U.seeded(12), ROWS = 9;
      for (var r = 0; r < ROWS; r++) {
        var off = (r % 2) * 0.045;
        for (var a = -1.62 + off; a < 1.62; a += 0.09) {
          var x1 = 640 + R * Math.sin(a), x2 = 640 + R * Math.sin(a + 0.09);
          if (x2 < -10 || x1 > AB.W + 10) continue;
          var k1 = r / ROWS, k2 = (r + 1) / ROWS;
          ctx.beginPath();
          ctx.moveTo(x1 + 2, rowY(x1, k1) + 2); ctx.lineTo(x2 - 2, rowY(x2, k1) + 2); ctx.lineTo(x2 - 2, rowY(x2, k2) - 2); ctx.lineTo(x1 + 2, rowY(x1, k2) - 2); ctx.closePath();
          var v = rnd(), col = v < 0.3 ? '#cbb69f' : v < 0.6 ? '#bea893' : v < 0.85 ? '#b39d88' : '#d4c2ad';
          A.fs(ctx, col, 2, 'rgba(110,85,65,0.55)');
          if (rnd() < 0.3) A.highlight(ctx, (x1 + x2) / 2 - 4, rowY((x1 + x2) / 2, k1) + 8, Math.max(2, (x2 - x1) * 0.2), 2, 0.25);
        }
      }
      // light: warm in the middle, dim at the curving sides
      var lg = ctx.createLinearGradient(0, 0, AB.W, 0);
      lg.addColorStop(0, 'rgba(40,20,30,0.55)'); lg.addColorStop(0.25, 'rgba(40,20,30,0.1)'); lg.addColorStop(0.55, 'rgba(255,200,120,0.08)'); lg.addColorStop(0.82, 'rgba(255,170,80,0.12)'); lg.addColorStop(1, 'rgba(40,20,30,0.45)');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, AB.W, 720);
      // wooden wainscot along the bottom of the wall
      ctx.beginPath();
      for (x = 0; x <= AB.W; x += 20) { if (x) ctx.lineTo(x, floorY(x) - 58 * (0.55 + 0.45 * semi(x))); else ctx.moveTo(x, floorY(x) - 58 * (0.55 + 0.45 * semi(x))); }
      for (x = AB.W; x >= 0; x -= 20) ctx.lineTo(x, floorY(x) + 4);
      ctx.closePath(); A.fs(ctx, '#8d5a36', 3);
      ctx.strokeStyle = 'rgba(40,20,8,0.35)'; ctx.lineWidth = 2;
      for (var wa = -1.6; wa < 1.6; wa += 0.05) { x = 640 + R * Math.sin(wa); ctx.beginPath(); ctx.moveTo(x, floorY(x) - 58 * (0.55 + 0.45 * semi(x))); ctx.lineTo(x, floorY(x)); ctx.stroke(); }
      ctx.beginPath(); for (x = 0; x <= AB.W; x += 20) { var yy = floorY(x) - 58 * (0.55 + 0.45 * semi(x)); if (x) ctx.lineTo(x, yy); else ctx.moveTo(x, yy); } ctx.lineWidth = 7; ctx.strokeStyle = C.out; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = '#b07a4f'; ctx.stroke();
      ctx.restore();
      // ceiling + floor junction lines
      ctx.beginPath(); for (x = 0; x <= AB.W; x += 20) { if (x) ctx.lineTo(x, ceilY(x)); else ctx.moveTo(x, ceilY(x)); } A.fs(ctx, null, 3.5);
      ctx.beginPath(); for (x = 0; x <= AB.W; x += 20) { if (x) ctx.lineTo(x, ceilY(x) + 8); else ctx.moveTo(x, ceilY(x) + 8); } ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(40,20,10,0.25)'; ctx.stroke();

      // ---- floor: round wooden boards
      ctx.save();
      ctx.beginPath(); ctx.moveTo(0, AB.H);
      for (x = 0; x <= AB.W; x += 20) ctx.lineTo(x, floorY(x));
      ctx.lineTo(AB.W, AB.H); ctx.closePath();
      var fg = ctx.createLinearGradient(0, 400, 0, AB.H); fg.addColorStop(0, '#9c6a43'); fg.addColorStop(1, '#c48a5a');
      ctx.fillStyle = fg; ctx.fill(); ctx.clip();
      ctx.strokeStyle = 'rgba(60,30,10,0.22)'; ctx.lineWidth = 2;
      for (k = 0; k < 16; k++) { var fy = 400 + Math.pow(k / 16, 1.35) * 520; ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(AB.W, fy); ctx.stroke(); }
      for (var j = -14; j <= 14; j++) { ctx.beginPath(); ctx.moveTo(640 + j * 50, 400); ctx.lineTo(640 + j * 120, AB.H); ctx.stroke(); }
      var nr = U.seeded(4); for (var n = 0; n < 40; n++) { A.circle(ctx, nr() * AB.W, 430 + nr() * 470, 1.6, 'rgba(60,30,10,0.35)', 0); }
      ctx.restore();
      ctx.beginPath(); for (x = 0; x <= AB.W; x += 20) { if (x) ctx.lineTo(x, floorY(x)); else ctx.moveTo(x, floorY(x)); } A.fs(ctx, null, 3);

      // ---- round window looking at the night sea
      var w = WIN;
      A.glow(ctx, w.x, w.y, 150, 'rgba(140,190,255,', 0.18);
      A.ellipse(ctx, w.x, w.y, w.rx + 26, w.ry + 26, '#a99580', 3.5);
      for (var s2 = 0; s2 < 14; s2++) { var aa = s2 / 14 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(w.x + Math.cos(aa) * (w.rx + 4), w.y + Math.sin(aa) * (w.ry + 4)); ctx.lineTo(w.x + Math.cos(aa) * (w.rx + 26), w.y + Math.sin(aa) * (w.ry + 26)); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(80,60,45,0.6)'; ctx.stroke(); }
      A.ellipse(ctx, w.x - 6, w.y + 4, w.rx + 8, w.ry + 8, '#6e5a49', 3);
      ctx.save(); ctx.beginPath(); ctx.ellipse(w.x, w.y, w.rx, w.ry, 0, 0, Math.PI * 2); ctx.clip();
      var sg = ctx.createLinearGradient(0, w.y - w.ry, 0, w.y + w.ry);
      sg.addColorStop(0, '#1c2f66'); sg.addColorStop(0.5, '#3f5ea8'); sg.addColorStop(0.56, '#9fb3e0'); sg.addColorStop(0.58, '#284f8c'); sg.addColorStop(1, '#14325f');
      ctx.fillStyle = sg; ctx.fillRect(w.x - w.rx, w.y - w.ry, w.rx * 2, w.ry * 2);
      var str = U.seeded(8); for (var st = 0; st < 22; st++) { A.circle(ctx, w.x - w.rx + str() * w.rx * 2, w.y - w.ry + str() * w.ry, 0.8 + str() * 1.3, 'rgba(255,255,255,' + (0.5 + str() * 0.5) + ')', 0); }
      A.circle(ctx, w.x + 32, w.y - 44, 13, '#fff6d8', 0); A.circle(ctx, w.x + 38, w.y - 48, 11, '#2c4580', 0);
      A.glow(ctx, w.x + 32, w.y - 44, 34, 'rgba(255,246,216,', 0.3);
      A.shape(ctx, function (c) { c.moveTo(w.x - 80, w.y + 6); c.quadraticCurveTo(w.x - 50, w.y - 16, w.x - 20, w.y + 6); c.closePath(); }, '#5d73ad', 0);
      ctx.restore();
      // window frame + muntins
      A.ellipse(ctx, w.x, w.y, w.rx, w.ry, null, 4);
      A.line(ctx, [w.x, w.y - w.ry, w.x, w.y + w.ry], 6, C.out); A.line(ctx, [w.x, w.y - w.ry, w.x, w.y + w.ry], 3, '#6a4128');
      A.line(ctx, [w.x - w.rx, w.y, w.x + w.rx, w.y], 6, C.out); A.line(ctx, [w.x - w.rx, w.y, w.x + w.rx, w.y], 3, '#6a4128');
      A.ellipse(ctx, w.x, w.y, w.rx, w.ry, null, 6, '#6a4128'); A.ellipse(ctx, w.x, w.y, w.rx + 3, w.ry + 3, null, 2.5);
      // deep sill with a cushion + a little potted plant
      A.box(ctx, w.x - 90, w.y + w.ry + 10, 180, 16, 5, '#a99580', 3);
      A.box(ctx, w.x - 74, w.y + w.ry - 4, 120, 16, 8, '#5d8fd0', 3);
      A.line(ctx, [w.x - 60, w.y + w.ry + 4, w.x + 30, w.y + w.ry + 4], 1.5, 'rgba(255,255,255,0.6)');
      A.box(ctx, w.x + 56, w.y + w.ry - 6, 18, 18, 3, '#d9774a', 2.5); A.ellipse(ctx, w.x + 65, w.y + w.ry - 14, 12, 8, C.green, 2.5);
      // frost in the corners
      A.snowflake(ctx, w.x - 44, w.y - 48, 7, 'rgba(255,255,255,0.7)', 1.5); A.snowflake(ctx, w.x + 50, w.y + 46, 5, 'rgba(255,255,255,0.6)', 1.2);

      // ---- wall shelves of books and jars above the desk
      function plank(y) { A.box(ctx, 420, y, 200, 10, 3, C.woodLight, 2.5); A.poly(ctx, [436, y + 10, 450, y + 10, 436, y + 26], C.woodDark, 2); A.poly(ctx, [604, y + 10, 590, y + 10, 604, y + 26], C.woodDark, 2); }
      var cols = [C.red, C.blue, C.yellow, C.teal, C.purple, C.orange, C.green, C.pink], br = U.seeded(31);
      var bxx = 428; while (bxx < 520) { var bw = 9 + Math.floor(br() * 6), bh = 30 + Math.floor(br() * 14); A.box(ctx, bxx, 300 - bh, bw, bh, 2, cols[Math.floor(br() * cols.length)], 2); A.line(ctx, [bxx + 2, 300 - bh + 6, bxx + bw - 2, 300 - bh + 6], 1.3, 'rgba(255,255,255,0.7)'); bxx += bw + 1; }
      ctx.save(); ctx.translate(530, 300); ctx.rotate(0.3); A.box(ctx, -2, -38, 11, 38, 2, C.blue, 2); ctx.restore();
      A.circle(ctx, 580, 280, 18, '#6ec0f0', 2.5); ctx.save(); ctx.beginPath(); ctx.arc(580, 280, 18, 0, 7); ctx.clip(); A.ellipse(ctx, 574, 274, 9, 6, C.green, 0); A.ellipse(ctx, 588, 290, 7, 5, C.green, 0); ctx.restore(); A.circle(ctx, 580, 280, 18, null, 2.5); A.box(ctx, 572, 296, 16, 5, 2, C.woodDark, 2);
      plank(300);
      // jars on the upper shelf
      [[440, 26, 'rgba(255,200,90,0.75)', '#c58a12'], [470, 34, 'rgba(255,120,140,0.6)', C.red], [502, 22, 'rgba(255,255,255,0.55)', C.blue], [536, 30, 'rgba(160,220,120,0.65)', C.green]].forEach(function (jj) {
        A.box(ctx, jj[0] - 11, 230 - jj[1], 22, jj[1], 6, jj[2], 2.5); A.box(ctx, jj[0] - 9, 230 - jj[1] - 6, 18, 7, 2, jj[3], 2); A.highlight(ctx, jj[0] - 5, 230 - jj[1] / 2, 2, jj[1] * 0.25, 0.7);
      });
      // the sea-glass jar
      A.box(ctx, 574, 186, 28, 44, 8, 'rgba(170,240,225,0.55)', 2.5);
      [[580, 222, '#7fe3c6'], [592, 220, '#5fb3e8'], [586, 210, '#b6f28a'], [594, 206, '#7fe3c6'], [580, 200, '#9ad0ff']].forEach(function (g) { A.poly(ctx, [g[0] - 4, g[1], g[0], g[1] - 5, g[0] + 4, g[1] - 1, g[0] + 2, g[1] + 3], g[2], 1.2); });
      A.box(ctx, 576, 178, 24, 9, 3, '#c98d5a', 2); A.highlight(ctx, 580, 206, 2, 10, 0.7);
      plank(230);
      // little framed picture of the harbor boat
      ctx.save(); ctx.translate(-80, -14);
      A.box(ctx, 770, 310, 56, 46, 4, C.woodDark, 3); A.box(ctx, 776, 316, 44, 34, 2, '#bfe3ff', 2);
      A.box(ctx, 776, 336, 44, 14, 0, '#3f6fb4', 0); A.shape(ctx, function (c) { c.moveTo(784, 338); c.lineTo(812, 338); c.lineTo(808, 344); c.lineTo(788, 344); c.closePath(); }, C.red, 1.5); A.line(ctx, [798, 338, 798, 324], 1.5);
      ctx.restore();
      // life ring hanging on a peg
      A.circle(ctx, 1000, 210, 30, '#ffffff', 3); A.circle(ctx, 1000, 210, 15, '#c2ad97', 3);
      ctx.save(); ctx.beginPath(); ctx.arc(1000, 210, 30, 0, 7); ctx.arc(1000, 210, 15, 0, 7, true); ctx.clip(); ctx.fillStyle = C.red;
      [0, 1, 2, 3].forEach(function (q) { ctx.save(); ctx.translate(1000, 210); ctx.rotate(q * Math.PI / 2 + 0.4); ctx.fillRect(-8, -32, 16, 20); ctx.restore(); }); ctx.restore();
      A.circle(ctx, 1000, 210, 30, null, 3); A.circle(ctx, 1000, 210, 15, null, 3); A.circle(ctx, 1000, 176, 4, C.woodDark, 2);
      A.line(ctx, [972, 220, 960, 270, 970, 300], 2.5, '#9c7a45');

      // ---- opening in the ceiling (lens glow comes through)
      var hl = HOLE;
      A.ellipse(ctx, hl.x, hl.y, hl.rx + 10, hl.ry + 8, '#7a4b2c', 3.5);
      ctx.save(); ctx.beginPath(); ctx.ellipse(hl.x, hl.y, hl.rx, hl.ry, 0, 0, Math.PI * 2); ctx.clip();
      var hg = ctx.createRadialGradient(hl.x, hl.y - 30, 10, hl.x, hl.y, hl.rx);
      hg.addColorStop(0, '#fff6cf'); hg.addColorStop(0.5, '#ffcf6a'); hg.addColorStop(1, '#b46a2a');
      ctx.fillStyle = hg; ctx.fillRect(hl.x - hl.rx, hl.y - hl.ry, hl.rx * 2, hl.ry * 2);
      // underside of the lens: concentric brass + glass rings
      for (var ring = 5; ring >= 1; ring--) A.ellipse(ctx, hl.x, hl.y - 22, ring * 20, ring * 7, ring % 2 ? 'rgba(255,250,220,0.75)' : 'rgba(255,200,90,0.6)', 2, '#a8741f');
      A.ellipse(ctx, hl.x, hl.y - 22, 14, 5, '#ffffff', 0);
      ctx.restore();
      A.ellipse(ctx, hl.x, hl.y, hl.rx, hl.ry, null, 3.5);

      // ---- spiral staircase hugging the left wall
      var stp = [];
      for (var i = 0; i < STEPS; i++) stp.push(stepAt(i));
      // stringer under the steps
      ctx.beginPath(); ctx.moveTo(stp[0].x + stp[0].w / 2, stp[0].y + 18);
      for (i = 0; i < STEPS; i++) ctx.lineTo(stp[i].x + stp[i].w / 2 + 2, stp[i].y + 26);
      ctx.lineTo(stp[STEPS - 1].x + stp[STEPS - 1].w / 2 - 20, stp[STEPS - 1].y - 4);
      for (i = STEPS - 1; i >= 0; i--) ctx.lineTo(stp[i].x + stp[i].w / 2 - 14, stp[i].y + 4);
      ctx.closePath(); A.fs(ctx, '#5c3a22', 3);
      // shadow cast on the wall under the stairs
      ctx.save(); ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.moveTo(40, 720); for (i = 0; i < STEPS; i++) ctx.lineTo(stp[i].x + stp[i].w / 2 - 10, stp[i].y + 40); ctx.lineTo(0, 200); ctx.lineTo(0, 720); ctx.closePath(); ctx.fillStyle = '#2a1608'; ctx.fill(); ctx.restore();
      // steps (top first so lower ones overlap)
      for (i = STEPS - 1; i >= 0; i--) {
        var sp = stp[i], x0 = sp.x - sp.w / 2, x1b = sp.x + sp.w / 2;
        A.poly(ctx, [x0, sp.y - 12, x1b, sp.y - 12, x1b + 4, sp.y, x0 - 2, sp.y], C.woodLight, 2.5);
        A.box(ctx, x0 - 2, sp.y, sp.w + 6, 22, 3, C.wood, 2.5);
        ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#1d2b52'; ctx.fillRect(x1b - 20, sp.y + 1, 22, 20); ctx.restore();
        A.line(ctx, [x0 + 4, sp.y - 10, x1b - 6, sp.y - 10], 1.5, 'rgba(255,255,255,0.45)');
      }
      // balusters + handrail along the inner edge
      for (i = 0; i < STEPS; i++) { var b0 = stp[i]; A.line(ctx, [b0.x + b0.w / 2 - 6, b0.y - 10, b0.x + b0.w / 2 - 6, b0.y - 70], 5, C.out); A.line(ctx, [b0.x + b0.w / 2 - 6, b0.y - 10, b0.x + b0.w / 2 - 6, b0.y - 70], 2.5, '#d8a26f'); }
      ctx.beginPath(); for (i = 0; i < STEPS; i++) { var hx = stp[i].x + stp[i].w / 2 - 6, hy = stp[i].y - 72; if (i) ctx.lineTo(hx, hy); else ctx.moveTo(hx, hy); }
      ctx.lineWidth = 10; ctx.strokeStyle = C.out; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = '#9a5a32'; ctx.stroke();
      // newel post at the bottom
      var nb = stp[0]; A.box(ctx, nb.x + nb.w / 2 - 14, nb.y - 90, 16, 96, 3, '#7a4b2c', 3); A.circle(ctx, nb.x + nb.w / 2 - 6, nb.y - 94, 10, '#9a5a32', 3); A.highlight(ctx, nb.x + nb.w / 2 - 9, nb.y - 97, 3, 2, 0.6);
      // coiled rope + oil can at the foot of the stairs
      A.ellipse(ctx, 300, 728, 26, 10, '#d9b77e', 3); A.ellipse(ctx, 300, 726, 17, 6, null, 2, '#9c7a45'); A.ellipse(ctx, 300, 725, 8, 3, '#7d5a30', 2);
      A.box(ctx, 52, 690, 28, 34, 5, C.red, 3); A.line(ctx, [80, 700, 96, 686], 4, C.out); A.line(ctx, [80, 700, 96, 686], 2, C.red); A.ellipse(ctx, 66, 690, 14, 4, C.redDark, 2);

      // ---- braided round rug + doormat
      A.shadow(ctx, 660, 690, 250, 74, 0.15);
      [[240, 76, '#3d6fb4'], [210, 66, '#f3e3b8'], [180, 56, C.red], [150, 46, '#f3e3b8'], [118, 36, C.teal], [86, 26, '#f3e3b8'], [54, 16, C.yellow]].forEach(function (rg, ri) {
        A.ellipse(ctx, 660, 684, rg[0], rg[1], rg[2], ri ? 2 : 3, ri ? 'rgba(38,50,77,0.35)' : C.out);
      });
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      [225, 165, 102].forEach(function (rr) { ctx.beginPath(); ctx.ellipse(660, 684, rr, rr * 0.32, 0, 0, Math.PI * 2); ctx.stroke(); }); ctx.restore();
      K.exitMat(ctx, 640, 862);
      ctx.save(); ctx.strokeStyle = 'rgba(255,230,190,0.45)'; ctx.lineWidth = 2;
      for (var mk = -3; mk <= 3; mk++) { ctx.beginPath(); ctx.moveTo(640 + mk * 18, 850); ctx.lineTo(640 + mk * 18, 874); ctx.stroke(); } ctx.restore();
      // a sliver of the door frame at the very bottom
      A.box(ctx, 560, 892, 160, 20, 4, '#6a4128', 3);

      // warm vignette
      var vg = ctx.createRadialGradient(700, 560, 260, 700, 560, 920);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(30,15,30,0.45)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, AB.W, AB.H);
    },
    animate: function (ctx, t) {
      var w = WIN, hl = HOLE;
      // ---- the sea outside the window
      ctx.save(); ctx.beginPath(); ctx.ellipse(w.x, w.y, w.rx - 2, w.ry - 2, 0, 0, Math.PI * 2); ctx.clip();
      for (var s = 0; s < 6; s++) { var sx = w.x - w.rx + ((s * 47) % (w.rx * 2)), sy = w.y - w.ry + ((s * 29) % 40) + 6; A.sparkle(ctx, sx, sy, 2.5, 0.3 + 0.7 * Math.abs(Math.sin(t * 1.7 + s * 2))); }
      // aurora ribbon
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); for (var a = 0; a <= 10; a++) { var ax = w.x - w.rx + a * w.rx / 5, ay = w.y - 40 + Math.sin(a * 0.8 + t * 0.6) * 8; if (a) ctx.lineTo(ax, ay); else ctx.moveTo(ax, ay); }
      for (a = 10; a >= 0; a--) ctx.lineTo(w.x - w.rx + a * w.rx / 5, w.y - 10 + Math.sin(a * 0.8 + t * 0.6 + 0.5) * 6);
      ctx.closePath(); var ag = ctx.createLinearGradient(0, w.y - 50, 0, w.y); ag.addColorStop(0, 'rgba(90,255,180,0)'); ag.addColorStop(0.5, 'rgba(90,255,180,' + (0.22 + 0.08 * Math.sin(t)) + ')'); ag.addColorStop(1, 'rgba(90,255,180,0)'); ctx.fillStyle = ag; ctx.fill();
      ctx.restore();
      // waves
      ctx.strokeStyle = 'rgba(200,230,255,0.55)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      for (var wv = 0; wv < 12; wv++) { var wy = w.y + 10 + (wv * 13) % 64, wx = w.x - w.rx + ((wv * 41 + t * (8 + wv)) % (w.rx * 2 + 20)) - 10, ww = 5 + (wy - w.y) * 0.18; ctx.beginPath(); ctx.moveTo(wx - ww, wy); ctx.quadraticCurveTo(wx, wy - 3, wx + ww, wy); ctx.stroke(); }
      // drifting floe
      var fx = w.x - w.rx - 30 + ((t * 6) % (w.rx * 2 + 60));
      A.poly(ctx, [fx - 14, w.y + 22, fx - 6, w.y + 18, fx + 12, w.y + 18, fx + 16, w.y + 23, fx - 10, w.y + 25], '#e9f4ff', 1.5, '#3d5c8e');
      // the lighthouse beam sweeping over the water
      var bp = (t * 0.9 / (Math.PI * 2)) % 1, bx = w.x - w.rx * 2 + bp * w.rx * 4;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var bg = ctx.createLinearGradient(bx - 40, 0, bx + 40, 0); bg.addColorStop(0, 'rgba(255,240,170,0)'); bg.addColorStop(0.5, 'rgba(255,240,170,0.28)'); bg.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(bx - 10, w.y - w.ry); ctx.lineTo(bx + 10, w.y - w.ry); ctx.lineTo(bx + 50, w.y + w.ry); ctx.lineTo(bx - 50, w.y + w.ry); ctx.closePath(); ctx.fill();
      ctx.restore();
      // shooting star after a look through the telescope
      var sk = (t - scopeT) / 1.2;
      if (sk >= 0 && sk < 1) { var ssx = w.x + 50 - sk * 110, ssy = w.y - 60 + sk * 40; ctx.strokeStyle = 'rgba(255,255,255,' + (1 - sk) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ssx, ssy); ctx.lineTo(ssx + 30, ssy - 11); ctx.stroke(); A.sparkle(ctx, ssx, ssy, 7, 1 - sk); }
      ctx.restore();
      // window glass glint
      ctx.save(); ctx.globalAlpha = 0.18; A.ellipse(ctx, w.x - 30, w.y - 34, 16, 34, '#ffffff', 0, null, 0.5); ctx.restore();

      // ---- great lens turning above the opening
      var pulse = U.clamp(lensPulse - t, 0, 1.6) / 1.6;
      ctx.save(); ctx.beginPath(); ctx.ellipse(hl.x, hl.y, hl.rx - 2, hl.ry - 2, 0, 0, Math.PI * 2); ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      for (var b = 0; b < 4; b++) { var px = hl.x - hl.rx + (((t * 22) + b * 60) % (hl.rx * 2)); ctx.fillStyle = 'rgba(255,250,220,' + (0.25 + pulse * 0.4) + ')'; ctx.fillRect(px, hl.y - hl.ry, 12, hl.ry * 2); }
      ctx.restore();
      // light falling down from the lens (soft shafts + dust)
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var la = 0.13 + 0.04 * Math.sin(t * 1.3) + pulse * 0.25;
      var lg = ctx.createLinearGradient(0, hl.y, 0, 620); lg.addColorStop(0, 'rgba(255,220,140,' + la + ')'); lg.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(hl.x - hl.rx + 20, hl.y + 10); ctx.lineTo(hl.x + hl.rx - 20, hl.y + 10); ctx.lineTo(hl.x + 190, 620); ctx.lineTo(hl.x - 150, 620); ctx.closePath(); ctx.fill();
      for (var d = 0; d < 12; d++) { var dp = ((t * 0.05 + d / 12) % 1), dx = hl.x - 80 + ((d * 53) % 200) + Math.sin(t * 0.7 + d) * 14 + dp * 30, dy = hl.y + 30 + dp * 480; A.circle(ctx, dx, dy, 1.6, 'rgba(255,240,200,' + (0.5 * Math.sin(dp * Math.PI)) + ')', 0); }
      A.glow(ctx, hl.x, hl.y, 150 + pulse * 80, 'rgba(255,220,140,', 0.25 + pulse * 0.35);
      ctx.restore();
    },
    walk: [[30, 560], [200, 552], [330, 506], [460, 470], [640, 456], [820, 466], [960, 496], [1090, 536], [1250, 590], [1255, 880], [720, 880], [720, 900], [560, 900], [560, 880], [30, 880]],
    blocks: [
      { p: [[20, 540], [340, 456], [312, 530], [282, 610], [240, 700], [200, 764], [20, 764]] },
      { e: [300, 728, 30, 12] }, { e: [66, 708, 30, 20] },
      { e: [520, 482, 112, 22] }, { e: [1012, 510, 44, 14] }, { e: [1172, 598, 64, 20] },
      { e: [1050, 760, 96, 24] }, { e: [958, 774, 26, 10] }, { e: [1154, 770, 26, 10] }, { e: [900, 806, 34, 10] }
    ],
    spawns: { 'default': [640, 770], harbor: [640, 770] },
    hotspots: [
      { id: 'exit', hit: [550, 800, 180, 100], at: [640, 866], icon: 'door', badge: [640, 834], action: function () { AB.audio.sfx('door'); AB.go('harbor', 'lighthouse'); } }
    ],
    props: PROPS,
    npcSpots: { bramble: { at: [664, 528], wander: null, dir: -1 } },
    questSpots: {}
  });
})();
