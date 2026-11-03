/* Aurora Bay — pet companions: tiny Arctic baby animals that follow the player around.
 * AB.pets.draw(ctx, x, y, pet, st) draws a pet with its feet at (x, y), facing right by default.
 *   pet = { kind: 'lemming'|'puffin'|'ermine'|'walrus', color: <colour id>, name }
 *   st  = { t, moving, dir (1 right / -1 left), scale, mood: 'idle'|'happy'|'sleep'|'eat'|'play'|'love', blinkOffset }
 * Pets are about 40–50 units tall at scale 1 (players are ~100). Same house style as the
 * player animals: navy outline, one shade shape, white highlights, soft blue ground shadow.
 * AB.pets.bubble(ctx, x, y, kind, t) draws a little reaction icon ('heart'|'note'|'zzz'|'sparkle'|'crumb'). */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C;
  var OUT = C.out, LW = 2.4, PI = Math.PI, TAU = PI * 2;
  var P = AB.pets = {};

  // ---------------------------------------------------------------------------
  // Shared face helpers
  // ---------------------------------------------------------------------------
  function eye(ctx, x, y, r, f) {
    var m = f.eyes;
    if (m === 'blink') { A.line(ctx, [x - r, y, x + r, y], 2); return; }
    if (m === 'happy') {
      ctx.beginPath(); ctx.arc(x, y + r * 0.55, r, PI * 1.15, PI * 1.85);
      ctx.lineWidth = 2.2; ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke(); return;
    }
    if (m === 'sleep') {
      ctx.beginPath(); ctx.arc(x, y - r * 0.35, r * 0.95, PI * 0.18, PI * 0.82);
      ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke(); return;
    }
    var lx = x + f.lookX * r * 0.38, ly = y + f.lookY * r * 0.25;
    A.ellipse(ctx, lx, ly, r, r * 1.16, OUT, 0);
    A.circle(ctx, lx + r * 0.32, ly - r * 0.42, r * 0.42, '#fff', 0);
    A.circle(ctx, lx - r * 0.34, ly + r * 0.42, r * 0.17, 'rgba(255,255,255,0.85)', 0);
  }
  function blush(ctx, x, y, r, a) {
    ctx.save(); ctx.fillStyle = 'rgba(255,120,150,' + a + ')';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.62, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  function mouth(ctx, x, y, f, s) {
    s = s || 1;
    var m = f.mouth;
    if (m === 'none') return;
    ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.lineCap = 'round';
    if (m === 'open') {
      ctx.beginPath(); ctx.moveTo(x - 2.6 * s, y - 0.6 * s); ctx.quadraticCurveTo(x, y - 0.2 * s, x + 2.6 * s, y - 0.6 * s);
      ctx.quadraticCurveTo(x + 2.2 * s, y + 3.6 * s, x, y + 3.8 * s); ctx.quadraticCurveTo(x - 2.2 * s, y + 3.6 * s, x - 2.6 * s, y - 0.6 * s);
      A.fs(ctx, '#e8607a', 1.4);
      A.ellipse(ctx, x, y + 2.6 * s, 1.4 * s, 0.9 * s, '#ff9fb4', 0);
      return;
    }
    if (m === 'chew') {
      var c = Math.abs(Math.sin(f.t * 13));
      A.ellipse(ctx, x, y + 0.8, 1.6 * s, (0.5 + c * 1.3) * s, '#c8506a', 1.3);
      return;
    }
    // small "w" smile
    ctx.beginPath();
    ctx.arc(x - 1.5 * s, y, 1.5 * s, PI * 0.1, PI * 0.9);
    ctx.moveTo(x + 3 * s, y + 0.2 * s);
    ctx.arc(x + 1.5 * s, y, 1.5 * s, PI * 0.1, PI * 0.9);
    ctx.stroke();
  }
  function whiskers(ctx, x, y, len, spread) {
    ctx.save(); ctx.strokeStyle = U.alpha(OUT, 0.75); ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (var i = -1; i <= 1; i += 2) {
      ctx.beginPath(); ctx.moveTo(x, y + i * 0.8); ctx.lineTo(x + len, y + i * spread - 0.6); ctx.stroke();
    }
    ctx.restore();
  }
  /** Soft darker side, clipped to the current shape (like the players' shadeClip). */
  function shadeSide(ctx, pathFn, x0, w) {
    ctx.save(); ctx.beginPath(); pathFn(ctx); ctx.clip();
    ctx.globalAlpha = 0.13; ctx.fillStyle = '#1d2b52'; ctx.fillRect(x0, -80, w, 120);
    ctx.restore();
  }
  function outline(ctx, pathFn) { ctx.beginPath(); pathFn(ctx); A.fs(ctx, null, LW); }

  // ---------------------------------------------------------------------------
  // Food bowl & toys (also handy for shop icons)
  // ---------------------------------------------------------------------------
  P.drawFood = function (ctx, x, y, food, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    if (food === 'berries') {
      A.ellipse(ctx, -5, -2, 4.5, 2.4, C.green, 1.4, null, -0.5);
      [[-3, 0, '#e2574c'], [3, -1, '#5a6fd8'], [0, -4, '#e2574c'], [6, -4, '#ff8fb1']].forEach(function (b) {
        A.circle(ctx, b[0], b[1], 3, b[2], 1.6); A.circle(ctx, b[0] - 0.9, b[1] - 1, 0.9, 'rgba(255,255,255,0.8)', 0);
      });
    } else if (food === 'fish') {
      ctx.save(); ctx.translate(1, -3); ctx.rotate(-0.35); A.fish(ctx, 0, 0, 0.3, 'bluegill', 0); ctx.restore();
      ctx.save(); ctx.translate(-4, -1); ctx.rotate(0.25); A.fish(ctx, 0, 0, 0.26, 'sunny', 0); ctx.restore();
    } else if (food === 'eggs') {
      A.ellipse(ctx, -3, -3, 3.6, 4.6, '#fff8e8', 1.6, null, -0.2);
      A.ellipse(ctx, 4, -2.5, 3.4, 4.3, '#e7f2ff', 1.6, null, 0.25);
      ctx.fillStyle = 'rgba(120,140,180,0.6)';
      [[-4, -4], [-2, -1.5], [3.5, -3.6], [5, -1]].forEach(function (d) { ctx.beginPath(); ctx.arc(d[0], d[1], 0.6, 0, TAU); ctx.fill(); });
    } else if (food === 'clams') {
      A.shell(ctx, -4, -1, 0.3, '#ffc2a8'); A.shell(ctx, 4, -2, 0.32, '#e8d7ff');
    }
    ctx.restore();
  };
  function bowl(ctx, x, food, color) {
    var w = 12, col = color || C.blue;
    A.shadow(ctx, x, 1, w * 1.05, 2.6, 0.18);
    // food first so the rim overlaps it
    P.drawFood(ctx, x, -7, food, 1);
    ctx.beginPath(); ctx.moveTo(x - w, -8); ctx.lineTo(x + w, -8);
    ctx.quadraticCurveTo(x + w - 1, 0, x + w * 0.55, 0); ctx.lineTo(x - w * 0.55, 0); ctx.quadraticCurveTo(x - w + 1, 0, x - w, -8);
    ctx.closePath(); A.fs(ctx, col, 2);
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(x + w * 0.3, -9, w, 10); ctx.restore();
    A.ellipse(ctx, x, -8, w, 2.6, U.shade(col, 0.25), 2);
    A.snowflake(ctx, x - 1, -3.6, 2.6, '#fff', 1);
  }
  P.drawToy = function (ctx, x, y, toy, t, s) {
    t = t || 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    if (toy === 'ball') {
      ctx.rotate(t * 4);
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.clip();
      ctx.fillStyle = '#fff'; ctx.fillRect(-8, -8, 16, 16);
      ['#e2574c', '#ffcf4a', '#4a8fe0'].forEach(function (c, i) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 8, i * TAU / 3, i * TAU / 3 + PI / 3); ctx.closePath(); ctx.fill();
      });
      ctx.restore();
      A.circle(ctx, 0, 0, 7, null, 2); A.circle(ctx, 0, 0, 1.6, '#fff', 1.2);
      ctx.rotate(-t * 4); A.highlight(ctx, -2.5, -3, 2, 1.2, 0.7);
    } else if (toy === 'feather') {
      ctx.rotate(Math.sin(t * 3) * 0.5 - 0.4);
      ctx.beginPath(); ctx.moveTo(0, 9); ctx.bezierCurveTo(-7, 2, -5, -8, 1, -11); ctx.bezierCurveTo(6, -5, 5, 4, 0, 9); ctx.closePath();
      A.fs(ctx, '#ff8fb1', 1.8);
      ctx.save(); ctx.clip(); ctx.fillStyle = '#35b5a4'; ctx.fillRect(-8, -12, 16, 7); ctx.restore();
      ctx.beginPath(); ctx.moveTo(0, 9); ctx.bezierCurveTo(-7, 2, -5, -8, 1, -11); ctx.bezierCurveTo(6, -5, 5, 4, 0, 9); A.fs(ctx, null, 1.8);
      A.line(ctx, [0, 12, 0.5, -8], 1.3);
    } else if (toy === 'yarn') {
      ctx.save(); ctx.rotate(t * 3);
      A.circle(ctx, 0, 0, 6.5, '#ff8fb1', 2);
      ctx.strokeStyle = '#d9637e'; ctx.lineWidth = 1.1;
      for (var i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.4 + Math.abs(i) * 1.5, i * 0.9, 0, TAU); ctx.stroke(); }
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(-5, 4); ctx.quadraticCurveTo(-10, 8, -14, 5 + Math.sin(t * 6) * 2);
      ctx.strokeStyle = '#d9637e'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.stroke();
      A.highlight(ctx, -2, -3, 1.8, 1, 0.6);
    } else if (toy === 'pinecone') {
      ctx.rotate(Math.sin(t * 5) * 0.5);
      A.pinecone(ctx, 0, 0, 0.5);
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Kinds
  // ---------------------------------------------------------------------------
  var K = {};

  // ---- Lemming --------------------------------------------------------------
  K.lemming = {
    name: 'Lemming', blurb: 'Tiny and brave', food: 'berries', toy: 'pinecone',
    height: 46, headX: 9, shadow: 18, bowlX: 31, toyX: 36, bowlColor: C.teal,
    eat: { dx: 5, dy: 13, rot: 0.42 },
    colors: [
      { id: 'honey', name: 'Honey', body: '#eab36a', shade: '#cf9450', belly: '#fff3dc', cap: '#8a5a3a', inner: '#ffb0a3', feet: '#f7b2a0', nose: '#7a4a3a' },
      { id: 'snow', name: 'Snow', body: '#fbfcff', shade: '#d6dfee', belly: '#ffffff', inner: '#ffc1d0', feet: '#ffc8d3', nose: '#e2809a' },
      { id: 'cocoa', name: 'Cocoa', body: '#a2735c', shade: '#82573f', belly: '#efdac3', cap: '#5a3a2a', inner: '#f2b0a4', feet: '#e9b0a0', nose: '#3a2a20' },
      { id: 'blush', name: 'Blush', body: '#f7c6cb', shade: '#e3a1aa', belly: '#fff4f5', inner: '#ff9fb4', feet: '#ffb3c3', nose: '#d9637e' }
    ],
    gait: function (f, t, g) {
      var ph = t * 21, s = Math.sin(ph);
      g.lift = Math.abs(s) * 4; g.rot = 0.07 + s * 0.03; g.sy = 1 + Math.abs(s) * 0.04; g.sx = 2 - g.sy;
      f.step = s; f.tail = Math.sin(t * 30) * 0.5;
    },
    head: function (ctx, p, f, sleep) {
      // ears
      var e1 = sleep ? 0.5 : 0, e2 = sleep ? 0.6 : f.ear;
      ctx.save(); ctx.translate(-6, -9); ctx.rotate(-0.25 + e1); A.circle(ctx, 0, -2, 5.2, p.body, LW); A.circle(ctx, 0.4, -2, 2.8, p.inner, 0); ctx.restore();
      ctx.save(); ctx.translate(5, -10.5); ctx.rotate(0.2 + e2); A.circle(ctx, 0, -2, 5.2, p.body, LW); A.circle(ctx, 0.4, -2, 2.8, p.inner, 0); ctx.restore();
      var hp = function (c) { c.ellipse(0, 0, 13.5, 12.5, 0, 0, TAU); };
      ctx.beginPath(); hp(ctx); A.fs(ctx, p.body, LW);
      ctx.save(); ctx.beginPath(); hp(ctx); ctx.clip();
      if (p.cap) A.ellipse(ctx, -2, -13, 13, 6, p.cap, 0, null, -0.1);
      A.ellipse(ctx, 7, 6, 9, 6.5, p.belly, 0);
      ctx.restore();
      outline(ctx, hp);
      eye(ctx, -1, -1, 3.4, f); eye(ctx, 8.5, -1.5, 3.2, f);
      blush(ctx, -6, 5, 3.6, f.blush); blush(ctx, 13.5, 5.5, 2.4, f.blush);
      A.ellipse(ctx, 12.6, 2.6, 2.5, 1.9, p.nose, 1.2);
      A.highlight(ctx, 12, 2, 0.8, 0.5, 0.8);
      mouth(ctx, 10.5, 6.2, f, 0.9);
      whiskers(ctx, 14, 4.5, 7, 2.4);
    },
    draw: function (ctx, p, f) {
      var s = f.step;
      if (f.sleep) {
        var lp = function (c) { c.ellipse(-2, -10, 20, 10.5, 0, 0, TAU); };
        A.ellipse(ctx, -21, -5, 5, 3, p.shade, 2, null, 0.6);
        ctx.beginPath(); lp(ctx); A.fs(ctx, p.body, LW);
        ctx.save(); ctx.beginPath(); lp(ctx); ctx.clip();
        if (p.cap) A.ellipse(ctx, -4, -21, 17, 3.6, p.cap, 0);
        ctx.restore();
        shadeSide(ctx, lp, -30, 14); outline(ctx, lp);
        ctx.save(); ctx.translate(13, -11); ctx.rotate(0.12); this.head(ctx, p, f, true); ctx.restore();
        A.ellipse(ctx, 21, -2, 3.6, 2.6, p.feet, 1.8); A.ellipse(ctx, 15, -1.5, 3.6, 2.6, p.feet, 1.8);
        return;
      }
      // stubby tail
      A.ellipse(ctx, -19, -11, 4.8, 3, p.shade, 2, null, -0.3 + f.tail);
      // feet
      A.ellipse(ctx, -7 + s * 3, -2.6 - Math.max(0, s) * 2.5, 6, 3.4, p.feet, 2);
      A.ellipse(ctx, 8 - s * 3, -2.6 - Math.max(0, -s) * 2.5, 6, 3.4, p.feet, 2);
      var bp = function (c) { c.ellipse(0, -15, 19, 15, 0, 0, TAU); };
      ctx.beginPath(); bp(ctx); A.fs(ctx, p.body, LW);
      ctx.save(); ctx.beginPath(); bp(ctx); ctx.clip();
      A.ellipse(ctx, 7, -9, 12, 10, p.belly, 0);
      if (p.cap) A.ellipse(ctx, -2, -30, 16, 4.5, p.cap, 0, null, 0.12);
      ctx.restore();
      shadeSide(ctx, bp, -26, 14); outline(ctx, bp);
      A.highlight(ctx, -6, -24, 4, 2, 0.5);
      // head
      ctx.save(); ctx.translate(9 + f.headDx, -29 + f.headDy); ctx.rotate(f.headRot);
      this.head(ctx, p, f, false);
      ctx.restore();
      // little front paws
      var py = f.mood === 'love' ? -12 : -7;
      A.ellipse(ctx, 11, py + (f.mv ? -s * 1.5 : 0), 3.4, 2.8, p.feet, 1.8);
      A.ellipse(ctx, 16, py + 0.5 + (f.mv ? s * 1.5 : 0), 3.4, 2.8, p.feet, 1.8);
    }
  };

  // ---- Puffin chick -----------------------------------------------------------
  K.puffin = {
    name: 'Puffling', blurb: 'Fluffy little flapper', food: 'fish', toy: 'feather',
    height: 48, headX: 4, shadow: 15, bowlX: 29, toyX: 34, bowlColor: C.red,
    eat: { dx: 4, dy: 12, rot: 0.55 },
    colors: [
      { id: 'classic', name: 'Classic', body: '#35425f', shade: '#27314a', belly: '#fdfdff', face: '#eef2f8', beak: '#ff8a3c', beakBase: '#ffd23f', beakTip: '#e2574c', feet: '#ff9a3c' },
      { id: 'sooty', name: 'Sooty Grey', body: '#7a8499', shade: '#626b81', belly: '#eef1f7', face: '#f7f9fc', beak: '#ff9a4a', beakBase: '#ffe08a', beakTip: '#e8665a', feet: '#ffa65a' },
      { id: 'fluffy', name: 'Fluffy White', body: '#f4f7fc', shade: '#d3dbe9', belly: '#ffffff', face: '#ffffff', beak: '#ff8a3c', beakBase: '#ffd23f', beakTip: '#ff6f91', feet: '#ff9fb4', eyeLine: '#a9b6cf' },
      { id: 'tufted', name: 'Tufted', body: '#3c3f57', shade: '#2c2f43', belly: '#e6e9f1', face: '#ffffff', beak: '#ff6a3c', beakBase: '#ffc23a', beakTip: '#e2574c', feet: '#ff8a3c', tuft: '#ffd23f' }
    ],
    gait: function (f, t, g) {
      var ph = t * 11, s = Math.sin(ph);
      g.rot = s * 0.17; g.lift = Math.abs(s) * 3.5;
      f.step = s; f.flap = Math.sin(t * 26);
    },
    fluff: function (ctx, p, x, y) {
      // downy fuzz tuft on the crown
      A.poly(ctx, [x - 5, y + 2, x - 4, y - 4, x - 1, y, x + 1, y - 6, x + 3, y, x + 6, y - 3, x + 5, y + 3], p.body, 1.8);
    },
    head: function (ctx, p, f) {
      this.fluff(ctx, p, -1, -11);
      var hp = function (c) { c.arc(0, 0, 13, 0, TAU); };
      ctx.beginPath(); hp(ctx); A.fs(ctx, p.body, LW);
      ctx.save(); ctx.beginPath(); hp(ctx); ctx.clip();
      A.ellipse(ctx, 6, 2.5, 10, 8.5, p.face, 0);
      ctx.restore();
      outline(ctx, hp);
      if (p.tuft) {
        // golden plumes sweeping back from behind the eye and curling down the neck
        var wv = Math.sin(f.t * 4) * 1.2;
        [[0, -4, -9, -7, -17, 1 + wv], [0, -2, -9, -2, -15, 7 + wv], [1, 0, -6, 3, -10, 12 + wv]].forEach(function (c) {
          ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.quadraticCurveTo(c[2], c[3], c[4], c[5]);
          ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 4.4; ctx.stroke();
          ctx.strokeStyle = p.tuft; ctx.lineWidth = 2.2; ctx.stroke();
        });
      }
      eye(ctx, 3, -2, 3.3, f); eye(ctx, 10.2, -2.5, 3.1, f);
      blush(ctx, -1, 6, 3.4, f.blush);
      // chunky striped beak
      var bk = function (c) { c.moveTo(11, -1.5); c.quadraticCurveTo(18.5, -0.5, 20, 3.8); c.quadraticCurveTo(17, 7, 11, 6.5); c.quadraticCurveTo(9.5, 2.5, 11, -1.5); };
      ctx.beginPath(); bk(ctx); A.fs(ctx, p.beak, 2);
      ctx.save(); ctx.beginPath(); bk(ctx); ctx.clip();
      ctx.fillStyle = p.beakBase; ctx.fillRect(8, -3, 5, 12);
      ctx.fillStyle = p.beakTip; ctx.fillRect(16.5, -3, 6, 12);
      if (f.mouth === 'open' || f.mouth === 'chew') { var o = f.mouth === 'open' ? 1.6 : Math.abs(Math.sin(f.t * 13)) * 1.6; A.line(ctx, [11, 3, 19.5, 4 + o], 1.2 + o, '#b8384a'); }
      ctx.restore();
      ctx.beginPath(); bk(ctx); A.fs(ctx, null, 2);
      A.line(ctx, [11.5, 3, 19, 4], 1.2);
      A.highlight(ctx, 13.5, 0.8, 1.8, 0.8, 0.7);
    },
    wing: function (ctx, p, f, near) {
      var r;
      if (f.mv) r = -0.4 + f.flap * 0.75;
      else if (f.mood === 'happy' || f.mood === 'play') r = -0.9 + Math.sin(f.t * 22) * 0.6;
      else if (f.mood === 'love') r = 0.15 + Math.sin(f.t * 3) * 0.08;
      else r = 0.25 + Math.sin(f.t * 2.2) * 0.05;
      ctx.save(); ctx.translate(near ? -4 : -11, -21); ctx.rotate(near ? r : -r * 0.6 - 0.2);
      A.ellipse(ctx, 0, 6, 3.8, 7.6, near ? U.shade(p.body, -0.06) : p.shade, 2);
      ctx.restore();
    },
    draw: function (ctx, p, f) {
      var s = f.step;
      if (f.sleep) {
        var sp = function (c) { c.ellipse(0, -12, 16.5, 12.5, 0, 0, TAU); };
        ctx.beginPath(); sp(ctx); A.fs(ctx, p.body, LW);
        ctx.save(); ctx.beginPath(); sp(ctx); ctx.clip(); A.ellipse(ctx, 6, -7, 11, 8, p.belly, 0); ctx.restore();
        shadeSide(ctx, sp, -24, 12); outline(ctx, sp);
        A.ellipse(ctx, -2, -13, 6, 8.5, U.shade(p.body, -0.06), 2, null, 0.9);
        ctx.save(); ctx.translate(6, -21); ctx.rotate(0.55); this.head(ctx, p, f); ctx.restore();
        return;
      }
      A.ellipse(ctx, -6 + s * 2.5, -2.4 - Math.max(0, s) * 2.5, 6.5, 3, p.feet, 2);
      A.ellipse(ctx, 6 - s * 2.5, -2.4 - Math.max(0, -s) * 2.5, 6.5, 3, p.feet, 2);
      this.wing(ctx, p, f, false);
      var bp = function (c) { c.ellipse(0, -14, 14.5, 13.5, 0, 0, TAU); };
      // downy fuzz poking out of the silhouette
      A.circle(ctx, -12.5, -19, 3, p.body, 2); A.circle(ctx, -14, -13.5, 3, p.body, 2); A.circle(ctx, -12.5, -8.5, 2.6, p.body, 2);
      ctx.beginPath(); bp(ctx); A.fs(ctx, p.body, LW);
      ctx.save(); ctx.beginPath(); bp(ctx); ctx.clip();
      A.ellipse(ctx, 5, -10, 10, 10.5, p.belly, 0);
      // downy scallops on the tummy
      ctx.strokeStyle = U.alpha(p.shade, 0.35); ctx.lineWidth = 1.2;
      for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(1 + i * 4.5, -9 + (i % 2) * 4, 2, 0.2, PI - 0.2); ctx.stroke(); }
      ctx.restore();
      shadeSide(ctx, bp, -20, 10); outline(ctx, bp);
      ctx.save(); ctx.translate(4 + f.headDx, -32 + f.headDy); ctx.rotate(f.headRot);
      this.head(ctx, p, f);
      ctx.restore();
      this.wing(ctx, p, f, true);
    }
  };

  // ---- Ermine kit -----------------------------------------------------------
  K.ermine = {
    name: 'Ermine', blurb: 'Quick and curious', food: 'eggs', toy: 'yarn',
    height: 42, headX: 17, shadow: 22, bowlX: 38, toyX: 44, bowlColor: C.purple,
    eat: { dx: 6, dy: 12, rot: 0.5 },
    colors: [
      { id: 'snow', name: 'Snow', body: '#fbfcff', shade: '#d8e0ee', belly: '#ffffff', inner: '#ffc1d0', nose: '#3d4c6e', tip: '#2a3048' },
      { id: 'cream', name: 'Cream', body: '#f6e8cc', shade: '#ddc8a3', belly: '#fffaf0', inner: '#ffc1d0', nose: '#5b4636', tip: '#2e2a33' },
      { id: 'caramel', name: 'Caramel', body: '#c98c56', shade: '#a86f3f', belly: '#fff3dc', inner: '#f4b7a5', nose: '#3a2a20', tip: '#2e2a33' },
      { id: 'silver', name: 'Silver', body: '#c8cfdc', shade: '#a7b0c3', belly: '#f3f6fa', inner: '#ffc1d0', nose: '#3d4c6e', tip: '#2a3048' }
    ],
    gait: function (f, t, g) {
      var ph = t * 7.5, s = Math.sin(ph);
      g.lift = Math.max(0, s) * 14;
      f.stretch = s;
      g.rot = s > 0 ? -Math.cos(ph) * 0.22 : 0;
      f.tail = Math.cos(ph) * 0.25;
    },
    tail: function (ctx, p, f, x, y, a) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      var tp = function (c) { c.moveTo(0, -3); c.bezierCurveTo(-8, -4, -13, -10, -15, -20); c.lineTo(-9, -21); c.bezierCurveTo(-8, -13, -4, -8, 1, 3); c.closePath(); };
      ctx.beginPath(); tp(ctx); A.fs(ctx, p.body, 2.2);
      ctx.save(); ctx.beginPath(); tp(ctx); ctx.clip(); A.ellipse(ctx, -12, -22, 6, 7, p.tip, 0); ctx.restore();
      ctx.beginPath(); tp(ctx); A.fs(ctx, null, 2.2);
      // black brush tip
      A.ellipse(ctx, -12.5, -23, 4.3, 6, p.tip, 2.2, null, -0.3);
      A.highlight(ctx, -13.5, -25, 1.2, 2, 0.4);
      ctx.restore();
    },
    head: function (ctx, p, f, sleep) {
      ctx.save(); ctx.translate(-6, -8); ctx.rotate(-0.3 + (sleep ? 0.3 : 0)); A.circle(ctx, 0, -2, 4.6, p.body, LW); A.circle(ctx, 0.3, -1.6, 2.3, p.inner, 0); ctx.restore();
      ctx.save(); ctx.translate(3, -9.5); ctx.rotate(0.25 + (sleep ? 0.3 : f.ear)); A.circle(ctx, 0, -2, 4.6, p.body, LW); A.circle(ctx, 0.3, -1.6, 2.3, p.inner, 0); ctx.restore();
      A.ellipse(ctx, 0, 0, 11, 10, p.body, LW);
      // snout
      var sn = function (c) { c.moveTo(4, -3.5); c.quadraticCurveTo(13, -4, 15.5, 1.5); c.quadraticCurveTo(13, 6.5, 4, 6); c.closePath(); };
      ctx.beginPath(); sn(ctx); A.fs(ctx, p.belly, 2);
      A.ellipse(ctx, 0, 0, 11, 10, null, 0);
      // blend snout into head (hide inner outline segment)
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 9.6, 8.6, 0, 0, TAU); ctx.clip(); A.ellipse(ctx, 6, 1.5, 4.5, 4, p.belly, 0); ctx.restore();
      if (p.belly !== p.body) { ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 9.6, 8.6, 0, 0, TAU); ctx.clip(); A.ellipse(ctx, 2, 9, 9, 4, p.belly, 0); ctx.restore(); }
      A.ellipse(ctx, 15, 0.8, 2.3, 1.8, p.nose, 1.1);
      eye(ctx, -1.5, -2, 3.2, f); eye(ctx, 6, -2.6, 3, f);
      blush(ctx, -5.5, 4, 3.2, f.blush);
      mouth(ctx, 11.5, 4.4, f, 0.8);
      whiskers(ctx, 13.5, 3, 7, 2.2);
    },
    draw: function (ctx, p, f) {
      var k = f.stretch || 0;
      if (f.sleep) {
        var cp = function (c) { c.ellipse(0, -9, 18, 9.5, 0, 0, TAU); };
        ctx.beginPath(); cp(ctx); A.fs(ctx, p.body, LW);
        shadeSide(ctx, cp, -26, 12); outline(ctx, cp);
        // tail wrapped around the front like a scarf; the head rests on it
        var wp = function (c) { c.moveTo(-17, -5); c.bezierCurveTo(-13, 1, 0, 2, 8, -1); c.lineTo(8, -6); c.bezierCurveTo(0, -3, -10, -3, -15, -10); c.closePath(); };
        ctx.beginPath(); wp(ctx); A.fs(ctx, p.body, 2.2);
        A.ellipse(ctx, 10, -3.6, 5, 3.4, p.tip, 2.2, null, -0.1);
        ctx.save(); ctx.translate(11, -13); ctx.rotate(0.12); this.head(ctx, p, f, true); ctx.restore();
        return;
      }
      var arch = k < 0 ? -k * 5 : 0;
      var ext = k > 0 ? k : 0;
      // far legs
      A.ellipse(ctx, -12 - ext * 6, -3 - ext * 3, 3.6, 4.2, p.shade, 2);
      A.ellipse(ctx, 9 + ext * 6, -3 - ext * 3, 3.6, 4.2, p.shade, 2);
      this.tail(ctx, p, f, -17 - ext * 4, -11 + arch * 0.4, -0.2 + f.tail + ext * 0.5);
      ctx.save(); ctx.translate(-2, -12); ctx.scale(1 + k * 0.16, 1 - k * 0.1);
      var bp = function (c) {
        c.moveTo(-19, 2); c.bezierCurveTo(-21, -8 - arch, -6, -12 - arch * 1.6, 7, -10);
        c.bezierCurveTo(17, -8, 20, 3, 13, 8); c.bezierCurveTo(4, 11, -16, 11, -19, 2); c.closePath();
      };
      ctx.beginPath(); bp(ctx); A.fs(ctx, p.body, LW);
      ctx.save(); ctx.beginPath(); bp(ctx); ctx.clip(); A.ellipse(ctx, 6, 8, 14, 6, p.belly, 0); ctx.restore();
      shadeSide(ctx, bp, -24, 10); outline(ctx, bp);
      A.highlight(ctx, -6, -7 - arch, 4, 1.6, 0.45);
      ctx.restore();
      // near legs
      A.ellipse(ctx, -9 - ext * 7, -2.6 - ext * 3, 3.8, 4.4, p.body, 2);
      A.ellipse(ctx, 12 + ext * 7, -2.6 - ext * 3, 3.8, 4.4, p.body, 2);
      ctx.save(); ctx.translate(17 + ext * 4 + f.headDx, -24 + f.headDy - ext * 2); ctx.rotate(f.headRot);
      this.head(ctx, p, f, false);
      ctx.restore();
    }
  };

  // ---- Walrus pup -----------------------------------------------------------
  K.walrus = {
    name: 'Walrus Pup', blurb: 'Big hugs, tiny tusks', food: 'clams', toy: 'ball',
    height: 44, headX: 12, shadow: 26, bowlX: 40, toyX: 46, bowlColor: C.orange,
    eat: { dx: 6, dy: 9, rot: 0.38 },
    colors: [
      { id: 'rosy', name: 'Rosy', body: '#eaa797', shade: '#cf8a7a', muzzle: '#f9d6cb', nose: '#8a4f45' },
      { id: 'sand', name: 'Sand', body: '#dcc19b', shade: '#c0a379', muzzle: '#f4e6cf', nose: '#6e5338' },
      { id: 'cocoa', name: 'Cocoa', body: '#9c705b', shade: '#7e5644', muzzle: '#d6b6a0', nose: '#3a2a20' },
      { id: 'grey', name: 'Grey', body: '#a9b2c3', shade: '#8b95a9', muzzle: '#dde3ec', nose: '#3d4c6e' }
    ],
    gait: function (f, t, g) {
      var ph = t * 8, s = Math.sin(ph);
      g.sx = 1 + s * 0.12; g.sy = 1 - s * 0.1; g.lift = Math.max(0, s) * 3; g.rot = -0.05 + s * 0.03;
      f.step = s;
    },
    head: function (ctx, p, f) {
      var hp = function (c) { c.ellipse(0, 0, 14, 13, 0, 0, TAU); };
      ctx.beginPath(); hp(ctx); A.fs(ctx, p.body, LW);
      shadeSide(ctx, hp, -20, 8); outline(ctx, hp);
      A.highlight(ctx, -4, -8, 3.4, 1.8, 0.5);
      eye(ctx, -1, -4, 3.2, f); eye(ctx, 7.5, -4.8, 3, f);
      blush(ctx, -6, 3.5, 3.6, f.blush);
      // mouth peeks out under the whisker pads
      if (f.mouth === 'open') A.ellipse(ctx, 12, 10.5, 3, 2.6, '#e8607a', 1.4);
      else if (f.mouth === 'chew') A.ellipse(ctx, 12, 10, 2.4, 0.8 + Math.abs(Math.sin(f.t * 13)) * 1.6, '#c8506a', 1.3);
      // tusk nubs
      A.shape(ctx, function (c) { c.moveTo(7.5, 9); c.quadraticCurveTo(8, 14.5, 9.8, 15); c.quadraticCurveTo(11, 13, 11, 9); c.closePath(); }, '#fffaf0', 1.5);
      A.shape(ctx, function (c) { c.moveTo(14, 9); c.quadraticCurveTo(14.6, 14, 16.3, 14.4); c.quadraticCurveTo(17.4, 12.4, 17.4, 8.6); c.closePath(); }, '#fffaf0', 1.5);
      // puffy whisker pads
      A.circle(ctx, 8.5, 5.5, 6, p.muzzle, 2);
      A.circle(ctx, 15.5, 5, 6, p.muzzle, 2);
      ctx.fillStyle = U.alpha(p.nose, 0.55);
      [[6, 5], [8.5, 7.5], [10, 4.5], [14, 7], [16.5, 4.5], [18, 7.5]].forEach(function (d) { ctx.beginPath(); ctx.arc(d[0], d[1], 0.7, 0, TAU); ctx.fill(); });
      A.ellipse(ctx, 12.5, 0.4, 3, 2, p.nose, 1.2);
      A.highlight(ctx, 11.8, -0.1, 0.9, 0.5, 0.8);
      whiskers(ctx, 20.5, 5.5, 6, 2.6);
    },
    draw: function (ctx, p, f) {
      var s = f.step;
      var flat = f.sleep ? 0.82 : 1;
      // tail flippers
      ctx.save(); ctx.translate(-26, -4); ctx.rotate(0.15 + (f.mv ? s * 0.35 : Math.sin(f.t * 2) * 0.05));
      A.shape(ctx, function (c) { c.moveTo(2, 0); c.quadraticCurveTo(-8, -10, -12, -6); c.quadraticCurveTo(-9, -1, -12, 4); c.quadraticCurveTo(-8, 6, 2, 1); c.closePath(); }, p.shade, 2);
      ctx.restore();
      A.ellipse(ctx, 2, -3, 4.5, 3.2, p.shade, 2, null, -0.4);
      ctx.save(); ctx.scale(1, flat);
      var bp = function (c) {
        c.moveTo(-28, -3); c.bezierCurveTo(-28, -20, -12, -33, 4, -33);
        c.bezierCurveTo(20, -33, 25, -16, 22, -3); c.quadraticCurveTo(0, 2, -28, -3); c.closePath();
      };
      ctx.beginPath(); bp(ctx); A.fs(ctx, p.body, LW);
      ctx.save(); ctx.beginPath(); bp(ctx); ctx.clip();
      A.ellipse(ctx, 6, -4, 16, 9, U.shade(p.body, 0.18), 0);
      // chubby rolls
      ctx.strokeStyle = U.alpha(p.shade, 0.8); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(-12, -12, 9, -0.6, 0.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(-5, -10, 8, -0.5, 0.55); ctx.stroke();
      ctx.restore();
      shadeSide(ctx, bp, -32, 12); outline(ctx, bp);
      A.highlight(ctx, -8, -24, 5, 2.2, 0.45);
      ctx.restore();
      // front flipper
      ctx.save(); ctx.translate(13, -9 * flat);
      var fr = f.sleep ? 1.2 : (f.mv ? 0.5 - s * 0.5 : (f.mood === 'happy' || f.mood === 'play') ? -0.4 + Math.sin(f.t * 14) * 0.5 : 0.55 + Math.sin(f.t * 2.2) * 0.05);
      ctx.rotate(fr); A.ellipse(ctx, 0, 6, 4.6, 8.5, p.shade, 2);
      ctx.restore();
      ctx.save();
      if (f.sleep) { ctx.translate(15, -15); ctx.rotate(0.25); }
      else { ctx.translate(12 + f.headDx, -28 + f.headDy); ctx.rotate(f.headRot); }
      this.head(ctx, p, f);
      ctx.restore();
    }
  };

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  P.KINDS = ['lemming', 'puffin', 'ermine', 'walrus'];
  P.kinds = K;
  P.palette = function (pet) {
    var kd = K[pet && pet.kind] || K.lemming;
    for (var i = 0; i < kd.colors.length; i++) if (kd.colors[i].id === (pet && pet.color)) return kd.colors[i];
    return kd.colors[0];
  };
  P.height = function (pet, st) { var kd = K[pet && pet.kind] || K.lemming; return kd.height * ((st && st.scale) || 1); };

  P.draw = function (ctx, x, y, pet, st) {
    st = st || {}; pet = pet || {};
    var kd = K[pet.kind] || K.lemming, p = P.palette(pet);
    var t = st.t || 0, mood = st.mood || 'idle', sc = st.scale || 1, dir = st.dir < 0 ? -1 : 1, off = st.blinkOffset || 0;
    var f = {
      t: t, mood: mood, sleep: mood === 'sleep', mv: !!st.moving && mood !== 'sleep',
      eyes: ((t + off) % 3.7) < 0.12 ? 'blink' : 'open', mouth: 'smile',
      lookX: 0, lookY: 0, headDx: 0, headDy: 0, headRot: 0, ear: 0,
      step: 0, flap: 0, stretch: 0, tail: Math.sin(t * 2.4 + off) * 0.12, blush: 0.38
    };
    var g = { lift: 0, rot: 0, sx: 1, sy: 1 }, spin = 1, extra = null;

    if (f.mv) {
      kd.gait(f, t, g);
    } else if (mood === 'happy') {
      var hp = Math.abs(Math.sin(t * 7));
      g.lift = hp * 10; g.sy = hp < 0.15 ? 0.9 : 1.03; g.sx = 2 - g.sy;
      f.eyes = 'happy'; f.mouth = 'open'; f.tail = Math.sin(t * 24) * 0.4; f.blush = 0.5; f.headRot = -0.08;
    } else if (mood === 'love') {
      var sw = Math.sin(t * 2.6);
      g.rot = sw * 0.07; g.sy = 1 + Math.sin(t * 5.2) * 0.02;
      f.eyes = 'happy'; f.blush = 0.75; f.headRot = -0.14 + sw * 0.1; f.tail = Math.sin(t * 9) * 0.3;
      extra = 'hearts';
    } else if (mood === 'eat') {
      var dn = 0.5 + 0.5 * Math.sin(t * 5.5);
      f.headDx = kd.eat.dx * (0.75 + 0.25 * dn); f.headDy = kd.eat.dy * (0.55 + 0.45 * dn); f.headRot = kd.eat.rot * (0.6 + 0.4 * dn);
      f.mouth = 'chew'; f.eyes = dn > 0.55 ? 'happy' : f.eyes; f.lookY = 0.8; f.lookX = 0.4;
      g.rot = 0.04 * dn; g.sy = 1 - dn * 0.03;
      extra = 'bowl';
    } else if (mood === 'play') {
      var T = 1.5, ph = (t % T) / T, n = Math.floor(t / T);
      f.mouth = 'open'; f.blush = 0.5;
      if (ph < 0.56) {
        var q = ph / 0.56;
        g.lift = Math.sin(q * PI) * 18; f.eyes = 'happy';
        if (n % 2 === 0) { var cs = Math.cos(q * TAU); spin = (cs < 0 ? -1 : 1) * (0.35 + 0.65 * Math.abs(cs)); }
        else g.rot = -0.25 * Math.sin(q * PI);
        if (kd === K.ermine) f.stretch = Math.sin(q * PI) * 0.8;
        f.flap = Math.sin(t * 26);
      } else {
        var land = (ph - 0.56) / 0.44;
        g.sy = land < 0.2 ? 0.88 : 1; g.sx = 2 - g.sy;
        f.lookX = 1; f.lookY = 0.3; f.headRot = 0.06;
        if (kd === K.ermine) f.stretch = land < 0.2 ? -0.7 : -0.2;
      }
      f.tail = Math.sin(t * 20) * 0.4;
      extra = 'toy';
    } else if (mood === 'sleep') {
      var b = Math.sin(t * 1.6);
      g.sy = 1 + b * 0.035; g.sx = 1 - b * 0.012;
      f.eyes = 'sleep'; f.mouth = 'none'; f.blush = 0.3; f.tail = 0;
    } else {
      // idle: breathing, blinking, an occasional look back over the shoulder and an ear twitch
      var br = Math.sin(t * 2.4) * 0.025; g.sy = 1 + br; g.sx = 1 - br * 0.5;
      var c = (t + off * 1.7) % 7;
      if (c > 4 && c < 5.6) { var lk = Math.sin((c - 4) / 1.6 * PI); f.lookX = -lk; f.headRot = -0.12 * lk; }
      var c2 = (t + off * 0.6) % 4.3;
      if (c2 < 0.3) f.ear = Math.sin(c2 / 0.3 * TAU) * 0.35;
    }

    var lift = g.lift;
    A.shadow(ctx, x, y + 1, kd.shadow * sc * (1 - lift / 50), kd.shadow * 0.3 * sc * (1 - lift / 60));
    ctx.save();
    ctx.translate(x, y - lift * sc);
    ctx.scale(sc * dir, sc);
    ctx.save();
    ctx.rotate(g.rot); ctx.scale(g.sx * spin, g.sy);
    kd.draw(ctx, p, f);
    ctx.restore();
    if (extra === 'bowl') bowl(ctx, kd.bowlX, kd.food, kd.bowlColor);
    else if (extra === 'toy') {
      var tb = Math.abs(Math.sin(t * PI / 0.75 + 0.6));
      ctx.save(); ctx.translate(0, lift);
      A.shadow(ctx, kd.toyX, 1, 6 * (1 - tb * 0.4), 1.8, 0.16);
      P.drawToy(ctx, kd.toyX, -7 - tb * 14, kd.toy, t, 1);
      ctx.restore();
    } else if (extra === 'hearts') {
      for (var i = 0; i < 2; i++) {
        var hp2 = (t * 0.7 + i * 0.5) % 1;
        ctx.save(); ctx.globalAlpha = Math.min(1, (1 - hp2) * 1.6);
        A.heart(ctx, kd.headX + (i ? 9 : -7) + Math.sin(t * 3 + i * 2) * 2.5, -kd.height + 2 - hp2 * 16, 4 * (0.7 + hp2 * 0.5), '#ff6f91', 1.4);
        ctx.restore();
      }
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Reaction icons drawn above a pet. (x, y) = centre of the icon. ~12–16 units.
  // ---------------------------------------------------------------------------
  function zed(ctx, x, y, s, a) {
    ctx.save(); ctx.globalAlpha = a;
    var pts = [x - s, y - s, x + s, y - s, x - s, y + s, x + s, y + s];
    A.line(ctx, pts, s * 0.85 + 1.6, OUT);
    A.line(ctx, pts, s * 0.85 - 0.6, '#dfe9ff');
    ctx.restore();
  }
  P.bubble = function (ctx, x, y, kind, t) {
    t = t || 0;
    var bob = Math.sin(t * 3) * 1.6;
    if (kind === 'heart') {
      var pulse = 1 + Math.max(0, Math.sin(t * 6)) * 0.18;
      A.heart(ctx, x, y + 4 + bob, 7 * pulse, '#ff6f91', 2);
      A.highlight(ctx, x - 3.4 * pulse, y - 0.5 + bob, 1.8, 1.1, 0.75);
    } else if (kind === 'note') {
      var r = Math.sin(t * 4) * 0.2;
      ctx.save(); ctx.translate(x, y + bob); ctx.rotate(r);
      A.box(ctx, 2.6, -11, 2.6, 13, 1.2, '#8e6bd8', 1.6);
      A.shape(ctx, function (c) { c.moveTo(4, -11); c.quadraticCurveTo(10, -9, 10, -3); c.quadraticCurveTo(8, -6, 4, -6.5); c.closePath(); }, '#8e6bd8', 1.6);
      A.ellipse(ctx, 0.5, 2.5, 4.6, 3.6, '#8e6bd8', 1.8, null, -0.35);
      A.highlight(ctx, -0.8, 1.2, 1.4, 0.8, 0.7);
      ctx.restore();
    } else if (kind === 'zzz') {
      for (var i = 0; i < 3; i++) {
        var ph = (t * 0.45 + i / 3) % 1;
        var a = ph < 0.15 ? ph / 0.15 : ph > 0.75 ? (1 - ph) / 0.25 : 1;
        zed(ctx, x - 4 + ph * 10 + Math.sin(ph * 6) * 2, y + 8 - ph * 22, 2.4 + ph * 2.6, a);
      }
    } else if (kind === 'sparkle') {
      var sr = 6.5 + Math.sin(t * 5) * 1;
      A.star(ctx, x, y + bob, sr, '#ffcf4a', 1.6, 4, 0.42, -PI / 2 + t * 0.8);
      A.highlight(ctx, x - 1, y - 1.5 + bob, 1.2, 0.8, 0.8);
      A.sparkle(ctx, x + 9, y - 6 + bob, 2.6 + Math.sin(t * 7) * 1, 0.9);
      A.sparkle(ctx, x - 9, y + 5 + bob, 2 + Math.sin(t * 7 + 2) * 0.8, 0.8);
    } else if (kind === 'crumb') {
      for (var j = 0; j < 4; j++) {
        var cp = (t * 1.3 + j * 0.27) % 1;
        var cx = x + (j - 1.5) * 4 + Math.sin(j * 3.1) * 2 + (j % 2 ? 1 : -1) * cp * 5;
        var cy = y - 4 + cp * 14 + cp * cp * 6;
        ctx.save(); ctx.globalAlpha = 1 - cp * 0.8; ctx.translate(cx, cy); ctx.rotate(j + t * 3);
        A.poly(ctx, [-1.8, -1.2, 1.6, -1.6, 2, 1.2, -1.2, 1.8], j % 2 ? '#e2a65a' : '#c9834a', 1);
        ctx.restore();
      }
    }
  };
})();
