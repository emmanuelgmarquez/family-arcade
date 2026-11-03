/* Aurora Bay — core namespace, math helpers, events, shared constants.
 * Every other file adds to window.AB. Files are plain scripts (no modules) so the game
 * runs from the Family Arcade, a static host, or straight from disk. */
(function () {
  'use strict';
  var AB = window.AB = window.AB || {};

  AB.VERSION = '1.0.0';
  // Logical play-field size. Everything is drawn in these units and letterboxed to the screen.
  AB.W = 1280;
  AB.H = 900;

  var U = AB.util = {};
  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.dist = function (ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); };
  U.ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  U.easeOutBack = function (t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  U.rand = function (a, b) { return a + Math.random() * (b - a); };
  U.randi = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
  U.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  U.uid = function (prefix) {
    var s = '';
    try {
      var a = new Uint8Array(8); crypto.getRandomValues(a);
      for (var i = 0; i < a.length; i++) s += ('0' + a[i].toString(16)).slice(-2);
    } catch (e) { s = Math.random().toString(16).slice(2) + Date.now().toString(16); }
    return (prefix || 'id') + '_' + s;
  };
  // Seeded RNG so painted backgrounds look identical every visit.
  U.seeded = function (seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  };
  U.deepClone = function (o) { return JSON.parse(JSON.stringify(o)); };
  U.pointInPoly = function (x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };
  U.inEllipse = function (x, y, cx, cy, rx, ry) { var dx = (x - cx) / rx, dy = (y - cy) / ry; return dx * dx + dy * dy <= 1; };
  U.inRect = function (x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; };
  U.shade = function (hex, amt) {
    // amt -1..1 : darken (<0) or lighten (>0)
    var c = U.hexToRgb(hex), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    return 'rgb(' + Math.round((t - c.r) * p + c.r) + ',' + Math.round((t - c.g) * p + c.g) + ',' + Math.round((t - c.b) * p + c.b) + ')';
  };
  U.hexToRgb = function (hex) {
    if (hex.charAt(0) !== '#') {
      var m = hex.match(/\d+/g) || [0, 0, 0];
      return { r: +m[0], g: +m[1], b: +m[2] };
    }
    var h = hex.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  U.alpha = function (hex, a) { var c = U.hexToRgb(hex); return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')'; };

  // Tiny event bus.
  var handlers = {};
  AB.on = function (name, fn) { (handlers[name] = handlers[name] || []).push(fn); };
  AB.off = function (name, fn) { var l = handlers[name]; if (l) handlers[name] = l.filter(function (f) { return f !== fn; }); };
  AB.emit = function (name, a, b, c) {
    var l = handlers[name]; if (!l) return;
    l.slice().forEach(function (fn) { try { fn(a, b, c); } catch (e) { console.error('[AB] handler for', name, e); } });
  };

  // Registries so new content can be added by dropping in a file.
  AB.scenes = {};
  AB.registerScene = function (def) { AB.scenes[def.id] = def; };
  AB.minigames = {};
  AB.registerMinigame = function (def) { AB.minigames[def.id] = def; };

  AB.log = function () { if (AB.debug) console.log.apply(console, ['[AB]'].concat([].slice.call(arguments))); };
})();
