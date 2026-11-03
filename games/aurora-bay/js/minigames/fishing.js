/* Aurora Bay — Ice Fishing minigame.
 * Side cut-away of a frozen lake: the child sits on a stool beside a round fishing hole,
 * drops a hook into a cosy underwater world and reels up fish into a bucket.
 * Hold / tap / Down / Space lowers the hook; release / tap again / Up / Space reels up.
 * Drag or Left/Right swings the hook sideways. A biting fish reels itself up automatically. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C;
  var W = 1280, H = 900;

  // ---- layout ---------------------------------------------------------------
  var SURF = 258;            // snow surface line
  var ICEB = 306;            // underside of the ice
  var HX = 720, HW = 52;     // fishing hole centre and half width
  var WATERY = 276;          // water level inside the hole
  var TOPY = 300;            // hook resting point (inside the hole)
  var MAXY = 808;            // deepest hook point
  var FLOORY = 850;          // lake floor
  var CRABY = 866;           // crab feet
  var CX = 594, STOOLY = SURF - 34, CSCALE = 1.05;
  var BUCKX = 466, BUCKY = SURF + 2;
  var ROD_S = { x: CX + 18, y: STOOLY - 32 };
  var ROD_T = { x: HX, y: 102 };
  var DUR = 75;
  var VALUES = { sunny: 5, bluegill: 5, rosy: 5, mint: 5, gold: 15, star: 20 };
  var COMMON = ['sunny', 'bluegill', 'rosy', 'mint'];

  function sfx(host, n) { try { host.sfx && host.sfx(n); } catch (e) { /* silent */ } }
  function maxOffAt(y) { return U.clamp((y - ICEB + 10) * 0.95, 0, 340); }

  // ---- drawing helpers (shared with tutorial cards) ------------------------
  function drawHook(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    A.line(ctx, [0, -30, 0, -17], 1.8, 'rgba(255,255,255,0.95)');
    // little pink worm curled on the bend
    var wig = Math.sin((t || 0) * 6) * 2.5;
    ctx.beginPath(); ctx.moveTo(-13, -1); ctx.bezierCurveTo(-22, 10 + wig, -6, 20, 3, 10 - wig);
    ctx.lineCap = 'round'; ctx.strokeStyle = C.out; ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = '#ff9fb8'; ctx.lineWidth = 4.6; ctx.stroke();
    // the J hook
    ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(0, 4); ctx.arc(-7, 4, 7, 0, Math.PI, false); ctx.lineTo(-14, -4); ctx.lineTo(-10, 0);
    ctx.lineJoin = 'round'; ctx.strokeStyle = C.out; ctx.lineWidth = 6.5; ctx.stroke();
    ctx.strokeStyle = '#e8eef8'; ctx.lineWidth = 3; ctx.stroke();
    A.circle(ctx, 0, -18, 3, null, 2, C.out);
    // red sinker
    A.circle(ctx, 0, -31, 7.5, C.red, 2.5);
    A.highlight(ctx, -2.5, -34, 2.6, 1.6, 0.85);
    ctx.restore();
  }

  function drawFishAt(ctx, x, y, kind, s, dir, t, rot) {
    ctx.save(); ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (kind === 'gold') A.glow(ctx, 0, 0, 58 * s, 'rgba(255,224,110,', 0.4);
    if (kind === 'star') A.glow(ctx, 0, 0, 52 * s, 'rgba(200,170,255,', 0.4);
    ctx.scale(dir, 1);
    A.fish(ctx, 0, 0, s, kind, t);
    ctx.restore();
  }

  function drawBoot(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
    var body = '#9a6440', dark = '#6e4329';
    A.shape(ctx, function (c) {
      c.moveTo(-17, -32); c.lineTo(5, -32); c.lineTo(7, -9); c.quadraticCurveTo(25, -10, 28, 3); c.lineTo(28, 9); c.lineTo(-17, 9); c.closePath();
    }, body, 3);
    ctx.save(); ctx.beginPath(); ctx.moveTo(-17, -32); ctx.lineTo(5, -32); ctx.lineTo(7, -9); ctx.quadraticCurveTo(25, -10, 28, 3); ctx.lineTo(28, 9); ctx.lineTo(-17, 9); ctx.closePath(); ctx.clip();
    ctx.globalAlpha = 0.28; ctx.fillStyle = '#3a2214'; ctx.fillRect(-2, -40, 40, 60); ctx.restore();
    A.shape(ctx, function (c) {
      c.moveTo(-17, -32); c.lineTo(5, -32); c.lineTo(7, -9); c.quadraticCurveTo(25, -10, 28, 3); c.lineTo(28, 9); c.lineTo(-17, 9); c.closePath();
    }, null, 3);
    A.box(ctx, -19, 7, 50, 8, 3, '#4b3326', 3);
    A.box(ctx, -20, -38, 28, 9, 3, '#b77a50', 3);
    // laces
    A.line(ctx, [-3, -26, 5, -20], 2, '#f1e3c8'); A.line(ctx, [5, -26, -3, -20], 2, '#f1e3c8');
    A.line(ctx, [-3, -18, 5, -12], 2, '#f1e3c8'); A.line(ctx, [5, -18, -3, -12], 2, '#f1e3c8');
    // patch
    A.box(ctx, -14, -12, 9, 9, 2, '#c99a6c', 2);
    A.line(ctx, [-12, -10, -7, -5], 1.4, dark);
    A.highlight(ctx, -10, -26, 3, 6, 0.4);
    // a sprout of lake weed
    A.line(ctx, [-8, -38, -12, -50, -6, -58], 4.5, C.out); A.line(ctx, [-8, -38, -12, -50, -6, -58], 2.2, C.green);
    ctx.restore();
  }

  function drawCan(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
    A.box(ctx, -14, -19, 28, 38, 5, '#bcc7d9', 3);
    ctx.save(); ctx.beginPath(); A.rrect(ctx, -14, -19, 28, 38, 5); ctx.clip();
    ctx.fillStyle = C.teal; ctx.fillRect(-15, -9, 30, 18);
    // tiny fish logo
    A.ellipse(ctx, 1, 0, 6, 4, '#fff', 0); A.poly(ctx, [-5, 0, -10, -4, -10, 4], '#fff', 0);
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#26324d'; ctx.fillRect(4, -20, 12, 40); ctx.restore();
    A.box(ctx, -14, -19, 28, 38, 5, null, 3);
    A.line(ctx, [-14, -9, 14, -9], 2, C.tealDark); A.line(ctx, [-14, 9, 14, 9], 2, C.tealDark);
    A.ellipse(ctx, 0, -19, 14, 4, '#dfe6f0', 2.5);
    A.line(ctx, [-6, -19, 3, -18], 1.6, C.stoneDark);
    A.line(ctx, [8, 12, 11, 15], 1.6, C.stoneDark); // dent
    A.highlight(ctx, -8, -2, 2.4, 10, 0.55);
    ctx.restore();
  }

  function drawCrab(ctx, x, y, s, mood, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    var col = '#ff7d5c', dark = '#d9553d';
    var awake = mood !== 'sleep';
    var breath = mood === 'sleep' ? Math.sin(t * 2) * 1.2 : 0;
    for (var side = -1; side <= 1; side += 2) {
      for (var i = 0; i < 3; i++) {
        var lx = side * (12 + i * 7), wig = awake ? Math.sin(t * 14 + i * 1.7) * 3 : 0;
        var pts = [lx, -12, lx + side * 11, -15 + wig, lx + side * 15, 0];
        A.line(ctx, pts, 6.5, C.out); A.line(ctx, pts, 3.2, dark);
      }
    }
    // arms
    var snap = mood === 'grump' || mood === 'held' ? Math.abs(Math.sin(t * 9)) * 0.5 : (awake ? 0.25 : 0.1);
    for (var sd = -1; sd <= 1; sd += 2) {
      var ex = sleepArm(sd, mood).x, ey = sleepArm(sd, mood).y;
      A.line(ctx, [sd * 20, -18, ex, ey], 7, C.out); A.line(ctx, [sd * 20, -18, ex, ey], 3.5, dark);
      ctx.save(); ctx.translate(ex, ey); ctx.scale(sd, 1);
      ctx.rotate(mood === 'sleep' ? 0.3 : -0.6);
      A.ellipse(ctx, 6, 3, 12, 8, col, 3);
      ctx.rotate(-snap);
      A.ellipse(ctx, 8, -5, 10, 5, col, 3);
      A.highlight(ctx, 3, 1, 3, 2, 0.6);
      ctx.restore();
    }
    // body
    A.ellipse(ctx, 0, -18 + breath, 28, 19 - breath * 0.5, col, 3);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -18 + breath, 28, 19, 0, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#9c2f20'; ctx.beginPath(); ctx.ellipse(10, -4, 28, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    A.ellipse(ctx, 0, -18 + breath, 28, 19 - breath * 0.5, null, 3);
    A.circle(ctx, -12, -24, 2.4, '#ffb59e', 0); A.circle(ctx, 12, -26, 2, '#ffb59e', 0); A.circle(ctx, 3, -30, 1.8, '#ffb59e', 0);
    A.highlight(ctx, -12, -28, 6, 3, 0.55);
    // eye stalks
    A.line(ctx, [-8, -32, -10, -44], 6, C.out); A.line(ctx, [-8, -32, -10, -44], 3, dark);
    A.line(ctx, [8, -32, 10, -44], 6, C.out); A.line(ctx, [8, -32, 10, -44], 3, dark);
    for (var e = -1; e <= 1; e += 2) {
      A.circle(ctx, e * 10, -47, 6.5, '#fff', 2.5);
      if (mood === 'sleep') {
        ctx.beginPath(); ctx.arc(e * 10, -48, 4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 2.2; ctx.strokeStyle = C.out; ctx.stroke();
      } else {
        A.circle(ctx, e * 10 + 1, -46, 3, C.out, 0); A.circle(ctx, e * 10 + 2, -47.5, 1, '#fff', 0);
        if (mood === 'grump' || mood === 'held') A.line(ctx, [e * 16, -57, e * 5, -53], 2.8, C.out);
      }
    }
    // mouth + blush
    if (mood === 'sleep') A.circle(ctx, 0, -14, 2.6, '#9c2f20', 1.6);
    else if (mood === 'grump' || mood === 'held') { ctx.beginPath(); ctx.arc(0, -10, 5, 1.15 * Math.PI, 1.85 * Math.PI); ctx.lineWidth = 2.4; ctx.strokeStyle = C.out; ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(0, -17, 4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 2.4; ctx.strokeStyle = C.out; ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,90,120,0.45)';
    ctx.beginPath(); ctx.ellipse(-16, -14, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16, -14, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function sleepArm(sd, mood) {
    if (mood === 'sleep') return { x: sd * 30, y: -8 };
    if (mood === 'held') return sd > 0 ? { x: 22, y: -48 } : { x: -34, y: -30 };
    return { x: sd * 34, y: -32 };
  }

  function drawJelly(ctx, x, y, s, t, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(s, s);
    var p = Math.sin(t * 3);
    A.glow(ctx, 0, 0, 86, 'rgba(255,170,230,', 0.32);
    for (var i = 0; i < 5; i++) {
      var tx = -24 + i * 12;
      ctx.beginPath(); ctx.moveTo(tx, 6);
      for (var k = 1; k <= 5; k++) ctx.lineTo(tx + Math.sin(t * 3 + i * 1.3 + k * 0.9) * k * 1.6, 6 + k * 11 + p * k);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = C.out; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = i % 2 ? '#f6c3ef' : '#d9a6f5'; ctx.lineWidth = 2.6; ctx.stroke();
    }
    ctx.save(); ctx.scale(1 + p * 0.06, 1 - p * 0.06);
    ctx.beginPath(); ctx.moveTo(-40, 8); ctx.bezierCurveTo(-43, -46, 43, -46, 40, 8);
    for (var j = 0; j < 5; j++) { var x0 = 40 - j * 16; ctx.quadraticCurveTo(x0 - 8, 17, x0 - 16, 8); }
    ctx.closePath();
    var g = ctx.createLinearGradient(0, -36, 0, 12);
    g.addColorStop(0, '#ffe3f5'); g.addColorStop(1, '#d59bf2');
    A.fs(ctx, g, 3);
    A.ellipse(ctx, 0, -8, 27, 15, 'rgba(255,255,255,0.22)', 0);
    A.highlight(ctx, -19, -22, 8, 4, 0.75);
    A.ellipse(ctx, -11, -6, 3.4, 4, C.out, 0); A.ellipse(ctx, 11, -6, 3.4, 4, C.out, 0);
    A.circle(ctx, -10, -7.5, 1.3, '#fff', 0); A.circle(ctx, 12, -7.5, 1.3, '#fff', 0);
    ctx.beginPath(); ctx.arc(0, -2, 4.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 2.2; ctx.strokeStyle = C.out; ctx.stroke();
    ctx.fillStyle = 'rgba(255,100,160,0.45)';
    ctx.beginPath(); ctx.ellipse(-20, -1, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(20, -1, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function drawBucket(ctx, x, y, s, kinds, count, bounce) {
    ctx.save(); ctx.translate(x, y);
    var sq = Math.sin(bounce * Math.PI) * 0.12;
    ctx.scale(s * (1 + sq), s * (1 - sq));
    A.shadow(ctx, 0, 1, 40, 8);
    ctx.beginPath(); ctx.arc(0, -52, 30, Math.PI * 1.05, Math.PI * 1.95);
    ctx.lineCap = 'round'; ctx.strokeStyle = C.out; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#c9d6ea'; ctx.lineWidth = 2.6; ctx.stroke();
    A.ellipse(ctx, 0, -52, 32, 9, '#2d5c9a', 3);
    var n = Math.min(kinds.length, 4);
    for (var i = 0; i < n; i++) {
      var k = kinds[kinds.length - 1 - i], p = A.FISH[k] || A.FISH.sunny;
      ctx.save(); ctx.translate(-16 + i * 11, -52); ctx.rotate(-0.35 + i * 0.25);
      A.poly(ctx, [0, 2, -9, -17, 0, -12, 9, -17], p.fin, 2.5);
      ctx.restore();
    }
    var body = function (c) { c.moveTo(-32, -52); c.lineTo(-25, -1); c.quadraticCurveTo(0, 6, 25, -1); c.lineTo(32, -52); c.quadraticCurveTo(0, -42, -32, -52); c.closePath(); };
    A.shape(ctx, body, '#4a8fe0', 3);
    ctx.save(); ctx.beginPath(); body(ctx); ctx.clip();
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#16305e'; ctx.fillRect(10, -60, 30, 70); ctx.restore();
    A.shape(ctx, body, null, 3);
    A.line(ctx, [-29, -38, 0, -32, 29, -38], 2.5, '#2f6db8');
    A.line(ctx, [-26, -9, 0, -4, 26, -9], 2.5, '#2f6db8');
    A.highlight(ctx, -20, -30, 3, 10, 0.5);
    // count badge
    A.circle(ctx, 0, -21, 14, '#fff', 2.5);
    ctx.fillStyle = C.out; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 17px ' + AB.FONT; ctx.fillText(String(count), 0, -20);
    ctx.restore();
  }

  function drawStool(ctx, x, y) {
    A.shadow(ctx, x, SURF + 2, 32, 6);
    var legs = [[x - 16, y + 6, x - 25, SURF], [x + 16, y + 6, x + 25, SURF], [x, y + 6, x + 2, SURF - 2]];
    for (var i = 0; i < legs.length; i++) { A.line(ctx, legs[i], 8, C.out); A.line(ctx, legs[i], 4.5, i === 2 ? C.woodDark : C.wood); }
    A.line(ctx, [x - 21, y + 20, x + 21, y + 20], 5, C.out); A.line(ctx, [x - 21, y + 20, x + 21, y + 20], 2.4, C.woodDark);
    A.box(ctx, x - 28, y, 56, 10, 4, C.wood, 3);
    A.line(ctx, [x - 22, y + 3, x + 22, y + 3], 1.6, C.woodLight);
  }

  function drawLantern(ctx, x, y, t) {
    A.glow(ctx, x, y - 24, 96 + Math.sin(t * 2.3) * 5, C.lampGlow, 0.5);
    A.shadow(ctx, x, y + 1, 18, 5);
    ctx.beginPath(); ctx.arc(x, y - 44, 9, Math.PI, 0); ctx.strokeStyle = C.out; ctx.lineWidth = 3; ctx.stroke();
    A.box(ctx, x - 15, y - 9, 30, 9, 3, '#3c4a6b', 2.5);
    A.box(ctx, x - 11, y - 37, 22, 29, 6, '#ffe7a3', 2.5);
    A.ellipse(ctx, x, y - 22, 4.5 + Math.sin(t * 9) * 0.6, 8, C.warmGlow, 0);
    A.ellipse(ctx, x, y - 20, 2.4, 4, '#fff6d8', 0);
    A.line(ctx, [x, y - 37, x, y - 9], 2, '#3c4a6b');
    A.poly(ctx, [x - 15, y - 37, x + 15, y - 37, x, y - 47], '#3c4a6b', 2.5);
    A.ellipse(ctx, x - 3, y - 44, 8, 3, C.snow, 1.5);
  }

  function drawWeed(ctx, x, y, h, t, ph, col) {
    for (var b = -1; b <= 1; b++) {
      var hh = h * (b === 0 ? 1 : 0.72), sway = Math.sin(t * 1.3 + ph + b) * 14 + b * 12;
      var bx = x + b * 9;
      ctx.beginPath();
      ctx.moveTo(bx - 6, y + 4);
      ctx.quadraticCurveTo(bx - 10 + sway * 0.3, y - hh * 0.5, bx + sway, y - hh);
      ctx.quadraticCurveTo(bx + 8 + sway * 0.4, y - hh * 0.45, bx + 6, y + 4);
      ctx.closePath();
      A.fs(ctx, b === 0 ? col : U.shade(col, -0.15), 2.5);
      ctx.save(); ctx.globalAlpha = 0.35;
      A.line(ctx, [bx, y, bx + sway * 0.35 - 2, y - hh * 0.5, bx + sway * 0.9, y - hh * 0.92], 1.6, '#e6ffe8');
      ctx.restore();
    }
  }

  function drawTimer(ctx, x, y, r, frac, t) {
    var warn = frac < 10 / DUR && frac > 0;
    var pulse = warn ? 1 + 0.06 * Math.sin(t * 10) : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
    A.shadow(ctx, 0, r + 8, r * 0.8, 6, 0.18);
    A.circle(ctx, 0, 0, r + 7, '#fff', 3);
    A.circle(ctx, 0, 0, r, '#dce7f8', 0);
    if (frac > 0) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.closePath();
      ctx.fillStyle = warn ? C.orange : C.warm; ctx.fill();
    }
    A.circle(ctx, 0, 0, r, null, 2.5, C.outSoft);
    A.snowflake(ctx, 0, 0, r * 0.52, C.out, 6.5);
    A.snowflake(ctx, 0, 0, r * 0.52, '#fff', 3.4);
    var a = -Math.PI / 2 + frac * Math.PI * 2, sx = Math.cos(a) * r, sy = Math.sin(a) * r;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t);
    for (var i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); A.line(ctx, [0, 11, 0, 15], 3, C.coinDark); }
    ctx.restore();
    A.circle(ctx, sx, sy, 10, C.yellow, 2.5);
    A.highlight(ctx, sx - 3, sy - 3, 3, 2, 0.8);
    ctx.restore();
  }

  function drawFinger(ctx, x, y, s, press) {
    ctx.save(); ctx.translate(x, y); var k = s * (press ? 0.9 : 1); ctx.scale(k, k);
    if (press) { ctx.save(); ctx.globalAlpha = 0.6; A.circle(ctx, 0, -38, 22, null, 4, '#fff'); ctx.restore(); }
    A.box(ctx, -9, -40, 18, 46, 9, '#ffe0c8', 3);
    A.ellipse(ctx, 2, 18, 24, 22, '#ffe0c8', 3);
    A.box(ctx, -9, -10, 18, 22, 8, '#ffe0c8', 0);
    A.line(ctx, [-9, -6, -9, 4], 3);
    A.ellipse(ctx, 0, -32, 5, 4, '#fff3ea', 0);
    ctx.restore();
  }

  function outlinedText(ctx, txt, x, y, size, fill) {
    ctx.font = '800 ' + size + 'px ' + AB.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size * 0.2); ctx.strokeStyle = C.out; ctx.strokeText(txt, x, y);
    ctx.fillStyle = fill || '#fff'; ctx.fillText(txt, x, y);
  }

  // ---- static backgrounds ---------------------------------------------------
  function bakeSky() {
    return A.bake(W, SURF + 30, 2, function (ctx) {
      A.sky(ctx, W, SURF + 30, SURF + 30);
      A.glow(ctx, 330, 74, 70, 'rgba(255,248,220,', 0.4);
      A.circle(ctx, 330, 74, 24, '#fff7dc', 2.5, '#e9dcb5');
      A.circle(ctx, 322, 68, 4, 'rgba(220,205,160,0.7)', 0); A.circle(ctx, 337, 82, 5, 'rgba(220,205,160,0.7)', 0);
    });
  }

  function bakeScene() {
    return A.bake(W, H, 2, function (ctx) {
      var rnd = U.seeded(4242), i;
      // far snowy hills
      A.drift(ctx, 140, SURF + 4, 520, 70, '#e3ebf9');
      A.drift(ctx, 560, SURF + 4, 600, 52, '#e8effa');
      A.drift(ctx, 1040, SURF + 4, 640, 80, '#e3ebf9');
      // back row of small pines
      for (i = 0; i < 16; i++) {
        var px = 30 + i * 82 + rnd() * 30;
        if (px > 520 && px < 820) continue;
        A.pine(ctx, px, SURF - 6 - rnd() * 6, 62 + rnd() * 30);
      }
      // cosy igloo far away
      A.igloo(ctx, 300, SURF - 2, 0.55, { flag: C.red });
      A.pine(ctx, 70, SURF + 2, 196); A.pine(ctx, 185, SURF + 4, 150);
      A.pine(ctx, 1065, SURF + 4, 172); A.pine(ctx, 1190, SURF + 2, 214);
      // ---- underwater body --------------------------------------------------
      var g = ctx.createLinearGradient(0, ICEB, 0, H);
      g.addColorStop(0, '#86d3ef'); g.addColorStop(0.35, '#4f9fcc'); g.addColorStop(0.75, '#2d6c9f'); g.addColorStop(1, '#1f5585');
      ctx.fillStyle = g; ctx.fillRect(0, ICEB - 4, W, H - ICEB + 4);
      // water inside the hole
      ctx.fillStyle = '#86d3ef'; ctx.fillRect(HX - HW, WATERY, HW * 2, ICEB - WATERY + 2);
      // distant underwater hills
      ctx.fillStyle = 'rgba(40,100,160,0.35)';
      ctx.beginPath(); ctx.moveTo(0, FLOORY);
      for (i = 0; i <= 16; i++) ctx.lineTo(i * 80, FLOORY - 50 - Math.sin(i * 1.3) * 34 - rnd() * 20);
      ctx.lineTo(W, FLOORY + 20); ctx.lineTo(0, FLOORY + 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(30,80,140,0.35)';
      ctx.beginPath(); ctx.moveTo(0, FLOORY);
      for (i = 0; i <= 12; i++) ctx.lineTo(i * 110, FLOORY - 22 - Math.sin(i * 2.1 + 1) * 18);
      ctx.lineTo(W, FLOORY + 20); ctx.lineTo(0, FLOORY + 20); ctx.closePath(); ctx.fill();
      // lake floor
      ctx.beginPath(); ctx.moveTo(-10, H + 10); ctx.lineTo(-10, FLOORY + 4);
      for (i = 0; i <= 20; i++) { var fx = i * 64; ctx.quadraticCurveTo(fx + 32, FLOORY - 6 + Math.sin(i * 1.7) * 6, fx + 64, FLOORY + 2 + Math.sin(i * 0.9) * 4); }
      ctx.lineTo(W + 10, H + 10); ctx.closePath();
      var fg = ctx.createLinearGradient(0, FLOORY - 10, 0, H);
      fg.addColorStop(0, '#a9c6c9'); fg.addColorStop(1, '#7d9fb0');
      A.fs(ctx, fg, 3);
      for (i = 0; i < 70; i++) {
        var ex = rnd() * W, ey = FLOORY + 12 + rnd() * 38;
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(220,236,236,0.6)' : 'rgba(80,110,140,0.35)';
        ctx.beginPath(); ctx.ellipse(ex, ey, 2 + rnd() * 4, 1.5 + rnd() * 2, 0, 0, Math.PI * 2); ctx.fill();
      }
      A.rock(ctx, 120, FLOORY + 14, 110, 60); A.rock(ctx, 205, FLOORY + 18, 60, 34);
      A.rock(ctx, 1150, FLOORY + 16, 130, 74); A.rock(ctx, 1045, FLOORY + 20, 56, 30);
      A.rock(ctx, 470, FLOORY + 22, 48, 26);
      A.shell(ctx, 330, FLOORY + 26, 0.9, '#ffc2a8'); A.shell(ctx, 900, FLOORY + 30, 0.8, '#ffd6e6');
      A.star(ctx, 610, FLOORY + 30, 14, '#ff9a6b', 2.5, 5, 0.5, -1.3);
      A.star(ctx, 990, FLOORY + 24, 11, '#ffcf4a', 2.5, 5, 0.5, -1.7);
      // ---- ice slab -----------------------------------------------------------
      function slab(x0, x1) {
        ctx.save();
        ctx.beginPath(); ctx.moveTo(x0, SURF + 6); ctx.lineTo(x1, SURF + 6); ctx.lineTo(x1, ICEB);
        var steps = Math.max(2, Math.round((x1 - x0) / 26));
        for (var s = 0; s <= steps; s++) { var sx = x1 - (x1 - x0) * s / steps; ctx.lineTo(sx, ICEB + (s % 2 ? 4 : -1)); }
        ctx.closePath();
        var ig = ctx.createLinearGradient(0, SURF, 0, ICEB);
        ig.addColorStop(0, '#e6f7fd'); ig.addColorStop(1, '#9fd6ee');
        A.fs(ctx, ig, 3);
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
        for (var l = 0; l < 3; l++) { ctx.beginPath(); ctx.moveTo(x0, SURF + 18 + l * 10); ctx.bezierCurveTo(x0 + 200, SURF + 12 + l * 11, x1 - 200, SURF + 26 + l * 9, x1, SURF + 18 + l * 10); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(80,150,200,0.5)'; ctx.lineWidth = 1.6;
        for (var k = 0; k < 6; k++) {
          var cx = x0 + 40 + rnd() * (x1 - x0 - 80), cy = SURF + 14 + rnd() * 18;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 10, cy + 8); ctx.lineTo(cx + 6, cy + 18); ctx.moveTo(cx + 10, cy + 8); ctx.lineTo(cx + 22, cy + 10); ctx.stroke();
        }
        for (var b = 0; b < 14; b++) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(x0 + rnd() * (x1 - x0), SURF + 16 + rnd() * 26, 1 + rnd() * 2.2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        // icicles
        for (var ic = 0; ic < (x1 - x0) / 70; ic++) {
          var ix = x0 + 30 + rnd() * (x1 - x0 - 60), il = 8 + rnd() * 14;
          A.poly(ctx, [ix - 5, ICEB - 1, ix + 5, ICEB - 1, ix + 1, ICEB + il], '#d8f2fb', 2);
        }
      }
      slab(-10, HX - HW); slab(HX + HW, W + 10);
      // back wall of the hole
      ctx.fillStyle = '#9fd3ea'; ctx.fillRect(HX - HW, SURF + 4, HW * 2, WATERY - SURF - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(HX - HW, SURF + 4, HW * 2, 5);
      A.line(ctx, [HX - HW, SURF + 2, HX - HW, ICEB], 3); A.line(ctx, [HX + HW, SURF + 2, HX + HW, ICEB], 3);
      // snow layer on top of ice
      function snowTop(x0, x1) {
        ctx.beginPath(); ctx.moveTo(x0, SURF + 12);
        var n = Math.max(2, Math.round((x1 - x0) / 60));
        ctx.lineTo(x0, SURF);
        for (var s = 0; s < n; s++) { var a = x0 + (x1 - x0) * s / n, b = x0 + (x1 - x0) * (s + 1) / n; ctx.quadraticCurveTo((a + b) / 2, SURF - 7 - rnd() * 4, b, SURF); }
        ctx.lineTo(x1, SURF + 12);
        for (var r = n; r > 0; r--) { var c2 = x0 + (x1 - x0) * r / n, d = x0 + (x1 - x0) * (r - 1) / n; ctx.quadraticCurveTo((c2 + d) / 2, SURF + 16, d, SURF + 12); }
        ctx.closePath(); A.fs(ctx, C.snow, 2.5, C.snowDeep);
      }
      snowTop(-10, HX - HW); snowTop(HX + HW, W + 10);
      A.drift(ctx, HX - HW - 20, SURF + 3, 52, 16); A.drift(ctx, HX + HW + 22, SURF + 3, 56, 18);
      A.drift(ctx, 880, SURF + 2, 140, 22); A.drift(ctx, 260, SURF + 3, 180, 20);
      A.drift(ctx, 1220, SURF + 2, 120, 26);
      // weed-free rays get drawn live; scattered snow sparkles on the bank
      for (i = 0; i < 26; i++) A.sparkle(ctx, rnd() * W, SURF - 2 + rnd() * 8, 2 + rnd() * 2, 0.7);
    });
  }

  // ---- tutorial mini-scenes ------------------------------------------------
  function tutBg(ctx, w, h, t) {
    var sy = Math.round(h * 0.3), hx = w * 0.56;
    var g = ctx.createLinearGradient(0, 0, 0, sy);
    g.addColorStop(0, C.skyTop); g.addColorStop(1, C.skyLow);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, sy + 2);
    A.aurora(ctx, w, 4, 40, t, 0.4);
    A.pine(ctx, 30, sy, 60); A.pine(ctx, w - 26, sy, 70);
    var wg = ctx.createLinearGradient(0, sy, 0, h);
    wg.addColorStop(0, '#86d3ef'); wg.addColorStop(1, '#2d6c9f');
    ctx.fillStyle = wg; ctx.fillRect(0, sy, w, h - sy);
    A.box(ctx, -6, sy, hx - 20 + 6, 16, 3, C.ice, 2.5);
    A.box(ctx, hx + 20, sy, w - hx - 14, 16, 3, C.ice, 2.5);
    A.box(ctx, -6, sy - 4, hx - 20 + 6, 7, 3, C.snow, 2);
    A.box(ctx, hx + 20, sy - 4, w - hx - 14, 7, 3, C.snow, 2);
    ctx.fillStyle = '#6aa6c4'; ctx.fillRect(0, h - 14, w, 14);
    drawWeed(ctx, 40, h - 12, 40, t, 0, C.green); drawWeed(ctx, w - 50, h - 12, 34, t, 2, C.teal);
    return { sy: sy, hx: hx };
  }

  var TUTORIAL = [
    {
      caption: 'Tap to drop line',
      draw: function (ctx, w, h, t) {
        var b = tutBg(ctx, w, h, t), cyc = t % 3, p = cyc < 1.6 ? cyc / 1.6 : cyc < 2 ? 1 : 1 - (cyc - 2);
        var hy = b.sy + 14 + U.ease(U.clamp(p, 0, 1)) * (h - b.sy - 50);
        A.line(ctx, [b.hx, 6, b.hx, hy - 18], 1.6, '#fff');
        drawHook(ctx, b.hx, hy, 0.75, t);
        drawFinger(ctx, w * 0.82, h * 0.72, 0.8, cyc < 0.25 || (cyc > 2 && cyc < 2.25));
        if (cyc < 1.6) { A.poly(ctx, [w * 0.82 - 10, h * 0.32, w * 0.82 + 10, h * 0.32, w * 0.82, h * 0.42], C.warm, 2.5); }
        else if (cyc > 2) { A.poly(ctx, [w * 0.82 - 10, h * 0.42, w * 0.82 + 10, h * 0.42, w * 0.82, h * 0.32], C.warm, 2.5); }
      }
    },
    {
      caption: 'Hook a fish!',
      draw: function (ctx, w, h, t) {
        var b = tutBg(ctx, w, h, t), cyc = t % 4, deep = h * 0.66;
        var hy = deep, fx, fy = deep + 14, caught = cyc > 1.4;
        if (!caught) fx = -30 + (b.hx - 10 + 30) * (cyc / 1.4);
        if (cyc > 1.4 && cyc < 2.8) hy = deep - (deep - b.sy - 6) * U.ease((cyc - 1.4) / 1.4);
        else if (cyc >= 2.8) hy = b.sy + 6;
        A.line(ctx, [b.hx, 6, b.hx, hy - 18], 1.6, '#fff');
        drawHook(ctx, b.hx, hy, 0.75, t);
        drawBucket(ctx, w * 0.2, b.sy - 4, 0.55, ['sunny'], cyc > 3.3 ? 1 : 0, 0);
        if (!caught) drawFishAt(ctx, fx, fy, 'sunny', 0.9, 1, t);
        else if (cyc < 2.8) {
          ctx.save(); ctx.translate(b.hx, hy); ctx.rotate(-Math.PI / 2 + Math.sin(t * 14) * 0.3); A.fish(ctx, -24, 0, 0.9, 'sunny', t * 1.5); ctx.restore();
        } else if (cyc < 3.3) {
          var q = (cyc - 2.8) / 0.5;
          var x = U.lerp(b.hx, w * 0.2, q), y = U.lerp(b.sy, b.sy - 30, q) - Math.sin(q * Math.PI) * 50;
          drawFishAt(ctx, x, y, 'sunny', 0.8, -1, t, q * 6);
        } else { for (var i = 0; i < 4; i++) A.star(ctx, w * 0.2 + Math.cos(i * 1.6 + t * 3) * 30, b.sy - 50 + Math.sin(i * 1.6 + t * 3) * 14, 6, C.yellow, 2); }
      }
    },
    {
      caption: 'Dodge the jellyfish',
      draw: function (ctx, w, h, t) {
        var b = tutBg(ctx, w, h, t), cyc = t % 4;
        var jx = b.hx + 34 - Math.min(cyc, 1.6) * 10, jy = h * 0.55;
        var hy = h * 0.84 - Math.min(cyc, 1.6) / 1.6 * (h * 0.84 - jy - 10);
        if (cyc > 1.6) hy = jy + 10 - (cyc - 1.6) * 40;
        A.line(ctx, [b.hx, 6, b.hx, hy - 18], 1.6, '#fff');
        drawHook(ctx, b.hx, hy, 0.75, t);
        drawJelly(ctx, jx, jy, 0.6, t, 1);
        if (cyc < 1.6) {
          ctx.save(); ctx.translate(b.hx, hy); ctx.rotate(-Math.PI / 2 + Math.sin(t * 14) * 0.3); A.fish(ctx, -24, 0, 0.85, 'rosy', t * 1.5); ctx.restore();
        } else {
          var q = cyc - 1.6;
          for (var i = 0; i < 7; i++) {
            var a = i / 7 * Math.PI * 2;
            ctx.save(); ctx.globalAlpha = Math.max(0, 1 - q * 1.5);
            A.circle(ctx, b.hx + Math.cos(a) * (10 + q * 40), hy + 24 + Math.sin(a) * (10 + q * 40), 6, 'rgba(255,255,255,0.35)', 2, '#fff');
            ctx.restore();
          }
          drawFishAt(ctx, b.hx - 10 - q * 110, hy + 30 + Math.sin(q * 8) * 4, 'rosy', 0.85, -1, t * 2);
        }
      }
    }
  ];

  // ---- the game -----------------------------------------------------------
  AB.registerMinigame({
    id: 'fishing',
    title: 'Ice Fishing',
    tutorial: TUTORIAL,
    create: function (host) {
      var skyC = null, sceneC = null;
      try { skyC = bakeSky(); sceneC = bakeScene(); } catch (e) { skyC = sceneC = null; }
      var snow = new A.SnowField(55, W, SURF + 4, { wind: 10 });

      var S = {
        time: 0, ended: false, endT: 0, finished: false,
        mode: 'idle', hookX: HX, hookVX: 0, hookY: TOPY, aimX: HX,
        carry: null, points: 0, caught: 0, best: null, kinds: [], shown: 0,
        happyT: 0, oopsT: 0, bucketB: 0, reelA: 0, lineJerk: 0,
        fish: [], junk: [], piles: [], parts: [], floats: [], flyers: [],
        lastRare: 0, bubT: 0, everDropped: false, warned: false,
        jelly: { x: -120, y: 560, tx: 300, ty: 560, alpha: 0, cool: 0, wob: 0 },
        crab: { x: 420, y: CRABY, state: 'sleep', t: 0, tx: 420, dir: 1, vy: 0, zT: 0 },
        press: null, keyDir: 0, keys: {}
      };

      var weeds = (function () {
        var r = U.seeded(99), out = [], cols = [C.green, C.teal, '#4fae7a', C.greenDark];
        for (var i = 0; i < 14; i++) out.push({ x: 40 + i * 90 + r() * 40, h: 50 + r() * 70, ph: r() * 6, c: cols[i % cols.length] });
        return out;
      })();

      // ---- spawning -------------------------------------------------------
      function pickKind() {
        var since = S.time - S.lastRare;
        var r = Math.random();
        if (since > 13) { S.lastRare = S.time; return Math.random() < 0.35 ? 'star' : 'gold'; }
        if (r < 0.05) { S.lastRare = S.time; return 'star'; }
        if (r < 0.14) { S.lastRare = S.time; return 'gold'; }
        return U.pick(COMMON);
      }
      function spawnFish(anywhere) {
        var kind = pickKind(), dir = Math.random() < 0.5 ? 1 : -1;
        var s = kind === 'gold' ? 1.7 : kind === 'star' ? 1.3 : U.rand(1.1, 1.3);
        var sp = U.rand(60, 100) * (kind === 'gold' ? 0.8 : kind === 'star' ? 1.35 : 1);
        var y = U.rand(370, 770);
        for (var tries = 0; tries < 6; tries++) {
          var ok = true;
          for (var i = 0; i < S.fish.length; i++) if (Math.abs(S.fish[i].baseY - y) < 46 && Math.abs(S.fish[i].x - (dir > 0 ? -60 : W + 60)) < 300) ok = false;
          if (ok) break; y = U.rand(370, 770);
        }
        S.fish.push({
          kind: kind, s: s, dir: dir, sp: sp, baseY: y, y: y, ph: Math.random() * 6, flee: 0,
          x: anywhere ? U.rand(80, W - 80) : (dir > 0 ? -70 : W + 70)
        });
      }
      function spawnJunk(anywhere) {
        var dir = Math.random() < 0.5 ? 1 : -1;
        S.junk.push({
          type: Math.random() < 0.55 ? 'boot' : 'can', dir: dir, vx: dir * U.rand(18, 32),
          x: anywhere ? U.rand(150, W - 150) : (dir > 0 ? -50 : W + 50),
          baseY: U.rand(430, 740), y: 0, rot: U.rand(-0.6, 0.6), vr: U.rand(-0.4, 0.4), ph: Math.random() * 6
        });
      }
      for (var i0 = 0; i0 < 5; i0++) spawnFish(true);
      spawnJunk(true);

      // ---- particles --------------------------------------------------------
      function part(o) { S.parts.push(o); if (S.parts.length > 260) S.parts.shift(); }
      function bubbles(x, y, n, spread) {
        for (var i = 0; i < n; i++) part({ type: 'bub', x: x + U.rand(-spread, spread), y: y + U.rand(-spread, spread), vx: U.rand(-10, 10), vy: U.rand(-90, -40), r: U.rand(2.5, 6), life: U.rand(1, 2), max: 2, ph: Math.random() * 6 });
      }
      function splash(x, y) {
        for (var i = 0; i < 12; i++) part({ type: 'drop', x: x + U.rand(-30, 30), y: y, vx: U.rand(-110, 110), vy: U.rand(-260, -120), g: 620, r: U.rand(3, 6), life: 0.8, max: 0.8 });
        part({ type: 'ring', x: x, y: y, r: 10, life: 0.6, max: 0.6 });
      }
      function stars(x, y, n, col) {
        for (var i = 0; i < n; i++) {
          var a = Math.random() * Math.PI * 2, sp = U.rand(80, 220);
          part({ type: 'star', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, g: 300, r: U.rand(6, 11), rot: Math.random() * 6, vr: U.rand(-6, 6), col: col || C.yellow, life: U.rand(0.7, 1.1), max: 1.1 });
        }
      }
      function floatText(txt, x, y, col) { S.floats.push({ txt: txt, x: x, y: y, life: 1.2, col: col || '#fff' }); }

      // ---- core actions -----------------------------------------------------
      function startDrop() {
        if (S.ended || S.carry) return;
        if (S.mode === 'idle' || S.mode === 'up') { S.mode = 'down'; S.everDropped = true; sfx(host, S.hookY <= TOPY + 4 ? 'splash' : 'tap'); return true; }
        return false;
      }
      function startReel() {
        if (S.ended) return;
        if (S.mode === 'down' || S.mode === 'wait') { S.mode = 'up'; sfx(host, 'whoosh'); }
      }
      function toggle() {
        if (S.carry) return;
        if (S.mode === 'idle' || S.mode === 'up') startDrop(); else startReel();
      }

      function bite(f) {
        S.carry = { type: 'fish', kind: f.kind, s: f.s, dir: f.dir };
        S.mode = 'up'; S.lineJerk = 1;
        bubbles(S.hookX, S.hookY, 8, 14);
        stars(S.hookX, S.hookY, 4, '#fff');
        sfx(host, 'catch');
      }
      function snagJunk(j) {
        S.carry = { type: 'junk', jt: j.type, rot: j.rot };
        S.mode = 'up'; S.lineJerk = 0.6; S.oopsT = 1.2;
        bubbles(S.hookX, S.hookY, 6, 10);
        sfx(host, 'oops');
      }
      function snagCrab() {
        S.carry = { type: 'crab' };
        S.crab.state = 'held';
        S.mode = 'up'; S.lineJerk = 0.8; S.oopsT = 1.4;
        bubbles(S.hookX, S.hookY + 30, 10, 18);
        sfx(host, 'oops');
      }
      function catchFish(c, fromX, fromY) {
        var val = VALUES[c.kind] || 5;
        S.points += val; S.caught++;
        if (!S.best || val > VALUES[S.best]) S.best = c.kind;
        S.flyers.push({ type: 'fish', kind: c.kind, s: Math.min(c.s, 1.3), x0: fromX, y0: fromY, x1: BUCKX, y1: BUCKY - 56, t: 0, dur: 0.75, h: 170, spin: 6 });
        S.happyT = 1.4;
        floatText('+' + val, HX, SURF - 60, c.kind === 'gold' ? C.yellow : c.kind === 'star' ? '#d6c6ff' : '#fff');
        stars(fromX, fromY - 10, c.kind === 'gold' || c.kind === 'star' ? 12 : 6, c.kind === 'star' ? '#c9b4ff' : C.yellow);
        sfx(host, c.kind === 'star' ? 'star' : 'success');
      }
      function arrive() {
        var c = S.carry; S.carry = null;
        if (!c) return;
        splash(HX, WATERY);
        if (c.type === 'fish') { sfx(host, 'splash'); catchFish(c, HX, WATERY); }
        else if (c.type === 'junk') {
          S.flyers.push({ type: 'junk', jt: c.jt, x0: HX, y0: WATERY, x1: U.rand(830, 980), y1: SURF + 2, t: 0, dur: 0.9, h: 190, spin: 9 });
          sfx(host, 'whoosh');
        } else if (c.type === 'crab') {
          S.flyers.push({ type: 'crab', x0: HX, y0: WATERY, x1: HX, y1: WATERY + 10, t: 0, dur: 1.0, h: 190, spin: 0 });
          sfx(host, 'jump');
        }
      }
      function slipFish() {
        var c = S.carry; if (!c || c.type !== 'fish') return;
        S.carry = null;
        var px = S.hookX, py = S.hookY + 24;
        for (var i = 0; i < 10; i++) {
          var a = i / 10 * Math.PI * 2;
          part({ type: 'poof', x: px + Math.cos(a) * 8, y: py + Math.sin(a) * 8, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 20, r: U.rand(6, 11), life: 0.8, max: 0.8 });
        }
        bubbles(px, py, 8, 16);
        var dir = px < S.jelly.x ? -1 : 1;
        S.fish.push({ kind: c.kind, s: c.s, dir: dir, sp: 90, baseY: U.clamp(py, 370, 770), y: py, ph: 0, flee: 1.6, x: px });
        S.jelly.cool = 2.5; S.jelly.wob = 1;
        sfx(host, 'pop');
      }

      function endRound() {
        if (S.ended) return;
        S.ended = true; S.endT = 0;
        if (S.carry && S.carry.type === 'fish') { var c = S.carry; S.carry = null; catchFish(c, S.hookX, S.hookY); }
        else if (S.carry && S.carry.type === 'crab') { S.carry = null; S.crab.state = 'fall'; S.crab.x = S.hookX; S.crab.y = S.hookY + 40; S.crab.vy = 0; }
        else S.carry = null;
        if (S.mode !== 'idle') S.mode = 'up';
        sfx(host, 'bell');
        for (var i = 0; i < 26; i++) part({ type: 'star', x: U.rand(100, W - 100), y: U.rand(-40, 40), vx: U.rand(-30, 30), vy: U.rand(40, 140), g: 60, r: U.rand(7, 12), rot: Math.random() * 6, vr: U.rand(-3, 3), col: U.pick([C.yellow, C.pink, '#8fe3ff', '#c9b4ff']), life: 2.2, max: 2.2 });
      }
      function doFinish() {
        if (S.finished) return; S.finished = true;
        var coins = Math.round(U.clamp(S.points, 15, 120));
        var bestVal = S.best ? VALUES[S.best] : 0;
        try {
          host.finish({
            score: S.points,
            coins: coins,
            stats: [
              { icon: 'fish', label: 'Fish', value: S.caught },
              { icon: S.best === 'star' ? 'star' : S.best === 'gold' ? 'coin' : 'fish', label: 'Best fish', value: bestVal },
              { icon: 'coin', label: 'Points', value: S.points }
            ]
          });
        } catch (e) { /* shell problem: never throw */ }
      }

      // ---- update -------------------------------------------------------------
      function update(dt) {
        dt = Math.min(dt || 0, 0.05);
        if (S.finished) return;
        if (!S.ended) S.time += dt;
        var prog = U.clamp(S.time / DUR, 0, 1);
        var remaining = DUR - S.time;
        if (!S.ended && remaining <= 10 && !S.warned) { S.warned = true; sfx(host, 'ding'); }
        if (!S.ended && remaining <= 0) endRound();
        if (S.ended) { S.endT += dt; if (S.endT > 2.4 && !S.flyers.length) doFinish(); if (S.endT > 4) doFinish(); }

        S.happyT = Math.max(0, S.happyT - dt); S.oopsT = Math.max(0, S.oopsT - dt);
        S.bucketB = Math.max(0, S.bucketB - dt * 2.5); S.lineJerk = Math.max(0, S.lineJerk - dt * 2);
        if (S.press) S.press.t += dt;

        // --- hook horizontal (swinging line)
        if (S.keyDir && !S.ended) S.aimX = U.clamp(S.aimX + S.keyDir * 320 * dt, HX - 340, HX + 340);
        var off = maxOffAt(S.hookY);
        var tx = S.mode === 'idle' ? HX : U.clamp(S.aimX, HX - off, HX + off);
        S.hookVX += ((tx - S.hookX) * 26 - S.hookVX * 6.5) * dt;
        S.hookX += S.hookVX * dt;
        if (Math.abs(S.hookX - HX) > off + 8) { S.hookX = HX + Math.sign(S.hookX - HX) * (off + 8); S.hookVX *= 0.5; }
        if (S.hookY < ICEB + 6) S.hookX = U.clamp(S.hookX, HX - HW + 16, HX + HW - 10);

        // --- hook vertical
        if (S.mode === 'down') {
          S.hookY += (200 + prog * 40) * dt;
          if (S.hookY >= MAXY) { S.hookY = MAXY; S.mode = 'wait'; }
        } else if (S.mode === 'wait') {
          S.hookY = MAXY - 4 + Math.sin(S.time * 3) * 4;
        } else if (S.mode === 'up') {
          var sp = !S.carry ? 520 : S.carry.type === 'fish' ? 230 : S.carry.type === 'crab' ? 170 : 210;
          if (S.ended) sp = 600;
          S.hookY -= sp * dt;
          S.reelA += dt * (sp / 30);
          if (S.hookY <= TOPY) { S.hookY = TOPY; S.mode = 'idle'; if (!S.ended) arrive(); else S.carry = null; }
        } else { S.hookY = TOPY; }
        if (S.mode === 'down' && S.hookY > ICEB) { S.bubT -= dt; if (S.bubT <= 0) { S.bubT = 0.12; bubbles(S.hookX, S.hookY - 30, 1, 3); } }

        var hx = S.hookX, hy = S.hookY;
        var inWater = hy > ICEB + 14 && S.mode !== 'idle' && !S.ended;

        // --- fish
        var speedMul = 1 + prog * 0.6;
        var want = 5 + Math.round(prog * 2);
        for (var i = S.fish.length - 1; i >= 0; i--) {
          var f = S.fish[i];
          f.ph += dt;
          var vx = f.sp * speedMul;
          if (f.flee > 0) { f.flee -= dt; vx = 280 * (0.4 + f.flee / 1.6 * 0.6); }
          var d = U.dist(f.x, f.y, hx, hy);
          if (inWater && !S.carry && f.flee <= 0 && d < 160) {
            f.baseY += (hy - f.baseY) * 0.9 * dt;   // curious fish drift toward the bait
            vx *= 0.7;
          }
          f.x += f.dir * vx * dt;
          f.y = f.baseY + Math.sin(f.ph * 1.8) * 7;
          if (f.x < -110 || f.x > W + 110) { S.fish.splice(i, 1); continue; }
          if (inWater && !S.carry && f.flee <= 0 && d < 34 + 17 * f.s) { S.fish.splice(i, 1); bite(f); }
        }
        if (!S.ended && S.fish.length < want) spawnFish(false);

        // --- junk
        var wantJ = Math.min(3, 1 + Math.floor(S.time / 25));
        for (var j = S.junk.length - 1; j >= 0; j--) {
          var jk = S.junk[j];
          jk.ph += dt; jk.x += jk.vx * dt; jk.rot += jk.vr * dt * Math.sin(jk.ph * 0.7);
          jk.y = jk.baseY + Math.sin(jk.ph * 1.2) * 12;
          if (jk.x < -80 || jk.x > W + 80) { S.junk.splice(j, 1); continue; }
          if (inWater && !S.carry && U.dist(jk.x, jk.y, hx, hy) < 36) { S.junk.splice(j, 1); snagJunk(jk); }
        }
        if (!S.ended && S.junk.length < wantJ && Math.random() < dt * 0.4) spawnJunk(false);

        // --- jellyfish
        var jl = S.jelly;
        if (S.time > 8 && !S.ended) jl.alpha = Math.min(1, jl.alpha + dt * 0.6);
        else if (S.ended) jl.alpha = Math.max(0, jl.alpha - dt);
        jl.cool = Math.max(0, jl.cool - dt); jl.wob = Math.max(0, jl.wob - dt);
        var jdx = jl.tx - jl.x, jdy = jl.ty - jl.y, jd = Math.sqrt(jdx * jdx + jdy * jdy);
        if (jd < 20) { jl.tx = U.rand(140, W - 140); jl.ty = U.rand(420, 720); }
        else { var js = (32 + prog * 16) * dt; jl.x += jdx / jd * js; jl.y += jdy / jd * js; }
        var jyDraw = jl.y + Math.sin(S.time * 1.4) * 10;
        if (jl.alpha > 0.6 && jl.cool <= 0 && S.carry && S.carry.type === 'fish' && U.dist(hx, hy + 22, jl.x, jyDraw) < 62) slipFish();

        // --- crab
        var cr = S.crab;
        cr.t += dt; cr.zT -= dt;
        if (cr.state === 'sleep') {
          if (cr.zT <= 0) { cr.zT = 1.1; part({ type: 'z', x: cr.x + 16, y: cr.y - 56, vx: 12, vy: -26, r: 14, life: 1.8, max: 1.8 }); }
          if (cr.t > 9) { cr.state = 'awake'; cr.t = 0; cr.tx = U.rand(260, 1060); }
        } else if (cr.state === 'awake') {
          var cdx = cr.tx - cr.x;
          if (Math.abs(cdx) < 4 || cr.t > 6) { cr.state = 'sleep'; cr.t = 0; }
          else cr.x += Math.sign(cdx) * 45 * dt;
        } else if (cr.state === 'fall') {
          cr.vy = Math.min(cr.vy + 220 * dt, 150); cr.y += cr.vy * dt; cr.x += Math.sin(cr.t * 3) * 30 * dt;
          if (cr.y >= CRABY) { cr.y = CRABY; cr.state = 'grump'; cr.t = 0; bubbles(cr.x, CRABY - 10, 6, 20); }
        } else if (cr.state === 'grump') {
          if (cr.t > 1.8) { cr.state = 'sleep'; cr.t = 0; }
        }
        if (inWater && !S.carry && (cr.state === 'sleep' || cr.state === 'awake') && hy > MAXY - 22 && Math.abs(hx - cr.x) < 58) snagCrab();

        // --- flyers
        for (var k = S.flyers.length - 1; k >= 0; k--) {
          var fl = S.flyers[k];
          fl.t += dt;
          if (fl.t >= fl.dur) {
            S.flyers.splice(k, 1);
            if (fl.type === 'fish') { S.shown++; S.kinds.push(fl.kind); S.bucketB = 1; stars(BUCKX, BUCKY - 60, 5, C.yellow); sfx(host, 'coin'); }
            else if (fl.type === 'junk') { S.piles.push({ jt: fl.jt, x: fl.x1, rot: U.rand(-0.5, 0.5) + (fl.jt === 'can' ? 1.57 : 0) }); if (S.piles.length > 6) S.piles.shift(); for (var q = 0; q < 6; q++) part({ type: 'flake', x: fl.x1 + U.rand(-16, 16), y: SURF - 4, vx: U.rand(-60, 60), vy: U.rand(-120, -40), g: 300, r: U.rand(2, 4), life: 0.6, max: 0.6 }); sfx(host, 'tap'); }
            else if (fl.type === 'crab') { splash(HX, WATERY); sfx(host, 'splash'); cr.state = 'fall'; cr.x = HX; cr.y = ICEB + 40; cr.vy = 0; cr.t = 0; }
          }
        }

        // --- particles & floats
        for (var p = S.parts.length - 1; p >= 0; p--) {
          var pt = S.parts[p];
          pt.life -= dt;
          if (pt.g) pt.vy += pt.g * dt;
          if (pt.type === 'bub') { pt.ph += dt * 5; pt.x += Math.sin(pt.ph) * 18 * dt; }
          if (pt.type === 'poof') { pt.vx *= 0.92; pt.vy *= 0.92; }
          if (pt.vr) pt.rot += pt.vr * dt;
          pt.x += (pt.vx || 0) * dt; pt.y += (pt.vy || 0) * dt;
          if (pt.type === 'ring') pt.r += 70 * dt;
          var gone = pt.life <= 0 || (pt.type === 'bub' && (pt.y < (Math.abs(pt.x - HX) < HW ? WATERY : ICEB + 4)));
          if (gone) S.parts.splice(p, 1);
        }
        if (Math.random() < dt * 1.5) bubbles(weeds[Math.floor(Math.random() * weeds.length)].x, FLOORY - 20, 1, 6);
        for (var fi = S.floats.length - 1; fi >= 0; fi--) { var ft = S.floats[fi]; ft.life -= dt; ft.y -= 40 * dt; if (ft.life <= 0) S.floats.splice(fi, 1); }
        snow.update(dt);
      }

      // ---- draw ---------------------------------------------------------------
      function draw(ctx, t) {
        t = t || 0;
        ctx.save();
        // sky + aurora
        if (skyC) ctx.drawImage(skyC, 0, 0, W, SURF + 30); else { ctx.fillStyle = C.skyMid; ctx.fillRect(0, 0, W, SURF + 30); }
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, SURF); ctx.clip();
        A.aurora(ctx, W, 26, 150, t, 0.34);
        ctx.restore();
        if (sceneC) ctx.drawImage(sceneC, 0, 0, W, H); else { ctx.fillStyle = C.water; ctx.fillRect(0, ICEB, W, H - ICEB); }

        // light rays from the hole
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (var r = 0; r < 5; r++) {
          var a = 0.05 + 0.03 * Math.sin(t * 0.8 + r * 1.7);
          var spread = -260 + r * 130 + Math.sin(t * 0.3 + r) * 20;
          var gr = ctx.createLinearGradient(0, ICEB, 0, FLOORY);
          gr.addColorStop(0, 'rgba(210,245,255,' + (a * 1.6) + ')'); gr.addColorStop(1, 'rgba(210,245,255,0)');
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.moveTo(HX - 30 + r * 14, ICEB); ctx.lineTo(HX - 18 + r * 14, ICEB);
          ctx.lineTo(HX + spread + 50, FLOORY); ctx.lineTo(HX + spread - 20, FLOORY); ctx.closePath(); ctx.fill();
        }
        for (var r2 = 0; r2 < 4; r2++) {
          var rx = 140 + r2 * 330, aa = 0.035 + 0.02 * Math.sin(t * 0.6 + r2 * 2.3);
          var g2 = ctx.createLinearGradient(0, ICEB, 0, FLOORY - 100);
          g2.addColorStop(0, 'rgba(210,245,255,' + aa + ')'); g2.addColorStop(1, 'rgba(210,245,255,0)');
          ctx.fillStyle = g2;
          ctx.beginPath(); ctx.moveTo(rx, ICEB); ctx.lineTo(rx + 40, ICEB); ctx.lineTo(rx + 110, FLOORY - 100); ctx.lineTo(rx + 20, FLOORY - 100); ctx.closePath(); ctx.fill();
        }
        ctx.restore();

        // weeds
        for (var w = 0; w < weeds.length; w++) drawWeed(ctx, weeds[w].x, FLOORY + 6, weeds[w].h, t, weeds[w].ph, weeds[w].c);

        // crab on the floor
        var cr = S.crab;
        if (cr.state !== 'held') {
          var mood = cr.state === 'sleep' ? 'sleep' : cr.state === 'awake' ? 'awake' : 'grump';
          if (cr.state !== 'fall') A.shadow(ctx, cr.x, CRABY + 2, 34, 6, 0.25);
          drawCrab(ctx, cr.x, cr.y, 1, mood, t);
        }

        // junk
        for (var j = 0; j < S.junk.length; j++) {
          var jk = S.junk[j];
          if (jk.type === 'boot') drawBoot(ctx, jk.x, jk.y, 1, jk.rot); else drawCan(ctx, jk.x, jk.y, 1, jk.rot);
        }
        // fish
        for (var f = 0; f < S.fish.length; f++) {
          var fs = S.fish[f];
          drawFishAt(ctx, fs.x, fs.y, fs.kind, fs.s, fs.dir, t + fs.ph, fs.flee > 0 ? Math.sin(t * 20) * 0.08 : 0);
          if (fs.kind === 'star' || fs.kind === 'gold') A.sparkle(ctx, fs.x + Math.sin(t * 3 + fs.ph) * 30, fs.y - 26, 6, 0.5 + 0.5 * Math.sin(t * 6 + fs.ph));
        }
        // jellyfish
        var jl = S.jelly, jyd = jl.y + Math.sin(S.time * 1.4) * 10;
        ctx.save();
        if (jl.wob > 0) { ctx.translate(jl.x, jyd); ctx.rotate(Math.sin(t * 18) * 0.15 * jl.wob); ctx.translate(-jl.x, -jyd); }
        drawJelly(ctx, jl.x, jyd, 1, t, jl.alpha);
        ctx.restore();

        // fishing line
        var bend = (S.carry ? (S.carry.type === 'fish' ? 14 : 22) : 0) + S.lineJerk * 10 * Math.sin(t * 30);
        var tipX = ROD_T.x, tipY = ROD_T.y + bend;
        var hx = S.hookX, hy = S.hookY, holeX = HX + (hx - HX) * 0.05;
        ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(holeX, WATERY); ctx.lineTo(hx, hy - 36);
        ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(38,50,77,0.45)'; ctx.lineWidth = 3.6; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1.7; ctx.stroke();

        // carried thing
        var c = S.carry;
        if (c && c.type === 'fish') {
          ctx.save(); ctx.translate(hx, hy); ctx.rotate(-Math.PI / 2 + Math.sin(t * 14) * 0.35);
          if (c.kind === 'gold') A.glow(ctx, -26 * c.s, 0, 56 * c.s, 'rgba(255,224,110,', 0.4);
          A.fish(ctx, -26 * c.s, 0, c.s, c.kind, t * 1.7); ctx.restore();
        } else if (c && c.type === 'junk') {
          var sw = Math.sin(t * 4) * 0.25;
          if (c.jt === 'boot') drawBoot(ctx, hx + 4, hy + 34, 1, sw + 0.2); else drawCan(ctx, hx, hy + 28, 1, sw + 1.4);
        } else if (c && c.type === 'crab') {
          ctx.save(); ctx.translate(hx, hy); ctx.rotate(Math.sin(t * 5) * 0.2); drawCrab(ctx, -18, 58, 1, 'held', t); ctx.restore();
        }
        drawHook(ctx, hx, hy, 1, t);

        // water surface in the hole
        ctx.save();
        ctx.beginPath(); ctx.moveTo(HX - HW, WATERY);
        for (var s = 0; s <= 8; s++) ctx.lineTo(HX - HW + s * HW / 4, WATERY + Math.sin(t * 3 + s * 1.3) * 1.6);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.restore();

        // particles (underwater ones and splashes)
        drawParts(ctx, t);

        // surface props
        for (var pi = 0; pi < S.piles.length; pi++) {
          var pl = S.piles[pi];
          if (pl.jt === 'boot') drawBoot(ctx, pl.x, SURF - 14, 0.75, pl.rot * 0.4); else drawCan(ctx, pl.x, SURF - 10, 0.75, pl.rot);
        }
        drawLantern(ctx, 392, SURF + 2, t);
        drawBucket(ctx, BUCKX, BUCKY, 1, S.kinds, S.shown, S.bucketB);
        A.shadow(ctx, 528, SURF + 2, 18, 4);
        A.mug(ctx, 528, SURF + 1, 0.75, C.red, 'marsh');
        drawSteam(ctx, 528, SURF - 32, t);
        drawStool(ctx, CX, STOOLY);
        var pose = S.ended ? (Math.floor(t * 1.5) % 2 ? 'happy' : 'wave') : S.happyT > 0 ? 'happy' : 'sit';
        try { AB.chars.draw(ctx, CX, STOOLY, host.look || { species: 'penguin' }, { t: t, pose: pose, dir: 1, scale: CSCALE, noShadow: true }); } catch (e) { /* keep going */ }
        if (S.oopsT > 0) drawOops(ctx, CX - 40, STOOLY - 128, S.oopsT, t);
        drawRod(ctx, tipX, tipY, t);

        // flyers
        for (var k = 0; k < S.flyers.length; k++) {
          var fl = S.flyers[k], q = U.clamp(fl.t / fl.dur, 0, 1);
          var x = U.lerp(fl.x0, fl.x1, q), y = U.lerp(fl.y0, fl.y1, q) - Math.sin(q * Math.PI) * fl.h;
          if (fl.type === 'fish') drawFishAt(ctx, x, y, fl.kind, fl.s * (1 - q * 0.35), -1, t * 2, q * fl.spin);
          else if (fl.type === 'junk') { if (fl.jt === 'boot') drawBoot(ctx, x, y, 1 - q * 0.25, q * fl.spin); else drawCan(ctx, x, y, 1 - q * 0.25, q * fl.spin); }
          else if (fl.type === 'crab') drawCrab(ctx, x, y + 20, 0.9, 'grump', t);
        }

        // snowfall over the sky
        snow.draw(ctx);

        // floating numbers
        for (var fi = 0; fi < S.floats.length; fi++) {
          var ft = S.floats[fi];
          ctx.save(); ctx.globalAlpha = U.clamp(ft.life * 1.5, 0, 1);
          var pop = 1 + Math.max(0, ft.life - 1) * 2;
          ctx.translate(ft.x, ft.y); ctx.scale(pop, pop);
          outlinedText(ctx, ft.txt, 0, 0, 40, ft.col);
          ctx.restore();
        }

        // "tap here" hint until the first drop
        if (!S.everDropped && S.time > 1 && !S.ended) {
          var bob = Math.sin(t * 4) * 8;
          A.poly(ctx, [HX + 140, 470 + bob, HX + 172, 470 + bob, HX + 156, 500 + bob], C.warm, 3);
          drawFinger(ctx, HX + 156, 590 + bob * 0.5, 1.1, Math.sin(t * 4) > 0.6);
        }

        drawHud(ctx, t);
        ctx.restore();
      }

      function drawSteam(ctx, x, y, t) {
        ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (var i = 0; i < 2; i++) {
          var o = (t * 0.6 + i * 0.5) % 1;
          ctx.globalAlpha = 0.6 * (1 - o);
          ctx.beginPath(); ctx.moveTo(x - 4 + i * 8, y - o * 30);
          ctx.quadraticCurveTo(x + 4 + i * 8 + Math.sin(t * 3 + i) * 5, y - 8 - o * 30, x - 2 + i * 8, y - 16 - o * 30);
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawOops(ctx, x, y, life, t) {
        ctx.save(); ctx.globalAlpha = U.clamp(life * 2, 0, 1);
        var s = 1 + Math.sin(t * 12) * 0.05;
        ctx.translate(x, y); ctx.scale(s, s);
        A.circle(ctx, 0, 0, 22, '#fff', 3);
        A.poly(ctx, [10, 16, 22, 30, 2, 20], '#fff', 0);
        ctx.beginPath(); ctx.moveTo(10, 16); ctx.lineTo(22, 30); ctx.lineTo(2, 20); ctx.strokeStyle = C.out; ctx.lineWidth = 3; ctx.stroke();
        A.circle(ctx, 0, 0, 20, '#fff', 0);
        // swirly dizzy spiral
        ctx.beginPath();
        for (var a = 0; a < Math.PI * 4; a += 0.2) { var rr = a * 1.3; var px = Math.cos(a + t * 6) * rr, py = Math.sin(a + t * 6) * rr; if (a) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.strokeStyle = C.purple; ctx.lineWidth = 2.6; ctx.stroke();
        ctx.restore();
      }

      function drawRod(ctx, tipX, tipY, t) {
        var sx = ROD_S.x, sy = ROD_S.y;
        var qx = (sx + tipX) / 2 - 18, qy = (sy + tipY) / 2 - 22 + (tipY - ROD_T.y) * 0.8;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(qx, qy, tipX, tipY);
        ctx.lineCap = 'round'; ctx.strokeStyle = C.out; ctx.lineWidth = 8; ctx.stroke();
        ctx.strokeStyle = C.red; ctx.lineWidth = 4.2; ctx.stroke();
        // cork grip
        var gx = sx + (qx - sx) * 0.32, gy = sy + (qy - sy) * 0.32;
        A.line(ctx, [sx - 6, sy + 5, gx, gy], 12, C.out); A.line(ctx, [sx - 6, sy + 5, gx, gy], 7.5, C.woodLight);
        // line guides
        for (var i = 1; i <= 3; i++) {
          var u = 0.35 + i * 0.17, bx = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * qx + u * u * tipX, by = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * qy + u * u * tipY;
          A.circle(ctx, bx, by + 4, 2.6, '#fff', 1.6);
        }
        A.circle(ctx, tipX, tipY, 3, '#fff', 2);
        // reel
        var rx = sx + 12, ry = sy + 12;
        A.circle(ctx, rx, ry, 11, '#c9d6ea', 3);
        A.circle(ctx, rx, ry, 5, C.stoneDark, 2);
        var ra = S.reelA;
        A.line(ctx, [rx, ry, rx + Math.cos(ra) * 13, ry + Math.sin(ra) * 13], 4, C.out);
        A.circle(ctx, rx + Math.cos(ra) * 13, ry + Math.sin(ra) * 13, 4, C.yellow, 2);
      }

      function drawParts(ctx, t) {
        for (var i = 0; i < S.parts.length; i++) {
          var p = S.parts[i], a = U.clamp(p.life / (p.max || 1), 0, 1);
          if (p.type === 'bub') {
            ctx.save(); ctx.globalAlpha = Math.min(1, a * 2) * 0.85;
            A.circle(ctx, p.x, p.y, p.r, 'rgba(255,255,255,0.18)', 1.6, '#ffffff');
            A.circle(ctx, p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.25, '#fff', 0);
            ctx.restore();
          } else if (p.type === 'drop') {
            ctx.save(); ctx.globalAlpha = a; A.ellipse(ctx, p.x, p.y, p.r * 0.8, p.r, '#bfe9fb', 1.5, '#ffffff'); ctx.restore();
          } else if (p.type === 'flake') {
            ctx.save(); ctx.globalAlpha = a; A.circle(ctx, p.x, p.y, p.r, '#fff', 0); ctx.restore();
          } else if (p.type === 'ring') {
            ctx.save(); ctx.globalAlpha = a; A.ellipse(ctx, p.x, p.y, p.r, p.r * 0.25, null, 2.5, '#ffffff'); ctx.restore();
          } else if (p.type === 'star') {
            ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.6);
            A.star(ctx, p.x, p.y, p.r, p.col, 2, 5, 0.5, p.rot); ctx.restore();
          } else if (p.type === 'poof') {
            ctx.save(); ctx.globalAlpha = a;
            A.circle(ctx, p.x, p.y, p.r * (1.4 - a * 0.4), 'rgba(255,230,250,0.45)', 2, '#ffffff');
            A.highlight(ctx, p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.3, p.r * 0.18, 0.9);
            ctx.restore();
          } else if (p.type === 'z') {
            ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.5);
            outlinedText(ctx, 'z', p.x + Math.sin(p.life * 4) * 5, p.y, Math.round(14 + (1 - a) * 10), '#e6f2ff');
            ctx.restore();
          }
        }
      }

      function drawHud(ctx, t) {
        // score pill (top-right)
        var px = 896, py = 28, pw = 236, ph = 70;
        A.shadow(ctx, px + pw / 2, py + ph + 6, pw * 0.42, 6, 0.18);
        A.box(ctx, px, py, pw, ph, 35, 'rgba(255,255,255,0.94)', 3);
        A.fish(ctx, px + 42, py + ph / 2, 0.85, S.best || 'sunny', t);
        outlinedText(ctx, String(S.shown), px + 92, py + ph / 2 + 2, 36, '#fff');
        A.coin(ctx, px + 146, py + ph / 2, 17, t * 2);
        ctx.font = '800 34px ' + AB.FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = C.out; ctx.fillText(String(S.points), px + 170, py + ph / 2 + 2);
        // picture timer
        var frac = U.clamp(1 - S.time / DUR, 0, 1);
        drawTimer(ctx, 1194, 63, 40, frac, t);
      }

      // ---- input ----------------------------------------------------------------
      function pointer(type, x, y) {
        if (S.ended) return;
        if (type === 'down') {
          if (x < 110 && y < 110) return; // shell pause corner
          var dropped = false;
          if (!S.carry) {
            if (S.mode === 'idle' || S.mode === 'up') {
              if (y > ICEB && S.mode === 'idle') S.aimX = U.clamp(x, HX - 340, HX + 340);
              dropped = startDrop();
            } else startReel();
          }
          S.press = { t: 0, x: x, lastX: x, dropped: !!dropped };
        } else if (type === 'move') {
          if (!S.press) return;
          var dx = x - S.press.lastX; S.press.lastX = x;
          S.aimX = U.clamp(S.aimX + dx, HX - 340, HX + 340);
        } else if (type === 'up') {
          if (S.press && S.press.dropped && S.press.t >= 0.4 && !S.carry) startReel();
          S.press = null;
        }
      }

      function key(type, k) {
        if (type === 'down') {
          var repeat = !!S.keys[k]; S.keys[k] = true;
          if (S.ended) return;
          if (k === 'ArrowLeft' || k === 'a' || k === 'A') S.keyDir = -1;
          else if (k === 'ArrowRight' || k === 'd' || k === 'D') S.keyDir = 1;
          if (repeat) return;
          if (k === 'ArrowDown' || k === 's' || k === 'S') startDrop();
          else if (k === 'ArrowUp' || k === 'w' || k === 'W') { if (!S.carry) startReel(); }
          else if (k === ' ' || k === 'Spacebar' || k === 'Enter') toggle();
        } else {
          S.keys[k] = false;
          if ((k === 'ArrowLeft' || k === 'a' || k === 'A') && S.keyDir < 0) S.keyDir = (S.keys.ArrowRight || S.keys.d) ? 1 : 0;
          if ((k === 'ArrowRight' || k === 'd' || k === 'D') && S.keyDir > 0) S.keyDir = (S.keys.ArrowLeft || S.keys.a) ? -1 : 0;
        }
      }

      function safe(fn) { return function (a, b, c) { try { return fn(a, b, c); } catch (e) { if (window.console) console.error('[fishing]', e); } }; }

      return {
        update: safe(update),
        draw: safe(draw),
        pointer: safe(pointer),
        key: safe(key),
        destroy: function () { S.parts.length = 0; S.fish.length = 0; skyC = sceneC = null; },
        _state: S
      };
    }
  });
})();
