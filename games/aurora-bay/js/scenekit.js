/* Aurora Bay — reusable painting for scenes: sky, mountains, snowy ground, paths, cabins. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C;
  var K = AB.kit = {};

  K.skyAndMountains = function (ctx, horizon, seed) {
    A.sky(ctx, AB.W, AB.H, horizon + 40);
    var r = U.seeded(seed || 3);
    // far range
    [[0.0, '#a7b8e3', '#c9d5f2', 0.62], [0.35, '#8ea3d6', '#e9efff', 0.82]].forEach(function (layer, li) {
      ctx.beginPath(); ctx.moveTo(0, horizon + 40);
      var x = -40, pts = [];
      while (x < AB.W + 80) { var h = (60 + r() * 90) * layer[3]; pts.push([x, horizon + 30 - h, x + 60 + r() * 50]); x += 110 + r() * 90; }
      ctx.lineTo(-40, horizon + 30);
      pts.forEach(function (p) { ctx.lineTo(p[0] + 55, p[1]); ctx.lineTo(p[2] + 40, horizon + 30 - (li ? 10 : 20)); });
      ctx.lineTo(AB.W + 40, horizon + 40); ctx.closePath();
      ctx.fillStyle = layer[1]; ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.moveTo(-40, horizon + 30);
      pts.forEach(function (p) { ctx.lineTo(p[0] + 55, p[1]); ctx.lineTo(p[2] + 40, horizon + 30 - (li ? 10 : 20)); });
      ctx.lineWidth = 2.5; ctx.strokeStyle = li ? '#7d90c4' : '#93a5d6'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.moveTo(0, horizon + 40);
      ctx.lineTo(-40, horizon + 30);
      pts.forEach(function (p) { ctx.lineTo(p[0] + 55, p[1]); ctx.lineTo(p[2] + 40, horizon + 30 - (li ? 10 : 20)); });
      ctx.lineTo(AB.W + 40, horizon + 40); ctx.closePath();
      // snow caps
      ctx.save(); ctx.clip();
      pts.forEach(function (p) {
        ctx.beginPath(); ctx.moveTo(p[0] + 55, p[1]);
        ctx.lineTo(p[0] + 55 + 26, p[1] + 34); ctx.lineTo(p[0] + 55 + 10, p[1] + 26); ctx.lineTo(p[0] + 55, p[1] + 38); ctx.lineTo(p[0] + 55 - 12, p[1] + 26); ctx.lineTo(p[0] + 55 - 28, p[1] + 34); ctx.closePath();
        ctx.fillStyle = layer[2]; ctx.fill();
      });
      ctx.restore();
    });
  };
  K.treeline = function (ctx, y, seed, n, hmin, hmax) {
    var r = U.seeded(seed || 9);
    for (var i = 0; i < (n || 26); i++) {
      var x = r() * AB.W, h = (hmin || 30) + r() * ((hmax || 60) - (hmin || 30));
      A.poly(ctx, [x, y - h, x + h * 0.3, y, x - h * 0.3, y], i % 2 ? '#3f7f84' : '#356f77', 0);
      A.poly(ctx, [x, y - h, x + h * 0.12, y - h * 0.62, x - h * 0.12, y - h * 0.62], '#e9f1ff', 0);
    }
  };
  K.snowGround = function (ctx, top) {
    var g = ctx.createLinearGradient(0, top, 0, AB.H);
    g.addColorStop(0, '#dfe8f8'); g.addColorStop(0.35, '#eef3fd'); g.addColorStop(1, '#f8fbff');
    ctx.fillStyle = g; ctx.fillRect(0, top, AB.W, AB.H - top);
    // soft drifts texture
    var r = U.seeded(41);
    ctx.save(); ctx.globalAlpha = 0.5;
    for (var i = 0; i < 26; i++) {
      var x = r() * AB.W, y = top + 30 + r() * (AB.H - top - 30), w = 80 + r() * 160;
      ctx.fillStyle = r() < 0.5 ? '#ffffff' : '#dbe5f6';
      ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // sparkles
    for (var j = 0; j < 60; j++) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; var sx = r() * AB.W, sy = top + r() * (AB.H - top); ctx.fillRect(sx, sy, 2, 2); }
  };
  /** Packed-snow path along a polyline (pts=[[x,y,width],...]). */
  K.path = function (ctx, pts, color) {
    function stroke(extra, col) {
      ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (var i = 1; i < pts.length; i++) {
        ctx.lineWidth = (pts[i - 1][2] + pts[i][2]) / 2 + extra;
        ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
      }
      ctx.restore();
    }
    stroke(10, '#c3d1ec'); stroke(0, color || '#d9e2f3');
    // little stones peeking through
    var r = U.seeded(pts.length * 13 + Math.round(pts[0][0]));
    for (var i = 1; i < pts.length; i++) {
      for (var k = 0; k < 5; k++) {
        var t = r(), x = U.lerp(pts[i - 1][0], pts[i][0], t) + (r() - 0.5) * pts[i][2] * 0.6, y = U.lerp(pts[i - 1][1], pts[i][1], t) + (r() - 0.5) * pts[i][2] * 0.3;
        A.ellipse(ctx, x, y, 7 + r() * 6, 3 + r() * 2, '#b8c3db', 1.5, '#9ba8c6');
      }
    }
  };
  K.cobbles = function (ctx, cx, cy, rx, ry) {
    A.ellipse(ctx, cx, cy, rx + 10, ry + 6, '#c9d4ea', 0);
    A.ellipse(ctx, cx, cy, rx, ry, '#d7dfef', 3, '#b2bfdc');
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
    var r = U.seeded(7);
    for (var ring = 1; ring < 6; ring++) {
      var rr = ring / 6, n = 8 + ring * 7;
      for (var i = 0; i < n; i++) {
        var a = i / n * Math.PI * 2 + ring;
        var x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr;
        if (r() < 0.55) A.ellipse(ctx, x, y, 14, 6, r() < 0.5 ? '#c3cde3' : '#ccd5ea', 1.5, '#a8b5d3');
      }
    }
    // snow patches over stones
    ctx.globalAlpha = 0.8;
    for (var s = 0; s < 14; s++) { A.ellipse(ctx, cx + (r() - 0.5) * rx * 1.8, cy + (r() - 0.5) * ry * 1.6, 30 + r() * 40, 8 + r() * 6, '#f4f8ff', 0); }
    ctx.restore();
  };
  /** Snowy roof: a trapezoid with a thick rounded snow blanket. */
  K.roof = function (ctx, x, y, w, h, color, overhang) {
    var o = overhang || 24;
    A.poly(ctx, [x - o, y, x + w + o, y, x + w - w * 0.12, y - h, x + w * 0.12, y - h], color, 3.5);
    ctx.save(); ctx.globalAlpha = 0.25; A.poly(ctx, [x + w * 0.5, y, x + w + o, y, x + w - w * 0.12, y - h, x + w * 0.5, y - h], '#000', 0); ctx.restore();
    // shingle lines
    ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
    for (var k = 1; k < 4; k++) { var yy = y - h * k / 4, inset = (w * 0.12 + o) * (k / 4); ctx.beginPath(); ctx.moveTo(x - o + inset, yy); ctx.lineTo(x + w + o - inset, yy); ctx.stroke(); }
    ctx.restore();
    // snow blanket
    ctx.beginPath();
    ctx.moveTo(x + w * 0.1, y - h - 4);
    ctx.quadraticCurveTo(x + w / 2, y - h - 22, x + w * 0.9, y - h - 4);
    ctx.quadraticCurveTo(x + w * 0.98, y - h * 0.6, x + w + o + 6, y - h * 0.18);
    var bumps = 6;
    for (var b = bumps; b >= 0; b--) {
      var bx = x - o - 6 + (w + 2 * o + 12) * b / bumps;
      ctx.quadraticCurveTo(bx + (w + 2 * o) / bumps / 2, y - h * 0.18 + 22, bx, y - h * 0.18 + (b % 2 ? 4 : 12));
    }
    ctx.quadraticCurveTo(x + w * 0.02, y - h * 0.6, x + w * 0.1, y - h - 4);
    ctx.closePath();
    A.fs(ctx, '#ffffff', 3);
    ctx.save(); ctx.clip(); ctx.fillStyle = C.snowShade; ctx.fillRect(x - o - 10, y - h * 0.18 + 2, w + 2 * o + 20, 30); ctx.restore();
    // icicles
    for (var i = 0; i < 9; i++) {
      var ix = x - o + 10 + i * (w + 2 * o - 20) / 8, il = 8 + ((i * 37) % 13);
      A.poly(ctx, [ix - 4, y - 2, ix + 4, y - 2, ix, y + il], '#dff3ff', 1.5, '#9cc3e6');
    }
  };
  /** A cabin-style building. Returns door info. o: {x, y(base), w, h, wall, trim, roof, roofH, logs, door:{x,w,h,color}, windows:[[x,y,w,h,opts]], sign:{text,icon,x,y,w,color}} */
  K.building = function (ctx, o) {
    A.shadow(ctx, o.x + o.w / 2, o.y + 6, o.w * 0.62, 18, 0.22);
    A.box(ctx, o.x, o.y - o.h, o.w, o.h, 6, o.wall, 3.5);
    ctx.save(); ctx.beginPath(); A.rrect(ctx, o.x, o.y - o.h, o.w, o.h, 6); ctx.clip();
    if (o.logs) {
      ctx.strokeStyle = 'rgba(70,35,15,0.35)'; ctx.lineWidth = 2.5;
      for (var y = o.y - o.h + 18; y < o.y; y += 18) { ctx.beginPath(); ctx.moveTo(o.x, y); ctx.lineTo(o.x + o.w, y); ctx.stroke(); }
      for (var y2 = o.y - o.h + 9; y2 < o.y; y2 += 18) { A.circle(ctx, o.x + 6, y2, 7, U.shade(o.wall, 0.15), 2); A.circle(ctx, o.x + o.w - 6, y2, 7, U.shade(o.wall, 0.15), 2); }
    } else if (o.boards) {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
      for (var xx = o.x + 22; xx < o.x + o.w; xx += 22) { ctx.beginPath(); ctx.moveTo(xx, o.y - o.h); ctx.lineTo(xx, o.y); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(20,30,70,0.13)'; ctx.fillRect(o.x + o.w * 0.62, o.y - o.h, o.w, o.h);
    ctx.fillStyle = 'rgba(20,30,70,0.12)'; ctx.fillRect(o.x, o.y - o.h, o.w, 26);
    ctx.restore();
    A.box(ctx, o.x - 6, o.y - 16, o.w + 12, 18, 5, o.trim || C.stone, 3);
    (o.windows || []).forEach(function (w) { A.window(ctx, w[0], w[1], w[2], w[3], w[4] || {}); });
    if (o.door) A.door(ctx, o.door.x, o.y - 2, o.door.w, o.door.h, o.door.color, { wreath: o.door.wreath });
    K.roof(ctx, o.x, o.y - o.h, o.w, o.roofH || 90, o.roof, o.overhang);
    if (o.chimney != null) {
      var cx = o.x + o.chimney, cy = o.y - o.h - (o.roofH || 90) * 0.55;
      A.box(ctx, cx, cy - 50, 30, 56, 3, '#a35b45', 3);
      A.box(ctx, cx - 5, cy - 58, 40, 12, 3, '#8a4b38', 3);
      A.ellipse(ctx, cx + 15, cy - 60, 22, 7, '#fff', 2.5);
    }
    if (o.sign) {
      var s = o.sign, sx = s.x, sy = s.y, sw = s.w || 170;
      A.box(ctx, sx - sw / 2, sy - 30, sw, 56, 14, s.color || C.cream, 3.5);
      A.box(ctx, sx - sw / 2 + 6, sy - 24, sw - 12, 44, 10, null, 2, 'rgba(38,50,77,0.25)');
      ctx.fillStyle = s.ink || C.out; ctx.font = '900 ' + (s.size || 24) + 'px ' + AB.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var tx = sx + (s.icon ? 18 : 0);
      ctx.fillText(s.text, tx, sy + 1);
      if (s.icon) { var tw = ctx.measureText(s.text).width; AB.icons.draw(ctx, s.icon, tx - tw / 2 - 22, sy, 28, s.iconColor || C.red); }
      A.ellipse(ctx, sx - sw * 0.2, sy - 31, sw * 0.28, 6, '#fff', 2);
    }
  };
  K.smoke = function (ctx, x, y, t) {
    for (var i = 0; i < 5; i++) {
      var p = ((t * 0.35 + i / 5) % 1), r = 10 + p * 26;
      ctx.fillStyle = 'rgba(235,240,255,' + (0.55 * (1 - p)) + ')';
      ctx.beginPath(); ctx.arc(x + Math.sin(p * 5 + i) * 12 + p * 30, y - p * 120, r, 0, Math.PI * 2); ctx.fill();
    }
  };
  K.stringLights = function (ctx, x1, y1, x2, y2, sag, t, n) {
    n = n || 9;
    ctx.strokeStyle = C.out; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + sag * 2, x2, y2); ctx.stroke();
    var cols = ['#ffcf4a', '#ff6f91', '#7fe3ff', '#8be38b', '#c9a0ff'];
    for (var i = 1; i < n; i++) {
      var k = i / n, x = (1 - k) * (1 - k) * x1 + 2 * (1 - k) * k * (x1 + x2) / 2 + k * k * x2;
      var y = (1 - k) * (1 - k) * y1 + 2 * (1 - k) * k * ((y1 + y2) / 2 + sag * 2) + k * k * y2;
      var on = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.7);
      var col = cols[i % cols.length];
      A.glow(ctx, x, y + 6, 16, 'rgba(255,230,150,', 0.35 * on);
      ctx.globalAlpha = 0.55 + on * 0.45; A.ellipse(ctx, x, y + 6, 4.5, 6.5, col, 1.8); ctx.globalAlpha = 1;
    }
  };
  K.fence = function (ctx, x1, y1, x2, y2, n) {
    n = n || 6;
    for (var i = 0; i <= n; i++) { var x = U.lerp(x1, x2, i / n), y = U.lerp(y1, y2, i / n); A.box(ctx, x - 5, y - 44, 10, 46, 3, C.wood, 2.5); A.ellipse(ctx, x, y - 45, 7, 3.5, '#fff', 1.5); }
    A.line(ctx, [x1, y1 - 34, x2, y2 - 34], 7, C.out); A.line(ctx, [x1, y1 - 34, x2, y2 - 34], 4, C.woodLight);
    A.line(ctx, [x1, y1 - 16, x2, y2 - 16], 7, C.out); A.line(ctx, [x1, y1 - 16, x2, y2 - 16], 4, C.woodLight);
  };
  /** Interior room shell: back wall, floor, side walls. */
  K.room = function (ctx, o) {
    var g = ctx.createLinearGradient(0, 0, 0, o.wallBottom);
    g.addColorStop(0, U.shade(o.wall, -0.15)); g.addColorStop(1, o.wall);
    ctx.fillStyle = g; ctx.fillRect(0, 0, AB.W, o.wallBottom + 2);
    if (o.planks) {
      ctx.strokeStyle = 'rgba(60,30,10,0.18)'; ctx.lineWidth = 2;
      for (var x = 0; x < AB.W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, o.wallBottom); ctx.stroke(); }
    }
    var fg = ctx.createLinearGradient(0, o.wallBottom, 0, AB.H);
    fg.addColorStop(0, U.shade(o.floor, -0.12)); fg.addColorStop(1, o.floor);
    ctx.fillStyle = fg; ctx.fillRect(0, o.wallBottom, AB.W, AB.H - o.wallBottom);
    if (o.floorBoards) {
      ctx.strokeStyle = 'rgba(60,30,10,0.2)'; ctx.lineWidth = 2;
      for (var k = 0; k < 14; k++) { var yy = o.wallBottom + Math.pow(k / 14, 1.4) * (AB.H - o.wallBottom); ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(AB.W, yy); ctx.stroke(); }
      for (var j = -12; j <= 12; j++) { ctx.beginPath(); ctx.moveTo(640 + j * 60, o.wallBottom); ctx.lineTo(640 + j * 130, AB.H); ctx.stroke(); }
    }
    A.box(ctx, -10, o.wallBottom - 14, AB.W + 20, 18, 0, U.shade(o.wall, -0.35), 3);
    // vignette
    var v = ctx.createRadialGradient(640, 520, 300, 640, 520, 900);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(30,20,40,0.35)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, AB.W, AB.H);
  };
  /** Doormat + exit arrow at the bottom of interiors. */
  K.exitMat = function (ctx, x, y) {
    A.ellipse(ctx, x, y, 90, 26, '#b4553f', 3);
    A.ellipse(ctx, x, y, 72, 18, null, 2, 'rgba(255,220,180,0.6)');
  };
})();
