/* Pet Lodge — a cosy log lodge where little Arctic animals wait for a home. Hazel looks after them. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C, K = AB.kit;

  var WALL_B = 372;
  var PET_S = 1.6;
  var LOG = '#c98a52', LOG_D = '#a76a3a', LOG_L = '#e0a96e';
  var stoveGlow = 0, treeShake = 0, jarTip = 0, basketBounce = 0, bookFlip = 0, bellRing = 0;

  // The four pens. Each pen's floor/back is painted, the pet lives in animate(), the front rail is a prop.
  var PENS = [
    { id: 'lemming', x: 348, y: 452, w: 210, d: 70, pet: { kind: 'lemming', color: 'honey' }, mood: 'idle', pace: 44, straw: '#f1cf6e', rail: C.wood },
    { id: 'puffin', x: 932, y: 452, w: 210, d: 70, pet: { kind: 'puffin', color: 'classic' }, mood: 'play', straw: '#f1cf6e', rail: C.wood },
    { id: 'ermine', x: 150, y: 690, w: 230, d: 96, pet: { kind: 'ermine', color: 'snow' }, mood: 'sleep', straw: '#efc565', rail: C.wood, basket: true },
    { id: 'walrus', x: 1130, y: 690, w: 230, d: 96, pet: { kind: 'walrus', color: 'rosy' }, mood: 'eat', straw: '#cfe9f6', rail: C.wood, pool: true }
  ];
  PENS.forEach(function (p) { p.happyUntil = 0; });

  function furn(ctx, id, x, y, s, t, flip) {
    var f = AB.furniture && AB.furniture[id]; if (!f) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (flip ? -1 : 1), s); f.draw(ctx, { t: t || 0 }); ctx.restore();
  }
  function petPos(p, t) {
    var px = p.x + (p.id === 'ermine' ? -10 : p.id === 'walrus' ? -26 : p.id === 'puffin' ? -20 : 0), py = p.y - p.d * 0.6, moving = false, dir = 1;
    if (p.pace && t >= p.happyUntil) {
      var ph = t * 0.55;
      px += Math.sin(ph) * p.pace; var v = Math.cos(ph);
      moving = Math.abs(v) > 0.25; dir = v > 0 ? 1 : -1;
      if (!moving) dir = Math.sin(ph) > 0 ? -1 : 1;
    }
    if (p.id === 'walrus' || p.id === 'puffin') dir = -1;
    return { x: px, y: py, moving: moving, dir: dir };
  }

  // ---------------------------------------------------------------- painting
  function logWalls(ctx) {
    ctx.fillStyle = LOG; ctx.fillRect(0, 0, AB.W, WALL_B);
    for (var y = 30, k = 0; y < WALL_B; y += 30, k++) {
      var g = ctx.createLinearGradient(0, y - 30, 0, y);
      g.addColorStop(0, k % 2 ? LOG_L : '#d89a5e'); g.addColorStop(0.55, LOG); g.addColorStop(1, LOG_D);
      ctx.fillStyle = g; ctx.fillRect(0, y - 30, AB.W, 30);
      A.line(ctx, [0, y, AB.W, y], 2.5, '#7a4a28');
      // knots
      var r = U.seeded(k * 7 + 3);
      for (var n = 0; n < 4; n++) { var kx = r() * AB.W; A.ellipse(ctx, kx, y - 15, 7, 4, null, 1.6, 'rgba(110,60,30,0.45)'); }
    }
    // corner log ends
    for (var yy = 15; yy < WALL_B; yy += 30) {
      [10, AB.W - 10].forEach(function (cx) {
        A.circle(ctx, cx, yy, 14, '#e8b77f', 2.5);
        A.circle(ctx, cx, yy, 8, null, 1.5, 'rgba(120,70,30,0.6)'); A.circle(ctx, cx, yy, 3, null, 1.5, 'rgba(120,70,30,0.6)');
      });
    }
    // ceiling rafters
    A.box(ctx, -10, -10, AB.W + 20, 30, 0, '#6e4024', 3);
    [180, 470, 810, 1100].forEach(function (x) { A.box(ctx, x - 14, -10, 28, 40, 4, '#7d4a2b', 3); });
  }
  function floor(ctx) {
    var g = ctx.createLinearGradient(0, WALL_B, 0, AB.H);
    g.addColorStop(0, '#b47a4a'); g.addColorStop(1, '#d9a56f');
    ctx.fillStyle = g; ctx.fillRect(0, WALL_B, AB.W, AB.H - WALL_B);
    ctx.strokeStyle = 'rgba(90,45,15,0.22)'; ctx.lineWidth = 2;
    for (var j = -14; j <= 14; j++) { ctx.beginPath(); ctx.moveTo(640 + j * 52, WALL_B); ctx.lineTo(640 + j * 120, AB.H); ctx.stroke(); }
    var r = U.seeded(4);
    for (var k = 0; k < 40; k++) {
      var yy = WALL_B + Math.pow(r(), 1.2) * (AB.H - WALL_B), xx = r() * AB.W;
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 40 + r() * 40, yy); ctx.stroke();
    }
    A.box(ctx, -10, WALL_B - 6, AB.W + 20, 12, 0, '#6e4024', 3);
    // scattered straw wisps
    ctx.strokeStyle = 'rgba(241,207,110,0.85)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (var s = 0; s < 40; s++) { var sx = r() * AB.W, sy = WALL_B + 20 + r() * 480, a = r() * 3; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 12, sy + Math.sin(a) * 4); ctx.stroke(); }
  }
  function portrait(ctx, x, y, w, h, frame, bg, pet, mood) {
    A.line(ctx, [x - w * 0.3, y - h / 2, x, y - h / 2 - 22, x + w * 0.3, y - h / 2], 2, '#5a3018');
    A.circle(ctx, x, y - h / 2 - 22, 3, C.coin, 1.5);
    A.box(ctx, x - w / 2 - 8, y - h / 2 - 8, w + 16, h + 16, 8, frame, 3);
    ctx.save(); ctx.beginPath(); A.rrect(ctx, x - w / 2, y - h / 2, w, h, 4); ctx.clip();
    ctx.fillStyle = bg; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x - w * 0.25, y - h * 0.2, w * 0.3, 0, 7); ctx.fill();
    if (AB.pets) AB.pets.draw(ctx, x, y + h / 2 - 6, pet, { t: 0.6, mood: mood, scale: 1.0 });
    ctx.restore();
    A.box(ctx, x - w / 2, y - h / 2, w, h, 4, null, 2.5);
    A.heart(ctx, x, y + h / 2 + 8, 6, '#ff6f91', 2);
  }
  function backWall(ctx) {
    // pet portraits
    portrait(ctx, 330, 186, 74, 70, '#ffcf4a', '#ffe9ee', { kind: 'lemming', color: 'cocoa' }, 'happy');
    portrait(ctx, 470, 120, 64, 60, '#8e6bd8', '#e3f3ff', { kind: 'puffin', color: 'tufted' }, 'idle');
    portrait(ctx, 810, 120, 64, 60, '#35b5a4', '#fff4dc', { kind: 'ermine', color: 'caramel' }, 'idle');
    portrait(ctx, 950, 186, 74, 70, '#e2574c', '#e8f7e8', { kind: 'walrus', color: 'grey' }, 'happy');
    // arched window above the welcome desk
    var wx = 640, wy = 70, ww = 140, wh = 170;
    A.box(ctx, wx - ww / 2 - 14, wy - 14, ww + 28, wh + 28, ww / 2, '#6e4024', 3);
    ctx.save(); ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy + wh); ctx.lineTo(wx - ww / 2, wy + ww / 2); ctx.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww / 2, wy + wh); ctx.closePath(); ctx.clip();
    var g = ctx.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#1f3b78'); g.addColorStop(0.75, '#6a86cc'); g.addColorStop(1, '#b3c2ea');
    ctx.fillStyle = g; ctx.fillRect(wx - ww, wy, ww * 2, wh);
    var r = U.seeded(9); for (var i = 0; i < 14; i++) A.circle(ctx, wx - ww / 2 + r() * ww, wy + r() * wh * 0.5, 0.8 + r(), 'rgba(255,255,255,0.85)', 0);
    A.ellipse(ctx, wx - 30, wy + wh + 20, 110, 50, '#eaf1ff', 0);
    A.poly(ctx, [wx + 36, wy + wh - 70, wx + 58, wy + wh - 10, wx + 14, wy + wh - 10], '#2b5a63', 0);
    A.circle(ctx, wx - 34, wy + 48, 14, '#fff6d8', 0);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(wx - ww / 2, wy + wh); ctx.lineTo(wx - ww / 2, wy + ww / 2); ctx.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww / 2, wy + wh); ctx.closePath(); A.fs(ctx, null, 3);
    A.line(ctx, [wx, wy, wx, wy + wh], 6, '#6e4024'); A.line(ctx, [wx - ww / 2, wy + 100, wx + ww / 2, wy + 100], 6, '#6e4024');
    A.box(ctx, wx - ww / 2 - 22, wy + wh + 6, ww + 44, 14, 4, '#7d4a2b', 3);
    A.ellipse(ctx, wx - 20, wy + wh + 6, 60, 5, '#fff', 0);
    // a paw-print banner above everything
    for (var b = 0; b < 9; b++) {
      var bx = 240 + b * 100, by = 46 + Math.sin(b / 8 * Math.PI) * 18;
      if (bx > 540 && bx < 740) continue;
      A.poly(ctx, [bx - 18, by, bx + 18, by, bx, by + 30], [C.red, C.yellow, C.teal, C.pink, C.blue][b % 5], 2.5);
      A.circle(ctx, bx, by + 10, 3.5, '#fff', 0);
    }
    // stove pipe running up the wall
    A.box(ctx, 106, 30, 26, 300, 4, '#3c4a6b', 3);
    A.box(ctx, 100, 120, 38, 10, 3, '#55627f', 2.5); A.box(ctx, 100, 230, 38, 10, 3, '#55627f', 2.5);
    // hooks with leashes and a little coat by the stove
    [[200, 120, C.red], [236, 120, C.teal]].forEach(function (h) {
      A.circle(ctx, h[0], h[1], 4, C.coin, 1.5);
      ctx.beginPath(); ctx.moveTo(h[0], h[1]); ctx.bezierCurveTo(h[0] - 12, h[1] + 40, h[0] + 12, h[1] + 70, h[0], h[1] + 100); ctx.lineWidth = 6; ctx.strokeStyle = C.out; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = h[2]; ctx.stroke();
      A.circle(ctx, h[0], h[1] + 104, 6, null, 3, C.coin);
    });
  }
  function penBack(ctx, p) {
    var x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, yb = p.y - p.d, yf = p.y;
    // floor of the pen: straw or snowy ice
    ctx.beginPath(); ctx.moveTo(x0 + 6, yb); ctx.lineTo(x1 - 6, yb); ctx.lineTo(x1, yf); ctx.lineTo(x0, yf); ctx.closePath();
    A.fs(ctx, p.straw, 2.5, 'rgba(90,50,20,0.5)');
    ctx.save(); ctx.clip();
    var r = U.seeded(p.x);
    ctx.lineCap = 'round';
    for (var i = 0; i < 70; i++) {
      var sx = x0 + r() * p.w, sy = yb + r() * p.d, a = r() * Math.PI;
      ctx.strokeStyle = p.pool ? 'rgba(255,255,255,0.8)' : (r() < 0.5 ? '#d9a940' : '#fff0b0'); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 14, sy + Math.sin(a) * 5); ctx.stroke();
    }
    ctx.restore();
    // back + side rails (front rail is a prop)
    function rail(ax, ay, bx, by) { A.line(ctx, [ax, ay - 26, bx, by - 26], 7); A.line(ctx, [ax, ay - 26, bx, by - 26], 4, LOG_L); A.line(ctx, [ax, ay - 10, bx, by - 10], 7); A.line(ctx, [ax, ay - 10, bx, by - 10], 4, LOG_L); }
    rail(x0 + 6, yb, x1 - 6, yb); rail(x0 + 6, yb, x0, yf); rail(x1 - 6, yb, x1, yf);
    [[x0 + 6, yb], [x1 - 6, yb], [p.x, yb]].forEach(function (q) { A.box(ctx, q[0] - 5, q[1] - 36, 10, 38, 3, p.rail, 2.5); A.ellipse(ctx, q[0], q[1] - 36, 6, 3, LOG_L, 1.5); });
    // furnishings inside each pen
    if (p.id === 'lemming') {
      // a little log house + pinecones
      A.box(ctx, x1 - 70, yb - 8, 52, 34, 8, LOG_D, 3);
      A.poly(ctx, [x1 - 76, yb - 6, x1 - 44, yb - 30, x1 - 12, yb - 6], C.red, 3);
      A.ellipse(ctx, x1 - 44, yb + 14, 10, 12, '#4a2c18', 2.5);
      A.pinecone(ctx, x0 + 30, yf - 14, 0.7); A.pinecone(ctx, x0 + 50, yf - 10, 0.6);
    } else if (p.id === 'puffin') {
      // a rocky perch with a tiny flag
      A.rock(ctx, x1 - 44, yb + 34, 60, 40, true);
      A.line(ctx, [x1 - 40, yb - 4, x1 - 40, yb - 34], 2.5); A.poly(ctx, [x1 - 40, yb - 34, x1 - 20, yb - 28, x1 - 40, yb - 22], C.teal, 2);
      A.fish(ctx, x0 + 36, yf - 14, 0.4, 'sunny', 0);
    } else if (p.id === 'ermine') {
      // round wicker basket with a blanket (the ermine sleeps in it)
      A.ellipse(ctx, p.x - 10, p.y - p.d * 0.6 - 2, 56, 20, '#b07a3c', 3);
      A.ellipse(ctx, p.x - 10, p.y - p.d * 0.6 - 4, 46, 14, '#ffd3e1', 2.5);
      P_toy(ctx, 'yarn', x1 - 38, yf - 20, 1.3);
    } else if (p.id === 'walrus') {
      // a little blue splash tub
      A.ellipse(ctx, x1 - 52, yb + 46, 46, 18, '#7fb6d9', 3);
      A.ellipse(ctx, x1 - 52, yb + 44, 38, 13, '#8fd0ea', 2.5);
      A.ellipse(ctx, x1 - 62, yb + 41, 14, 4, 'rgba(255,255,255,0.7)', 0);
      A.ellipse(ctx, x0 + 40, yb + 20, 14, 7, '#e9f6ff', 2); A.ellipse(ctx, x0 + 64, yb + 26, 9, 5, '#e9f6ff', 2);
    }
  }
  function P_toy(ctx, toy, x, y, s) { if (AB.pets && AB.pets.drawToy) AB.pets.drawToy(ctx, x, y, toy, 0, s); }

  function penFront(p) {
    var x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, yf = p.y;
    return { x: p.x, y: yf + 2, hit: [x0, yf - p.d - 70, p.w, p.d + 80], at: [p.x, yf + 40],
      draw: function (ctx, t) {
        A.shadow(ctx, p.x, yf + 4, p.w * 0.52, 8, 0.2);
        var n = 5;
        for (var i = 0; i <= n; i++) {
          var px = U.lerp(x0, x1, i / n);
          A.box(ctx, px - 6, yf - 32, 12, 34, 3, p.rail, 2.5); A.ellipse(ctx, px, yf - 32, 7, 3.5, LOG_L, 1.5);
        }
        A.line(ctx, [x0, yf - 24, x1, yf - 24], 8); A.line(ctx, [x0, yf - 24, x1, yf - 24], 4.5, LOG_L);
        A.line(ctx, [x0, yf - 9, x1, yf - 9], 8); A.line(ctx, [x0, yf - 9, x1, yf - 9], 4.5, LOG_L);
        // name plate hung on the rail: a paw + a heart
        var nx = p.x + (p.x < 640 ? -p.w * 0.3 : p.w * 0.3);
        A.box(ctx, nx - 24, yf - 30, 48, 24, 8, C.cream, 2.5);
        if (AB.icons) AB.icons.draw(ctx, 'paw', nx - 9, yf - 18, 15, '#e35d88');
        A.heart(ctx, nx + 11, yf - 17, 5, t < p.happyUntil ? '#ff6f91' : '#ffc2d3', 1.6);
      },
      tap: function () {
        var t = AB.world.t; p.happyUntil = t + 2.6;
        var pp = petPos(p, t);
        AB.audio.sfx('chirp'); AB.world.burst(pp.x, pp.y - 50, 'heart', 5);
      } };
  }

  AB.registerScene({
    id: 'lodge', name: 'Pet Lodge', music: 'igloo', ambient: 'indoor', outdoor: false, snow: false, footprints: false, aurora: false,
    map: null,
    depth: [400, 0.86, 880, 1.08],
    paint: function (ctx) {
      logWalls(ctx);
      floor(ctx);
      backWall(ctx);
      // big round braided rug in the middle
      [[640, 640, 270, 90, '#e2574c'], [640, 640, 236, 76, '#ffcf4a'], [640, 640, 200, 64, '#35b5a4'], [640, 640, 164, 52, '#ff8fb1'], [640, 640, 126, 40, '#fff4dc']].forEach(function (r, i) {
        A.ellipse(ctx, r[0], r[1], r[2], r[3], r[4], i ? 2 : 3, i ? 'rgba(38,50,77,0.35)' : null);
      });
      if (AB.icons) AB.icons.draw(ctx, 'paw', 640, 640, 50, '#e35d88');
      // scattered toys on the floor
      P_toy(ctx, 'ball', 470, 736, 1.6); P_toy(ctx, 'feather', 812, 590, 1.6); P_toy(ctx, 'pinecone', 520, 560, 1.6);
      A.pinecone(ctx, 860, 742, 0.8);
      PENS.forEach(function (p) { penBack(ctx, p); });
      K.exitMat(ctx, 640, 860);
      var v = ctx.createRadialGradient(640, 520, 320, 640, 520, 900);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,20,10,0.36)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, AB.W, AB.H);
    },
    animate: function (ctx, t) {
      // warm stove light
      var sg = Math.max(0, stoveGlow - t);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      A.glow(ctx, 118, 400, 230 + Math.sin(t * 3) * 8 + sg * 50, 'rgba(255,140,50,', 0.13 + 0.03 * Math.sin(t * 6) + sg * 0.1);
      ctx.restore();
      K.stringLights(ctx, 240, 26, 560, 26, 14, t, 9);
      K.stringLights(ctx, 720, 26, 1040, 26, 14, t, 9);
      // snow past the window
      ctx.save(); ctx.beginPath(); ctx.moveTo(570, 240); ctx.lineTo(570, 140); ctx.arc(640, 140, 70, Math.PI, 0); ctx.lineTo(710, 240); ctx.closePath(); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (var f = 0; f < 14; f++) { var fy = ((t * (22 + (f % 3) * 8) + f * 31) % 190) + 60, fx = 574 + (f * 41) % 132 + Math.sin(t + f) * 5; ctx.beginPath(); ctx.arc(fx, fy, 1.3 + (f % 3) * 0.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      // the adoptable pets, living in their pens
      PENS.forEach(function (p) {
        var happy = t < p.happyUntil, pp = petPos(p, t), mood = happy ? 'happy' : p.mood;
        AB.pets.draw(ctx, pp.x, pp.y, p.pet, { t: t + p.x * 0.01, mood: mood, moving: !happy && pp.moving, dir: pp.dir, scale: PET_S, blinkOffset: p.x * 0.003 });
        var h = AB.pets.height(p.pet, { scale: PET_S });
        if (happy) AB.pets.bubble(ctx, pp.x + 6, pp.y - h - 22, 'heart', t);
        else if (p.mood === 'sleep') AB.pets.bubble(ctx, pp.x + 26, pp.y - h - 4, 'zzz', t);
        if (p.basket) {
          // front rim of the basket over the sleeper
          var bx = p.x - 10, by = p.y - p.d * 0.6 - 2;
          ctx.beginPath(); ctx.ellipse(bx, by, 56, 20, 0, 0, Math.PI); ctx.lineTo(bx - 56, by + 14); ctx.ellipse(bx, by + 14, 56, 16, 0, Math.PI, 0, true); ctx.closePath();
          A.fs(ctx, '#c98e48', 3);
          ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(110,60,20,0.5)'; ctx.lineWidth = 2;
          for (var w = -54; w < 56; w += 12) { ctx.beginPath(); ctx.moveTo(bx + w, by); ctx.lineTo(bx + w + 6, by + 30); ctx.stroke(); }
          ctx.restore();
        }
        if (p.pool) { var ph = (t * 0.8) % 1; ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - ph)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x + p.w / 2 - 52, p.y - p.d + 44, 10 + ph * 24, 3 + ph * 8, 0, 0, Math.PI * 2); ctx.stroke(); }
      });
    },
    walk: [[24, 400], [1256, 400], [1266, 892], [14, 892]],
    blocks: [
      { e: [118, 424, 72, 24] },                                   // stove
      { r: [240, 376, 216, 82] }, { r: [824, 376, 216, 82] },      // back pens
      { r: [30, 588, 240, 106] }, { r: [1010, 588, 240, 106] },    // side pens
      { r: [526, 412, 228, 54] },                                  // welcome desk
      { e: [1180, 440, 62, 22] },                                  // climbing tree
      { e: [1000, 820, 92, 22] },                                  // feeding station
      { e: [270, 822, 50, 18] },                                   // toy basket
      { e: [800, 470, 30, 12] }                                    // bell post
    ],
    spawns: { 'default': [640, 760], town: [640, 760], map: [640, 760] },
    hotspots: [
      { id: 'exit', hit: [550, 806, 180, 94], at: [640, 860], icon: 'door', badge: [640, 816], action: function () { AB.audio.sfx('door'); AB.go('town', 'lodge'); } },
      { id: 'adopt', hit: [560, 320, 160, 150], at: [640, 512], icon: 'paw', badge: [640, 300], action: function () { bookFlip = AB.world.t + 0.8; AB.audio.sfx('pop'); AB.petsUI.openAdopt(); } }
    ],
    npcSpots: { hazel: { at: [520, 530], wander: [440, 500, 400, 140], dir: 1 } },
    questSpots: {},
    props: PENS.map(penFront).concat([
      // pot-belly stove (tap → it roars warmly)
      { x: 118, y: 430, hit: [50, 290, 140, 150], at: [190, 470],
        draw: function (ctx, t) {
          var sg = Math.max(0, stoveGlow - t);
          A.shadow(ctx, 118, 432, 70, 12, 0.3);
          A.box(ctx, 50, 418, 136, 14, 5, '#8d7f88', 3);
          [76, 160].forEach(function (lx) { A.box(ctx, lx - 6, 398, 12, 22, 3, '#2c3550', 2.5); });
          A.ellipse(ctx, 118, 350, 56, 58, '#3c4a6b', 3.5);
          ctx.save(); ctx.globalAlpha = 0.3; A.ellipse(ctx, 140, 356, 30, 48, '#1b2236', 0); ctx.restore();
          A.box(ctx, 64, 392, 108, 14, 6, '#2c3550', 3);
          A.box(ctx, 76, 284, 84, 16, 6, '#55627f', 3);
          A.box(ctx, 106, 276, 26, 12, 3, '#3c4a6b', 2.5);
          // glowing door
          var gl = 0.75 + 0.15 * Math.sin(t * 7) + sg * 0.3;
          A.glow(ctx, 118, 360, 50 + sg * 20, 'rgba(255,160,60,', Math.min(1, gl * 0.6));
          A.box(ctx, 94, 336, 48, 44, 12, '#2c1d2e', 3);
          ctx.save(); ctx.beginPath(); A.rrect(ctx, 98, 340, 40, 36, 10); ctx.clip();
          var fl = (1 + sg * 0.5);
          [[C.red, 30], [C.orange, 22], [C.yellow, 13]].forEach(function (L, i) {
            ctx.beginPath(); ctx.moveTo(100, 378);
            for (var k = 0; k < 3; k++) { var fx = 104 + k * 14, fh = (22 + 6 * Math.sin(t * 8 + k * 2 + i)) * fl * (1 - i * 0.22); ctx.quadraticCurveTo(fx, 378 - fh * 0.5, fx + 4, 378 - fh); ctx.quadraticCurveTo(fx + 6, 378 - fh * 0.4, fx + 12, 376); }
            ctx.lineTo(138, 378); ctx.closePath(); ctx.fillStyle = L[0]; ctx.fill();
          });
          ctx.restore();
          for (var g = 0; g < 4; g++) A.line(ctx, [100 + g * 12, 338, 100 + g * 12, 378], 2, 'rgba(38,50,77,0.9)');
          A.circle(ctx, 146, 358, 3.5, C.coin, 1.5);
          A.highlight(ctx, 84, 330, 5, 14, 0.35);
          // kettle on top, steaming
          A.ellipse(ctx, 160, 278, 14, 11, C.red, 2.5); A.line(ctx, [172, 276, 182, 268], 4); A.line(ctx, [172, 276, 182, 268], 2, C.red);
          for (var s = 0; s < 3; s++) { var ph = (t * 0.5 + s / 3) % 1; ctx.fillStyle = 'rgba(255,255,255,' + 0.55 * (1 - ph) + ')'; ctx.beginPath(); ctx.arc(184 + Math.sin(ph * 6) * 4, 262 - ph * 40, 3 + ph * 6, 0, Math.PI * 2); ctx.fill(); }
          // a sleepy pet bed warming by the stove
          furn(ctx, 'pet_bed', 196, 440, 0.7, t);
        },
        tap: function () { stoveGlow = AB.world.t + 1.6; AB.audio.sfx('whoosh'); AB.world.burst(118, 300, 'sparkle', 5); } },
      // welcome desk with the big adoption book (the book is the 'adopt' hotspot)
      { x: 640, y: 468, draw: function (ctx, t) {
          A.shadow(ctx, 640, 470, 124, 12, 0.25);
          A.box(ctx, 520, 384, 240, 22, 7, LOG_L, 3);
          A.box(ctx, 528, 404, 224, 64, 6, LOG, 3);
          ctx.save(); ctx.beginPath(); A.rrect(ctx, 528, 404, 224, 64, 6); ctx.clip();
          for (var y = 420; y < 470; y += 16) A.line(ctx, [528, y, 752, y], 2, 'rgba(110,60,30,0.4)');
          ctx.fillStyle = 'rgba(40,20,10,0.16)'; ctx.fillRect(712, 400, 50, 70);
          ctx.restore();
          A.box(ctx, 528, 404, 224, 64, 6, null, 3);
          A.highlight(ctx, 560, 390, 28, 3, 0.5);
          // paw emblem on the front
          A.circle(ctx, 640, 438, 20, C.cream, 2.5);
          if (AB.icons) AB.icons.draw(ctx, 'paw', 640, 438, 26, '#e35d88');
          // the open adoption book with pet photos
          var fl = Math.max(0, bookFlip - t), bob = Math.sin(t * 2) * 1.2;
          ctx.save(); ctx.translate(0, bob);
          A.poly(ctx, [586, 392, 640, 396, 640, 350, 592, 344], '#e35d88', 3);
          A.poly(ctx, [694, 392, 640, 396, 640, 350, 688, 344], '#e35d88', 3);
          A.poly(ctx, [590, 388, 640, 392, 640, 352, 596, 348], '#fffaf0', 2);
          A.poly(ctx, [690, 388, 640, 392, 640, 352, 684, 348], '#fffaf0', 2);
          A.box(ctx, 600, 354, 32, 28, 3, '#e3f3ff', 1.8); A.box(ctx, 648, 354, 32, 28, 3, '#ffe9ee', 1.8);
          if (AB.pets) {
            AB.pets.draw(ctx, 616, 380, { kind: 'lemming', color: 'honey' }, { t: t, scale: 0.5 });
            AB.pets.draw(ctx, 664, 380, { kind: 'walrus', color: 'rosy' }, { t: t, scale: 0.42 });
          }
          if (fl > 0) { var a = (1 - fl / 0.8) * Math.PI; ctx.save(); ctx.translate(640, 0); ctx.scale(Math.cos(a), 1); A.poly(ctx, [0, 392, 48, 388, 44, 348, 0, 352], '#fffaf0', 2); ctx.restore(); }
          A.line(ctx, [640, 352, 640, 396], 2);
          ctx.restore();
          // a quill in an ink pot and a jar of treats
          A.box(ctx, 714, 368, 20, 18, 5, '#3c4a6b', 2.5); A.line(ctx, [724, 370, 744, 330], 3, '#ffffff'); A.shape(ctx, function (c) { c.moveTo(744, 330); c.quadraticCurveTo(756, 340, 734, 352); c.quadraticCurveTo(738, 340, 744, 330); c.closePath(); }, '#ff8fb1', 2);
          A.box(ctx, 540, 356, 30, 32, 8, 'rgba(225,242,255,0.75)', 2.5);
          [[548, 380], [560, 378], [554, 368]].forEach(function (m) { A.ellipse(ctx, m[0], m[1], 5, 3, '#d39a68', 1.4); });
          A.box(ctx, 538, 350, 34, 8, 3, C.teal, 2.5);
        } },
      // a little brass bell on a post: ring it and every pet looks up happily
      { x: 800, y: 472, hit: [770, 360, 60, 116], at: [800, 512],
        draw: function (ctx, t) {
          A.shadow(ctx, 800, 474, 22, 6);
          A.box(ctx, 796, 384, 8, 88, 3, LOG_D, 2.5);
          A.box(ctx, 780, 380, 40, 10, 4, LOG_L, 2.5);
          var sw = t < bellRing ? Math.sin(t * 16) * (bellRing - t) * 0.5 : 0;
          ctx.save(); ctx.translate(800, 390); ctx.rotate(sw);
          A.shape(ctx, function (c) { c.moveTo(-11, 24); c.quadraticCurveTo(-11, 2, 0, 2); c.quadraticCurveTo(11, 2, 11, 24); c.lineTo(15, 28); c.lineTo(-15, 28); c.closePath(); }, '#ffc93c', 2.5);
          A.circle(ctx, 0, 31, 3.5, '#c58a12', 1.5); A.highlight(ctx, -5, 12, 2, 6, 0.6);
          ctx.restore();
        },
        tap: function () {
          var t = AB.world.t; bellRing = t + 1.4; AB.audio.sfx('bell'); AB.world.burst(800, 380, 'note', 4);
          PENS.forEach(function (p, i) { p.happyUntil = t + 1.6 + i * 0.15; });
        } },
      // the climbing tree with platforms and a ramp
      { x: 1180, y: 442, hit: [1100, 110, 160, 330], at: [1120, 486],
        draw: function (ctx, t) {
          var sh = Math.max(0, treeShake - t), wob = Math.sin(t * 34) * 0.03 * sh;
          A.shadow(ctx, 1180, 444, 70, 12, 0.28);
          ctx.save(); ctx.translate(1180, 440); ctx.rotate(wob); ctx.translate(-1180, -440);
          // ramp from the floor up to the first platform
          A.poly(ctx, [1096, 440, 1116, 440, 1166, 318, 1150, 312], LOG_L, 3);
          for (var r = 0; r < 6; r++) { var k = r / 6; A.line(ctx, [U.lerp(1100, 1152, k) - 2, U.lerp(436, 316, k), U.lerp(1114, 1166, k) + 2, U.lerp(436, 322, k)], 3, LOG_D); }
          // trunk + branches
          A.shape(ctx, function (c) { c.moveTo(1160, 440); c.quadraticCurveTo(1170, 300, 1164, 140); c.lineTo(1196, 140); c.quadraticCurveTo(1192, 300, 1206, 440); c.closePath(); }, '#9a6238', 3);
          ctx.save(); ctx.globalAlpha = 0.25; A.poly(ctx, [1186, 440, 1192, 150, 1196, 140, 1206, 440], '#3a1f10', 0); ctx.restore();
          for (var b = 0; b < 5; b++) A.line(ctx, [1170 + (b % 2) * 14, 180 + b * 50, 1172 + (b % 2) * 14, 200 + b * 50], 2, 'rgba(60,30,10,0.5)');
          A.line(ctx, [1172, 220, 1124, 170], 9); A.line(ctx, [1172, 220, 1124, 170], 5, '#9a6238');
          A.line(ctx, [1190, 180, 1240, 140], 9); A.line(ctx, [1190, 180, 1240, 140], 5, '#9a6238');
          // round cushioned platforms
          [[1176, 318, 46, '#ff8fb1'], [1218, 232, 36, '#7fd0e8'], [1146, 168, 32, '#ffcf4a']].forEach(function (pl) {
            A.ellipse(ctx, pl[0], pl[1] + 6, pl[2], pl[2] * 0.32, LOG_D, 3);
            A.ellipse(ctx, pl[0], pl[1], pl[2], pl[2] * 0.32, pl[3], 3);
            A.highlight(ctx, pl[0] - pl[2] * 0.4, pl[1] - 2, pl[2] * 0.25, 2.5, 0.6);
          });
          // leafy crown
          [[1180, 128, 46], [1136, 140, 32], [1228, 120, 34], [1200, 96, 30]].forEach(function (lf, i) { A.circle(ctx, lf[0], lf[1], lf[2], i % 2 ? C.pine : C.pineDark, 3); });
          A.ellipse(ctx, 1176, 92, 26, 8, '#ffffff', 2); A.ellipse(ctx, 1224, 96, 18, 6, '#ffffff', 2);
          // dangling toys
          A.line(ctx, [1124, 170, 1124, 210], 1.5); P_toy(ctx, 'feather', 1124, 220, 1.4);
          A.line(ctx, [1240, 140, 1240, 186], 1.5); A.pinecone(ctx, 1240, 198, 0.75);
          // a little scratching knot + a sleepy hole
          A.ellipse(ctx, 1184, 380, 10, 14, '#4a2c18', 2.5);
          ctx.restore();
        },
        tap: function () {
          treeShake = AB.world.t + 0.8; AB.audio.sfx('snow');
          for (var i = 0; i < 6; i++) AB.world.particles.push({ k: 'snow', x: 1180 + U.rand(-40, 40), y: U.rand(90, 140), vx: U.rand(-30, 30), vy: U.rand(-30, 20), t: 0, life: U.rand(0.7, 1.2), r: U.rand(3, 6) });
          AB.quests.revealGem('gem_lodge_1', 1110, 520);
        } },
      // feeding station: a low bench with four bowls and a big treat jar (tap → treats; a glimmer stone hides in the jar)
      { x: 1000, y: 824, hit: [900, 700, 200, 130], at: [1000, 870],
        draw: function (ctx, t) {
          A.shadow(ctx, 1000, 826, 100, 12, 0.25);
          A.box(ctx, 908, 800, 184, 16, 6, LOG_L, 3);
          [916, 1076].forEach(function (lx) { A.box(ctx, lx, 812, 10, 14, 3, LOG_D, 2.5); });
          ['#35b5a4', '#e2574c', '#8e6bd8', '#ff9a3c'].forEach(function (col, i) {
            var bx = 932 + i * 40;
            A.ellipse(ctx, bx, 800, 16, 6, U.shade(col, -0.15), 2.5);
            A.shape(ctx, function (c) { c.moveTo(bx - 16, 790); c.lineTo(bx + 16, 790); c.quadraticCurveTo(bx + 14, 800, bx + 9, 800); c.lineTo(bx - 9, 800); c.quadraticCurveTo(bx - 14, 800, bx - 16, 790); c.closePath(); }, col, 2.5);
            A.ellipse(ctx, bx, 790, 16, 5, U.shade(col, 0.3), 2);
            if (AB.pets && AB.pets.drawFood) AB.pets.drawFood(ctx, bx, 790, ['berries', 'fish', 'eggs', 'clams'][i], 1);
          });
          // treat jar on a stand
          var tip = Math.max(0, jarTip - t), rot = Math.sin(t * 20) * 0.12 * tip;
          ctx.save(); ctx.translate(1076, 790); ctx.rotate(rot);
          A.box(ctx, -18, -64, 36, 60, 12, 'rgba(225,242,255,0.75)', 3);
          [[-8, -16], [6, -12], [-2, -28], [8, -36], [-8, -42], [0, -50]].forEach(function (m, i) { A.star(ctx, m[0], m[1], 5, i % 2 ? '#ffcf4a' : '#ff8fb1', 1.4); });
          A.box(ctx, -20, -72, 40, 12, 4, '#e35d88', 2.5); A.circle(ctx, 0, -76, 5, '#ffcf4a', 2);
          A.highlight(ctx, -10, -46, 3, 10, 0.6);
          ctx.restore();
          // a water bowl on the floor
          furn(ctx, 'pet_bowl', 920, 840, 1.0, t);
        },
        tap: function () {
          jarTip = AB.world.t + 0.9; AB.audio.sfx('pop'); AB.world.burst(1076, 720, 'star', 6);
          AB.quests.revealGem('gem_lodge_2', 1100, 860);
        } },
      // toy basket: balls, pinecones, feathers bounce out
      { x: 270, y: 824, hit: [204, 730, 132, 100], at: [340, 840],
        draw: function (ctx, t) {
          var bb = Math.max(0, basketBounce - t);
          A.shadow(ctx, 270, 826, 58, 10, 0.25);
          // toys peeking out (bounce up after a tap)
          ctx.save(); ctx.translate(0, -Math.abs(Math.sin(t * 14)) * 16 * bb);
          P_toy(ctx, 'ball', 248, 778, 1.8); P_toy(ctx, 'yarn', 290, 776, 1.8);
          ctx.restore();
          ctx.save(); ctx.translate(0, -Math.abs(Math.sin(t * 14 + 1)) * 22 * bb);
          P_toy(ctx, 'feather', 268, 768, 1.8); A.pinecone(ctx, 304, 782, 0.75);
          ctx.restore();
          A.shape(ctx, function (c) { c.moveTo(214, 788); c.lineTo(326, 788); c.lineTo(314, 826); c.quadraticCurveTo(270, 832, 226, 826); c.closePath(); }, '#c98e48', 3);
          ctx.save(); ctx.beginPath(); ctx.moveTo(214, 788); ctx.lineTo(326, 788); ctx.lineTo(314, 826); ctx.quadraticCurveTo(270, 832, 226, 826); ctx.closePath(); ctx.clip();
          ctx.strokeStyle = 'rgba(110,60,20,0.5)'; ctx.lineWidth = 2;
          for (var w = 0; w < 4; w++) { ctx.beginPath(); ctx.moveTo(210, 796 + w * 9); ctx.lineTo(330, 796 + w * 9); ctx.stroke(); }
          ctx.restore();
          A.ellipse(ctx, 270, 788, 56, 8, '#e0a96e', 3);
          A.heart(ctx, 270, 812, 7, '#ff6f91', 2);
        },
        tap: function () { basketBounce = AB.world.t + 1; AB.audio.sfx('jump'); AB.world.burst(270, 760, 'star', 6); } },
      // a hanging lantern-lit tunnel in the middle of the floor for zoomies (decor)
      { x: 900, y: 600, draw: function (ctx, t) { furn(ctx, 'pet_tunnel', 900, 600, 0.9, t); } }
    ])
  });
  // tunnel block (added after the def so the list above stays readable)
  AB.scenes.lodge.blocks.push({ e: [900, 588, 52, 14] });
})();
