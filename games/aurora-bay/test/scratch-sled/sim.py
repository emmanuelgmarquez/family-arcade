import sys, json
from playwright.sync_api import sync_playwright
BASE='file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/minigame-harness.html?game=sled&species='
BOT = r'''
(mode) => {
  // count all spawned items via a wrapper on objs: track ids
  let seen = new Set(), totF=0, totS=0;
  let target = 640, reactT = 0, idle = 0, steps = 0;
  while (!window.__result && steps < 4000) {
    const d = __inst._debug();
    for (const o of d.objs) { if ((o.type==='flake'||o.type==='star') && !seen.has(o)) { seen.add(o); if (o.type==='flake') totF++; else totS++; } }
    if (mode !== 'none') {
      reactT -= 0.05;
      if (reactT <= 0) {
        reactT = mode === 'kid' ? 0.5 + Math.random()*0.6 : 0.05;
        // look ahead for best item, avoid obstacles
        let best = null, bestScore = -1e9;
        const look = mode === 'kid' ? 1400 : 1800;
        for (const o of d.objs) {
          if (o.done) continue; const dz = o.z - d.pz; if (dz < 80 || dz > look) continue;
          if (o.type === 'flake' || o.type === 'star') {
            if (o.h > 150 && !d.air && o.type==='star') continue;
            const sc = (o.type === 'star' ? 4 : 1) * 1000 / (dz + 200) - Math.abs(o.x - d.px) / 400;
            if (sc > bestScore) { bestScore = sc; best = o; }
          }
        }
        let tx = best ? best.x : d.px;
        if (mode !== 'kid' || Math.random() < 0.6) {
          for (const o of d.objs) { if (o.done || o.type!=='obs') continue; const dz = o.z - d.pz; if (dz > 0 && dz < 700 && Math.abs(o.x - tx) < 110) tx = o.x + (tx > o.x ? 140 : -140); }
        }
        if (mode === 'kid') { tx += (Math.random()-0.5)*200; if (Math.random() < 0.35) tx = d.px; }
        target = 640 + (tx - d.px) + (d.px - 0) * 0; // screen-ish
        __inst._steerTo(null);
        window.__tx = tx;
      }
      // drag toward world tx: compute screen x of tx using camX approx
      const dd = __inst._debug();
      __inst._steerWorld(window.__tx);
    }
    __inst.update(0.05); steps++;
  }
  const d = __inst._debug();
  return {res: window.__result, totF, totS, crashes: d.crashes, steps};
}
'''
modes = sys.argv[2:] or ['none','kid','kid','kid','pro']
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    for m in modes:
        pg = b.new_page(viewport={'width':1180,'height':820}, has_touch=True)
        errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
        pg.on('console', lambda msg: errs.append(msg.text) if msg.type=='error' else None)
        pg.goto(BASE+(sys.argv[1] if len(sys.argv)>1 else 'fox')); pg.wait_for_timeout(500)
        pg.evaluate('window.__paused=true')
        r = pg.evaluate(BOT, m)
        res = r['res']
        print(m, 'score', res and res['score'], 'coins', res and res['coins'], [s['value'] for s in res['stats']] if res else None, 'spawned F/S', r['totF'], r['totS'], 'crashes', r['crashes'], 'time', round(r['steps']*0.05,1), errs[:3])
        pg.close()
    b.close()
