/* Aurora Bay — runs a minigame: picture tutorial → play (pause / exit any time) → results → coins.
 * Coins are awarded exactly once per finished round, through AB.game.addCoins. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, G = AB.game, I = AB.icons;
  var S = AB.shell = { inst: null, def: null, paused: false };
  var stage = document.getElementById('stage');
  var pauseBtn = null, tutNode = null, t0 = 0, finished = false, playT = 0;
  var MIN_COINS = 15, MAX_COINS = 150;

  AB.playMinigame = function (id) {
    var def = AB.minigames[id]; if (!def || !G.profile) return;
    AB.ui.closeAll();
    S.def = def; S.inst = null; S.paused = false; finished = false;
    AB.mode = 'minigame'; AB.ui.refreshHud();
    var dc = document.querySelector('.btn.purple'); // decorate button never shows here
    AB.audio.music('game');
    showTutorial(true);
  };

  function showTutorial(starting) {
    var def = S.def;
    var node = AB.ui.h('<div class="scrim"><div class="panel"><div class="panel-head"><h2>' + iconFor(def.id) + AB.ui.esc(def.title) + '</h2>' +
      '<button class="x" aria-label="Back">' + I.svg(starting ? 'arrowBack' : 'close') + '</button></div><div class="panel-body"><div class="tut"></div>' +
      '<div class="row center" style="margin-top:18px"><button class="btn green go" style="font-size:30px;min-height:84px;padding:12px 44px">' + I.svg('play') + (starting ? ' Play!' : ' Keep playing') + '</button></div>' +
      (G.profile.records[def.id] ? '<div class="row center muted" style="margin-top:10px;font-weight:900;font-size:18px">' + I.svg('star') + ' Best: ' + (G.profile.records[def.id].best || 0) + '</div>' : '') +
      '</div></div></div>');
    var tut = node.querySelector('.tut'), canvases = [];
    (def.tutorial || []).forEach(function (card, i) {
      var st = AB.ui.h('<div class="step"><canvas></canvas><div class="cap"><span class="n">' + (i + 1) + '</span>' + AB.ui.esc(card.caption) + '</div></div>');
      var c = st.querySelector('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1), w = 260, h = 174;
      c.width = w * dpr; c.height = h * dpr; c.style.width = w + 'px'; c.style.height = h + 'px';
      canvases.push({ c: c, card: card, dpr: dpr, w: w, h: h });
      tut.appendChild(st);
    });
    var running = true, start = performance.now();
    (function loop(now) {
      if (!running) return;
      var t = (now - start) / 1000;
      canvases.forEach(function (o) {
        var x = o.c.getContext('2d'); x.setTransform(o.dpr, 0, 0, o.dpr, 0, 0); x.clearRect(0, 0, o.w, o.h);
        x.save(); x.scale(o.w / 360, o.h / 240); x.beginPath(); x.rect(0, 0, 360, 240); x.clip();
        try { o.card.draw(x, 360, 240, t); } catch (e) { /* ignore */ }
        x.restore();
      });
      requestAnimationFrame(loop);
    })(start);
    function close() { running = false; AB.ui.close(node); tutNode = null; }
    node.querySelector('.go').addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('success'); close(); if (starting) begin(); else S.resume(); });
    node.querySelector('.x').addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('close'); close(); if (starting) S.exit(); else S.resume(); });
    tutNode = node;
    AB.ui.push(node, { sticky: true, noScrimClose: true, key: function (e) { if (e.key === 'Enter' || e.key === ' ') { node.querySelector('.go').click(); return true; } return false; } });
    AB.ui.speak(def.title + '. ' + (def.tutorial || []).map(function (c) { return c.caption; }).join('. '));
  }
  function iconFor(id) { return I.svg({ fishing: 'fish', sled: 'sled', cocoa: 'mug' }[id] || 'star'); }

  function begin() {
    var def = S.def, rec = G.profile.records[def.id] || { best: 0, plays: 0 };
    var host = {
      W: AB.W, H: AB.H, look: G.look(), petLook: G.activePet(), records: { best: rec.best || 0, plays: rec.plays || 0 }, safeTop: 110,
      sfx: function (n) { AB.audio.sfx(n); },
      music: function (n) { AB.audio.music(n); },
      finish: function (result) { if (!finished) { finished = true; setTimeout(function () { results(result); }, 350); } }
    };
    try { S.inst = def.create(host); } catch (e) { console.error(e); S.exit(); return; }
    playT = 0;
    pauseBtn = AB.ui.h('<div class="mg-pause"><button class="tool" aria-label="Pause">' + I.svg('pause') + '</button></div>');
    pauseBtn.querySelector('button').addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('tap'); S.pause(); });
    stage.appendChild(pauseBtn);
  }

  S.pause = function () {
    if (!S.inst || S.paused || finished) return;
    S.paused = true;
    var node = AB.ui.h('<div class="scrim"><div class="panel small"><div class="panel-head"><h2>' + I.svg('pause') + 'Paused</h2></div><div class="panel-body" style="display:flex;flex-direction:column;gap:14px">' +
      '<button class="btn green res" style="font-size:28px;min-height:80px">' + I.svg('play') + ' Keep playing</button>' +
      '<button class="btn yellow how">' + I.svg('hint') + ' How to play</button>' +
      '<button class="btn white ext">' + I.svg('arrowBack') + ' Leave game</button></div></div></div>');
    node.querySelector('.res').addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('tap'); AB.ui.close(node); S.resume(); });
    node.querySelector('.how').addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('tap'); AB.ui.close(node); showTutorial(false); });
    node.querySelector('.ext').addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('close'); AB.ui.close(node); S.exit(); });
    AB.ui.push(node, { sticky: true, noScrimClose: true, key: function (e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { node.querySelector('.res').click(); return true; } return false; } });
    AB.ui.speak('Paused');
  };
  S.resume = function () { S.paused = false; };
  S.exit = function () {
    if (S.inst && S.inst.destroy) try { S.inst.destroy(); } catch (e) { /* ignore */ }
    S.inst = null; S.def = null; S.paused = false;
    if (pauseBtn) { pauseBtn.remove(); pauseBtn = null; }
    AB.ui.closeAll();
    AB.mode = AB.world.scene ? 'world' : 'menu';
    if (AB.world.scene) { AB.audio.music(AB.world.scene.music); AB.world.player.path = []; }
    AB.ui.refreshHud();
    AB.emit('scene', AB.world.sceneId);
  };

  function results(result) {
    var def = S.def; if (!def) return;
    result = result || {};
    var coins = U.clamp(Math.round(result.coins || 0), MIN_COINS, MAX_COINS);
    if (pauseBtn) { pauseBtn.remove(); pauseBtn = null; }
    var best = G.recordMinigame(def.id, { score: result.score || 0, extra: def.id === 'fishing' ? { fish: fishCount(result) } : null });
    G.addCoins(coins, 'silent');
    AB.emit('minigame-done', def.id, result);
    AB.audio.sfx('success');
    var node = AB.ui.h('<div class="scrim"><div class="panel mid"><div class="panel-head"><h2>' + iconFor(def.id) + 'Great job, ' + AB.ui.esc(G.profile.name) + '!</h2></div>' +
      '<div class="panel-body results"><div class="me"></div><div class="big"><span class="coin"></span><span class="cnt">0</span></div>' +
      (best.newBest ? '<div class="best">' + I.svg('star') + ' New best!</div>' : '') +
      '<div class="stats"></div>' +
      '<div class="row center"><button class="btn yellow again">' + I.svg('rotate') + ' Play again</button><button class="btn green back">' + I.svg('check') + ' Done</button></div></div></div></div>');
    node.querySelector('.me').appendChild(AB.chars.portraitCanvas(G.look(), 150, { pose: 'happy', t: 0.2 }));
    var stats = node.querySelector('.stats');
    (result.stats || []).forEach(function (s) {
      var el = AB.ui.h('<div class="stat">' + I.svg(s.icon === 'flake' ? 'sparkle' : s.icon === 'mug' ? 'mug' : s.icon === 'fish' ? 'fish' : s.icon === 'time' ? 'pause' : s.icon === 'coin' ? 'star' : 'star') + '<span>' + AB.ui.esc(s.value) + '</span></div>');
      if (s.label) el.setAttribute('aria-label', s.label);
      stats.appendChild(el);
    });
    var cnt = node.querySelector('.cnt'), shown = 0;
    var timer = setInterval(function () { shown = Math.min(coins, shown + Math.max(1, Math.round(coins / 25))); cnt.textContent = shown; if (shown % 3 === 0) AB.audio.sfx('coin'); if (shown >= coins) clearInterval(timer); }, 45);
    node.querySelector('.again').addEventListener('click', function (e) { e.stopPropagation(); clearInterval(timer); AB.ui.close(node); var id = def.id; S.exit(); AB.playMinigame(id); });
    node.querySelector('.back').addEventListener('click', function (e) { e.stopPropagation(); clearInterval(timer); AB.ui.close(node); S.exit(); });
    AB.ui.push(node, { sticky: true, noScrimClose: true, key: function (e) { if (e.key === 'Enter' || e.key === 'Escape') { node.querySelector('.back').click(); return true; } return false; } });
    AB.ui.speak('Great job! You earned ' + coins + ' coins!');
    AB.ui.refreshHud();
  }
  function fishCount(r) { var n = 0; (r.stats || []).forEach(function (s) { if (s.icon === 'fish') n = Math.max(n, s.value || 0); }); return n; }

  S.frame = function (ctx, dt) {
    if (S.inst) {
      if (!S.paused && !finished && !AB.ui.hasModal()) { playT += dt; try { S.inst.update(dt); } catch (e) { console.error(e); } }
      try { S.inst.draw(ctx, AB.now); } catch (e) { console.error(e); }
    } else if (AB.world.scene) { AB.world.draw(ctx); ctx.fillStyle = 'rgba(15,22,48,0.35)'; ctx.fillRect(0, 0, AB.W, AB.H); }
  };
  S.pointer = function (type, x, y) { if (S.inst && !S.paused && !finished) try { S.inst.pointer(type, x, y); } catch (e) { console.error(e); } };
  S.key = function (type, k) {
    if (type === 'down' && (k === 'Escape' || k === 'p' || k === 'P')) { S.pause(); return; }
    if (S.inst && !S.paused && !finished) try { S.inst.key(type, k); } catch (e) { console.error(e); }
  };
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && AB.mode === 'minigame' && S.inst && !finished) S.pause(); });
})();
