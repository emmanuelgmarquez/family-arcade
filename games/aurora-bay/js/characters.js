/* Aurora Bay — animal characters and the clothes that fit them.
 * AB.chars.draw(ctx, x, y, look, st) draws a character with its feet at (x, y).
 *   look = { species, palette, outfit: { head, face, neck, body } }
 *   st   = { t, moving, dir (1 right / -1 left), back (facing away), scale, pose: 'stand'|'sit'|'wave'|'happy'|'sleep', skate }
 * Each species declares anchors (where hats, glasses, scarves sit) and a body path that
 * sweaters are clipped to, so every clothing item fits every animal. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C;
  var CH = AB.chars = {};
  var OUT = C.out;

  function eye(ctx, x, y, r, st, color) {
    if (st.blink || st.pose === 'sleep') { A.line(ctx, [x - r, y, x + r, y], 2.6); return; }
    if (st.pose === 'happy') { ctx.beginPath(); ctx.arc(x, y + r * 0.4, r, Math.PI * 1.1, Math.PI * 1.9); ctx.lineWidth = 2.8; ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke(); return; }
    A.ellipse(ctx, x, y, r, r * 1.12, color || OUT, 0);
    A.circle(ctx, x + r * 0.32, y - r * 0.38, r * 0.36, '#fff', 0);
  }
  function blush(ctx, x, y, r) { ctx.save(); ctx.fillStyle = 'rgba(255,120,150,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  function shadeClip(ctx, pathFn, color, dx) {
    ctx.save(); ctx.beginPath(); pathFn(ctx); ctx.clip(); ctx.globalAlpha = 0.14; ctx.fillStyle = color || '#1d2b52';
    ctx.fillRect(-80, -200, 62 + (dx || 0), 260); ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Species
  // ---------------------------------------------------------------------------
  var S = CH.species = {};

  S.penguin = {
    name: 'Penguin', move: 'waddle', speed: 210,
    palettes: [
      { id: 'midnight', name: 'Midnight', body: '#2e3b5e', belly: '#fdfdfd', beak: '#ffa53a', feet: '#ff9a3c' },
      { id: 'slate', name: 'Slate Blue', body: '#4f78b8', belly: '#fdfdfd', beak: '#ffa53a', feet: '#ff9a3c' },
      { id: 'little', name: 'Little Blue', body: '#5db0ea', belly: '#f2f8ff', beak: '#3d4c6e', feet: '#ff9fb4' },
      { id: 'chinstrap', name: 'Chinstrap', body: '#596377', belly: '#fdfdfd', beak: '#3d4c6e', feet: '#ffa1b8', strap: true },
      { id: 'rockhopper', name: 'Rockhopper', body: '#303a52', belly: '#fdfdfd', beak: '#ff6a3c', feet: '#ff9fb4', crest: '#ffd23f' },
      { id: 'emperor', name: 'Emperor', body: '#2f3a57', belly: '#fffaf0', beak: '#ff8a3c', feet: '#3d4c6e', cheek: '#ffc24a' }
    ],
    anchors: { head: { x: 3, y: -94, w: 46, tilt: 0 }, eyes: { x: 9, y: -72, w: 34 }, neck: { x: 3, y: -52, w: 58 }, top: -100 },
    bodyPath: function (c) { c.ellipse(0, -47, 31, 47, 0, 0, Math.PI * 2); },
    draw: function (ctx, p, st, wear) {
      var t = st.t, mv = st.moving && !st.sit, step = mv ? Math.sin(t * 12) : 0;
      // feet
      if (!st.sit) {
        A.ellipse(ctx, -11 + step * 3, -2 - Math.max(0, step) * 3, 11, 6, p.feet, 2.5);
        A.ellipse(ctx, 12 - step * 3, -2 - Math.max(0, -step) * 3, 11, 6, p.feet, 2.5);
      }
      // back flipper
      ctx.save(); ctx.translate(-26, -48); ctx.rotate(0.35 + (mv ? step * 0.25 : Math.sin(t * 2) * 0.05));
      A.ellipse(ctx, 0, 14, 9, 24, U.shade(p.body, -0.15), 2.5); ctx.restore();
      ctx.beginPath(); this.bodyPath(ctx); A.fs(ctx, p.body, 3);
      if (!st.back) {
        ctx.save(); ctx.beginPath(); this.bodyPath(ctx); ctx.clip();
        A.ellipse(ctx, 6, -38, 22, 34, p.belly, 0);
        A.ellipse(ctx, 9, -70, 18, 14, p.belly, 0);
        if (p.strap) A.line(ctx, [-6, -60, 10, -54, 24, -60], 2.5, OUT);
        if (p.cheek) { A.ellipse(ctx, -6, -66, 7, 11, p.cheek, 0); }
        ctx.restore();
      }
      shadeClip(ctx, this.bodyPath, null, -8);
      ctx.beginPath(); this.bodyPath(ctx); A.fs(ctx, null, 3);
      wear('body');
      if (!st.back) {
        eye(ctx, 2, -72, 4.4, st); eye(ctx, 18, -72, 4.4, st);
        blush(ctx, -2, -62, 5); blush(ctx, 24, -62, 4);
        A.poly(ctx, [10, -66, 30, -61, 10, -57], p.beak, 2.5);
      }
      if (p.crest) {
        A.poly(ctx, [-6, -84, -24, -98, -10, -88, -18, -104, -2, -90], p.crest, 2);
        A.poly(ctx, [14, -84, 28, -96, 18, -86], p.crest, 2);
      }
      wear('neck'); if (!st.back) wear('face'); wear('head');
      // front flipper (waves)
      ctx.save(); ctx.translate(24, -52);
      var wave = st.pose === 'wave' ? -2.2 + Math.sin(t * 10) * 0.35 : (mv ? -step * 0.25 : Math.sin(t * 2 + 1) * 0.05);
      ctx.rotate(-0.3 + wave); A.ellipse(ctx, 0, 14, 8, 22, U.shade(p.body, -0.08), 2.5); ctx.restore();
    }
  };

  S.fox = {
    name: 'Arctic Fox', move: 'trot', speed: 240,
    palettes: [
      { id: 'winter', name: 'Winter White', body: '#f7f8fc', shade: '#d6deef', accent: '#3d4c6e', inner: '#ffc1d0' },
      { id: 'blue', name: 'Blue Morph', body: '#8696b6', shade: '#6a7a9c', accent: '#2c3654', inner: '#e8b6c6', belly: '#c7d0e2' },
      { id: 'silver', name: 'Silver', body: '#c6cddb', shade: '#a5aec2', accent: '#3d4c6e', inner: '#ffc1d0', belly: '#eef1f7' },
      { id: 'cream', name: 'Cream', body: '#f5e4c4', shade: '#ddc79f', accent: '#5b4636', inner: '#ffc1d0', belly: '#fff6e6' },
      { id: 'summer', name: 'Summer', body: '#b48a68', shade: '#906a4c', accent: '#3a2a20', inner: '#f4b7a5', belly: '#f1dfc8' }
    ],
    anchors: { head: { x: 4, y: -98, w: 40, tilt: 0 }, eyes: { x: 10, y: -78, w: 30 }, neck: { x: 2, y: -56, w: 40 }, top: -112 },
    bodyPath: function (c) { c.ellipse(0, -32, 24, 30, 0, 0, Math.PI * 2); },
    draw: function (ctx, p, st, wear) {
      var t = st.t, mv = st.moving && !st.sit, step = mv ? Math.sin(t * 14) : 0;
      var sway = Math.sin(t * (mv ? 9 : 2.2)) * (mv ? 0.25 : 0.12);
      // tail
      ctx.save(); ctx.translate(-18, -18); ctx.rotate(-0.5 + sway);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-34, 6, -46, -34, -22, -52); ctx.bezierCurveTo(-14, -30, -6, -20, 6, -10); ctx.closePath();
      A.fs(ctx, p.body, 3);
      ctx.beginPath(); ctx.moveTo(-17, -46); ctx.bezierCurveTo(-26, -40, -28, -48, -22, -52); ctx.closePath(); A.fs(ctx, p.belly || '#fff', 2);
      ctx.restore();
      // legs
      if (!st.sit) {
        A.ellipse(ctx, -10, -4 - Math.max(0, step) * 4, 8, 7, p.shade, 2.5);
        A.ellipse(ctx, 11, -4 - Math.max(0, -step) * 4, 8, 7, p.shade, 2.5);
      } else { A.ellipse(ctx, 14, -6, 12, 6, p.shade, 2.5); }
      ctx.beginPath(); this.bodyPath(ctx); A.fs(ctx, p.body, 3);
      if (!st.back) { ctx.save(); ctx.beginPath(); this.bodyPath(ctx); ctx.clip(); A.ellipse(ctx, 6, -26, 14, 20, p.belly || '#ffffff', 0); ctx.restore(); }
      shadeClip(ctx, this.bodyPath, null, -6); ctx.beginPath(); this.bodyPath(ctx); A.fs(ctx, null, 3);
      wear('body');
      // arms
      var wave = st.pose === 'wave';
      ctx.save(); ctx.translate(18, -46); ctx.rotate(wave ? -2.4 + Math.sin(t * 10) * 0.3 : -0.2 - step * 0.2); A.ellipse(ctx, 0, 10, 6, 13, p.body, 2.5); ctx.restore();
      wear('neck'); // tucked under the chin: drawn before the head
      // head
      var hy = -76;
      // ears
      A.poly(ctx, [-14, hy - 12, -18, hy - 38, -2, hy - 20], p.body, 3);
      A.poly(ctx, [10, hy - 18, 20, hy - 40, 24, hy - 10], p.body, 3);
      if (!st.back) { A.poly(ctx, [-12, hy - 16, -15, hy - 31, -5, hy - 21], p.inner, 0); A.poly(ctx, [13, hy - 19, 19, hy - 33, 21, hy - 14], p.inner, 0); }
      A.circle(ctx, 4, hy, 23, p.body, 3);
      if (!st.back) {
        // snout
        ctx.beginPath(); ctx.moveTo(10, hy + 2); ctx.quadraticCurveTo(34, hy + 2, 36, hy + 9); ctx.quadraticCurveTo(26, hy + 18, 8, hy + 14); ctx.closePath(); A.fs(ctx, p.belly || '#fff', 2.5);
        A.circle(ctx, 35, hy + 7, 3.6, p.accent, 0);
        eye(ctx, 2, hy - 3, 4, st); eye(ctx, 18, hy - 3, 4, st);
        blush(ctx, -4, hy + 8, 5);
      }
      if (!st.back) wear('face'); wear('head');
    }
  };

  S.bear = {
    name: 'Polar Bear Cub', move: 'amble', speed: 190,
    palettes: [
      { id: 'snow', name: 'Snow', body: '#fbfbf6', shade: '#dfe3ea', nose: '#2f3a52' },
      { id: 'cream', name: 'Cream', body: '#f6e8cb', shade: '#e0cca6', nose: '#3a2e29' },
      { id: 'honey', name: 'Honey', body: '#ecd09a', shade: '#d3b273', nose: '#3a2e29' },
      { id: 'mist', name: 'Misty', body: '#dfe5ef', shade: '#bfc8d8', nose: '#2f3a52' }
    ],
    anchors: { head: { x: 3, y: -104, w: 50, tilt: 0 }, eyes: { x: 10, y: -84, w: 32 }, neck: { x: 2, y: -58, w: 52 }, top: -110 },
    bodyPath: function (c) { c.ellipse(0, -34, 32, 31, 0, 0, Math.PI * 2); },
    draw: function (ctx, p, st, wear) {
      var t = st.t, mv = st.moving && !st.sit, step = mv ? Math.sin(t * 9) : 0;
      if (!st.sit) {
        A.ellipse(ctx, -14, -5 - Math.max(0, step) * 3, 11, 8, p.shade, 2.5);
        A.ellipse(ctx, 15, -5 - Math.max(0, -step) * 3, 11, 8, p.shade, 2.5);
      } else { A.ellipse(ctx, -14, -4, 12, 8, p.shade, 2.5); A.ellipse(ctx, 16, -4, 12, 8, p.shade, 2.5); }
      ctx.beginPath(); this.bodyPath(ctx); A.fs(ctx, p.body, 3);
      shadeClip(ctx, this.bodyPath, null, -6); ctx.beginPath(); this.bodyPath(ctx); A.fs(ctx, null, 3);
      wear('body');
      var wave = st.pose === 'wave';
      ctx.save(); ctx.translate(-26, -42); ctx.rotate(0.3 + step * 0.2); A.ellipse(ctx, 0, 10, 9, 15, p.body, 2.5); ctx.restore();
      ctx.save(); ctx.translate(26, -44); ctx.rotate(wave ? -2.5 + Math.sin(t * 10) * 0.3 : -0.3 - step * 0.2); A.ellipse(ctx, 0, 10, 9, 15, p.body, 2.5); ctx.restore();
      wear('neck'); // tucked under the chin: drawn before the head
      var hy = -80;
      A.circle(ctx, -18, hy - 20, 10, p.body, 3); A.circle(ctx, 22, hy - 20, 10, p.body, 3);
      if (!st.back) { A.circle(ctx, -18, hy - 20, 5, p.shade, 0); A.circle(ctx, 22, hy - 20, 5, p.shade, 0); }
      A.ellipse(ctx, 3, hy, 28, 25, p.body, 3);
      if (!st.back) {
        A.ellipse(ctx, 12, hy + 9, 13, 10, p.shade, 2.5);
        A.ellipse(ctx, 14, hy + 4, 5.5, 4, p.nose, 0);
        A.line(ctx, [14, hy + 8, 14, hy + 12], 2);
        eye(ctx, 0, hy - 6, 4.2, st); eye(ctx, 22, hy - 6, 4.2, st);
        blush(ctx, -10, hy + 6, 6); blush(ctx, 28, hy + 8, 4);
      }
      if (!st.back) wear('face'); wear('head');
    }
  };

  S.seal = {
    name: 'Seal', move: 'scoot', speed: 185,
    palettes: [
      { id: 'harp', name: 'Harp', body: '#c8d2e0', shade: '#a5b2c6', belly: '#e9eef6', spots: '#6b7894' },
      { id: 'pup', name: 'Fluffy Pup', body: '#fbfdff', shade: '#dfe7f2', belly: '#ffffff' },
      { id: 'spotted', name: 'Spotted', body: '#97a4b8', shade: '#7b889e', belly: '#c9d2df', spots: '#4f5b75' },
      { id: 'ringed', name: 'Ringed', body: '#6f7b91', shade: '#5a657a', belly: '#aeb8c9', rings: '#c8d1e0' },
      { id: 'brown', name: 'Cocoa', body: '#8d6d58', shade: '#715645', belly: '#c8ac93' }
    ],
    anchors: { head: { x: 10, y: -96, w: 40, tilt: 0.05 }, eyes: { x: 15, y: -76, w: 28 }, neck: { x: 7, y: -54, w: 42 }, top: -100 },
    bodyPath: function (c) {
      c.moveTo(-40, -4); c.bezierCurveTo(-36, -36, -16, -60, 8, -60); c.bezierCurveTo(28, -58, 30, -30, 28, -8);
      c.quadraticCurveTo(0, 2, -40, -4); c.closePath();
    },
    draw: function (ctx, p, st, wear) {
      var t = st.t, mv = st.moving && !st.sit, sc = mv ? Math.sin(t * 9) : 0;
      // scoot: squash and stretch happens in the outer transform; here flippers
      ctx.save(); ctx.translate(-42, -6); ctx.rotate(0.5 + sc * 0.3);
      A.poly(ctx, [0, 0, -18, -14, -12, 2, -18, 12], p.shade, 2.5); ctx.restore();
      ctx.beginPath(); this.bodyPath(ctx); A.fs(ctx, p.body, 3);
      ctx.save(); ctx.beginPath(); this.bodyPath(ctx); ctx.clip();
      if (!st.back) A.ellipse(ctx, 12, -20, 18, 24, p.belly, 0);
      if (p.spots) { [[-22, -20, 5], [-10, -40, 4], [-28, -10, 3.5], [2, -48, 3]].forEach(function (s) { A.ellipse(ctx, s[0], s[1], s[2] * 1.3, s[2], p.spots, 0); }); }
      if (p.rings) { [[-22, -22], [-6, -42], [-30, -10]].forEach(function (s) { A.ellipse(ctx, s[0], s[1], 6, 4.5, null, 2, p.rings); }); }
      ctx.restore();
      shadeClip(ctx, this.bodyPath, null, -12); ctx.beginPath(); this.bodyPath(ctx); A.fs(ctx, null, 3);
      wear('body');
      // front flipper
      ctx.save(); ctx.translate(20, -26);
      var wave = st.pose === 'wave';
      ctx.rotate(wave ? -2.2 + Math.sin(t * 10) * 0.3 : 0.5 - sc * 0.3); A.ellipse(ctx, 0, 10, 7, 15, p.shade, 2.5); ctx.restore();
      wear('neck'); // tucked under the chin: drawn before the head
      var hx = 12, hy = -72;
      A.ellipse(ctx, hx, hy, 23, 21, p.body, 3);
      if (!st.back) {
        A.ellipse(ctx, hx + 13, hy + 9, 11, 8, p.belly, 2);
        A.ellipse(ctx, hx + 18, hy + 4, 4.5, 3.5, OUT, 0);
        ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
        [[-5], [0], [5]].forEach(function (d) { ctx.beginPath(); ctx.moveTo(hx + 22, hy + 10 + d[0] * 0.3); ctx.lineTo(hx + 34, hy + 8 + d[0]); ctx.stroke(); });
        eye(ctx, hx - 2, hy - 4, 5.2, st); eye(ctx, hx + 14, hy - 5, 5, st);
        blush(ctx, hx - 8, hy + 8, 5);
      }
      if (!st.back) wear('face'); wear('head');
    }
  };

  S.owl = {
    name: 'Snowy Owl', move: 'flutter', speed: 230,
    palettes: [
      { id: 'snowy', name: 'Snowy', body: '#ffffff', shade: '#dfe5f0', fleck: '#46516b', eye: '#ffd23f', beak: '#3d4c6e' },
      { id: 'cream', name: 'Cream', body: '#f8eedb', shade: '#e2d2b3', fleck: '#7a5f45', eye: '#ffc23a', beak: '#5b4636' },
      { id: 'barred', name: 'Barred', body: '#dde2ec', shade: '#bec6d6', fleck: '#59647d', eye: '#ffd23f', beak: '#3d4c6e', bars: true },
      { id: 'golden', name: 'Golden', body: '#f6dc98', shade: '#e0bd6e', fleck: '#8a6331', eye: '#ffffff', beak: '#5b4636' }
    ],
    anchors: { head: { x: 0, y: -96, w: 48, tilt: 0 }, eyes: { x: 2, y: -74, w: 40 }, neck: { x: 1, y: -52, w: 54 }, top: -100 },
    bodyPath: function (c) { c.ellipse(0, -46, 31, 44, 0, 0, Math.PI * 2); },
    draw: function (ctx, p, st, wear) {
      var t = st.t, fly = st.moving && !st.sit, flap = fly ? Math.sin(t * 18) : 0;
      if (!st.sit && !fly) { A.ellipse(ctx, -9, -2, 7, 4, '#5b4636', 2); A.ellipse(ctx, 9, -2, 7, 4, '#5b4636', 2); }
      // wings
      function wing(side) {
        ctx.save(); ctx.translate(side * 26, -50);
        var r = fly ? side * (-0.9 - flap * 0.7) : side * 0.12;
        if (st.pose === 'wave' && side > 0) r = -1.9 + Math.sin(t * 10) * 0.3;
        ctx.rotate(r);
        ctx.beginPath(); ctx.ellipse(side * 6, 14, 12, 28, 0, 0, Math.PI * 2); A.fs(ctx, p.shade, 2.5);
        ctx.strokeStyle = U.alpha(p.fleck, 0.5); ctx.lineWidth = 1.6;
        for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(side * 0, 20 + i * 8); ctx.lineTo(side * 12, 18 + i * 8); ctx.stroke(); }
        ctx.restore();
      }
      wing(-1);
      ctx.beginPath(); this.bodyPath(ctx); A.fs(ctx, p.body, 3);
      ctx.save(); ctx.beginPath(); this.bodyPath(ctx); ctx.clip();
      ctx.fillStyle = U.alpha(p.fleck, 0.55);
      var r = U.seeded(5);
      for (var i = 0; i < 16; i++) { var fx = -22 + r() * 44, fy = -50 + r() * 44; ctx.beginPath(); ctx.ellipse(fx, fy, 3, 1.6, 0, 0, Math.PI * 2); ctx.fill(); }
      if (p.bars) { ctx.strokeStyle = U.alpha(p.fleck, 0.45); ctx.lineWidth = 2; for (var b = 0; b < 5; b++) { ctx.beginPath(); ctx.moveTo(-30, -40 + b * 9); ctx.quadraticCurveTo(0, -36 + b * 9, 30, -40 + b * 9); ctx.stroke(); } }
      ctx.restore();
      shadeClip(ctx, this.bodyPath, null, -8); ctx.beginPath(); this.bodyPath(ctx); A.fs(ctx, null, 3);
      wear('body');
      wing(1);
      if (!st.back) {
        // facial disc
        A.ellipse(ctx, 2, -72, 25, 18, '#fffdf8', 0);
        A.circle(ctx, -8, -74, 8.5, p.eye, 2.5); A.circle(ctx, 12, -74, 8.5, p.eye, 2.5);
        if (st.blink || st.pose === 'sleep') { A.line(ctx, [-14, -74, -2, -74], 2.6); A.line(ctx, [6, -74, 18, -74], 2.6); }
        else if (st.pose === 'happy') { eye(ctx, -8, -74, 5, st); eye(ctx, 12, -74, 5, st); }
        else { A.circle(ctx, -6, -74, 4.3, OUT, 0); A.circle(ctx, 14, -74, 4.3, OUT, 0); A.circle(ctx, -4.6, -75.8, 1.5, '#fff', 0); A.circle(ctx, 15.4, -75.8, 1.5, '#fff', 0); }
        A.poly(ctx, [2, -68, 8, -66, 3, -58], p.beak, 2);
        blush(ctx, -16, -64, 5); blush(ctx, 22, -64, 5);
      }
      // ear tufts
      A.poly(ctx, [-20, -86, -24, -100, -12, -90], p.body, 2.5); A.poly(ctx, [18, -90, 26, -100, 24, -86], p.body, 2.5);
      wear('neck'); if (!st.back) wear('face'); wear('head');
    }
  };

  S.hare = {
    name: 'Arctic Hare', move: 'hop', speed: 250,
    palettes: [
      { id: 'snow', name: 'Snow', body: '#fbfcff', shade: '#dce3ef', inner: '#ffc1d0', tip: '#3d4c6e' },
      { id: 'cream', name: 'Cream', body: '#f4e7cf', shade: '#dccaa8', inner: '#ffc1d0', tip: '#5b4636' },
      { id: 'meadow', name: 'Meadow', body: '#b9a58d', shade: '#9a866e', inner: '#f2b4b4', tip: '#3a2a20', belly: '#efe4d3' },
      { id: 'silver', name: 'Silver', body: '#cbd1dd', shade: '#adb4c4', inner: '#ffc1d0', tip: '#3d4c6e' }
    ],
    anchors: { head: { x: 6, y: -88, w: 36, tilt: 0 }, eyes: { x: 12, y: -70, w: 28 }, neck: { x: 4, y: -48, w: 38 }, top: -128, earsOver: true },
    bodyPath: function (c) { c.ellipse(0, -30, 25, 28, 0, 0, Math.PI * 2); },
    draw: function (ctx, p, st, wear) {
      var t = st.t, mv = st.moving && !st.sit;
      A.circle(ctx, -24, -24, 9, '#fff', 2.5);
      // big hind feet
      A.ellipse(ctx, -6, -4, 16, 6, p.shade, 2.5);
      A.ellipse(ctx, 14, -4, 12, 6, p.shade, 2.5);
      ctx.beginPath(); this.bodyPath(ctx); A.fs(ctx, p.body, 3);
      if (!st.back) { ctx.save(); ctx.beginPath(); this.bodyPath(ctx); ctx.clip(); A.ellipse(ctx, 6, -24, 14, 18, p.belly || '#ffffff', 0); ctx.restore(); }
      shadeClip(ctx, this.bodyPath, null, -6); ctx.beginPath(); this.bodyPath(ctx); A.fs(ctx, null, 3);
      wear('body');
      var wave = st.pose === 'wave';
      ctx.save(); ctx.translate(18, -40); ctx.rotate(wave ? -2.4 + Math.sin(t * 10) * 0.3 : -0.15); A.ellipse(ctx, 0, 9, 6, 12, p.body, 2.5); ctx.restore();
      wear('neck'); // tucked under the chin: drawn before the head
      var hx = 6, hy = -66;
      A.circle(ctx, hx, hy, 21, p.body, 3);
      if (!st.back) {
        eye(ctx, hx - 2, hy - 3, 4.2, st); eye(ctx, hx + 13, hy - 3, 4, st);
        A.poly(ctx, [hx + 19, hy + 5, hx + 25, hy + 5, hx + 22, hy + 9], p.inner, 1.5);
        A.line(ctx, [hx + 22, hy + 9, hx + 22, hy + 13], 1.8);
        blush(ctx, hx - 8, hy + 8, 5);
        ctx.strokeStyle = OUT; ctx.lineWidth = 1.3; [[0], [4]].forEach(function (d) { ctx.beginPath(); ctx.moveTo(hx + 25, hy + 9 + d[0]); ctx.lineTo(hx + 36, hy + 7 + d[0] * 1.5); ctx.stroke(); });
      }
      if (!st.back) wear('face'); wear('head');
      // ears drawn over hats so they poke through
      var flop = Math.sin(t * (mv ? 14 : 2)) * (mv ? 0.12 : 0.04);
      [[-6, -0.18], [14, 0.14]].forEach(function (e, i) {
        ctx.save(); ctx.translate(hx + e[0], hy - 16); ctx.rotate(e[1] + (i ? -flop : flop));
        A.ellipse(ctx, 0, -24, 8, 26, p.body, 3);
        if (!st.back) A.ellipse(ctx, 0, -22, 4, 18, p.inner, 0);
        ctx.save(); ctx.beginPath(); ctx.ellipse(0, -24, 8, 26, 0, 0, Math.PI * 2); ctx.clip(); A.ellipse(ctx, 0, -50, 9, 8, p.tip, 0); ctx.restore();
        A.ellipse(ctx, 0, -24, 8, 26, null, 3);
        ctx.restore();
      });
    }
  };

  CH.ORDER = ['penguin', 'fox', 'bear', 'seal', 'owl', 'hare'];
  CH.palette = function (look) {
    var sp = S[look.species] || S.penguin;
    for (var i = 0; i < sp.palettes.length; i++) if (sp.palettes[i].id === look.palette) return sp.palettes[i];
    return sp.palettes[0];
  };

  // ---------------------------------------------------------------------------
  // Clothing — drawn relative to species anchors. slot: head | face | neck | body
  // ---------------------------------------------------------------------------
  var CL = CH.clothes = {};
  function hat(fn) { return function (ctx, a, look) { var h = a.head; ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.tilt || 0); var s = h.w / 44; ctx.scale(s, s); fn(ctx, look); ctx.restore(); }; }
  function face(fn) { return function (ctx, a) { var e = a.eyes; ctx.save(); ctx.translate(e.x, e.y); var s = e.w / 32; ctx.scale(s, s); fn(ctx); ctx.restore(); }; }
  function neck(fn) { return function (ctx, a, look, st) { var n = a.neck; ctx.save(); ctx.translate(n.x, n.y); var s = n.w / 50; ctx.scale(s, 1); fn(ctx, st); ctx.restore(); }; }
  function body(fn) {
    return function (ctx, a, look, st, sp) {
      ctx.save(); ctx.beginPath(); sp.bodyPath(ctx); ctx.clip();
      fn(ctx, a.neck.y, sp, look);
      ctx.restore();
      ctx.beginPath(); sp.bodyPath(ctx); A.fs(ctx, null, 3);
    };
  }
  function beanie(col, stripe, pom) {
    return hat(function (ctx) {
      ctx.beginPath(); ctx.moveTo(-24, 10); ctx.bezierCurveTo(-24, -24, 24, -24, 24, 10); ctx.closePath(); A.fs(ctx, col, 3);
      if (stripe) { ctx.save(); ctx.beginPath(); ctx.moveTo(-24, 10); ctx.bezierCurveTo(-24, -24, 24, -24, 24, 10); ctx.clip(); ctx.fillStyle = stripe; ctx.fillRect(-30, -6, 60, 6); ctx.fillRect(-30, -18, 60, 5); ctx.restore(); ctx.beginPath(); ctx.moveTo(-24, 10); ctx.bezierCurveTo(-24, -24, 24, -24, 24, 10); A.fs(ctx, null, 3); }
      A.box(ctx, -26, 2, 52, 12, 6, U.shade(col, -0.15), 3);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5; for (var i = -20; i <= 20; i += 6) { ctx.beginPath(); ctx.moveTo(i, 4); ctx.lineTo(i, 12); ctx.stroke(); }
      if (pom) A.circle(ctx, 0, -18, 8, pom, 2.5);
    });
  }
  CL.beanie_blue = { slot: 'head', name: 'Blue Beanie', price: 0, draw: beanie('#4a8fe0', null, '#ffffff') };
  CL.beanie_red = { slot: 'head', name: 'Red Beanie', price: 20, draw: beanie('#e2574c', null, '#ffffff') };
  CL.beanie_stripe = { slot: 'head', name: 'Stripy Hat', price: 30, draw: beanie('#35b5a4', '#ffcf4a', '#ff8fb1') };
  CL.beanie_purple = { slot: 'head', name: 'Plum Pom Hat', price: 25, draw: beanie('#8e6bd8', '#ffffff', '#ffcf4a') };
  CL.top_hat = { slot: 'head', name: 'Top Hat', price: 60, draw: hat(function (ctx) {
    A.ellipse(ctx, 0, 8, 30, 7, '#30364d', 3); A.box(ctx, -18, -34, 36, 42, 4, '#30364d', 3); A.box(ctx, -18, -4, 36, 8, 0, '#e2574c', 2.5); A.highlight(ctx, -10, -24, 3, 9, 0.25);
  }) };
  CL.propeller = { slot: 'head', name: 'Propeller Cap', price: 45, draw: hat(function (ctx, look) {
    ctx.beginPath(); ctx.moveTo(-23, 8); ctx.bezierCurveTo(-23, -20, 23, -20, 23, 8); ctx.closePath(); A.fs(ctx, '#ffcf4a', 3);
    ctx.save(); ctx.beginPath(); ctx.moveTo(-23, 8); ctx.bezierCurveTo(-23, -20, 23, -20, 23, 8); ctx.clip(); ctx.fillStyle = '#e2574c'; ctx.fillRect(-8, -20, 16, 30); ctx.fillStyle = '#4a8fe0'; ctx.fillRect(-30, -20, 14, 30); ctx.fillRect(16, -20, 14, 30); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-23, 8); ctx.bezierCurveTo(-23, -20, 23, -20, 23, 8); A.fs(ctx, null, 3);
    A.ellipse(ctx, 18, 9, 16, 5, '#4a8fe0', 2.5);
    A.line(ctx, [0, -13, 0, -22], 2.5);
    var sp = Math.sin((AB.now || 0) * 20);
    A.ellipse(ctx, 0, -23, 18 * Math.abs(sp) + 3, 4, '#e2574c', 2);
    A.circle(ctx, 0, -23, 3, '#ffcf4a', 1.5);
  }) };
  CL.flower_crown = { slot: 'head', name: 'Flower Crown', price: 0, draw: hat(function (ctx) {
    A.line(ctx, [-24, 6, -12, 0, 0, -2, 12, 0, 24, 6], 4, '#3d8c48');
    [[-20, 3, '#ff8fb1'], [-8, -1, '#ffcf4a'], [4, -2, '#ffffff'], [16, 1, '#8e6bd8']].forEach(function (f) {
      for (var i = 0; i < 5; i++) { var a = i * Math.PI * 2 / 5; A.circle(ctx, f[0] + Math.cos(a) * 4, f[1] + Math.sin(a) * 4, 3.4, f[2], 1.5); }
      A.circle(ctx, f[0], f[1], 2.4, '#ffcf4a', 1);
    });
  }) };
  CL.earmuffs = { slot: 'head', name: 'Earmuffs', price: 30, draw: hat(function (ctx) {
    ctx.beginPath(); ctx.arc(0, 18, 26, Math.PI * 1.05, Math.PI * 1.95); ctx.lineWidth = 7; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = '#8e6bd8'; ctx.stroke();
    A.circle(ctx, -25, 20, 10, '#ff8fb1', 3); A.circle(ctx, 25, 20, 10, '#ff8fb1', 3);
    A.highlight(ctx, -28, 16, 3, 2, 0.6); A.highlight(ctx, 22, 16, 3, 2, 0.6);
  }) };
  CL.captain = { slot: 'head', name: 'Captain Cap', price: 70, draw: hat(function (ctx) {
    A.ellipse(ctx, 0, -8, 27, 11, '#ffffff', 3); A.box(ctx, -22, -6, 44, 14, 4, '#2c3e6b', 3);
    A.ellipse(ctx, 12, 9, 17, 5, '#26324d', 2.5); A.circle(ctx, 0, -1, 5, '#ffcf4a', 2); A.line(ctx, [-16, 3, 16, 3], 2, '#ffcf4a');
  }) };
  CL.crown = { slot: 'head', name: 'Paper Crown', price: 50, draw: hat(function (ctx) {
    A.poly(ctx, [-22, 8, -22, -16, -11, -4, 0, -22, 11, -4, 22, -16, 22, 8], '#ffcf4a', 3);
    A.circle(ctx, 0, -2, 3.5, '#e2574c', 1.5); A.circle(ctx, -13, 2, 3, '#4a8fe0', 1.5); A.circle(ctx, 13, 2, 3, '#5dbb63', 1.5);
  }) };
  CL.star_band = { slot: 'head', name: 'Star Headband', price: 35, draw: hat(function (ctx) {
    ctx.beginPath(); ctx.arc(0, 14, 24, Math.PI * 1.1, Math.PI * 1.9); ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#ff8fb1'; ctx.stroke();
    A.line(ctx, [-8, -6, -14, -22], 2.5); A.line(ctx, [8, -6, 14, -22], 2.5);
    A.star(ctx, -14, -24, 8, '#ffcf4a', 2.5); A.star(ctx, 14, -24, 8, '#ffcf4a', 2.5);
  }) };
  CL.chef = { slot: 'head', name: 'Baker Hat', price: 40, draw: hat(function (ctx) {
    A.box(ctx, -18, -10, 36, 18, 4, '#ffffff', 3);
    A.circle(ctx, -12, -18, 11, '#ffffff', 3); A.circle(ctx, 12, -18, 11, '#ffffff', 3); A.circle(ctx, 0, -26, 13, '#ffffff', 3);
    A.box(ctx, -18, -2, 36, 10, 3, '#ffffff', 3);
  }) };
  CL.leaf_cap = { slot: 'head', name: 'Snow Sprout', price: 15, draw: hat(function (ctx) {
    A.line(ctx, [0, 4, 0, -14], 3, '#3d8c48');
    A.ellipse(ctx, -8, -16, 9, 5, '#5dbb63', 2.5, null, -0.5); A.ellipse(ctx, 8, -18, 9, 5, '#5dbb63', 2.5, null, 0.5);
  }) };

  CL.glasses_round = { slot: 'face', name: 'Round Glasses', price: 0, draw: face(function (ctx) {
    A.circle(ctx, -8, 0, 9, 'rgba(200,230,255,0.25)', 2.8); A.circle(ctx, 16, 0, 9, 'rgba(200,230,255,0.25)', 2.8); A.line(ctx, [1, 0, 7, 0], 2.8);
  }) };
  CL.glasses_star = { slot: 'face', name: 'Star Shades', price: 40, draw: face(function (ctx) {
    A.star(ctx, -8, 0, 12, '#ff8fb1', 2.5); A.star(ctx, 16, 0, 12, '#ff8fb1', 2.5); A.line(ctx, [1, -2, 7, -2], 2.5);
    A.star(ctx, -8, 0, 6, 'rgba(38,50,77,0.65)', 0); A.star(ctx, 16, 0, 6, 'rgba(38,50,77,0.65)', 0);
  }) };
  CL.goggles = { slot: 'face', name: 'Snow Goggles', price: 45, draw: face(function (ctx) {
    A.box(ctx, -22, -9, 50, 18, 9, '#ff9a3c', 3); A.box(ctx, -18, -6, 19, 12, 6, '#7fd4ff', 2); A.box(ctx, 5, -6, 19, 12, 6, '#7fd4ff', 2);
    A.highlight(ctx, -12, -3, 4, 2, 0.8); A.highlight(ctx, 11, -3, 4, 2, 0.8);
  }) };
  CL.glasses_heart = { slot: 'face', name: 'Heart Glasses', price: 35, draw: face(function (ctx) {
    A.heart(ctx, -8, 4, 11, '#e2574c', 2.5); A.heart(ctx, 16, 4, 11, '#e2574c', 2.5); A.line(ctx, [2, -2, 6, -2], 2.5);
  }) };

  /* Scarves wrap the neck: a curved band with rounded ends that sits just under the chin, a knot on
   * the chest side (characters face right) and two hanging ends that sway as the character moves. */
  function band(c, w, th) {
    var hw = w / 2, sag = Math.min(9, w * 0.16);
    c.moveTo(-hw, -th / 2);
    c.quadraticCurveTo(0, -th / 2 + sag * 2, hw, -th / 2);
    c.quadraticCurveTo(hw + th * 0.55, 0, hw, th / 2);
    c.quadraticCurveTo(0, th / 2 + sag * 2, -hw, th / 2);
    c.quadraticCurveTo(-hw - th * 0.55, 0, -hw, -th / 2);
    c.closePath();
  }
  function paint(ctx, cols, x0, w, y0, h, stripeW) {
    if (cols.length === 1) { ctx.fillStyle = cols[0]; ctx.fillRect(x0, y0, w, h); return; }
    for (var i = 0, x = x0; x < x0 + w; i++, x += stripeW) { ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(x, y0, stripeW + 0.5, h); }
  }
  function scarfTail(ctx, cols, fringe, len, ang) {
    ctx.save(); ctx.rotate(ang);
    ctx.beginPath(); A.rrect(ctx, -6, 0, 12, len, 4);
    ctx.save(); ctx.clip();
    if (cols.length > 2) paint(ctx, cols, -6, 12, 0, len, 2);   // rainbow: thin vertical stripes
    else { ctx.fillStyle = cols[0]; ctx.fillRect(-6, 0, 12, len); if (cols[1]) { ctx.fillStyle = cols[1]; for (var y = 6; y < len - 6; y += 9) ctx.fillRect(-6, y, 12, 4); } }
    ctx.fillStyle = 'rgba(20,30,70,0.18)'; ctx.fillRect(1, 0, 6, len);
    ctx.restore();
    ctx.beginPath(); A.rrect(ctx, -6, 0, 12, len, 4); A.fs(ctx, null, 2.5);
    // fringe
    ctx.strokeStyle = fringe; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (var f = -4; f <= 4; f += 2.7) { ctx.beginPath(); ctx.moveTo(f, len); ctx.lineTo(f * 1.1, len + 5); ctx.stroke(); }
    ctx.restore();
  }
  function scarf(cols, fringe) {
    return function (ctx, a, look, st) {
      var n = a.neck, w = n.w, th = Math.max(11, Math.min(15, w * 0.24));
      var t = (st && st.t) || 0, mv = st && st.moving;
      var sway = Math.sin(t * (mv ? 10 : 2.2)) * (mv ? 0.16 : 0.05);
      ctx.save(); ctx.translate(n.x, n.y);
      // wrap
      ctx.beginPath(); band(ctx, w, th);
      ctx.save(); ctx.clip();
      paint(ctx, cols.length > 2 ? cols : [cols[0]], -w / 2 - th, w + th * 2, -th, th * 3, (w + th * 2) / cols.length);
      if (cols.length === 2) { ctx.fillStyle = cols[1]; for (var x = -w / 2 + 4; x < w / 2; x += 11) ctx.fillRect(x, -th * 2, 4, th * 4); }
      ctx.fillStyle = 'rgba(20,30,70,0.2)'; ctx.beginPath(); ctx.moveTo(-w, th * 0.15); ctx.quadraticCurveTo(0, th * 0.15 + 18, w, th * 0.15); ctx.lineTo(w, th * 3); ctx.lineTo(-w, th * 3); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-w * 0.35, -th * 0.22 + 3); ctx.quadraticCurveTo(0, -th * 0.22 + 12, w * 0.3, -th * 0.22 + 2); ctx.stroke();
      ctx.restore();
      ctx.beginPath(); band(ctx, w, th); A.fs(ctx, null, 3);
      if (!(st && st.back)) {
        var kx = w * 0.2, ky = th * 0.55 + Math.min(9, w * 0.16) * 0.9;
        ctx.save(); ctx.translate(kx, ky);
        scarfTail(ctx, cols.length > 2 ? cols : cols, fringe, 18, -0.28 - sway * 0.7);
        scarfTail(ctx, cols.length > 2 ? cols : cols, fringe, 24, 0.12 + sway);
        // knot
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 6.5, 0, 0, Math.PI * 2);
        ctx.save(); ctx.clip(); paint(ctx, cols.length > 2 ? cols : [cols[0]], -9, 18, -8, 16, 3); ctx.restore();
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 6.5, 0, 0, Math.PI * 2); A.fs(ctx, null, 2.5);
        ctx.restore();
      }
      ctx.restore();
    };
  }
  var RAINBOW = ['#e2574c', '#ff9a3c', '#ffcf4a', '#5dbb63', '#4a8fe0', '#8e6bd8'];
  CL.scarf_red = { slot: 'neck', name: 'Red Scarf', price: 0, draw: scarf(['#e2574c'], '#ffffff') };
  CL.scarf_rainbow = { slot: 'neck', name: 'Rainbow Scarf', price: 40, draw: scarf(RAINBOW, '#ffffff') };
  CL.scarf_green = { slot: 'neck', name: 'Pine Scarf', price: 25, draw: scarf(['#3d8c48', '#ffcf4a'], '#ffcf4a') };
  CL.scarf_dot = { slot: 'neck', name: 'Twin Scarf', price: -1, draw: scarf(['#ff8fb1', '#ffffff'], '#ffffff') };
  CL.bowtie = { slot: 'neck', name: 'Bow Tie', price: 20, draw: function (ctx, a, look, st) {
    if (st && st.back) return;
    var n = a.neck, k = Math.min(1.1, n.w / 52);
    ctx.save(); ctx.translate(n.x + n.w * 0.12, n.y + 4); ctx.scale(k, k);
    A.poly(ctx, [0, 0, -15, -9, -15, 9], '#4a8fe0', 2.5); A.poly(ctx, [0, 0, 15, -9, 15, 9], '#4a8fe0', 2.5);
    A.line(ctx, [-10, -3, -10, 3], 1.5, 'rgba(38,50,77,0.5)'); A.line(ctx, [10, -3, 10, 3], 1.5, 'rgba(38,50,77,0.5)');
    A.ellipse(ctx, 0, 0, 4.5, 5, '#2f6fbf', 2.5);
    ctx.restore();
  } };
  CL.bell_collar = { slot: 'neck', name: 'Jingle Collar', price: 20, draw: function (ctx, a, look, st) {
    var n = a.neck, hw = n.w / 2 - 2, sag = Math.min(9, n.w * 0.16);
    ctx.save(); ctx.translate(n.x, n.y);
    ctx.beginPath(); ctx.moveTo(-hw, -1); ctx.quadraticCurveTo(0, sag * 2 - 1, hw, -1);
    ctx.lineCap = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 4.5; ctx.strokeStyle = '#e2574c'; ctx.stroke();
    if (!(st && st.back)) {
      var bx = n.w * 0.12, by = sag + 3;
      var sw = Math.sin(((st && st.t) || 0) * (st && st.moving ? 12 : 2)) * (st && st.moving ? 0.35 : 0.08);
      ctx.translate(bx, by); ctx.rotate(sw);
      A.circle(ctx, 0, 5, 6.5, '#ffcf4a', 2.5); A.line(ctx, [-3.5, 7, 3.5, 7], 1.5); A.circle(ctx, 0, 9, 1.4, OUT, 0);
      A.highlight(ctx, -2.5, 2.5, 2, 1.2, 0.8);
    }
    ctx.restore();
  } };

  function sweater(main, trim, pattern) {
    return body(function (ctx, ny, sp) {
      ctx.fillStyle = main; ctx.fillRect(-60, ny - 4, 120, 200);
      ctx.fillStyle = trim; ctx.fillRect(-60, ny - 4, 120, 6);
      if (pattern === 'snowflake') { A.snowflake(ctx, 6, ny + 20, 8, '#ffffff', 2.4); A.snowflake(ctx, -14, ny + 34, 5, '#ffffff', 2); }
      if (pattern === 'stripes') { ctx.fillStyle = trim; for (var y = ny + 12; y < 10; y += 14) ctx.fillRect(-60, y, 120, 6); }
      if (pattern === 'heart') A.heart(ctx, 6, ny + 26, 10, trim, 2);
      if (pattern === 'zip') { A.line(ctx, [4, ny, 4, 20], 2.5, trim); A.box(ctx, 0, ny + 10, 8, 8, 2, '#c9ced8', 1.5); }
      if (pattern === 'apron') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); A.rrect(ctx, -14, ny + 6, 36, 80, 8); ctx.fill(); A.box(ctx, -4, ny + 30, 16, 12, 3, '#ffd3e1', 1.5); }
      if (pattern === 'jacket') { A.line(ctx, [6, ny, 6, 20], 3, trim); ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (var k = ny + 16; k < 10; k += 16) ctx.fillRect(-60, k, 120, 3); }
      // hem shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-60, ny + 2, 30, 200);
    });
  }
  CL.sweater_snow = { slot: 'body', name: 'Snowflake Knit', price: 0, draw: sweater('#4a8fe0', '#2f6fbf', 'snowflake') };
  CL.sweater_red = { slot: 'body', name: 'Cozy Red Knit', price: 50, draw: sweater('#e2574c', '#b43a33', 'snowflake') };
  CL.shirt_stripe = { slot: 'body', name: 'Sailor Stripes', price: 40, draw: sweater('#ffffff', '#4a8fe0', 'stripes') };
  CL.raincoat = { slot: 'body', name: 'Yellow Raincoat', price: 60, draw: sweater('#ffcf4a', '#e8a713', 'zip') };
  CL.puffer = { slot: 'body', name: 'Puffy Jacket', price: 80, draw: sweater('#8e6bd8', '#5f43a8', 'jacket') };
  CL.hoodie_heart = { slot: 'body', name: 'Heart Hoodie', price: 55, draw: sweater('#35b5a4', '#ff8fb1', 'heart') };
  CL.apron = { slot: 'body', name: 'Café Apron', price: -1, draw: sweater('#c96a4a', '#9b4a30', 'apron') };
  CL.navy_coat = { slot: 'body', name: 'Harbor Coat', price: -1, draw: sweater('#2c3e6b', '#ffcf4a', 'zip') };

  CH.SLOTS = ['head', 'face', 'neck', 'body'];
  CH.STARTERS = ['scarf_red', 'beanie_blue', 'glasses_round', 'flower_crown', 'sweater_snow'];

  // ---------------------------------------------------------------------------
  // Main draw
  // ---------------------------------------------------------------------------
  /**
   * Draws a character with feet at (x, y). Returns the height actually drawn (for name tags).
   */
  CH.draw = function (ctx, x, y, look, st) {
    st = st || {};
    var sp = S[look.species] || S.penguin, p = CH.palette(look), t = st.t || 0;
    var scale = st.scale || 1, dir = st.dir || 1;
    st.sit = st.pose === 'sit' || st.pose === 'sleep';
    st.blink = !st.back && ((t + (st.blinkOffset || 0)) % 4.2) < 0.13;
    var mv = st.moving && !st.sit;
    var lift = 0, rot = 0, sx = 1, sy = 1;
    if (mv) {
      switch (sp.move) {
        case 'waddle': rot = Math.sin(t * 12) * 0.13; lift = Math.abs(Math.sin(t * 12)) * 3; break;
        case 'hop': var hp = Math.abs(Math.sin(t * 8)); lift = hp * 22; sy = 1 + (hp > 0.9 ? 0.06 : -0.04); sx = 2 - sy; rot = 0.08; break;
        case 'scoot': var s = Math.sin(t * 9); sx = 1 + s * 0.1; sy = 1 - s * 0.08; lift = Math.max(0, s) * 3; rot = 0.06; break;
        case 'flutter': lift = 26 + Math.sin(t * 9) * 5; rot = 0.12; break;
        case 'trot': lift = Math.abs(Math.sin(t * 14)) * 5; rot = 0.05; break;
        case 'amble': rot = Math.sin(t * 9) * 0.07; lift = Math.abs(Math.sin(t * 9)) * 3; break;
      }
    } else {
      var br = Math.sin(t * 2.2) * 0.018; sy = 1 + br; sx = 1 - br * 0.6;
      if (st.pose === 'happy') lift = Math.abs(Math.sin(t * 7)) * 14;
    }
    if (st.skate) { rot = Math.sin(t * 3) * 0.08; lift = 0; }
    if (!st.noShadow) A.shadow(ctx, x, y + 1, 30 * scale * (1 - lift / 120), 9 * scale * (1 - lift / 140));
    ctx.save();
    ctx.translate(x, y - lift * scale + (st.sit ? 6 * scale : 0));
    ctx.scale(scale * dir, scale);
    if (st.back) ctx.scale(-1, 1);
    ctx.rotate(rot); ctx.scale(sx, sy);
    if (st.skate && !st.sit) {
      [-12, 12].forEach(function (bx) { A.box(ctx, bx - 12, -2, 24, 5, 2, '#c9d6ea', 2); A.line(ctx, [bx - 14, 4, bx + 14, 4], 2.5, '#7d8aa8'); });
    }
    var outfit = look.outfit || {};
    var a = sp.anchors;
    var wear = function (slot) {
      var id = outfit[slot]; if (!id) return;
      var item = CL[id]; if (!item || item.slot !== slot) return;
      if (slot === 'face' && st.back) return;
      try { item.draw(ctx, a, look, st, sp); } catch (e) { /* never let a clothing bug hide the character */ }
    };
    sp.draw(ctx, p, st, wear);
    ctx.restore();
    return (Math.abs(a.top) + lift) * scale;
  };

  /** Character portrait (head & shoulders) into a square box. */
  CH.portrait = function (ctx, x, y, size, look, opts) {
    opts = opts || {};
    var sp = S[look.species] || S.penguin;
    var h = Math.abs(sp.anchors.top);
    var s = size / (h * 0.95);
    CH.draw(ctx, x + size / 2, y + size * 1.02, look, { t: opts.t || 0.5, scale: s, noShadow: true, pose: opts.pose, dir: opts.dir || 1 });
  };

  /** Draws a portrait to a fresh canvas (for DOM menus). */
  CH.portraitCanvas = function (look, px, opts) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var c = document.createElement('canvas');
    c.width = px * dpr; c.height = px * dpr; c.style.width = px + 'px'; c.style.height = px + 'px';
    var x = c.getContext('2d'); x.scale(dpr, dpr);
    CH.portrait(x, px * 0.08, px * 0.06, px * 0.84, look, opts);
    return c;
  };
})();
