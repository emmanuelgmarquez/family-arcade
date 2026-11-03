/* Aurora Bay — shop catalogs (with previews and purchase confirmation) and pet adoption / care. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, G = AB.game, CH = AB.chars, I = AB.icons, UI = AB.ui;
  var h = UI.h, esc = UI.esc;

  function cv(px) { var dpr = Math.min(2, window.devicePixelRatio || 1), c = document.createElement('canvas'); c.width = px * dpr; c.height = px * dpr; c.style.width = px + 'px'; c.style.height = px + 'px'; var x = c.getContext('2d'); x.scale(dpr, dpr); return { c: c, x: x }; }

  /** Preview of a wall / floor / window style in a square. */
  UI.drawStyle = function (x, kind, id, px) {
    var RS = AB.roomStyles, s = RS[kind] && RS[kind][id]; if (!s) return;
    x.save();
    if (kind === 'window') {
      x.fillStyle = '#dce9fb'; x.fillRect(0, 0, px, px);
      var k = px / 150; x.scale(k, k); try { s.draw(x, 75, 75, 1); } catch (e) { /* ignore */ }
    } else {
      x.beginPath(); x.rect(0, 0, px, px); x.clip();
      var IG = AB.iglooRoom, box = kind === 'wall' ? IG.WALL : IG.FLOOR;
      var sc = px / 260; x.scale(sc, sc); x.translate(-(box.x + box.w / 2 - 130), -(box.y + box.h / 2 - 130));
      try { s.paint(x, box); } catch (e) { /* ignore */ }
    }
    x.restore();
    x.strokeStyle = '#26324d'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, px - 3, px - 3);
  };

  // ------------------------------------------------------------ catalogs
  var CLOTHES_TABS = [['head', 'Hats', 'star'], ['face', 'Glasses', 'eye'], ['neck', 'Scarves', 'heart'], ['body', 'Sweaters', 'shirt']];
  var FURN_TABS = [['floor', 'Things', 'sofa'], ['rug', 'Rugs', 'box'], ['wall', 'Wall', 'camera'], ['pet', 'Pet', 'paw'], ['style', 'Room', 'paint']];
  function furnCat(f) { return f.place === 'rug' ? 'rug' : f.place === 'wall' ? 'wall' : f.cat === 'pet' ? 'pet' : 'floor'; }

  UI.openCatalog = function (kind, tab) {
    var clothes = kind === 'clothes', tabs = clothes ? CLOTHES_TABS : FURN_TABS;
    tab = tab || tabs[0][0];
    var tabsHtml = '<div class="tabs">' + tabs.map(function (t) { return '<button class="tab" data-t="' + t[0] + '">' + I.svg(t[2]) + t[1] + '</button>'; }).join('') + '</div>';
    var coinsHtml = '<div class="chip" style="min-height:52px;padding:4px 14px"><span class="co" style="margin:0"><span class="coin"></span><span class="cc">' + G.profile.coins + '</span></span></div>';
    var node = UI.panel(clothes ? 'Clothes book' : 'Furniture book', clothes ? 'shirt' : 'sofa', '', { tabs: tabsHtml, headExtra: coinsHtml });
    var body = node.querySelector('.panel-body');
    function show(t) {
      tab = t;
      node.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
      node.querySelector('.cc').textContent = G.profile.coins;
      body.innerHTML = ''; var grid = h('<div class="catalog-pages"></div>'); body.appendChild(grid);
      if (clothes) {
        Object.keys(CH.clothes).forEach(function (id) {
          var it = CH.clothes[id], price = G.priceOf('clothes', id);
          if (it.slot !== t || price < 0) return;
          grid.appendChild(card(UI.itemCanvas(id, 104, G.look()), it.name, price, G.owns('clothes', id) ? 'owned' : null, function () { buyClothes(id); }));
        });
      } else if (t === 'style') {
        ['wall', 'floor', 'window'].forEach(function (k) {
          Object.keys(AB.roomStyles[k]).forEach(function (id) {
            var key = k + '_' + id, s = AB.roomStyles[k][id], c = cv(104);
            UI.drawStyle(c.x, k, id, 104);
            grid.appendChild(card(c.c, s.name, s.price, G.owns('styles', key) ? 'owned' : null, function () { buyStyle(k, id); }));
          });
        });
      } else {
        Object.keys(AB.furniture).sort(function (a, b) { return AB.furniture[a].price - AB.furniture[b].price; }).forEach(function (id) {
          var f = AB.furniture[id]; if (furnCat(f) !== t) return;
          var n = G.profile.owned.furniture[id] || 0;
          grid.appendChild(card(UI.pic(['furn', id], 104), f.name, f.price, n ? '×' + n : null, function () { buyFurniture(id); }));
        });
      }
    }
    function card(canvas, name, price, tag, fn) {
      var c = h('<button class="card' + (tag === 'owned' ? ' owned' : '') + '"><div class="lbl">' + esc(name) + '</div><div class="price"><span class="coin"></span>' + price + '</div>' +
        (tag ? '<span class="tag' + (tag === 'owned' ? '' : ' count') + '">' + (tag === 'owned' ? I.svg('check') : tag) + '</span>' : '') + '</button>');
      c.insertBefore(canvas, c.firstChild);
      c.addEventListener('click', function (e) { e.stopPropagation(); if (performance.now() - (UI.lastConfirm || 0) < 600) return; AB.audio.sfx('tap'); fn(); });
      return c;
    }
    function afford(price, art, thing) {
      var p = G.profile;
      if (p.coins >= price) return true;
      UI.dialog({ name: 'Tilly', look: AB.villagers.look('tilly') }, 'You need ' + (price - p.coins) + ' more coins for that. Play games to earn coins!',
        { pics: [['coin'], ['icon', 'fish', '#35b5a4'], ['icon', 'sled', '#e2574c'], ['icon', 'mug', '#c96a4a']] });
      return false;
    }
    function confirmBuy(art, name, price, onYes) {
      var p = G.profile;
      var a = h('<div><div class="confirm-art"></div><div class="money" style="margin-top:12px"><span><span class="coin"></span>' + p.coins + '</span>' + I.svg('right') + '<span><span class="coin"></span>' + (p.coins - price) + '</span></div></div>');
      a.querySelector('.confirm-art').appendChild(art);
      UI.confirm({ art: a, text: 'Buy ' + name + ' for ' + price + ' coins?', yes: 'Buy', yesIcon: 'check', no: 'No', onYes: onYes });
    }
    function buyClothes(id) {
      var it = CH.clothes[id], price = G.priceOf('clothes', id);
      if (G.owns('clothes', id)) { G.wear(id); AB.audio.sfx('pop'); UI.toast(esc(it.name) + (G.profile.outfit[it.slot] === id ? ' — wearing it!' : ' — taken off')); show(tab); return; }
      if (!afford(price)) return;
      var lk = G.look(); lk = { species: lk.species, palette: lk.palette, outfit: Object.assign({}, lk.outfit) }; lk.outfit[it.slot] = id;
      confirmBuy(CH.portraitCanvas(lk, 190, { pose: 'happy', t: 0.3 }), it.name, price, function () {
        if (G.buy('clothes', id)) {
          AB.audio.sfx('buy');
          UI.confirm({ art: CH.portraitCanvas(lk, 160, { pose: 'wave', t: 0.3 }), text: 'It\'s yours! Wear it now?', yes: 'Wear it', yesIcon: 'shirt', no: 'Later', onYes: function () { if (G.profile.outfit[it.slot] !== id) G.wear(id); show(tab); }, onNo: function () { show(tab); } });
        }
        show(tab);
      });
    }
    function buyFurniture(id) {
      var f = AB.furniture[id];
      if (!afford(f.price)) return;
      var big = UI.pic(['furn', id], 190);
      confirmBuy(big, f.name, f.price, function () {
        if (G.buy('furniture', id)) {
          AB.audio.sfx('buy');
          UI.toast(esc(f.name) + ' is in your storage box!', UI.pic(['furn', id], 44));
          UI.speak('It\'s in your storage box. Decorate your igloo to put it out!');
        }
        show(tab);
      });
    }
    function buyStyle(k, id) {
      var key = k + '_' + id, s = AB.roomStyles[k][id];
      if (G.owns('styles', key)) { UI.toast('You have this! Use it in Decorate → Room.'); return; }
      if (!afford(s.price)) return;
      var c = cv(190); UI.drawStyle(c.x, k, id, 190);
      confirmBuy(c.c, s.name, s.price, function () { if (G.buy('styles', key)) { AB.audio.sfx('buy'); UI.toast(esc(s.name) + ' — use it in Decorate!'); } show(tab); });
    }
    UI.on(node, '.tab', function (b) { show(b.dataset.t); });
    show(tab);
    UI.speak(clothes ? 'Pick something to wear!' : 'Pick something for your igloo!');
  };

  // ------------------------------------------------------------ pets
  var P = AB.petsUI = {};
  var PET_NAMES = ['Snowpuff', 'Nibbles', 'Biscuit', 'Pip', 'Mochi', 'Twig', 'Pebbles', 'Sprinkle', 'Bubbles', 'Muffin', 'Peanut', 'Clover'];
  function petCanvas(pet, px, mood, loop) {
    var o = cv(px), start = performance.now(), alive = true;
    function draw(now) {
      if (!alive || !o.c.isConnected && now - start > 500) { return; }
      var t = (now - start) / 1000;
      o.x.clearRect(0, 0, px, px);
      AB.art.ellipse(o.x, px / 2, px * 0.86, px * 0.3, px * 0.06, 'rgba(255,255,255,0.6)', 0);
      AB.pets.draw(o.x, px / 2, px * 0.86, pet, { t: t, scale: px / 70, mood: typeof mood === 'function' ? mood() : mood || 'idle', moving: false });
      if (loop) requestAnimationFrame(draw);
    }
    draw(start);
    if (loop) requestAnimationFrame(draw);
    o.stop = function () { alive = false; };
    return o.c;
  }
  P.openAdopt = function () {
    var p = G.profile;
    if (p.pets.length >= 3) { UI.dialog({ name: 'Hazel', look: AB.villagers.look('hazel') }, 'You already have three pets to love! They are waiting for you.', { pics: p.pets.map(function (pt) { return ['pet', pt]; }) }); return; }
    var sel = { kind: AB.pets.KINDS[0], color: AB.pets.kinds[AB.pets.KINDS[0]].colors[0].id };
    var body = h('<div style="display:flex;flex-direction:column;gap:14px">' +
      '<div class="row" style="font-size:22px;font-weight:900"><span class="n" style="width:34px;height:34px;border-radius:50%;background:#4a8fe0;color:#fff;display:inline-flex;align-items:center;justify-content:center;border:3px solid #26324d">1</span>Pick a friend</div><div class="grid kinds"></div>' +
      '<div class="row" style="font-size:22px;font-weight:900"><span class="n" style="width:34px;height:34px;border-radius:50%;background:#4a8fe0;color:#fff;display:inline-flex;align-items:center;justify-content:center;border:3px solid #26324d">2</span>Pick a colour</div><div class="row cols"></div>' +
      '<div class="row" style="font-size:22px;font-weight:900"><span class="n" style="width:34px;height:34px;border-radius:50%;background:#4a8fe0;color:#fff;display:inline-flex;align-items:center;justify-content:center;border:3px solid #26324d">3</span>Give a name</div>' +
      '<div class="namebox" style="display:flex;gap:10px"><input maxlength="12" placeholder="Name" style="flex:1;font-size:26px;font-weight:900;border:3px solid #26324d;border-radius:18px;padding:10px 14px" autocomplete="off" spellcheck="false"></div><div class="namechips" style="display:flex;gap:8px;flex-wrap:wrap"></div>' +
      '<div class="row center"><button class="btn green go" disabled>' + I.svg('heart') + ' Adopt!</button></div></div>');
    var node = UI.panel('Adopt a pet', 'paw', body);
    var kinds = body.querySelector('.kinds'), cols = body.querySelector('.cols'), input = body.querySelector('input'), go = body.querySelector('.go');
    function render() {
      kinds.innerHTML = '';
      AB.pets.KINDS.forEach(function (k) {
        var d = AB.pets.kinds[k], c = h('<button class="card' + (sel.kind === k ? ' sel' : '') + '"><div class="lbl">' + esc(d.name) + '</div><div class="muted" style="font-size:14px">' + esc(d.blurb || '') + '</div></button>');
        c.insertBefore(petCanvas({ kind: k, color: k === sel.kind ? sel.color : d.colors[0].id }, 100, sel.kind === k ? 'happy' : 'idle', false), c.firstChild);
        c.addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('chirp'); sel.kind = k; sel.color = d.colors[0].id; render(); UI.speak(d.name); });
        kinds.appendChild(c);
      });
      cols.innerHTML = '';
      AB.pets.kinds[sel.kind].colors.forEach(function (col) {
        var c = h('<button class="card' + (sel.color === col.id ? ' sel' : '') + '" style="min-height:0;padding:4px"><div class="lbl" style="font-size:14px">' + esc(col.name) + '</div></button>');
        c.insertBefore(petCanvas({ kind: sel.kind, color: col.id }, 76, 'idle', false), c.firstChild);
        c.addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('pop'); sel.color = col.id; render(); });
        cols.appendChild(c);
      });
      go.disabled = !input.value.trim();
    }
    var chips = body.querySelector('.namechips');
    PET_NAMES.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 6).forEach(function (n) {
      var b = h('<button style="border:2.5px solid #26324d;border-radius:16px;background:#eaf3ff;font-weight:800;font-size:17px;padding:8px 12px;min-height:48px">' + n + '</button>');
      b.addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('pop'); input.value = n; render(); UI.speak(n); }); chips.appendChild(b);
    });
    input.addEventListener('input', render);
    go.addEventListener('click', function (e) {
      e.stopPropagation(); var name = input.value.trim().slice(0, 12); if (!name) return;
      go.disabled = true;
      var pet = G.adoptPet(sel.kind, sel.color, name);
      UI.close(node); AB.audio.sfx('success');
      var W = AB.world;
      if (W.player && W.scene) { W.pet = { pet: pet, x: W.player.x - 60, y: W.player.y + 10, dir: 1, moving: false, mood: 'happy', moodUntil: W.t + 2, t: 0 }; W.burst(W.player.x - 60, W.player.y - 40, 'heart', 10); }
      UI.refreshHud();
      UI.dialog({ name: 'Hazel', look: AB.villagers.look('hazel') }, name + ' loves you already! Your pet will follow you everywhere. Tap your pet to play!', { pics: [['pet', pet], ['icon', 'heart', '#ff6f91']] });
    });
    render();
    UI.speak('Pick a pet friend!');
  };

  P.open = function () {
    var p = G.profile;
    if (!p.pets.length) { UI.dialog({ name: 'Aurora Bay' }, 'Visit the Pet Lodge in Town Square to adopt a pet!', { pics: [['icon', 'paw', '#ff6f91']] }); return; }
    var pet = G.activePet() || p.pets[0];
    var mood = 'idle', moodUntil = 0;
    var body = h('<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:center">' +
      '<div class="petbox" style="background:radial-gradient(circle at 50% 40%,#eef6ff,#b9d4f6);border:3px solid #26324d;border-radius:26px"></div>' +
      '<div style="display:flex;flex-direction:column;gap:12px;min-width:260px"><div class="pname" style="font-size:32px;font-weight:900"></div><div class="hearts" style="display:flex;gap:6px"></div>' +
      '<div class="row"><button class="btn yellow feed">' + I.svg('bowl') + ' Feed</button><button class="btn purple love">' + I.svg('heart') + ' Pet</button><button class="btn teal play">' + I.svg('ball') + ' Play</button></div>' +
      '<div class="row"><button class="btn white follow"></button></div><div class="row others"></div></div></div>');
    var node = UI.panel('My pet', 'paw', body, { size: 'mid' });
    var box = body.querySelector('.petbox');
    function draw() {
      box.innerHTML = ''; box.appendChild(petCanvas(pet, 220, function () { return performance.now() / 1000 < moodUntil ? mood : 'idle'; }, true));
      body.querySelector('.pname').textContent = pet.name;
      var hearts = body.querySelector('.hearts'); hearts.innerHTML = '';
      var m = G.petMood(pet), n = Math.round(m / 20);
      for (var i = 0; i < 5; i++) hearts.appendChild(h('<span style="font-size:34px;color:' + (i < n ? '#ff6f91' : '#d6dbe7') + '">' + I.svg('heart') + '</span>'));
      var fb = body.querySelector('.follow');
      fb.innerHTML = p.petFollow === false ? I.svg('home') + ' Resting at home' : I.svg('paw') + ' Walking with me';
      var others = body.querySelector('.others'); others.innerHTML = '';
      if (p.pets.length > 1) p.pets.forEach(function (o) {
        if (o.id === pet.id) return;
        var b = h('<button class="card" style="min-height:0;padding:4px"><div class="lbl" style="font-size:14px">' + esc(o.name) + '</div></button>');
        b.insertBefore(petCanvas(o, 64, 'idle', false), b.firstChild);
        b.addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('chirp'); pet = o; p.activePet = o.id; AB.store.saveNow(p); swapWorldPet(); draw(); });
        others.appendChild(b);
      });
    }
    function act(what, m, sfx) {
      mood = m; moodUntil = performance.now() / 1000 + 2.5; G.petCare(pet, what); AB.audio.sfx(sfx);
      if (AB.world.pet && AB.world.pet.pet.id === pet.id) AB.world.petMood(m, 2.5);
      draw();
    }
    body.querySelector('.feed').addEventListener('click', function (e) { e.stopPropagation(); act('fed', 'eat', 'slurp'); });
    body.querySelector('.love').addEventListener('click', function (e) { e.stopPropagation(); act('petted', 'love', 'purr'); });
    body.querySelector('.play').addEventListener('click', function (e) { e.stopPropagation(); act('played', 'play', 'jump'); });
    body.querySelector('.follow').addEventListener('click', function (e) {
      e.stopPropagation(); AB.audio.sfx('tap'); p.petFollow = p.petFollow === false; AB.store.saveNow(p); swapWorldPet(); draw();
    });
    function swapWorldPet() {
      var W = AB.world, show = p.petFollow !== false || (W.sceneId === 'igloo' && !G.visiting);
      if (show && W.player) W.pet = { pet: G.activePet(), x: W.player.x - 60, y: W.player.y + 10, dir: 1, moving: false, mood: 'happy', moodUntil: W.t + 1.5, t: 0 };
      else W.pet = null;
    }
    draw();
    UI.speak(pet.name + ' is happy to see you!');
  };
})();
