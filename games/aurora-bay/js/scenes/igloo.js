/* The igloo interior. Shows the active child's igloo — or, when visiting, a read-only copy of a sibling's. */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util, A = AB.art, C = A.C;
  var IG = AB.iglooRoom = {
    WALL: { x: 120, y: 90, w: 1040, h: 380 },
    FLOOR: { x: 10, y: 470, w: 1260, h: 420 },
    WINDOWS: [[390, 300], [890, 300]],
    DOOR: { x: 545, y: 760, w: 190, h: 140 },
    FLOOR_TOP: 500, FLOOR_BOTTOM: 862
  };
  IG.domePath = function (c) { c.moveTo(120, 470); c.ellipse(640, 470, 520, 380, 0, Math.PI, Math.PI * 2); c.lineTo(1160, 470); c.closePath(); };
  IG.floorPath = function (c) { c.moveTo(120, 470); c.lineTo(1160, 470); c.lineTo(1270, 890); c.lineTo(10, 890); c.closePath(); };
  IG.floorLeft = function (y) { return 120 - (y - 470) * (110 / 420); };
  IG.floorRight = function (y) { return 1160 + (y - 470) * (110 / 420); };
  /** Keep a placed item inside the room and out of the doorway. Mutates and returns pl. */
  IG.clamp = function (pl) {
    var f = AB.furniture[pl.item]; if (!f) return pl;
    var box = AB.furnitureBox ? AB.furnitureBox(pl.item, pl.rot || 0) : { w: f.w, h: f.h };
    if (f.place === 'wall') {
      pl.y = U.clamp(pl.y, 120 + box.h / 2, 440 - box.h / 2);
      // inside the dome: half-width of the ellipse at this height
      var dy = (pl.y - 470) / 380, half = 520 * Math.sqrt(Math.max(0, 1 - dy * dy)) - 30;
      pl.x = U.clamp(pl.x, 640 - half + box.w / 2, 640 + half - box.w / 2);
    } else if (f.place === 'rug') {
      pl.y = U.clamp(pl.y, IG.FLOOR_TOP + box.h / 2, Math.min(IG.FLOOR_BOTTOM, IG.limitY || 9999) - box.h / 2 - 10);
      pl.x = U.clamp(pl.x, IG.floorLeft(pl.y) + box.w / 2 + 10, IG.floorRight(pl.y) - box.w / 2 - 10);
    } else {
      pl.y = U.clamp(pl.y, IG.FLOOR_TOP + 6, Math.min(IG.FLOOR_BOTTOM, IG.limitY || 9999));
      pl.x = U.clamp(pl.x, IG.floorLeft(pl.y) + box.w / 2 + 6, IG.floorRight(pl.y) - box.w / 2 - 6);
      // doorway stays clear
      var d = IG.DOOR;
      if (pl.y > d.y - 20 && pl.x + box.w / 2 > d.x && pl.x - box.w / 2 < d.x + d.w) {
        if (pl.y > d.y + 40) pl.x = pl.x < 640 ? d.x - box.w / 2 - 4 : d.x + d.w + box.w / 2 + 4;
        else pl.y = d.y - 20;
        pl.x = U.clamp(pl.x, IG.floorLeft(pl.y) + box.w / 2 + 6, IG.floorRight(pl.y) - box.w / 2 - 6);
      }
    }
    return pl;
  };
  IG.owner = function () { return AB.game.visiting || AB.game.profile; };
  IG.drawItem = function (ctx, pl, t) {
    var f = AB.furniture[pl.item]; if (!f) return;
    ctx.save(); ctx.translate(pl.x, pl.y);
    if (pl.flip && f.flip !== false) ctx.scale(-1, 1);
    try { f.draw(ctx, { t: t, flip: !!pl.flip, rot: pl.rot || 0 }); } catch (e) { /* ignore */ }
    ctx.restore();
  };

  var react = {}; // transient reactions by uid (never saved)
  function tapItem(pl) {
    var f = AB.furniture[pl.item]; if (!f) return;
    var W = AB.world, p = W.player, cat = f.cat;
    react[pl.uid] = W.t;
    if (cat === 'seat' || cat === 'bed') {
      p.x = pl.x + (cat === 'bed' ? 0 : 0); p.y = pl.y + 4; p.pose = cat === 'bed' ? 'sleep' : 'sit'; p.poseUntil = W.t + (cat === 'bed' ? 5 : 6); p.dir = pl.flip ? -1 : 1;
      AB.audio.sfx('soft'); if (cat === 'bed') W.burst(pl.x, pl.y - 90, 'note', 0);
    } else if (pl.item === 'piano' || pl.item === 'drum') { AB.audio.sfx(pl.item === 'drum' ? 'jump' : 'bell'); W.burst(pl.x, pl.y - f.h, 'note', 4); }
    else if (cat === 'toy') { AB.audio.sfx('pop'); W.burst(pl.x, pl.y - f.h * 0.7, 'heart', 4); }
    else if (cat === 'light') { AB.audio.sfx('ding'); W.burst(pl.x, pl.y - f.h, 'sparkle', 6); }
    else if (cat === 'pet') {
      if (W.pet) { var mood = pl.item === 'pet_bowl' ? 'eat' : pl.item === 'pet_bed' ? 'sleep' : 'play'; W.pet.x = pl.x; W.pet.y = pl.y + 8; W.petMood(mood, mood === 'sleep' ? 8 : 3); AB.audio.sfx('chirp'); }
      else { AB.audio.sfx('soft'); W.burst(pl.x, pl.y - 40, 'sparkle', 4); }
    } else { AB.audio.sfx('sparkle'); W.burst(pl.x, pl.y - Math.max(30, f.h * 0.6), 'sparkle', 5); }
  }

  var scene = {
    id: 'igloo', name: 'My Igloo', music: 'igloo', ambient: 'indoor', outdoor: false, petsAllowed: true,
    map: null,
    depth: [470, 0.86, 880, 1.06],
    paint: function (ctx) {
      var o = IG.owner(), ig = o.igloo, RS = AB.roomStyles;
      ctx.fillStyle = '#20305a'; ctx.fillRect(0, 0, AB.W, AB.H);
      // wall
      ctx.save(); ctx.beginPath(); IG.domePath(ctx); ctx.clip();
      try { (RS.wall[ig.wall] || RS.wall.ice).paint(ctx, IG.WALL); } catch (e) { ctx.fillStyle = '#dce9fb'; ctx.fillRect(0, 0, AB.W, 470); }
      ctx.restore();
      // floor
      ctx.save(); ctx.beginPath(); IG.floorPath(ctx); ctx.clip();
      try { (RS.floor[ig.floor] || RS.floor.snow).paint(ctx, IG.FLOOR); } catch (e) { ctx.fillStyle = '#eef3fd'; ctx.fillRect(0, 470, AB.W, 430); }
      ctx.restore();
      ctx.beginPath(); IG.domePath(ctx); A.fs(ctx, null, 4);
      A.line(ctx, [120, 470, 1160, 470], 4);
      // side shading where the dome meets the floor
      var g = ctx.createLinearGradient(0, 0, 200, 0); g.addColorStop(0, 'rgba(20,30,70,0.35)'); g.addColorStop(1, 'rgba(20,30,70,0)');
      ctx.fillStyle = g; ctx.beginPath(); IG.floorPath(ctx); ctx.fill();
      var g2 = ctx.createLinearGradient(1280, 0, 1080, 0); g2.addColorStop(0, 'rgba(20,30,70,0.35)'); g2.addColorStop(1, 'rgba(20,30,70,0)');
      ctx.fillStyle = g2; ctx.beginPath(); IG.floorPath(ctx); ctx.fill();
      // door tunnel at the bottom
      ctx.beginPath(); ctx.moveTo(548, 900); ctx.lineTo(548, 832); ctx.ellipse(640, 832, 92, 62, 0, Math.PI, Math.PI * 2); ctx.lineTo(732, 900); ctx.closePath();
      A.fs(ctx, '#eef4ff', 4);
      ctx.beginPath(); ctx.moveTo(568, 900); ctx.lineTo(568, 842); ctx.ellipse(640, 842, 72, 48, 0, Math.PI, Math.PI * 2); ctx.lineTo(712, 900); ctx.closePath();
      var dg = ctx.createLinearGradient(0, 790, 0, 900); dg.addColorStop(0, '#2b3f78'); dg.addColorStop(1, '#4b6bb0');
      A.fs(ctx, dg, 3);
      for (var i = 0; i < 6; i++) A.circle(ctx, 590 + i * 20, 820 + (i % 2) * 18, 2, 'rgba(255,255,255,0.8)', 0);
    },
    animate: function (ctx, t) {
      var o = IG.owner(), ig = o.igloo, RS = AB.roomStyles;
      IG.WINDOWS.forEach(function (w) { try { (RS.window[ig.window] || RS.window.round).draw(ctx, w[0], w[1], t); } catch (e) { /* ignore */ } });
      // rugs then wall items (both flat, under characters)
      ig.placed.forEach(function (pl) { var f = AB.furniture[pl.item]; if (f && f.place === 'rug') IG.drawItem(ctx, pl, t); });
      ig.placed.forEach(function (pl) { var f = AB.furniture[pl.item]; if (f && f.place === 'wall') IG.drawItem(ctx, pl, t); });
    },
    walk: [[150, 500], [1130, 500], [1232, 870], [740, 870], [740, 900], [540, 900], [540, 870], [48, 870]],
    blocks: [],
    spawns: { 'default': [640, 730], iglooLane: [640, 730], map: [640, 730] },
    hotspots: [],
    props: [],
    prepare: function () {
      AB.world.invalidate('igloo');
      scene.name = AB.game.visiting ? AB.game.visiting.name + '\'s Igloo' : 'My Igloo';
      scene.rebuild();
      scene.hotspots = [{ id: 'exit', hit: [560, 800, 160, 100], at: [640, 868], icon: 'door', badge: [640, 812],
        action: function () { AB.audio.sfx('door'); var wasVisit = !!AB.game.visiting; if (wasVisit) AB.visitEnd(); AB.go('iglooLane', 'igloo'); } }];
    },
    /** Rebuild y-sorted furniture props and walk blocks from the owner's saved layout. */
    rebuild: function () {
      var o = IG.owner(), props = [], blocks = [];
      o.igloo.placed.forEach(function (pl) {
        var f = AB.furniture[pl.item]; if (!f || f.place !== 'floor') return;
        props.push({
          x: pl.x, y: pl.y, pl: pl,
          get hit() { return [pl.x - f.w / 2 - 8, pl.y - f.h - 8, f.w + 16, f.h + 16]; },
          get at() { var ax = pl.x + (pl.x < 640 ? f.w / 2 + 40 : -f.w / 2 - 40); return [ax, pl.y + 14]; },
          draw: function (ctx, t) {
            this.y = pl.y;
            var r = react[pl.uid], bounce = r != null ? Math.max(0, 0.4 - (t - r)) : 0;
            if (bounce) { ctx.save(); ctx.translate(pl.x, pl.y); ctx.scale(1 + bounce * 0.15, 1 - bounce * 0.15); ctx.translate(-pl.x, -pl.y); }
            IG.drawItem(ctx, pl, t);
            if (bounce) ctx.restore();
          },
          tap: function () { tapItem(pl); }
        });
        if (f.w >= 50 && f.cat !== 'pet') blocks.push({ e: [pl.x, pl.y - 8, f.w * 0.4, 14] });
      });
      // when visiting, the sibling's pet relaxes at home too
      if (AB.game.visiting && AB.pets) {
        var vp = null, ov = AB.game.visiting;
        ov.pets.forEach(function (p) { if (p.id === ov.activePet) vp = p; });
        if (vp) {
          var bed = ov.igloo.placed.filter(function (pl) { return pl.item === 'pet_bed'; })[0];
          var px = bed ? bed.x : 300, py = bed ? bed.y + 4 : 720, loveUntil = 0;
          props.push({ x: px, y: py, hit: [px - 45, py - 70, 90, 80], at: [px + 70, py + 10],
            draw: function (ctx, t) { AB.pets.draw(ctx, px, py, vp, { t: t, mood: t < loveUntil ? 'love' : (bed ? 'sleep' : 'idle'), scale: 1 }); if (bed && t >= loveUntil) AB.pets.bubble(ctx, px + 16, py - 50, 'zzz', t); },
            tap: function () { loveUntil = AB.world.t + 2.5; AB.audio.sfx('purr'); } });
        }
      }
      scene.props = props; scene.blocks = blocks;
    }
  };
  AB.registerScene(scene);
})();
