/* Aurora Bay — friendly little quests, pickups, hidden glimmer stones and hints.
 * Quest state lives in profile.quests[id] = { state: 'active'|'done', step, data, seen }.
 * Nothing is timed and nothing can be failed. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, G = AB.game;
  var Q = AB.quests = {};
  var W = AB.world;

  function st(id) { return G.profile && G.profile.quests[id]; }
  function save() { AB.store.saveNow(G.profile); AB.ui.refreshHud && AB.ui.refreshHud(); }
  function begin(id, data) { G.profile.quests[id] = { state: 'active', step: 0, data: data || {}, seen: false, at: Date.now() }; save(); AB.audio.sfx('sparkle'); }
  function finish(id, reward) {
    var q = st(id); q.state = 'done'; q.seen = false; q.doneAt = Date.now();
    if (reward.coins) G.addCoins(reward.coins, 'quest');
    if (reward.item) G.giveItem(reward.item[0], reward.item[1]);
    save(); AB.audio.sfx('success');
    if (W.player) { W.player.pose = 'happy'; W.player.poseUntil = W.t + 2; W.burst(W.player.x, W.player.y - 80, 'star', 12); }
    W.setHint(null);
  }
  function say(vid, text, pics, actions) { var d = AB.villagers.defs[vid]; AB.ui.dialog({ name: d.name, look: d.look }, text, { pics: pics, actions: actions }); }
  function yesNo(yesLabel, onYes) { return [{ label: yesLabel || 'Yes!', icon: 'check', cls: 'green', fn: onYes }, { label: 'Not now', icon: 'close', cls: 'white' }]; }
  function rewardPic(r) { var p = [['coin']]; if (r.item) p.push(r.item[0] === 'clothes' ? ['item', r.item[1]] : ['furn', r.item[1]]); return p; }

  // ------------------------------------------------------------------ quest definitions
  var DEFS = Q.defs = {
    scarf: {
      title: 'Dot\'s lost scarf', giver: 'dot', steps: 2, pic: ['scarf'], reward: { coins: 40, item: ['clothes', 'scarf_dot'] },
      now: function (q) { return q.step === 0 ? 'Find Dot\'s pink scarf. It blew toward the Frozen Lake!' : 'Give the scarf back to Dot in Town Square.'; },
      hint: function (q) { return q.step === 0 ? spot('lake', q.data.dropped ? 'scarfDrop' : 'scarfDrop', -110) : villagerSpot('dot'); },
      talk: function (q) {
        if (!q) { say('dot', 'Oh no! The wind took my pink scarf! Can you find it? I think it flew to the lake.', [['scarf'], ['arrow'], ['icon', 'fish', '#35b5a4']], yesNo('I\'ll help!', function () { begin('scarf'); Q.showHint('scarf'); })); return true; }
        if (q.step === 0) { say('dot', 'My scarf flew to the Frozen Lake. Maybe it\'s stuck in a tree!', [['scarf'], ['arrow'], ['icon', 'map', '#35b5a4']]); return true; }
        if (q.step === 1) { say('dot', 'My scarf! Thank you! Here — a scarf just like mine, so we can match!', rewardPic(this.reward)); finish('scarf', this.reward); return true; }
      }
    },
    cocoa: {
      title: 'Cocoa for Bramble', giver: 'mabel', steps: 1, pic: ['mug', '#e2574c'], reward: { coins: 40, item: ['furniture', 'lantern'] },
      now: function () { return 'Take the warm cocoa to Bramble in the lighthouse at the Harbor.'; },
      hint: function () { return { scene: 'harbor', key: 'lighthouseDoor' }; },
      talk: function (q) {
        if (!q) { say('mabel', 'Bramble the lighthouse keeper works so hard. Could you bring this cocoa to the lighthouse?', [['mug', '#e2574c'], ['arrow'], ['char', AB.villagers.look('bramble')]], yesNo('Yes!', function () { begin('cocoa'); AB.ui.toast('You got warm cocoa!', AB.ui.pic(['mug', '#e2574c'], 44)); })); return true; }
        say('mabel', 'Bramble is in the lighthouse at the Harbor. Hurry while it\'s warm!', [['mug', '#e2574c'], ['arrow'], ['icon', 'map']]); return true;
      },
      talkOther: { bramble: function (q) { if (q && q.state === 'active') { say('bramble', 'Hoo! Cocoa from Mabel? How lovely! Take this lantern for your igloo.', rewardPic(DEFS.cocoa.reward)); finish('cocoa', DEFS.cocoa.reward); return true; } } }
    },
    shells: {
      title: 'Shells on the shore', giver: 'finn', steps: 5, pic: ['shell'], reward: { coins: 45, item: ['furniture', 'rug_fish'] },
      now: function (q) { return 'Find shiny shells at the Harbor. ' + (q.data.got || []).length + ' of 5 found.'; },
      hint: function (q) { var n = nextSpot('harbor', ['shell1', 'shell2', 'shell3', 'shell4', 'shell5'], q.data.got || []); return n || villagerSpot('finn'); },
      talk: function (q) {
        if (!q) { say('finn', 'Ahoy! Shiny shells wash up on my beach. Can you find 5 of them?', [['shell'], ['shell'], ['shell'], ['shell'], ['shell']], yesNo('Aye aye!', function () { begin('shells', { got: [] }); Q.placePickups(W.sceneId); })); return true; }
        if ((q.data.got || []).length >= 5) { say('finn', 'Five shells! Shipshape! Here\'s a fishy rug for your igloo.', rewardPic(this.reward)); finish('shells', this.reward); return true; }
        say('finn', 'Look along the beach and the dock. ' + (q.data.got || []).length + ' of 5!', [['shell']]); return true;
      }
    },
    tracks: {
      title: 'Mystery tracks', giver: 'finn', after: 'shells', steps: 4, pic: ['tracks'], reward: { coins: 50, item: ['furniture', 'pic_aurora'] },
      now: function (q) { var n = (q.data.got || []).length; return n < 3 ? 'Find 3 sets of animal tracks: Town Square, Frozen Lake, Snowy Slopes. ' + n + ' of 3.' : 'Tell Captain Finn what you found!'; },
      hint: function (q) {
        var got = q.data.got || [];
        if (got.length >= 3) return villagerSpot('finn');
        var order = [['town', 'tracksTown'], ['lake', 'tracksLake'], ['slopes', 'tracksSlopes']];
        for (var i = 0; i < order.length; i++) if (got.indexOf(order[i][1]) < 0) return spot(order[i][0], order[i][1]);
      },
      talk: function (q) {
        if (!q) { say('finn', 'Someone has been leaving little tracks all over the island! Can you find 3 sets?', [['tracks'], ['icon', 'hint', '#8e6bd8']], yesNo('Let\'s look!', function () { begin('tracks', { got: [] }); Q.showHint('tracks'); })); return true; }
        if ((q.data.got || []).length >= 3) { say('finn', 'Those are snowshoe hare tracks! A hare family just moved in. Here\'s a painting to remember it!', rewardPic(this.reward)); finish('tracks', this.reward); return true; }
        say('finn', 'Look in Town Square, at the Frozen Lake and on the Snowy Slopes.', [['tracks']]); return true;
      }
    },
    sculpture: {
      title: 'Decorate the snow seal', giver: 'ollie', steps: 4, pic: ['star'], reward: { coins: 60, item: ['furniture', 'ice_tree'] },
      now: function (q) {
        var got = q.data.got || [], need = [];
        if (got.indexOf('pinecone') < 0) need.push('a pinecone (Frozen Lake)'); if (got.indexOf('shell') < 0) need.push('a pink shell (Harbor)'); if (got.indexOf('star') < 0) need.push('a star (Snowy Slopes)');
        return need.length ? 'Find ' + need.join(', ') + '.' : 'Bring everything to Ollie at the snow seal!';
      },
      hint: function (q) {
        var got = q.data.got || [];
        if (got.indexOf('pinecone') < 0) return spot('lake', 'pinecone');
        if (got.indexOf('shell') < 0) return spot('harbor', 'sculptShell');
        if (got.indexOf('star') < 0) return spot('slopes', 'star');
        return spot('town', 'sculpture');
      },
      talk: function (q) {
        if (!q) { say('ollie', 'I built a snow seal! It needs decorations: a pinecone nose, a pink shell and a shiny star. Can you find them?', [['pinecone'], ['shell'], ['star']], yesNo('I\'ll find them!', function () { begin('sculpture', { got: [], placed: [] }); Q.placePickups(W.sceneId); })); return true; }
        return deliverSculpture(q, true);
      }
    },
    fishing: {
      title: 'Gus\'s fishing buddy', giver: 'gus', steps: 1, pic: ['fish', 'sunny'], reward: { coins: 35, item: ['furniture', 'pic_fish'] },
      now: function (q) { return 'Catch 5 fish at the ice fishing hut. ' + Math.min(5, q.data.caught || 0) + ' of 5.'; },
      hint: function () { return { scene: 'lake', key: 'fishing' }; },
      talk: function (q) {
        if (!q) { say('gus', 'Want to be my fishing buddy? Catch 5 fish and I\'ll give you a fishy picture!', [['fish', 'sunny'], ['fish', 'bluegill'], ['fish', 'rosy']], [{ label: 'Let\'s fish!', icon: 'fish', cls: 'green', fn: function () { begin('fishing', { caught: 0 }); AB.playMinigame('fishing'); } }, { label: 'Not now', icon: 'close', cls: 'white' }]); return true; }
        if ((q.data.caught || 0) >= 5) { say('gus', 'Five fish! You\'re a real fisher now! This picture is for you.', rewardPic(this.reward)); finish('fishing', this.reward); return true; }
        say('gus', 'You caught ' + (q.data.caught || 0) + ' so far. Keep going!', [['fish', 'gold']], [{ label: 'Go fishing', icon: 'fish', cls: 'green', fn: function () { AB.playMinigame('fishing'); } }, { label: 'Bye!', icon: 'check', cls: 'white' }]); return true;
      }
    }
  };
  Q.ORDER = ['scarf', 'cocoa', 'sculpture', 'shells', 'tracks', 'fishing'];

  function deliverSculpture(q, fromOllie) {
    var got = q.data.got || [], placed = q.data.placed || (q.data.placed = []);
    var newOnes = got.filter(function (k) { return placed.indexOf(k) < 0; });
    var p = G.profile;
    newOnes.forEach(function (k) { placed.push(k); if (p.sculpture.indexOf(k) < 0) p.sculpture.push(k); });
    if (newOnes.length) { AB.audio.sfx('sparkle'); W.burst(640, 400, 'sparkle', 14); }
    if (placed.length >= 3) { say('ollie', 'It\'s beautiful! The snow seal is the best in town! Thank you!', rewardPic(DEFS.sculpture.reward)); finish('sculpture', DEFS.sculpture.reward); return true; }
    save();
    if (newOnes.length) say('ollie', 'Ooh, that looks great on it! ' + (3 - placed.length) + ' more to go!', newOnes.map(function (k) { return [k === 'shell' ? 'shell' : k]; }));
    else if (fromOllie) say('ollie', DEFS.sculpture.now(q), [['pinecone'], ['shell'], ['star']]);
    else return false;
    return true;
  }

  // ------------------------------------------------------------------ helpers for hints
  function spot(scene, key, dy) {
    var sc = AB.scenes[scene]; var s = sc && sc.questSpots && sc.questSpots[key];
    return s ? { scene: scene, x: s[0], y: s[1] + (dy || 0) * 0 } : { scene: scene };
  }
  function villagerSpot(vid) {
    var d = AB.villagers.defs[vid], sc = AB.scenes[d.scene], s = sc && sc.npcSpots && sc.npcSpots[vid];
    return s ? { scene: d.scene, x: s.at[0], y: s.at[1], villager: vid } : { scene: d.scene };
  }
  function nextSpot(scene, keys, got) { for (var i = 0; i < keys.length; i++) if (got.indexOf(keys[i]) < 0) return spot(scene, keys[i]); return null; }

  // ------------------------------------------------------------------ public API
  Q.talk = function (vid, actor) {
    // quests where this villager is the receiver
    for (var i = 0; i < Q.ORDER.length; i++) {
      var d = DEFS[Q.ORDER[i]], q = st(Q.ORDER[i]);
      if (d.talkOther && d.talkOther[vid] && d.talkOther[vid](q)) return true;
    }
    // quests this villager gives: active first, then the first one not started
    var mine = Q.ORDER.filter(function (id) { return DEFS[id].giver === vid; });
    for (var j = 0; j < mine.length; j++) { var qa = st(mine[j]); if (qa && qa.state === 'active') return DEFS[mine[j]].talk(qa); }
    for (var k = 0; k < mine.length; k++) {
      var id = mine[k], qs = st(id), def = DEFS[id];
      if (qs) continue;
      if (def.after && !(st(def.after) && st(def.after).state === 'done')) continue;
      return def.talk(null);
    }
    return false;
  };
  Q.journal = function () {
    if (!G.profile) return [];
    return Q.ORDER.filter(function (id) { return st(id); }).map(function (id) {
      var q = st(id), d = DEFS[id];
      var step = id === 'shells' ? (q.data.got || []).length : id === 'tracks' ? Math.min(3, (q.data.got || []).length) + (q.state === 'done' ? 1 : 0)
        : id === 'sculpture' ? (q.data.got || []).length : id === 'fishing' ? 0 : q.step;
      return { id: id, title: d.title, pic: d.pic, steps: d.steps, step: step, done: q.state === 'done', now: q.state === 'done' ? '' : d.now(q) };
    }).sort(function (a, b) { return a.done - b.done; });
  };
  Q.offers = function () {
    return Q.ORDER.filter(function (id) { var d = DEFS[id]; return !st(id) && (!d.after || (st(d.after) && st(d.after).state === 'done')); })
      .map(function (id) { return { id: id, giver: DEFS[id].giver, look: AB.villagers.look(DEFS[id].giver) }; });
  };
  /** Does this villager have something new to say (a quest to offer or to finish)? */
  Q.npcNews = function (vid) {
    if (!G.profile || G.visiting) return false;
    if (Q.offers().some(function (o) { return o.giver === vid; })) return true;
    var a = function (id) { var q = st(id); return q && q.state === 'active' ? q : null; };
    var q;
    if (vid === 'dot' && (q = a('scarf')) && q.step === 1) return true;
    if (vid === 'bramble' && a('cocoa')) return true;
    if (vid === 'finn' && (((q = a('shells')) && (q.data.got || []).length >= 5) || ((q = a('tracks')) && (q.data.got || []).length >= 3))) return true;
    if (vid === 'ollie' && (q = a('sculpture')) && (q.data.got || []).some(function (k) { return (q.data.placed || []).indexOf(k) < 0; })) return true;
    if (vid === 'gus' && (q = a('fishing')) && (q.data.caught || 0) >= 5) return true;
    return false;
  };
  Q.showOfferHint = function (o) { var h = villagerSpot(o.giver); W.setHint(h); goHint(h); };
  Q.doneCount = function () { return Q.ORDER.filter(function (id) { var q = st(id); return q && q.state === 'done'; }).length; };
  Q.hasNews = function () { return Q.ORDER.some(function (id) { var q = st(id); return q && q.seen === false; }); };
  Q.seen = function () { var ch = false; Q.ORDER.forEach(function (id) { var q = st(id); if (q && !q.seen) { q.seen = true; ch = true; } }); if (ch) AB.store.saveSoon(G.profile); };
  Q.hintScene = function () { return W.hint ? W.hint.scene : null; };
  Q.showHint = function (id) {
    var q = st(id), d = DEFS[id]; if (!q || !d.hint) return;
    var h = d.hint(q); if (!h) return;
    goHint(h);
  };
  function goHint(h) {
    if (h.key) { var sc = AB.scenes[h.scene], hs = (sc.hotspots || []).filter(function (x) { return x.id === h.key; })[0]; if (hs) { h.x = hs.at[0]; h.y = hs.at[1]; } }
    if (h.x == null) { var s2 = AB.scenes[h.scene]; var sp = s2 && s2.spawns && s2.spawns['default']; if (sp) { h.x = sp[0]; h.y = sp[1]; } }
    W.setHint(h);
    if (W.sceneId === h.scene) { AB.ui.toast(AB.icons.svg('hint') + ' Look for the yellow arrow!'); AB.ui.speak('Look for the yellow arrow!'); }
    else if (W.sceneId === 'igloo' && h.scene === 'iglooLane') { AB.ui.toast('Go outside!'); }
    else { AB.ui.openMap(); AB.ui.speak('Tap the glowing place on the map!'); }
  }
  AB.on('scene', function (id) { if (W.hint && W.hint.scene === id) AB.audio.sfx('sparkle'); });

  // ------------------------------------------------------------------ pickups
  function addPickup(type, key, xy, extra) {
    if (!xy) return;
    var x = xy[0], y = xy[1];
    if (!W.walkable(x, y)) { var n = W.nearestWalkable(x, y); if (n) { x = n[0]; y = n[1]; } }
    var pk = { type: type, key: key, x: x, y: y, born: W.t };
    if (extra) Object.keys(extra).forEach(function (k) { pk[k] = extra[k]; });
    W.pickups.push(pk); return pk;
  }
  Q.placePickups = function (sceneId) {
    W.pickups = W.pickups.filter(function (p) { return p.type === 'gem'; });
    var sc = AB.scenes[sceneId]; if (!sc || !G.profile || G.visiting) return;
    var qs = sc.questSpots || {};
    var scarf = st('scarf');
    if (sceneId === 'lake' && (!scarf || (scarf.state === 'active' && scarf.step === 0))) {
      if (G.profile.found.scarfDropped) addPickup('scarf', 'scarf', qs.scarfDrop);
      else if (qs.scarfDrop) W.pickups.push({ type: 'scarfTree', key: 'scarfTree', x: qs.scarfDrop[0], y: qs.scarfDrop[1] - 125, noTap: true, decor: true });
    }
    var sh = st('shells');
    if (sceneId === 'harbor' && sh && sh.state === 'active') ['shell1', 'shell2', 'shell3', 'shell4', 'shell5'].forEach(function (k) { if ((sh.data.got || []).indexOf(k) < 0) addPickup('shell', k, qs[k]); });
    var tr = st('tracks');
    if (tr && tr.state === 'active') { var tk = { town: 'tracksTown', lake: 'tracksLake', slopes: 'tracksSlopes' }[sceneId]; if (tk && (tr.data.got || []).indexOf(tk) < 0) addPickup('tracks', tk, qs[tk]); }
    var sp = st('sculpture');
    if (sp && sp.state === 'active') {
      var got = sp.data.got || [];
      if (sceneId === 'lake' && got.indexOf('pinecone') < 0) addPickup('pinecone', 'pinecone', qs.pinecone);
      if (sceneId === 'harbor' && got.indexOf('shell') < 0) addPickup('pinkshell', 'shell', qs.sculptShell);
      if (sceneId === 'slopes' && got.indexOf('star') < 0) addPickup('star', 'star', qs.star);
    }
  };
  Q.drawPickup = function (ctx, pk, t) {
    var bob = Math.sin(t * 3 + pk.x) * 4, x = pk.x, y = pk.y;
    if (pk.type === 'scarfTree') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * 0.12);
      A.scarfIcon(ctx, 0, 0, 1.3, '#ff8fb1', '#fff'); ctx.restore();
      A.sparkle(ctx, x + 22, y - 16, 7, 0.5 + 0.5 * Math.sin(t * 4)); return;
    }
    if (pk.falling) {
      var k = Math.min(1, (t - pk.fallT) / 0.9); y = U.lerp(pk.fromY, pk.y, U.ease(k)); if (k >= 1) pk.falling = false;
    }
    if (pk.type === 'tracks') {
      ctx.save(); ctx.globalAlpha = 0.85;
      for (var i = 0; i < 4; i++) A.tracks(ctx, x - 70 + i * 40, y + (i % 2 ? -8 : 6), 1.1, 0.9);
      ctx.restore();
      A.glow(ctx, x, y, 70, 'rgba(255,240,150,', 0.25 + 0.15 * Math.sin(t * 3));
      A.sparkle(ctx, x + 50, y - 20, 8, 0.5 + 0.5 * Math.sin(t * 4)); return;
    }
    A.shadow(ctx, x, y + 2, 18, 6, 0.2);
    A.glow(ctx, x, y - 20 + bob, 40, 'rgba(255,240,170,', 0.35);
    if (pk.type === 'gem') A.gem(ctx, x, y - 22 + bob, 1, Q.gemColor(pk.key), t);
    else if (pk.type === 'scarf') A.scarfIcon(ctx, x, y - 14 + bob, 1.2, '#ff8fb1', '#fff');
    else if (pk.type === 'shell') A.shell(ctx, x, y - 10 + bob, 1.1, '#ffd9c2');
    else if (pk.type === 'pinkshell') A.shell(ctx, x, y - 12 + bob, 1.4, '#ff9ec0');
    else if (pk.type === 'pinecone') A.pinecone(ctx, x, y - 16 + bob, 1.3);
    else if (pk.type === 'star') A.star(ctx, x, y - 26 + bob, 20, '#ffcf4a', 3);
    A.sparkle(ctx, x + 16, y - 36 + bob, 6, 0.5 + 0.5 * Math.sin(t * 5 + x));
  };
  Q.collect = function (pk) {
    if (pk.gone || pk.decor) return;
    pk.gone = true;
    var p = G.profile;
    W.burst(pk.x, pk.y - 20, 'sparkle', 10); AB.audio.sfx('star');
    if (W.player) { W.player.pose = 'happy'; W.player.poseUntil = W.t + 1.2; }
    if (pk.type === 'gem') {
      if (G.markFound(pk.key)) {
        G.addCoins(10, 'silent');
        var n = Q.gemList().filter(function (k) { return p.found[k]; }).length;
        AB.ui.toast('Glimmer stone! ' + n + ' / ' + Q.gemList().length + ' <span class="coin"></span>+10', AB.ui.pic(['gem', Q.gemColor(pk.key)], 44));
        AB.audio.sfx('coin');
        if (n === Q.gemList().length && !p.owned.clothes.crown) { G.giveItem('clothes', 'crown'); AB.ui.dialog({ name: 'Aurora Bay' }, 'You found every glimmer stone! Here is a crown, treasure hunter!', { pics: [['item', 'crown']] }); }
      }
      return;
    }
    if (pk.type === 'scarf') {
      var q = st('scarf');
      if (!q) { begin('scarf'); q = st('scarf'); }
      q.step = 1; q.seen = false; save();
      AB.ui.dialog({ name: p.name, look: G.look() }, 'A pink scarf! It must be Dot\'s. Let\'s take it back to Town Square!', { pics: [['scarf'], ['arrow'], ['char', AB.villagers.look('dot')]] });
      return;
    }
    if (pk.type === 'shell') {
      var s = st('shells'); s.data.got = s.data.got || []; if (s.data.got.indexOf(pk.key) < 0) s.data.got.push(pk.key); s.seen = false; save();
      AB.ui.toast('Shell ' + s.data.got.length + ' / 5', AB.ui.pic(['shell'], 44));
      if (s.data.got.length >= 5) AB.ui.dialog({ name: p.name, look: G.look() }, 'Five shells! Let\'s show Captain Finn!', { pics: [['shell'], ['arrow'], ['char', AB.villagers.look('finn')]] });
      return;
    }
    if (pk.type === 'tracks') {
      var tq = st('tracks'); tq.data.got = tq.data.got || []; if (tq.data.got.indexOf(pk.key) < 0) tq.data.got.push(pk.key); tq.seen = false; save();
      AB.ui.toast('Tracks found! ' + tq.data.got.length + ' / 3', AB.ui.pic(['tracks'], 44));
      if (tq.data.got.length >= 3) AB.ui.dialog({ name: p.name, look: G.look() }, 'Hop, hop, hop… all three! Let\'s tell Captain Finn!', { pics: [['tracks'], ['arrow'], ['char', AB.villagers.look('finn')]] });
      return;
    }
    if (pk.type === 'pinecone' || pk.type === 'pinkshell' || pk.type === 'star') {
      var sq = st('sculpture'); sq.data.got = sq.data.got || []; if (sq.data.got.indexOf(pk.key) < 0) sq.data.got.push(pk.key); sq.seen = false; save();
      var pic = pk.type === 'pinkshell' ? ['shell'] : [pk.type];
      AB.ui.toast('Got it! ' + sq.data.got.length + ' / 3', AB.ui.pic(pic, 44));
      if (sq.data.got.length >= 3) AB.ui.dialog({ name: p.name, look: G.look() }, 'I have everything! Back to Ollie and the snow seal!', { pics: [['pinecone'], ['shell'], ['star'], ['arrow'], ['char', AB.villagers.look('ollie')]] });
    }
  };
  /** Scene props call this for quest-relevant taps. */
  Q.event = function (type, spotId) {
    if (type === 'tap' && spotId === 'scarfTree' && W.sceneId === 'lake' && G.profile && !G.profile.found.scarfDropped) {
      var scarf = st('scarf'); if (scarf && scarf.state === 'done') return;
      var deco = W.pickups.filter(function (p) { return p.type === 'scarfTree'; })[0];
      G.markFound('scarfDropped');
      W.pickups = W.pickups.filter(function (p) { return p.type !== 'scarfTree'; });
      var qs = AB.scenes.lake.questSpots;
      var pk = addPickup('scarf', 'scarf', qs.scarfDrop);
      if (pk && deco) { pk.falling = true; pk.fallT = W.t; pk.fromY = deco.y; }
      AB.audio.sfx('whoosh');
    }
  };
  Q.tapSculpture = function () {
    var q = st('sculpture');
    if (q && q.state === 'active' && deliverSculpture(q, false)) return;
    W.burst(640, 380, 'sparkle', 8); AB.audio.sfx('sparkle');
    if (!q) { var o = W.npcs.filter(function (n) { return n.id === 'ollie'; })[0]; if (o) W.say(o, 'Like my snow seal?', 2); }
  };

  // ------------------------------------------------------------------ glimmer stones
  var GEMS = ['gem_town_tree', 'gem_bell'];
  ['iglooLane', 'lake', 'slopes', 'harbor', 'lighthouse', 'cafe', 'shop', 'lodge'].forEach(function (s) { GEMS.push('gem_' + s + '_1', 'gem_' + s + '_2'); });
  Q.gemList = function () { return GEMS; };
  var GEM_COLS = ['#7fe3ff', '#ff9ec0', '#b6f28a', '#ffd86b', '#c7a6ff', '#7fffd4'];
  Q.gemColor = function (key) { var h = 0; for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0; return GEM_COLS[h % GEM_COLS.length]; };
  Q.revealGem = function (key, x, y) {
    if (!G.profile || G.visiting || G.found(key)) return;
    if (W.pickups.some(function (p) { return p.key === key; })) return;
    var pk = addPickup('gem', key, [x, y]);
    if (pk) { AB.audio.sfx('sparkle'); W.burst(pk.x, pk.y - 20, 'sparkle', 8); }
  };

  // minigame results feed Gus's quest
  AB.on('minigame-done', function (id, result) {
    if (id !== 'fishing') return;
    var q = st('fishing'); if (!q || q.state !== 'active') return;
    var fish = 0; (result.stats || []).forEach(function (s) { if (s.icon === 'fish') fish = Math.max(fish, s.value || 0); });
    q.data.caught = (q.data.caught || 0) + fish; q.seen = false; save();
  });
})();
