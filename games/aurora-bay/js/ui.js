/* Aurora Bay — HTML menus: Who's playing, character creator, HUD, map, bag, journal,
 * settings, parent gate, dialogs and toasts. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, ST = AB.store, G = AB.game, CH = AB.chars, I = AB.icons;
  var UI = AB.ui = {};
  var layer = document.getElementById('layer'), hud = document.getElementById('hud');
  var stack = [];

  function h(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  UI.h = h; UI.esc = esc;
  function on(root, sel, fn) { root.querySelectorAll(sel).forEach(function (n) { n.addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('tap'); fn(n, e); }); }); }
  UI.on = on;

  // ------------------------------------------------------------ modal stack
  UI.push = function (node, opts) {
    opts = opts || {};
    layer.appendChild(node);
    var entry = { node: node, onClose: opts.onClose, key: opts.key, sticky: opts.sticky };
    stack.push(entry);
    if (!opts.noScrimClose) node.addEventListener('click', function (e) { if (e.target === node && !entry.sticky) UI.close(node); });
    AB.world.locked = true;
    return node;
  };
  UI.close = function (node) {
    for (var i = stack.length - 1; i >= 0; i--) if (stack[i].node === node) {
      var e = stack.splice(i, 1)[0];
      if (e.node.parentNode) e.node.parentNode.removeChild(e.node);
      if (e.onClose) e.onClose();
      break;
    }
    if (!stack.length) { AB.world.locked = false; stopSpeech(); }
  };
  UI.closeTop = function () { var t = stack[stack.length - 1]; if (!t || t.sticky) return false; AB.audio.sfx('close'); UI.close(t.node); return true; };
  UI.closeAll = function () { while (stack.length) { var t = stack[stack.length - 1]; UI.close(t.node); } };
  UI.hasModal = function () { return stack.length > 0; };
  UI.modalKey = function (e) { var t = stack[stack.length - 1]; return t && t.key ? t.key(e) : false; };
  UI.pausesWorld = function () { return false; };
  UI.panel = function (title, icon, body, opts) {
    opts = opts || {};
    var node = h('<div class="scrim"><div class="panel ' + (opts.size || '') + '"><div class="panel-head"><h2>' + (icon ? I.svg(icon) : '') + esc(title) + '</h2>' +
      (opts.headExtra || '') + '<button class="x" aria-label="Close">' + I.svg('close') + '</button></div>' + (opts.tabs || '') + '<div class="panel-body"></div></div></div>');
    var b = node.querySelector('.panel-body');
    if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
    node.querySelector('.x').addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('close'); UI.close(node); });
    AB.audio.sfx('open');
    return UI.push(node, opts);
  };

  // ------------------------------------------------------------ speech & toasts
  var voice = null;
  function stopSpeech() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
  UI.speak = function (text, force) {
    if (!force && ST.meta.settings.readAloud === false) return;
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text).replace(/[★☆♪]/g, ''));
      if (!voice) { var vs = speechSynthesis.getVoices() || []; voice = vs.filter(function (v) { return /^en/i.test(v.lang) && /Samantha|Karen|Moira|Tessa|Female|Google US/i.test(v.name); })[0] || vs.filter(function (v) { return /^en/i.test(v.lang); })[0] || null; }
      if (voice) u.voice = voice;
      u.rate = 0.95; u.pitch = 1.15; speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  };
  UI.toast = function (html, canvas) {
    var t = h('<div class="toast">' + html + '</div>');
    if (canvas) t.insertBefore(canvas, t.firstChild);
    document.getElementById('toasts').appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2700);
  };
  AB.on('coins', function (total, delta, why) {
    UI.refreshHud();
    if (delta > 0 && why !== 'silent') { UI.toast('<span class="coin"></span> +' + delta); AB.audio.sfx('coin'); }
  });
  AB.on('save-error', function () { UI.toast('Saving had a hiccup — trying again'); });

  // ------------------------------------------------------------ Who's playing?
  UI.whoScreen = function () {
    UI.closeAll(); hud.hidden = true; AB.mode = 'menu'; AB.world.scene = null;
    AB.audio.music('title'); AB.audio.ambient('wind');
    var list = ST.list();
    var node = h('<div class="screen"><div class="title-logo">Aurora Bay</div><div class="title-q">Who\'s playing?</div><div class="who-grid"></div>' +
      '<button class="btn white corner-btn" aria-label="Grown-ups">' + I.svg('lock') + ' Grown-ups</button></div>');
    var grid = node.querySelector('.who-grid');
    list.forEach(function (p) {
      var card = h('<button class="who-card"><div class="nm">' + esc(p.name) + '</div><div class="co"><span class="coin"></span> ' + p.coins + '</div></button>');
      card.insertBefore(CH.portraitCanvas(G.look(p), 140, { pose: 'wave', t: 0.4 }), card.firstChild);
      if (p._readonly) card.style.opacity = 0.5;
      card.addEventListener('click', function () {
        AB.audio.sfx('tap');
        if (p._readonly) { UI.alert('This player was saved by a newer version of Aurora Bay. Please update the game to play.'); return; }
        UI.start(p);
      });
      grid.appendChild(card);
    });
    if (ST.canCreate()) {
      var add = h('<button class="who-card add">' + I.svg('plus') + '<span>New player</span></button>');
      add.addEventListener('click', function () { AB.audio.sfx('tap'); UI.creator(); });
      grid.appendChild(add);
    }
    if (ST.warnings.length) node.appendChild(h('<div class="note" style="color:#fff;opacity:.85;max-width:700px;text-align:center">' + esc(ST.warnings[0]) + '</div>'));
    node.querySelector('.corner-btn').addEventListener('click', function () { AB.audio.sfx('tap'); UI.parentGate(UI.parentArea); });
    UI.push(node, { sticky: true, noScrimClose: true });
    UI.speak(list.length ? 'Who\'s playing?' : 'Welcome to Aurora Bay! Tap New player to make your character.');
  };

  UI.start = function (p) {
    UI.closeAll();
    G.setProfile(p);
    hud.hidden = false;
    UI.buildHud();
    var first = !p.found.welcome;
    var scene = (p.pos && AB.scenes[p.pos.scene] && p.pos.scene !== 'igloo') ? p.pos.scene : (p.pos && p.pos.scene === 'igloo' ? 'igloo' : 'town');
    if (first) scene = 'town';
    AB.go(scene, 'map');
    if (first) setTimeout(function () {
      G.markFound('welcome');
      UI.dialog({ name: 'Ollie', look: AB.villagers.look('ollie') }, 'Welcome to Aurora Bay, ' + p.name + '! Tap the snow to walk. Tap doors to go inside!',
        { pics: [['icon', 'door'], ['icon', 'map'], ['icon', 'home']] });
    }, 900);
  };
  UI.switchPlayer = function () {
    if (G.profile) ST.saveNow(G.profile);
    G.visiting = null;
    AB.mode = 'menu';
    UI.whoScreen();
  };

  // ------------------------------------------------------------ Character creator
  var NAME_IDEAS = ['Pip', 'Juno', 'Biscuit', 'Comet', 'Maple', 'Ziggy', 'Pebble', 'Nova', 'Sprout', 'Frost', 'Bean', 'Twinkle'];
  UI.creator = function () {
    var sel = { species: 'penguin', palette: 'midnight', starter: 'scarf_red', name: '' };
    var node = h('<div class="scrim" style="background:rgba(15,22,48,.35)"><div class="creator">' +
      '<div class="stagebox"><canvas class="prev"></canvas><button class="x" style="position:absolute;top:12px;left:12px" aria-label="Back">' + I.svg('arrowBack') + '</button>' +
      '<button class="btn green go" style="position:absolute;left:16px;right:16px;bottom:16px;font-size:28px;min-height:76px">' + I.svg('check') + ' All done!</button></div>' +
      '<div class="opts">' +
      '<h3><span class="num">1</span>Pick an animal</h3><div class="species"></div>' +
      '<h3><span class="num">2</span>Pick a colour</h3><div class="swatches"></div>' +
      '<h3><span class="num">3</span>Pick a first treat</h3><div class="starters"></div>' +
      '<h3><span class="num">4</span>Your name</h3><div class="namebox"><input maxlength="14" placeholder="Name" autocomplete="off" autocapitalize="words" spellcheck="false"></div><div class="namechips"></div>' +
            '</div></div></div>');
    var prev = node.querySelector('.prev'), sp = node.querySelector('.species'), sw = node.querySelector('.swatches'), stt = node.querySelector('.starters');
    var input = node.querySelector('input'), go = node.querySelector('.go');
    CH.ORDER.forEach(function (id) {
      var b = h('<button data-sp="' + id + '"><span>' + esc(CH.species[id].name) + '</span></button>');
      b.insertBefore(CH.portraitCanvas({ species: id, palette: CH.species[id].palettes[0].id, outfit: {} }, 92), b.firstChild);
      b.addEventListener('click', function () { AB.audio.sfx('pop'); sel.species = id; sel.palette = CH.species[id].palettes[0].id; render(); UI.speak(CH.species[id].name); });
      sp.appendChild(b);
    });
    CH.STARTERS.forEach(function (id) {
      var b = h('<button data-st="' + id + '" aria-label="' + esc(CH.clothes[id].name) + '"></button>');
      b.appendChild(itemCanvas(id, 86)); b.addEventListener('click', function () { AB.audio.sfx('pop'); sel.starter = id; render(); });
      stt.appendChild(b);
    });
    function render() {
      sp.querySelectorAll('button').forEach(function (b) { b.classList.toggle('sel', b.dataset.sp === sel.species); });
      sw.innerHTML = '';
      CH.species[sel.species].palettes.forEach(function (pal) {
        var b = h('<button aria-label="' + esc(pal.name) + '" style="background:' + pal.body + '"></button>');
        if (pal.id === sel.palette) b.classList.add('sel');
        b.style.boxShadow = 'inset 0 -14px 0 ' + (pal.belly || pal.shade || pal.beak || '#fff');
        b.addEventListener('click', function () { AB.audio.sfx('pop'); sel.palette = pal.id; render(); });
        sw.appendChild(b);
      });
      stt.querySelectorAll('button').forEach(function (b) { b.classList.toggle('sel', b.dataset.st === sel.starter); });
      go.disabled = !input.value.trim();
    }
    var chips = node.querySelector('.namechips');
    U.deepClone(NAME_IDEAS).sort(function () { return Math.random() - 0.5; }).slice(0, 6).forEach(function (n) {
      var b = h('<button>' + n + '</button>'); b.addEventListener('click', function () { AB.audio.sfx('pop'); input.value = n; render(); UI.speak(n); }); chips.appendChild(b);
    });
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { input.blur(); } });
    // live preview
    var dpr = Math.min(2, window.devicePixelRatio || 1), pw = 320, ph = 330, running = true, t0 = performance.now();
    prev.width = pw * dpr; prev.height = ph * dpr; prev.style.width = pw + 'px'; prev.style.height = ph + 'px';
    var pc = prev.getContext('2d');
    (function loop(now) {
      if (!running) return;
      var t = (now - t0) / 1000;
      pc.setTransform(dpr, 0, 0, dpr, 0, 0); pc.clearRect(0, 0, pw, ph);
      AB.art.ellipse(pc, pw / 2, ph - 40, 110, 24, 'rgba(255,255,255,0.7)', 0);
      var look = { species: sel.species, palette: sel.palette, outfit: {} };
      var st = CH.clothes[sel.starter]; if (st) look.outfit[st.slot] = sel.starter;
      var walking = (t % 6) > 4.2;
      CH.draw(pc, pw / 2, ph - 40, look, { t: t, scale: 2.2, pose: (t % 6) < 1.3 ? 'wave' : 'stand', moving: walking, dir: 1 });
      pc.font = '900 26px ' + AB.FONT; pc.textAlign = 'center'; pc.fillStyle = AB.art.C.out;
      pc.fillText(input.value.trim() || ' ', pw / 2, 34);
      requestAnimationFrame(loop);
    })(t0);
    node.querySelector('.x').addEventListener('click', function () { running = false; UI.close(node); });
    go.addEventListener('click', function () {
      var name = input.value.trim().slice(0, 14); if (!name) { input.focus(); return; }
      go.disabled = true; running = false;
      AB.audio.sfx('success');
      var outfit = { head: null, face: null, neck: null, body: null }, it = CH.clothes[sel.starter];
      outfit[it.slot] = sel.starter;
      var fields = { name: name, species: sel.species, palette: sel.palette, outfit: outfit, starter: sel.starter };
      var p = ST.blankProfile(); // build fully, then create
      fields.owned = p.owned; fields.owned.clothes[sel.starter] = true;
      fields.igloo = p.igloo;
      AB.giveStarterHome(fields);
      ST.create(fields).then(function (np) { UI.close(node); UI.start(np); });
    });
    render();
    UI.push(node, { sticky: true, noScrimClose: true });
    UI.speak('Make your character! Pick an animal.');
  };

  /** Canvas preview for a clothing item, worn by a mannequin-less floating view. */
  function itemCanvas(id, px, look) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), c = document.createElement('canvas');
    c.width = px * dpr; c.height = px * dpr; c.style.width = px + 'px'; c.style.height = px + 'px';
    var x = c.getContext('2d'); x.scale(dpr, dpr);
    var it = CH.clothes[id];
    var lk = look || { species: 'bear', palette: 'snow', outfit: {} };
    lk = { species: lk.species, palette: lk.palette, outfit: {} };
    lk.outfit[it.slot] = id;
    var sp = CH.species[lk.species], a = sp.anchors;
    // zoom on the item's slot
    var focusY = it.slot === 'head' ? a.head.y + 4 : it.slot === 'face' ? a.eyes.y : it.slot === 'neck' ? a.neck.y : -36;
    var s = it.slot === 'body' ? px / 120 : px / 80;
    x.translate(px / 2, px / 2); x.scale(s, s); x.translate(0, -focusY);
    CH.draw(x, 0, 0, lk, { t: 0.5, noShadow: true });
    return c;
  }
  UI.itemCanvas = itemCanvas;

  // ------------------------------------------------------------ HUD
  UI.buildHud = function () {
    var tools = document.getElementById('tools');
    tools.innerHTML = '';
    [['map', 't-map', 'Map', UI.openMap], ['home', 't-home', 'My igloo', function () { AB.goHome(); }], ['bag', 't-bag', 'My things', UI.openBag],
     ['quest', 't-quest', 'Helping', UI.openQuests], ['paw', 't-pet', 'My pet', function () { AB.petsUI.open(); }], ['gear', 't-gear', 'Settings', UI.openSettings]]
      .forEach(function (d) {
        var b = h('<button class="tool ' + d[1] + '" aria-label="' + d[2] + '">' + I.svg(d[0]) + '</button>');
        b.addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('tap'); if (AB.mode !== 'world') return; d[3](); });
        tools.appendChild(b);
      });
    document.getElementById('who').onclick = function (e) { e.stopPropagation(); AB.audio.sfx('tap'); if (AB.mode === 'world') UI.openSettings(); };
    UI.refreshHud();
  };
  UI.refreshHud = function () {
    var p = G.profile; if (!p) return;
    var who = document.getElementById('who');
    who.innerHTML = '<div class="who-txt"><span class="nm">' + esc(p.name) + '</span><span class="co"><span class="coin"></span>' + p.coins + '</span></div>';
    who.insertBefore(CH.portraitCanvas(G.look(), 52, { t: 0.4 }), who.firstChild);
    var pet = document.querySelector('.tool.t-pet'); if (pet) pet.hidden = !p.pets.length;
    var q = document.querySelector('.tool.t-quest');
    if (q && AB.quests) { var dot = q.querySelector('.dot'); var want = AB.quests.hasNews(); if (want && !dot) q.appendChild(h('<span class="dot"></span>')); if (!want && dot) dot.remove(); }
    hud.hidden = AB.mode === 'menu' || AB.mode === 'minigame' || AB.mode === 'decorate';
    var vb = document.querySelector('.visit-banner');
    if (G.visiting && AB.mode === 'world' && AB.world.sceneId === 'igloo') {
      if (!vb) { vb = h('<div class="visit-banner"></div>'); document.getElementById('stage').appendChild(vb); }
      vb.innerHTML = I.svg('eye') + 'Visiting ' + esc(G.visiting.name) + '\'s igloo';
    } else if (vb) vb.remove();
  };
  AB.on('outfit', function () { UI.refreshHud(); });
  AB.on('scene', function () { UI.refreshHud(); });

  // ------------------------------------------------------------ Dialog
  /** who = { name, look } ; text ; opts = { pics:[['icon',name]|['fish',kind]|['item',clothesId]|['canvas',canvas]], actions:[{label, icon, cls, fn}] } */
  UI.dialog = function (who, text, opts) {
    opts = opts || {};
    var node = h('<div class="scrim clear"><div class="dialog"><div class="face"><div class="nm">' + esc(who.name) + '</div></div>' +
      '<div class="say"><div class="txt">' + esc(text) + '</div><div class="pics"></div><div class="acts"></div></div>' +
      '<button class="speak" aria-label="Read aloud">' + I.svg('speaker') + '</button></div></div>');
    var face = node.querySelector('.face');
    if (who.look) face.insertBefore(CH.portraitCanvas(who.look, 104, { pose: 'wave', t: 0.3 }), face.firstChild);
    var pics = node.querySelector('.pics');
    (opts.pics || []).forEach(function (pi) { pics.appendChild(UI.pic(pi)); });
    if (!pics.children.length) pics.remove();
    var acts = node.querySelector('.acts');
    var actions = opts.actions || [{ label: 'OK', icon: 'check', cls: 'green' }];
    actions.forEach(function (a) {
      var b = h('<button class="btn ' + (a.cls || 'green') + '">' + (a.icon ? I.svg(a.icon) : '') + esc(a.label) + '</button>');
      b.addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('tap'); UI.close(node); if (a.fn) a.fn(); });
      acts.appendChild(b);
    });
    node.querySelector('.speak').addEventListener('click', function (e) { e.stopPropagation(); UI.speak(text, true); });
    UI.push(node, { noScrimClose: true, onClose: opts.onClose, key: function (e) { if (e.key === 'Enter' || e.key === ' ') { acts.firstChild.click(); return true; } return false; } });
    UI.speak(text);
    return node;
  };
  UI.alert = function (text) { return UI.dialog({ name: 'Aurora Bay' }, text); };
  /** Small picture used in dialogs and the journal. */
  UI.pic = function (pi, px) {
    px = px || 76;
    if (pi[0] === 'arrow') return h('<span class="arrow">' + I.svg('right') + '</span>');
    if (pi[0] === 'canvas') return pi[1];
    var dpr = Math.min(2, window.devicePixelRatio || 1), c = document.createElement('canvas');
    c.width = px * dpr; c.height = px * dpr; c.style.width = px + 'px'; c.style.height = px + 'px';
    var x = c.getContext('2d'); x.scale(dpr, dpr);
    var m = px / 2, A = AB.art;
    if (pi[0] === 'icon') AB.icons.draw(x, pi[1], m, m, px * 0.56, pi[2] || '#4a8fe0');
    else if (pi[0] === 'fish') A.fish(x, m, m, px / 80, pi[1], 0);
    else if (pi[0] === 'mug') A.mug(x, m - 4, m + 18, px / 70, pi[1] || '#e2574c', 'cream');
    else if (pi[0] === 'shell') A.shell(x, m, m + 6, px / 40);
    else if (pi[0] === 'gem') A.gem(x, m, m + 4, px / 50, pi[1], 0);
    else if (pi[0] === 'scarf') A.scarfIcon(x, m, m - 4, px / 60, '#ff8fb1', '#fff');
    else if (pi[0] === 'pinecone') A.pinecone(x, m, m + 4, px / 40);
    else if (pi[0] === 'star') A.star(x, m, m, px * 0.32, '#ffcf4a', 3);
    else if (pi[0] === 'tracks') { A.tracks(x, m - 12, m + 10, px / 50, 1); A.tracks(x, m + 12, m - 8, px / 50, 1); }
    else if (pi[0] === 'coin') A.coin(x, m, m, px * 0.3);
    else if (pi[0] === 'item') { var ic = itemCanvas(pi[1], px); return ic; }
    else if (pi[0] === 'char') CH.portrait(x, px * 0.06, px * 0.04, px * 0.88, pi[1], {});
    else if (pi[0] === 'furn') UI.drawFurniture(x, pi[1], px);
    else if (pi[0] === 'pet' && AB.pets) AB.pets.draw(x, m, px * 0.86, pi[1], { t: 0.3, scale: px / 70 });
    return c;
  };
  UI.drawFurniture = function (x, id, px, opts) {
    var f = AB.furniture[id]; if (!f) return;
    var s = Math.min(px * 0.84 / Math.max(f.w, 10), px * 0.84 / Math.max(f.h, 10), 1.3);
    x.save();
    if (f.place === 'floor') { x.translate(px / 2, px / 2 + f.h * s / 2); }
    else { x.translate(px / 2, px / 2); }
    x.scale(s, s);
    try { f.draw(x, { t: (opts && opts.t) || 0.5, flip: false, rot: 0 }); } catch (e) { /* ignore */ }
    x.restore();
  };

  // ------------------------------------------------------------ Confirm
  UI.confirm = function (o) {
    var node = h('<div class="scrim"><div class="panel small"><div class="panel-body" style="text-align:center;display:flex;flex-direction:column;gap:16px;align-items:center">' +
      '<div class="cart"></div><div style="font-size:26px;font-weight:900">' + esc(o.text) + '</div>' + (o.note ? '<div class="note">' + esc(o.note) + '</div>' : '') +
      '<div class="row center"><button class="btn white no">' + I.svg('close') + esc(o.no || 'No') + '</button><button class="btn ' + (o.yesCls || 'green') + ' yes">' + I.svg(o.yesIcon || 'check') + esc(o.yes || 'Yes') + '</button></div></div></div></div>');
    if (o.art) node.querySelector('.cart').appendChild(o.art); else node.querySelector('.cart').remove();
    var done = false;
    node.querySelector('.no').addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('close'); UI.close(node); if (o.onNo) o.onNo(); });
    node.querySelector('.yes').addEventListener('click', function (e) { e.stopPropagation(); if (done) return; done = true; UI.lastConfirm = performance.now(); UI.close(node); o.onYes(); });
    UI.push(node, { key: function (e) { if (e.key === 'Enter') { node.querySelector('.yes').click(); return true; } return false; } });
    if (o.speak !== false) UI.speak(o.text);
  };

  // ------------------------------------------------------------ Map
  UI.openMap = function () {
    var body = h('<div class="mapwrap"><canvas></canvas></div>');
    var node = UI.panel('Map', 'map', body, { size: '' });
    var cv = body.querySelector('canvas');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    function paint() {
      var r = body.getBoundingClientRect(); if (!r.width) return;
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      var x = cv.getContext('2d'); x.scale(dpr * r.width / 1000, dpr * r.height / 625);
      drawMap(x);
    }
    requestAnimationFrame(paint);
    var hintScene = AB.quests && AB.quests.hintScene();
    Object.keys(AB.scenes).forEach(function (id) {
      var sc = AB.scenes[id]; if (!sc.map) return;
      var known = !!G.profile.discovered[id] || id === 'town';
      var here = AB.world.sceneId === id || (id === 'iglooLane' && AB.world.sceneId === 'igloo');
      var b = h('<button class="mapnode' + (here ? ' here' : '') + (known ? '' : ' locked') + (hintScene === id ? ' hint' : '') + '" style="left:' + (sc.map.x / 10) + '%;top:' + (sc.map.y / 6.25) + '%">' +
        I.svg(known ? sc.map.icon : 'hint') + '<span>' + esc(known ? sc.name : '???') + '</span></button>');
      b.addEventListener('click', function (e) {
        e.stopPropagation(); AB.audio.sfx('tap');
        if (!known) { UI.toast(I.svg('hint') + ' Walk there to find it!'); UI.speak('Walk there to find it!'); return; }
        UI.close(node);
        if (G.visiting) AB.visitEnd();
        if (here && id !== 'iglooLane') return;
        AB.go(id, 'map');
      });
      body.appendChild(b);
    });
    UI.speak('Where do you want to go?');
  };
  function drawMap(x) {
    var A = AB.art;
    var g = x.createLinearGradient(0, 0, 0, 625); g.addColorStop(0, '#5d87c9'); g.addColorStop(1, '#3b67ad');
    x.fillStyle = g; x.fillRect(0, 0, 1000, 625);
    x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 2;
    for (var i = 0; i < 18; i++) { var wx = (i * 137) % 1000, wy = (i * 89) % 625; x.beginPath(); x.moveTo(wx, wy); x.quadraticCurveTo(wx + 15, wy - 6, wx + 30, wy); x.stroke(); }
    // island
    x.beginPath(); x.moveTo(120, 300); x.bezierCurveTo(100, 120, 380, 40, 560, 70); x.bezierCurveTo(780, 90, 930, 180, 900, 340);
    x.bezierCurveTo(880, 500, 700, 580, 500, 570); x.bezierCurveTo(280, 570, 140, 470, 120, 300); x.closePath();
    A.fs(x, '#f3f7ff', 5); x.save(); x.clip();
    x.fillStyle = '#dbe5f6'; x.beginPath(); x.ellipse(560, 560, 360, 80, 0, 0, Math.PI * 2); x.fill();
    // mountains north
    [[600, 160, 90], [690, 140, 110], [520, 170, 70]].forEach(function (m) { A.poly(x, [m[0] - m[2], m[1] + 60, m[0], m[1] - m[2] * 0.6, m[0] + m[2], m[1] + 60], '#a9b9e3', 3); A.poly(x, [m[0] - 22, m[1] - m[2] * 0.25, m[0], m[1] - m[2] * 0.6, m[0] + 22, m[1] - m[2] * 0.25], '#fff', 0); });
    // lake west
    A.ellipse(x, 240, 330, 95, 60, '#bfe8f6', 4); A.ellipse(x, 225, 320, 40, 22, '#d9f3fb', 0);
    // harbor east
    A.ellipse(x, 905, 380, 80, 70, '#5d87c9', 0);
    x.restore();
    // paths
    x.setLineDash([12, 10]); x.lineWidth = 6; x.strokeStyle = '#b8873f';
    [[500, 330, 240, 330], [500, 330, 690, 220], [500, 330, 800, 380], [500, 330, 470, 480], [800, 380, 880, 300]].forEach(function (l) { x.beginPath(); x.moveTo(l[0], l[1]); x.lineTo(l[2], l[3]); x.stroke(); });
    x.setLineDash([]);
    // little landmarks
    A.igloo(x, 470, 500, 0.35, {}); A.igloo(x, 420, 490, 0.25, {});
    A.pine(x, 180, 260, 50); A.pine(x, 300, 420, 46); A.pine(x, 840, 470, 44); A.pine(x, 620, 470, 40);
    // lighthouse
    A.box(x, 872, 250, 22, 50, 4, '#fff', 3); A.box(x, 872, 268, 22, 10, 0, '#e2574c', 2); A.poly(x, [866, 250, 900, 250, 883, 232], '#e2574c', 3);
    A.glow(x, 883, 244, 30, 'rgba(255,230,140,', 0.6);
    // compass
    A.circle(x, 940, 560, 34, '#fff8ea', 3); A.poly(x, [940, 530, 948, 560, 940, 590, 932, 560], '#e2574c', 2);
  }

  // ------------------------------------------------------------ Bag (wardrobe, furniture, treasures)
  UI.openBag = function (tab) {
    tab = tab || 'clothes';
    var tabs = '<div class="tabs"><button class="tab" data-t="clothes">' + I.svg('shirt') + 'Clothes</button><button class="tab" data-t="furn">' + I.svg('sofa') + 'Furniture</button><button class="tab" data-t="treasure">' + I.svg('gem') + 'Treasures</button></div>';
    var node = UI.panel('My things', 'bag', '', { tabs: tabs });
    var body = node.querySelector('.panel-body');
    function show(t) {
      tab = t;
      node.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
      body.innerHTML = '';
      if (t === 'clothes') wardrobe(body);
      else if (t === 'furn') furnitureList(body, node);
      else treasures(body);
    }
    on(node, '.tab', function (b) { show(b.dataset.t); });
    show(tab);
  };
  function wardrobe(body) {
    var p = G.profile;
    var wrap = h('<div style="display:flex;gap:16px;align-items:flex-start"><div class="me" style="flex:none;background:radial-gradient(circle at 50% 40%,#eef6ff,#b9d4f6);border:3px solid #26324d;border-radius:24px"></div><div class="grid" style="flex:1"></div></div>');
    var me = wrap.querySelector('.me'), grid = wrap.querySelector('.grid');
    function refresh() {
      me.innerHTML = ''; me.appendChild(CH.portraitCanvas(G.look(), 200, { t: 0.5 }));
      grid.innerHTML = '';
      var ids = Object.keys(p.owned.clothes).filter(function (id) { return CH.clothes[id]; });
      if (!ids.length) grid.appendChild(h('<div class="note">Buy clothes at the Shop!</div>'));
      ids.forEach(function (id) {
        var it = CH.clothes[id], wearing = p.outfit[it.slot] === id;
        var c = h('<button class="card' + (wearing ? ' sel' : '') + '"><div class="lbl">' + esc(it.name) + '</div>' + (wearing ? '<span class="tag">' + I.svg('check') + '</span>' : '') + '</button>');
        c.insertBefore(itemCanvas(id, 96, G.look()), c.firstChild);
        c.addEventListener('click', function () { AB.audio.sfx('pop'); G.wear(id); refresh(); });
        grid.appendChild(c);
      });
    }
    refresh();
    body.appendChild(wrap);
  }
  function furnitureList(body, node) {
    var p = G.profile;
    var go = h('<div class="row" style="margin-bottom:14px"><button class="btn purple">' + I.svg('paint') + ' Decorate my igloo</button></div>');
    go.querySelector('button').addEventListener('click', function () { AB.audio.sfx('tap'); UI.close(node); AB.decorate.openFromAnywhere(); });
    body.appendChild(go);
    var grid = h('<div class="grid"></div>');
    Object.keys(p.owned.furniture).forEach(function (id) {
      var n = p.owned.furniture[id]; if (!n || !AB.furniture[id]) return;
      var c = h('<div class="card"><div class="lbl">' + esc(AB.furniture[id].name) + '</div><span class="tag count">×' + n + '</span></div>');
      c.insertBefore(UI.pic(['furn', id], 96), c.firstChild);
      grid.appendChild(c);
    });
    body.appendChild(grid);
  }
  function treasures(body) {
    var p = G.profile;
    var gems = AB.quests ? AB.quests.gemList() : [];
    var got = gems.filter(function (k) { return p.found[k]; }).length;
    var html = '<div class="stats" style="justify-content:flex-start;margin-bottom:16px">' +
      '<div class="stat"><span class="gemi"></span> ' + got + ' / ' + gems.length + '</div>' +
      '<div class="stat">' + I.svg('fish') + ' ' + ((p.records.fishing && p.records.fishing.fish) || 0) + '</div>' +
      '<div class="stat">' + I.svg('sled') + ' ' + ((p.records.sled && p.records.sled.best) || 0) + '</div>' +
      '<div class="stat">' + I.svg('mug') + ' ' + ((p.records.cocoa && p.records.cocoa.best) || 0) + '</div>' +
      '<div class="stat">' + I.svg('quest') + ' ' + (AB.quests ? AB.quests.doneCount() : 0) + '</div></div>';
    var n = h('<div>' + html + '<div class="grid gems"></div><p class="note">Glimmer stones are hidden all over Aurora Bay. Tap things to find them!</p></div>');
    n.querySelector('.gemi').appendChild(UI.pic(['gem'], 40));
    var grid = n.querySelector('.gems');
    gems.forEach(function (k) {
      var c = h('<div class="card" style="min-height:110px"></div>');
      if (p.found[k]) c.appendChild(UI.pic(['gem', AB.quests.gemColor(k)], 80)); else c.appendChild(UI.pic(['icon', 'hint', '#b5bfd6'], 80));
      grid.appendChild(c);
    });
    body.appendChild(n);
  }

  // ------------------------------------------------------------ Quest journal
  UI.openQuests = function () {
    var node = UI.panel('Helping friends', 'quest', '');
    var body = node.querySelector('.panel-body');
    var list = AB.quests.journal();
    if (!list.length) body.appendChild(h('<div class="note" style="font-size:20px">Talk to friends around town to help them! Look for the ' + I.svg('talk') + ' bubble.</div>'));
    list.forEach(function (q) {
      var row = h('<div class="quest' + (q.done ? ' done' : '') + '"><div class="qt"><b>' + esc(q.title) + '</b><div class="muted">' + esc(q.done ? 'All done! Thank you!' : q.now) + '</div><div class="steps"></div></div></div>');
      row.insertBefore(UI.pic(q.pic, 84), row.firstChild);
      var steps = row.querySelector('.steps');
      for (var i = 0; i < q.steps; i++) steps.appendChild(h('<i class="' + (i < q.step || q.done ? 'on' : '') + '"></i>'));
      if (!q.done) {
        var hb = h('<button class="btn yellow">' + I.svg('hint') + ' Show me</button>');
        hb.addEventListener('click', function (e) { e.stopPropagation(); AB.audio.sfx('sparkle'); UI.close(node); AB.quests.showHint(q.id); });
        row.appendChild(hb);
        var sp = h('<button class="speak x" aria-label="Read" style="width:52px;height:52px">' + I.svg('speaker') + '</button>');
        sp.addEventListener('click', function (e) { e.stopPropagation(); UI.speak(q.title + '. ' + q.now, true); });
        row.appendChild(sp);
      }
      body.appendChild(row);
    });
    AB.quests.seen();
    UI.refreshHud();
  };
  UI.noticeboard = function () {
    var offers = AB.quests.offers();
    if (!offers.length) { UI.dialog({ name: 'Notice board' }, 'Everyone has been helped. Thank you, ' + G.profile.name + '!', { pics: [['star'], ['icon', 'heart', '#ff6f91']] }); return; }
    var pics = []; offers.slice(0, 4).forEach(function (o) { pics.push(['char', o.look]); });
    UI.dialog({ name: 'Notice board' }, 'These friends need help! Go and talk to them.', { pics: pics, actions: [{ label: 'Show me', icon: 'hint', cls: 'yellow', fn: function () { AB.quests.showOfferHint(offers[0]); } }, { label: 'OK', icon: 'check', cls: 'green' }] });
  };

  // ------------------------------------------------------------ Settings
  UI.openSettings = function () {
    var s = ST.meta.settings, p = G.profile;
    var body = h('<div>' +
      row('music', 'Music', 'music', s.music !== false) + row('sound', 'Sounds', 'speaker', s.sound !== false) + row('readAloud', 'Read words out loud', 'talk', s.readAloud !== false) +
      '<div class="settings-row"><div class="lab">' + I.svg('users') + 'Switch player</div><button class="btn teal sw">' + I.svg('swap') + ' Who\'s playing?</button></div>' +
      '<div class="settings-row"><div class="lab">' + I.svg('lock') + 'Grown-ups</div><button class="btn white pa">' + I.svg('lock') + ' Open</button></div>' +
      '</div>');
    function row(key, label, icon, val) { return '<div class="settings-row"><div class="lab">' + I.svg(icon) + label + '</div><button class="toggle' + (val ? ' on' : '') + '" data-k="' + key + '" aria-label="' + label + '"></button></div>'; }
    var node = UI.panel('Settings — ' + p.name, 'gear', body, { size: 'mid' });
    on(body, '.toggle', function (b) {
      var k = b.dataset.k, v = !b.classList.contains('on'); b.classList.toggle('on', v);
      s[k] = v; ST.saveMeta();
      if (k === 'music') AB.audio.setMusic(v); if (k === 'sound') AB.audio.setSound(v); if (k === 'readAloud' && !v) stopSpeech();
    });
    body.querySelector('.sw').addEventListener('click', function (e) { e.stopPropagation(); UI.close(node); UI.switchPlayer(); });
    body.querySelector('.pa').addEventListener('click', function (e) { e.stopPropagation(); UI.parentGate(UI.parentArea); });
  };

  // ------------------------------------------------------------ Parent gate
  var WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  UI.parentGate = function (onPass) {
    var n = U.randi(23, 98); if (n % 10 === 0) n++;
    var words = TENS[Math.floor(n / 10)] + '-' + WORDS[n % 10];
    var body = h('<div style="display:flex;flex-direction:column;gap:14px;align-items:center">' +
      '<div class="note" style="font-size:18px;text-align:center">For grown-ups. Type this number:</div><div class="gate-num">' + words + '</div>' +
      '<div class="gate-entry">&nbsp;</div><div class="keypad"></div>' +
      '<button class="btn green holdbtn" disabled><span class="fill"></span>' + I.svg('lock') + ' Hold to open</button></div>');
    var node = UI.panel('Grown-ups only', 'lock', body, { size: 'small' });
    var entry = '', ent = body.querySelector('.gate-entry'), pad = body.querySelector('.keypad'), hb = body.querySelector('.holdbtn'), fill = hb.querySelector('.fill');
    '1 2 3 4 5 6 7 8 9 ⌫ 0 ✓'.split(' ').forEach(function (k) {
      var b = h('<button>' + k + '</button>');
      b.addEventListener('click', function (e) {
        e.stopPropagation(); AB.audio.sfx('tap');
        if (k === '⌫') entry = entry.slice(0, -1); else if (k === '✓') { /* noop */ } else if (entry.length < 3) entry += k;
        ent.textContent = entry || ' '; hb.disabled = entry !== String(n);
      });
      pad.appendChild(b);
    });
    var timer = null, start = 0;
    function begin(e) {
      e.preventDefault(); if (hb.disabled) return; start = performance.now();
      timer = setInterval(function () {
        var k = Math.min(1, (performance.now() - start) / 1500); fill.style.width = (k * 100) + '%';
        if (k >= 1) { clearInterval(timer); timer = null; UI.close(node); onPass(); }
      }, 30);
    }
    function end() { if (timer) { clearInterval(timer); timer = null; } fill.style.width = '0'; }
    hb.addEventListener('pointerdown', begin); hb.addEventListener('pointerup', end); hb.addEventListener('pointerleave', end); hb.addEventListener('pointercancel', end);
  };

  UI.parentArea = function () {
    var body = h('<div><div class="plist"></div>' +
      '<div class="row" style="margin-top:16px"><button class="btn teal ex">' + I.svg('download') + ' Back up all players</button><button class="btn white im">' + I.svg('upload') + ' Restore from backup</button></div>' +
      '<div class="row undo-row" style="margin-top:12px"></div>' +
      '<p class="note store-note"></p><input type="file" accept=".json,application/json" hidden></div>');
    var node = UI.panel('Grown-ups', 'lock', body);
    var list = body.querySelector('.plist');
    function refresh() {
      list.innerHTML = '';
      ST.list().forEach(function (p) {
        var r = h('<div class="prow"><div class="nm">' + esc(p.name) + ' <span class="muted" style="font-size:16px">· ' + p.coins + ' coins · ' + (p.pets.length) + ' pet(s)</span></div>' +
          '<button class="btn yellow rs" style="min-height:52px;font-size:18px">' + I.svg('rotate') + ' Reset</button><button class="btn red dl" style="min-height:52px;font-size:18px">' + I.svg('trash') + ' Delete</button></div>');
        r.insertBefore(CH.portraitCanvas(G.look(p), 56), r.firstChild);
        r.querySelector('.rs').addEventListener('click', function (e) {
          e.stopPropagation();
          UI.confirm({ text: 'Reset ' + p.name + '\'s progress?', note: 'Coins, things, igloo, pets and quests go back to the start. Their character and name stay. You can undo this once from this screen.', yes: 'Reset', yesCls: 'yellow', yesIcon: 'rotate', speak: false,
            onYes: function () { ST.reset(p.id).then(function () { if (G.profile && G.profile.id === p.id) G.profile = ST.get(p.id); refresh(); UI.toast(esc(p.name) + ' was reset'); }); } });
        });
        r.querySelector('.dl').addEventListener('click', function (e) {
          e.stopPropagation();
          UI.confirm({ text: 'Delete ' + p.name + '?', note: 'This removes this player and everything they own. You can undo this once from this screen. Other players are not affected.', yes: 'Delete', yesCls: 'red', yesIcon: 'trash', speak: false,
            onYes: function () {
              var wasActive = G.profile && G.profile.id === p.id;
              ST.remove(p.id).then(function () { if (wasActive) { G.profile = null; UI.closeAll(); UI.whoScreen(); } else refresh(); UI.toast(esc(p.name) + ' was deleted'); });
            } });
        });
        list.appendChild(r);
      });
      var undo = body.querySelector('.undo-row'); undo.innerHTML = '';
      var tr = ST.trash();
      if (tr) {
        var ub = h('<button class="btn white">' + I.svg('arrowBack') + ' Undo: bring back ' + esc(tr.profile.name) + '</button>');
        ub.addEventListener('click', function (e) { e.stopPropagation(); ST.restoreTrash().then(function (p) { if (p && G.profile && G.profile.id === p.id) G.profile = p; refresh(); UI.toast('Restored ' + esc(p.name)); }); });
        undo.appendChild(ub);
      }
      body.querySelector('.store-note').innerHTML = esc('Saves live only on this device (' + (ST.backend === 'indexeddb' ? 'IndexedDB with a local-storage mirror' : ST.backend) + '). ' +
        'Deleting the app, clearing website data, or running out of space can erase them — use "Back up all players" now and then and keep the file somewhere safe (Files / iCloud Drive).' +
        (ST.persisted === false ? ' This browser did not grant permanent storage.' : ''));
    }
    refresh();
    body.querySelector('.ex').addEventListener('click', function (e) {
      e.stopPropagation();
      var json = ST.exportAll(), name = 'aurora-bay-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      var blob = new Blob([json], { type: 'application/json' });
      var shareFile = null; try { shareFile = new File([blob], name, { type: 'application/json' }); } catch (err) { shareFile = null; }
      if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
        navigator.share({ files: [shareFile], title: 'Aurora Bay backup' }).catch(function () { download(blob, name); });
      } else download(blob, name);
    });
    var input = body.querySelector('input[type=file]');
    body.querySelector('.im').addEventListener('click', function (e) { e.stopPropagation(); input.value = ''; input.click(); });
    input.addEventListener('change', function () {
      var f = input.files && input.files[0]; if (!f) return;
      f.text().then(function (txt) {
        var parsed;
        try { parsed = ST.parseImport(txt); } catch (err) { UI.alert(err.message); return; }
        var note = (parsed.replacing.length ? 'These players will be replaced by the backup copy: ' + parsed.replacing.join(', ') + '. ' : '') +
          (parsed.adding.length ? 'These players will be added: ' + parsed.adding.join(', ') + '. ' : '') +
          (parsed.tooMany ? 'There is not room for everyone (' + ST.MAX_PROFILES + ' players max) — extra players are skipped. ' : '') +
          'Players not in the backup are not touched.';
        UI.confirm({ text: 'Restore ' + parsed.profiles.length + ' player(s) from this backup?', note: note, yes: 'Restore', yesIcon: 'upload', speak: false,
          onYes: function () {
            ST.applyImport(parsed).then(function () {
              if (G.profile && ST.get(G.profile.id)) G.profile = ST.get(G.profile.id);
              refresh(); UI.toast('Backup restored');
              if (AB.mode === 'menu') { UI.closeAll(); UI.whoScreen(); }
              else { UI.refreshHud(); if (AB.world.player) AB.world.player.look = G.look(); }
            });
          } });
      });
    });
  };
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    UI.toast(I.svg('download') + ' Backup saved');
  }
})();
