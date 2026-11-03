/* Aurora Bay — the active player's state and every change to it.
 * All changes to a child's save go through here, act only on AB.game.profile (the child who
 * is playing), and save straight away. Visiting a sibling never changes who AB.game.profile is. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, ST = AB.store;
  var G = AB.game = { profile: null, visiting: null };

  G.setProfile = function (p) {
    if (G.profile && G.profile !== p) ST.saveNow(G.profile);
    G.profile = p; G.visiting = null;
    ST.meta.lastId = p ? p.id : null; ST.saveMeta();
    AB.emit('profile', p);
  };
  G.look = function (p) { p = p || G.profile; return { species: p.species, palette: p.palette, outfit: p.outfit }; };
  G.readOnly = function () { return !G.profile || G.profile._readonly; };

  // ---------------------------------------------------------------- coins
  G.addCoins = function (n, why) {
    var p = G.profile; if (!p || G.readOnly()) return 0;
    n = Math.max(0, Math.floor(n || 0)); if (!n) return 0;
    p.coins += n; p.stats.coinsEarned = (p.stats.coinsEarned || 0) + n;
    ST.saveNow(p);
    AB.emit('coins', p.coins, n, why);
    return n;
  };
  var buying = false;
  /** Spend coins for an item. Returns true once; guards against double taps. */
  function spend(price, give) {
    var p = G.profile;
    if (!p || G.readOnly() || buying) return false;
    if (price < 0 || p.coins < price) return false;
    buying = true;
    try {
      p.coins -= price;
      give(p);
      ST.saveNow(p);
      AB.emit('coins', p.coins, -price, 'buy');
    } finally { setTimeout(function () { buying = false; }, 350); }
    return true;
  }
  G.priceOf = function (kind, id) {
    if (kind === 'clothes') { var c = AB.chars.clothes[id]; return c ? (c.price > 0 ? c.price : c.price === 0 ? 10 : -1) : -1; }
    if (kind === 'furniture') { var f = AB.furniture[id]; return f ? f.price : -1; }
    var parts = id.split('_'), s = AB.roomStyles[parts[0]] && AB.roomStyles[parts[0]][parts.slice(1).join('_')];
    return s ? s.price : -1;
  };
  G.owns = function (kind, id) {
    var p = G.profile; if (!p) return false;
    if (kind === 'clothes') return !!p.owned.clothes[id];
    if (kind === 'styles') return !!p.owned.styles[id];
    return (p.owned.furniture[id] || 0) > 0;
  };
  G.buy = function (kind, id) {
    var price = G.priceOf(kind, id);
    if (price < 0) return false;
    if (kind !== 'furniture' && G.owns(kind, id)) return false;
    return spend(price, function (p) {
      if (kind === 'clothes') p.owned.clothes[id] = true;
      else if (kind === 'styles') p.owned.styles[id] = true;
      else p.owned.furniture[id] = (p.owned.furniture[id] || 0) + 1;
    });
  };
  G.giveItem = function (kind, id) {
    var p = G.profile; if (!p) return;
    if (kind === 'clothes') p.owned.clothes[id] = true;
    else if (kind === 'styles') p.owned.styles[id] = true;
    else p.owned.furniture[id] = (p.owned.furniture[id] || 0) + 1;
    ST.saveNow(p);
  };

  // ---------------------------------------------------------------- outfit
  G.wear = function (id) {
    var p = G.profile, it = AB.chars.clothes[id]; if (!p || !it || !p.owned.clothes[id]) return;
    p.outfit[it.slot] = p.outfit[it.slot] === id ? null : id;
    ST.saveNow(p);
    if (AB.world.player) AB.world.player.look = G.look();
    AB.emit('outfit');
  };

  // ---------------------------------------------------------------- igloo furniture
  // A furniture count in owned.furniture is the total owned; placed copies are subtracted for "in storage".
  G.storageCount = function (id) {
    var p = G.profile; if (!p) return 0;
    var placed = p.igloo.placed.filter(function (f) { return f.item === id; }).length;
    return Math.max(0, (p.owned.furniture[id] || 0) - placed);
  };
  G.canEdit = function () { return !!G.profile && !G.visiting && !G.readOnly(); };

  // ---------------------------------------------------------------- world progress
  G.discover = function (sceneId) {
    var p = G.profile; if (!p || G.visiting) return;
    if (!p.discovered[sceneId]) { p.discovered[sceneId] = true; ST.saveNow(p); AB.emit('discovered', sceneId); }
    p.pos = { scene: sceneId }; ST.saveSoon(p);
  };
  G.found = function (key) { return !!(G.profile && G.profile.found[key]); };
  G.markFound = function (key) { var p = G.profile; if (!p || p.found[key]) return false; p.found[key] = Date.now(); ST.saveNow(p); return true; };

  G.recordMinigame = function (id, result) {
    var p = G.profile; if (!p) return { newBest: false };
    var r = p.records[id] = p.records[id] || { best: 0, plays: 0, coins: 0 };
    var newBest = (result.score || 0) > (r.best || 0) && r.plays > 0;
    r.best = Math.max(r.best || 0, result.score || 0); r.plays++; r.last = Date.now();
    if (result.extra) Object.keys(result.extra).forEach(function (k) { r[k] = (r[k] || 0) + result.extra[k]; });
    p.stats.plays = (p.stats.plays || 0) + 1;
    ST.saveNow(p);
    return { newBest: newBest };
  };

  // ---------------------------------------------------------------- pets
  G.activePet = function () {
    var p = G.profile; if (!p || !p.pets.length) return null;
    for (var i = 0; i < p.pets.length; i++) if (p.pets[i].id === p.activePet) return p.pets[i];
    return null;
  };
  G.adoptPet = function (kind, color, name) {
    var p = G.profile; if (!p) return null;
    var pet = { id: U.uid('pet'), kind: kind, color: color, name: name, happy: 70, adoptedAt: Date.now(), fed: 0, played: 0, petted: 0 };
    p.pets.push(pet); p.activePet = pet.id;
    ST.saveNow(p);
    return pet;
  };
  G.petCare = function (pet, what) {
    if (!pet) return;
    pet[what] = (pet[what] || 0) + 1;
    pet.happy = Math.min(100, (pet.happy || 60) + (what === 'fed' ? 12 : 8));
    pet.lastCare = Date.now();
    ST.saveNow(G.profile);
  };
  /** Pets get a little sleepy over time but never unhappy: mood floors at "content". */
  G.petMood = function (pet) {
    if (!pet) return 60;
    var hours = (Date.now() - (pet.lastCare || pet.adoptedAt)) / 3600000;
    return Math.max(55, Math.min(100, (pet.happy || 70) - hours * 2));
  };

  /** Starting home for a brand-new profile. */
  AB.giveStarterHome = function (p) {
    (AB.FURNITURE_STARTER || []).forEach(function (id) { p.owned.furniture[id] = (p.owned.furniture[id] || 0) + 1; });
    var layout = [
      ['rug_round_blue', 640, 640], ['bed_cozy', 330, 560], ['table_round', 760, 600], ['chair_wood', 860, 610],
      ['lamp_floor', 1020, 560], ['plant_fern', 200, 680]
    ];
    p.igloo.placed = [];
    layout.forEach(function (l) {
      if ((p.owned.furniture[l[0]] || 0) > 0 && AB.furniture[l[0]]) p.igloo.placed.push({ uid: U.uid('f'), item: l[0], x: l[1], y: l[2], flip: false, rot: 0 });
    });
  };
})();
