/* Aurora Bay — boot, the frame loop, input routing and scene travel. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util;
  var canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  var view = AB.view = { s: 1, ox: 0, oy: 0, dpr: 1, w: 0, h: 0 };
  // mode: 'menu' (title/profile screens), 'world', 'decorate', 'minigame'
  AB.mode = 'menu';

  function resize() {
    var w = window.innerWidth, h = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    view.w = w; view.h = h; view.dpr = dpr;
    view.s = Math.min(w / AB.W, h / AB.H);
    view.ox = Math.round((w - AB.W * view.s) / 2); view.oy = Math.round((h - AB.H * view.s) / 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    var rot = document.getElementById('rotate'); if (rot) rot.classList.toggle('want', AB.mode !== 'menu');
    AB.emit('resize');
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
  resize();
  AB.toLogical = function (cx, cy) { return { x: (cx - view.ox) / view.s, y: (cy - view.oy) / view.s }; };
  AB.toScreen = function (x, y) { return { x: x * view.s + view.ox, y: y * view.s + view.oy }; };

  // ------------------------------------------------------------------ input
  // Only the canvas receives world input; menus are HTML on top and stop events themselves.
  var activePointer = null;
  function route(type, e) {
    var p = AB.toLogical(e.clientX, e.clientY);
    if (AB.mode === 'world') AB.world.pointer(type, p.x, p.y);
    else if (AB.mode === 'decorate') AB.decorate.pointer(type, p.x, p.y, e);
    else if (AB.mode === 'minigame') AB.shell.pointer(type, p.x, p.y);
  }
  canvas.addEventListener('pointerdown', function (e) {
    AB.audio.unlock();
    if (activePointer !== null && activePointer !== e.pointerId) return; // ignore second fingers
    activePointer = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    e.preventDefault(); route('down', e);
  });
  canvas.addEventListener('pointermove', function (e) { if (e.pointerId !== activePointer && AB.mode !== 'minigame') return; e.preventDefault(); route('move', e); });
  function up(e) { if (e.pointerId !== activePointer) return; activePointer = null; route('up', e); }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  document.addEventListener('pointerdown', function () { AB.audio.unlock(); }, true);
  // stop iOS page scroll / bounce / pinch-zoom while playing
  document.addEventListener('touchmove', function (e) { if (!e.target.closest || !e.target.closest('.panel-body, .deco-items, .opts')) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });

  window.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    AB.audio.unlock();
    if (e.key === 'Escape') { if (AB.ui.closeTop()) { e.preventDefault(); return; } }
    if (AB.ui.hasModal()) { if (AB.ui.modalKey(e)) e.preventDefault(); return; }
    if (AB.mode === 'world') {
      if (e.key === 'm' || e.key === 'M') { AB.ui.openMap(); return; }
      if (e.key === 'i' || e.key === 'I' || e.key === 'b' || e.key === 'B') { AB.ui.openBag(); return; }
      if (e.key === 'q' || e.key === 'Q' || e.key === 'j' || e.key === 'J') { AB.ui.openQuests(); return; }
      if (e.key === 'h' || e.key === 'H') { AB.goHome(); return; }
      if (/^Arrow/.test(e.key) || e.key === ' ') e.preventDefault();
      AB.world.key('down', e.key);
    } else if (AB.mode === 'minigame') { if (/^Arrow/.test(e.key) || e.key === ' ') e.preventDefault(); AB.shell.key('down', e.key); }
    else if (AB.mode === 'decorate') AB.decorate.key(e);
  });
  window.addEventListener('keyup', function (e) {
    if (AB.mode === 'world') AB.world.key('up', e.key);
    else if (AB.mode === 'minigame') AB.shell.key('up', e.key);
  });

  // ------------------------------------------------------------------ travel
  var fade = document.getElementById('fade'), travelling = false;
  AB.go = function (sceneId, from, opts) {
    if (travelling || !AB.scenes[sceneId]) return;
    travelling = true; AB.world.locked = true;
    AB.ui.closeAll();
    fade.classList.add('on');
    setTimeout(function () {
      try { AB.world.enter(sceneId, from, opts); } catch (e) { console.error(e); }
      AB.mode = 'world';
      AB.ui.refreshHud();
      setTimeout(function () { fade.classList.remove('on'); travelling = false; AB.world.locked = false; }, 60);
    }, 300);
  };
  AB.goHome = function () {
    if (AB.game.visiting) AB.visitEnd();
    if (AB.world.sceneId === 'igloo') return;
    AB.go('igloo', 'map');
  };
  /** Visit another child's igloo as a guest. Never changes the active profile. */
  AB.visit = function (ownerId) {
    var owner = AB.store.get(ownerId);
    if (!owner || owner.id === AB.game.profile.id) { AB.go('igloo', 'iglooLane'); return; }
    AB.game.visiting = U.deepClone(owner);   // a read-only copy: nothing we do can reach the real save
    AB.go('igloo', 'iglooLane');
  };
  AB.visitEnd = function () { AB.game.visiting = null; AB.ui.refreshHud(); };

  // ------------------------------------------------------------------ frame loop
  var last = performance.now(), titleT = 0, titleSnow = new AB.art.SnowField(90, AB.W, AB.H);
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    AB.now = now / 1000;
    if (document.visibilityState !== 'hidden') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(view.s * view.dpr, 0, 0, view.s * view.dpr, view.ox * view.dpr, view.oy * view.dpr);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, AB.W, AB.H); ctx.clip();
      try {
        if (AB.mode === 'world' || AB.mode === 'decorate') {
          if (!AB.ui.pausesWorld()) AB.world.update(dt);
          if (AB.mode === 'decorate') AB.decorate.update(dt);
          AB.world.draw(ctx);
          if (AB.mode === 'decorate') AB.decorate.draw(ctx);
        } else if (AB.mode === 'minigame') {
          AB.shell.frame(ctx, dt);
        } else {
          titleT += dt; titleSnow.update(dt); drawTitle(ctx, titleT);
        }
      } catch (e) { console.error(e); }
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  var titleBg = null;
  function drawTitle(ctx, t) {
    if (!titleBg) titleBg = AB.art.bake(AB.W, AB.H, Math.max(1, Math.min(2, view.dpr * view.s)), function (c) {
      AB.kit.skyAndMountains(c, 520, 21); AB.kit.treeline(c, 585, 5, 34, 40, 80); AB.kit.snowGround(c, 570);
      AB.art.igloo(c, 300, 760, 1.05, {}); AB.art.igloo(c, 1010, 740, 0.85, { tint: '#d9e6fb' });
      AB.art.pine(c, 120, 800, 210); AB.art.pine(c, 1180, 820, 230); AB.art.pine(c, 520, 700, 120);
    });
    ctx.drawImage(titleBg, 0, 0, AB.W, AB.H);
    AB.art.aurora(ctx, AB.W, 60, 260, t, 0.42);
    AB.kit.smoke(ctx, 330, 650, t);
    titleSnow.draw(ctx);
  }

  // ------------------------------------------------------------------ Family Arcade integration
  // Inside the arcade, its round return button sits in a corner the family chose. Move our own
  // corner controls aside so the two never overlap.
  function arcadeCorner() {
    var c = null;
    try { if (window.FamilyArcade && window.parent !== window) { var b = window.parent.document.querySelector('.home-btn'); c = b && b.dataset.corner; } } catch (e) { c = null; }
    ['tl', 'tr', 'bl', 'br'].forEach(function (k) { document.body.classList.toggle('fa-' + k, c === k); });
  }
  if (window.FamilyArcade) { arcadeCorner(); setInterval(arcadeCorner, 1500); }

  // ------------------------------------------------------------------ boot
  AB.boot = function () {
    AB.store.init().then(function () {
      var s = AB.store.meta.settings;
      AB.audio.setMusic(s.music !== false); AB.audio.setSound(s.sound !== false);
      document.getElementById('boot').classList.add('gone');
      AB.ui.whoScreen();
      AB.audio.music('title');
    }).catch(function (e) {
      console.error(e);
      document.querySelector('#boot .boot-sub').textContent = 'Something went wrong loading saves. Please reload.';
    });
  };
  // Offline support when hosted on its own. Inside Family Arcade the arcade does this (and blocks games from registering workers).
  if (!window.FamilyArcade && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline play just won't be available */ });
  }
  requestAnimationFrame(frame);
  AB.boot();
})();
