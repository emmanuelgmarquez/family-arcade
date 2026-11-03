/* Aurora Bay — one icon set for both the HTML menus (inline SVG) and the canvas (Path2D).
 * Each icon is a list of [mode, svgPathData] on a 24×24 grid; mode 's' = stroke, 'f' = fill. */
(function () {
  'use strict';
  var AB = window.AB, A = AB.art;
  var I = AB.icons = {};
  var D = I.data = {
    map: [['s', 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z'], ['s', 'M9 4v14M15 6v14'], ['f', 'M17.5 9.5a1.5 1.5 0 1 0 0.01 0z']],
    home: [['s', 'M3 13a9 9 0 0 1 18 0v7H3z'], ['s', 'M9.5 20v-4a2.5 2.5 0 0 1 5 0v4'], ['s', 'M6 10.5h12M4 15h5M15 15h5']],
    bag: [['s', 'M5 8h14l-1.2 12H6.2z'], ['s', 'M9 8V6.5a3 3 0 0 1 6 0V8'], ['s', 'M9 12.5c1.6 1.6 4.4 1.6 6 0']],
    quest: [['s', 'M6 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2z'], ['s', 'M9 8h6M9 12h6']],
    gear: [['s', 'M12 8.5a3.5 3.5 0 1 0 0.01 0z'], ['s', 'M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1']],
    paw: [['f', 'M12 12c-3 0-6 3.4-6 6 0 1.6 1.5 2.4 3 2 1-.3 2-.7 3-.7s2 .4 3 .7c1.5.4 3-.4 3-2 0-2.6-3-6-6-6z'], ['f', 'M5 9.5a2 2.5 0 1 0 .01 0zM9 5a2 2.5 0 1 0 .01 0zM15 5a2 2.5 0 1 0 .01 0zM19 9.5a2 2.5 0 1 0 .01 0z']],
    close: [['s', 'M6 6l12 12M18 6L6 18']],
    check: [['s', 'M4.5 12.5l5 5 10-11']],
    play: [['f', 'M8 5l11 7-11 7z']],
    pause: [['f', 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z']],
    left: [['s', 'M15 5l-7 7 7 7']],
    right: [['s', 'M9 5l7 7-7 7']],
    up: [['s', 'M5 15l7-7 7 7']],
    down: [['s', 'M5 9l7 7 7-7']],
    speaker: [['f', 'M4 9h4l5-4v14l-5-4H4z'], ['s', 'M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12']],
    mute: [['f', 'M4 9h4l5-4v14l-5-4H4z'], ['s', 'M16 9l5 6M21 9l-5 6']],
    music: [['s', 'M9 18V6l10-2v12'], ['f', 'M6.5 15.5a2.5 2.5 0 1 0 0.01 0zM16.5 13.5a2.5 2.5 0 1 0 0.01 0z']],
    trash: [['s', 'M5 7h14M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6']],
    flip: [['s', 'M12 3v18'], ['f', 'M10 6L3 18h7zM14 6l7 12h-7z']],
    rotate: [['s', 'M19 12a7 7 0 1 1-2.2-5.1'], ['f', 'M20.5 3.5v6h-6z']],
    box: [['s', 'M3.5 8l8.5-4 8.5 4v9L12 21l-8.5-4z'], ['s', 'M3.5 8L12 12l8.5-4M12 12v9']],
    door: [['s', 'M6 21V7a6 6 0 0 1 12 0v14z'], ['f', 'M14.5 13.5a1.2 1.2 0 1 0 0.01 0z'], ['s', 'M3 21h18']],
    star: [['f', 'M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z']],
    fish: [['s', 'M3 12c3-5 9-6 13-3l4-3v12l-4-3c-4 3-10 2-13-3z'], ['f', 'M8.2 10.6a1.2 1.2 0 1 0 0.01 0z']],
    sled: [['s', 'M3 15h15a3 3 0 0 0 3-3M5 15l-1 4h13a3 3 0 0 0 3-3'], ['s', 'M7 15v-3h8v3'], ['s', 'M8 12V8']],
    mug: [['s', 'M5 8h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z'], ['s', 'M16 10h1.5a2.5 2.5 0 0 1 0 5H16'], ['s', 'M8 5c0-1 1-1 1-2M12 5c0-1 1-1 1-2']],
    shirt: [['s', 'M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3c-.5 1.7-2 2.6-4 2.6S8.5 4.7 8 3z']],
    sofa: [['s', 'M4 12V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4'], ['s', 'M2.5 12.5a2 2 0 0 1 4 0V15h11v-2.5a2 2 0 0 1 4 0V19h-19z'], ['s', 'M5 19v2M19 19v2']],
    plus: [['s', 'M12 5v14M5 12h14']],
    wave: [['s', 'M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7 6 6 0 0 1-5-3l-2.5-4.5a1.5 1.5 0 0 1 2.6-1.5L8 15'], ['s', 'M19.5 3.5c1 .8 1.5 1.8 1.5 3']],
    heart: [['f', 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z']],
    bowl: [['s', 'M3 12h18a9 6 0 0 1-18 0z'], ['f', 'M8 10.5a1.6 1.6 0 1 0 .01 0zM12 9.5a1.6 1.6 0 1 0 .01 0zM16 10.5a1.6 1.6 0 1 0 .01 0z']],
    ball: [['s', 'M12 3a9 9 0 1 0 .01 0z'], ['s', 'M3.5 9.5c5 2 12 2 17 0M5 17c4-2 10-2 14 0']],
    hint: [['s', 'M9 9a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.9v.8'], ['f', 'M12 17.2a1.3 1.3 0 1 0 .01 0z'], ['s', 'M12 2.5a9.5 9.5 0 1 0 .01 0z']],
    download: [['s', 'M12 4v11M7 10l5 5 5-5M4 19h16']],
    upload: [['s', 'M12 15V4M7 9l5-5 5 5M4 19h16']],
    users: [['s', 'M9 11a3.5 3.5 0 1 0 .01 0zM2.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5'], ['s', 'M16 11a3 3 0 1 0 0-6M17.5 14.5c2.2.5 3.6 2.4 4 5.5']],
    lock: [['s', 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3'], ['f', 'M12 14.5a1.5 1.5 0 1 0 .01 0z']],
    eye: [['s', 'M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z'], ['f', 'M12 9a3 3 0 1 0 .01 0z']],
    sparkle: [['f', 'M12 2c.8 5 2 7.2 7 8-5 .8-6.2 3-7 8-.8-5-2-7.2-7-8 5-.8 6.2-3 7-8zM19 15c.3 2 .9 2.7 3 3-2.1.3-2.7 1-3 3-.3-2-.9-2.7-3-3 2.1-.3 2.7-1 3-3z']],
    bell: [['s', 'M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z'], ['s', 'M10 21h4M12 3v2']],
    bench: [['s', 'M3 10h18M4 14h16M6 14v6M18 14v6M5 6h14v4H5z']],
    skate: [['s', 'M6 4h5v8c3 0 7 1 8 4v1H6z'], ['s', 'M4 20h16M8 17v3M17 17v3']],
    shop: [['s', 'M4 9l1.5-5h13L20 9'], ['s', 'M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0'], ['s', 'M5.5 11.5V20h13v-8.5M10 20v-5h4v5']],
    talk: [['s', 'M4 5h16v11H11l-5 4v-4H4z'], ['f', 'M8 10.5a1.2 1.2 0 1 0 .01 0zM12 10.5a1.2 1.2 0 1 0 .01 0zM16 10.5a1.2 1.2 0 1 0 .01 0z']],
    swap: [['s', 'M4 8h14l-3-3M20 16H6l3 3']],
    pencil: [['s', 'M4 20l1-4L16 5l3 3L8 19z'], ['s', 'M14 7l3 3']],
    camera: [['s', 'M4 8h4l1.5-2h5L16 8h4v11H4z'], ['s', 'M12 10.5a3 3 0 1 0 .01 0z']],
    gem: [['s', 'M6 4h12l3 5-9 11L3 9z'], ['s', 'M3 9h18M9 4l3 16 3-16']],
    paint: [['s', 'M12 3c-5 0-9 3.6-9 8 0 3 2.5 4.6 4.5 4 1.5-.4 2.6.6 2.2 2-.6 2 .8 4 3.3 4 4.4 0 8-4 8-9s-4-9-9-9z'], ['f', 'M7.5 10.5a1.3 1.3 0 1 0 .01 0zM11 7a1.3 1.3 0 1 0 .01 0zM15.5 8a1.3 1.3 0 1 0 .01 0z']],
    arrowBack: [['s', 'M20 12H5M11 5l-7 7 7 7']]
  };

  I.svg = function (name, cls) {
    var parts = D[name] || D.hint, s = '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">';
    parts.forEach(function (p) {
      s += p[0] === 'f' ? '<path d="' + p[1] + '" fill="currentColor"/>' : '<path d="' + p[1] + '" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>';
    });
    return s + '</svg>';
  };
  var cache = {};
  I.draw = function (ctx, name, x, y, size, color) {
    var parts = D[name]; if (!parts) return;
    if (!cache[name] && window.Path2D) cache[name] = parts.map(function (p) { return [p[0], new Path2D(p[1])]; });
    ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = ctx.fillStyle = color || A.C.out; ctx.lineWidth = 2.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    (cache[name] || []).forEach(function (p) { if (p[0] === 'f') ctx.fill(p[1]); else ctx.stroke(p[1]); });
    ctx.restore();
  };
  /** Floating round badge above tappable spots in the world. */
  var BADGE_COL = { door: '#4a8fe0', fish: '#35b5a4', sled: '#e2574c', mug: '#c96a4a', shop: '#8e6bd8', paw: '#ff8fb1', home: '#ff9a3c', talk: '#35b5a4', bell: '#ffb000', bench: '#b06f43', skate: '#4a8fe0', star: '#ffb000', eye: '#5dbb63', sofa: '#8e6bd8', shirt: '#ff6f91', map: '#35b5a4', sparkle: '#8e6bd8' };
  I.badge = function (ctx, name) {
    var col = BADGE_COL[name] || '#4a8fe0';
    A.shadow(ctx, 0, 30, 14, 4, 0.18);
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.moveTo(-8, 20); ctx.lineTo(0, 32); ctx.lineTo(8, 20);
    A.fs(ctx, '#ffffff', 3);
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
    I.draw(ctx, name, 0, 0, 22, '#ffffff');
  };
})();
