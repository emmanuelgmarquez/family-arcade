/* Frozen Lake — a wide, glassy lake west of town: skating, ice fishing and secrets under the ice. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C, K = AB.kit;

  // ---------------------------------------------------------------- the ice
  var ICE_PTS = [[130, 478], [205, 424], [330, 396], [520, 382], [720, 380], [900, 390], [1040, 416], [1118, 472], [1130, 560], [1090, 650],
    [990, 720], [820, 760], [620, 774], [420, 764], [262, 734], [150, 680], [98, 594], [98, 526]];
  // smoothed outline (quadratic curves through midpoints), sampled so the hit test matches the painted ice
  var ICE = (function () {
    var out = [], n = ICE_PTS.length;
    for (var i = 0; i < n; i++) {
      var p0 = ICE_PTS[(i + n - 1) % n], p1 = ICE_PTS[i], p2 = ICE_PTS[(i + 1) % n];
      var ax = (p0[0] + p1[0]) / 2, ay = (p0[1] + p1[1]) / 2, bx = (p1[0] + p2[0]) / 2, by = (p1[1] + p2[1]) / 2;
      for (var k = 0; k < 8; k++) {
        var t = k / 8, u = 1 - t;
        out.push([u * u * ax + 2 * u * t * p1[0] + t * t * bx, u * u * ay + 2 * u * t * p1[1] + t * t * by]);
      }
    }
    return out;
  })();
  function icePath(ctx) { ctx.beginPath(); ctx.moveTo(ICE[0][0], ICE[0][1]); for (var i = 1; i < ICE.length; i++) ctx.lineTo(ICE[i][0], ICE[i][1]); ctx.closePath(); }
  function onIce(x, y) { return U.pointInPoly(x, y, ICE); }

  // fixed spots
  var HOLE = [418, 548];        // ice-fishing hole beside the hut
  var PEEK = [880, 540];        // the peek hole where fish jump out
  var swim = null, nextSwim = -1, peek = null, sculptGlint = 0, snowmanHop = 0;

  // ---------------------------------------------------------------- props
  function pine(x, y, h, opts) {
    opts = opts || {};
    var shake = { until: 0 };
    return {
      x: x, y: y, hit: [x - h * 0.33, y - h, h * 0.66, h], at: opts.at || [x + (x < 640 ? 70 : -70), y + 30],
      draw: function (ctx, t) {
        ctx.save();
        if (t < shake.until) { ctx.translate(x, y); ctx.rotate(Math.sin(t * 40) * 0.03); ctx.translate(-x, -y); }
        A.pine(ctx, x, y, h); ctx.restore();
      },
      tap: function () {
        shake.until = AB.world.t + 0.5; AB.audio.sfx('snow');
        for (var i = 0; i < 18; i++) AB.world.particles.push({ k: 'snow', x: x + U.rand(-h * 0.3, h * 0.3), y: y - h * U.rand(0.3, 0.9), vx: U.rand(-30, 30), vy: U.rand(-40, 40), t: 0, life: U.rand(0.8, 1.4), r: U.rand(3, 7) });
      }
    };
  }

  /** The big frosty tree where Dot's scarf got stuck. Sorted early so the quest's scarf draws on top of its branches. */
  function scarfTree(x, y) {
    var shake = { until: 0 };
    var clusters = [[-70, -120, 44], [62, -128, 46], [-30, -170, 50], [36, -182, 48], [0, -232, 46], [-88, -168, 34], [86, -176, 34], [0, -128, 40]];
    return {
      x: x, y: y - 135, hit: [x - 105, y - 268, 165, 255], at: [x + 64, y + 30],
      draw: function (ctx, t) {
        ctx.save();
        if (t < shake.until) { ctx.translate(x, y); ctx.rotate(Math.sin(t * 38) * 0.035); ctx.translate(-x, -y); }
        A.shadow(ctx, x + 14, y + 4, 92, 16, 0.24);
        // trunk + branches
        A.shape(ctx, function (c) { c.moveTo(x - 16, y + 2); c.quadraticCurveTo(x - 10, y - 60, x - 12, y - 110); c.lineTo(x + 12, y - 110); c.quadraticCurveTo(x + 10, y - 60, x + 18, y + 2); c.closePath(); }, C.woodDark, 3);
        A.line(ctx, [x - 4, y - 90, x - 52, y - 130], 9, C.out); A.line(ctx, [x - 4, y - 90, x - 52, y - 130], 5, C.woodDark);
        A.line(ctx, [x + 4, y - 96, x + 50, y - 140], 9, C.out); A.line(ctx, [x + 4, y - 96, x + 50, y - 140], 5, C.woodDark);
        ctx.save(); ctx.globalAlpha = 0.3; A.box(ctx, x + 2, y - 108, 10, 108, 4, '#3d2312', 0); ctx.restore();
        // frosted crown
        clusters.forEach(function (cl, i) {
          var cx = x + cl[0], cy = y + cl[1], r = cl[2];
          A.circle(ctx, cx, cy, r, i % 2 ? '#3f8f7c' : '#327a6b', 3);
          ctx.save(); ctx.globalAlpha = 0.22; A.ellipse(ctx, cx + r * 0.35, cy + r * 0.25, r * 0.6, r * 0.55, '#0e3a30', 0); ctx.restore();
          A.shape(ctx, function (c) { c.moveTo(cx - r * 0.86, cy - r * 0.32); c.quadraticCurveTo(cx, cy - r * 1.3, cx + r * 0.86, cy - r * 0.32); c.quadraticCurveTo(cx + r * 0.4, cy - r * 0.12, cx + r * 0.1, cy - r * 0.3); c.quadraticCurveTo(cx - r * 0.3, cy - r * 0.05, cx - r * 0.86, cy - r * 0.32); c.closePath(); }, C.snow, 2);
        });
        // frost sparkles
        for (var s = 0; s < 4; s++) A.sparkle(ctx, x - 60 + s * 40, y - 230 + (s % 2) * 70, 5, 0.4 + 0.4 * Math.sin(t * 3 + s * 1.7));
        ctx.restore();
      },
      tap: function () {
        shake.until = AB.world.t + 0.6; AB.audio.sfx('snow');
        for (var i = 0; i < 24; i++) AB.world.particles.push({ k: 'snow', x: x + U.rand(-90, 90), y: y - U.rand(110, 250), vx: U.rand(-30, 30), vy: U.rand(-40, 30), t: 0, life: U.rand(0.8, 1.5), r: U.rand(3, 7) });
        AB.quests.event('tap', 'scarfTree');
      }
    };
  }

  function lamp(x, y) { return { x: x, y: y, draw: function (ctx, t) { A.lampPost(ctx, x, y, 110, t); } }; }

  function logBench(x, y) {
    return {
      x: x, y: y, hit: [x - 80, y - 60, 160, 70], at: [x, y + 8],
      draw: function (ctx) {
        A.shadow(ctx, x, y + 3, 84, 10);
        A.box(ctx, x - 66, y - 12, 14, 14, 3, C.woodDark, 2.5); A.box(ctx, x + 52, y - 12, 14, 14, 3, C.woodDark, 2.5);
        A.box(ctx, x - 76, y - 40, 152, 30, 15, C.wood, 3);
        ctx.save(); ctx.globalAlpha = 0.25; A.box(ctx, x - 70, y - 22, 140, 10, 5, '#5a2f16', 0); ctx.restore();
        A.ellipse(ctx, x + 76, y - 25, 9, 14, C.woodLight, 3);
        A.ellipse(ctx, x + 76, y - 25, 4, 7, null, 2, 'rgba(90,50,20,0.6)');
        A.line(ctx, [x - 40, y - 30, x - 10, y - 30], 2, 'rgba(90,50,20,0.45)'); A.line(ctx, [x + 10, y - 22, x + 40, y - 22], 2, 'rgba(90,50,20,0.45)');
        A.shape(ctx, function (c) { c.moveTo(x - 72, y - 36); c.quadraticCurveTo(x - 30, y - 56, x + 20, y - 44); c.quadraticCurveTo(x + 50, y - 50, x + 70, y - 36); c.quadraticCurveTo(x, y - 34, x - 72, y - 36); c.closePath(); }, C.snow, 2);
      },
      tap: function () { var p = AB.world.player; p.x = x; p.y = y + 2; p.dir = 1; p.pose = 'sit'; p.poseUntil = AB.world.t + 6; AB.audio.sfx('soft'); }
    };
  }

  var HUT = { x: 300, y: 505 };
  var hutProp = {
    x: HUT.x, y: HUT.y,
    draw: function (ctx, t) {
      var x = HUT.x, y = HUT.y, w = 138, h = 92, L = x - w / 2;
      A.shadow(ctx, x + 6, y + 4, 92, 14, 0.25);
      A.box(ctx, L, y - h, w, h, 5, '#c27b49', 3.5);
      ctx.save(); ctx.beginPath(); A.rrect(ctx, L, y - h, w, h, 5); ctx.clip();
      ctx.strokeStyle = 'rgba(80,40,15,0.35)'; ctx.lineWidth = 2;
      for (var xx = L + 17; xx < L + w; xx += 17) { ctx.beginPath(); ctx.moveTo(xx, y - h); ctx.lineTo(xx, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(20,30,70,0.15)'; ctx.fillRect(x + w * 0.18, y - h, w, h);
      ctx.restore();
      // doorway with warm light and a curtain
      A.box(ctx, x - 52, y - 72, 48, 72, 6, C.woodDark, 3);
      var g = ctx.createLinearGradient(0, y - 66, 0, y); g.addColorStop(0, '#ffe39a'); g.addColorStop(1, '#ff9f45');
      A.box(ctx, x - 46, y - 66, 36, 66, 4, g, 2.5);
      A.shape(ctx, function (c) { c.moveTo(x - 46, y - 66); c.lineTo(x - 22, y - 66); c.quadraticCurveTo(x - 30, y - 30, x - 40, y); c.lineTo(x - 46, y); c.closePath(); }, C.red, 2.5);
      // round window
      A.window(ctx, x + 22, y - 74, 36, 36, { round: true });
      // fish plaque
      A.box(ctx, x + 14, y - 30, 52, 22, 8, C.cream, 2.5);
      AB.icons.draw(ctx, 'fish', x + 40, y - 19, 20, C.teal);
      // roof
      K.roof(ctx, L, y - h, w, 46, '#3d6a8c', 16);
      // stove pipe
      A.box(ctx, x + 34, y - h - 60, 14, 40, 2, '#5b6684', 2.5); A.box(ctx, x + 30, y - h - 66, 22, 8, 2, '#4a5470', 2.5);
      // hanging lantern
      var fl = 0.8 + 0.2 * Math.sin(t * 7) * Math.sin(t * 3.1);
      A.glow(ctx, x - 64, y - 64, 46, 'rgba(255,200,110,', 0.45 * fl);
      A.line(ctx, [x - 70, y - 92, x - 64, y - 80], 2);
      A.box(ctx, x - 71, y - 80, 14, 18, 4, '#ffe7a3', 2.5); A.poly(ctx, [x - 73, y - 80, x - 55, y - 80, x - 64, y - 88], '#3c4a6b', 2);
      // rods leaning on the wall, a bucket of fish
      A.line(ctx, [x + 66, y - 4, x + 86, y - 110], 3, C.woodDark); A.line(ctx, [x + 74, y - 2, x + 98, y - 100], 3, '#3c4a6b');
      A.line(ctx, [x + 98, y - 100, x + 104, y - 72], 1.2, 'rgba(38,50,77,0.7)');
      A.fish(ctx, x + 78, y - 22, 0.35, 'sunny', 0); A.fish(ctx, x + 90, y - 18, 0.32, 'bluegill', 0);
      A.shape(ctx, function (c) { c.moveTo(x + 68, y - 18); c.lineTo(x + 100, y - 18); c.lineTo(x + 96, y + 2); c.lineTo(x + 72, y + 2); c.closePath(); }, '#8d96ad', 2.5);
      A.ellipse(ctx, x + 84, y - 18, 16, 4, '#6c7894', 2);
    }
  };
  var holeProp = {
    x: HOLE[0], y: HOLE[1] - 4,
    draw: function (ctx, t) { drawHole(ctx, HOLE[0], HOLE[1], 30, t); }
  };
  var stoolProp = {
    x: HOLE[0] - 52, y: HOLE[1] + 6,
    draw: function (ctx) {
      var x = HOLE[0] - 52, y = HOLE[1] + 6;
      A.shadow(ctx, x, y + 2, 18, 5);
      A.line(ctx, [x - 10, y, x - 4, y - 22], 4, C.woodDark); A.line(ctx, [x + 10, y, x + 4, y - 22], 4, C.woodDark); A.line(ctx, [x, y + 2, x, y - 22], 4, C.woodDark);
      A.ellipse(ctx, x, y - 24, 17, 6, C.wood, 2.5); A.ellipse(ctx, x - 3, y - 27, 9, 3, C.snow, 1.5);
    }
  };
  function drawHole(ctx, x, y, r, t) {
    A.ellipse(ctx, x, y, r + 8, (r + 8) * 0.38, '#eef8ff', 2.5, '#8fb8dd');
    var g = ctx.createLinearGradient(0, y - r * 0.35, 0, y + r * 0.35); g.addColorStop(0, C.waterDeep); g.addColorStop(1, C.water);
    A.ellipse(ctx, x, y + 1, r, r * 0.32, g, 2.5);
    var k = (t * 0.6) % 1;
    ctx.save(); ctx.strokeStyle = 'rgba(190,230,255,' + (0.7 * (1 - k)) + ')'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(x, y + 1, r * 0.25 + k * r * 0.65, (r * 0.25 + k * r * 0.65) * 0.3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    A.ellipse(ctx, x - r * 0.4, y - r * 0.05, r * 0.25, 2.2, 'rgba(255,255,255,0.55)', 0);
  }
  var peekProp = {
    x: PEEK[0], y: PEEK[1], hit: [PEEK[0] - 55, PEEK[1] - 70, 110, 90], at: [PEEK[0], PEEK[1] + 42],
    draw: function (ctx, t) {
      var x = PEEK[0], y = PEEK[1];
      drawHole(ctx, x, y, 26, t * 0.8);
      // little ice chunks around
      A.poly(ctx, [x + 34, y - 4, x + 46, y - 10, x + 50, y - 2, x + 40, y + 3], '#e6f6ff', 2, '#8fb8dd');
      A.poly(ctx, [x - 42, y + 6, x - 32, y + 2, x - 30, y + 9], '#e6f6ff', 2, '#8fb8dd');
      if (!peek) return;
      var dt = t - peek.t;
      if (dt < 0 || dt > 2.2) return;
      // bubbles
      for (var i = 0; i < 6; i++) {
        var bk = (dt * 1.6 + i / 6) % 1;
        if (dt > 1.6) break;
        var bx = x + Math.sin(i * 2.3 + dt * 6) * 12, by = y - bk * 46, br = 3 + (i % 3) * 1.6;
        ctx.save(); ctx.globalAlpha = 1 - bk; A.circle(ctx, bx, by, br, 'rgba(220,245,255,0.6)', 1.6, '#7fb2d8'); A.circle(ctx, bx - br * 0.35, by - br * 0.35, br * 0.3, '#fff', 0); ctx.restore();
      }
      // the fish leaps out and dives back in
      var k = (dt - 0.35) / 1.0;
      if (k > 0 && k < 1) {
        var fx = x - 70 * peek.dir + k * 140 * peek.dir, fy = y - 4 - Math.sin(k * Math.PI) * 150;
        var ang = Math.atan2(-Math.cos(k * Math.PI) * 150 * Math.PI, 140);
        ctx.save(); ctx.translate(fx, fy); ctx.scale(peek.dir, 1); ctx.rotate(ang);
        A.fish(ctx, 0, 0, 0.9, peek.kind, t); ctx.restore();
        // water drips trailing
        for (var d = 1; d < 4; d++) { var kk = Math.max(0, k - d * 0.06); A.circle(ctx, x - 70 * peek.dir + kk * 140 * peek.dir, y - 4 - Math.sin(kk * Math.PI) * 150 + 10, 3 - d * 0.6, '#bfe8f6', 1.2, '#7fb2d8'); }
      }
      // splash rings
      [0.35, 1.35].forEach(function (s) {
        var sk = (dt - s) / 0.6; if (sk < 0 || sk > 1) return;
        var sx = s < 1 ? x - 10 * peek.dir : x + 10 * peek.dir;
        ctx.save(); ctx.globalAlpha = 1 - sk;
        for (var j = 0; j < 5; j++) { var a = -Math.PI * (0.15 + j * 0.175); A.circle(ctx, sx + Math.cos(a) * sk * 34, y - 4 + Math.sin(a) * sk * 40 + sk * sk * 30, 3.5, '#dff3ff', 1.5, '#7fb2d8'); }
        ctx.restore();
      });
    },
    tap: function () {
      if (peek && AB.world.t - peek.t < 1.8) return;
      peek = { t: AB.world.t, kind: U.pick(['sunny', 'bluegill', 'rosy', 'mint', 'gold']), dir: Math.random() < 0.5 ? 1 : -1, landed: false };
      AB.audio.sfx('pop');
      setTimeout(function () { AB.audio.sfx('splash'); }, 350);
      AB.quests.revealGem('gem_lake_1', PEEK[0] + 70, PEEK[1] + 34);
    }
  };

  var SN = [800, 832];
  var snowmanProp = {
    x: SN[0], y: SN[1], hit: [SN[0] - 48, SN[1] - 150, 110, 160], at: [SN[0] - 80, SN[1] + 18],
    draw: function (ctx, t) {
      var x = SN[0], y = SN[1], hop = Math.max(0, snowmanHop - t);
      ctx.save(); ctx.translate(0, -Math.abs(Math.sin(hop * 12)) * hop * 30);
      A.shadow(ctx, x, y + 2, 44, 10);
      A.circle(ctx, x, y - 32, 34, '#fff', 3); A.circle(ctx, x, y - 84, 25, '#fff', 3); A.circle(ctx, x, y - 122, 19, '#fff', 3);
      ctx.save(); ctx.globalAlpha = 0.5; A.ellipse(ctx, x + 14, y - 26, 16, 22, C.snowShade, 0); ctx.restore();
      A.circle(ctx, x - 7, y - 127, 2.6, C.out, 0); A.circle(ctx, x + 7, y - 127, 2.6, C.out, 0);
      A.poly(ctx, [x, y - 120, x + 22, y - 116, x, y - 113], C.orange, 1.5);
      A.line(ctx, [x - 7, y - 110, x, y - 107, x + 7, y - 110], 2);
      // knitted hat with pompom
      A.shape(ctx, function (c) { c.moveTo(x - 20, y - 132); c.quadraticCurveTo(x - 18, y - 160, x, y - 160); c.quadraticCurveTo(x + 18, y - 160, x + 20, y - 132); c.closePath(); }, C.teal, 2.5);
      A.box(ctx, x - 22, y - 138, 44, 9, 4, '#fff', 2.2); A.circle(ctx, x, y - 162, 6, '#fff', 2);
      A.circle(ctx, x, y - 84, 3, C.out, 0); A.circle(ctx, x, y - 70, 3, C.out, 0);
      // stick arm holding a fishing rod, with a little fish on the line
      A.line(ctx, [x - 24, y - 86, x - 50, y - 100], 3, C.woodDark);
      A.line(ctx, [x + 24, y - 86, x + 46, y - 96], 3, C.woodDark);
      A.line(ctx, [x + 40, y - 80, x + 80, y - 150], 3.5, '#3c4a6b');
      var sw = Math.sin(t * 2) * 6;
      A.line(ctx, [x + 80, y - 150, x + 84 + sw, y - 96], 1.3, 'rgba(38,50,77,0.8)');
      ctx.save(); ctx.translate(x + 84 + sw, y - 86); ctx.rotate(Math.PI / 2 + sw * 0.03); A.fish(ctx, 0, 0, 0.34, 'rosy', t * 0.5); ctx.restore();
      ctx.restore();
    },
    tap: function () { snowmanHop = AB.world.t + 0.8; AB.audio.sfx('jump'); AB.world.burst(SN[0], SN[1] - 90, 'snow', 8); }
  };

  var SC = [214, 806];
  var sculptureProp = {
    x: SC[0], y: SC[1], hit: [SC[0] - 60, SC[1] - 170, 120, 180], at: [SC[0] + 90, SC[1] + 20],
    draw: function (ctx, t) {
      var x = SC[0], y = SC[1];
      A.shadow(ctx, x, y + 2, 52, 10);
      // snow pedestal
      A.box(ctx, x - 42, y - 34, 84, 36, 8, '#f4f8ff', 3); A.ellipse(ctx, x, y - 34, 46, 9, '#fff', 2.5);
      ctx.save(); ctx.globalAlpha = 0.5; A.box(ctx, x + 10, y - 30, 30, 30, 6, C.snowShade, 0); ctx.restore();
      // a leaping ice narwhal
      ctx.save(); ctx.translate(x, y - 40);
      var ice = 'rgba(175,225,248,0.92)';
      A.shape(ctx, function (c) {
        c.moveTo(-34, 0); c.bezierCurveTo(-46, -40, -30, -90, 4, -108); c.bezierCurveTo(26, -118, 40, -100, 30, -82);
        c.bezierCurveTo(20, -60, 10, -36, 18, 0); c.closePath();
      }, ice, 3, '#4f86b8');
      A.line(ctx, [20, -104, 58, -150], 4, '#4f86b8'); A.line(ctx, [20, -104, 58, -150], 2, '#e9fbff');
      A.shape(ctx, function (c) { c.moveTo(-34, 0); c.lineTo(-58, 12); c.lineTo(-40, -8); c.lineTo(-48, -26); c.closePath(); }, ice, 2.5, '#4f86b8');
      A.circle(ctx, 14, -92, 3, '#2f5f92', 0);
      A.highlight(ctx, -18, -60, 5, 20, 0.7);
      ctx.restore();
      var gl = Math.max(0, sculptGlint - t);
      if (gl > 0) {
        ctx.save(); ctx.globalAlpha = gl; A.glow(ctx, x, y - 100, 90, 'rgba(180,240,255,', 0.6); ctx.restore();
        for (var i = 0; i < 5; i++) A.sparkle(ctx, x - 40 + i * 22, y - 60 - ((i * 37 + (1.5 - gl) * 140) % 120), 7, gl);
      } else A.sparkle(ctx, x + 18, y - 150, 6, 0.4 + 0.5 * Math.sin(t * 3));
    },
    tap: function () { sculptGlint = AB.world.t + 1.5; AB.audio.sfx('sparkle'); AB.world.burst(SC[0], SC[1] - 110, 'sparkle', 8); AB.quests.revealGem('gem_lake_2', SC[0] + 84, SC[1] + 44); }
  };

  // ---------------------------------------------------------------- swimmers under the ice
  function updateSwim(t) {
    if (nextSwim < 0 || (swim && t < swim.t0) || (!swim && nextSwim - t > 40)) { swim = null; nextSwim = t + U.rand(4, 8); }
    if (!swim && t >= nextSwim) swim = { kind: U.pick(['school', 'seal', 'narwhal']), t0: t, dur: U.rand(8, 11), dir: Math.random() < 0.5 ? 1 : -1, y: U.rand(470, 690) };
    if (swim && t > swim.t0 + swim.dur) { swim = null; nextSwim = t + U.rand(15, 25); }
  }
  function drawSwim(ctx, t) {
    if (!swim) return;
    var k = (t - swim.t0) / swim.dur, d = swim.dir;
    var x = d > 0 ? U.lerp(40, 1200, k) : U.lerp(1200, 40, k), y = swim.y + Math.sin(k * 7) * 16;
    var a = 0.3 * Math.min(1, k * 6, (1 - k) * 6);
    ctx.save(); icePath(ctx); ctx.clip();
    ctx.globalAlpha = a; ctx.fillStyle = '#163a66';
    ctx.translate(x, y); ctx.scale(d, 1);
    if (swim.kind === 'school') {
      for (var i = 0; i < 8; i++) {
        var fx = -((i * 37) % 90) + 20, fy = ((i * 53) % 60) - 30, w = Math.sin(t * 12 + i) * 0.3;
        ctx.save(); ctx.translate(fx + Math.sin(t * 2 + i) * 6, fy); ctx.scale(1, 0.55);
        ctx.beginPath(); ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-22, -7 + w * 10); ctx.lineTo(-22, 7 + w * 10); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    } else {
      ctx.scale(1, 0.5);
      var tail = Math.sin(t * 5) * 8;
      ctx.beginPath(); ctx.ellipse(0, 0, swim.kind === 'seal' ? 66 : 78, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-96, -20 + tail); ctx.lineTo(-86, 0); ctx.lineTo(-96, 20 + tail); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-4, 26, 22, 9, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-4, -26, 22, 9, -0.5, 0, Math.PI * 2); ctx.fill();
      if (swim.kind === 'seal') { ctx.beginPath(); ctx.arc(62, 0, 22, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.lineWidth = 5; ctx.strokeStyle = '#163a66'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(74, 0); ctx.lineTo(150, -4); ctx.stroke(); }
    }
    ctx.restore();
    // a few bubbles rise up where it passes
    ctx.save(); icePath(ctx); ctx.clip();
    for (var b = 0; b < 3; b++) {
      var bk = (t * 0.9 + b / 3) % 1, bx = x - d * (30 + b * 30), by = y - 20 - bk * 16;
      ctx.globalAlpha = a * 1.6 * (1 - bk); A.circle(ctx, bx, by, 3 + b, 'rgba(255,255,255,0.7)', 0);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- painting helpers
  function reeds(ctx, x, y, n, seed) {
    var r = U.seeded(seed);
    for (var i = 0; i < n; i++) {
      var rx = x + (i - n / 2) * 8 + r() * 4, h = 34 + r() * 26, lean = (r() - 0.5) * 12;
      A.line(ctx, [rx, y, rx + lean, y - h], 3, '#8a6a3c');
      if (i % 2 === 0) { A.ellipse(ctx, rx + lean, y - h + 6, 4, 9, '#7a4a28', 1.8, C.out); A.ellipse(ctx, rx + lean, y - h - 1, 4, 3, C.snow, 0); }
    }
    A.ellipse(ctx, x, y, n * 5 + 8, 6, C.snow, 2, C.snowDeep);
  }
  function farCabin(ctx, x, y) {
    A.box(ctx, x - 24, y - 26, 48, 26, 3, '#a2603f', 2.5);
    A.poly(ctx, [x - 32, y - 24, x + 32, y - 24, x + 22, y - 44, x - 22, y - 44], '#b73b3b', 2.5);
    A.shape(ctx, function (c) { c.moveTo(x - 34, y - 24); c.quadraticCurveTo(x, y - 34, x + 34, y - 24); c.lineTo(x + 24, y - 46); c.quadraticCurveTo(x, y - 52, x - 24, y - 46); c.closePath(); }, '#fff', 2);
    A.box(ctx, x + 10, y - 58, 8, 16, 1, '#8a4b38', 2);
    A.glow(ctx, x - 8, y - 14, 22, C.lampGlow, 0.5);
    A.box(ctx, x - 14, y - 20, 12, 11, 2, '#ffd37a', 2);
    A.box(ctx, x + 4, y - 18, 10, 18, 2, C.woodDark, 2);
  }

  // ---------------------------------------------------------------- scene
  AB.registerScene({
    id: 'lake', name: 'Frozen Lake', music: 'lake', ambient: 'wind', outdoor: true, snow: true, footprints: true, aurora: true,
    map: { x: 240, y: 330, icon: 'fish' },
    depth: [350, 0.66, 880, 1.06],
    paint: function (ctx) {
      K.skyAndMountains(ctx, 205, 21);
      K.treeline(ctx, 270, 23, 34, 30, 62);
      K.snowGround(ctx, 258);
      // far shore: soft drifts, a little cabin, a row of pines
      A.drift(ctx, 140, 300, 360, 50, '#eef3ff'); A.drift(ctx, 1110, 305, 380, 56, '#eef3ff'); A.drift(ctx, 640, 290, 300, 28, '#eef3ff');
      farCabin(ctx, 920, 318);
      [[420, 330, 70], [470, 338, 56], [560, 326, 64], [760, 334, 60], [1040, 340, 84], [1090, 336, 64], [360, 344, 58], [640, 336, 50], [1210, 352, 96], [20, 372, 110], [1260, 380, 120]].forEach(function (p) { A.pine(ctx, p[0], p[1], p[2]); });
      // shore path from town
      K.path(ctx, [[1300, 640, 90], [1180, 660, 96], [1060, 760, 100], [900, 860, 110], [760, 920, 120]]);
      // ice: snowy rim, then the glassy sheet
      ctx.save(); icePath(ctx); ctx.lineWidth = 30; ctx.strokeStyle = '#ffffff'; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = C.snowDeep; ctx.save(); ctx.translate(0, 14); ctx.restore(); ctx.restore();
      var g = ctx.createLinearGradient(0, 380, 0, 775);
      g.addColorStop(0, '#d7eefa'); g.addColorStop(0.18, '#a9d8ef'); g.addColorStop(0.6, '#8ccbe8'); g.addColorStop(1, '#bfe6f6');
      icePath(ctx); ctx.fillStyle = g; ctx.fill();
      ctx.save(); icePath(ctx); ctx.clip();
      // deep middle
      var rg = ctx.createRadialGradient(620, 590, 40, 620, 590, 460);
      rg.addColorStop(0, 'rgba(70,140,200,0.35)'); rg.addColorStop(1, 'rgba(70,140,200,0)');
      ctx.fillStyle = rg; ctx.fillRect(80, 360, 1080, 440);
      // mirrored mountains and pines along the far edge
      var r = U.seeded(5);
      ctx.globalAlpha = 0.22; ctx.fillStyle = '#6f86c4';
      for (var m = 0; m < 9; m++) { var mx = 150 + m * 120 + r() * 40, mh = 40 + r() * 50; ctx.beginPath(); ctx.moveTo(mx - 90, 384); ctx.lineTo(mx, 384 + mh); ctx.lineTo(mx + 90, 384); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#2f6f6a';
      [[420, 30], [470, 24], [560, 28], [760, 26], [1040, 36], [1090, 28], [360, 24], [640, 22], [300, 20], [880, 24], [980, 20]].forEach(function (p) {
        var top = 392; ctx.beginPath(); ctx.moveTo(p[0] - p[1] * 0.3, top); ctx.lineTo(p[0], top + p[1]); ctx.lineTo(p[0] + p[1] * 0.3, top); ctx.closePath(); ctx.fill();
      });
      ctx.globalAlpha = 0.35; A.glow(ctx, 912, 404, 20, C.lampGlow, 0.6);
      ctx.globalAlpha = 1;
      // glossy streaks
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      [[300, 60], [520, 30], [700, 80], [930, 40]].forEach(function (s, i) {
        ctx.beginPath(); ctx.moveTo(s[0], 400); ctx.lineTo(s[0] + s[1], 400); ctx.lineTo(s[0] + s[1] - 180, 780); ctx.lineTo(s[0] - 180, 780); ctx.closePath(); ctx.fill();
      });
      // frosty snow dust on the ice
      ctx.globalAlpha = 0.75;
      [[240, 700, 70, 9], [980, 470, 60, 8], [560, 735, 90, 10], [180, 520, 40, 6], [1040, 610, 50, 7], [700, 430, 50, 6]].forEach(function (d) { A.ellipse(ctx, d[0], d[1], d[2], d[3], '#f2f9ff', 0); });
      ctx.globalAlpha = 1;
      // cracks
      var cracks = [
        [[560, 470], [600, 492], [628, 488], [676, 520], [712, 516]], [[628, 488], [640, 462]], [[676, 520], [690, 548], [736, 566]],
        [[960, 600], [990, 630], [1030, 634], [1056, 664]], [[990, 630], [982, 660]],
        [[200, 610], [238, 626], [262, 660], [304, 672]], [[238, 626], [270, 612]],
        [[480, 660], [520, 686], [574, 690]], [[860, 450], [900, 470], [930, 468]]
      ];
      cracks.forEach(function (cr) {
        var pts = []; cr.forEach(function (p) { pts.push(p[0], p[1] + 1.5); }); A.line(ctx, pts, 3, 'rgba(60,120,180,0.35)');
        pts = []; cr.forEach(function (p) { pts.push(p[0], p[1]); }); A.line(ctx, pts, 2, 'rgba(255,255,255,0.95)');
      });
      ctx.restore();
      // crisp edge + inner light line
      icePath(ctx); ctx.lineWidth = 3; ctx.strokeStyle = '#7fa9d6'; ctx.stroke();
      ctx.save(); ctx.translate(0, 5); ctx.globalAlpha = 0.5; icePath(ctx); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.restore();
      // lumpy snow bank along the shore
      for (var i = 0; i < ICE.length; i += 4) {
        var p = ICE[i], big = (i * 7) % 3;
        if (p[1] < 430) continue;
        A.ellipse(ctx, p[0], p[1] + 4, 26 + big * 9, 6 + big * 2, C.snow, 2, C.snowDeep);
      }
      // frozen reeds poking out of the snowy shore
      reeds(ctx, 112, 470, 5, 3); reeds(ctx, 1120, 680, 4, 8); reeds(ctx, 610, 784, 3, 12); reeds(ctx, 1135, 430, 3, 19);
      // snowy rocks
      A.rock(ctx, 352, 872, 64, 34, true); A.rock(ctx, 1190, 520, 54, 30, true); A.rock(ctx, 1010, 880, 44, 22, true);
    },
    animate: function (ctx, t) {
      // aurora mirrored in the ice
      ctx.save(); icePath(ctx); ctx.clip();
      ctx.translate(0, 380 + 200 * 1.1); ctx.scale(1, -1.1);
      A.aurora(ctx, AB.W, 30, 150, t, 0.16);
      ctx.restore();
      updateSwim(t);
      drawSwim(ctx, t);
      // drifting glints on the ice
      for (var i = 0; i < 4; i++) {
        var gx = 200 + ((t * 18 + i * 260) % 860), gy = 440 + ((i * 97) % 280);
        if (onIce(gx, gy)) A.sparkle(ctx, gx, gy, 7, 0.35 + 0.45 * Math.max(0, Math.sin(t * 2.2 + i * 2)));
      }
      // far cabin chimney puffs
      for (var s = 0; s < 3; s++) {
        var p = ((t * 0.25 + s / 3) % 1);
        ctx.fillStyle = 'rgba(235,240,255,' + (0.5 * (1 - p)) + ')';
        ctx.beginPath(); ctx.arc(934 + p * 14 + Math.sin(p * 6 + s) * 3, 258 - p * 50, 4 + p * 9, 0, Math.PI * 2); ctx.fill();
      }
      // hut stove pipe smoke
      ctx.save(); ctx.translate(HUT.x + 41, HUT.y - 160); ctx.scale(0.55, 0.55); K.smoke(ctx, 0, 0, t); ctx.restore();
    },
    walk: [[0, 432], [84, 398], [230, 376], [420, 356], [640, 349], [860, 354], [1060, 372], [1200, 404], [1280, 440], [1280, 890], [0, 890]],
    blocks: [
      { e: [178, 398, 46, 22] },                 // scarf tree
      { e: [1150, 432, 34, 16] },                // pine (pinecone)
      { e: [46, 612, 32, 18] }, { e: [44, 876, 36, 20] }, { e: [1238, 878, 36, 20] },
      { e: [HUT.x, HUT.y - 18, 84, 26] }, { r: [HUT.x - 70, HUT.y - 60, 180, 56] },   // fishing hut + rods
      { e: [HOLE[0], HOLE[1], 34, 12] }, { e: [HOLE[0] - 52, HOLE[1] + 4, 14, 7] },
      { e: [PEEK[0], PEEK[1], 32, 11] },
      { e: [560, 836, 78, 14] },                 // log bench
      { e: SN.concat([38, 14]) }, { e: [SC[0], SC[1] - 8, 44, 14] },
      { e: [1160, 600, 12, 7] }, { e: [1190, 772, 12, 7] },
      { e: [352, 870, 30, 10] }, { e: [1190, 518, 26, 9] }, { e: [1010, 878, 22, 8] }
    ],
    spawns: { 'default': [1080, 690], town: [1190, 650], map: [1080, 690] },
    hotspots: [
      { id: 'toTown', hit: [1190, 540, 90, 190], at: [1250, 650], icon: 'right', badge: [1232, 556], action: function () { AB.go('town', 'lake'); } },
      { id: 'fishing', hit: [HUT.x - 60, HUT.y - 165, 210, 225], at: [HOLE[0], HOLE[1] + 40], icon: 'fish', badge: [HOLE[0] - 6, HOLE[1] - 60], action: function () { AB.playMinigame('fishing'); } }
    ],
    props: [
      scarfTree(178, 398),
      pine(1150, 432, 190), pine(46, 612, 200), pine(44, 876, 220, { at: [124, 860] }), pine(1238, 878, 210, { at: [1160, 862] }),
      lamp(1160, 600), lamp(1190, 772),
      hutProp, holeProp, stoolProp, peekProp,
      logBench(560, 836), snowmanProp, sculptureProp
    ],
    npcSpots: {
      gus: { at: [492, 556], wander: null, dir: -1 },
      pebble: { at: [700, 520], wander: [500, 440, 420, 220], dir: 1 }
    },
    questSpots: { scarfDrop: [190, 448], pinecone: [1104, 470], tracksLake: [400, 852] },
    update: function (dt) {
      var p = AB.world.player;
      if (p) p.skate = onIce(p.x, p.y);
      if (peek && !peek.landed && AB.world.t - peek.t > 1.35) { peek.landed = true; AB.world.burst(PEEK[0], PEEK[1] - 6, 'snow', 6); }
    }
  });
  AB.scenes.lake.onIce = onIce;
})();
