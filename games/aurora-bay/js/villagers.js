/* Aurora Bay — the friendly villagers. Each lives in one scene (the scene says where via npcSpots). */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util;
  var V = AB.villagers = {};

  V.defs = {
    ollie: { name: 'Ollie', scene: 'town', look: { species: 'penguin', palette: 'rockhopper', outfit: { head: 'beanie_stripe', neck: 'scarf_green' } },
      hello: 'Hi there!', chat: ['I make snow sculptures!', 'The bell in the square rings so nicely.', 'Have you seen the northern lights tonight?'] },
    dot: { name: 'Dot', scene: 'town', scale: 0.82, look: { species: 'fox', palette: 'cream', outfit: { head: 'flower_crown' } },
      hello: 'Hello!', chat: ['I love jumping in snow piles!', 'Let\'s be friends!', 'Tap the snowman — he jumps!'] },
    mabel: { name: 'Mabel', scene: 'cafe', look: { species: 'bear', palette: 'honey', outfit: { head: 'chef', body: 'apron' } },
      hello: 'Welcome in!', chat: ['Hot cocoa warms your paws!', 'Want to help me serve? Tap the counter!'],
      act: { label: 'Help serve', icon: 'mug', fn: function () { AB.playMinigame('cocoa'); } } },
    tilly: { name: 'Tilly', scene: 'shop', look: { species: 'hare', palette: 'silver', outfit: { neck: 'bowtie', body: 'shirt_stripe' } },
      hello: 'Hi, shopper!', chat: ['New hats are in!', 'A sofa makes an igloo cozy!'],
      act: { label: 'Clothes', icon: 'shirt', fn: function () { AB.ui.openCatalog('clothes'); } }, act2: { label: 'Furniture', icon: 'sofa', fn: function () { AB.ui.openCatalog('furniture'); } } },
    hazel: { name: 'Hazel', scene: 'lodge', look: { species: 'fox', palette: 'blue', outfit: { head: 'earmuffs', body: 'sweater_red' } },
      hello: 'Hi, friend!', chat: ['These little ones need a home!', 'Pets love cuddles and snacks!'],
      act: { label: 'Adopt a pet', icon: 'paw', fn: function () { AB.petsUI.openAdopt(); } } },
    gus: { name: 'Gus', scene: 'lake', look: { species: 'bear', palette: 'mist', outfit: { head: 'beanie_red', body: 'puffer' } },
      hello: 'Ahoy!', chat: ['The fish are biting today!', 'Shh… I think a big one is under the ice.'],
      act: { label: 'Go fishing', icon: 'fish', fn: function () { AB.playMinigame('fishing'); } } },
    pebble: { name: 'Pebble', scene: 'lake', scale: 0.85, skate: true, look: { species: 'penguin', palette: 'little', outfit: { face: 'goggles', neck: 'scarf_rainbow' } },
      hello: 'Wheee!', chat: ['Walk on the ice to skate!', 'I can spin! Can you?'] },
    juniper: { name: 'Juniper', scene: 'slopes', look: { species: 'owl', palette: 'golden', outfit: { head: 'star_band', neck: 'scarf_red' } },
      hello: 'Ready, set…', chat: ['Grab the stars on the way down!', 'Bump a snowman? Just shake it off!'],
      act: { label: 'Go sledding', icon: 'sled', fn: function () { AB.playMinigame('sled'); } } },
    finn: { name: 'Captain Finn', scene: 'harbor', look: { species: 'seal', palette: 'harp', outfit: { head: 'captain', body: 'navy_coat' } },
      hello: 'Ahoy, matey!', chat: ['The sea is calm tonight.', 'Puffins sit on that rock every evening.'] },
    bramble: { name: 'Bramble', scene: 'lighthouse', look: { species: 'owl', palette: 'snowy', outfit: { face: 'glasses_round', neck: 'scarf_red' } },
      hello: 'Hoo! Hello!', chat: ['I keep the light shining for the boats.', 'Look through my telescope!'] }
  };

  V.look = function (id) { return V.defs[id].look; };

  V.forScene = function (sceneId) {
    var sc = AB.scenes[sceneId], out = [];
    if (!sc) return out;
    Object.keys(sc.npcSpots || {}).forEach(function (id) {
      var d = V.defs[id]; if (!d) return;
      var spot = sc.npcSpots[id];
      var a = AB.world.makeActor({ look: d.look, x: spot.at[0], y: spot.at[1], speed: 110, name: d.name });
      a.id = id; a.dir = spot.dir || 1; a.wander = spot.wander || null; a.hello = d.hello; a.scaleMul = d.scale || 1;
      a.skate = !!d.skate; a.label = d.name; a.nextWander = AB.world.t + U.rand(1, 5);
      out.push(a);
    });
    // In visit mode the sibling is a friendly host in their own igloo.
    if (sceneId === 'igloo' && AB.game.visiting) {
      var o = AB.game.visiting;
      var host = AB.world.makeActor({ look: { species: o.species, palette: o.palette, outfit: o.outfit }, x: 820, y: 640, speed: AB.chars.species[o.species].speed * 0.6, name: o.name });
      host.id = 'host'; host.label = o.name; host.hello = 'Welcome!'; host.wander = [300, 540, 700, 250]; host.isHost = true;
      out.push(host);
    }
    return out;
  };

  V.talk = function (actor) {
    if (actor.isHost) {
      var o = AB.game.visiting;
      AB.world.say(actor, 'Hi, ' + AB.game.profile.name + '!', 2);
      AB.ui.dialog({ name: o.name, look: actor.look }, U.pick(['Welcome to my igloo! Look around!', 'Do you like my room?', 'Thanks for visiting me!', 'Try sitting on my chairs!']),
        { actions: [{ label: 'Wave', icon: 'wave', cls: 'yellow', fn: function () { var p = AB.world.player; p.pose = 'wave'; p.poseUntil = AB.world.t + 1.6; actor.pose = 'happy'; actor.poseUntil = AB.world.t + 1.6; AB.world.burst(actor.x, actor.y - 80, 'heart', 4); } }, { label: 'Bye!', icon: 'check', cls: 'green' }] });
      return;
    }
    var d = V.defs[actor.id]; if (!d) return;
    actor.pose = 'wave'; actor.poseUntil = AB.world.t + 1.5;
    if (AB.quests.talk(actor.id, actor)) return;
    var actions = [];
    if (d.act) actions.push({ label: d.act.label, icon: d.act.icon, cls: 'yellow', fn: d.act.fn });
    if (d.act2) actions.push({ label: d.act2.label, icon: d.act2.icon, cls: 'purple', fn: d.act2.fn });
    actions.push({ label: 'Bye!', icon: 'check', cls: 'green' });
    var line = d.chat[(d._i = ((d._i || 0) + 1)) % d.chat.length];
    AB.ui.dialog({ name: d.name, look: d.look }, line, { actions: actions });
  };
})();
