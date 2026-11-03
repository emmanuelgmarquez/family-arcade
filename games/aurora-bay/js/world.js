/* Aurora Bay — the walkable world: scenes, pathfinding, characters, props, particles.
 *
 * Scene definition (AB.registerScene):
 *  { id, name, music, ambient, outdoor, snow, footprints, aurora,
 *    depth: [yFar, scaleFar, yNear, scaleNear],        // characters shrink toward the horizon
 *    paint(ctx, w, h)        static background (baked once)
 *    paintFront(ctx, w, h)   optional static foreground drawn over characters (baked)
 *    animate(ctx, t, G)      animated background bits (water, aurora, smoke...)
 *    overlay(ctx, t, G)      animated foreground bits
 *    walk: [[x,y]...]        walkable polygon;  blocks: [{e:[cx,cy,rx,ry]} | {r:[x,y,w,h]} | {p:[[x,y]...]}]
 *    props: [{ x, y, draw(ctx,t,prop), hit:[x,y,w,h], tap(prop) }]      y-sorted with characters
 *    hotspots: [{ id, hit:[x,y,w,h], at:[x,y], icon, label, show(), action() }]
 *    spawns: { default:[x,y], <fromSceneId>:[x,y] }
 *    onEnter(), update(dt) }
 */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art;
  var W = AB.world = {};
  var CELL = 20;

  W.scene = null; W.t = 0;
  W.player = null; W.npcs = []; W.pet = null; W.particles = []; W.prints = []; W.bubbles = []; W.pickups = [];
  W.hint = null; W.locked = false;
  var bgCache = {}, fgCache = {};

  // ------------------------------------------------------------------ scene entry
  W.enter = function (id, from, opts) {
    var sc = AB.scenes[id]; if (!sc) { console.warn('no scene', id); return; }
    opts = opts || {};
    W.scene = sc; W.sceneId = id;
    W.particles = []; W.prints = []; W.bubbles = []; W.pickups = []; W.hintShown = false;
    if (sc.prepare) sc.prepare(opts);
    buildGrid(sc);
    var sp = (opts.at) || (sc.spawns && (sc.spawns[from] || sc.spawns['default'])) || [640, 700];
    var G = AB.game;
    W.player = makeActor({ look: G.look(), x: sp[0], y: sp[1], speed: AB.chars.species[G.profile.species].speed, isPlayer: true, name: G.profile.name });
    W.player.dir = opts.dir || 1;
    W.snow = sc.snow ? new A.SnowField(70, AB.W, AB.H) : null;
    W.npcs = (AB.villagers && AB.villagers.forScene) ? AB.villagers.forScene(id) : [];
    W.pet = null;
    var pet = G.activePet();
    if (pet && sc.petsAllowed !== false && (G.profile.petFollow !== false || (id === 'igloo' && !G.visiting))) {
      W.pet = { pet: pet, x: sp[0] - 50, y: sp[1] + 10, dir: 1, moving: false, mood: 'idle', moodT: 0, t: 0 };
      if (!W.walkable(W.pet.x, W.pet.y)) { W.pet.x = sp[0]; W.pet.y = sp[1]; }
    }
    if (!bgCache[id]) bgCache[id] = bake(sc.paint);
    if (sc.paintFront && !fgCache[id]) fgCache[id] = bake(sc.paintFront);
    if (sc.onEnter) sc.onEnter(opts);
    if (AB.quests) AB.quests.placePickups(id);
    AB.audio.music(sc.music || null);
    AB.audio.ambient(sc.ambient || null);
    G.discover(id);
    AB.emit('scene', id);
  };
  W.invalidate = function (id) { if (id) { delete bgCache[id]; delete fgCache[id]; } else { bgCache = {}; fgCache = {}; } };
  function bake(fn) {
    var scale = Math.min(2, (window.devicePixelRatio || 1) * (AB.view ? AB.view.s : 1) * 1.05);
    scale = Math.max(1, scale);
    return A.bake(AB.W, AB.H, scale, fn);
  }

  // ------------------------------------------------------------------ walk grid & A*
  var grid = null, gw = 0, gh = 0;
  function blocked(sc, x, y) {
    var b = sc.blocks || [];
    for (var i = 0; i < b.length; i++) {
      var k = b[i];
      if (k.e && U.inEllipse(x, y, k.e[0], k.e[1], k.e[2], k.e[3])) return true;
      if (k.r && x >= k.r[0] && x <= k.r[0] + k.r[2] && y >= k.r[1] && y <= k.r[1] + k.r[3]) return true;
      if (k.p && U.pointInPoly(x, y, k.p)) return true;
      if (k.when && k.when() && k.dyn && U.inRect(x, y, k.dyn)) return true;
    }
    return false;
  }
  function buildGrid(sc) {
    gw = Math.ceil(AB.W / CELL); gh = Math.ceil(AB.H / CELL);
    grid = new Uint8Array(gw * gh);
    for (var j = 0; j < gh; j++) for (var i = 0; i < gw; i++) {
      var x = i * CELL + CELL / 2, y = j * CELL + CELL / 2;
      grid[j * gw + i] = (U.pointInPoly(x, y, sc.walk) && !blocked(sc, x, y)) ? 1 : 0;
    }
  }
  W.rebuildGrid = function () { if (W.scene) buildGrid(W.scene); };
  W.walkable = function (x, y) {
    var i = Math.floor(x / CELL), j = Math.floor(y / CELL);
    return i >= 0 && j >= 0 && i < gw && j < gh && grid[j * gw + i] === 1;
  };
  function nearestWalkable(x, y) {
    var ci = Math.floor(x / CELL), cj = Math.floor(y / CELL);
    for (var r = 0; r < 40; r++) {
      var best = null, bd = 1e9;
      for (var j = cj - r; j <= cj + r; j++) for (var i = ci - r; i <= ci + r; i++) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
        if (i < 0 || j < 0 || i >= gw || j >= gh || !grid[j * gw + i]) continue;
        var d = (i - ci) * (i - ci) + (j - cj) * (j - cj); if (d < bd) { bd = d; best = [i, j]; }
      }
      if (best) return [best[0] * CELL + CELL / 2, best[1] * CELL + CELL / 2];
    }
    return null;
  }
  W.nearestWalkable = nearestWalkable;
  function lineClear(ax, ay, bx, by) {
    var d = U.dist(ax, ay, bx, by), n = Math.ceil(d / (CELL / 2));
    for (var k = 1; k < n; k++) { var x = U.lerp(ax, bx, k / n), y = U.lerp(ay, by, k / n); if (!W.walkable(x, y)) return false; }
    return true;
  }
  function findPath(ax, ay, bx, by) {
    if (!W.walkable(bx, by)) { var nb = nearestWalkable(bx, by); if (!nb) return null; bx = nb[0]; by = nb[1]; }
    if (!W.walkable(ax, ay)) { var na = nearestWalkable(ax, ay); if (na) { ax = na[0]; ay = na[1]; } }
    if (lineClear(ax, ay, bx, by)) return [[bx, by]];
    var si = Math.floor(ax / CELL), sj = Math.floor(ay / CELL), ti = Math.floor(bx / CELL), tj = Math.floor(by / CELL);
    var N = gw * gh, g = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    var open = [sj * gw + si]; g[sj * gw + si] = 0;
    var h = function (i, j) { var dx = Math.abs(i - ti), dy = Math.abs(j - tj); return dx + dy - 0.6 * Math.min(dx, dy); };
    var f = {}; f[open[0]] = h(si, sj);
    var goal = tj * gw + ti, iter = 0;
    while (open.length && iter++ < 6000) {
      var bi = 0; for (var q = 1; q < open.length; q++) if (f[open[q]] < f[open[bi]]) bi = q;
      var cur = open.splice(bi, 1)[0];
      if (cur === goal) break;
      closed[cur] = 1;
      var ci = cur % gw, cj = (cur - ci) / gw;
      for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        var ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= gw || nj >= gh) continue;
        var nid = nj * gw + ni; if (!grid[nid] || closed[nid]) continue;
        if (di && dj && (!grid[cj * gw + ni] || !grid[nj * gw + ci])) continue;
        var ng = g[cur] + (di && dj ? 1.414 : 1);
        if (ng < g[nid]) { g[nid] = ng; came[nid] = cur; f[nid] = ng + h(ni, nj); if (open.indexOf(nid) < 0) open.push(nid); }
      }
    }
    if (came[goal] < 0) return null;
    var pts = [], c = goal;
    while (c >= 0 && c !== sj * gw + si) { pts.unshift([(c % gw) * CELL + CELL / 2, Math.floor(c / gw) * CELL + CELL / 2]); c = came[c]; }
    pts[pts.length - 1] = [bx, by];
    // string-pull
    var out = [], from = [ax, ay], idx = 0;
    while (idx < pts.length) {
      var far = idx;
      for (var k = pts.length - 1; k > idx; k--) if (lineClear(from[0], from[1], pts[k][0], pts[k][1])) { far = k; break; }
      out.push(pts[far]); from = pts[far]; idx = far + 1;
    }
    return out;
  }
  W.findPath = findPath;

  // ------------------------------------------------------------------ actors
  function makeActor(o) {
    return { look: o.look, x: o.x, y: o.y, path: [], speed: o.speed || 200, dir: 1, back: false, moving: false, t: Math.random() * 10,
      pose: 'stand', poseUntil: 0, isPlayer: !!o.isPlayer, name: o.name, onArrive: null, blinkOffset: Math.random() * 4, skate: false };
  }
  W.makeActor = makeActor;
  W.walkTo = function (actor, x, y, then) {
    var p = findPath(actor.x, actor.y, x, y);
    actor.onArrive = then || null;
    if (!p || !p.length) { actor.path = []; if (then && U.dist(actor.x, actor.y, x, y) < 260) { actor.onArrive = null; then(); } return false; }
    actor.path = p; actor.pose = 'stand';
    return true;
  };
  W.depthScale = function (y) {
    var d = W.scene && W.scene.depth || [300, 0.8, 880, 1.08];
    return U.lerp(d[1], d[3], U.clamp((y - d[0]) / (d[2] - d[0]), 0, 1));
  };
  var stepAcc = 0, footSide = 1;
  function moveActor(a, dt) {
    a.t += dt;
    if (a.poseUntil && W.t > a.poseUntil) { a.pose = 'stand'; a.poseUntil = 0; }
    if (!a.path.length) { a.moving = false; return; }
    if (a.pose === 'sit' || a.pose === 'sleep') a.pose = 'stand';
    var tgt = a.path[0], dx = tgt[0] - a.x, dy = tgt[1] - a.y, d = Math.sqrt(dx * dx + dy * dy);
    var sp = a.speed * (0.75 + 0.25 * W.depthScale(a.y)) * (a.skate ? 1.25 : 1);
    var stepLen = sp * dt;
    a.moving = true;
    if (Math.abs(dx) > 2) a.dir = dx > 0 ? 1 : -1;
    a.back = dy < -Math.abs(dx) * 1.2;
    if (d <= stepLen) {
      a.x = tgt[0]; a.y = tgt[1]; a.path.shift();
      if (!a.path.length) { a.moving = false; a.back = false; var cb = a.onArrive; a.onArrive = null; if (cb) cb(); }
    } else { a.x += dx / d * stepLen; a.y += dy / d * stepLen; }
    if (a.isPlayer && W.scene.footprints && a.moving) {
      stepAcc += stepLen;
      if (stepAcc > 30) { stepAcc = 0; footSide = -footSide; W.prints.push({ x: a.x + footSide * 7, y: a.y + 2, t: 0, sp: a.look.species, dir: a.dir }); if (W.prints.length > 90) W.prints.shift(); if (Math.random() < 0.5) AB.audio.sfx('step'); }
    }
  }

  // keyboard steering
  var keys = {};
  W.key = function (type, k) {
    if (type === 'down') keys[k] = true; else delete keys[k];
    if (type === 'down' && (k === 'Enter' || k === ' ')) W.interactNearest();
  };
  function keyMove(dt) {
    var p = W.player; if (!p || W.locked) return;
    var vx = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0);
    var vy = (keys.ArrowDown || keys.s || keys.S ? 1 : 0) - (keys.ArrowUp || keys.w || keys.W ? 1 : 0);
    if (!vx && !vy) return;
    var l = Math.sqrt(vx * vx + vy * vy), sp = p.speed * dt;
    var nx = p.x + vx / l * sp, ny = p.y + vy / l * sp * 0.8;
    p.path = []; p.onArrive = null;
    if (W.walkable(nx, ny)) { p.x = nx; p.y = ny; } else if (W.walkable(nx, p.y)) p.x = nx; else if (W.walkable(p.x, ny)) p.y = ny;
    p.moving = true; if (vx) p.dir = vx; p.back = vy < 0 && !vx;
    p.t += dt;
    W._keyMoved = true;
  }

  // ------------------------------------------------------------------ interaction
  function targets() {
    var list = [], sc = W.scene;
    W.pickups.forEach(function (pk) { if (!pk.gone && !pk.noTap) list.push({ kind: 'pickup', o: pk, x: pk.x, y: pk.y, hit: [pk.x - 45, pk.y - 70, 90, 95] }); });
    W.npcs.forEach(function (n) { var s = W.depthScale(n.y); list.push({ kind: 'npc', o: n, x: n.x, y: n.y, hit: [n.x - 48 * s, n.y - 115 * s, 96 * s, 125 * s] }); });
    if (W.pet) list.push({ kind: 'pet', o: W.pet, x: W.pet.x, y: W.pet.y, hit: [W.pet.x - 40, W.pet.y - 60, 80, 70] });
    (sc.hotspots || []).forEach(function (h) { if (!h.show || h.show()) list.push({ kind: 'hot', o: h, x: h.at[0], y: h.at[1], hit: h.hit }); });
    (sc.props || []).forEach(function (pr) { if (pr.tap && pr.hit && (!pr.show || pr.show())) list.push({ kind: 'prop', o: pr, x: pr.at ? pr.at[0] : pr.x, y: pr.at ? pr.at[1] : pr.y + 20, hit: pr.hit }); });
    return list;
  }
  W.targetAt = function (x, y) {
    var list = targets();
    for (var i = 0; i < list.length; i++) { var h = list[i].hit; if (x >= h[0] && x <= h[0] + h[2] && y >= h[1] && y <= h[1] + h[3]) return list[i]; }
    return null;
  };
  function activate(tg) {
    var p = W.player;
    if (tg.kind === 'pickup') W.walkTo(p, tg.o.x, tg.o.y + 4, function () { AB.quests.collect(tg.o); });
    else if (tg.kind === 'npc') {
      var n = tg.o, side = p.x < n.x ? -1 : 1;
      n.path = []; n.pauseUntil = W.t + 6;
      W.walkTo(p, n.x + side * 80, n.y + 6, function () { p.dir = -side; n.dir = side; AB.villagers.talk(n); });
    }
    else if (tg.kind === 'pet') W.walkTo(p, tg.o.x + 60, tg.o.y, function () { p.dir = -1; AB.petsUI && AB.petsUI.open(); });
    else if (tg.kind === 'hot') W.walkTo(p, tg.o.at[0], tg.o.at[1], function () { tg.o.action(); });
    else if (tg.kind === 'prop') W.walkTo(p, tg.x, tg.y, function () { tg.o.tap(tg.o); });
  }
  W.interactNearest = function () {
    if (W.locked || !W.player) return;
    var best = null, bd = 170;
    targets().forEach(function (tg) { var d = U.dist(W.player.x, W.player.y, tg.x, tg.y); if (d < bd) { bd = d; best = tg; } });
    if (best) activate(best);
  };
  var down = null;
  W.pointer = function (type, x, y) {
    if (W.locked || !W.player) return;
    if (type === 'down') { down = { x: x, y: y, t: performance.now() }; return; }
    if (type === 'up' && down) {
      var moved = U.dist(down.x, down.y, x, y), held = performance.now() - down.t;
      down = null;
      if (moved > 30 || held > 900) return; // drags and long presses never move the character
      var tg = W.targetAt(x, y);
      if (tg) { AB.audio.sfx('tap'); activate(tg); return; }
      W.player.onArrive = null;
      if (W.walkTo(W.player, x, y)) W.ripple(x, y);
    }
  };

  // ------------------------------------------------------------------ effects
  W.ripple = function (x, y) { W.particles.push({ k: 'ring', x: x, y: y, t: 0, life: 0.5 }); };
  W.burst = function (x, y, kind, n) {
    for (var i = 0; i < (n || 10); i++) {
      W.particles.push({ k: kind, x: x + U.rand(-10, 10), y: y + U.rand(-10, 10), vx: U.rand(-90, 90), vy: U.rand(-220, -60), t: 0, life: U.rand(0.7, 1.3), r: U.rand(3, 8), rot: U.rand(0, 6) });
    }
  };
  W.say = function (actor, text, dur) { W.bubbles = W.bubbles.filter(function (b) { return b.a !== actor; }); W.bubbles.push({ a: actor, text: text, t: 0, life: dur || 2.4 }); };
  W.setHint = function (h) { W.hint = h; };

  // ------------------------------------------------------------------ update
  W.update = function (dt) {
    if (!W.scene) return;
    W.t += dt;
    keyMove(dt);
    if (!W._keyMoved) moveActor(W.player, dt); else if (!keyIsDown()) { W._keyMoved = false; W.player.moving = false; W.player.back = false; }
    if (W.snow) W.snow.update(dt);
    // NPCs
    W.npcs.forEach(function (n) {
      moveActor(n, dt);
      if (n.wander && !n.path.length && (!n.pauseUntil || W.t > n.pauseUntil) && W.t > (n.nextWander || 0)) {
        n.nextWander = W.t + U.rand(3, 8);
        var w = n.wander, tx = U.rand(w[0], w[0] + w[2]), ty = U.rand(w[1], w[1] + w[3]);
        if (W.walkable(tx, ty)) W.walkTo(n, tx, ty);
      }
      var d = U.dist(n.x, n.y, W.player.x, W.player.y);
      if (d < 200 && W.t > (n.waveAt || 0) && !n.path.length) {
        n.waveAt = W.t + 25; n.pose = 'wave'; n.poseUntil = W.t + 1.6; n.dir = W.player.x > n.x ? 1 : -1;
        W.say(n, n.hello || 'Hi!', 2); AB.audio.sfx('hey');
      }
    });
    // pet follows
    if (W.pet) updatePet(dt);
    // particles
    W.particles = W.particles.filter(function (p) {
      p.t += dt; if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.k === 'heart' || p.k === 'note' ? -30 : 420) * dt; }
      return p.t < p.life;
    });
    W.prints.forEach(function (p) { p.t += dt; }); W.prints = W.prints.filter(function (p) { return p.t < 7; });
    W.bubbles = W.bubbles.filter(function (b) { b.t += dt; return b.t < b.life; });
    if (W.scene.update) W.scene.update(dt);
  };
  function keyIsDown() { return keys.ArrowRight || keys.ArrowLeft || keys.ArrowUp || keys.ArrowDown || keys.w || keys.a || keys.s || keys.d || keys.W || keys.A || keys.S || keys.D; }

  function updatePet(dt) {
    var pt = W.pet, p = W.player; pt.t += dt;
    if (pt.moodUntil && W.t > pt.moodUntil) { pt.mood = 'idle'; pt.moodUntil = 0; }
    if (pt.mood === 'love' || pt.mood === 'eat' || pt.mood === 'play') { pt.moving = false; return; }
    var tx = p.x - p.dir * 64, ty = p.y + 14;
    if (pt.target) { tx = pt.target[0]; ty = pt.target[1]; }
    var d = U.dist(pt.x, pt.y, tx, ty);
    if (d > 22) {
      var sp = (d > 200 ? 330 : 230) * dt;
      var nx = pt.x + (tx - pt.x) / d * Math.min(sp, d), ny = pt.y + (ty - pt.y) / d * Math.min(sp, d);
      if (W.walkable(nx, ny) || !W.walkable(pt.x, pt.y)) { pt.x = nx; pt.y = ny; }
      else if (d > 300) { var nw = nearestWalkable(tx, ty); if (nw) { pt.x = nw[0]; pt.y = nw[1]; } }
      pt.moving = true; pt.dir = tx > pt.x ? 1 : -1; pt.idleFor = 0;
      if (pt.mood === 'sleep') pt.mood = 'idle';
    } else {
      pt.moving = false; pt.idleFor = (pt.idleFor || 0) + dt;
      if (pt.idleFor > 20 && pt.mood === 'idle' && W.scene.id === 'igloo') pt.mood = 'sleep';
    }
  }
  W.petMood = function (mood, secs) { if (!W.pet) return; W.pet.mood = mood; W.pet.moodUntil = W.t + (secs || 2); };

  // ------------------------------------------------------------------ draw
  W.draw = function (ctx) {
    var sc = W.scene; if (!sc) return;
    var t = W.t, bg = bgCache[sc.id] || (bgCache[sc.id] = bake(sc.paint));
    if (bg) ctx.drawImage(bg, 0, 0, AB.W, AB.H);
    if (sc.aurora) A.aurora(ctx, AB.W, 30, 150, t, 0.3);
    if (sc.animate) sc.animate(ctx, t);
    // footprints
    W.prints.forEach(function (p) {
      var a = 0.55 * (1 - p.t / 7);
      ctx.fillStyle = 'rgba(120,145,195,' + a + ')';
      var s = W.depthScale(p.y);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 6 * s, 3.5 * s, 0, 0, Math.PI * 2); ctx.fill();
      if (p.sp === 'penguin' || p.sp === 'owl') { ctx.beginPath(); ctx.moveTo(p.x + p.dir * 4 * s, p.y); ctx.lineTo(p.x + p.dir * 11 * s, p.y - 3 * s); ctx.lineTo(p.x + p.dir * 11 * s, p.y + 3 * s); ctx.fill(); }
    });
    // hint marker on the ground
    if (W.hint && W.hint.scene === sc.id) drawHintRing(ctx, W.hint.x, W.hint.y, t);
    // y-sorted drawables
    var list = [];
    (sc.props || []).forEach(function (pr) { if (!pr.show || pr.show()) list.push({ y: pr.y, f: function () { pr.draw(ctx, t, pr); } }); });
    W.pickups.forEach(function (pk) { if (!pk.gone) list.push({ y: pk.y, f: function () { AB.quests.drawPickup(ctx, pk, t); } }); });
    W.npcs.forEach(function (n) { list.push({ y: n.y, f: function () { drawActor(ctx, n); } }); });
    if (W.pet) list.push({ y: W.pet.y, f: function () { drawPet(ctx, W.pet); } });
    if (W.player) list.push({ y: W.player.y, f: function () { drawActor(ctx, W.player); } });
    (W.extraDrawables || []).forEach(function (e) { list.push(e); });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (d) { d.f(); });
    if (fgCache[sc.id]) ctx.drawImage(fgCache[sc.id], 0, 0, AB.W, AB.H);
    if (sc.overlay) sc.overlay(ctx, t);
    // badges over interactive things
    drawBadges(ctx, t);
    if (W.player) drawNameTag(ctx, W.player);
    // particles
    W.particles.forEach(function (p) { drawParticle(ctx, p); });
    W.bubbles.forEach(function (b) { drawBubble(ctx, b); });
    if (W.snow) W.snow.draw(ctx);
  };
  function drawActor(ctx, a) {
    var s = W.depthScale(a.y) * (a.scaleMul || 1);
    AB.chars.draw(ctx, a.x, a.y, a.look, { t: a.t, moving: a.moving, dir: a.dir, back: a.back, scale: s, pose: a.pose, blinkOffset: a.blinkOffset, skate: a.skate });
    if (!a.isPlayer && a.id && AB.quests.npcNews && AB.quests.npcNews(a.id)) {
      var top = a.y - (Math.abs(AB.chars.species[a.look.species].anchors.top) + 46) * s - Math.abs(Math.sin(W.t * 3)) * 10;
      ctx.save(); ctx.translate(a.x, top); AB.icons.badge(ctx, 'talk'); ctx.restore();
    }
    if (!a.isPlayer && a.label) {
      ctx.font = '800 15px ' + AB.FONT; ctx.textAlign = 'center';
      var w = ctx.measureText(a.label).width + 16;
      ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.beginPath(); A.rrect(ctx, a.x - w / 2, a.y + 8, w, 22, 11); ctx.fill();
      ctx.fillStyle = A.C.out; ctx.textBaseline = 'middle'; ctx.fillText(a.label, a.x, a.y + 19.5);
    }
  }
  W.drawActor = drawActor;
  function drawNameTag(ctx, a) {
    var name = a.name || '';
    ctx.font = '800 16px ' + AB.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var w = ctx.measureText(name).width + 22, y = a.y + 12;
    ctx.fillStyle = 'rgba(38,50,77,0.78)'; ctx.beginPath(); A.rrect(ctx, a.x - w / 2, y, w, 24, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(name, a.x, y + 12.5);
  }
  function drawPet(ctx, pt) {
    if (!AB.pets) return;
    var s = W.depthScale(pt.y);
    AB.pets.draw(ctx, pt.x, pt.y, pt.pet, { t: pt.t, moving: pt.moving, dir: pt.dir, scale: s, mood: pt.mood });
    if (pt.mood === 'sleep') AB.pets.bubble(ctx, pt.x + 16, pt.y - 52 * s, 'zzz', pt.t);
  }
  function drawHintRing(ctx, x, y, t) {
    var r = 46 + Math.sin(t * 4) * 6;
    ctx.save(); ctx.strokeStyle = 'rgba(255,215,90,0.9)'; ctx.lineWidth = 5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    var by = y - 130 - Math.abs(Math.sin(t * 3)) * 18;
    A.poly(ctx, [x - 18, by, x + 18, by, x, by + 26], '#ffcf4a', 3);
    A.box(ctx, x - 8, by - 24, 16, 26, 4, '#ffcf4a', 3);
  }
  W.drawHintRing = drawHintRing;
  function drawBadges(ctx, t) {
    var sc = W.scene, p = W.player;
    (sc.hotspots || []).forEach(function (h) {
      if (h.show && !h.show()) return;
      if (!h.icon) return;
      var bx = h.badge ? h.badge[0] : h.hit[0] + h.hit[2] / 2, by = h.badge ? h.badge[1] : h.hit[1] - 6;
      var near = p && U.dist(p.x, p.y, h.at[0], h.at[1]) < 220;
      var bob = Math.sin(t * 3 + bx) * 4, sc2 = near ? 1.1 : 0.85;
      ctx.save(); ctx.translate(bx, by + bob); ctx.scale(sc2, sc2);
      ctx.globalAlpha = near ? 1 : 0.85;
      AB.icons.badge(ctx, h.icon);
      ctx.restore();
    });
  }
  function drawParticle(ctx, p) {
    var a = 1 - p.t / p.life;
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    if (p.k === 'ring') { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; var r = 10 + p.t * 70; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.42, 0, 0, Math.PI * 2); ctx.stroke(); }
    else if (p.k === 'snow') { A.circle(ctx, p.x, p.y, p.r * (1 + p.t), '#ffffff', 0); }
    else if (p.k === 'heart') { A.heart(ctx, p.x, p.y, 9, '#ff6f91', 2); }
    else if (p.k === 'star') { A.star(ctx, p.x, p.y, p.r + 4, '#ffcf4a', 2); }
    else if (p.k === 'sparkle') { A.sparkle(ctx, p.x, p.y, p.r + 4, a); }
    else if (p.k === 'note') { ctx.fillStyle = A.C.out; ctx.font = '900 26px ' + AB.FONT; ctx.fillText('♪', p.x, p.y); }
    else if (p.k === 'coin') { A.coin(ctx, p.x, p.y, 10, p.t * 8); }
    ctx.restore();
  }
  function drawBubble(ctx, b) {
    var a = b.a, s = W.depthScale(a.y), top = a.y - (Math.abs(AB.chars.species[a.look.species].anchors.top) + 30) * s;
    var pop = Math.min(1, b.t * 6), fade = b.life - b.t < 0.3 ? (b.life - b.t) / 0.3 : 1;
    ctx.save(); ctx.globalAlpha = fade; ctx.translate(a.x, top); ctx.scale(pop, pop);
    ctx.font = '800 20px ' + AB.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var w = Math.max(60, ctx.measureText(b.text).width + 30);
    ctx.beginPath(); A.rrect(ctx, -w / 2, -42, w, 40, 18); ctx.moveTo(-8, -3); ctx.lineTo(0, 10); ctx.lineTo(8, -3);
    A.fs(ctx, '#ffffff', 3);
    ctx.fillStyle = A.C.out; ctx.fillText(b.text, 0, -21);
    ctx.restore();
  }
})();
