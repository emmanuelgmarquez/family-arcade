/* Aurora Bay — igloo furniture catalog, wall/floor/window styles.
 *
 * AB.furniture[id] = { name, price, cat, place: 'floor'|'rug'|'wall', w, h, flip, rotate, draw(ctx, o) }
 *   Floor items: (0,0) is the centre of the base where the item touches the floor; drawn upward.
 *   Rugs:        (0,0) is the rug centre, drawn flat in perspective (depth squashed to 0.45).
 *                o.rot (0..3) turns the rug in 90° steps. Use AB.furnitureBox(id, rot) for the
 *                on-screen footprint of a turned rug (a literal w/h swap is wrong in perspective).
 *   Wall items:  (0,0) is the item centre.
 *   o = { t (seconds), flip, rot, owner? }. The game applies flip itself before calling draw.
 * AB.roomStyles = { wall: {id:{name,price,paint(ctx,box)}}, floor: {...}, window: {id:{name,price,draw(ctx,cx,cy,t)}} }
 * AB.FURNITURE_STARTER = ids every new player owns.
 * Everything is drawn with the shared kit (AB.art): navy outline, one shade shape, a highlight. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C, OUT = C.out;
  var PI = Math.PI, TAU = PI * 2;
  var SQ = 0.45; // rug perspective squash

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------
  function lt(c, a) { return U.shade(c, a == null ? 0.25 : a); }
  function dk(c, a) { return U.shade(c, -(a == null ? 0.22 : a)); }
  function rr(x, y, w, h, r) { return function (c) { A.rrect(c, x, y, w, h, r); }; }
  function el(x, y, rx, ry) { return function (c) { c.ellipse(x, y, rx, ry, 0, 0, TAU); }; }
  /** Darken a rect area inside a clip path (the house "one shade shape"). */
  function shadeIn(ctx, build, x, y, w, h, a, col) {
    ctx.save(); ctx.beginPath(); build(ctx); ctx.clip();
    ctx.fillStyle = col || 'rgba(29,43,82,' + (a == null ? 0.16 : a) + ')';
    ctx.fillRect(x, y, w, h); ctx.restore();
  }
  /** Darken with an arbitrary shape inside a clip path. */
  function shadeShape(ctx, build, shapeFn, a) {
    ctx.save(); ctx.beginPath(); build(ctx); ctx.clip();
    ctx.fillStyle = 'rgba(29,43,82,' + (a == null ? 0.16 : a) + ')';
    ctx.beginPath(); shapeFn(ctx); ctx.fill(); ctx.restore();
  }
  function restroke(ctx, build, lw) { ctx.beginPath(); build(ctx); A.fs(ctx, null, lw == null ? 3 : lw); }
  /** Box seen from the 3/4 view: a lighter top strip of depth d above the front face. */
  function cube(ctx, x, y, w, h, d, front, top, r) {
    r = r == null ? 5 : r;
    if (d > 0) A.box(ctx, x, y - d, w, d + r + 3, r, top || lt(front, 0.2), 3);
    A.box(ctx, x, y, w, h, r, front, 3);
  }
  function shadeRight(ctx, x, y, w, h, r, frac, a) {
    var b = rr(x, y, w, h, r);
    shadeIn(ctx, b, x + w * (1 - frac), y - 2, w * frac + 4, h + 4, a);
    restroke(ctx, b);
  }
  function knob(ctx, x, y, r, col) { A.circle(ctx, x, y, r || 3.5, col || C.coin, 2); }
  function leaf(ctx, x, y, len, wid, ang, fill, lw) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(wid, -len * 0.45, 0, -len);
    ctx.quadraticCurveTo(-wid, -len * 0.45, 0, 0);
    A.fs(ctx, fill, lw == null ? 2.5 : lw);
    A.line(ctx, [0, -2, 0, -len * 0.8], 1.4, 'rgba(20,60,50,0.45)');
    ctx.restore();
  }
  function pot(ctx, w, h, col, band) {
    var b = function (c) { c.moveTo(-w / 2, -h); c.lineTo(w / 2, -h); c.lineTo(w * 0.36, -2); c.quadraticCurveTo(0, 2, -w * 0.36, -2); c.closePath(); };
    A.shape(ctx, b, col, 3);
    shadeIn(ctx, b, w * 0.12, -h - 2, w, h + 6, 0.18);
    if (band) shadeIn(ctx, b, -w, -h * 0.55, w * 2, 5, 0, band);
    restroke(ctx, b);
    A.box(ctx, -w / 2 - 4, -h - 9, w + 8, 12, 4, lt(col, 0.12), 3);
    A.highlight(ctx, -w * 0.25, -h * 0.55, 3, 7, 0.45);
  }
  function soil(ctx, w, h) { A.ellipse(ctx, 0, -h - 6, w / 2 - 1, 4, '#6b4a34', 0); }
  function note(ctx, x, y, s, col, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
    A.ellipse(ctx, 0, 0, 6, 4.5, col, 2, OUT, -0.4);
    A.line(ctx, [5, -1, 5, -20, 12, -15], 2.5, OUT);
    ctx.restore();
  }
  function frameBox(ctx, w, h, col, inner) {
    ctx.save(); ctx.fillStyle = 'rgba(30,45,90,0.18)'; ctx.beginPath(); A.rrect(ctx, -w / 2 + 4, -h / 2 + 5, w, h, 6); ctx.fill(); ctx.restore();
    A.box(ctx, -w / 2, -h / 2, w, h, 6, col, 3);
    shadeIn(ctx, rr(-w / 2, -h / 2, w, h, 6), -w / 2, h / 2 - 7, w, 10, 0.2);
    restroke(ctx, rr(-w / 2, -h / 2, w, h, 6));
    var m = inner || 9;
    return { x: -w / 2 + m, y: -h / 2 + m, w: w - m * 2, h: h - m * 2 };
  }
  function seededRnd(seed) { return U.seeded(seed); }

  var F = AB.furniture = {};
  function def(id, o) { F[id] = o; if (o.flip == null) o.flip = true; if (o.rotate == null) o.rotate = false; }

  // ---------------------------------------------------------------------------
  // BEDS
  // ---------------------------------------------------------------------------
  function bedBody(ctx, cfg, legs) {
    var fr = cfg.frame, frD = dk(fr, 0.25);
    if (legs) { A.box(ctx, -82, -16, 11, 16, 3, frD, 2.5); A.box(ctx, 71, -16, 11, 16, 3, frD, 2.5); }
    cfg.head(ctx, fr);
    // side rail
    A.box(ctx, -76, -44, 160, 30, 8, fr, 3);
    shadeIn(ctx, rr(-76, -44, 160, 30, 8), -80, -24, 170, 20, 0.2);
    restroke(ctx, rr(-76, -44, 160, 30, 8));
    A.highlight(ctx, -50, -37, 12, 2.5, 0.35);
    // mattress
    A.box(ctx, -72, -80, 150, 44, 12, '#fbfdff', 3);
    // pillow
    A.box(ctx, -68, -90, 46, 26, 12, '#ffffff', 3);
    shadeIn(ctx, rr(-68, -90, 46, 26, 12), -70, -72, 50, 10, 0.12);
    restroke(ctx, rr(-68, -90, 46, 26, 12));
    A.line(ctx, [-52, -80, -45, -77, -38, -80], 1.6, 'rgba(38,50,77,0.4)');
    // quilt
    var q = function (c) {
      c.moveTo(-30, -82); c.lineTo(70, -82); c.quadraticCurveTo(82, -82, 82, -70);
      c.lineTo(82, -34);
      for (var i = 0; i < 4; i++) { var x0 = 82 - i * 28; c.quadraticCurveTo(x0 - 7, -27, x0 - 14, -32); c.quadraticCurveTo(x0 - 21, -37, x0 - 28, -30); }
      c.lineTo(-30, -30); c.closePath();
    };
    A.shape(ctx, q, cfg.quilt, 3);
    ctx.save(); ctx.beginPath(); q(ctx); ctx.clip();
    cfg.pattern(ctx);
    ctx.fillStyle = 'rgba(29,43,82,0.18)'; ctx.fillRect(-40, -56, 140, 40);
    ctx.restore();
    A.line(ctx, [-30, -56, 82, -56], 2, 'rgba(38,50,77,0.35)');
    restroke(ctx, q);
    // folded sheet cuff
    A.box(ctx, -34, -82, 14, 52, 6, '#ffffff', 3);
    A.highlight(ctx, 0, -74, 16, 3, 0.45);
    // footboard
    A.box(ctx, 74, -74, 18, 64, 8, fr, 3);
    shadeIn(ctx, rr(74, -74, 18, 64, 8), 84, -80, 12, 80, 0.2);
    restroke(ctx, rr(74, -74, 18, 64, 8));
    A.ellipse(ctx, 83, -76, 11, 5, lt(fr, 0.2), 2.5);
  }
  def('bed_cozy', {
    name: 'Cozy Bed', price: 120, cat: 'bed', place: 'floor', w: 180, h: 120,
    draw: function (ctx, o) {
      A.shadow(ctx, 6, -2, 98, 15);
      bedBody(ctx, {
        frame: C.wood, quilt: '#5d9be8',
        head: function (c, fr) {
          var b = function (k) { k.moveTo(-92, -8); k.lineTo(-92, -100); k.quadraticCurveTo(-92, -122, -78, -122); k.quadraticCurveTo(-64, -122, -64, -100); k.lineTo(-64, -8); k.closePath(); };
          A.shape(c, b, fr, 3);
          shadeIn(c, b, -74, -130, 14, 130, 0.2); restroke(c, b);
          A.heart(c, -78, -98, 8, C.red, 2);
          A.highlight(c, -85, -108, 2.5, 6, 0.5);
        },
        pattern: function (c) {
          c.fillStyle = '#8fbcf3';
          for (var x = -30; x < 90; x += 22) for (var y = -82; y < -20; y += 22) if (((x + y) / 22 & 1) === 0) c.fillRect(x, y, 22, 22);
          c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5; c.setLineDash([3, 3]);
          for (var x2 = -8; x2 < 90; x2 += 22) { c.beginPath(); c.moveTo(x2, -82); c.lineTo(x2, -20); c.stroke(); }
          for (var y2 = -60; y2 < -20; y2 += 22) { c.beginPath(); c.moveTo(-30, y2); c.lineTo(90, y2); c.stroke(); }
          c.setLineDash([]);
        }
      }, true);
    }
  });
  def('bed_star', {
    name: 'Starry Bed', price: 180, cat: 'bed', place: 'floor', w: 180, h: 140,
    draw: function (ctx, o) {
      A.shadow(ctx, 6, -2, 98, 15);
      bedBody(ctx, {
        frame: '#8e6bd8', quilt: '#ffcf4a',
        head: function (c, fr) {
          A.box(c, -92, -104, 28, 96, 10, fr, 3);
          shadeIn(c, rr(-92, -104, 28, 96, 10), -74, -110, 14, 110, 0.2); restroke(c, rr(-92, -104, 28, 96, 10));
          var tw = Math.sin(o.t * 2) * 0.05;
          A.glow(c, -78, -116, 40, 'rgba(255,220,120,', 0.35 + tw);
          A.star(c, -78, -114, 26, C.yellow, 3);
          A.star(c, -78, -114, 13, '#fff1a8', 0);
          A.highlight(c, -84, -122, 3, 5, 0.6);
          A.sparkle(c, -54, -132, 5, 0.5 + 0.5 * Math.sin(o.t * 3));
        },
        pattern: function (c) {
          for (var i = 0; i < 9; i++) {
            var x = -18 + (i % 4) * 28 + (Math.floor(i / 4) % 2) * 14, y = -72 + Math.floor(i / 4) * 18;
            A.star(c, x, y, 6, '#fff7cc', 0);
          }
          c.fillStyle = '#ffb83a'; c.fillRect(-30, -42, 120, 5);
        }
      }, true);
    }
  });
  def('bed_bunk', {
    name: 'Bunk Bed', price: 220, cat: 'bed', place: 'floor', w: 190, h: 200,
    draw: function (ctx, o) {
      A.shadow(ctx, 6, -2, 102, 15);
      var fr = C.woodLight, frD = dk(fr, 0.3);
      // back posts
      A.box(ctx, -92, -196, 14, 190, 5, frD, 3);
      A.box(ctx, 80, -150, 13, 144, 5, frD, 3);
      // lower bunk
      bedBody(ctx, {
        frame: fr, quilt: C.green,
        head: function () {},
        pattern: function (c) { c.fillStyle = '#86d38b'; for (var x = -30; x < 90; x += 16) c.fillRect(x, -90, 8, 70); }
      }, false);
      // upper bunk
      ctx.save(); ctx.translate(0, -92);
      bedBody(ctx, {
        frame: fr, quilt: C.red,
        head: function () {},
        pattern: function (c) { for (var i = 0; i < 6; i++) A.heart(c, -10 + (i % 3) * 32, -70 + Math.floor(i / 3) * 20, 6, '#ffc1c8', 0); }
      }, false);
      // guard rail
      A.box(ctx, -40, -104, 100, 10, 4, fr, 3);
      A.box(ctx, -38, -96, 7, 30, 2, fr, 2.5); A.box(ctx, 8, -96, 7, 30, 2, fr, 2.5); A.box(ctx, 52, -96, 7, 30, 2, fr, 2.5);
      ctx.restore();
      // front posts
      A.box(ctx, -96, -200, 16, 200, 6, fr, 3);
      shadeIn(ctx, rr(-96, -200, 16, 200, 6), -88, -204, 10, 210, 0.18); restroke(ctx, rr(-96, -200, 16, 200, 6));
      A.ellipse(ctx, -88, -202, 10, 5, lt(fr, 0.2), 2.5);
      // ladder
      A.box(ctx, 86, -186, 9, 186, 3, fr, 3);
      A.box(ctx, 108, -186, 9, 186, 3, fr, 3);
      for (var r = 0; r < 6; r++) A.box(ctx, 92, -168 + r * 28, 20, 7, 3, lt(fr, 0.1), 2.5);
      A.highlight(ctx, -92, -170, 2, 10, 0.5);
    }
  });

  // ---------------------------------------------------------------------------
  // SEATS
  // ---------------------------------------------------------------------------
  def('chair_wood', {
    name: 'Wooden Chair', price: 15, cat: 'seat', place: 'floor', w: 60, h: 95,
    draw: function (ctx) {
      A.shadow(ctx, 2, -2, 34, 8);
      var w = C.wood, wd = C.woodDark, wl = C.woodLight;
      // back legs + back posts
      A.box(ctx, -24, -96, 9, 88, 3, wd, 2.5);
      A.box(ctx, 15, -96, 9, 88, 3, wd, 2.5);
      // back rest
      A.box(ctx, -28, -98, 56, 20, 8, w, 3);
      shadeIn(ctx, rr(-28, -98, 56, 20, 8), -30, -84, 60, 8, 0.2); restroke(ctx, rr(-28, -98, 56, 20, 8));
      A.heart(ctx, 0, -86, 5, C.red, 1.8);
      A.box(ctx, -12, -78, 6, 26, 2, wl, 2); A.box(ctx, 6, -78, 6, 26, 2, wl, 2);
      // seat
      cube(ctx, -31, -46, 62, 10, 14, w, wl, 5);
      A.ellipse(ctx, 0, -54, 20, 5, '#e85f78', 2);
      // front legs
      A.box(ctx, -29, -37, 9, 37, 3, w, 2.5);
      A.box(ctx, 20, -37, 9, 37, 3, w, 2.5);
      shadeIn(ctx, rr(20, -37, 9, 37, 3), 24, -40, 8, 40, 0.2); restroke(ctx, rr(20, -37, 9, 37, 3), 2.5);
      A.highlight(ctx, -18, -57, 6, 2, 0.5);
    }
  });
  def('beanbag', {
    name: 'Beanbag', price: 25, cat: 'seat', place: 'floor', w: 86, h: 62,
    draw: function (ctx) {
      A.shadow(ctx, 3, -2, 46, 9);
      var col = C.purple;
      var b = function (c) {
        c.moveTo(-42, -6);
        c.bezierCurveTo(-50, -30, -36, -60, -6, -62);
        c.bezierCurveTo(22, -64, 40, -50, 44, -26);
        c.bezierCurveTo(46, -10, 40, 0, 20, 0);
        c.lineTo(-24, 0); c.bezierCurveTo(-36, 0, -40, -2, -42, -6); c.closePath();
      };
      A.shape(ctx, b, col, 3);
      shadeShape(ctx, b, function (c) { c.ellipse(36, -12, 40, 30, 0, 0, TAU); }, 0.2);
      shadeShape(ctx, b, function (c) { c.ellipse(-2, -40, 22, 9, -0.1, 0, TAU); }, 0.22);
      restroke(ctx, b);
      A.line(ctx, [-22, -40, -10, -30, 2, -26], 2, 'rgba(38,50,77,0.45)');
      A.line(ctx, [18, -48, 14, -34], 2, 'rgba(38,50,77,0.35)');
      A.star(ctx, 16, -18, 7, C.yellow, 2);
      A.highlight(ctx, -26, -46, 9, 5, 0.5);
    }
  });
  function sofaLike(ctx, x0, w, col, cushions) {
    var cl = lt(col, 0.15), half = w / 2;
    // back
    A.box(ctx, x0 + 6, -86, w - 12, 50, 18, col, 3);
    shadeIn(ctx, rr(x0 + 6, -86, w - 12, 50, 18), x0, -86, w, 8, 0, 'rgba(255,255,255,0.12)');
    restroke(ctx, rr(x0 + 6, -86, w - 12, 50, 18));
    // back cushions
    var cw = (w - 44) / cushions;
    for (var i = 0; i < cushions; i++) {
      A.box(ctx, x0 + 22 + i * cw, -76, cw - 2, 32, 12, cl, 3);
      A.circle(ctx, x0 + 22 + i * cw + cw / 2 - 1, -60, 2.2, dk(col, 0.3), 0);
    }
    // seat cushions (top surface)
    for (var j = 0; j < cushions; j++) A.box(ctx, x0 + 18 + j * cw, -52, cw + 2, 22, 9, cl, 3);
    // seat front
    A.box(ctx, x0 + 14, -36, w - 28, 28, 9, col, 3);
    shadeIn(ctx, rr(x0 + 14, -36, w - 28, 28, 9), x0, -18, w, 14, 0.2); restroke(ctx, rr(x0 + 14, -36, w - 28, 28, 9));
    // feet
    A.box(ctx, x0 + 12, -10, 10, 10, 3, C.woodDark, 2.5); A.box(ctx, x0 + w - 22, -10, 10, 10, 3, C.woodDark, 2.5);
    // arms
    [x0, x0 + w - 24].forEach(function (ax, k) {
      A.box(ctx, ax, -62, 24, 54, 11, col, 3);
      shadeIn(ctx, rr(ax, -62, 24, 54, 11), ax + 14, -66, 14, 60, k ? 0.22 : 0.12); restroke(ctx, rr(ax, -62, 24, 54, 11));
      A.ellipse(ctx, ax + 12, -61, 12, 6, cl, 2.5);
    });
    A.highlight(ctx, x0 + 30, -78, 12, 4, 0.4);
  }
  def('sofa_red', {
    name: 'Comfy Sofa', price: 90, cat: 'seat', place: 'floor', w: 156, h: 88,
    draw: function (ctx) {
      A.shadow(ctx, 4, -2, 82, 12);
      sofaLike(ctx, -78, 156, C.red, 2);
      // throw pillow
      ctx.save(); ctx.translate(-38, -54); ctx.rotate(-0.22);
      A.box(ctx, -14, -14, 28, 26, 8, C.yellow, 3);
      A.star(ctx, 0, -1, 6, '#fff3b3', 0);
      ctx.restore();
      // knitted blanket over right arm
      A.shape(ctx, function (c) { c.moveTo(48, -66); c.lineTo(72, -66); c.quadraticCurveTo(80, -66, 80, -58); c.lineTo(80, -22); c.lineTo(52, -26); c.closePath(); }, '#7fd0e8', 3);
      A.line(ctx, [56, -60, 76, -60], 2, '#fff'); A.line(ctx, [55, -48, 78, -48], 2, '#fff'); A.line(ctx, [54, -36, 79, -36], 2, '#fff');
    }
  });
  def('armchair_teal', {
    name: 'Teal Armchair', price: 60, cat: 'seat', place: 'floor', w: 90, h: 88,
    draw: function (ctx) {
      A.shadow(ctx, 3, -2, 50, 11);
      sofaLike(ctx, -45, 90, C.teal, 1);
      ctx.save(); ctx.translate(-4, -54); ctx.rotate(0.15);
      A.heart(ctx, 0, 6, 14, C.pink, 3);
      ctx.restore();
    }
  });
  def('stool', {
    name: 'Little Stool', price: 10, cat: 'seat', place: 'floor', w: 46, h: 52,
    draw: function (ctx) {
      A.shadow(ctx, 2, -2, 26, 7);
      var w = C.wood;
      A.line(ctx, [-6, -40, -3, -6], 7, OUT); A.line(ctx, [-6, -40, -3, -6], 3.5, C.woodDark);
      A.line(ctx, [-12, -40, -20, -2], 8, OUT); A.line(ctx, [-12, -40, -20, -2], 4.5, w);
      A.line(ctx, [12, -40, 20, -2], 8, OUT); A.line(ctx, [12, -40, 20, -2], 4.5, w);
      A.line(ctx, [-16, -18, 16, -18], 6, OUT); A.line(ctx, [-16, -18, 16, -18], 3, C.woodLight);
      A.ellipse(ctx, 0, -40, 23, 8, C.woodDark, 3);
      A.ellipse(ctx, 0, -45, 23, 8, C.woodLight, 3);
      A.ellipse(ctx, 0, -48, 17, 6, C.blue, 2.5);
      A.ellipse(ctx, 0, -49, 9, 3, lt(C.blue, 0.3), 0);
      A.highlight(ctx, -8, -50, 5, 2, 0.6);
    }
  });

  // ---------------------------------------------------------------------------
  // TABLES
  // ---------------------------------------------------------------------------
  def('table_round', {
    name: 'Round Table', price: 30, cat: 'table', place: 'floor', w: 92, h: 62,
    draw: function (ctx) {
      A.shadow(ctx, 2, -2, 44, 10);
      A.ellipse(ctx, 0, -5, 22, 7, C.woodDark, 3);
      A.box(ctx, -6, -48, 12, 44, 4, C.wood, 3);
      shadeIn(ctx, rr(-6, -48, 12, 44, 4), 0, -50, 8, 50, 0.2); restroke(ctx, rr(-6, -48, 12, 44, 4));
      A.ellipse(ctx, 0, -48, 46, 15, C.woodDark, 3);
      A.ellipse(ctx, 0, -54, 46, 15, C.woodLight, 3);
      A.ellipse(ctx, 0, -55, 26, 8, C.cream, 2);
      ctx.save(); ctx.strokeStyle = 'rgba(38,50,77,0.25)'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.ellipse(0, -55, 21, 6, 0, 0, TAU); ctx.stroke(); ctx.restore();
      A.highlight(ctx, -26, -58, 9, 3, 0.5);
    }
  });
  def('table_low', {
    name: 'Coffee Table', price: 25, cat: 'table', place: 'floor', w: 112, h: 44,
    draw: function (ctx) {
      A.shadow(ctx, 2, -2, 58, 9);
      var col = C.teal;
      A.box(ctx, -44, -24, 10, 18, 3, dk(col, 0.35), 2.5); A.box(ctx, 34, -24, 10, 18, 3, dk(col, 0.35), 2.5);
      cube(ctx, -56, -32, 112, 11, 14, col, lt(col, 0.25), 5);
      shadeIn(ctx, rr(-56, -32, 112, 11, 5), 20, -34, 40, 15, 0.2); restroke(ctx, rr(-56, -32, 112, 11, 5));
      A.box(ctx, -52, -22, 12, 22, 4, col, 2.5); A.box(ctx, 40, -22, 12, 22, 4, col, 2.5);
      A.mug(ctx, 22, -36, 0.42, C.yellow, 'cream');
      A.box(ctx, -38, -44, 32, 7, 2, C.red, 2); A.box(ctx, -36, -50, 28, 7, 2, C.blue, 2);
    }
  });
  def('desk', {
    name: 'Study Desk', price: 70, cat: 'table', place: 'floor', w: 124, h: 100,
    draw: function (ctx) {
      A.shadow(ctx, 3, -2, 64, 11);
      var w = C.woodLight, wd = C.wood;
      // left leg panel
      A.box(ctx, -58, -64, 13, 64, 4, wd, 3);
      // drawer unit
      A.box(ctx, 14, -64, 46, 64, 5, wd, 3);
      A.box(ctx, 19, -58, 36, 24, 4, w, 2.5); knob(ctx, 37, -46);
      A.box(ctx, 19, -30, 36, 24, 4, w, 2.5); knob(ctx, 37, -18);
      shadeIn(ctx, rr(14, -64, 46, 64, 5), 46, -66, 16, 70, 0.18); restroke(ctx, rr(14, -64, 46, 64, 5));
      // top
      cube(ctx, -62, -72, 124, 10, 16, w, lt(w, 0.2), 5);
      // paper + pencil cup + book
      ctx.save(); ctx.translate(-20, -80); ctx.rotate(-0.08); A.box(ctx, -14, -7, 28, 12, 2, '#fff', 2); A.line(ctx, [-9, -3, 8, -3], 1.4, '#9ab0d6'); A.line(ctx, [-9, 1, 4, 1], 1.4, '#9ab0d6'); ctx.restore();
      A.line(ctx, [-44, -86, -48, -100], 3, OUT); A.line(ctx, [-44, -86, -48, -100], 1.5, C.yellow);
      A.line(ctx, [-39, -86, -36, -102], 3, OUT); A.line(ctx, [-39, -86, -36, -102], 1.5, C.red);
      A.box(ctx, -50, -92, 16, 16, 4, C.blue, 2.5);
      // desk lamp
      A.ellipse(ctx, 40, -80, 11, 4, OUT, 0);
      A.line(ctx, [40, -82, 32, -102, 44, -112], 3, OUT);
      A.poly(ctx, [38, -118, 54, -108, 46, -104], C.red, 2.5);
      A.glow(ctx, 48, -100, 26, C.lampGlow, 0.4);
    }
  });

  // ---------------------------------------------------------------------------
  // STORAGE
  // ---------------------------------------------------------------------------
  def('bookshelf', {
    name: 'Bookshelf', price: 60, cat: 'storage', place: 'floor', w: 92, h: 150,
    draw: function (ctx) {
      A.shadow(ctx, 3, -2, 50, 10);
      var w = C.wood;
      cube(ctx, -46, -142, 92, 142, 10, w, C.woodLight, 6);
      A.box(ctx, -38, -134, 76, 124, 3, '#6a3d24', 2.5);
      var rnd = seededRnd(11), cols = [C.red, C.blue, C.yellow, C.green, C.purple, C.orange, C.teal, C.pink];
      var shelves = [-96, -54, -12];
      shelves.forEach(function (sy, si) {
        var x = -36;
        if (si === 0) {
          // globe on top shelf
          A.box(ctx, 14, -102, 14, 5, 2, C.woodDark, 2);
          A.circle(ctx, 21, -114, 11, '#6ec0f0', 2.5);
          ctx.save(); ctx.beginPath(); ctx.arc(21, -114, 11, 0, TAU); ctx.clip();
          A.ellipse(ctx, 17, -117, 6, 4, C.green, 0); A.ellipse(ctx, 26, -108, 4, 3, C.green, 0); ctx.restore();
        }
        var maxX = si === 0 ? 8 : (si === 2 ? 8 : 36);
        while (x < maxX) {
          var bw = 6 + Math.floor(rnd() * 5), bh = 26 + Math.floor(rnd() * 10), col = cols[Math.floor(rnd() * cols.length)];
          A.box(ctx, x, sy - bh, bw, bh, 2, col, 2);
          A.line(ctx, [x + 2, sy - bh + 6, x + bw - 2, sy - bh + 6], 1.3, 'rgba(255,255,255,0.7)');
          x += bw + 0.5;
        }
        if (si === 1) { ctx.save(); ctx.translate(32, sy); ctx.rotate(0.28); A.box(ctx, -8, -30, 8, 30, 2, C.yellow, 2); ctx.restore(); }
        if (si === 2) {
          A.circle(ctx, 22, sy - 12, 12, '#fff', 2.5);
          ctx.save(); ctx.beginPath(); ctx.arc(22, sy - 12, 12, 0, TAU); ctx.clip(); ctx.fillStyle = C.red; ctx.fillRect(10, sy - 24, 24, 9); ctx.fillStyle = C.blue; ctx.fillRect(10, sy - 9, 24, 9); ctx.restore();
          A.circle(ctx, 22, sy - 12, 12, null, 2.5);
        }
        A.box(ctx, -40, sy, 80, 7, 2, C.woodLight, 2.5);
      });
      shadeIn(ctx, rr(-46, -142, 92, 142, 6), 38, -146, 12, 150, 0.22);
      restroke(ctx, function (c) { A.rrect(c, -46, -142, 92, 142, 6); });
      A.highlight(ctx, -42, -120, 1.5, 12, 0.5);
    }
  });
  def('toybox', {
    name: 'Toy Box', price: 35, cat: 'storage', place: 'floor', w: 84, h: 78,
    draw: function (ctx) {
      A.shadow(ctx, 3, -2, 46, 9);
      var col = C.blue;
      // open lid (inside face)
      A.box(ctx, -40, -84, 80, 34, 8, dk(col, 0.25), 3);
      A.box(ctx, -34, -79, 68, 24, 5, dk(col, 0.4), 0);
      // toys peeking out
      A.circle(ctx, -16, -54, 13, C.red, 2.5);
      ctx.save(); ctx.beginPath(); ctx.arc(-16, -54, 13, 0, TAU); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(-30, -58, 30, 7); ctx.restore();
      A.circle(ctx, -16, -54, 13, null, 2.5);
      ctx.save(); ctx.translate(14, -58); ctx.rotate(0.3); A.star(ctx, 0, 0, 13, C.yellow, 2.5); ctx.restore();
      A.line(ctx, [30, -48, 26, -70], 4, OUT); A.circle(ctx, 25, -72, 4, C.pink, 2);
      // box
      cube(ctx, -42, -48, 84, 48, 8, col, lt(col, 0.2), 6);
      A.box(ctx, -42, -32, 84, 10, 0, C.yellow, 0);
      A.line(ctx, [-42, -32, 42, -32], 2.5); A.line(ctx, [-42, -22, 42, -22], 2.5);
      A.star(ctx, 0, -27, 8, '#fff', 2);
      shadeIn(ctx, rr(-42, -48, 84, 48, 6), 22, -50, 24, 52, 0.18);
      restroke(ctx, rr(-42, -48, 84, 48, 6));
      A.highlight(ctx, -30, -42, 8, 2.5, 0.5);
    }
  });
  def('dresser', {
    name: 'Dresser', price: 50, cat: 'storage', place: 'floor', w: 104, h: 125,
    draw: function (ctx) {
      A.shadow(ctx, 3, -2, 56, 10);
      var col = '#ffb3c7', dr = ['#ffe28a', '#a7e3d9', '#b9cdfb'];
      A.box(ctx, -44, -10, 10, 10, 3, C.woodDark, 2.5); A.box(ctx, 34, -10, 10, 10, 3, C.woodDark, 2.5);
      cube(ctx, -50, -94, 100, 86, 10, col, lt(col, 0.3), 7);
      for (var i = 0; i < 3; i++) {
        A.box(ctx, -42, -86 + i * 26, 84, 22, 5, dr[i], 2.5);
        knob(ctx, -18, -75 + i * 26, 3.5, '#fff'); knob(ctx, 18, -75 + i * 26, 3.5, '#fff');
      }
      shadeIn(ctx, rr(-50, -94, 100, 86, 7), 32, -96, 22, 92, 0.18); restroke(ctx, rr(-50, -94, 100, 86, 7));
      // picture frame + little plant on top
      A.box(ctx, -38, -124, 26, 22, 3, C.woodLight, 2.5); A.box(ctx, -33, -119, 16, 12, 1, '#bfe3ff', 1.5); A.heart(ctx, -25, -112, 4, C.red, 1.2);
      ctx.save(); ctx.translate(20, -100);
      leaf(ctx, 0, -12, 18, 7, -0.5, C.green, 2); leaf(ctx, 0, -12, 20, 7, 0.4, C.greenDark, 2); leaf(ctx, 0, -12, 22, 6, 0, C.green, 2);
      pot(ctx, 18, 12, C.orange); ctx.restore();
      A.highlight(ctx, -40, -96, 8, 2, 0.5);
    }
  });

  // ---------------------------------------------------------------------------
  // LIGHTS
  // ---------------------------------------------------------------------------
  def('lamp_floor', {
    name: 'Floor Lamp', price: 20, cat: 'light', place: 'floor', w: 54, h: 145,
    draw: function (ctx, o) {
      A.shadow(ctx, 2, -2, 22, 6);
      A.glow(ctx, 0, -112, 80 + Math.sin(o.t * 2) * 3, C.lampGlow, 0.38);
      A.ellipse(ctx, 0, -5, 18, 6, C.woodDark, 3);
      A.box(ctx, -3, -112, 6, 106, 3, C.woodDark, 2.5);
      var b = function (c) { c.moveTo(-17, -144); c.lineTo(17, -144); c.lineTo(26, -108); c.quadraticCurveTo(0, -102, -26, -108); c.closePath(); };
      A.shape(ctx, b, '#ffe9a8', 3);
      shadeIn(ctx, b, 6, -150, 30, 50, 0.16);
      shadeIn(ctx, b, -30, -116, 60, 6, 0, 'rgba(255,170,90,0.6)');
      restroke(ctx, b);
      for (var i = 0; i < 5; i++) A.circle(ctx, -20 + i * 10, -105 + (i === 0 || i === 4 ? -1 : 1), 2.5, C.red, 1.5);
      A.ellipse(ctx, 0, -144, 17, 4, '#fff6d2', 2.5);
      A.highlight(ctx, -10, -130, 3, 8, 0.6);
    }
  });
  def('lamp_aurora', {
    name: 'Aurora Lamp', price: 45, cat: 'light', place: 'floor', w: 64, h: 96,
    draw: function (ctx, o) {
      A.shadow(ctx, 2, -2, 28, 7);
      var h1 = (o.t * 35) % 360, h2 = (h1 + 90) % 360, h3 = (h1 + 200) % 360;
      A.glow(ctx, 0, -54, 78, 'hsla(' + h1 + ',90%,70%,', 0.4);
      // orb
      ctx.save(); ctx.beginPath(); ctx.arc(0, -54, 30, 0, TAU); ctx.clip();
      var g = ctx.createLinearGradient(0, -84, 0, -24);
      g.addColorStop(0, '#22407e'); g.addColorStop(1, '#3d5ea8'); ctx.fillStyle = g; ctx.fillRect(-32, -86, 64, 64);
      [[h1, -66], [h2, -56], [h3, -46]].forEach(function (b, k) {
        ctx.beginPath();
        for (var i = 0; i <= 12; i++) { var x = -32 + i * 64 / 12, y = b[1] + Math.sin(i * 0.7 + o.t * 1.4 + k * 2) * 5; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        for (var j = 12; j >= 0; j--) { ctx.lineTo(-32 + j * 64 / 12, b[1] + 10 + Math.sin(j * 0.7 + o.t * 1.4 + k * 2 + 0.8) * 4); }
        ctx.closePath(); ctx.fillStyle = 'hsla(' + b[0] + ',95%,72%,0.75)'; ctx.fill();
      });
      for (var s = 0; s < 6; s++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(o.t * 3 + s)) + ')'; ctx.beginPath(); ctx.arc(-18 + s * 7, -76 + (s % 3) * 5, 1.4, 0, TAU); ctx.fill(); }
      ctx.restore();
      A.circle(ctx, 0, -54, 30, null, 3);
      A.highlight(ctx, -12, -68, 6, 10, 0.55);
      // base
      A.shape(ctx, function (c) { c.moveTo(-18, -28); c.lineTo(18, -28); c.lineTo(24, 0); c.quadraticCurveTo(0, 3, -24, 0); c.closePath(); }, C.wood, 3);
      shadeIn(ctx, function (c) { c.moveTo(-18, -28); c.lineTo(18, -28); c.lineTo(24, 0); c.quadraticCurveTo(0, 3, -24, 0); c.closePath(); }, 6, -30, 24, 34, 0.2);
      A.ellipse(ctx, 0, -28, 18, 5, C.woodLight, 2.5);
      A.snowflake(ctx, 0, -12, 6, C.woodLight, 2);
    }
  });
  def('lantern', {
    name: 'Little Lantern', price: 12, cat: 'light', place: 'floor', w: 38, h: 60,
    draw: function (ctx, o) {
      A.shadow(ctx, 1, -2, 18, 5);
      var fl = Math.sin(o.t * 9) * 0.5 + Math.sin(o.t * 5.3) * 0.5;
      A.glow(ctx, 0, -28, 46 + fl * 3, C.lampGlow, 0.45);
      A.circle(ctx, 0, -58, 6, null, 3, OUT);
      A.box(ctx, -15, -6, 30, 7, 3, C.redDark, 2.5);
      A.box(ctx, -13, -44, 26, 39, 4, '#fff2c0', 3);
      ctx.save(); ctx.beginPath(); A.rrect(ctx, -13, -44, 26, 39, 4); ctx.clip();
      var fg = ctx.createRadialGradient(0, -22, 1, 0, -22, 18); fg.addColorStop(0, '#fff7d6'); fg.addColorStop(1, '#ffc35a');
      ctx.fillStyle = fg; ctx.fillRect(-14, -45, 28, 42); ctx.restore();
      A.shape(ctx, function (c) { c.moveTo(0, -34 - fl * 2); c.quadraticCurveTo(6, -24, 0, -16); c.quadraticCurveTo(-6, -24, 0, -34 - fl * 2); }, C.orange, 1.5, C.redDark);
      A.ellipse(ctx, 0, -21, 2.5, 4, '#fff5c2', 0);
      A.box(ctx, -1.5, -16, 3, 10, 1, '#fff', 1.2);
      A.line(ctx, [-6, -44, -6, -6], 2.5, C.redDark); A.line(ctx, [6, -44, 6, -6], 2.5, C.redDark);
      A.box(ctx, -13, -44, 26, 39, 4, null, 3);
      A.poly(ctx, [-17, -44, 17, -44, 8, -54, -8, -54], C.red, 3);
      A.highlight(ctx, -8, -36, 2, 5, 0.6);
    }
  });
  def('fireplace', {
    name: 'Fireplace', price: 150, cat: 'light', place: 'floor', w: 160, h: 150,
    draw: function (ctx, o) {
      var t = o.t;
      A.shadow(ctx, 3, -2, 86, 12);
      A.glow(ctx, 0, -36, 135 + Math.sin(t * 3) * 6, 'rgba(255,170,80,', 0.32);
      // stone body
      var body = rr(-74, -132, 148, 132, 8);
      A.shape(ctx, body, '#a8b4cc', 3);
      ctx.save(); ctx.beginPath(); body(ctx); ctx.clip();
      var rnd = seededRnd(5);
      for (var row = 0; row < 7; row++) {
        for (var k = 0; k < 6; k++) {
          var sx = -80 + k * 30 + (row % 2) * 15 + rnd() * 4, sy = -126 + row * 19;
          A.ellipse(ctx, sx, sy, 13 + rnd() * 3, 8, rnd() < 0.35 ? '#c1cbe0' : (rnd() < 0.5 ? '#97a4c0' : '#b3bed5'), 2, 'rgba(38,50,77,0.55)');
        }
      }
      ctx.fillStyle = 'rgba(29,43,82,0.16)'; ctx.fillRect(48, -140, 40, 150);
      ctx.restore();
      restroke(ctx, body);
      // opening
      var op = function (c) { c.moveTo(-42, -4); c.lineTo(-42, -52); c.arc(0, -52, 42, PI, 0); c.lineTo(42, -4); c.closePath(); };
      ctx.beginPath(); op(ctx);
      var ig = ctx.createLinearGradient(0, -94, 0, 0); ig.addColorStop(0, '#2d2140'); ig.addColorStop(1, '#5a2f30');
      A.fs(ctx, ig, 3);
      ctx.save(); ctx.beginPath(); op(ctx); ctx.clip();
      A.glow(ctx, 0, -14, 60, 'rgba(255,150,60,', 0.6 + 0.1 * Math.sin(t * 5));
      // logs
      A.box(ctx, -32, -18, 64, 12, 6, C.woodDark, 2.5); ctx.save(); ctx.translate(0, -18); ctx.rotate(0.18); A.box(ctx, -30, -6, 60, 11, 5, C.wood, 2.5); A.ellipse(ctx, 27, -0.5, 4, 5, C.woodLight, 2); ctx.restore();
      // flames
      var layers = [[C.red, 1, 30], [C.orange, 0.78, 22], [C.yellow, 0.55, 15], ['#fff6cf', 0.3, 8]];
      layers.forEach(function (L, li) {
        ctx.beginPath(); ctx.moveTo(-L[2] - 6, -12);
        var n = 3;
        for (var i = 0; i < n; i++) {
          var fx = -L[2] + (i + 0.5) * (2 * L[2] / n), fh = (46 + 10 * Math.sin(t * 6 + i * 2.1 + li)) * L[1];
          ctx.quadraticCurveTo(fx - L[2] / n, -12 - fh * 0.5, fx + Math.sin(t * 4 + i) * 3, -12 - fh);
          ctx.quadraticCurveTo(fx + L[2] / n * 0.2, -12 - fh * 0.45, fx + L[2] / n, -14);
        }
        ctx.lineTo(L[2] + 6, -12); ctx.closePath();
        ctx.fillStyle = L[0]; ctx.fill();
      });
      for (var e = 0; e < 4; e++) {
        var ph = (t * 0.7 + e * 0.27) % 1;
        ctx.fillStyle = 'rgba(255,210,120,' + (1 - ph) + ')';
        ctx.beginPath(); ctx.arc(-16 + e * 11 + Math.sin(t * 3 + e) * 4, -20 - ph * 60, 2, 0, TAU); ctx.fill();
      }
      ctx.restore();
      ctx.beginPath(); op(ctx); A.fs(ctx, null, 3);
      // hearth
      A.box(ctx, -60, -8, 120, 10, 4, '#7d89a8', 3);
      // mantle
      cube(ctx, -84, -138, 168, 12, 8, C.wood, C.woodLight, 5);
      shadeIn(ctx, rr(-84, -138, 168, 12, 5), -84, -132, 168, 8, 0.2); restroke(ctx, rr(-84, -138, 168, 12, 5));
      // candle + mug on mantle, stocking
      A.box(ctx, -66, -164, 10, 22, 3, '#fff', 2.5); A.ellipse(ctx, -61, -170 - Math.sin(t * 8), 3, 5, C.orange, 1.5);
      A.glow(ctx, -61, -170, 18, C.lampGlow, 0.5);
      A.mug(ctx, 52, -146, 0.5, C.blue, 'marsh');
      A.shape(ctx, function (c) { c.moveTo(-20, -126); c.lineTo(-4, -126); c.lineTo(-4, -98); c.quadraticCurveTo(-4, -88, 6, -88); c.lineTo(8, -88); c.quadraticCurveTo(14, -88, 14, -82); c.quadraticCurveTo(14, -76, 6, -76); c.lineTo(-10, -76); c.quadraticCurveTo(-20, -76, -20, -88); c.closePath(); }, C.red, 2.5);
      A.box(ctx, -22, -130, 20, 9, 3, '#fff', 2.5);
      A.highlight(ctx, -60, -110, 6, 3, 0.4);
    }
  });

  // ---------------------------------------------------------------------------
  // TOYS
  // ---------------------------------------------------------------------------
  def('teddy_bear', {
    name: 'Polar Plush', price: 20, cat: 'toy', place: 'floor', w: 52, h: 64,
    draw: function (ctx, o) {
      A.shadow(ctx, 2, -2, 26, 6);
      var fur = '#fbf8f1', pad = '#ffc1cf';
      // arms behind
      A.ellipse(ctx, -17, -26, 7, 11, fur, 3, OUT, 0.5);
      // body
      A.ellipse(ctx, 0, -22, 18, 20, fur, 3);
      shadeShape(ctx, el(0, -22, 18, 20), el(14, -16, 14, 22), 0.12);
      restroke(ctx, el(0, -22, 18, 20));
      A.ellipse(ctx, 0, -18, 10, 11, '#f0e9dc', 0);
      A.line(ctx, [-4, -24, 4, -20], 1.4, 'rgba(38,50,77,0.5)'); A.line(ctx, [-4, -20, 4, -24], 1.4, 'rgba(38,50,77,0.5)');
      // legs
      A.ellipse(ctx, -12, -6, 10, 8, fur, 3); A.ellipse(ctx, -12, -6, 5, 4, pad, 0);
      A.ellipse(ctx, 12, -6, 10, 8, fur, 3); A.ellipse(ctx, 12, -6, 5, 4, pad, 0);
      A.ellipse(ctx, 18, -26, 7, 11, fur, 3, OUT, -0.5);
      // head
      A.circle(ctx, -11, -56, 6, fur, 3); A.circle(ctx, -11, -56, 3, pad, 0);
      A.circle(ctx, 11, -56, 6, fur, 3); A.circle(ctx, 11, -56, 3, pad, 0);
      A.circle(ctx, 0, -45, 15, fur, 3);
      shadeShape(ctx, el(0, -45, 15, 15), el(12, -42, 9, 16), 0.12); restroke(ctx, el(0, -45, 15, 15));
      A.ellipse(ctx, 0, -40, 7.5, 5.5, '#fff', 2);
      A.ellipse(ctx, 0, -42, 3, 2, OUT, 0);
      A.line(ctx, [0, -40, 0, -37, -2, -36], 1.4); A.line(ctx, [0, -37, 2, -36], 1.4);
      A.circle(ctx, -6, -48, 2.2, OUT, 0); A.circle(ctx, 6, -48, 2.2, OUT, 0);
      A.circle(ctx, -5.4, -48.8, 0.8, '#fff', 0); A.circle(ctx, 6.6, -48.8, 0.8, '#fff', 0);
      ctx.save(); ctx.fillStyle = 'rgba(255,130,160,0.35)'; ctx.beginPath(); ctx.ellipse(-10, -42, 3, 2, 0, 0, TAU); ctx.ellipse(10, -42, 3, 2, 0, 0, TAU); ctx.fill(); ctx.restore();
      // bow
      A.poly(ctx, [0, -31, -10, -36, -10, -26], C.blue, 2); A.poly(ctx, [0, -31, 10, -36, 10, -26], C.blue, 2); A.circle(ctx, 0, -31, 3, lt(C.blue, 0.3), 2);
      A.highlight(ctx, -6, -54, 4, 2.5, 0.8);
    }
  });
  def('toy_sled', {
    name: 'Toy Sled', price: 30, cat: 'toy', place: 'floor', w: 96, h: 46,
    draw: function (ctx) {
      A.shadow(ctx, 0, -2, 48, 7);
      // rope
      ctx.beginPath(); ctx.moveTo(44, -28); ctx.bezierCurveTo(56, -10, 28, -2, 14, -6); ctx.lineWidth = 4.5; ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 2.2; ctx.strokeStyle = '#f2d39b'; ctx.stroke();
      // back runner
      A.line(ctx, [-42, -10, 30, -10, 40, -14, 44, -24, 38, -30], 7, OUT); A.line(ctx, [-42, -10, 30, -10, 40, -14, 44, -24, 38, -30], 3, C.stoneDark);
      // posts
      [-30, -6, 18].forEach(function (x) { A.box(ctx, x, -24, 6, 16, 2, C.woodDark, 2); });
      // deck
      cube(ctx, -46, -30, 86, 9, 10, C.red, lt(C.red, 0.2), 4);
      A.line(ctx, [-18, -40, -18, -32], 2, 'rgba(38,50,77,0.45)'); A.line(ctx, [10, -40, 10, -32], 2, 'rgba(38,50,77,0.45)');
      shadeIn(ctx, rr(-46, -30, 86, 9, 4), -46, -26, 90, 6, 0.2); restroke(ctx, rr(-46, -30, 86, 9, 4));
      // front runner
      A.line(ctx, [-46, -2, 34, -2, 46, -6, 50, -18, 42, -24], 8, OUT); A.line(ctx, [-46, -2, 34, -2, 46, -6, 50, -18, 42, -24], 4, '#c6d2ea');
      [-36, -10, 16].forEach(function (x) { A.box(ctx, x, -22, 6, 18, 2, C.wood, 2); });
      A.star(ctx, -14, -36, 5, C.yellow, 1.5);
      A.highlight(ctx, -34, -37, 7, 2, 0.5);
    }
  });
  def('drum', {
    name: 'Toy Drum', price: 40, cat: 'toy', place: 'floor', w: 62, h: 60,
    draw: function (ctx) {
      A.shadow(ctx, 2, -2, 32, 7);
      var body = function (c) { c.moveTo(-27, -46); c.lineTo(-27, -8); c.ellipse(0, -8, 27, 9, 0, PI, 0, true); c.lineTo(27, -46); c.closePath(); };
      A.shape(ctx, body, C.red, 3);
      ctx.save(); ctx.beginPath(); body(ctx); ctx.clip();
      ctx.beginPath();
      for (var i = 0; i <= 8; i++) { var x = -27 + i * 54 / 8, y = i % 2 ? -14 : -38; if (i) ctx.lineTo(x, y + Math.abs(x) * 0.12); else ctx.moveTo(x, y); }
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff1b8'; ctx.stroke();
      ctx.fillStyle = 'rgba(29,43,82,0.2)'; ctx.fillRect(12, -60, 20, 60);
      ctx.restore();
      restroke(ctx, body);
      A.shape(ctx, function (c) { c.ellipse(0, -8, 27, 9, 0, 0, PI); c.lineTo(-27, -14); c.ellipse(0, -14, 27, 9, 0, PI, 0, true); c.closePath(); }, C.blue, 2.5);
      A.ellipse(ctx, 0, -46, 27, 9, C.blue, 3);
      A.ellipse(ctx, 0, -47, 22, 6.5, C.cream, 2);
      A.highlight(ctx, -9, -49, 7, 2, 0.6);
      // sticks
      A.line(ctx, [-24, -66, 8, -50], 6, OUT); A.line(ctx, [-24, -66, 8, -50], 3, C.woodLight); A.circle(ctx, -24, -66, 4, C.yellow, 2);
      A.line(ctx, [24, -68, -6, -51], 6, OUT); A.line(ctx, [24, -68, -6, -51], 3, C.woodLight); A.circle(ctx, 24, -68, 4, C.yellow, 2);
    }
  });
  def('rocking_seal', {
    name: 'Rocking Seal', price: 55, cat: 'toy', place: 'floor', w: 118, h: 84,
    draw: function (ctx, o) {
      A.shadow(ctx, 0, -2, 50, 7);
      var a = Math.sin(o.t * 1.6) * 0.07;
      ctx.save(); ctx.translate(0, -110); ctx.rotate(a); ctx.translate(0, 110);
      // rocker
      var rk = function (c) { c.moveTo(-52, -18); c.quadraticCurveTo(0, 14, 52, -18); c.quadraticCurveTo(54, -10, 48, -10); c.quadraticCurveTo(0, 18, -48, -10); c.quadraticCurveTo(-54, -10, -52, -18); c.closePath(); };
      A.shape(ctx, rk, C.wood, 3);
      A.box(ctx, -26, -24, 7, 18, 2, C.woodDark, 2); A.box(ctx, 18, -24, 7, 18, 2, C.woodDark, 2);
      // seal
      var sc = '#9fb4d6';
      var b = function (c) {
        c.moveTo(-46, -36); c.quadraticCurveTo(-30, -26, -6, -22); c.quadraticCurveTo(26, -18, 36, -36);
        c.quadraticCurveTo(46, -58, 30, -72); c.quadraticCurveTo(16, -82, 6, -66);
        c.quadraticCurveTo(-6, -48, -24, -44); c.quadraticCurveTo(-38, -42, -46, -36); c.closePath();
      };
      // tail flippers
      A.poly(ctx, [-44, -36, -56, -48, -50, -36, -58, -28], dk(sc, 0.15), 2.5);
      A.shape(ctx, b, sc, 3);
      shadeShape(ctx, b, function (c) { c.ellipse(4, -16, 50, 12, 0, 0, TAU); }, 0.18);
      restroke(ctx, b);
      A.ellipse(ctx, 6, -26, 9, 5, dk(sc, 0.2), 2.5, OUT, 0.4);
      // saddle
      A.box(ctx, -22, -52, 24, 12, 6, C.red, 2.5); A.ellipse(ctx, -10, -52, 12, 4, lt(C.red, 0.25), 2);
      // face
      A.circle(ctx, 22, -66, 2.8, OUT, 0); A.circle(ctx, 22.8, -67, 1, '#fff', 0);
      A.ellipse(ctx, 34, -62, 4, 3, OUT, 0);
      A.line(ctx, [36, -58, 44, -58], 1.3); A.line(ctx, [36, -56, 43, -54], 1.3);
      ctx.save(); ctx.fillStyle = 'rgba(255,130,160,0.4)'; ctx.beginPath(); ctx.ellipse(26, -58, 4, 2.5, 0, 0, TAU); ctx.fill(); ctx.restore();
      // handle peg
      A.line(ctx, [8, -72, 0, -80], 6, OUT); A.line(ctx, [8, -72, 0, -80], 2.5, C.yellow);
      A.highlight(ctx, 14, -74, 5, 3, 0.6);
      ctx.restore();
    }
  });
  def('telescope', {
    name: 'Star Telescope', price: 90, cat: 'toy', place: 'floor', w: 80, h: 116,
    draw: function (ctx, o) {
      A.shadow(ctx, 0, -2, 34, 7);
      // tripod
      A.line(ctx, [0, -56, -28, -2], 7, OUT); A.line(ctx, [0, -56, -28, -2], 3.5, C.woodDark);
      A.line(ctx, [0, -56, 6, -6], 7, OUT); A.line(ctx, [0, -56, 6, -6], 3.5, C.wood);
      A.line(ctx, [0, -56, 28, -2], 7, OUT); A.line(ctx, [0, -56, 28, -2], 3.5, C.wood);
      A.circle(ctx, 0, -58, 7, C.coinDark, 2.5);
      // tube
      ctx.save(); ctx.translate(0, -64); ctx.rotate(-0.62);
      A.box(ctx, -40, -6, 18, 12, 3, C.stoneDark, 2.5);
      var tube = function (c) { c.moveTo(-26, -9); c.lineTo(36, -13); c.lineTo(36, 13); c.lineTo(-26, 9); c.closePath(); };
      A.shape(ctx, tube, '#3f5ea8', 3);
      shadeIn(ctx, tube, -30, 2, 70, 14, 0.25); restroke(ctx, tube);
      A.box(ctx, -4, -11, 6, 22, 1, C.coin, 2); A.box(ctx, 34, -16, 10, 32, 4, C.coin, 2.5);
      A.ellipse(ctx, 44, 0, 3, 14, '#bfe3ff', 2);
      A.star(ctx, 14, 0, 5, C.yellow, 1.5);
      A.highlight(ctx, 8, -6, 14, 2, 0.45);
      ctx.restore();
      var tw = 0.5 + 0.5 * Math.sin(o.t * 2.5);
      A.sparkle(ctx, 40, -112, 6, tw); A.sparkle(ctx, 26, -118, 3.5, 1 - tw);
    }
  });
  def('piano', {
    name: 'Piano', price: 200, cat: 'toy', place: 'floor', w: 150, h: 126,
    draw: function (ctx, o) {
      A.shadow(ctx, 3, -2, 80, 11);
      var col = '#7c3d4c', cl = lt(col, 0.18);
      // body
      cube(ctx, -70, -118, 140, 112, 10, col, cl, 7);
      A.box(ctx, -58, -38, 116, 30, 5, dk(col, 0.12), 2.5);
      A.heart(ctx, 0, -22, 6, '#e0a06b', 1.5);
      // music stand + sheet
      A.box(ctx, -30, -106, 60, 30, 3, '#fff8e6', 2.5);
      for (var l = 0; l < 4; l++) A.line(ctx, [-24, -100 + l * 6, 24, -100 + l * 6], 1, '#b7a99a');
      note(ctx, -12, -84, 0.55, OUT, 1); note(ctx, 8, -90, 0.55, OUT, 1);
      // keys
      A.box(ctx, -74, -70, 148, 12, 4, dk(col, 0.08), 3);
      A.box(ctx, -66, -62, 132, 18, 3, '#fff', 2.5);
      for (var k = 1; k < 14; k++) A.line(ctx, [-66 + k * 132 / 14, -61, -66 + k * 132 / 14, -45], 1.3, '#9aa6bd');
      [1, 2, 4, 5, 6, 8, 9, 11, 12, 13].forEach(function (k) { A.box(ctx, -66 + k * 132 / 14 - 3, -62, 6, 10, 1, OUT, 0); });
      A.box(ctx, -74, -46, 148, 8, 3, col, 3);
      // legs + pedals
      A.box(ctx, -68, -40, 10, 40, 3, col, 2.5); A.box(ctx, 58, -40, 10, 40, 3, col, 2.5);
      A.box(ctx, -12, -8, 8, 5, 2, C.coin, 1.5); A.box(ctx, 4, -8, 8, 5, 2, C.coin, 1.5);
      shadeIn(ctx, rr(-70, -118, 140, 112, 7), 52, -126, 30, 130, 0.2);
      A.highlight(ctx, -56, -110, 12, 3, 0.35);
      // floating note
      var ph = (o.t * 0.5) % 1;
      note(ctx, 62 + Math.sin(ph * 6) * 5, -128 - ph * 36, 0.8, C.pink, Math.sin(ph * PI));
    }
  });
  def('snowman', {
    name: 'Mini Snowman', price: 25, cat: 'toy', place: 'floor', w: 64, h: 100,
    draw: function (ctx, o) {
      A.shadow(ctx, 2, -2, 30, 7);
      A.ellipse(ctx, 0, -5, 29, 8, '#7fc6e8', 3); A.ellipse(ctx, 0, -7, 22, 5, '#c4ebf7', 0);
      function ball(y, r) {
        A.circle(ctx, 0, y, r, C.snow, 3);
        shadeShape(ctx, el(0, y, r, r), el(r * 0.55, y + r * 0.2, r * 0.7, r * 1.1), 0.13);
        restroke(ctx, el(0, y, r, r));
      }
      ball(-26, 21); ball(-56, 16);
      A.circle(ctx, 0, -33, 2.4, OUT, 0); A.circle(ctx, 0, -22, 2.4, OUT, 0);
      // arms
      A.line(ctx, [-14, -58, -32, -70, -36, -78], 3, C.woodDark); A.line(ctx, [-32, -70, -40, -70], 2.5, C.woodDark);
      A.line(ctx, [14, -58, 32, -66, 38, -60], 3, C.woodDark);
      ball(-82, 13);
      A.circle(ctx, -4.5, -84, 2.2, OUT, 0); A.circle(ctx, 4.5, -84, 2.2, OUT, 0);
      A.poly(ctx, [0, -80, 14, -77, 0, -76], C.orange, 1.8);
      A.line(ctx, [-4, -74, 0, -72.5, 4, -74], 1.6);
      ctx.save(); ctx.fillStyle = 'rgba(255,130,160,0.4)'; ctx.beginPath(); ctx.ellipse(-8, -78, 3, 2, 0, 0, TAU); ctx.ellipse(8, -78, 3, 2, 0, 0, TAU); ctx.fill(); ctx.restore();
      // scarf + beanie
      A.box(ctx, -14, -71, 28, 7, 3.5, C.red, 2.5); A.box(ctx, 4, -68, 7, 16, 3, C.red, 2.5);
      A.shape(ctx, function (c) { c.moveTo(-12, -90); c.quadraticCurveTo(-12, -104, 0, -104); c.quadraticCurveTo(12, -104, 12, -90); c.closePath(); }, C.blue, 2.5);
      A.box(ctx, -14, -93, 28, 6, 3, '#fff', 2); A.circle(ctx, 0, -106, 4.5, '#fff', 2);
      A.highlight(ctx, -8, -34, 6, 4, 0.7);
      var ph = (o.t * 0.4) % 1;
      ctx.globalAlpha = Math.sin(ph * PI); A.snowflake(ctx, -22 + Math.sin(ph * 5) * 4, -104 + ph * 30, 5, '#8fd0ea', 1.6); ctx.globalAlpha = 1;
      A.sparkle(ctx, 22, -96, 4, 0.5 + 0.5 * Math.sin(o.t * 3));
    }
  });
  def('book_stack', {
    name: 'Book Stack', price: 10, cat: 'decor', place: 'floor', w: 52, h: 48,
    draw: function (ctx) {
      A.shadow(ctx, 1, -2, 28, 6);
      var books = [[-24, 46, C.blue], [-20, 40, C.red], [-23, 44, C.green], [-18, 36, C.yellow]];
      var y = 0;
      books.forEach(function (b, i) {
        var h = 10;
        A.box(ctx, b[0], y - h, b[1], h, 2.5, b[2], 2.5);
        A.box(ctx, b[0] + b[1] - 9, y - h + 2, 7, h - 4, 1, C.cream, 1.5);
        A.line(ctx, [b[0] + 5, y - h + 3, b[0] + 5, y - 3], 1.5, 'rgba(255,255,255,0.7)');
        y -= h;
      });
      // open book on top
      A.shape(ctx, function (c) { c.moveTo(-18, y - 2); c.quadraticCurveTo(-8, y - 10, 0, y - 4); c.quadraticCurveTo(8, y - 10, 18, y - 2); c.lineTo(18, y + 1); c.lineTo(-18, y + 1); c.closePath(); }, '#fff', 2.5);
      A.line(ctx, [0, y - 4, 0, y + 1], 1.5);
      A.line(ctx, [4, y - 4, 4, y + 8], 3, C.pink);
    }
  });

  // ---------------------------------------------------------------------------
  // PLANTS
  // ---------------------------------------------------------------------------
  def('plant_fern', {
    name: 'Fern', price: 15, cat: 'plant', place: 'floor', w: 66, h: 84,
    draw: function (ctx, o) {
      A.shadow(ctx, 2, -2, 22, 6);
      var sw = Math.sin(o.t * 1.2) * 0.03;
      var lv = [[-1.25, 44, C.greenDark], [1.2, 44, C.greenDark], [-0.85, 54, C.green], [0.8, 52, C.green], [-0.4, 60, C.pine], [0.35, 58, '#4aa85a'], [0, 62, C.green]];
      lv.forEach(function (l, i) {
        ctx.save(); ctx.translate(0, -30); ctx.rotate(l[0] + sw * (i % 2 ? 1 : -1));
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (var k = 0; k <= 6; k++) { var yy = -k * l[1] / 6, ww = 9 * Math.sin((k / 6) * PI * 0.95 + 0.15); ctx.quadraticCurveTo(ww + 4, yy - 3, ww * 0.4, yy - l[1] / 12); }
        ctx.lineTo(0, -l[1]);
        for (var k2 = 6; k2 >= 0; k2--) { var y2 = -k2 * l[1] / 6, w2 = 9 * Math.sin((k2 / 6) * PI * 0.95 + 0.15); ctx.quadraticCurveTo(-w2 - 4, y2 - 3, -w2 * 0.4, y2 + l[1] / 12); }
        ctx.closePath(); A.fs(ctx, l[2], 2.5);
        A.line(ctx, [0, -2, 0, -l[1] * 0.85], 1.4, 'rgba(20,60,50,0.5)');
        ctx.restore();
      });
      pot(ctx, 34, 28, '#d9774a', 'rgba(255,255,255,0.35)');
      soil(ctx, 34, 28);
    }
  });
  def('plant_flower', {
    name: 'Flower Pot', price: 15, cat: 'plant', place: 'floor', w: 54, h: 80,
    draw: function (ctx, o) {
      A.shadow(ctx, 2, -2, 20, 6);
      var sw = Math.sin(o.t * 1.4) * 0.04;
      leaf(ctx, -2, -30, 26, 9, -0.9, C.green); leaf(ctx, 2, -30, 26, 9, 0.9, C.greenDark);
      var fl = [[-14, -62, C.pink, -0.2], [12, -66, C.yellow, 0.2], [0, -78, C.purple, 0]];
      fl.forEach(function (f, i) {
        A.line(ctx, [0, -30, f[0] * 0.6, (f[1] - 30) / 2, f[0], f[1]], 5.5, OUT); A.line(ctx, [0, -30, f[0] * 0.6, (f[1] - 30) / 2, f[0], f[1]], 2.5, C.greenDark);
        ctx.save(); ctx.translate(f[0], f[1]); ctx.rotate(f[3] + sw * (i - 1));
        for (var p = 0; p < 5; p++) { var a = p * TAU / 5; A.ellipse(ctx, Math.cos(a) * 7, Math.sin(a) * 7, 6, 5, f[2], 2, OUT, a); }
        A.circle(ctx, 0, 0, 4.5, i === 1 ? C.orange : C.yellow, 2);
        A.highlight(ctx, -5, -6, 2, 1.5, 0.7);
        ctx.restore();
      });
      pot(ctx, 30, 26, C.blue, 'rgba(255,255,255,0.4)');
      soil(ctx, 30, 26);
    }
  });
  def('plant_cactus', {
    name: 'Cactus', price: 20, cat: 'plant', place: 'floor', w: 50, h: 82,
    draw: function (ctx) {
      A.shadow(ctx, 2, -2, 18, 5);
      var g = '#58b46a';
      A.shape(ctx, function (c) { c.moveTo(-10, -42); c.lineTo(-18, -42); c.quadraticCurveTo(-24, -42, -24, -48); c.lineTo(-24, -58); c.quadraticCurveTo(-24, -64, -19, -64); c.quadraticCurveTo(-14, -64, -14, -58); c.lineTo(-14, -52); c.lineTo(-10, -52); c.closePath(); }, g, 3);
      A.shape(ctx, function (c) { c.moveTo(10, -50); c.lineTo(17, -50); c.quadraticCurveTo(22, -50, 22, -56); c.lineTo(22, -64); c.quadraticCurveTo(22, -69, 17.5, -69); c.quadraticCurveTo(13, -69, 13, -64); c.lineTo(13, -59); c.lineTo(10, -59); c.closePath(); }, g, 3);
      var b = rr(-12, -78, 24, 60, 12);
      A.shape(ctx, b, g, 3);
      shadeIn(ctx, b, 3, -80, 12, 64, 0.2); restroke(ctx, b);
      A.line(ctx, [-4, -70, -4, -24], 1.5, 'rgba(20,70,40,0.45)'); A.line(ctx, [4, -70, 4, -24], 1.5, 'rgba(20,70,40,0.45)');
      [[-8, -60], [0, -48], [8, -66], [-8, -36], [8, -40], [0, -30]].forEach(function (p) { A.line(ctx, [p[0] - 1.5, p[1], p[0] + 1.5, p[1] - 2], 1.3, '#fff'); });
      for (var p = 0; p < 5; p++) { var a = p * TAU / 5 - PI / 2; A.ellipse(ctx, Math.cos(a) * 4, -80 + Math.sin(a) * 4, 4, 3, C.pink, 1.5, OUT, a); }
      A.circle(ctx, 0, -80, 2.2, C.yellow, 0);
      A.highlight(ctx, -6, -64, 2, 6, 0.5);
      pot(ctx, 30, 22, C.yellow, C.orange);
      soil(ctx, 30, 22);
    }
  });
  def('ice_tree', {
    name: 'Crystal Tree', price: 65, cat: 'plant', place: 'floor', w: 84, h: 136,
    draw: function (ctx, o) {
      var t = o.t;
      A.shadow(ctx, 2, -2, 30, 7);
      A.glow(ctx, 0, -78, 70, 'rgba(150,230,255,', 0.35 + 0.08 * Math.sin(t * 1.5));
      // trunk
      A.poly(ctx, [-7, -24, 7, -24, 4, -66, -4, -66], C.iceMid, 2.5);
      A.poly(ctx, [0, -24, 7, -24, 4, -66, 1, -66], 'rgba(79,159,204,0.5)', 0);
      // crystal crown: shards
      var shards = [[0, -66, 64, 0, 13], [-6, -62, 46, -0.75, 10], [6, -62, 46, 0.75, 10], [-4, -70, 52, -0.35, 11], [4, -70, 52, 0.35, 11], [-8, -56, 32, -1.15, 8], [8, -56, 32, 1.15, 8]];
      var fills = ['#d8f6ff', '#aee6f7', '#c9f0ff', '#9fdcf2', '#e9fbff'];
      shards.slice().sort(function (a, b) { return Math.abs(b[3]) - Math.abs(a[3]); }).forEach(function (s, i) {
        ctx.save(); ctx.translate(s[0], s[1]); ctx.rotate(s[3]);
        var L = s[2], W = s[4];
        A.poly(ctx, [0, 0, W, -L * 0.35, 0, -L, -W, -L * 0.35], fills[i % fills.length], 2.5);
        A.poly(ctx, [0, 0, W, -L * 0.35, 0, -L], 'rgba(79,159,204,0.35)', 0);
        A.line(ctx, [0, -2, 0, -L + 3], 1.2, 'rgba(255,255,255,0.85)');
        ctx.restore();
      });
      // base: snowy ice pot
      A.shape(ctx, function (c) { c.moveTo(-22, -26); c.lineTo(22, -26); c.lineTo(16, -2); c.quadraticCurveTo(0, 2, -16, -2); c.closePath(); }, C.iceDeep, 3);
      A.ellipse(ctx, 0, -27, 24, 6, C.snow, 2.5);
      A.snowflake(ctx, 0, -13, 6, '#c4ebf7', 1.8);
      for (var k = 0; k < 5; k++) {
        var a = 0.5 + 0.5 * Math.sin(t * 3 + k * 1.7);
        A.sparkle(ctx, [-24, 18, -6, 26, 6][k], [-96, -112, -126, -74, -84][k], 4 + a * 3, a);
      }
    }
  });
  def('fish_tank', {
    name: 'Fish Tank', price: 80, cat: 'decor', place: 'floor', w: 116, h: 112,
    draw: function (ctx, o) {
      var t = o.t;
      A.shadow(ctx, 3, -2, 60, 9);
      // stand
      cube(ctx, -52, -40, 104, 40, 6, C.wood, C.woodLight, 5);
      A.line(ctx, [0, -36, 0, -4], 2.5); knob(ctx, -6, -20, 3); knob(ctx, 6, -20, 3);
      shadeIn(ctx, rr(-52, -40, 104, 40, 5), 30, -42, 26, 44, 0.18); restroke(ctx, rr(-52, -40, 104, 40, 5));
      // tank
      var tk = rr(-54, -108, 108, 64, 6);
      ctx.save(); ctx.beginPath(); tk(ctx); ctx.clip();
      var wg = ctx.createLinearGradient(0, -100, 0, -44); wg.addColorStop(0, '#8fdcf2'); wg.addColorStop(1, '#3f8fcf');
      ctx.fillStyle = 'rgba(220,245,255,0.6)'; ctx.fillRect(-56, -110, 112, 12);
      ctx.fillStyle = wg; ctx.fillRect(-56, -100, 112, 60);
      A.line(ctx, [-56, -100, 56, -100], 2, 'rgba(255,255,255,0.8)');
      // gravel
      var rnd = seededRnd(3), gc = ['#ff8fb1', '#ffcf4a', '#ffffff', '#8e6bd8', '#5dbb63'];
      for (var g = 0; g < 40; g++) A.circle(ctx, -54 + rnd() * 108, -48 + rnd() * 5, 2.5 + rnd(), gc[g % 5], 0);
      // seaweed
      [-38, -28, 36].forEach(function (sx, k) {
        ctx.beginPath(); ctx.moveTo(sx, -46);
        for (var s = 1; s <= 5; s++) ctx.lineTo(sx + Math.sin(t * 2 + s * 0.9 + k) * 4, -46 - s * 8);
        ctx.lineWidth = 5; ctx.strokeStyle = k === 1 ? C.greenDark : C.green; ctx.lineCap = 'round'; ctx.stroke();
      });
      // little castle
      A.box(ctx, 14, -66, 18, 20, 2, '#ffd3e1', 2); A.poly(ctx, [12, -66, 34, -66, 23, -78], C.pink, 2); A.box(ctx, 20, -56, 6, 10, 3, OUT, 0);
      // fish
      [[0, 'sunny', 0.6, -78], [2.4, 'rosy', 0.45, -62]].forEach(function (f) {
        var ph = t * f[2] + f[0], x = Math.sin(ph) * 30, dir = Math.cos(ph) >= 0 ? 1 : -1;
        ctx.save(); ctx.translate(x, f[3] + Math.sin(t * 2 + f[0]) * 3); ctx.scale(dir, 1); A.fish(ctx, 0, 0, 0.36, f[1], t); ctx.restore();
      });
      // bubbles
      for (var bb = 0; bb < 4; bb++) {
        var p = (t * 0.5 + bb * 0.25) % 1;
        A.circle(ctx, -14 + Math.sin(p * 9 + bb) * 3, -48 - p * 50, 2 + bb * 0.4, 'rgba(255,255,255,0.5)', 1.2, 'rgba(255,255,255,0.9)');
      }
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.moveTo(-40, -108); ctx.lineTo(-24, -108); ctx.lineTo(-48, -44); ctx.lineTo(-56, -44); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.beginPath(); tk(ctx); A.fs(ctx, null, 3);
      A.box(ctx, -56, -112, 112, 8, 3, '#3d4c6e', 2.5);
      A.box(ctx, -56, -48, 112, 8, 3, '#3d4c6e', 2.5);
    }
  });

  // ---------------------------------------------------------------------------
  // RUGS  (drawn flat; path built under the squash so outlines stay even)
  // ---------------------------------------------------------------------------
  function rugXform(ctx, rot) { ctx.scale(1, SQ); ctx.rotate((rot || 0) * PI / 2); }
  function rugPath(ctx, rot, build) { ctx.save(); rugXform(ctx, rot); ctx.beginPath(); build(ctx); ctx.restore(); }
  function rugFill(ctx, rot, build, fill, lw) { rugPath(ctx, rot, build); A.fs(ctx, fill, lw); }
  function rugPaint(ctx, rot, build, paint) { ctx.save(); rugPath(ctx, rot, build); ctx.clip(); rugXform(ctx, rot); paint(ctx); ctx.restore(); }
  function rugBase(ctx, rot, build, col) {
    ctx.save(); ctx.translate(0, 4); rugFill(ctx, rot, build, dk(col, 0.3), 3); ctx.restore();
    rugFill(ctx, rot, build, col, 3);
  }
  def('rug_round_blue', {
    name: 'Round Rug', price: 20, cat: 'rug', place: 'rug', w: 150, h: 68, rotate: true, round: true, flip: false,
    draw: function (ctx, o) {
      var b = function (c) { c.arc(0, 0, 75, 0, TAU); };
      rugBase(ctx, 0, b, C.blue);
      rugPaint(ctx, 0, b, function (c) {
        c.fillStyle = '#8fc0f5'; c.beginPath(); c.arc(0, 0, 60, 0, TAU); c.arc(0, 0, 48, 0, TAU, true); c.fill();
        c.fillStyle = lt(C.blue, 0.1); c.beginPath(); c.arc(0, 0, 40, 0, TAU); c.fill();
        c.fillStyle = '#fff'; for (var i = 0; i < 16; i++) { var a = i * TAU / 16; c.beginPath(); c.arc(Math.cos(a) * 68, Math.sin(a) * 68, 3, 0, TAU); c.fill(); }
        A.snowflake(c, 0, 0, 28, '#ffffff', 5);
        c.fillStyle = 'rgba(29,43,82,0.15)'; c.beginPath(); c.arc(0, 30, 80, 0, PI); c.fill();
      });
      rugFill(ctx, 0, b, null, 3);
      A.highlight(ctx, -36, -14, 14, 3, 0.25);
    }
  });
  def('rug_stripe', {
    name: 'Stripy Rug', price: 30, cat: 'rug', place: 'rug', w: 186, h: 54, rotate: true,
    draw: function (ctx, o) {
      var L = 170, S = 120, rot = o.rot || 0;
      var b = function (c) { A.rrect(c, -L / 2, -S / 2, L, S, 8); };
      // fringe
      ctx.save(); rugXform(ctx, rot);
      ctx.strokeStyle = C.cream; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (var i = 0; i < 12; i++) { var yy = -S / 2 + 8 + i * (S - 16) / 11; ctx.beginPath(); ctx.moveTo(-L / 2 - 8, yy); ctx.lineTo(L / 2 + 8, yy); ctx.stroke(); }
      ctx.restore();
      rugBase(ctx, rot, b, C.cream);
      rugPaint(ctx, rot, b, function (c) {
        var cols = [C.red, C.cream, C.teal, C.yellow, C.teal, C.cream, C.red];
        var sw = L / cols.length;
        cols.forEach(function (cc, k) { c.fillStyle = cc; c.fillRect(-L / 2 + k * sw, -S / 2, sw + 0.5, S); });
        c.fillStyle = '#fff'; for (var k = 0; k < 5; k++) { c.beginPath(); c.moveTo(0, -S / 2 + 12 + k * 24); c.lineTo(8, -S / 2 + 24 + k * 24); c.lineTo(0, -S / 2 + 36 + k * 24); c.lineTo(-8, -S / 2 + 24 + k * 24); c.fill(); }
      });
      rugFill(ctx, rot, b, null, 3);
    }
  });
  def('rug_star', {
    name: 'Star Rug', price: 40, cat: 'rug', place: 'rug', w: 160, h: 72, rotate: true, round: true,
    draw: function (ctx, o) {
      var rot = o.rot || 0;
      var starP = function (r, inner) { return function (c) { for (var i = 0; i < 10; i++) { var a = -PI / 2 + i * PI / 5, rr2 = i % 2 ? r * inner : r; if (i) c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2 + 6); else c.moveTo(Math.cos(a) * rr2, Math.sin(a) * rr2 + 6); } c.closePath(); }; };
      var b = starP(84, 0.52);
      rugBase(ctx, rot, b, C.yellow);
      rugPaint(ctx, rot, b, function (c) {
        c.fillStyle = C.orange; c.beginPath(); starP(56, 0.52)(c); c.fill();
        c.fillStyle = '#fff3b0'; c.beginPath(); starP(30, 0.52)(c); c.fill();
      });
      rugFill(ctx, rot, b, null, 3);
    }
  });
  def('rug_fish', {
    name: 'Fishy Rug', price: 35, cat: 'rug', place: 'rug', w: 180, h: 52, rotate: true,
    draw: function (ctx, o) {
      var rot = o.rot || 0;
      var b = function (c) {
        c.moveTo(-50, 0);
        c.bezierCurveTo(-30, -52, 60, -56, 86, 0);
        c.bezierCurveTo(60, 56, -30, 52, -50, 0);
        c.lineTo(-88, -40); c.quadraticCurveTo(-74, 0, -88, 40); c.closePath();
      };
      rugBase(ctx, rot, b, C.orange);
      rugPaint(ctx, rot, b, function (c) {
        c.fillStyle = '#ffd27a'; c.beginPath(); c.ellipse(20, 18, 56, 20, 0, 0, TAU); c.fill();
        c.fillStyle = '#e8792a'; [-12, 8].forEach(function (x) { c.beginPath(); c.ellipse(x, 0, 5, 44, 0, 0, TAU); c.fill(); });
        c.fillStyle = '#fff'; c.beginPath(); c.arc(56, -10, 11, 0, TAU); c.fill();
        c.fillStyle = OUT; c.beginPath(); c.arc(59, -10, 6, 0, TAU); c.fill();
        c.fillStyle = '#e8792a'; c.beginPath(); c.moveTo(-86, -30); c.lineTo(-62, 0); c.lineTo(-86, 30); c.fill();
      });
      rugFill(ctx, rot, b, null, 3);
    }
  });

  // ---------------------------------------------------------------------------
  // WALL ITEMS
  // ---------------------------------------------------------------------------
  def('pic_fish', {
    name: 'Fish Picture', price: 15, cat: 'wall', place: 'wall', w: 74, h: 62,
    draw: function (ctx, o) {
      var r = frameBox(ctx, 74, 62, C.woodLight);
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      ctx.fillStyle = '#bfe8f7'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#8fd0ea'; ctx.beginPath(); ctx.moveTo(r.x, r.y + r.h); ctx.quadraticCurveTo(0, r.y + r.h - 14, r.x + r.w, r.y + r.h - 4); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.fill();
      A.fish(ctx, -2, 2, 0.62, 'bluegill', o.t * 0.3);
      A.circle(ctx, 18, -10, 3, 'rgba(255,255,255,0.7)', 1.2); A.circle(ctx, 22, -17, 2, 'rgba(255,255,255,0.7)', 1.2);
      ctx.restore();
      A.box(ctx, r.x, r.y, r.w, r.h, 1, null, 2);
    }
  });
  def('pic_aurora', {
    name: 'Aurora Painting', price: 35, cat: 'wall', place: 'wall', w: 110, h: 76,
    draw: function (ctx, o) {
      var r = frameBox(ctx, 110, 76, C.coin, 10);
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      var g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, '#1a2f66'); g.addColorStop(1, '#4b69b3');
      ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.save(); ctx.translate(r.x, 0); A.aurora(ctx, r.w, r.y + 2, 34, o.t, 0.7); ctx.restore();
      ctx.fillStyle = '#fff'; [[-30, -22], [10, -24], [32, -16], [-10, -12]].forEach(function (s) { ctx.beginPath(); ctx.arc(s[0], s[1], 1.2, 0, TAU); ctx.fill(); });
      A.drift(ctx, -20, r.y + r.h + 2, 90, 22); A.drift(ctx, 30, r.y + r.h + 2, 70, 16);
      A.pine(ctx, 30, r.y + r.h - 6, 26);
      A.igloo(ctx, -18, r.y + r.h - 8, 0.13);
      ctx.restore();
      A.box(ctx, r.x, r.y, r.w, r.h, 1, null, 2);
      A.highlight(ctx, -44, -32, 6, 2, 0.6);
    }
  });
  def('wall_clock', {
    name: 'Wall Clock', price: 25, cat: 'wall', place: 'wall', w: 64, h: 96,
    draw: function (ctx, o) {
      var t = o.t;
      // pendulum
      var sw = Math.sin(t * 3) * 0.3;
      ctx.save(); ctx.translate(0, 10); ctx.rotate(sw);
      A.line(ctx, [0, 0, 0, 30], 5, OUT); A.line(ctx, [0, 0, 0, 30], 2, C.coinDark);
      A.circle(ctx, 0, 34, 7, C.coin, 2.5); A.highlight(ctx, -2, 32, 2, 1.5, 0.8);
      ctx.restore();
      A.circle(ctx, 0, -12, 30, C.red, 3);
      shadeShape(ctx, el(0, -12, 30, 30), el(18, -2, 22, 34), 0.18); restroke(ctx, el(0, -12, 30, 30));
      A.circle(ctx, 0, -12, 23, C.cream, 2.5);
      for (var i = 0; i < 12; i++) { var a = i * TAU / 12; A.circle(ctx, Math.cos(a) * 18, -12 + Math.sin(a) * 18, i % 3 ? 1.4 : 2.6, OUT, 0); }
      var mA = t * TAU / 60 - PI / 2, hA = t * TAU / 720 + 1.2;
      A.line(ctx, [0, -12, Math.cos(hA) * 10, -12 + Math.sin(hA) * 10], 3.5);
      A.line(ctx, [0, -12, Math.cos(mA) * 16, -12 + Math.sin(mA) * 16], 2.5, C.redDark);
      A.circle(ctx, 0, -12, 3, C.coin, 1.5);
      A.circle(ctx, -14, -42, 6, C.coin, 2.5); A.circle(ctx, 14, -42, 6, C.coin, 2.5);
      A.highlight(ctx, -12, -26, 6, 3, 0.6);
    }
  });
  def('wall_shelf', {
    name: 'Wall Shelf', price: 30, cat: 'wall', place: 'wall', w: 116, h: 60,
    draw: function (ctx) {
      // brackets
      A.poly(ctx, [-40, 14, -26, 14, -40, 30], C.woodDark, 2.5); A.poly(ctx, [40, 14, 26, 14, 40, 30], C.woodDark, 2.5);
      // items
      [[-46, 7, 22, C.purple], [-38, 7, 26, C.yellow], [-30, 8, 20, C.teal]].forEach(function (b) { A.box(ctx, b[0], 6 - b[2], b[1], b[2], 2, b[3], 2); });
      ctx.save(); ctx.translate(-18, 6); ctx.rotate(0.3); A.box(ctx, -1, -18, 7, 18, 2, C.red, 2); ctx.restore();
      A.mug(ctx, 4, 6, 0.48, C.pink, 'cream');
      ctx.save(); ctx.translate(36, 6);
      leaf(ctx, 0, -12, 18, 6, -0.6, C.green, 2); leaf(ctx, 0, -12, 18, 6, 0.6, C.greenDark, 2); leaf(ctx, 0, -12, 20, 6, 0, C.green, 2);
      pot(ctx, 18, 12, '#d9774a'); ctx.restore();
      // plank
      cube(ctx, -58, 8, 116, 9, 6, C.wood, C.woodLight, 4);
      shadeIn(ctx, rr(-58, 8, 116, 9, 4), -58, 12, 116, 6, 0.2); restroke(ctx, rr(-58, 8, 116, 9, 4));
    }
  });
  def('bunting', {
    name: 'Bunting', price: 15, cat: 'wall', place: 'wall', w: 170, h: 54,
    draw: function (ctx, o) {
      var cols = [C.red, C.yellow, C.teal, C.pink, C.blue, C.orange, C.purple];
      var sag = 16 + Math.sin(o.t * 1.2) * 1.5;
      function yAt(x) { var u = x / 80; return -18 + sag * (1 - u * u); }
      for (var i = 0; i < 7; i++) {
        var x0 = -72 + i * 21.5, x1 = x0 + 17, xm = (x0 + x1) / 2;
        var y0 = yAt(x0), y1 = yAt(x1), sway = Math.sin(o.t * 2 + i) * 1.5;
        A.poly(ctx, [x0, y0, x1, y1, xm + sway, (y0 + y1) / 2 + 24], cols[i], 2.5);
        ctx.save(); ctx.globalAlpha = 0.18; A.poly(ctx, [xm, (y0 + y1) / 2, x1, y1, xm + sway, (y0 + y1) / 2 + 24], '#1d2b52', 0); ctx.restore();
        A.circle(ctx, xm - 1, (y0 + y1) / 2 + 7, 2.5, 'rgba(255,255,255,0.75)', 0);
      }
      ctx.beginPath(); ctx.moveTo(-82, -18); for (var x = -80; x <= 82; x += 4) ctx.lineTo(x, yAt(x)); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
      A.circle(ctx, -82, -18, 4, C.coin, 2); A.circle(ctx, 82, -18, 4, C.coin, 2);
    }
  });
  def('wreath', {
    name: 'Wreath', price: 20, cat: 'wall', place: 'wall', w: 74, h: 80,
    draw: function (ctx) {
      A.circle(ctx, 0, -4, 30, null, 18, OUT);
      A.circle(ctx, 0, -4, 30, null, 13, C.greenDark);
      for (var i = 0; i < 18; i++) {
        var a = i * TAU / 18;
        leaf(ctx, Math.cos(a) * 30, -4 + Math.sin(a) * 30, 15, 6, a + (i % 2 ? 0.9 : 2.2), i % 2 ? C.green : C.pine, 1.8);
      }
      [[0.4, C.red], [1.6, C.red], [2.6, C.red], [3.6, C.red], [4.6, C.red], [5.6, C.red]].forEach(function (b, k) {
        A.circle(ctx, Math.cos(b[0]) * 30, -4 + Math.sin(b[0]) * 30, 3.5, k % 2 ? C.red : C.yellow, 1.5);
      });
      // bow
      A.poly(ctx, [0, 26, -10, 40, -4, 42], C.red, 2.2); A.poly(ctx, [0, 26, 10, 40, 4, 42], C.red, 2.2);
      A.ellipse(ctx, -10, 24, 10, 6, C.red, 2.5, OUT, 0.3); A.ellipse(ctx, 10, 24, 10, 6, C.red, 2.5, OUT, -0.3);
      A.circle(ctx, 0, 25, 4.5, C.redDark, 2);
      A.highlight(ctx, -12, 22, 3, 1.5, 0.7);
    }
  });
  def('wall_lights', {
    name: 'Twinkle Lights', price: 25, cat: 'wall', place: 'wall', w: 186, h: 44,
    draw: function (ctx, o) {
      var cols = ['255,90,90', '255,210,80', '90,220,160', '110,170,255', '255,140,200'];
      function yAt(x) { return -10 + Math.sin((x + 90) / 180 * PI * 2) * 6 + Math.abs(Math.sin((x + 90) / 180 * PI * 2)) * 4; }
      ctx.beginPath(); for (var x = -92; x <= 92; x += 3) { if (x === -92) ctx.moveTo(x, yAt(x)); else ctx.lineTo(x, yAt(x)); }
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#2f5a4d'; ctx.stroke();
      for (var i = 0; i < 10; i++) {
        var bx = -84 + i * 18.6, by = yAt(bx), c = cols[i % cols.length];
        var on = 0.55 + 0.45 * Math.sin(o.t * 3 + i * 1.9);
        A.glow(ctx, bx, by + 10, 18, 'rgba(' + c + ',', 0.55 * on);
        A.box(ctx, bx - 3, by - 1, 6, 5, 1, '#2f5a4d', 1.5);
        ctx.save(); ctx.translate(bx, by + 10); ctx.rotate(Math.sin(i * 2.3) * 0.25);
        A.ellipse(ctx, 0, 0, 5, 7, 'rgba(' + c + ',' + (0.55 + 0.45 * on) + ')', 2);
        A.ellipse(ctx, -1.5, -2.5, 1.5, 2.5, 'rgba(255,255,255,0.8)', 0);
        ctx.restore();
      }
      A.circle(ctx, -92, yAt(-92), 3, C.coin, 1.5); A.circle(ctx, 92, yAt(92), 3, C.coin, 1.5);
    }
  });

  // ---------------------------------------------------------------------------
  // PET STUFF
  // ---------------------------------------------------------------------------
  function paw(ctx, x, y, s, col) {
    ctx.save(); ctx.fillStyle = col; ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 2, 5, 4, 0, 0, TAU); ctx.fill();
    [[-5, -4], [-1.8, -7], [1.8, -7], [5, -4]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.9, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  def('pet_bed', {
    name: 'Pet Bed', price: 30, cat: 'pet', place: 'floor', w: 86, h: 44,
    draw: function (ctx) {
      A.shadow(ctx, 2, -2, 46, 9);
      var col = C.purple;
      A.ellipse(ctx, 0, -22, 42, 17, dk(col, 0.1), 3);
      A.ellipse(ctx, 0, -20, 30, 10, '#e4d8ff', 2.5);
      A.ellipse(ctx, 0, -18, 22, 6, '#d3c3fb', 0);
      // bone toy
      ctx.save(); ctx.translate(6, -20); ctx.rotate(-0.2);
      A.box(ctx, -9, -2.5, 18, 5, 2, '#fff', 1.8); A.circle(ctx, -10, -2.5, 3, '#fff', 1.8); A.circle(ctx, -10, 2.5, 3, '#fff', 1.8); A.circle(ctx, 10, -2.5, 3, '#fff', 1.8); A.circle(ctx, 10, 2.5, 3, '#fff', 1.8);
      A.box(ctx, -9, -2, 18, 4, 1, '#fff', 0);
      ctx.restore();
      // front rim
      var rim = function (c) { c.moveTo(-42, -22); c.ellipse(0, -22, 42, 17, 0, PI, 0, true); c.lineTo(42, -14); c.ellipse(0, -14, 42, 14, 0, 0, PI); c.closePath(); };
      A.shape(ctx, rim, col, 3);
      shadeIn(ctx, rim, -50, -14, 100, 20, 0.18); restroke(ctx, rim);
      paw(ctx, 0, -9, 1, 'rgba(255,255,255,0.75)');
      A.highlight(ctx, -26, -18, 8, 3, 0.45);
    }
  });
  def('pet_bowl', {
    name: 'Pet Bowl', price: 10, cat: 'pet', place: 'floor', w: 46, h: 26,
    draw: function (ctx) {
      A.shadow(ctx, 1, -2, 24, 5);
      var col = C.red;
      var b = function (c) { c.moveTo(-22, -20); c.lineTo(22, -20); c.lineTo(16, -2); c.quadraticCurveTo(0, 2, -16, -2); c.closePath(); };
      A.shape(ctx, b, col, 3);
      shadeIn(ctx, b, 6, -24, 20, 28, 0.2); restroke(ctx, b);
      A.ellipse(ctx, 0, -20, 22, 6, lt(col, 0.2), 3);
      A.ellipse(ctx, 0, -20, 17, 4, '#a0643a', 0);
      [[-8, -21], [-2, -22], [5, -21], [10, -20], [0, -19], [-5, -19]].forEach(function (p) { A.circle(ctx, p[0], p[1], 2.2, '#c98a52', 1); });
      ctx.save(); ctx.translate(4, -23); ctx.rotate(-0.3); A.fish(ctx, 0, 0, 0.18, 'bluegill', 0); ctx.restore();
      paw(ctx, -1, -9, 0.8, 'rgba(255,255,255,0.8)');
      A.highlight(ctx, -12, -12, 2, 3, 0.4);
    }
  });
  def('pet_tunnel', {
    name: 'Pet Tunnel', price: 40, cat: 'pet', place: 'floor', w: 116, h: 54,
    draw: function (ctx) {
      A.shadow(ctx, 2, -2, 60, 8);
      var col = C.teal;
      var b = function (c) { c.moveTo(-48, -50); c.lineTo(46, -50); c.lineTo(46, -2); c.lineTo(-48, -2); c.ellipse(-48, -26, 10, 24, 0, PI / 2, PI * 1.5); c.closePath(); };
      A.shape(ctx, b, col, 3);
      ctx.save(); ctx.beginPath(); b(ctx); ctx.clip();
      for (var i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? C.yellow : lt(col, 0.2); ctx.beginPath(); ctx.ellipse(-36 + i * 16, -26, 4, 26, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(29,43,82,0.2)'; ctx.fillRect(-60, -18, 120, 20);
      ctx.restore();
      restroke(ctx, b);
      // opening
      A.ellipse(ctx, 46, -26, 12, 24, lt(col, 0.1), 3);
      A.ellipse(ctx, 47, -26, 8, 19, '#1d3a4a', 0);
      A.ellipse(ctx, 49, -24, 4, 13, '#2c5566', 0);
      // pompom
      A.line(ctx, [20, -50, 20, -60], 2); A.circle(ctx, 20, -62, 6, C.pink, 2);
      A.highlight(ctx, -30, -42, 12, 3, 0.45);
    }
  });
  def('pet_tower', {
    name: 'Pet Tower', price: 60, cat: 'pet', place: 'floor', w: 80, h: 140,
    draw: function (ctx, o) {
      A.shadow(ctx, 2, -2, 42, 8);
      var carpet = '#a98bff', rope = '#e8cf9f';
      function post(x, y0, y1) {
        A.box(ctx, x - 6, y1, 12, y0 - y1, 3, rope, 2.5);
        for (var y = y1 + 5; y < y0 - 2; y += 5) A.line(ctx, [x - 5, y, x + 5, y - 2], 1.2, '#b9955f');
        restroke(ctx, rr(x - 6, y1, 12, y0 - y1, 3), 2.5);
      }
      post(22, -10, -84);
      post(-14, -60, -122);
      // base
      cube(ctx, -38, -12, 76, 12, 8, carpet, lt(carpet, 0.2), 5);
      // house cube
      cube(ctx, -34, -60, 46, 48, 8, carpet, lt(carpet, 0.2), 6);
      A.circle(ctx, -11, -36, 12, '#4b3b7c', 2.5);
      shadeIn(ctx, rr(-34, -60, 46, 48, 6), -2, -62, 16, 52, 0.18); restroke(ctx, rr(-34, -60, 46, 48, 6));
      // mid platform
      cube(ctx, 4, -88, 36, 8, 6, carpet, lt(carpet, 0.2), 4);
      // top platform with cushion
      cube(ctx, -36, -126, 50, 9, 7, carpet, lt(carpet, 0.2), 4);
      A.ellipse(ctx, -11, -134, 20, 6, C.pink, 2.5);
      // dangling ball
      var sw = Math.sin(o.t * 2) * 0.25;
      ctx.save(); ctx.translate(30, -84); ctx.rotate(sw);
      A.line(ctx, [0, 0, 0, 24], 1.6); A.circle(ctx, 0, 28, 6, C.yellow, 2); A.line(ctx, [-4, 26, 4, 30], 1.2, C.orange);
      ctx.restore();
      paw(ctx, 0, -2, 0.8, 'rgba(255,255,255,0.6)');
      A.highlight(ctx, -28, -54, 6, 2, 0.5);
    }
  });

  // ---------------------------------------------------------------------------
  // Footprint helper for turned rugs (perspective-correct).
  // ---------------------------------------------------------------------------
  AB.furnitureBox = function (id, rot) {
    var d = F[id]; if (!d) return { w: 0, h: 0 };
    if (d.place === 'rug' && d.rotate && !d.round && (rot & 1)) return { w: Math.round(d.h / SQ), h: Math.round(d.w * SQ) };
    return { w: d.w, h: d.h };
  };

  // ---------------------------------------------------------------------------
  // ROOM STYLES
  // ---------------------------------------------------------------------------
  function vignette(ctx, box, a) {
    var cx = box.x + box.w / 2, by = box.y + box.h;
    var g = ctx.createRadialGradient(cx, by, box.h * 0.2, cx, by, Math.max(box.w * 0.55, box.h * 1.05));
    g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.7, 'rgba(30,45,90,0)'); g.addColorStop(1, 'rgba(30,45,90,' + (a == null ? 0.3 : a) + ')');
    ctx.fillStyle = g; ctx.fillRect(box.x - 10, box.y - 10, box.w + 20, box.h + 20);
    // floor-line shade
    var g2 = ctx.createLinearGradient(0, by - 40, 0, by);
    g2.addColorStop(0, 'rgba(30,45,90,0)'); g2.addColorStop(1, 'rgba(30,45,90,0.18)');
    ctx.fillStyle = g2; ctx.fillRect(box.x, by - 40, box.w, 40);
  }
  function grad(ctx, box, c0, c1) {
    var g = ctx.createLinearGradient(0, box.y, 0, box.y + box.h); g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
  }
  var walls = {
    ice: { name: 'Ice Blocks', price: 0, paint: function (ctx, box) {
      grad(ctx, box, '#e3f1ff', '#c9def5');
      var cx = box.x + box.w / 2, by = box.y + box.h, rowH = 46;
      ctx.strokeStyle = 'rgba(120,150,205,0.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      var row = 0;
      for (var y = by; y > box.y - rowH; y -= rowH, row++) {
        ctx.beginPath(); ctx.moveTo(box.x, y); ctx.lineTo(box.x + box.w, y); ctx.stroke();
        var bw = 96 - row * 3, off = (row % 2) * bw / 2;
        for (var x = cx - bw * 7 + off; x < box.x + box.w + bw; x += bw) {
          var lean = (x - cx) / box.w * 18;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + lean, y - rowH); ctx.stroke();
        }
      }
      // soft block highlights
      var rnd = U.seeded(21);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (var i = 0; i < 40; i++) { var hx = box.x + rnd() * box.w, hy = box.y + rnd() * box.h; ctx.beginPath(); ctx.ellipse(hx, hy, 14, 3, -0.15, 0, TAU); ctx.fill(); }
      vignette(ctx, box);
    } },
    wood: { name: 'Cozy Wood', price: 80, paint: function (ctx, box) {
      grad(ctx, box, '#c98b5a', '#a86b40');
      var rnd = U.seeded(8), pw = 52;
      for (var x = box.x, k = 0; x < box.x + box.w; x += pw, k++) {
        ctx.fillStyle = k % 3 === 0 ? 'rgba(255,230,190,0.12)' : (k % 3 === 1 ? 'rgba(90,40,10,0.08)' : 'rgba(0,0,0,0)');
        ctx.fillRect(x, box.y, pw, box.h);
        ctx.strokeStyle = 'rgba(80,40,20,0.55)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, box.y); ctx.lineTo(x, box.y + box.h); ctx.stroke();
        ctx.strokeStyle = 'rgba(90,45,20,0.25)'; ctx.lineWidth = 1.5;
        for (var g = 0; g < 3; g++) {
          var gy = box.y + rnd() * box.h, gl = 30 + rnd() * 50;
          ctx.beginPath(); ctx.moveTo(x + 10 + rnd() * 30, gy); ctx.quadraticCurveTo(x + pw / 2, gy + 6, x + 12 + rnd() * 30, gy + gl); ctx.stroke();
        }
        var jy = box.y + 60 + rnd() * (box.h - 80);
        ctx.strokeStyle = 'rgba(80,40,20,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, jy); ctx.lineTo(x + pw, jy); ctx.stroke();
        ctx.fillStyle = 'rgba(80,40,20,0.5)'; ctx.beginPath(); ctx.arc(x + 6, jy - 8, 2, 0, TAU); ctx.arc(x + pw - 6, jy - 8, 2, 0, TAU); ctx.fill();
      }
      // wainscot rail
      var ry = box.y + box.h - 70;
      ctx.fillStyle = '#7d4a2b'; ctx.fillRect(box.x, ry, box.w, 12);
      ctx.fillStyle = 'rgba(255,220,170,0.35)'; ctx.fillRect(box.x, ry, box.w, 3);
      vignette(ctx, box, 0.35);
    } },
    starry: { name: 'Starry Night', price: 100, paint: function (ctx, box) {
      grad(ctx, box, '#1b2c63', '#34509a');
      var rnd = U.seeded(42);
      for (var i = 0; i < 140; i++) {
        var sx = box.x + rnd() * box.w, sy = box.y + rnd() * box.h, r = 0.8 + rnd() * 1.8;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + rnd() * 0.6) + ')'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
      }
      for (var j = 0; j < 14; j++) {
        var x = box.x + 40 + rnd() * (box.w - 80), y = box.y + 30 + rnd() * (box.h - 60);
        A.star(ctx, x, y, 6 + rnd() * 6, rnd() < 0.5 ? '#ffe27a' : '#fff6cc', 0);
      }
      // crescent moon
      var mx = box.x + box.w * 0.5, my = box.y + 70;
      A.glow(ctx, mx, my, 70, 'rgba(255,240,180,', 0.25);
      ctx.save(); ctx.beginPath(); ctx.arc(mx, my, 24, 0, TAU); ctx.arc(mx + 11, my - 7, 21, 0, TAU, true); ctx.fillStyle = '#ffe9a0'; ctx.fill('evenodd'); ctx.restore();
      vignette(ctx, box, 0.35);
    } },
    candy: { name: 'Candy Stripe', price: 70, paint: function (ctx, box) {
      ctx.fillStyle = '#fff3f7'; ctx.fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
      var sw = 44;
      for (var x = box.x; x < box.x + box.w; x += sw * 2) {
        ctx.fillStyle = '#ffc2d4'; ctx.fillRect(x, box.y, sw, box.h);
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x + sw - 6, box.y, 3, box.h);
      }
      // dots row + border
      var ry = box.y + box.h - 64;
      ctx.fillStyle = '#ff8fb1'; ctx.fillRect(box.x, ry, box.w, 14);
      ctx.fillStyle = '#fff'; for (var d = box.x + 10; d < box.x + box.w; d += 26) { ctx.beginPath(); ctx.arc(d, ry + 7, 3.5, 0, TAU); ctx.fill(); }
      var rnd = U.seeded(4);
      for (var h = 0; h < 10; h++) A.heart(ctx, box.x + 60 + rnd() * (box.w - 120), box.y + 60 + rnd() * (box.h - 160), 8, '#ff9fbf', 0);
      vignette(ctx, box, 0.25);
    } },
    leaf: { name: 'Pine Forest', price: 90, paint: function (ctx, box) {
      grad(ctx, box, '#cfeee0', '#9fd6bd');
      var rnd = U.seeded(13), by = box.y + box.h;
      function tree(x, y, h, col) {
        ctx.fillStyle = col;
        for (var k = 0; k < 3; k++) {
          var ty = y - h * 0.1 - k * h * 0.27, tw = h * 0.32 * (1 - k * 0.25);
          ctx.beginPath(); ctx.moveTo(x, ty - h * 0.42); ctx.lineTo(x + tw, ty); ctx.lineTo(x - tw, ty); ctx.closePath(); ctx.fill();
        }
        ctx.fillRect(x - h * 0.04, y - h * 0.12, h * 0.08, h * 0.12);
      }
      for (var i = 0; i < 16; i++) tree(box.x + rnd() * box.w, by - 120 - rnd() * 80, 90 + rnd() * 60, 'rgba(47,125,106,0.25)');
      for (var j = 0; j < 22; j++) tree(box.x + (j + rnd() * 0.5) * box.w / 20, by - rnd() * 30, 110 + rnd() * 80, j % 2 ? '#3f9a7d' : '#2f7d6a');
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (var s = 0; s < 50; s++) { ctx.beginPath(); ctx.arc(box.x + rnd() * box.w, box.y + rnd() * box.h * 0.8, 1.5 + rnd() * 2, 0, TAU); ctx.fill(); }
      vignette(ctx, box, 0.3);
    } }
  };

  // floor perspective: u 0..1 across, v 0..1 back→front
  function fpt(box, u, v) {
    var vv = v * 0.72 + v * v * 0.28;
    var inset = box.w * 0.087 * (1 - vv);
    return [box.x + inset + (box.w - 2 * inset) * u, box.y + box.h * vv];
  }
  function floorQuad(ctx, box, u0, v0, u1, v1) {
    var a = fpt(box, u0, v0), b = fpt(box, u1, v0), c = fpt(box, u1, v1), d = fpt(box, u0, v1);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
  }
  function floorLines(ctx, box, nu, nv, style, lw) {
    ctx.strokeStyle = style; ctx.lineWidth = lw || 2;
    for (var i = 0; i <= nu; i++) { var a = fpt(box, i / nu, 0), b = fpt(box, i / nu, 1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    for (var j = 0; j <= nv; j++) { var c = fpt(box, 0, j / nv), d = fpt(box, 1, j / nv); ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); }
  }
  function floorShade(ctx, box) {
    var g = ctx.createLinearGradient(0, box.y, 0, box.y + 70);
    g.addColorStop(0, 'rgba(30,45,90,0.28)'); g.addColorStop(1, 'rgba(30,45,90,0)');
    ctx.fillStyle = g; ctx.fillRect(box.x, box.y, box.w, 70);
    var g2 = ctx.createRadialGradient(box.x + box.w / 2, box.y + box.h * 0.6, 50, box.x + box.w / 2, box.y + box.h * 0.6, box.w * 0.6);
    g2.addColorStop(0, 'rgba(255,230,180,0.10)'); g2.addColorStop(1, 'rgba(30,45,90,0.12)');
    ctx.fillStyle = g2; ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  var floors = {
    snow: { name: 'Packed Snow', price: 0, paint: function (ctx, box) {
      grad(ctx, box, '#dce8f8', '#f3f8ff');
      var rnd = U.seeded(9);
      for (var i = 0; i < 26; i++) {
        var p = fpt(box, rnd(), rnd()), s = 0.5 + p[1] / (box.y + box.h) * 0.8;
        ctx.fillStyle = 'rgba(169,191,227,0.35)'; ctx.beginPath(); ctx.ellipse(p[0], p[1], 60 * s, 9 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(p[0] - 6 * s, p[1] - 3 * s, 40 * s, 4 * s, 0, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(140,170,215,0.4)';
      for (var j = 0; j < 120; j++) { var q = fpt(box, rnd(), rnd()); ctx.beginPath(); ctx.arc(q[0], q[1], 1.2, 0, TAU); ctx.fill(); }
      floorShade(ctx, box);
    } },
    planks: { name: 'Wood Planks', price: 60, paint: function (ctx, box) {
      ctx.fillStyle = '#c98b5a'; ctx.fillRect(box.x, box.y, box.w, box.h);
      var n = 18, rnd = U.seeded(17);
      for (var i = 0; i < n; i++) {
        floorQuad(ctx, box, i / n, 0, (i + 1) / n, 1);
        ctx.fillStyle = ['#c98b5a', '#bf7f4f', '#d39a68'][i % 3]; ctx.fill();
        var nj = 3, base = rnd();
        for (var j = 0; j < nj; j++) {
          var v = (base + j / nj) % 1, a = fpt(box, i / n, v), b = fpt(box, (i + 1) / n, v);
          ctx.strokeStyle = 'rgba(80,40,20,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
      ctx.strokeStyle = 'rgba(80,40,20,0.55)'; ctx.lineWidth = 2.5;
      for (var k = 0; k <= n; k++) { var c = fpt(box, k / n, 0), d = fpt(box, k / n, 1); ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); }
      floorShade(ctx, box);
    } },
    checker: { name: 'Checkers', price: 50, paint: function (ctx, box) {
      var nu = 14, nv = 7;
      for (var i = 0; i < nu; i++) for (var j = 0; j < nv; j++) {
        floorQuad(ctx, box, i / nu, j / nv, (i + 1) / nu, (j + 1) / nv);
        ctx.fillStyle = (i + j) % 2 ? '#ffffff' : '#ff9fb4'; ctx.fill();
      }
      floorLines(ctx, box, nu, nv, 'rgba(180,90,120,0.25)', 1.5);
      floorShade(ctx, box);
    } },
    carpet: { name: 'Blue Carpet', price: 70, paint: function (ctx, box) {
      ctx.fillStyle = '#4f7fd0'; ctx.fillRect(box.x, box.y, box.w, box.h);
      var nu = 12, nv = 6;
      for (var i = 0; i < nu; i++) for (var j = 0; j < nv; j++) {
        var a = fpt(box, (i + 0.5) / nu, j / nv), b = fpt(box, (i + 1) / nu, (j + 0.5) / nv), c = fpt(box, (i + 0.5) / nu, (j + 1) / nv), d = fpt(box, i / nu, (j + 0.5) / nv);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
        ctx.fillStyle = (i + j) % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(120,180,255,0.22)'; ctx.fill();
        var m = fpt(box, (i + 0.5) / nu, (j + 0.5) / nv), s = 0.6 + j / nv * 0.7;
        ctx.fillStyle = 'rgba(255,230,140,0.55)'; ctx.beginPath(); ctx.ellipse(m[0], m[1], 4 * s, 2 * s, 0, 0, TAU); ctx.fill();
      }
      var rnd = U.seeded(31); ctx.fillStyle = 'rgba(20,40,90,0.12)';
      for (var k = 0; k < 300; k++) { var q = fpt(box, rnd(), rnd()); ctx.fillRect(q[0], q[1], 2, 2); }
      floorShade(ctx, box);
    } },
    tiles: { name: 'Ice Tiles', price: 55, paint: function (ctx, box) {
      var nu = 10, nv = 5;
      for (var i = 0; i < nu; i++) for (var j = 0; j < nv; j++) {
        floorQuad(ctx, box, i / nu, j / nv, (i + 1) / nu, (j + 1) / nv);
        var a = fpt(box, i / nu, j / nv), c = fpt(box, (i + 1) / nu, (j + 1) / nv);
        var g = ctx.createLinearGradient(a[0], a[1], c[0], c[1]);
        g.addColorStop(0, (i + j) % 2 ? '#d7f3fc' : '#bfe9f7'); g.addColorStop(1, (i + j) % 2 ? '#a8def2' : '#93d2ec');
        ctx.fillStyle = g; ctx.fill();
        var h = fpt(box, (i + 0.25) / nu, (j + 0.3) / nv), s = 0.5 + j / nv * 0.8;
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(h[0], h[1], 14 * s, 2.5 * s, -0.25, 0, TAU); ctx.fill();
      }
      floorLines(ctx, box, nu, nv, 'rgba(255,255,255,0.9)', 3);
      floorShade(ctx, box);
    } }
  };

  // windows ---------------------------------------------------------------
  function winScene(ctx, t, seed) {
    var g = ctx.createLinearGradient(0, -75, 0, 70); g.addColorStop(0, '#162a5e'); g.addColorStop(0.7, '#3a5aa4'); g.addColorStop(1, '#7f95d4');
    ctx.fillStyle = g; ctx.fillRect(-80, -80, 160, 160);
    var rnd = U.seeded(seed || 5);
    for (var i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.5 * Math.abs(Math.sin(t * 1.5 + i))) + ')'; ctx.beginPath(); ctx.arc(-75 + rnd() * 150, -75 + rnd() * 90, 0.8 + rnd() * 1.2, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.translate(-80, 0); A.aurora(ctx, 160, -62, 70, t, 0.6); ctx.restore();
    // far hills + pines
    ctx.fillStyle = '#b9cbef'; ctx.beginPath(); ctx.moveTo(-80, 34); ctx.quadraticCurveTo(-30, 10, 10, 28); ctx.quadraticCurveTo(50, 12, 80, 26); ctx.lineTo(80, 80); ctx.lineTo(-80, 80); ctx.fill();
    ctx.fillStyle = '#2f5f7a';
    [[-50, 26, 22], [-38, 24, 16], [40, 22, 20], [52, 24, 14]].forEach(function (p) { ctx.beginPath(); ctx.moveTo(p[0], p[1] - p[2]); ctx.lineTo(p[0] + p[2] * 0.35, p[1]); ctx.lineTo(p[0] - p[2] * 0.35, p[1]); ctx.fill(); });
    ctx.fillStyle = '#eef4ff'; ctx.beginPath(); ctx.moveTo(-80, 46); ctx.quadraticCurveTo(-10, 30, 80, 44); ctx.lineTo(80, 80); ctx.lineTo(-80, 80); ctx.fill();
    // falling snow
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (var k = 0; k < 22; k++) {
      var sp = 14 + (k % 5) * 5, x = ((k * 37.7 + Math.sin(t * 0.8 + k) * 6 + t * 5) % 160 + 160) % 160 - 80, y = ((k * 53.3 + t * sp) % 160) - 80, r = 1 + (k % 3) * 0.7;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  }
  function drawWin(ctx, cx, cy, t, path, frame, mull, seed) {
    A.glow(ctx, cx, cy, 120, 'rgba(160,200,255,', 0.18);
    ctx.save(); ctx.translate(cx, cy);
    // outer shadow on wall
    ctx.save(); ctx.translate(4, 6); ctx.beginPath(); path(ctx); ctx.lineWidth = 22; ctx.strokeStyle = 'rgba(30,45,90,0.18)'; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.beginPath(); path(ctx); ctx.clip();
    winScene(ctx, t, seed);
    // mullions
    if (mull) {
      ctx.lineCap = 'butt';
      mull.forEach(function (m) {
        ctx.beginPath(); ctx.moveTo(m[0], m[1]); ctx.lineTo(m[2], m[3]);
        ctx.lineWidth = 9; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = frame; ctx.stroke();
      });
    }
    // glass sheen
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(-60, -10); ctx.lineTo(-20, -70); ctx.lineTo(-6, -70); ctx.lineTo(-46, -10); ctx.fill();
    ctx.restore();
    // frame
    ctx.beginPath(); path(ctx); ctx.lineJoin = 'round';
    ctx.lineWidth = 21; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.lineWidth = 15; ctx.strokeStyle = frame; ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.save(); ctx.translate(-1.5, -1.5); ctx.beginPath(); path(ctx); ctx.stroke(); ctx.restore();
    ctx.restore();
  }
  function sill(ctx, cx, y, w) {
    A.box(ctx, cx - w / 2, y - 6, w, 14, 5, C.woodLight, 3);
    ctx.beginPath(); ctx.moveTo(cx - w / 2 + 4, y - 5); ctx.quadraticCurveTo(cx - w * 0.2, y - 16, cx + w * 0.05, y - 7); ctx.quadraticCurveTo(cx + w * 0.25, y - 13, cx + w / 2 - 6, y - 5); ctx.closePath();
    A.fs(ctx, C.snow, 2);
  }
  var windows = {
    round: { name: 'Round', price: 0, draw: function (ctx, cx, cy, t) {
      drawWin(ctx, cx, cy, t || 0, function (c) { c.ellipse(0, 0, 60, 56, 0, 0, TAU); }, C.wood, [[0, -60, 0, 60], [-64, 0, 64, 0]], 5);
      sill(ctx, cx, cy + 64, 108);
    } },
    arch: { name: 'Arched', price: 40, draw: function (ctx, cx, cy, t) {
      drawWin(ctx, cx, cy, t || 0, function (c) { c.moveTo(-52, 56); c.lineTo(-52, -6); c.arc(0, -6, 52, PI, 0); c.lineTo(52, 56); c.closePath(); }, '#c8603f', [[0, -60, 0, 60], [-56, 10, 56, 10], [-36, -46, 0, -6], [36, -46, 0, -6]], 8);
      sill(ctx, cx, cy + 64, 124);
    } },
    star: { name: 'Star Window', price: 60, draw: function (ctx, cx, cy, t) {
      var p = function (c) { for (var i = 0; i < 10; i++) { var a = -PI / 2 + i * PI / 5, r = i % 2 ? 34 : 70; if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r + 6); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r + 6); } c.closePath(); };
      drawWin(ctx, cx, cy, t || 0, p, '#f2b53a', null, 11);
      A.circle(ctx, cx, cy + 6, 6, '#f2b53a', 3);
      A.sparkle(ctx, cx + 62, cy - 50, 7, 0.5 + 0.5 * Math.sin((t || 0) * 2.5));
    } },
    heart: { name: 'Heart Window', price: 60, draw: function (ctx, cx, cy, t) {
      var p = function (c) {
        c.moveTo(0, 60); c.bezierCurveTo(-34, 36, -70, 10, -66, -24); c.bezierCurveTo(-62, -58, -18, -66, 0, -34);
        c.bezierCurveTo(18, -66, 62, -58, 66, -24); c.bezierCurveTo(70, 10, 34, 36, 0, 60); c.closePath();
      };
      drawWin(ctx, cx, cy, t || 0, p, '#ff7fa6', [[0, -34, 0, 60]], 14);
      A.heart(ctx, cx, cy - 46, 7, '#ffd0de', 2);
    } }
  };
  AB.roomStyles = { wall: walls, floor: floors, window: windows };

  AB.FURNITURE_STARTER = ['bed_cozy', 'chair_wood', 'table_round', 'lamp_floor', 'rug_round_blue', 'plant_fern'];
})();
