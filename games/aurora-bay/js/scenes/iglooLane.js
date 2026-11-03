/* Igloo Lane — every child's igloo, side by side. Your own igloo takes you home; a sibling's lets you visit. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C, K = AB.kit;
  var SLOTS = [[370, 800, 1.0], [910, 800, 1.0], [300, 470, 0.76], [980, 470, 0.76], [150, 640, 0.88], [1135, 640, 0.88], [470, 385, 0.6], [810, 385, 0.6]];
  var FLAGS = ['#e2574c', '#4a8fe0', '#5dbb63', '#ffcf4a', '#8e6bd8', '#ff8fb1', '#35b5a4', '#ff9a3c'];
  var mailboxBounce = 0, pileShake = 0;
  var sc;

  function iglooProp(p, i, slot) {
    var x = slot[0], y = slot[1], s = slot[2], mine = AB.game.profile && p.id === AB.game.profile.id;
    return {
      x: x, y: y,
      draw: function (ctx, t) {
        A.igloo(ctx, x, y, s, { flag: FLAGS[i % FLAGS.length] });
        // name sign
        var sx = x - 112 * s, sy = y + 6;
        A.box(ctx, sx - 4 * s, sy - 46 * s, 8 * s, 48 * s, 2, C.woodDark, 2.5);
        ctx.font = '900 ' + Math.round(19 * s) + 'px ' + AB.FONT;
        var tw = Math.max(70 * s, ctx.measureText(p.name).width + 24 * s);
        A.box(ctx, sx - tw / 2, sy - 78 * s, tw, 36 * s, 10 * s, mine ? '#fff1b8' : C.cream, 3);
        ctx.fillStyle = C.out; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.name, sx, sy - 59 * s);
        A.ellipse(ctx, sx - tw * 0.2, sy - 78 * s, tw * 0.28, 4 * s, '#fff', 1.5);
        if (mine) { A.glow(ctx, x, y - 30 * s, 40 * s, 'rgba(255,210,120,', 0.25 + 0.1 * Math.sin(t * 2)); }
      }
    };
  }

  sc = {
    id: 'iglooLane', name: 'Igloo Lane', music: 'igloo', ambient: 'wind', outdoor: true, snow: true, footprints: true, aurora: true,
    map: { x: 470, y: 470, icon: 'home' },
    depth: [300, 0.62, 880, 1.04],
    paint: function (ctx) {
      K.skyAndMountains(ctx, 230, 17);
      K.treeline(ctx, 292, 31, 30, 34, 70);
      K.snowGround(ctx, 280);
      K.path(ctx, [[640, 270, 70], [640, 420, 110], [640, 560, 140]]);
      A.ellipse(ctx, 640, 640, 360, 150, '#e3eaf8', 3, '#c6d3ec');
      A.ellipse(ctx, 640, 640, 300, 118, null, 2, 'rgba(160,180,220,0.5)');
      // little hills
      A.drift(ctx, 120, 330, 300, 70); A.drift(ctx, 1170, 330, 320, 80); A.drift(ctx, 640, 300, 200, 30, '#eef3ff');
      // a frozen pond in the middle of the lane
      A.ellipse(ctx, 640, 650, 120, 40, '#c4ebf7', 3, '#8fb8dd');
      A.ellipse(ctx, 620, 642, 60, 14, 'rgba(255,255,255,0.6)', 0);
    },
    animate: function (ctx, t) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(640, 650, 120, 40, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(540 + ((t * 40) % 240), 600, 14, 100); ctx.restore();
    },
    walk: [[560, 270], [720, 270], [740, 350], [1010, 520], [1272, 560], [1272, 892], [8, 892], [8, 560], [270, 520], [540, 350]],
    blocks: [],
    spawns: { 'default': [640, 560], town: [640, 330], map: [640, 560], igloo: [640, 560] },
    hotspots: [],
    props: [],
    questSpots: {},
    npcSpots: {},
    prepare: function (opts) {
      var profiles = AB.store.list();
      var props = [], hot = [], blocks = [{ e: [640, 650, 110, 32] }];
      hot.push({ id: 'toTown', hit: [565, 250, 150, 90], at: [640, 300], icon: 'up', badge: [640, 252], action: function () { AB.go('town', 'iglooLane'); } });
      profiles.forEach(function (p, i) {
        var slot = SLOTS[i]; if (!slot) return;
        var x = slot[0], y = slot[1], s = slot[2], mine = p.id === AB.game.profile.id;
        props.push(iglooProp(p, i, slot));
        blocks.push({ e: [x, y - 22 * s, 96 * s, 44 * s] });
        hot.push({ id: 'igloo_' + p.id, hit: [x - 95 * s, y - 120 * s, 190 * s, 125 * s], at: [x, y + 30 * s], icon: mine ? 'home' : 'eye', badge: [x, y - 132 * s],
          action: function () {
            AB.audio.sfx('door'); sc.lastIgloo = p.id;
            if (mine) AB.go('igloo', 'iglooLane'); else AB.visit(p.id);
          } });
        if (sc.lastIgloo === p.id) sc.spawns.igloo = [x, y + 34 * s];
      });
      // empty plots get trees so the lane never looks bare
      for (var k = profiles.length; k < SLOTS.length; k++) {
        (function (slot, k) {
          var x = slot[0], y = slot[1], h = 150 * slot[2] + 40;
          var shake = { until: 0 };
          props.push({ x: x, y: y, hit: [x - h * 0.3, y - h, h * 0.6, h], at: [x + 60, y + 20],
            draw: function (ctx, t) { ctx.save(); if (t < shake.until) { ctx.translate(x, y); ctx.rotate(Math.sin(t * 40) * 0.03); ctx.translate(-x, -y); } A.pine(ctx, x, y, h); ctx.restore(); },
            tap: function () { shake.until = AB.world.t + 0.5; AB.audio.sfx('snow'); AB.world.burst(x, y - h * 0.6, 'snow', 14); } });
          blocks.push({ e: [x, y - 8, 30, 14] });
        })(SLOTS[k], k);
      }
      // mailbox (gem) and snowball pile (gem)
      props.push({ x: 760, y: 560, hit: [725, 450, 70, 115], at: [800, 590],
        draw: function (ctx, t) {
          var b = Math.max(0, mailboxBounce - t);
          A.shadow(ctx, 760, 562, 24, 6);
          A.box(ctx, 755, 500, 10, 62, 2, C.woodDark, 2.5);
          ctx.save(); ctx.translate(760, 500); ctx.rotate(Math.sin(b * 30) * b * 0.3);
          A.box(ctx, -26, -40, 52, 40, 12, '#4a8fe0', 3); A.box(ctx, -26, -20, 52, 20, 0, null, 0);
          A.line(ctx, [-16, -18, 16, -18], 3); A.ellipse(ctx, 0, -40, 26, 6, '#fff', 2);
          A.box(ctx, 22, -38, 6, 20, 2, C.red, 2); A.box(ctx, 22, -38, 14, 8, 2, C.red, 2);
          ctx.restore();
        },
        tap: function () { mailboxBounce = AB.world.t + 0.6; AB.audio.sfx('pop'); AB.quests.revealGem('gem_iglooLane_1', 800, 600); } });
      blocks.push({ e: [760, 560, 22, 10] });
      props.push({ x: 520, y: 600, hit: [470, 540, 100, 70], at: [520, 640],
        draw: function (ctx, t) {
          var sh = Math.max(0, pileShake - t);
          ctx.save(); ctx.translate(Math.sin(t * 50) * sh * 6, 0);
          A.shadow(ctx, 520, 602, 44, 8);
          [[495, 592, 15], [520, 594, 15], [545, 592, 15], [507, 572, 14], [533, 572, 14], [520, 552, 13]].forEach(function (b) { A.circle(ctx, b[0], b[1], b[2], '#fff', 2.5); A.highlight(ctx, b[0] - 4, b[1] - 5, 4, 2, 0.8); });
          ctx.restore();
        },
        tap: function () { pileShake = AB.world.t + 0.4; AB.audio.sfx('snow'); AB.world.burst(520, 570, 'snow', 10); AB.quests.revealGem('gem_iglooLane_2', 470, 640); } });
      blocks.push({ e: [520, 595, 45, 14] });
      // lamp posts
      [[560, 400], [720, 400]].forEach(function (l) { props.push({ x: l[0], y: l[1], draw: function (ctx, t) { A.lampPost(ctx, l[0], l[1], 100, t); } }); blocks.push({ e: [l[0], l[1], 10, 6] }); });
      sc.props = props; sc.hotspots = hot; sc.blocks = blocks;
    }
  };
  AB.registerScene(sc);
})();
