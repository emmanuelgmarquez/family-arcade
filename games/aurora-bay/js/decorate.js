/* Aurora Bay — igloo decorating. While decorating, the character can't move: touches only pick up
 * and drag furniture, so walking and dragging never mix. Only the active child's own igloo can be edited. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, G = AB.game, I = AB.icons;
  var D = AB.decorate = { selected: null };
  var IG = AB.iglooRoom;
  var stage = document.getElementById('stage');
  var topBar = null, tray = null, selTools = null, decoBtn = null;
  var drag = null, tab = 'floor';

  function placed() { return G.profile.igloo.placed; }
  function save() { AB.store.saveSoon(G.profile); }

  // ------------------------------------------------------------ the big "Decorate" button in your own igloo
  function showDecoBtn() {
    var want = AB.mode === 'world' && AB.world.sceneId === 'igloo' && G.canEdit();
    if (want && !decoBtn) {
      decoBtn = UIh('<button class="btn purple" style="position:absolute;left:50%;transform:translateX(-50%);top:calc(14px + var(--sat));z-index:6;font-size:24px">' + I.svg('paint') + ' Decorate</button>');
      decoBtn.addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('tap'); D.enter(); });
      stage.appendChild(decoBtn);
    } else if (!want && decoBtn) { decoBtn.remove(); decoBtn = null; }
  }
  function UIh(s) { return AB.ui.h(s); }
  AB.on('scene', function () { setTimeout(showDecoBtn, 0); });
  AB.on('profile', function () { setTimeout(showDecoBtn, 0); });
  setInterval(showDecoBtn, 500);

  D.openFromAnywhere = function () {
    if (G.visiting) AB.visitEnd();
    if (AB.world.sceneId === 'igloo') { D.enter(); return; }
    AB.go('igloo', 'map');
    var once = function (id) { if (id === 'igloo') { AB.off('scene', once); setTimeout(D.enter, 450); } };
    AB.on('scene', once);
  };

  // ------------------------------------------------------------ enter / exit
  D.enter = function () {
    if (!G.canEdit() || AB.world.sceneId !== 'igloo') return;
    AB.ui.closeAll();
    AB.mode = 'decorate'; D.selected = null;
    var p = AB.world.player; p.path = []; p.onArrive = null; p.moving = false;
    AB.ui.refreshHud(); showDecoBtn();
    topBar = UIh('<div class="deco-top"><div class="btn white" style="pointer-events:none">' + I.svg('paint') + ' Decorating</div><button class="btn green done">' + I.svg('check') + ' Done</button></div>');
    topBar.querySelector('.done').addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('success'); D.exit(); });
    stage.appendChild(topBar);
    tray = UIh('<div class="deco-tray"><div class="tabs">' +
      tabBtn('floor', 'sofa', 'Things') + tabBtn('rug', 'box', 'Rugs') + tabBtn('wall', 'camera', 'Wall') + tabBtn('pet', 'paw', 'Pet') + tabBtn('style', 'paint', 'Room') +
      '</div><div class="deco-items"></div></div>');
    tray.querySelectorAll('.tab').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('tap'); tab = b.dataset.t; fillTray(); }); });
    stage.appendChild(tray);
    fillTray();
    setTimeout(updateLimit, 0);
    if (!G.profile.found.decoTip) { G.markFound('decoTip'); AB.ui.toast(I.svg('hint') + ' Tap a thing below to add it. Drag things to move them!'); AB.ui.speak('Tap a thing below to add it. Drag things to move them!'); }
  };
  function tabBtn(id, icon, label) { return '<button class="tab" data-t="' + id + '">' + I.svg(icon) + label + '</button>'; }
  /** Furniture must stay above the tray so it can always be grabbed again. */
  function updateLimit() {
    if (!tray) { IG.limitY = null; return; }
    var r = tray.getBoundingClientRect();
    IG.limitY = AB.toLogical(0, r.top).y - 12;
  }
  AB.on('resize', function () { if (tray) updateLimit(); });
  D.exit = function () {
    select(null); IG.limitY = null;
    if (topBar) topBar.remove(); if (tray) tray.remove(); topBar = tray = null;
    AB.mode = 'world';
    AB.scenes.igloo.rebuild(); AB.world.rebuildGrid();
    var p = AB.world.player;
    if (!AB.world.walkable(p.x, p.y)) { var n = AB.world.nearestWalkable(p.x, p.y); if (n) { p.x = n[0]; p.y = n[1]; } }
    AB.store.saveNow(G.profile);
    AB.ui.refreshHud(); showDecoBtn();
  };

  // ------------------------------------------------------------ tray
  function catOf(f) { return f.place === 'rug' ? 'rug' : f.place === 'wall' ? 'wall' : f.cat === 'pet' ? 'pet' : 'floor'; }
  function fillTray() {
    if (!tray) return;
    tray.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('on', b.dataset.t === tab); });
    var box = tray.querySelector('.deco-items'); box.innerHTML = '';
    if (tab === 'style') { fillStyles(box); return; }
    var any = false;
    Object.keys(AB.furniture).forEach(function (id) {
      var f = AB.furniture[id]; if (catOf(f) !== tab) return;
      var n = G.storageCount(id); if (n <= 0) return;
      any = true;
      var c = UIh('<button class="card"><div class="lbl">' + AB.ui.esc(f.name) + '</div><span class="tag count">×' + n + '</span></button>');
      c.insertBefore(AB.ui.pic(['furn', id], 84), c.firstChild);
      c.addEventListener('click', function (e) { e.stopPropagation(); addItem(id); });
      box.appendChild(c);
    });
    if (!any) {
      var shop = UIh('<div class="row" style="padding:10px"><div class="note" style="font-size:18px">Everything here is in your room! Get more at the Shop.</div></div>');
      box.appendChild(shop);
    }
  }
  function fillStyles(box) {
    var ig = G.profile.igloo, RS = AB.roomStyles;
    ['wall', 'floor', 'window'].forEach(function (kind) {
      Object.keys(RS[kind]).forEach(function (id) {
        if (!G.profile.owned.styles[kind + '_' + id]) return;
        var on = ig[kind] === id;
        var c = UIh('<button class="card' + (on ? ' sel' : '') + '"><div class="lbl">' + AB.ui.esc(RS[kind][id].name) + '</div></button>');
        c.insertBefore(styleCanvas(kind, id, 84), c.firstChild);
        c.addEventListener('click', function (e) {
          e.stopPropagation(); AB.audio.sfx('place');
          ig[kind] = id; save(); AB.world.invalidate('igloo'); fillTray();
        });
        box.appendChild(c);
      });
    });
    box.appendChild(UIh('<div class="note" style="align-self:center;padding:0 10px;min-width:160px">More walls, floors and windows are in the Shop\'s furniture book.</div>'));
  }
  function styleCanvas(kind, id, px) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), c = document.createElement('canvas');
    c.width = px * dpr; c.height = px * dpr; c.style.width = px + 'px'; c.style.height = px + 'px';
    var x = c.getContext('2d'); x.scale(dpr, dpr);
    AB.ui.drawStyle(x, kind, id, px);
    return c;
  }

  function addItem(id) {
    if (G.storageCount(id) <= 0) return;
    var f = AB.furniture[id];
    var pl = { uid: U.uid('f'), item: id, x: 640 + U.rand(-120, 120), y: f.place === 'wall' ? 250 : f.place === 'rug' ? 640 : 650, flip: false, rot: 0 };
    IG.clamp(pl);
    placed().push(pl);
    AB.scenes.igloo.rebuild();
    AB.audio.sfx('place'); AB.world.burst(pl.x, pl.y - 30, 'sparkle', 6);
    select(pl); save(); fillTray();
  }
  function store(pl) {
    var list = placed(), i = list.indexOf(pl); if (i < 0) return;
    list.splice(i, 1); select(null);
    AB.scenes.igloo.rebuild(); AB.audio.sfx('pop'); save(); fillTray();
  }

  // ------------------------------------------------------------ selection tools
  function select(pl) {
    D.selected = pl;
    if (selTools) { selTools.remove(); selTools = null; }
    if (!pl) return;
    var f = AB.furniture[pl.item];
    selTools = UIh('<div class="sel-tools"></div>');
    if (f.flip !== false) addTool('flip', 'Flip', function () { pl.flip = !pl.flip; AB.audio.sfx('soft'); IG.clamp(pl); save(); });
    if (f.rotate) addTool('rotate', 'Turn', function () { pl.rot = ((pl.rot || 0) + 1) % 4; AB.audio.sfx('soft'); IG.clamp(pl); save(); });
    addTool('box', 'Put away', function () { store(pl); });
    stage.appendChild(selTools);
    positionTools();
    function addTool(icon, label, fn) {
      var b = UIh('<button class="tool" aria-label="' + label + '">' + I.svg(icon) + '</button>');
      b.addEventListener('click', function (e) { e.stopPropagation(); fn(); positionTools(); });
      selTools.appendChild(b);
    }
  }
  function itemBox(pl) {
    var f = AB.furniture[pl.item], b = AB.furnitureBox ? AB.furnitureBox(pl.item, pl.rot || 0) : { w: f.w, h: f.h };
    if (f.place === 'floor') return { x: pl.x - b.w / 2, y: pl.y - b.h, w: b.w, h: b.h };
    return { x: pl.x - b.w / 2, y: pl.y - b.h / 2, w: b.w, h: b.h };
  }
  function positionTools() {
    if (!selTools || !D.selected) return;
    var b = itemBox(D.selected), top = AB.toScreen(b.x + b.w / 2, b.y - 12), bottom = AB.toScreen(b.x + b.w / 2, b.y + b.h + 16);
    var y = top.y - 70;
    if (y < 80) y = bottom.y;
    selTools.style.left = U.clamp(top.x, 120, window.innerWidth - 120) + 'px';
    selTools.style.top = y + 'px';
  }

  // ------------------------------------------------------------ pointer
  function hitTest(x, y) {
    var list = placed().slice();
    var order = function (pl) { var f = AB.furniture[pl.item]; return f.place === 'rug' ? 0 : f.place === 'wall' ? 1 : 2; };
    list.sort(function (a, b) { return order(b) - order(a) || b.y - a.y; });
    for (var i = 0; i < list.length; i++) {
      var r = itemBox(list[i]), pad = 14;
      if (x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad) return list[i];
    }
    return null;
  }
  D.pointer = function (type, x, y) {
    if (type === 'down') {
      var pl = hitTest(x, y);
      if (pl) { select(pl); drag = { pl: pl, dx: pl.x - x, dy: pl.y - y, moved: false }; AB.audio.sfx('tap'); }
      else { select(null); drag = null; }
    } else if (type === 'move' && drag) {
      drag.pl.x = x + drag.dx; drag.pl.y = y + drag.dy; drag.moved = true;
      IG.clamp(drag.pl); positionTools();
    } else if (type === 'up' && drag) {
      if (drag.moved) { IG.clamp(drag.pl); AB.audio.sfx('place'); save(); }
      drag = null; positionTools();
    }
  };
  D.key = function (e) {
    var pl = D.selected;
    if (e.key === 'Escape' || e.key === 'Enter') { D.exit(); return; }
    if (!pl) return;
    var step = 12, m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (m) { pl.x += m[0]; pl.y += m[1]; IG.clamp(pl); positionTools(); save(); e.preventDefault(); }
    if (e.key === 'f' || e.key === 'F') { pl.flip = !pl.flip; save(); }
    if (e.key === 'r' || e.key === 'R') { var f = AB.furniture[pl.item]; if (f.rotate) { pl.rot = ((pl.rot || 0) + 1) % 4; IG.clamp(pl); save(); } }
    if (e.key === 'Delete' || e.key === 'Backspace') store(pl);
  };
  D.update = function () { positionTools(); };
  D.draw = function (ctx) {
    var t = AB.world.t;
    // the doorway stays clear
    if (drag) {
      var d = IG.DOOR;
      ctx.save(); ctx.fillStyle = 'rgba(226,87,76,0.18)'; ctx.strokeStyle = 'rgba(226,87,76,0.6)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 3;
      ctx.beginPath(); A.rrect(ctx, d.x, d.y, d.w, d.h, 16); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    if (D.selected) {
      var b = itemBox(D.selected);
      ctx.save(); ctx.strokeStyle = '#ffcf4a'; ctx.lineWidth = 5; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); A.rrect(ctx, b.x - 10, b.y - 10, b.w + 20, b.h + 20, 16); ctx.stroke(); ctx.restore();
    }
  };
})();
