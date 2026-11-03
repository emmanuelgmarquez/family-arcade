/* Outfit & Furniture Shop — a bright boutique: clothes on the left, a furniture showroom on the right. Tilly runs the till. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C, K = AB.kit;

  var WALL_B = 362;
  var CTR = { x: 520, w: 240, front: 474, depth: 22, h: 50 };
  var MINT = '#bfe8da', MINT_D = '#94d2bf', PINK = '#ff8fb1', LILAC = '#c9b6ec';
  var regDing = 0, rackSwing = 0, hatSpin = 0, boxPop = 0, mirrorShine = 0, shelfWob = 0;
  var dummyOutfit = 0, teddyHop = 0;
  var OUTFITS = [
    { head: 'top_hat', neck: 'bowtie', body: 'puffer' },
    { head: 'beanie_stripe', neck: 'scarf_rainbow', body: 'sweater_red' },
    { head: 'crown', face: 'glasses_heart', body: 'hoodie_heart' },
    { head: 'earmuffs', neck: 'scarf_green', body: 'raincoat' },
    { head: 'propeller', face: 'glasses_star', body: 'shirt_stripe' }
  ];

  function furn(ctx, id, x, y, s, t, flip) {
    var f = AB.furniture && AB.furniture[id]; if (!f) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (flip ? -1 : 1), s); f.draw(ctx, { t: t || 0 }); ctx.restore();
  }
  function sit(x, y, dir) { var p = AB.world.player; p.x = x; p.y = y; p.dir = dir; p.pose = 'sit'; p.poseUntil = AB.world.t + 6; AB.audio.sfx('soft'); }
  /** Tiny sweater on a hanger, hook at (0,0). */
  function sweater(ctx, col, band, kind) {
    A.line(ctx, [0, -6, 0, 2], 2); ctx.beginPath(); ctx.arc(3, -8, 4, Math.PI, Math.PI * 2.2); ctx.lineWidth = 2; ctx.strokeStyle = C.out; ctx.stroke();
    A.line(ctx, [-16, 10, 0, 2, 16, 10], 3, '#c58a12');
    var b = function (c) {
      c.moveTo(-8, 6); c.lineTo(-18, 12); c.lineTo(-24, 30); c.lineTo(-16, 33); c.lineTo(-12, 22); c.lineTo(-12, 46);
      c.quadraticCurveTo(0, 49, 12, 46); c.lineTo(12, 22); c.lineTo(16, 33); c.lineTo(24, 30); c.lineTo(18, 12); c.lineTo(8, 6);
      c.quadraticCurveTo(0, 12, -8, 6); c.closePath();
    };
    A.shape(ctx, b, col, 2.5);
    ctx.save(); ctx.beginPath(); b(ctx); ctx.clip();
    if (kind === 'stripe') { ctx.fillStyle = band; for (var y = 14; y < 50; y += 9) ctx.fillRect(-26, y, 52, 4); }
    else if (kind === 'heart') A.heart(ctx, 0, 30, 6, band, 0);
    else if (kind === 'flake') A.snowflake(ctx, 0, 28, 7, band, 1.8);
    else { ctx.fillStyle = band; ctx.fillRect(-26, 40, 52, 8); }
    ctx.fillStyle = 'rgba(29,43,82,0.15)'; ctx.fillRect(4, 0, 30, 50);
    ctx.restore();
    ctx.beginPath(); b(ctx); A.fs(ctx, null, 2.5);
  }
  function hatShape(ctx, kind, col) {
    if (kind === 'beanie') {
      A.shape(ctx, function (c) { c.moveTo(-14, 0); c.quadraticCurveTo(-14, -22, 0, -22); c.quadraticCurveTo(14, -22, 14, 0); c.closePath(); }, col, 2.5);
      A.box(ctx, -16, -5, 32, 9, 4, '#fff', 2); A.circle(ctx, 0, -25, 6, '#fff', 2);
    } else if (kind === 'top') {
      A.box(ctx, -18, -5, 36, 7, 3, col, 2.5); A.box(ctx, -11, -30, 22, 27, 3, col, 2.5); ctx.fillStyle = C.red; ctx.fillRect(-10, -10, 20, 4);
    } else {
      A.shape(ctx, function (c) { c.moveTo(-20, 0); c.quadraticCurveTo(-12, -6, -10, -16); c.quadraticCurveTo(0, -26, 10, -16); c.quadraticCurveTo(12, -6, 20, 0); c.closePath(); }, col, 2.5);
      A.circle(ctx, 8, -12, 4, C.pink, 1.5);
    }
  }

  // ---------------------------------------------------------------- painting
  function walls(ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, WALL_B);
    g.addColorStop(0, '#a9dccb'); g.addColorStop(1, MINT);
    ctx.fillStyle = g; ctx.fillRect(0, 0, AB.W, WALL_B);
    // white polka dots
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff';
    for (var y = 40; y < 250; y += 46) for (var x = (y / 46 % 2) * 30 + 20; x < AB.W; x += 60) { ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // right half (showroom) gets lilac stripes to split the boutique
    ctx.save(); ctx.beginPath(); ctx.rect(890, 0, AB.W - 890, WALL_B); ctx.clip();
    ctx.fillStyle = '#e4d9f7'; ctx.fillRect(890, 0, 400, WALL_B);
    for (var sx = 890; sx < AB.W; sx += 44) { ctx.fillStyle = 'rgba(201,182,236,0.6)'; ctx.fillRect(sx, 0, 20, WALL_B); }
    ctx.restore();
    A.line(ctx, [890, 30, 890, WALL_B], 3);
    // white wainscot
    ctx.fillStyle = '#fbfbff'; ctx.fillRect(0, 262, AB.W, WALL_B - 262);
    for (var px = 0; px < AB.W; px += 28) { ctx.fillStyle = 'rgba(150,170,210,0.18)'; ctx.fillRect(px, 268, 3, WALL_B - 268); }
    A.box(ctx, -10, 256, AB.W + 20, 12, 0, '#ffffff', 3);
    // crown moulding / ceiling
    A.box(ctx, -10, -10, AB.W + 20, 36, 0, '#ffffff', 3);
    for (var s = 0; s < 40; s++) { ctx.beginPath(); ctx.moveTo(s * 34, 26); ctx.arc(s * 34 + 17, 26, 17, 0, Math.PI); ctx.closePath(); A.fs(ctx, s % 2 ? PINK : '#ffffff', 2); }
  }
  function floorTiles(ctx) {
    var top = WALL_B, H = AB.H;
    ctx.fillStyle = '#f7dcd2'; ctx.fillRect(0, top, AB.W, H - top);
    var rows = 12, cols = 24;
    function rowY(k) { return top + Math.pow(k / rows, 1.3) * (H - top + 20); }
    function colX(j, y) { var k = (y - top) / (H - top); return 640 + (j - cols / 2) * U.lerp(64, 130, k); }
    for (var r = 0; r < rows; r++) {
      var y0 = rowY(r), y1 = rowY(r + 1);
      for (var j = -2; j < cols + 2; j++) {
        if ((r + j) % 2) continue;
        ctx.beginPath(); ctx.moveTo(colX(j, y0), y0); ctx.lineTo(colX(j + 1, y0), y0); ctx.lineTo(colX(j + 1, y1), y1); ctx.lineTo(colX(j, y1), y1); ctx.closePath();
        ctx.fillStyle = '#fff6ef'; ctx.fill();
      }
    }
    // soft shine down the middle aisle
    var sh = ctx.createLinearGradient(400, 0, 880, 0);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.25)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(400, top, 480, H - top);
    A.box(ctx, -10, top - 6, AB.W + 20, 12, 0, '#e9eef8', 3);
  }
  function clothesWall(ctx) {
    // cubby shelves of folded sweaters
    var x0 = 200, w = 280;
    A.box(ctx, x0, 96, w, 166, 8, '#ffffff', 3);
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 4; c++) {
        var cx = x0 + 10 + c * 66, cy = 104 + r * 52;
        A.box(ctx, cx, cy, 62, 46, 4, '#f1ecfa', 2);
        var cols = [[C.red, '#fff'], [C.blue, C.yellow], [C.teal, PINK], [C.yellow, C.orange], [C.purple, '#fff'], [PINK, C.red]][(r * 4 + c) % 6];
        for (var k = 0; k < 3; k++) {
          var fy = cy + 38 - k * 11;
          A.box(ctx, cx + 7, fy - 9, 48, 11, 4, cols[k % 2 ? 1 : 0], 2);
        }
      }
    }
    A.ellipse(ctx, x0 + 70, 96, 60, 5, '#fff', 0);
    // hat pegs above
    [[230, 70, 'beanie', C.red], [300, 74, 'top', '#30364d'], [370, 72, 'sun', '#ffe08a'], [440, 70, 'beanie', C.teal]].forEach(function (h) {
      A.circle(ctx, h[0], h[1] - 18, 3, C.woodDark, 1.5);
      ctx.save(); ctx.translate(h[0], h[1] + 8); hatShape(ctx, h[2], h[3]); ctx.restore();
    });
  }
  function counterBack(ctx) {
    // round window showing the night snow
    var wx = 640, wy = 108, r = 58;
    A.circle(ctx, wx, wy, r + 12, '#ffffff', 3);
    ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.clip();
    var g = ctx.createLinearGradient(0, wy - r, 0, wy + r); g.addColorStop(0, '#1f3b78'); g.addColorStop(1, '#8aa2df');
    ctx.fillStyle = g; ctx.fillRect(wx - r, wy - r, r * 2, r * 2);
    A.ellipse(ctx, wx - 20, wy + r + 10, 70, 34, '#eaf1ff', 0);
    A.poly(ctx, [wx + 26, wy + 4, wx + 42, wy + 44, wx + 10, wy + 44], '#2b5a63', 0);
    for (var i = 0; i < 8; i++) A.circle(ctx, wx - 40 + i * 12, wy - 30 + (i * 17) % 30, 1.2, '#fff', 0);
    ctx.restore();
    A.circle(ctx, wx, wy, r, null, 3);
    A.line(ctx, [wx - r, wy, wx + r, wy], 5, '#ffffff'); A.line(ctx, [wx, wy - r, wx, wy + r], 5, '#ffffff');
    // icon sign: shirt + sofa
    A.box(ctx, 548, 180, 184, 52, 16, PINK, 3.5);
    A.box(ctx, 556, 187, 168, 38, 12, null, 2, 'rgba(255,255,255,0.6)');
    AB.icons.draw(ctx, 'shirt', 606, 206, 34, '#ffffff');
    A.heart(ctx, 640, 208, 6, '#fff', 0);
    AB.icons.draw(ctx, 'sofa', 674, 206, 34, '#ffffff');
    A.ellipse(ctx, 600, 180, 40, 5, '#fff', 2);
    // shelf behind the counter: ribbon spools, gift boxes
    A.box(ctx, 500, 290, 280, 10, 3, '#ffffff', 2.5);
    [[525, C.red], [552, C.blue], [579, C.yellow]].forEach(function (s) { A.ellipse(ctx, s[0], 276, 12, 14, s[1], 2.5); A.circle(ctx, s[0], 276, 4, '#fff', 1.5); });
    [[620, 30, 26, C.teal, C.yellow], [660, 24, 34, PINK, '#fff'], [700, 34, 22, C.purple, C.yellow], [744, 26, 30, C.yellow, C.red]].forEach(function (b) {
      A.box(ctx, b[0] - b[1] / 2, 290 - b[2], b[1], b[2], 3, b[3], 2.5);
      ctx.fillStyle = b[4]; ctx.fillRect(b[0] - 3, 290 - b[2], 6, b[2]);
      A.ellipse(ctx, b[0] - 5, 290 - b[2] - 3, 5, 3, b[4], 1.5); A.ellipse(ctx, b[0] + 5, 290 - b[2] - 3, 5, 3, b[4], 1.5);
    });
  }
  function showroomWall(ctx) {
    furn(ctx, 'pic_aurora', 1130, 150, 1.0, 0);
    furn(ctx, 'wall_clock', 1240, 140, 0.8, 0);
    furn(ctx, 'wall_shelf', 980, 120, 0.9, 0);
    // a price tag hanging off the painting
    A.line(ctx, [1180, 186, 1192, 210], 1.5);
    A.box(ctx, 1180, 208, 26, 18, 4, '#fff8e1', 2); A.coin(ctx, 1193, 217, 5);
  }

  AB.registerScene({
    id: 'shop', name: 'Outfit & Furniture Shop', music: 'shop', ambient: 'indoor', outdoor: false, snow: false, footprints: false, aurora: false,
    map: null,
    depth: [392, 0.86, 880, 1.08],
    paint: function (ctx) {
      walls(ctx);
      floorTiles(ctx);
      clothesWall(ctx);
      counterBack(ctx);
      showroomWall(ctx);
      // bunting over both halves
      furn(ctx, 'bunting', 300, 60, 1.6, 0);
      furn(ctx, 'bunting', 1050, 60, 1.3, 0);
      // showroom platform (low stage) with a star rug
      A.shape(ctx, function (c) { c.moveTo(905, 400); c.lineTo(1275, 400); c.lineTo(1275, 650); c.lineTo(905, 650); c.quadraticCurveTo(880, 525, 905, 400); c.closePath(); }, '#efe6fb', 3);
      A.shape(ctx, function (c) { c.moveTo(905, 650); c.lineTo(1275, 650); c.lineTo(1275, 664); c.lineTo(905, 664); c.closePath(); }, LILAC, 3);
      if (AB.furniture && AB.furniture.rug_round_blue) { ctx.save(); ctx.translate(1050, 772); ctx.scale(1.25, 1.25); AB.furniture.rug_round_blue.draw(ctx, { t: 0, rot: 0 }); ctx.restore(); }
      if (AB.furniture && AB.furniture.rug_star) { ctx.save(); ctx.translate(1100, 560); ctx.scale(1.2, 1.2); AB.furniture.rug_star.draw(ctx, { t: 0, rot: 0 }); ctx.restore(); }
      // round pink rug under the clothes corner
      A.ellipse(ctx, 250, 640, 200, 66, '#ffd3e1', 3);
      A.ellipse(ctx, 250, 640, 172, 54, null, 3, '#ffffff');
      for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2; A.heart(ctx, 250 + Math.cos(a) * 186, 640 + Math.sin(a) * 60, 5, PINK, 0); }
      // red carpet runner to the counter
      ctx.beginPath(); ctx.moveTo(596, 492); ctx.lineTo(684, 492); ctx.lineTo(716, 838); ctx.lineTo(564, 838); ctx.closePath(); A.fs(ctx, C.red, 3);
      ctx.beginPath(); ctx.moveTo(606, 500); ctx.lineTo(674, 500); ctx.lineTo(702, 830); ctx.lineTo(578, 830); ctx.closePath(); A.fs(ctx, null, 3, '#ffcf4a');
      K.exitMat(ctx, 640, 860);
      var v = ctx.createRadialGradient(640, 520, 340, 640, 520, 900);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,30,70,0.3)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, AB.W, AB.H);
    },
    animate: function (ctx, t) {
      K.stringLights(ctx, 0, 34, 520, 34, 14, t, 12);
      K.stringLights(ctx, 760, 34, 1280, 34, 14, t, 12);
      // snow drifting past the round window
      ctx.save(); ctx.beginPath(); ctx.arc(640, 108, 58, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (var f = 0; f < 12; f++) {
        var fy = ((t * (20 + (f % 3) * 8) + f * 29) % 130) + 44, fx = 590 + (f * 37) % 100 + Math.sin(t + f) * 5;
        ctx.beginPath(); ctx.arc(fx, fy, 1.3 + (f % 3) * 0.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // sparkles on the shop sign
      A.sparkle(ctx, 560 + ((t * 40) % 160), 186, 5, 0.5 + 0.5 * Math.sin(t * 6));
    },
    walk: [[24, 398], [1256, 398], [1266, 892], [14, 892]],
    blocks: [
      { r: [CTR.x - 6, 436, CTR.w + 12, 42] },          // counter
      { e: [110, 428, 64, 18] },                         // mirror base
      { e: [300, 520, 110, 16] },                        // clothes rack
      { e: [74, 640, 34, 14] },                          // hat stand
      { e: [190, 778, 46, 18] },                         // mannequin
      { e: [430, 650, 32, 13] }, { e: [850, 650, 32, 13] },   // catalog lecterns
      { e: [470, 470, 34, 14] },                         // hat boxes
      { e: [975, 420, 54, 16] }, { e: [1060, 436, 24, 10] }, { e: [1160, 470, 88, 20] }, { e: [1224, 446, 30, 12] },
      { e: [1150, 612, 52, 16] },                        // armchair
      { e: [1220, 846, 40, 16] }, { e: [1110, 830, 30, 14] }, { e: [1000, 768, 46, 14] }, { e: [1100, 732, 34, 12] }
    ],
    spawns: { 'default': [640, 760], town: [640, 760], map: [640, 760] },
    hotspots: [
      { id: 'exit', hit: [550, 806, 180, 94], at: [640, 860], icon: 'door', badge: [640, 816], action: function () { AB.audio.sfx('door'); AB.go('town', 'shop'); } },
      { id: 'clothesCatalog', hit: [376, 530, 108, 130], at: [430, 706], icon: 'shirt', badge: [430, 514], action: function () { AB.audio.sfx('pop'); AB.ui.openCatalog('clothes'); } },
      { id: 'furnitureCatalog', hit: [796, 530, 108, 130], at: [850, 706], icon: 'sofa', badge: [850, 514], action: function () { AB.audio.sfx('pop'); AB.ui.openCatalog('furniture'); } }
    ],
    npcSpots: { tilly: { at: [652, 428], wander: null, dir: -1 } },
    questSpots: {},
    props: [
      // counter with the cash register on top
      { x: 640, y: CTR.front, draw: function (ctx) {
          var x = CTR.x, w = CTR.w, F = CTR.front, top = F - CTR.h, back = top - CTR.depth;
          A.shadow(ctx, x + w / 2, F + 2, w * 0.55, 10, 0.25);
          A.box(ctx, x, top + 4, w, CTR.h - 4, 6, PINK, 3);
          ctx.save(); ctx.beginPath(); A.rrect(ctx, x, top + 4, w, CTR.h - 4, 6); ctx.clip();
          for (var p = 0; p < 4; p++) A.box(ctx, x + 10 + p * 58, top + 14, 50, CTR.h - 22, 6, '#ffb3c9', 2, '#e0628b');
          ctx.fillStyle = 'rgba(29,43,82,0.14)'; ctx.fillRect(x + w - 40, top, 50, 80);
          ctx.restore();
          A.box(ctx, x - 8, back, w + 16, CTR.depth + 12, 8, '#ffffff', 3);
          A.highlight(ctx, x + 30, back + 8, 26, 3, 0.6);
          A.heart(ctx, x + w / 2, top + 30, 9, '#fff', 2);
          // little vase of flowers + tag spool at the right end
          A.box(ctx, x + 200, top - 26, 14, 24, 4, '#bfe8f6', 2);
          A.circle(ctx, x + 202, top - 32, 6, C.yellow, 1.8); A.circle(ctx, x + 212, top - 36, 6, PINK, 1.8);
          A.box(ctx, x + 160, top - 8, 30, 8, 3, '#fff8e1', 2); A.coin(ctx, x + 175, top - 12, 5);
        } },
      // cash register (tap → ding)
      { x: 570, y: CTR.front + 1, hit: [532, 362, 80, 76], at: [570, 512],
        draw: function (ctx, t) {
          var top = CTR.front - CTR.h, d = Math.max(0, regDing - t), open = d > 0 ? Math.min(1, d * 3) : 0;
          // drawer slides out
          A.box(ctx, 540, top - 12 + open * 8, 60, 10 + open * 6, 3, '#9aa6bd', 2.5);
          if (open > 0.3) { A.coin(ctx, 556, top - 6 + open * 8, 5); A.coin(ctx, 572, top - 6 + open * 8, 5); A.coin(ctx, 588, top - 6 + open * 8, 5); }
          A.box(ctx, 536, top - 46, 68, 36, 8, '#7f86c9', 3);
          ctx.fillStyle = 'rgba(29,43,82,0.18)'; ctx.fillRect(584, top - 44, 18, 32);
          for (var r = 0; r < 2; r++) for (var c = 0; c < 4; c++) A.box(ctx, 542 + c * 11, top - 40 + r * 11, 8, 8, 2, ['#fff', C.yellow, '#fff', PINK][(r + c) % 4], 1.5);
          A.box(ctx, 546, top - 70, 44, 26, 5, '#5b4aa8', 3);
          A.box(ctx, 552, top - 65, 32, 14, 3, '#bff5d6', 2);
          A.coin(ctx, 568, top - 58, 5);
          if (d > 0) { A.glow(ctx, 568, top - 58, 30, 'rgba(255,230,120,', d); }
          A.box(ctx, 562, top - 80, 12, 10, 3, C.coin, 2);
        },
        tap: function () { regDing = AB.world.t + 0.9; AB.audio.sfx('ding'); AB.world.burst(568, 380, 'sparkle', 5); } },
      // big standing mirror (tap → strike a happy pose, sparkle; a glimmer stone)
      { x: 110, y: 430, hit: [44, 150, 132, 280], at: [190, 470],
        draw: function (ctx, t) {
          A.shadow(ctx, 110, 432, 70, 12, 0.25);
          A.box(ctx, 52, 404, 116, 26, 10, '#ffffff', 3);
          A.ellipse(ctx, 110, 290, 66, 128, '#ffd36e', 3.5);
          A.ellipse(ctx, 110, 290, 56, 118, '#e8a713', 2.5);
          ctx.save(); ctx.beginPath(); ctx.ellipse(110, 290, 50, 112, 0, 0, Math.PI * 2); ctx.clip();
          var g = ctx.createLinearGradient(60, 180, 160, 400); g.addColorStop(0, '#e9f8ff'); g.addColorStop(1, '#a9d2ec');
          ctx.fillStyle = g; ctx.fillRect(50, 170, 120, 240);
          // reflection of the player
          var p = AB.world.player;
          if (p && p.look && AB.chars) {
            var rx = 110 + U.clamp((p.x - 110) * 0.12, -24, 24);
            ctx.globalAlpha = 0.85;
            AB.chars.draw(ctx, rx, 396, p.look, { t: p.t || 0, dir: -(p.dir || 1), scale: 0.78, pose: p.pose, blinkOffset: p.blinkOffset, noShadow: true });
            ctx.globalAlpha = 1;
          }
          // shine streaks (a sweep after a tap)
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.save(); ctx.translate(110, 290); ctx.rotate(-0.5);
          var sw = t < mirrorShine ? (1 - (mirrorShine - t) / 1.2) * 260 - 130 : -30;
          ctx.fillRect(sw - 10, -160, 14, 320); ctx.fillRect(sw + 10, -160, 6, 320);
          ctx.restore();
          ctx.restore();
          ctx.beginPath(); ctx.ellipse(110, 290, 50, 112, 0, 0, Math.PI * 2); A.fs(ctx, null, 2.5);
          // little heart crest on top
          A.heart(ctx, 110, 170, 12, PINK, 2.5);
          A.sparkle(ctx, 150, 210, 6, 0.4 + 0.4 * Math.sin(t * 3));
        },
        tap: function () {
          var p = AB.world.player; p.dir = -1; p.pose = 'happy'; p.poseUntil = AB.world.t + 2.2;
          mirrorShine = AB.world.t + 1.2;
          AB.audio.sfx('sparkle'); AB.world.burst(110, 260, 'sparkle', 10);
          AB.quests.revealGem('gem_shop_1', 210, 500);
        } },
      // clothes rack with tiny sweaters (tap → they swing)
      { x: 300, y: 522, hit: [196, 380, 208, 150], at: [300, 570],
        draw: function (ctx, t) {
          A.shadow(ctx, 300, 524, 110, 12, 0.22);
          // wheeled feet + posts
          [[200, 522], [400, 522]].forEach(function (f) { A.line(ctx, [f[0] - 18, f[1], f[0] + 18, f[1]], 6); A.line(ctx, [f[0] - 18, f[1], f[0] + 18, f[1]], 3, '#c9d2e6'); A.circle(ctx, f[0] - 16, f[1] + 2, 4, '#5b6684', 1.5); A.circle(ctx, f[0] + 16, f[1] + 2, 4, '#5b6684', 1.5); });
          A.box(ctx, 196, 392, 8, 132, 3, '#c9d2e6', 2.5); A.box(ctx, 396, 392, 8, 132, 3, '#c9d2e6', 2.5);
          A.box(ctx, 190, 388, 220, 9, 4, '#e2e8f4', 2.5);
          var swing = Math.max(0, rackSwing - t);
          var items = [[C.red, '#fff', 'stripe'], [C.teal, PINK, 'heart'], [C.yellow, C.orange, 'band'], [C.blue, '#fff', 'flake'], [PINK, C.red, 'stripe'], [C.purple, C.yellow, 'flake']];
          items.forEach(function (it, i) {
            ctx.save(); ctx.translate(222 + i * 31, 392);
            ctx.rotate(Math.sin(t * 9 + i) * 0.25 * swing + Math.sin(t * 1.5 + i) * 0.02);
            ctx.scale(0.86, 0.86);
            sweater(ctx, it[0], it[1], it[2]);
            ctx.restore();
          });
          // a scarf draped over the end
          A.shape(ctx, function (c) { c.moveTo(396, 392); c.quadraticCurveTo(414, 420, 408, 470); c.lineTo(398, 470); c.quadraticCurveTo(402, 424, 388, 396); c.closePath(); }, C.green, 2.5);
          ctx.fillStyle = C.yellow; ctx.fillRect(399, 452, 9, 4); ctx.fillRect(399, 460, 9, 4);
        },
        tap: function () { rackSwing = AB.world.t + 1.4; AB.audio.sfx('whoosh'); } },
      // hat stand (tap → hats twirl; a glimmer stone tumbles out of the top hat)
      { x: 74, y: 642, hit: [24, 470, 100, 180], at: [140, 660],
        draw: function (ctx, t) {
          var spin = Math.max(0, hatSpin - t);
          A.shadow(ctx, 74, 644, 36, 9, 0.22);
          A.ellipse(ctx, 74, 638, 30, 9, '#ffffff', 3);
          A.box(ctx, 70, 500, 8, 140, 3, '#ffffff', 2.5);
          A.circle(ctx, 74, 496, 7, PINK, 2.5);
          A.line(ctx, [74, 540, 46, 520], 5); A.line(ctx, [74, 540, 46, 520], 2.5, '#fff');
          A.line(ctx, [74, 560, 104, 540], 5); A.line(ctx, [74, 560, 104, 540], 2.5, '#fff');
          A.line(ctx, [74, 516, 98, 500], 5); A.line(ctx, [74, 516, 98, 500], 2.5, '#fff');
          var hats = [[46, 520, 'beanie', C.blue], [104, 540, 'sun', '#ffe08a'], [74, 492, 'top', '#30364d'], [98, 500, 'beanie', PINK]];
          hats.forEach(function (h, i) {
            ctx.save(); ctx.translate(h[0], h[1] - Math.abs(Math.sin(t * 10 + i)) * 14 * spin);
            ctx.scale(Math.cos(t * 14 * spin + i) * (spin > 0 ? 1 : 0) + (spin > 0 ? 0 : 1), 1);
            hatShape(ctx, h[2], h[3]); ctx.restore();
          });
        },
        tap: function () {
          hatSpin = AB.world.t + 1.2; AB.audio.sfx('pop'); AB.world.burst(74, 500, 'star', 5);
          AB.quests.revealGem('gem_shop_2', 150, 690);
        } },
      // mannequin (tap → it changes outfit)
      { x: 190, y: 780, hit: [130, 610, 120, 180], at: [270, 790],
        draw: function (ctx, t) {
          A.shadow(ctx, 190, 782, 54, 12, 0.25);
          A.ellipse(ctx, 190, 774, 50, 15, LILAC, 3);
          A.box(ctx, 140, 760, 100, 14, 0, LILAC, 0);
          A.ellipse(ctx, 190, 760, 50, 15, '#efe6fb', 3);
          A.box(ctx, 186, 730, 8, 28, 3, '#c9d2e6', 2);
          if (AB.chars) AB.chars.draw(ctx, 190, 742, { species: 'bear', palette: 'snow', outfit: OUTFITS[dummyOutfit % OUTFITS.length] }, { t: 1, scale: 0.92, dir: 1, noShadow: true });
          A.sparkle(ctx, 236, 670, 5, 0.4 + 0.4 * Math.sin(t * 4 + 1));
        },
        tap: function () { dummyOutfit++; AB.audio.sfx('pop'); AB.world.burst(190, 680, 'sparkle', 8); } },
      // catalog lecterns (the catalogs themselves are the hotspots)
      lectern(430, 652, PINK, 'shirt'),
      lectern(850, 652, C.purple, 'sofa'),
      // hat boxes by the counter (tap → lids pop)
      { x: 470, y: 474, hit: [430, 380, 80, 100], at: [460, 520],
        draw: function (ctx, t) {
          var pop = Math.max(0, boxPop - t), j = Math.abs(Math.sin(t * 12)) * 16 * pop;
          A.shadow(ctx, 470, 476, 38, 8, 0.22);
          A.box(ctx, 440, 438, 60, 36, 10, C.teal, 3); A.ellipse(ctx, 470, 438, 30, 8, '#7fd8c9', 2.5);
          ctx.fillStyle = '#fff'; for (var d = 0; d < 4; d++) { ctx.beginPath(); ctx.arc(450 + d * 13, 458, 3, 0, 7); ctx.fill(); }
          A.ellipse(ctx, 470, 434 - j, 32, 9, '#4fc2b0', 2.5);
          A.box(ctx, 448, 404 - j * 1.4, 44, 28, 8, PINK, 3); A.ellipse(ctx, 470, 404 - j * 1.4, 22, 6, '#ffc2d3', 2.5);
          A.ellipse(ctx, 470, 400 - j * 2, 24, 7, '#ff6f91', 2.5);
          A.ellipse(ctx, 464, 394 - j * 2, 6, 4, C.yellow, 1.5); A.ellipse(ctx, 476, 394 - j * 2, 6, 4, C.yellow, 1.5);
        },
        tap: function () { boxPop = AB.world.t + 0.9; AB.audio.sfx('pop'); AB.world.burst(470, 400, 'star', 6); } },
      // ---- furniture showroom ----
      { x: 975, y: 422, hit: [925, 270, 100, 155], at: [985, 470],
        draw: function (ctx, t) {
          var w = Math.max(0, shelfWob - t);
          ctx.save(); ctx.translate(975, 422); ctx.rotate(Math.sin(t * 30) * 0.02 * w); ctx.translate(-975, -422);
          furn(ctx, 'bookshelf', 975, 422, 1.0, t);
          ctx.restore();
          tag(ctx, 1012, 300, 2);
        },
        tap: function () { shelfWob = AB.world.t + 0.8; AB.audio.sfx('soft'); AB.world.burst(975, 300, 'note', 2); } },
      { x: 1060, y: 438, draw: function (ctx, t) { furn(ctx, 'lamp_floor', 1060, 438, 1.0, t); } },
      { x: 1160, y: 472, hit: [1076, 380, 168, 96], at: [1160, 510],
        draw: function (ctx, t) { furn(ctx, 'sofa_red', 1160, 472, 1.08, t); tag(ctx, 1232, 396, 3); },
        tap: function () { sit(1150, 478, 1); } },
      { x: 1228, y: 448, draw: function (ctx, t) { furn(ctx, 'plant_fern', 1240, 448, 0.95, t); } },
      { x: 1150, y: 614, hit: [1096, 516, 108, 100], at: [1150, 670],
        draw: function (ctx, t) { furn(ctx, 'armchair_teal', 1150, 614, 1.08, t, true); tag(ctx, 1100, 540, 2); },
        tap: function () { sit(1150, 618, -1); } },
      { x: 1000, y: 772, hit: [950, 700, 100, 76], at: [1000, 812],
        draw: function (ctx, t) { furn(ctx, 'beanbag', 1000, 772, 1.1, t); tag(ctx, 1046, 700, 1); },
        tap: function () { sit(1000, 776, 1); } },
      { x: 1100, y: 742, hit: [1070, 666, 60, 80], at: [1100, 800],
        draw: function (ctx, t) {
          A.ellipse(ctx, 1100, 738, 34, 10, '#ffffff', 3); A.box(ctx, 1066, 724, 68, 14, 0, '#ffffff', 0); A.ellipse(ctx, 1100, 724, 34, 10, '#f4f0fd', 3);
          var hop = Math.max(0, teddyHop - t);
          furn(ctx, 'teddy_bear', 1100, 724 - Math.abs(Math.sin(hop * 12)) * hop * 24, 1.0, t);
        },
        tap: function () { teddyHop = AB.world.t + 0.8; AB.audio.sfx('jump'); AB.world.burst(1100, 680, 'heart', 3); } },
      { x: 1220, y: 848, draw: function (ctx, t) { furn(ctx, 'plant_flower', 1220, 848, 1.15, t); } },
      { x: 1110, y: 832, draw: function (ctx, t) { furn(ctx, 'lamp_aurora', 1110, 832, 0.9, t); } }
    ]
  });

  function tag(ctx, x, y, coins) {
    A.line(ctx, [x, y - 12, x, y - 2], 1.5);
    A.box(ctx, x - 6 - coins * 6, y - 2, 12 + coins * 12, 18, 5, '#fff8e1', 2);
    for (var i = 0; i < coins; i++) A.coin(ctx, x - (coins - 1) * 6 + i * 12, y + 7, 5);
  }
  function lectern(x, y, col, icon) {
    return { x: x, y: y, draw: function (ctx, t) {
      A.shadow(ctx, x, y + 2, 40, 9, 0.25);
      A.ellipse(ctx, x, y - 2, 30, 9, '#ffffff', 3);
      A.box(ctx, x - 9, y - 70, 18, 66, 4, '#ffffff', 2.5);
      ctx.fillStyle = 'rgba(29,43,82,0.12)'; ctx.fillRect(x + 2, y - 68, 6, 62);
      // slanted top
      A.poly(ctx, [x - 46, y - 74, x + 46, y - 74, x + 40, y - 96, x - 40, y - 96], '#e6ebf6', 3);
      // big illustrated catalog book lying open
      var bob = Math.sin(t * 2 + x) * 1.5;
      ctx.save(); ctx.translate(0, bob);
      A.poly(ctx, [x - 44, y - 80, x, y - 76, x, y - 120, x - 38, y - 126], col, 3);
      A.poly(ctx, [x + 44, y - 80, x, y - 76, x, y - 120, x + 38, y - 126], col, 3);
      A.poly(ctx, [x - 40, y - 84, x, y - 80, x, y - 120, x - 35, y - 124], '#fffaf0', 2);
      A.poly(ctx, [x + 40, y - 84, x, y - 80, x, y - 120, x + 35, y - 124], '#fffaf0', 2);
      AB.icons.draw(ctx, icon, x - 18, y - 102, 22, col);
      if (icon === 'shirt') { hatMini(ctx, x + 18, y - 98); }
      else { A.box(ctx, x + 8, y - 108, 20, 14, 3, '#7fd0e8', 1.5); A.box(ctx, x + 8, y - 98, 22, 6, 2, C.wood, 1.5); }
      A.line(ctx, [x, y - 76, x, y - 120], 2);
      A.box(ctx, x - 2, y - 82, 4, 16, 1, C.red, 0);
      ctx.restore();
      A.sparkle(ctx, x + 34, y - 132 + bob, 5, 0.4 + 0.5 * Math.sin(t * 4 + x));
    } };
  }
  function hatMini(ctx, x, y) { ctx.save(); ctx.translate(x, y + 4); ctx.scale(0.5, 0.5); hatShape(ctx, 'beanie', C.red); ctx.restore(); }
})();
