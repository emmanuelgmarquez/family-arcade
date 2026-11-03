/* Snowy Slopes — a tall hill north of town: a flagged sled run, a cosy sled hut, a chairlift and snowy fun. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C, K = AB.kit;

  // ---------------------------------------------------------------- the sled run (centre line [x, y, width])
  var RUN_TOP = [[318, 96, 12], [352, 140, 18], [300, 196, 26], [372, 262, 38], [404, 330, 52]];
  var RUN_LOW = [[404, 330, 52], [412, 420, 70], [480, 500, 86], [650, 560, 104], [860, 622, 124], [1020, 730, 146], [1110, 910, 170]];
  /** Catmull-Rom sample of a [x,y,w] polyline. */
  function sample(pts, per) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (var k = 0; k < per; k++) {
        var t = k / per, t2 = t * t, t3 = t2 * t;
        var f = function (a, b, c, d) { return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), U.lerp(p1[2], p2[2], t)]);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }
  function edges(s, extra) {
    var L = [], R = [];
    for (var i = 0; i < s.length; i++) {
      var a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)];
      var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / d, ny = dx / d, hw = s[i][2] / 2 + (extra || 0);
      L.push([s[i][0] + nx * hw, s[i][1] + ny * hw]); R.push([s[i][0] - nx * hw, s[i][1] - ny * hw]);
    }
    return { L: L, R: R };
  }
  var SAMPLE_TOP = sample(RUN_TOP, 10), SAMPLE_LOW = sample(RUN_LOW, 12);
  function polyPath(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); }
  function paintRun(ctx, s, lw) {
    var e = edges(s, 0), eo = edges(s, 6);
    polyPath(ctx, eo.L.concat(eo.R.slice().reverse())); ctx.closePath(); ctx.fillStyle = '#c7d5ef'; ctx.fill();
    polyPath(ctx, e.L.concat(e.R.slice().reverse())); ctx.closePath();
    var g = ctx.createLinearGradient(0, s[0][1], 0, s[s.length - 1][1]); g.addColorStop(0, '#eaf2ff'); g.addColorStop(1, '#dde8fa');
    ctx.fillStyle = g; ctx.fill();
    // groomed corduroy lines
    ctx.save(); ctx.clip();
    for (var k = -2; k <= 2; k++) {
      var off = edges(s, 0), line = [];
      for (var i = 0; i < s.length; i++) { var f = 0.5 + k * 0.17; line.push([U.lerp(off.R[i][0], off.L[i][0], f), U.lerp(off.R[i][1], off.L[i][1], f)]); }
      polyPath(ctx, line); ctx.strokeStyle = k % 2 ? 'rgba(170,190,225,0.5)' : 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(1.5, lw * 0.6); ctx.stroke();
    }
    // two deep sled tracks
    [0.38, 0.62].forEach(function (f) {
      var line = []; for (var i = 0; i < s.length; i++) line.push([U.lerp(e.R[i][0], e.L[i][0], f), U.lerp(e.R[i][1], e.L[i][1], f)]);
      polyPath(ctx, line); ctx.strokeStyle = 'rgba(120,145,200,0.55)'; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
    });
    ctx.restore();
    // raised snow lips
    [e.L, e.R].forEach(function (side) { polyPath(ctx, side); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = lw * 2.2; ctx.lineCap = 'round'; ctx.stroke(); polyPath(ctx, side); ctx.strokeStyle = 'rgba(120,145,200,0.45)'; ctx.lineWidth = 1.5; ctx.stroke(); });
  }
  // gate poles along the run: [x, y, color, side]
  function polesFor(s, idxs, extra) {
    var e = edges(s, extra), out = [];
    idxs.forEach(function (i, n) { var left = n % 2 === 0; var p = left ? e.L[i] : e.R[i]; out.push([Math.round(p[0]), Math.round(p[1]), left ? C.red : C.blue, left ? 1 : -1]); });
    return out;
  }
  var FAR_POLES = polesFor(SAMPLE_TOP, [8, 16, 24, 31, 38], 8);
  var NEAR_POLES = polesFor(SAMPLE_LOW, [26, 38, 50, 58], 22);

  // ---------------------------------------------------------------- state
  var snowmanWob = [0, 0], fortHit = 0, bellSwing = 0, gateCheer = 0;

  // ---------------------------------------------------------------- props
  function pine(x, y, h, at) {
    var shake = { until: 0 };
    return {
      x: x, y: y, hit: [x - h * 0.33, y - h, h * 0.66, h], at: at || [x + (x < 640 ? 70 : -70), y + 30],
      draw: function (ctx, t) {
        ctx.save();
        if (t < shake.until) { ctx.translate(x, y); ctx.rotate(Math.sin(t * 40) * 0.035); ctx.translate(-x, -y); }
        A.pine(ctx, x, y, h); ctx.restore();
      },
      tap: function () {
        shake.until = AB.world.t + 0.5; AB.audio.sfx('snow');
        for (var i = 0; i < 22; i++) AB.world.particles.push({ k: 'snow', x: x + U.rand(-h * 0.3, h * 0.3), y: y - h * U.rand(0.3, 0.95), vx: U.rand(-30, 30), vy: U.rand(-40, 40), t: 0, life: U.rand(0.8, 1.5), r: U.rand(3, 7) });
      }
    };
  }
  function pole(p) {
    var x = p[0], y = p[1], col = p[2], side = p[3];
    return {
      x: x, y: y,
      draw: function (ctx, t) {
        A.shadow(ctx, x + 6, y + 2, 10, 3);
        A.box(ctx, x - 3, y - 74, 6, 76, 3, '#fff', 2.2);
        for (var k = 0; k < 4; k++) A.box(ctx, x - 3, y - 70 + k * 18, 6, 8, 1, col, 0);
        var fl = Math.sin(t * 7 + x) * 4;
        A.shape(ctx, function (c) { c.moveTo(x, y - 74); c.quadraticCurveTo(x + side * 16, y - 70 + fl, x + side * 34, y - 62 + fl); c.quadraticCurveTo(x + side * 16, y - 56 - fl * 0.5, x, y - 50); c.closePath(); }, col, 2.2);
        A.ellipse(ctx, x, y - 75, 5, 3, '#fff', 1.5);
      }
    };
  }

  function snowman(i, x, y, s, hat) {
    return {
      x: x, y: y, hit: [x - 46 * s, y - 165 * s, 92 * s, 170 * s], at: [x + (x < 640 ? 70 : -70), y + 20],
      draw: function (ctx, t) {
        var w = Math.max(0, snowmanWob[i] - t), rot = Math.sin(w * 22) * w * 0.25;
        A.shadow(ctx, x, y + 2, 44 * s, 10 * s);
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
        A.circle(ctx, 0, -32, 34, '#fff', 3); A.circle(ctx, 0, -84, 25, '#fff', 3); A.circle(ctx, 0, -122, 19, '#fff', 3);
        ctx.save(); ctx.globalAlpha = 0.5; A.ellipse(ctx, 14, -26, 16, 22, C.snowShade, 0); ctx.restore();
        A.circle(ctx, -7, -127, 2.6, C.out, 0); A.circle(ctx, 7, -127, 2.6, C.out, 0);
        A.poly(ctx, [0, -120, 22, -116, 0, -113], C.orange, 1.5);
        A.line(ctx, [-7, -110, 0, -106, 7, -110], 2);
        A.circle(ctx, 0, -84, 3, C.out, 0); A.circle(ctx, 0, -70, 3, C.out, 0);
        if (hat === 'goggles') {
          // a ski snowman: helmet + goggles + scarf + ski poles
          A.shape(ctx, function (c) { c.moveTo(-21, -128); c.quadraticCurveTo(-20, -152, 0, -152); c.quadraticCurveTo(20, -152, 21, -128); c.closePath(); }, C.red, 2.5);
          A.box(ctx, -18, -134, 36, 11, 5, '#ffcf4a', 2.2); A.box(ctx, -12, -132, 24, 7, 3, '#6fb7ff', 1.5); A.highlight(ctx, -6, -130, 4, 1.5, 0.8);
          A.shape(ctx, function (c) { c.moveTo(-22, -104); c.quadraticCurveTo(0, -94, 22, -104); c.lineTo(22, -96); c.quadraticCurveTo(0, -86, -22, -96); c.closePath(); }, C.blue, 2.2);
          A.box(ctx, 8, -98, 9, 24, 3, C.blue, 2.2);
          A.line(ctx, [-24, -86, -50, -60], 3, C.woodDark); A.line(ctx, [-50, -70, -56, 0], 3, '#3c4a6b'); A.circle(ctx, -55, -6, 5, null, 2);
          A.line(ctx, [24, -86, 50, -60], 3, C.woodDark); A.line(ctx, [50, -70, 56, 0], 3, '#3c4a6b'); A.circle(ctx, 55, -6, 5, null, 2);
        } else {
          A.box(ctx, -18, -140, 36, 12, 3, '#30364d', 2.5); A.box(ctx, -12, -164, 24, 26, 3, '#30364d', 2.5); A.box(ctx, -12, -146, 24, 5, 0, C.red, 0);
          A.line(ctx, [-24, -86, -50, -104], 3, C.woodDark); A.line(ctx, [-44, -100, -50, -114], 2.5, C.woodDark);
          A.line(ctx, [24, -86, 50, -100], 3, C.woodDark);
        }
        ctx.restore();
      },
      tap: function () { snowmanWob[i] = AB.world.t + 0.9; AB.audio.sfx('pop'); AB.world.burst(x, y - 120 * s, 'snow', 6); }
    };
  }

  var FORT = [880, 812];
  var fortProp = {
    x: FORT[0], y: FORT[1], hit: [FORT[0] - 110, FORT[1] - 120, 220, 125], at: [FORT[0] - 10, FORT[1] + 34],
    draw: function (ctx, t) {
      var x = FORT[0], y = FORT[1], hit = Math.max(0, fortHit - t);
      A.shadow(ctx, x, y + 3, 112, 14);
      // snow-block wall in a gentle curve, two rows + crenellations
      var row = function (yy, n, w, off) { for (var i = 0; i < n; i++) { var bx = x - n * w / 2 + i * w + off, by = yy - Math.cos((i - n / 2 + 0.5) / n * 2) * 6; A.box(ctx, bx, by - 26, w - 2, 28, 6, i % 2 ? '#f7faff' : '#eef4ff', 2.5); } };
      row(y, 7, 30, 0); row(y - 26, 6, 30, 15);
      [-75, -15, 45].forEach(function (cx) { A.box(ctx, x + cx, y - 78, 30, 28, 6, '#ffffff', 2.5); });
      ctx.save(); ctx.globalAlpha = 0.4; A.box(ctx, x + 40, y - 52, 60, 52, 6, C.snowShade, 0); ctx.restore();
      // flag
      var fl = Math.sin(t * 6) * 4;
      A.line(ctx, [x + 60, y - 78, x + 60, y - 132], 3);
      A.shape(ctx, function (c) { c.moveTo(x + 60, y - 132); c.quadraticCurveTo(x + 76, y - 128 + fl, x + 92, y - 122 + fl); c.lineTo(x + 60, y - 110); c.closePath(); }, C.yellow, 2.2);
      A.star(ctx, x + 70, y - 121 + fl * 0.5, 4, '#fff', 0);
      // snowball pyramid
      [[x - 98, y - 8], [x - 80, y - 8], [x - 89, y - 24]].forEach(function (b) { A.circle(ctx, b[0], b[1], 9, '#fff', 2.2); A.highlight(ctx, b[0] - 3, b[1] - 3, 3, 1.6, 0.8); });
      // a peeking arctic hare when tapped
      if (hit > 0) {
        var k = Math.min(1, (1.6 - hit) * 4) * Math.min(1, hit * 3);
        ctx.save(); ctx.beginPath(); ctx.rect(x - 140, y - 200, 280, 148); ctx.clip();
        var hy = y - 50 - k * 34;
        A.ellipse(ctx, x - 22, hy - 30, 6, 20, '#fff', 2.5, null, -0.15); A.ellipse(ctx, x - 6, hy - 32, 6, 20, '#fff', 2.5, null, 0.15);
        A.ellipse(ctx, x - 22, hy - 30, 2.5, 13, '#ffc2d4', 0, null, -0.15);
        A.circle(ctx, x - 14, hy, 18, '#fff', 2.5);
        A.circle(ctx, x - 20, hy - 3, 2.6, C.out, 0); A.circle(ctx, x - 8, hy - 3, 2.6, C.out, 0); A.circle(ctx, x - 14, hy + 4, 2.4, '#ff8fb1', 0);
        ctx.restore();
      }
    },
    tap: function () {
      fortHit = AB.world.t + 1.6; AB.audio.sfx('snow');
      for (var i = 0; i < 4; i++) AB.world.particles.push({ k: 'snow', x: FORT[0] - 90, y: FORT[1] - 20, vx: U.rand(-160, -60), vy: U.rand(-340, -220), t: 0, life: 1.1, r: 7 });
      setTimeout(function () { AB.audio.sfx('chirp'); }, 250);
      AB.quests.revealGem('gem_slopes_1', FORT[0] + 130, FORT[1] + 30);
    }
  };

  var SLED = [420, 772];
  var sledProp = {
    x: SLED[0], y: SLED[1], hit: [SLED[0] - 70, SLED[1] - 60, 140, 70], at: [SLED[0] - 30, SLED[1] + 28],
    draw: function (ctx) {
      var x = SLED[0], y = SLED[1];
      A.shadow(ctx, x, y + 3, 64, 9);
      // runners curling up at the front
      A.shape(ctx, function (c) { c.moveTo(x - 58, y); c.lineTo(x + 40, y); c.quadraticCurveTo(x + 66, y, x + 62, y - 22); c.quadraticCurveTo(x + 56, y - 30, x + 50, y - 22); c.quadraticCurveTo(x + 56, y - 10, x + 40, y - 8); c.lineTo(x - 58, y - 8); c.closePath(); }, '#e2574c', 2.5);
      A.line(ctx, [x - 40, y - 8, x - 40, y - 20], 4, C.out); A.line(ctx, [x + 20, y - 8, x + 20, y - 20], 4, C.out);
      A.box(ctx, x - 60, y - 30, 104, 14, 5, C.wood, 3);
      A.line(ctx, [x - 30, y - 30, x - 30, y - 16], 2, 'rgba(90,50,20,0.45)'); A.line(ctx, [x, y - 30, x, y - 16], 2, 'rgba(90,50,20,0.45)');
      A.ellipse(ctx, x - 18, y - 31, 30, 4, C.snow, 1.5);
      // tow rope
      A.shape(ctx, function (c) { c.moveTo(x + 52, y - 20); c.bezierCurveTo(x + 90, y - 4, x + 92, y + 12, x + 70, y + 14); }, null, 3, '#ffcf4a');
    },
    tap: function () { var p = AB.world.player; p.x = SLED[0] - 14; p.y = SLED[1] + 2; p.dir = 1; p.pose = 'sit'; p.poseUntil = AB.world.t + 6; AB.audio.sfx('whoosh'); }
  };

  var BELL = [1186, 700];
  var bellProp = {
    x: BELL[0], y: BELL[1], hit: [BELL[0] - 46, BELL[1] - 170, 92, 175], at: [BELL[0] - 70, BELL[1] + 24],
    draw: function (ctx, t) {
      var x = BELL[0], y = BELL[1];
      A.shadow(ctx, x, y + 2, 24, 6);
      A.box(ctx, x - 5, y - 140, 10, 142, 3, C.woodDark, 2.5);
      A.box(ctx, x - 36, y - 150, 72, 14, 5, C.wood, 3); A.ellipse(ctx, x - 8, y - 152, 26, 5, '#fff', 2);
      // little checkered finish flag on top
      var fl = Math.sin(t * 6) * 3;
      A.line(ctx, [x + 30, y - 150, x + 30, y - 196], 3);
      A.shape(ctx, function (c) { c.moveTo(x + 30, y - 196); c.lineTo(x + 62, y - 192 + fl); c.lineTo(x + 62, y - 172 + fl); c.lineTo(x + 30, y - 176); c.closePath(); }, '#fff', 2.2);
      ctx.fillStyle = C.out; for (var r = 0; r < 2; r++) for (var c2 = 0; c2 < 4; c2++) if ((r + c2) % 2) ctx.fillRect(x + 30 + c2 * 8, y - 195 + r * 10 + fl * c2 / 4, 8, 9);
      var sw = Math.sin(t * 14) * Math.max(0, bellSwing - t) * 0.6;
      ctx.save(); ctx.translate(x - 12, y - 136); ctx.rotate(sw);
      A.shape(ctx, function (c) { c.moveTo(-14, 30); c.quadraticCurveTo(-14, 4, 0, 2); c.quadraticCurveTo(14, 4, 14, 30); c.lineTo(19, 36); c.lineTo(-19, 36); c.closePath(); }, '#ffc93c', 3);
      A.circle(ctx, 0, 40, 4.5, '#c58a12', 2); A.highlight(ctx, -6, 14, 3, 8, 0.6);
      ctx.restore();
      A.line(ctx, [x - 12, y - 136, x - 12, y - 140], 3);
    },
    tap: function () { bellSwing = AB.world.t + 1.5; AB.audio.sfx('bell'); AB.world.burst(BELL[0] - 12, BELL[1] - 130, 'note', 4); AB.quests.revealGem('gem_slopes_2', BELL[0] - 80, BELL[1] + 60); }
  };

  // START gate: two poles + a banner across the run
  var GATE = { l: 352, r: 470, y: 398 };
  var gateProp = {
    x: 410, y: GATE.y,
    draw: function (ctx, t) {
      [GATE.l, GATE.r].forEach(function (px, i) {
        A.shadow(ctx, px + 4, GATE.y + 2, 12, 4);
        A.box(ctx, px - 5, GATE.y - 142, 10, 144, 3, i ? C.blue : C.red, 2.5);
        for (var k = 0; k < 5; k++) A.box(ctx, px - 5, GATE.y - 130 + k * 26, 10, 9, 0, '#fff', 0);
        A.box(ctx, px - 5, GATE.y - 142, 10, 144, 3, null, 2.5);
        A.circle(ctx, px, GATE.y - 146, 8, C.yellow, 2.5);
      });
      var cheer = Math.max(0, gateCheer - t), wave = Math.sin(t * 4) * 3 + Math.sin(t * 30) * cheer * 5;
      var L = GATE.l + 4, R = GATE.r - 4, top = GATE.y - 140;
      A.shape(ctx, function (c) { c.moveTo(L, top); c.quadraticCurveTo(410, top + 8 + wave, R, top); c.lineTo(R, top + 34); c.quadraticCurveTo(410, top + 42 + wave, L, top + 34); c.closePath(); }, '#fff4dc', 3);
      // pennant bunting under the banner
      for (var i = 0; i < 6; i++) {
        var bx = L + 8 + i * 18, by = top + 38 + Math.sin(i / 5 * Math.PI) * 6 + wave * 0.6;
        A.poly(ctx, [bx, by, bx + 14, by, bx + 7, by + 14], [C.red, C.yellow, C.blue, C.green, C.pink, C.purple][i], 1.6);
      }
      ctx.fillStyle = C.red; ctx.font = '900 22px ' + AB.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('START', 410, top + 19 + wave * 0.8);
    },
  };

  // ---------------------------------------------------------------- painting helpers
  function sledHut(ctx, x, y) {
    var w = 190, h = 110, L = x - w / 2;
    K.building(ctx, { x: L, y: y, w: w, h: h, wall: '#b8683f', logs: true, roof: '#d0473d', roofH: 70, trim: '#8d96ad', chimney: 136,
      door: { x: x - 4, w: 50, h: 80, color: '#3d6a8c', wreath: true }, windows: [[L + 18, y - 84, 44, 40]] });
    // sign plank with a sled icon
    A.box(ctx, x - 40, y - h - 28, 80, 30, 9, C.cream, 2.5);
    AB.icons.draw(ctx, 'sled', x, y - h - 13, 24, C.red);
    // sleds leaning against the wall
    [[L - 10, '#4a8fe0'], [L + 6, '#ffcf4a'], [x + w / 2 - 6, '#35b5a4']].forEach(function (s, i) {
      var sx = s[0], c = s[1];
      ctx.save(); ctx.translate(sx, y); ctx.rotate(i === 2 ? 0.16 : -0.16);
      A.box(ctx, -10, -78, 20, 78, 9, c, 2.5);
      A.line(ctx, [-4, -70, -4, -8], 2, 'rgba(0,0,0,0.25)'); A.line(ctx, [4, -70, 4, -8], 2, 'rgba(0,0,0,0.25)');
      A.shape(ctx, function (cc) { cc.moveTo(-12, -76); cc.quadraticCurveTo(0, -94, 12, -76); }, null, 3, C.out);
      A.ellipse(ctx, 0, -78, 9, 3, C.snow, 1.5);
      ctx.restore();
    });
    // skis + a bench of snow by the door
    A.line(ctx, [x + 54, y, x + 62, y - 86], 5, C.out); A.line(ctx, [x + 54, y, x + 62, y - 86], 3, '#ff8fb1');
    A.line(ctx, [x + 64, y, x + 72, y - 84], 5, C.out); A.line(ctx, [x + 64, y, x + 72, y - 84], 3, '#ff8fb1');
  }
  function liftTower(ctx, x, y, h) {
    A.poly(ctx, [x - 6, y, x + 6, y, x + 3, y - h, x - 3, y - h], '#6c7894', 2);
    A.box(ctx, x - 18, y - h - 4, 36, 6, 2, '#5b6684', 2);
    A.ellipse(ctx, x, y + 1, 10, 3, '#fff', 0);
  }
  var LIFT = [[1210, 300], [1010, 240], [810, 186], [610, 132], [470, 96]];
  function liftCable(i) { // position along the cable 0..1 → [x,y] (cable hangs a little between towers)
    var segs = LIFT.length - 1, f = i * segs, k = Math.min(segs - 1, Math.floor(f)), u = f - k;
    var a = LIFT[k], b = LIFT[k + 1];
    return [U.lerp(a[0], b[0], u), U.lerp(a[1], b[1], u) - 70 + Math.sin(u * Math.PI) * 8];
  }

  // ---------------------------------------------------------------- scene
  AB.registerScene({
    id: 'slopes', name: 'Snowy Slopes', music: 'town', ambient: 'wind', outdoor: true, snow: true, footprints: true, aurora: true,
    map: { x: 690, y: 200, icon: 'sled' },
    depth: [340, 0.66, 880, 1.06],
    paint: function (ctx) {
      K.skyAndMountains(ctx, 200, 33);
      K.snowGround(ctx, 236);
      // the big hill rising to the upper left
      ctx.beginPath();
      ctx.moveTo(-30, 520); ctx.bezierCurveTo(-10, 260, 160, 90, 320, 86);
      ctx.bezierCurveTo(460, 82, 560, 150, 760, 200); ctx.bezierCurveTo(960, 250, 1160, 270, 1320, 300);
      ctx.lineTo(1320, 900); ctx.lineTo(-30, 900); ctx.closePath();
      var hg = ctx.createLinearGradient(0, 80, 0, 520); hg.addColorStop(0, '#ffffff'); hg.addColorStop(0.5, '#eef3fd'); hg.addColorStop(1, '#e3ebf9');
      A.fs(ctx, hg, 3, '#9fb3dc');
      // shaded flank + wind-swept streaks for motion
      ctx.save(); ctx.clip();
      ctx.globalAlpha = 0.5; ctx.fillStyle = C.snowShade;
      ctx.beginPath(); ctx.moveTo(320, 86); ctx.bezierCurveTo(460, 82, 560, 150, 760, 200); ctx.bezierCurveTo(960, 250, 1160, 270, 1320, 300); ctx.lineTo(1320, 360); ctx.bezierCurveTo(1000, 320, 700, 260, 320, 86); ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      var r = U.seeded(12);
      for (var i = 0; i < 22; i++) { var sx = 80 + r() * 1100, sy = 140 + r() * 220, l = 40 + r() * 90; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + l * 0.5, sy + l * 0.16, sx + l, sy + l * 0.4); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(150,170,215,0.35)'; ctx.lineWidth = 2;
      for (var j = 0; j < 14; j++) { var tx = 120 + r() * 1000, ty = 160 + r() * 200, tl = 30 + r() * 60; ctx.beginPath(); ctx.moveTo(tx, ty + 4); ctx.quadraticCurveTo(tx + tl * 0.5, ty + tl * 0.16 + 4, tx + tl, ty + tl * 0.4 + 4); ctx.stroke(); }
      ctx.restore();
      // chairlift towers (chairs move in animate)
      LIFT.forEach(function (p, i) { liftTower(ctx, p[0], p[1], 70); });
      ctx.strokeStyle = C.out; ctx.lineWidth = 2; ctx.beginPath();
      for (var c = 0; c <= 60; c++) { var q = liftCable(c / 60); if (c) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } ctx.stroke();
      // top station hut near the peak
      A.box(ctx, 430, 70, 56, 34, 3, '#a2603f', 2.5); A.poly(ctx, [422, 72, 494, 72, 482, 52, 434, 52], '#d0473d', 2.5);
      A.shape(ctx, function (cc) { cc.moveTo(420, 72); cc.quadraticCurveTo(458, 60, 496, 72); cc.lineTo(482, 50); cc.quadraticCurveTo(458, 44, 434, 50); cc.closePath(); }, '#fff', 2);
      A.glow(ctx, 448, 88, 20, C.lampGlow, 0.5); A.box(ctx, 440, 80, 16, 12, 2, '#ffd37a', 2);
      // pines dotted across the hill (smaller = farther)
      [[120, 300, 46], [70, 360, 60], [190, 250, 38], [560, 186, 34], [620, 210, 40], [700, 232, 44], [880, 262, 46], [940, 256, 40], [1060, 290, 54], [1120, 296, 48], [240, 330, 52], [520, 260, 42], [1180, 330, 70], [980, 320, 60]].forEach(function (p) { A.pine(ctx, p[0], p[1], p[2]); });
      // upper (far) run, its flags, and a little ridge where the hill meets the play area
      paintRun(ctx, SAMPLE_TOP, 2);
      FAR_POLES.forEach(function (p, i) {
        var s = 0.5 + (p[1] - 90) / 500;
        A.line(ctx, [p[0], p[1], p[0], p[1] - 34 * s], 2.4, C.out);
        A.poly(ctx, [p[0], p[1] - 34 * s, p[0] + p[3] * 16 * s, p[1] - 29 * s, p[0], p[1] - 23 * s], p[2], 1.6);
      });
      A.drift(ctx, 180, 392, 420, 46, '#f6f9ff'); A.drift(ctx, 860, 340, 520, 44, '#f6f9ff'); A.drift(ctx, 1240, 370, 220, 40, '#f6f9ff');
      // the little snowbank where the star waits
      A.drift(ctx, 770, 432, 190, 30, '#ffffff');
      // lower (near) run down through the play area
      paintRun(ctx, SAMPLE_LOW, 3);
      // the cosy sled hut at top-left of the walk area
      sledHut(ctx, 190, 384);
      // path from town at the bottom
      K.path(ctx, [[600, 920, 130], [600, 840, 110], [560, 790, 90]]);
      // extra sled tracks wandering across the snow
      ctx.save(); ctx.strokeStyle = 'rgba(120,145,200,0.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      [[[240, 470], [300, 560], [280, 660], [340, 760]], [[720, 650], [770, 710], [748, 800]]].forEach(function (tr) {
        [-6, 6].forEach(function (o) { ctx.beginPath(); ctx.moveTo(tr[0][0] + o, tr[0][1]); for (var k = 1; k < tr.length; k++) ctx.lineTo(tr[k][0] + o, tr[k][1]); ctx.stroke(); });
      });
      ctx.restore();
      A.rock(ctx, 1240, 450, 60, 34, true); A.rock(ctx, 120, 560, 46, 26, true);
    },
    animate: function (ctx, t) {
      // chairlift chairs gliding up
      for (var i = 0; i < 7; i++) {
        var k = ((t * 0.018) + i / 7) % 1, p = liftCable(k);
        A.line(ctx, [p[0], p[1], p[0], p[1] + 18], 2);
        A.box(ctx, p[0] - 11, p[1] + 16, 22, 6, 2, i % 2 ? C.red : C.blue, 1.8);
        A.line(ctx, [p[0] + 11, p[1] + 22, p[0] + 11, p[1] + 10], 1.8);
        if (i % 3 === 0) { A.circle(ctx, p[0] - 2, p[1] + 10, 5, ['#fff', '#ffb36b', '#c9a0ff'][i % 3 ? 1 : 0], 1.5); }
      }
      // a tiny sledder whooshing down the far run every few seconds
      var cyc = 7, u = (t % cyc) / 3.2;
      if (u < 1) {
        var idx = Math.min(SAMPLE_TOP.length - 1, Math.floor(u * (SAMPLE_TOP.length - 1))), q = SAMPLE_TOP[idx], s = 0.45 + u * 0.35;
        for (var w = 1; w < 4; w++) { var qq = SAMPLE_TOP[Math.max(0, idx - w * 2)]; ctx.fillStyle = 'rgba(255,255,255,' + (0.7 - w * 0.18) + ')'; ctx.beginPath(); ctx.arc(qq[0], qq[1] - 4, 6 - w, 0, Math.PI * 2); ctx.fill(); }
        ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(s, s);
        A.box(ctx, -16, -6, 32, 7, 3, C.red, 2); A.circle(ctx, 0, -18, 10, '#fff', 2); A.circle(ctx, 0, -32, 7, C.out, 1.5); A.box(ctx, -8, -24, 16, 5, 2, C.yellow, 1);
        ctx.restore();
      }
      // chimney smoke from the sled hut
      K.smoke(ctx, 241, 220, t);
      // glints on the groomed run
      for (var g = 0; g < 3; g++) { var gi = Math.floor(((t * 0.3 + g / 3) % 1) * (SAMPLE_LOW.length - 1)), gp = SAMPLE_LOW[gi]; A.sparkle(ctx, gp[0] + 10, gp[1] - 4, 6, 0.6 * Math.abs(Math.sin(t * 2 + g))); }
    },
    walk: [[0, 600], [20, 470], [60, 410], [90, 392], [300, 392], [345, 345], [480, 340], [640, 372], [800, 330], [1000, 340], [1160, 372], [1280, 400], [1280, 890], [0, 890]],
    blocks: [
      { e: [GATE.l, GATE.y, 9, 6] }, { e: [GATE.r, GATE.y, 9, 6] },
      { e: [50, 660, 32, 16] }, { e: [1230, 476, 30, 15] }, { e: [60, 878, 36, 20] }, { e: [1226, 880, 36, 20] },
      { e: [FORT[0], FORT[1] - 10, 110, 22] },
      { e: [SLED[0], SLED[1] - 4, 64, 12] },
      { e: [BELL[0], BELL[1], 16, 7] },
      { e: [250, 640, 36, 14] }, { e: [1076, 512, 30, 12] },
      { e: [120, 558, 22, 9] }, { e: [1240, 450, 28, 9] }
    ].concat(NEAR_POLES.map(function (p) { return { e: [p[0], p[1], 7, 5] }; })),
    spawns: { 'default': [600, 800], town: [600, 830], map: [600, 800] },
    hotspots: [
      { id: 'toTown', hit: [500, 828, 200, 72], at: [600, 878], icon: 'down', badge: [672, 846], action: function () { AB.go('town', 'slopes'); } },
      { id: 'sled', hit: [80, 210, 420, 120], at: [410, 452], icon: 'sled', badge: [410, 214], action: function () { gateCheer = AB.world.t + 1; AB.audio.sfx('ding'); AB.world.burst(410, GATE.y - 140, 'star', 5); AB.playMinigame('sled'); } }
    ],
    props: [
      gateProp,
      pine(50, 660, 190, [120, 690]), pine(1230, 476, 170, [1160, 500]), pine(60, 878, 220, [140, 860]), pine(1226, 880, 210, [1150, 860]),
      snowman(0, 250, 640, 1, 'top'), snowman(1, 1076, 512, 0.9, 'goggles'),
      fortProp, sledProp, bellProp
    ].concat(NEAR_POLES.map(pole)),
    npcSpots: {
      juniper: { at: [520, 420], wander: [480, 390, 140, 70], dir: -1 }
    },
    questSpots: { star: [770, 414], tracksSlopes: [160, 470] }
  });
})();
