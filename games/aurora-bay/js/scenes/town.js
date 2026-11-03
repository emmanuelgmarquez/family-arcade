/* Town Square — the heart of Aurora Bay. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C, K = AB.kit;

  function tree(x, y, h, key) {
    var shake = { until: 0 };
    return {
      x: x, y: y, hit: [x - h * 0.35, y - h, h * 0.7, h], at: [x + (x < 640 ? 70 : -70), y + 30],
      draw: function (ctx, t) {
        ctx.save();
        if (t < shake.until) { ctx.translate(x, y); ctx.rotate(Math.sin(t * 40) * 0.03); ctx.translate(-x, -y); }
        A.pine(ctx, x, y, h); ctx.restore();
      },
      tap: function () {
        shake.until = AB.world.t + 0.5; AB.audio.sfx('snow');
        for (var i = 0; i < 18; i++) AB.world.particles.push({ k: 'snow', x: x + U.rand(-h * 0.3, h * 0.3), y: y - h * U.rand(0.3, 0.9), vx: U.rand(-30, 30), vy: U.rand(-40, 40), t: 0, life: U.rand(0.8, 1.4), r: U.rand(3, 7) });
        if (key) AB.quests.revealGem(key, x + 40, y + 10);
      }
    };
  }
  function lamp(x, y) { return { x: x, y: y, draw: function (ctx, t) { A.lampPost(ctx, x, y, 120, t); } }; }
  function bench(x, y) {
    return { x: x, y: y, hit: [x - 70, y - 70, 140, 80], at: [x, y + 6],
      draw: function (ctx) { A.bench(ctx, x, y, 130); },
      tap: function () { var p = AB.world.player; p.x = x; p.y = y + 4; p.dir = 1; p.pose = 'sit'; p.poseUntil = AB.world.t + 6; AB.audio.sfx('soft'); } };
  }

  var bellSwing = 0;
  var snowmanHop = 0;

  AB.registerScene({
    id: 'town', name: 'Town Square', music: 'town', ambient: 'wind', outdoor: true, snow: true, footprints: true, aurora: true,
    map: { x: 500, y: 330, icon: 'bell' },
    depth: [330, 0.7, 880, 1.06],
    paint: function (ctx) {
      K.skyAndMountains(ctx, 230, 4);
      K.treeline(ctx, 292, 12, 30, 34, 64);
      K.snowGround(ctx, 280);
      // paths
      K.path(ctx, [[-20, 640, 90], [180, 600, 100], [400, 560, 110]]);
      K.path(ctx, [[1300, 660, 90], [1120, 620, 100], [880, 560, 110]]);
      K.path(ctx, [[870, 250, 40], [872, 330, 70], [820, 450, 100]]);
      K.path(ctx, [[450, 920, 130], [480, 780, 120], [560, 640, 110]]);
      K.path(ctx, [[215, 420, 70], [330, 510, 90]]); K.path(ctx, [[640, 380, 60], [640, 470, 80]]); K.path(ctx, [[1080, 430, 70], [960, 520, 90]]);
      K.cobbles(ctx, 640, 575, 330, 160);
      // far slope hint behind north path
      A.drift(ctx, 900, 300, 260, 60, '#eef3ff');
      // buildings (back row)
      K.building(ctx, { x: 60, y: 405, w: 310, h: 165, wall: '#c9734e', logs: true, roof: '#b73b3b', roofH: 90, trim: '#8d96ad', chimney: 220,
        door: { x: 185, w: 62, h: 98, color: '#7a3b2a', wreath: true },
        windows: [[90, 290, 64, 52], [282, 290, 64, 52]],
        sign: { text: 'COCOA', icon: 'mug', x: 215, y: 210, w: 200, color: '#fff4dc' } });
      K.building(ctx, { x: 500, y: 370, w: 280, h: 140, wall: '#8f6a4d', logs: true, roof: '#3d8c6a', roofH: 76, trim: '#8d96ad',
        door: { x: 610, w: 60, h: 90, color: '#3d6a8c' },
        windows: [[524, 270, 56, 56, { round: true }], [700, 270, 56, 56, { round: true }]],
        sign: { text: 'PET LODGE', icon: 'paw', iconColor: '#e35d88', x: 640, y: 190, w: 230, size: 22, color: '#e9fff4' } });
      K.building(ctx, { x: 930, y: 415, w: 300, h: 185, wall: '#7f86c9', boards: true, roof: '#5b4aa8', roofH: 88, trim: '#8d96ad',
        door: { x: 1048, w: 64, h: 100, color: '#ffcf4a' },
        windows: [[950, 300, 80, 70], [1130, 300, 80, 70], [1004, 250, 0, 0, { lit: false }]],
        sign: { text: 'SHOP', icon: 'shirt', iconColor: '#e2574c', x: 1080, y: 205, w: 180, color: '#fff' } });
      // shop awning
      for (var i = 0; i < 8; i++) A.poly(ctx, [940 + i * 36, 300, 976 + i * 36, 300, 976 + i * 36, 318, 958 + i * 36, 326, 940 + i * 36, 318], i % 2 ? '#ffffff' : '#e2574c', 2.5);
      // fountain basin + pedestal
      A.shadow(ctx, 640, 590, 150, 34, 0.25);
      A.ellipse(ctx, 640, 575, 132, 46, '#a7b4cf', 3.5);
      A.ellipse(ctx, 640, 566, 118, 38, '#bfe8f6', 3);
      ctx.save(); ctx.beginPath(); ctx.ellipse(640, 566, 118, 38, 0, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
      for (var c = 0; c < 6; c++) { ctx.beginPath(); ctx.moveTo(560 + c * 30, 550); ctx.lineTo(590 + c * 30, 584); ctx.stroke(); }
      ctx.restore();
      A.box(ctx, 610, 470, 60, 100, 8, '#c4cde2', 3);
      A.ellipse(ctx, 640, 470, 40, 12, '#dce3f2', 3);
    },
    animate: function (ctx, t) {
      K.smoke(ctx, 295, 180, t);
      K.stringLights(ctx, 70, 250, 360, 250, 14, t, 10);
      K.stringLights(ctx, 940, 238, 1220, 238, 12, t, 10);
      // shimmering ice in fountain
      ctx.save(); ctx.beginPath(); ctx.ellipse(640, 566, 118, 38, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; var sx = 520 + ((t * 60) % 280); ctx.fillRect(sx, 530, 18, 80);
      ctx.restore();
    },
    walk: [[0, 560], [140, 520], [175, 448], [265, 432], [330, 425], [520, 395], [590, 382], [690, 382], [800, 395], [845, 300], [905, 300], [915, 410], [1100, 445], [1280, 590], [1280, 730], [1160, 760], [1060, 880], [560, 880], [540, 900], [370, 900], [350, 880], [110, 850], [0, 720]],
    blocks: [{ e: [640, 570, 140, 50] }, { e: [60, 490, 50, 30] }, { e: [1225, 500, 50, 30] }, { e: [1150, 775, 40, 22] }, { e: [35, 810, 45, 26] }, { e: [1245, 835, 40, 25] }],
    npcSpots: { ollie: { at: [770, 650], wander: [720, 625, 130, 60], dir: -1 }, dot: { at: [430, 700], wander: [300, 640, 640, 180], dir: 1 } },
    questSpots: { tracksTown: [1000, 470], sculpture: [640, 650] },
    spawns: { 'default': [640, 700], lake: [80, 640], harbor: [1200, 650], slopes: [872, 360], iglooLane: [450, 840], cafe: [220, 462], shop: [1080, 455], lodge: [640, 410], map: [640, 700] },
    hotspots: [
      { id: 'toLake', hit: [0, 540, 90, 190], at: [30, 640], icon: 'left', badge: [50, 560], action: function () { AB.go('lake', 'town'); } },
      { id: 'toHarbor', hit: [1190, 570, 90, 170], at: [1260, 660], icon: 'right', badge: [1230, 570], action: function () { AB.go('harbor', 'town'); } },
      { id: 'toSlopes', hit: [825, 230, 100, 110], at: [872, 312], icon: 'up', badge: [872, 236], action: function () { AB.go('slopes', 'town'); } },
      { id: 'toIgloos', hit: [360, 820, 190, 80], at: [450, 890], icon: 'home', badge: [450, 808], action: function () { AB.go('iglooLane', 'town'); } },
      { id: 'cafeDoor', hit: [175, 300, 80, 110], at: [218, 450], icon: 'mug', badge: [215, 290], action: function () { AB.audio.sfx('door'); AB.go('cafe', 'town'); } },
      { id: 'lodgeDoor', hit: [600, 270, 80, 105], at: [640, 392], icon: 'paw', badge: [640, 262], action: function () { AB.audio.sfx('door'); AB.go('lodge', 'town'); } },
      { id: 'shopDoor', hit: [1040, 310, 80, 110], at: [1080, 430], icon: 'shop', badge: [1080, 300], action: function () { AB.audio.sfx('door'); AB.go('shop', 'town'); } }
    ],
    props: [
      tree(60, 500, 170, 'gem_town_tree'), tree(1225, 510, 180), tree(35, 830, 210), tree(1245, 850, 200),
      lamp(330, 545), lamp(960, 548), lamp(330, 800), lamp(1000, 805),
      bench(205, 690), bench(1060, 700),
      // sculpture on the fountain (changes as the quest decorates it)
      { x: 640, y: 571, hit: [570, 330, 140, 240], at: [640, 650],
        draw: function (ctx, t) { AB.townSculpture(ctx, 640, 470, t); },
        tap: function () { AB.quests.tapSculpture(); } },
      // noticeboard
      { x: 420, y: 455, hit: [370, 330, 100, 130], at: [430, 480],
        draw: function (ctx) {
          A.shadow(ctx, 420, 458, 50, 9);
          A.box(ctx, 382, 365, 8, 92, 2, C.woodDark, 2.5); A.box(ctx, 450, 365, 8, 92, 2, C.woodDark, 2.5);
          A.box(ctx, 372, 352, 96, 72, 6, C.wood, 3); A.box(ctx, 380, 360, 80, 56, 4, '#f4e2c4', 2);
          A.box(ctx, 386, 366, 30, 22, 2, '#fff', 1.5); A.box(ctx, 422, 368, 32, 26, 2, '#ffe9a6', 1.5); A.box(ctx, 392, 392, 34, 20, 2, '#c9ecff', 1.5);
          A.circle(ctx, 400, 366, 2.5, C.red, 0); A.circle(ctx, 438, 368, 2.5, C.blue, 0);
          A.poly(ctx, [366, 354, 474, 354, 420, 330], C.redDark, 3); A.ellipse(ctx, 420, 340, 30, 6, '#fff', 2);
        },
        tap: function () { AB.ui.noticeboard(); } },
      // town bell
      { x: 800, y: 470, hit: [760, 330, 80, 150], at: [800, 500],
        draw: function (ctx, t) {
          A.shadow(ctx, 800, 472, 34, 8);
          A.box(ctx, 770, 350, 8, 122, 2, C.woodDark, 2.5); A.box(ctx, 822, 350, 8, 122, 2, C.woodDark, 2.5);
          A.box(ctx, 760, 340, 80, 14, 4, C.wood, 3); A.ellipse(ctx, 790, 338, 30, 6, '#fff', 2);
          var sw = Math.sin(t * 14) * Math.max(0, bellSwing - t) * 0.6;
          ctx.save(); ctx.translate(800, 356); ctx.rotate(sw);
          A.shape(ctx, function (c) { c.moveTo(-16, 34); c.quadraticCurveTo(-16, 4, 0, 2); c.quadraticCurveTo(16, 4, 16, 34); c.lineTo(22, 40); c.lineTo(-22, 40); c.closePath(); }, '#ffc93c', 3);
          A.circle(ctx, 0, 44, 5, '#c58a12', 2); A.highlight(ctx, -7, 16, 3, 9, 0.6);
          ctx.restore();
        },
        tap: function () { bellSwing = AB.world.t + 1.5; AB.audio.sfx('bell'); AB.world.burst(800, 360, 'note', 4); AB.quests.revealGem('gem_bell', 850, 500); } },
      // snowman
      { x: 1150, y: 780, hit: [1105, 650, 90, 140], at: [1080, 800],
        draw: function (ctx, t) {
          var hop = Math.max(0, snowmanHop - t);
          ctx.save(); ctx.translate(0, -Math.abs(Math.sin(hop * 12)) * hop * 30);
          A.shadow(ctx, 1150, 782, 42, 10);
          A.circle(ctx, 1150, 750, 34, '#fff', 3); A.circle(ctx, 1150, 698, 25, '#fff', 3); A.circle(ctx, 1150, 660, 19, '#fff', 3);
          A.circle(ctx, 1143, 655, 2.6, C.out, 0); A.circle(ctx, 1157, 655, 2.6, C.out, 0);
          A.poly(ctx, [1150, 662, 1172, 666, 1150, 669], C.orange, 1.5);
          A.box(ctx, 1138, 612, 24, 28, 3, '#30364d', 2.5); A.box(ctx, 1132, 636, 36, 10, 3, '#30364d', 2.5);
          A.circle(ctx, 1150, 700, 3, C.out, 0); A.circle(ctx, 1150, 714, 3, C.out, 0);
          A.line(ctx, [1126, 700, 1100, 682], 3, C.woodDark); A.line(ctx, [1174, 700, 1198, 684], 3, C.woodDark);
          ctx.restore();
        },
        tap: function () { snowmanHop = AB.world.t + 0.8; AB.audio.sfx('jump'); AB.world.burst(1150, 700, 'snow', 8); } },
      // welcome sign
      { x: 600, y: 860, draw: function (ctx) {
          A.shadow(ctx, 600, 862, 70, 10);
          A.box(ctx, 540, 790, 10, 72, 2, C.woodDark, 2.5); A.box(ctx, 650, 790, 10, 72, 2, C.woodDark, 2.5);
          A.box(ctx, 515, 760, 170, 62, 14, '#fff4dc', 3.5);
          ctx.fillStyle = C.out; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = '900 16px ' + AB.FONT; ctx.fillText('WELCOME TO', 600, 776);
          ctx.font = '900 24px ' + AB.FONT; ctx.fillStyle = '#3b6fd1'; ctx.fillText('AURORA BAY', 600, 801);
          A.ellipse(ctx, 560, 760, 40, 6, '#fff', 2);
        } }
    ]
  });

  /** The snow sculpture on the fountain: a big friendly snow seal. Decorations come from the quest. */
  AB.townSculpture = function (ctx, x, y, t) {
    var dec = (AB.game.profile && AB.game.profile.sculpture) || [];
    ctx.save(); ctx.translate(x, y);
    A.shape(ctx, function (c) { c.moveTo(-58, 2); c.bezierCurveTo(-60, -60, -30, -120, 4, -120); c.bezierCurveTo(40, -120, 56, -70, 54, 2); c.closePath(); }, '#ffffff', 3.5);
    ctx.save(); ctx.globalAlpha = 0.5; A.shape(ctx, function (c) { c.moveTo(20, 2); c.bezierCurveTo(34, -40, 40, -90, 4, -120); c.bezierCurveTo(40, -120, 56, -70, 54, 2); c.closePath(); }, C.snowShade, 0); ctx.restore();
    A.ellipse(ctx, -46, -6, 18, 9, '#ffffff', 3, null, -0.4); A.ellipse(ctx, 44, -6, 18, 9, '#ffffff', 3, null, 0.4);
    A.circle(ctx, -12, -84, 4, '#9fb3d6', 0); A.circle(ctx, 18, -84, 4, '#9fb3d6', 0);
    if (dec.indexOf('pinecone') >= 0) AB.art.pinecone(ctx, 3, -66, 0.75); else A.ellipse(ctx, 3, -70, 7, 5, '#c8d6ee', 0);
    if (dec.indexOf('shell') >= 0) { A.line(ctx, [-30, -46, 0, -36, 32, -46], 3, '#ff8fb1'); AB.art.shell(ctx, 1, -30, 0.7, '#ffc2a8'); }
    if (dec.indexOf('star') >= 0) { A.glow(ctx, 4, -138, 40, 'rgba(255,230,120,', 0.5 + 0.2 * Math.sin(t * 3)); A.star(ctx, 4, -138, 20, '#ffcf4a', 3); }
    if (dec.indexOf('scarf') >= 0) { A.shape(ctx, function (c) { c.moveTo(-40, -52); c.quadraticCurveTo(4, -36, 46, -52); c.lineTo(46, -40); c.quadraticCurveTo(4, -24, -40, -40); c.closePath(); }, C.teal, 3); }
    if (dec.length >= 3) { for (var i = 0; i < 4; i++) A.sparkle(ctx, Math.cos(t + i * 1.6) * 70, -70 + Math.sin(t * 1.3 + i) * 50, 6, 0.6 + 0.4 * Math.sin(t * 4 + i)); }
    ctx.restore();
  };
})();
