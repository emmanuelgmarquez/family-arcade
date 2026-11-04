'use strict';
// Level assembler: acts are built from a library of hand-designed segments,
// themed per world. Add a world by registering a theme and listing segments.
(function (G) {
  const SEG = {};
  G.SEGMENTS = SEG;

  // ---------- helpers ----------
  function ctxFor(b, cfg, R) {
    const c = {
      b, cfg, R,
      maybe: (p) => R() < p,
      pick: (arr) => arr[Math.floor(R() * arr.length)],
      enemy(x, props = {}) { b.on(c.pick(cfg.enemies), x, Object.assign({ range: 90 }, props)); },
      flyer(x, y) { b.obj('buzzwing', x, y, { range: 60 + R() * 40, ph: R() * 6 }); },
      deco(x, opts) { b.deco(c.pick(cfg.decos), x, opts); },
      decos(x0, len, n, opts) { for (let i = 0; i < n; i++) c.deco(x0 + ((i + 0.5) * len) / n + (R() - 0.5) * 30, opts); },
      medal(x, y) { if (c.medalHere) { b.obj('medal', x, y); c.medalHere = false; return true; } return false; },
      waterfall(x, y) {
        if (cfg.theme === 'meadow') b.waterfall(x, y, 26, 700);
        else if (cfg.theme === 'frost') b.deco('iceFall', x + 13, { y: y + 96, sink: 0 });
      },
    };
    return c;
  }

  // ---------- segments ----------
  SEG.runway = (c) => {
    const { b, R } = c, x = b.gx, len = 420 + Math.floor(R() * 260);
    b.flat(len);
    b.ringsGround(x + 60, 6 + Math.floor(R() * 4), 24, 30);
    if (c.maybe(0.6)) c.enemy(x + len * 0.65);
    if (c.maybe(0.3)) b.on('monitor', x + len * 0.35, { kind: c.pick(['ring', 'ring', 'shield']) });
    c.decos(x, len, 3);
  };
  SEG.hills = (c) => {
    const { b, R } = c, x = b.gx;
    const amp = 28 + R() * 20;
    b.wave(680, amp, 2).flat(80);
    b.ringsGround(x + 30, 14, 44, 32);
    c.enemy(x + 330);
    if (c.maybe(0.5)) c.flyer(x + 520, b.gy - 110);
    c.decos(x, 760, 4);
  };
  SEG.downhill = (c) => {
    const { b } = c, x = b.gx;
    const dy = b.gy < 1250 ? 130 : -130;
    b.slope(420, dy).flat(120);
    b.ringsGround(x + 40, 9, 44, 28);
    if (dy > 0) b.on('boost', b.gx - 60, { dir: 1 });
    c.decos(x, 540, 3);
  };
  SEG.loop = (c, R0) => {
    const { b } = c, x = b.gx;
    const R = R0 || 112;
    const down = b.gy < 1250;
    if (down) b.slope(320, 90);
    b.flat(60);
    b.on('boost', b.gx - 30, { dir: 1 });
    b.loop(R);
    const L = b.loops[b.loops.length - 1];
    for (let i = 0; i < 12; i++) { const a = Math.PI / 2 - (i / 12) * Math.PI * 2 + 0.3; b.obj('ring', L.cx + Math.cos(a) * (R - 26), L.cy + Math.sin(a) * (R - 26)); }
    b.flat(120);
    if (down) b.slope(320, -90);
    c.decos(x, 200, 2);
    c.decos(b.gx - 200, 200, 1);
  };
  SEG.bigloop = (c) => SEG.loop(c, 150);
  SEG.pit = (c) => {
    const { b, R } = c;
    b.flat(160);
    const x = b.gx, gy = b.gy, w = 260 + Math.floor(R() * 60);
    b.gap(w, 0);
    b.rescue(x, x + w, gy);
    b.platform(x + w * 0.22, gy - 32, 72);
    b.obj('platform', x + w * 0.68, gy - 24, { w: 64, dx: 30, period: 200 });
    b.ringArc(x + 20, gy - 60, 7, w - 40, 50);
    if (c.maybe(0.6)) c.flyer(x + w * 0.5, gy - 130);
    c.waterfall(x + w * 0.45, gy + 30);
    b.flat(200);
    c.decos(b.gx - 200, 200, 1);
  };
  SEG.upper = (c) => {
    const { b, R } = c, x = b.gx, gy = b.gy;
    const len = 1100;
    // lower path first
    b.flat(len);
    b.on('spring', x + 110, { dir: 'up' });
    c.enemy(x + 420); c.enemy(x + 820);
    b.on('spikes', x + 620, { n: 2 });
    b.ringsGround(x + 200, 6, 30, 30);
    c.decos(x + 200, 800, 3);
    // one-way upper track
    const ty = gy - 185;
    const s = b.track(x + 20, ty, (t) => t.flat(320).hill(240, 30).flat(360).slope(160, 40), { thick: 34, oneWay: true });
    b.ringsGround(x + 80, 18, 40, 28, ty - 80);
    if (c.maybe(0.6)) c.flyer(x + 600, ty - 90);
    b.obj('monitor', x + 360, ty, { kind: c.pick(['ring', 'shield', 'shoes', 'life']) });
    if (!c.medal(s.x - 60, s.y - 70)) b.rings(s.x - 100, s.y - 40, 3, 24);
  };
  SEG.halfpipe = (c) => {
    const { b } = c, x = b.gx;
    b.slope(220, 110).flat(80).slope(220, -110).flat(140);
    b.ringsGround(x + 20, 16, 30, 26);
    c.enemy(x + 260, { range: 50 });
    c.decos(x + 520, 140, 1);
  };
  SEG.ramp = (c) => {
    const { b } = c;
    b.flat(220);
    b.on('boost', b.gx - 60, { dir: 1 });
    b.ramp(140, 36);
    const rx = b.gx, ry = b.gy;
    b.gap(300, 30);
    b.rescue(rx, rx + 300, ry + 30);
    b.platform(rx + 100, ry + 70, 96);
    b.ringArc(rx + 10, ry - 30, 9, 290, 70);
    c.waterfall(rx + 40, ry + 110);
    b.flat(300);
    c.decos(b.gx - 300, 300, 2);
  };
  SEG.cave = (c) => {
    const { b } = c;
    b.flat(200);
    b.on('spring', b.gx - 190, { dir: 'up' });
    b.rings(b.gx - 110, b.gy - 16, 4, 22);
    const cX = b.gx, cY = b.gy;
    b.up(124).flat(760);
    b.holePoly([cX - 8, cY - 84, cX + 540, cY - 84, cX + 540, cY - 160, cX + 610, cY - 160, cX + 610, cY, cX - 8, cY]);
    b.obj('breakwall', cX + 22, cY, { h: 84 });
    b.rings(cX + 80, cY - 22, 8, 24);
    b.rings(cX + 92, cY - 52, 7, 24);
    if (!c.medal(cX + 330, cY - 40)) b.rings(cX + 300, cY - 40, 3, 24);
    b.obj('monitor', cX + 450, cY, { kind: c.pick(['shoes', 'inv', 'life']) });
    b.obj('spring', cX + 575, cY, { dir: 'up', color: 'r' });
    if (c.cfg.theme === 'caverns') { b.deco('crystal', cX + 200, { y: cY }); b.deco('crystalPink', cX + 380, { y: cY }); }
    b.ringsGround(cX + 40, 10, 40, 28, cY - 220);
    b.obj(c.pick(c.cfg.enemies), cX + 300, cY - 124, { range: 120 });
    c.decos(cX + 40, 700, 3, { below: cY - 220 });
    b.slope(300, 124);
  };
  SEG.swingpit = (c) => {
    const { b } = c;
    b.flat(220);
    const p2 = b.gx, gy = b.gy;
    b.gap(540, 0);
    b.rescue(p2, p2 + 540, gy);
    b.obj('platform', p2 + 120, gy - 200, { w: 64, mode: 'swing', dx: 150, amp: 0.7, period: 240 });
    b.platform(p2 + 270, gy - 40, 76);
    b.obj('spikeball', p2 + 308, gy - 120, { r: 54, spd: 0.03 });
    b.obj('platform', p2 + 450, gy - 24, { w: 96, mode: 'fall' });
    b.rings(p2 + 414, gy - 60, 4, 24);
    c.waterfall(p2 + 250, gy + 20);
    b.flat(260);
    c.decos(b.gx - 260, 260, 1);
  };
  SEG.tower = (c) => {
    const { b } = c;
    b.flat(520);
    const tX = b.gx - 380, gy = b.gy;
    b.on('spring', tX, { dir: 'up', color: 'r' });
    b.deco('bush', tX, { front: true, sink: 2 });
    b.platform(tX - 90, gy - 420, 180);
    if (!c.medal(tX + 40, gy - 460)) b.rings(tX + 20, gy - 450, 3, 22);
    b.rings(tX - 60, gy - 440, 4, 22);
    b.obj('monitor', tX - 50, gy - 420, { kind: c.pick(['inv', 'life', 'shoes']) });
    c.enemy(b.gx - 120);
    c.decos(tX + 80, 200, 2);
  };
  SEG.stairs = (c) => {
    const { b } = c, x = b.gx;
    for (let i = 0; i < 3; i++) { b.flat(60); b.up(40); b.flat(110); b.ringsGround(b.gx - 90, 3, 24, 30); }
    c.enemy(x + 360, { range: 40 });
    b.flat(100).slope(360, 120).flat(80);
    c.decos(b.gx - 300, 300, 2);
  };
  SEG.spikes = (c) => {
    const { b } = c, x = b.gx;
    b.flat(620);
    b.on('spikes', x + 170, { n: 2 });
    b.on('spikes', x + 390, { n: 2 });
    b.ringArc(x + 130, b.gy - 50, 5, 80, 40);
    b.ringArc(x + 350, b.gy - 50, 5, 80, 40);
    b.on('spring', x + 560, { dir: 'upright' });
    c.decos(x, 620, 2);
  };
  SEG.enemyfield = (c) => {
    const { b } = c, x = b.gx;
    b.flat(640);
    c.enemy(x + 180); c.enemy(x + 380); c.enemy(x + 560);
    b.on('monitor', x + 60, { kind: c.pick(['shield', 'inv', 'ring']) });
    c.flyer(x + 450, b.gy - 100);
    b.ringsGround(x + 100, 10, 50, 30);
    c.decos(x, 640, 3);
  };
  // ----- world specials -----
  SEG.minecart = (c) => {
    const { b } = c, x = b.gx;
    b.flat(1500);
    b.obj('minecart', x + 80, b.gy, { spd: 7 });
    b.rings(x + 300, b.gy - 60, 12, 40);
    b.rings(x + 820, b.gy - 100, 8, 40);
    b.obj('buzzwing', x + 700, b.gy - 90, { range: 40 });
    b.up(56).flat(300);
    b.deco('lantern', x + 200); b.deco('lantern', x + 600); b.deco('lantern', x + 1000);
    c.decos(b.gx - 260, 260, 2);
  };
  SEG.speedway = (c) => {
    const { b } = c, x = b.gx;
    const down = b.gy < 1150;
    b.flat(160);
    b.on('boost', b.gx - 60, { dir: 1 });
    if (down) b.slope(600, 160); else b.flat(600);
    b.ringsGround(x + 200, 12, 48, 26);
    b.flat(60);
    b.on('boost', b.gx - 30, { dir: 1 });
    b.loop(150);
    const L = b.loops[b.loops.length - 1];
    for (let i = 0; i < 14; i++) { const a = Math.PI / 2 - (i / 14) * Math.PI * 2 + 0.3; b.obj('ring', L.cx + Math.cos(a) * 122, L.cy + Math.sin(a) * 122); }
    b.flat(100);
    b.on('boost', b.gx - 40, { dir: 1 });
    b.flat(300);
    if (down) b.slope(500, -160);
    c.decos(x, 700, 4);
  };
  SEG.icicles = (c) => {
    const { b } = c, x = b.gx, gy = b.gy;
    b.flat(760);
    b.block(x + 80, gy - 160, 600, 44);
    for (let i = 0; i < 5; i++) b.obj('icicle', x + 140 + i * 110, gy - 116);
    b.ringsGround(x + 120, 14, 40, 26);
    c.decos(x + 700, 60, 1);
  };
  SEG.icefield = (c) => {
    const { b } = c, x = b.gx;
    b.flat(80).slope(300, 60).flat(500).slope(300, -60).flat(80);
    // slippery ice sheet over the low section
    b.obj('icesheet', x + 380 + 250, b.groundY(x + 500), { w: 500 });
    b.ringsGround(x + 100, 16, 50, 28);
    c.enemy(x + 600);
    c.decos(x, 1260, 3);
  };
  SEG.conveyors = (c) => {
    const { b } = c;
    b.flat(160);
    const x = b.gx, gy = b.gy;
    b.gap(620, 0);
    b.rescue(x, x + 620, gy);
    b.obj('conveyor', x + 150, gy - 10, { w: 200, spd: -1.5 });
    b.obj('conveyor', x + 440, gy - 30, { w: 200, spd: 2 });
    b.rings(x + 80, gy - 50, 6, 26);
    b.rings(x + 370, gy - 70, 6, 26);
    b.flat(220);
    b.deco('warning', b.gx - 180);
  };
  SEG.lasers = (c) => {
    const { b } = c, x = b.gx;
    b.flat(820);
    for (let i = 0; i < 3; i++) b.on('laser', x + 180 + i * 220, { len: 150, period: 160, ph: i * 50 });
    b.ringsGround(x + 100, 16, 40, 28);
    b.deco('warning', x + 60);
    c.enemy(x + 720);
  };

  // ---------- ice sheet object (registered here: depends on terrain) ----------
  class IceSheet extends G.Obj {
    constructor(s, d) {
      super(s, d);
      this.w = d.w; this.h = 6;
      this.seg = G.makeSeg(d.x - d.w / 2, d.y - 1, d.x + d.w / 2, d.y - 1, { ice: true, ref: this });
    }
    segments() { return [this.seg]; }
    render(ctx, cx, cy) {
      const x = Math.round(this.x - this.w / 2 - cx), y = Math.round(this.y - cy - 2);
      ctx.fillStyle = '#9ae0ff'; ctx.fillRect(x, y, this.w, 5);
      ctx.fillStyle = '#e8fbff'; ctx.fillRect(x, y, this.w, 1);
      ctx.fillStyle = '#ffffff';
      for (let i = 8; i < this.w; i += 37) ctx.fillRect(x + i, y + 2, 6, 1);
    }
  }
  G.Objects.register('icesheet', IceSheet);

  // ---------- assembler ----------
  const WORLD_CFG = {
    meadow: { enemies: ['beetbot', 'prickler', 'beetbot', 'snapper'], decos: ['palm', 'sunflower', 'flowers', 'bush', 'palm'] },
    caverns: { enemies: ['prickler', 'snapper', 'beetbot'], decos: ['crystal', 'crystalPink', 'mushroom', 'crystal', 'lantern'] },
    sunset: { enemies: ['beetbot', 'snapper', 'prickler'], decos: ['cactus', 'palm', 'cactus', 'signArrow', 'rockArch'] },
    frost: { enemies: ['prickler', 'beetbot', 'snapper'], decos: ['pine', 'pine', 'snowman', 'pine'] },
    fortress: { enemies: ['beetbot', 'prickler', 'snapper', 'snapper'], decos: ['pipe', 'gearDeco', 'warning', 'pipe'] },
  };

  function assemble(def) {
    const cfg = Object.assign({ theme: def.theme }, WORLD_CFG[def.theme]);
    const b = new G.LevelBuilder({ id: def.id, theme: def.theme, name: def.name, act: def.act, music: def.music, bottom: 2400, camTop: 0, bgY: 1000 });
    const R = G.rng(def.seed);
    const c = ctxFor(b, cfg, R);
    b.block(-200, 0, 200, 2400);
    b.ground(0, 1000).flat(640);
    b.deco(cfg.decos[0], 60); b.deco('sign', 250); b.deco(cfg.decos[1], 400);
    b.ringsGround(300, 5, 22, 30);
    def.segs.forEach((name, i) => {
      c.medalHere = def.medals.includes(i);
      if (i > 0 && i % 4 === 0) { b.flat(140); b.on('checkpoint', b.gx - 70); }
      SEG[name](c);
      if (c.medalHere) {
        // segment had no medal spot: tuck one above a spring
        const x = b.gx;
        b.flat(240);
        b.on('spring', x + 120, { dir: 'up' });
        b.obj('medal', x + 120, b.gy - 200);
        c.medalHere = false;
      }
    });
    b.flat(300);
    b.ringsGround(b.gx - 260, 6, 30, 30);
    const goalX = b.gx + 160;
    b.flat(600);
    b.on('goal', goalX);
    c.decos(goalX - 120, 400, 3);
    const endX = b.gx;
    b.endGround();
    b.block(endX, 0, 200, 2400);
    let maxY = 0;
    for (const s of b.surfaces) for (let i = 1; i < s.length; i += 2) if (s[i] < 2300) maxY = Math.max(maxY, s[i]);
    return b.build({ start: { x: 120, y: 975 }, camLeft: 0, camRight: endX, camBottom: maxY + 220 });
  }
  G.assembleLevel = assemble;

  // ---------- level list ----------
  const ACTS = [
    { id: 'w1a2', theme: 'meadow', name: 'EMERALD MEADOW', act: 2, music: 'meadow', seed: 12, medals: [1, 4, 9],
      segs: ['hills', 'upper', 'pit', 'loop', 'cave', 'halfpipe', 'enemyfield', 'swingpit', 'downhill', 'tower', 'ramp', 'hills', 'bigloop', 'spikes'] },
    { id: 'w2a1', theme: 'caverns', name: 'CRYSTAL CAVERNS', act: 1, music: 'caverns', seed: 21, medals: [3, 5, 8],
      segs: ['runway', 'minecart', 'pit', 'cave', 'hills', 'upper', 'swingpit', 'enemyfield', 'tower', 'downhill', 'loop', 'stairs'] },
    { id: 'w2a2', theme: 'caverns', name: 'CRYSTAL CAVERNS', act: 2, music: 'caverns', seed: 22, medals: [1, 4, 6],
      segs: ['hills', 'cave', 'minecart', 'spikes', 'upper', 'pit', 'tower', 'halfpipe', 'swingpit', 'loop', 'enemyfield', 'ramp'] },
    { id: 'w3a1', theme: 'sunset', name: 'SUNSET SPEEDWAY', act: 1, music: 'sunset', seed: 31, medals: [2, 6, 9],
      segs: ['downhill', 'speedway', 'upper', 'ramp', 'loop', 'hills', 'tower', 'pit', 'speedway', 'cave', 'halfpipe', 'enemyfield'] },
    { id: 'w3a2', theme: 'sunset', name: 'SUNSET SPEEDWAY', act: 2, music: 'sunset', seed: 32, medals: [1, 5, 8],
      segs: ['speedway', 'upper', 'swingpit', 'bigloop', 'ramp', 'tower', 'hills', 'speedway', 'cave', 'stairs', 'loop', 'downhill'] },
    { id: 'w4a1', theme: 'frost', name: 'FROSTFALL PEAKS', act: 1, music: 'frost', seed: 41, medals: [3, 5, 7],
      segs: ['runway', 'icicles', 'icefield', 'upper', 'pit', 'cave', 'hills', 'tower', 'icicles', 'loop', 'swingpit', 'enemyfield'] },
    { id: 'w4a2', theme: 'frost', name: 'FROSTFALL PEAKS', act: 2, music: 'frost', seed: 42, medals: [2, 4, 7],
      segs: ['hills', 'icefield', 'cave', 'icicles', 'upper', 'halfpipe', 'swingpit', 'tower', 'icefield', 'loop', 'pit', 'icicles'] },
    { id: 'w5a1', theme: 'fortress', name: 'MECHANICAL FORTRESS', act: 1, music: 'fortress', seed: 51, medals: [3, 5, 7],
      segs: ['runway', 'conveyors', 'lasers', 'upper', 'pit', 'cave', 'enemyfield', 'tower', 'lasers', 'loop', 'swingpit', 'spikes'] },
    { id: 'w5a2', theme: 'fortress', name: 'MECHANICAL FORTRESS', act: 2, music: 'fortress', seed: 52, medals: [2, 4, 7],
      segs: ['lasers', 'conveyors', 'upper', 'stairs', 'tower', 'swingpit', 'lasers', 'cave', 'conveyors', 'loop', 'enemyfield', 'spikes'] },
  ];
  for (const a of ACTS) G.LEVELS[a.id] = () => assemble(a);

  const BOSSES = [
    { id: 'w1b', theme: 'meadow', name: 'EMERALD MEADOW', boss: 'charger', decoType: 'palm' },
    { id: 'w2b', theme: 'caverns', name: 'CRYSTAL CAVERNS', boss: 'driller', decoType: 'crystal' },
    { id: 'w3b', theme: 'sunset', name: 'SUNSET SPEEDWAY', boss: 'bomber', decoType: 'cactus' },
    { id: 'w4b', theme: 'frost', name: 'FROSTFALL PEAKS', boss: 'froster', decoType: 'pine' },
    { id: 'w5b', theme: 'fortress', name: 'MECHANICAL FORTRESS', boss: 'final', decoType: 'pipe', subtitle: 'FINAL SHOWDOWN' },
  ];
  for (const B of BOSSES) {
    G.LEVELS[B.id] = () => G.buildBossLevel({ id: B.id, theme: B.theme, name: B.name, subtitle: B.subtitle || 'BOSS BATTLE', boss: B.boss, decoType: B.decoType, music: G.Themes[B.theme].music });
  }
})(window.G);
