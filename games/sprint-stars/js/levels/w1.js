'use strict';
// World 1 — Emerald Meadow
(function (G) {
  G.LEVELS.w1a1 = function () {
    const b = new G.LevelBuilder({
      id: 'w1a1', theme: 'meadow', name: 'EMERALD MEADOW', act: 1, music: 'meadow',
      bottom: 1500, camBottom: 1240, camTop: 200, bgY: 1000,
    });
    const deco = (t, x, o) => b.deco(t, x, o);
    b.block(-200, 300, 200, 1200); // left boundary cliff

    // ---------------- start meadow ----------------
    b.ground(0, 1000).flat(700);
    deco('palm', 60); deco('flowers', 170); deco('sign', 250); deco('sunflower', 330); deco('palm', 470);
    deco('bush', 560); deco('flowers', 620, { hue: 1 }); deco('sunflower', 690);
    b.ringsGround(300, 5, 22, 30);
    b.on('monitor', 620, { kind: 'ring' });

    // ---------------- rolling hills ----------------
    let x = b.gx;
    b.hill(320, 48).slope(240, 40).hill(320, -50).slope(260, -40).flat(200);
    b.ringsGround(x + 30, 13, 22, 34);
    b.on('beetbot', x + 420);
    b.on('beetbot', x + 760);
    b.obj('buzzwing', x + 1000, 905, { range: 70 });
    deco('sunflower', x + 160); deco('palm', x + 560); deco('flowers', x + 700); deco('bush', x + 1250); deco('palm', x + 1300); deco('flowers', x + 980, { hue: 2 });
    b.on('monitor', x + 1180, { kind: 'shield' });

    // ---------------- big downhill + first loop ----------------
    x = b.gx;
    b.slope(420, 140).flat(60);
    b.ringsGround(x + 40, 9, 40, 28);
    deco('palm', x + 120); deco('sunflower', x + 300);
    const lx = b.gx;
    b.on('boost', lx - 26, { dir: 1 });
    b.loop(112);
    {
      const L = b.loops[b.loops.length - 1];
      for (let i = 0; i < 14; i++) {
        const a = Math.PI / 2 - (i / 14) * Math.PI * 2 + 0.25;
        b.obj('ring', L.cx + Math.cos(a) * 86, L.cy + Math.sin(a) * 86);
      }
    }
    b.flat(120).slope(360, -140);
    b.ringsGround(b.gx - 300, 6, 40, 28);
    deco('bush', b.gx - 160);

    // ---------------- pit with platforms ----------------
    b.flat(220);
    deco('palm', b.gx - 120);
    const pit = b.gx;
    let gy = b.gy;
    b.gap(310, 0);
    b.rescue(pit, pit + 310, gy);
    b.platform(pit + 50, gy - 30, 80);
    b.obj('platform', pit + 210, gy - 24, { w: 64, dx: 36, period: 220 });
    b.obj('buzzwing', pit + 160, gy - 120, { range: 50 });
    b.ringArc(pit + 30, gy - 60, 8, 250, 50);
    b.waterfall(pit + 150, gy + 40, 26, 600);

    // ---------------- spring to the upper route ----------------
    b.flat(260);
    const spX = b.gx - 150;
    b.on('spring', spX, { dir: 'up' });
    deco('flowers', spX - 60); deco('sunflower', spX + 60);
    b.flat(160);
    b.on('checkpoint', b.gx - 70);

    // ---------------- half-pipe valley + launch ramp ----------------
    x = b.gx;
    b.slope(220, 110).flat(80).slope(220, -110).flat(140);
    b.on('beetbot', x + 260, { range: 60 });
    b.ringsGround(x + 20, 16, 30, 26);
    b.on('boost', b.gx - 60, { dir: 1 });
    b.ramp(140, 36);
    const rx = b.gx, ry = b.gy;
    b.gap(300, 30);
    b.rescue(rx, rx + 300, ry + 30);
    b.platform(rx + 100, ry + 70, 96);
    b.ringArc(rx + 10, ry - 30, 9, 290, 70);
    b.waterfall(rx + 40, ry + 110, 30, 600);
    b.flat(300);
    deco('palm', b.gx - 260); deco('bush', b.gx - 120);
    b.on('prickler', b.gx - 262, { range: 30 });

    // upper route (one-way track above the lower path)
    const upY = gy - 185;
    const up = b.track(spX - 90, upY, (s) => s.flat(320).hill(260, 34).flat(220).slope(240, -50).flat(260), { thick: 34, oneWay: true });
    b.ringsGround(spX - 40, 14, 24, 28, upY - 80);
    b.obj('buzzwing', spX + 520, upY - 80, { range: 80 });
    b.obj('monitor', spX + 240, upY, { kind: 'life' });
    b.obj('medal', up.x - 40, up.y - 70);
    b.rings(up.x - 120, up.y - 40, 3, 24);

    // ---------------- cliff with a secret cave ----------------
    b.on('spring', b.gx - 190, { dir: 'up' });
    b.rings(b.gx - 110, b.gy - 16, 4, 22);
    const cX = b.gx, cY = b.gy;
    b.up(124).flat(760);
    // cave carved into the cliff, with a shaft opening onto the top path
    b.holePoly([cX - 8, cY - 84, cX + 540, cY - 84, cX + 540, cY - 160, cX + 610, cY - 160, cX + 610, cY, cX - 8, cY]);
    b.obj('breakwall', cX + 22, cY, { h: 84 });
    b.rings(cX + 80, cY - 22, 8, 24);
    b.rings(cX + 92, cY - 52, 7, 24);
    b.obj('medal', cX + 330, cY - 40);
    b.obj('monitor', cX + 450, cY, { kind: 'shoes' });
    b.obj('spring', cX + 575, cY, { dir: 'up', color: 'r' });
    // top path
    b.ringsGround(cX + 40, 10, 40, 28, cY - 220);
    b.obj('beetbot', cX + 300, cY - 124, { range: 120 });
    deco('sunflower', cX + 100, { below: cY - 220 }); deco('palm', cX + 420, { below: cY - 220 }); deco('flowers', cX + 700, { below: cY - 220 });
    b.slope(300, 124);

    // ---------------- second pit: swing, spike ball, collapsing ledge ----------------
    b.flat(220);
    deco('bush', b.gx - 100);
    const p2 = b.gx;
    gy = b.gy;
    b.gap(540, 0);
    b.rescue(p2, p2 + 540, gy);
    b.obj('platform', p2 + 120, gy - 200, { w: 64, mode: 'swing', dx: 150, amp: 0.7, period: 240 });
    b.platform(p2 + 270, gy - 40, 76);
    b.obj('spikeball', p2 + 308, gy - 120, { r: 54, spd: 0.03 });
    b.obj('platform', p2 + 450, gy - 24, { w: 96, mode: 'fall' });
    b.rings(p2 + 414, gy - 60, 4, 24);
    b.ringArc(p2 + 30, gy - 70, 4, 60, 20);
    b.waterfall(p2 + 250, gy + 20, 30, 600);
    b.flat(260);
    b.on('checkpoint', b.gx - 120);
    deco('palm', b.gx - 40);

    // ---------------- double loop ----------------
    b.flat(140);
    x = b.gx;
    b.slope(380, 120).flat(40);
    b.ringsGround(x + 40, 8, 40, 28);
    b.on('boost', b.gx - 26, { dir: 1 });
    b.loop(112);
    b.flat(40);
    b.on('boost', b.gx - 30, { dir: 1 });
    b.loop(112);
    for (const L of b.loops.slice(-2)) for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 - (i / 10) * Math.PI * 2 + 0.3;
      b.obj('ring', L.cx + Math.cos(a) * 86, L.cy + Math.sin(a) * 86);
    }
    b.flat(120).slope(380, -120);
    deco('sunflower', b.gx - 330);

    // ---------------- hidden spring tower to medal 3 ----------------
    b.flat(500);
    const tX = b.gx - 380;
    gy = b.gy;
    b.on('spring', tX, { dir: 'up', color: 'r' });
    deco('bush', tX, { front: true, sink: 2 });
    b.platform(tX - 90, gy - 420, 180);
    b.obj('medal', tX + 40, gy - 460);
    b.rings(tX - 60, gy - 440, 5, 22);
    b.obj('monitor', tX - 50, gy - 420, { kind: 'inv' });
    b.on('snapper', b.gx - 120);
    deco('palm', b.gx - 220); deco('flowers', tX + 160);

    // ---------------- final stretch ----------------
    x = b.gx;
    b.wave(800, 36, 2).flat(100);
    b.ringsGround(x + 20, 20, 40, 30);
    b.on('beetbot', x + 300); b.on('prickler', x + 640);
    b.obj('buzzwing', x + 500, b.gy - 100, { range: 90 });
    b.platform(x + 360, b.gy - 110, 96);
    b.obj('monitor', x + 400, b.gy - 110, { kind: 'ring' });
    deco('palm', x + 120); deco('sunflower', x + 220); deco('palm', x + 760);
    b.slope(300, 60).flat(200);
    b.ringsGround(b.gx - 450, 8, 30, 28);
    const goalX = b.gx + 160;
    b.flat(600);
    b.on('goal', goalX);
    deco('flowers', goalX - 100); deco('palm', goalX + 140); deco('sunflower', goalX + 260); deco('flowers', goalX + 340, { hue: 1 });
    const endX = b.gx;
    b.endGround();
    b.block(endX, 300, 200, 1200);

    return b.build({ start: { x: 120, y: 975 }, camLeft: 0, camRight: endX });
  };
})(window.G);
