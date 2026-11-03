import sys
from playwright.sync_api import sync_playwright
scene = sys.argv[1]; t = sys.argv[2] if len(sys.argv) > 2 else '2'
root = '/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay'
out = root + '/test/scratch-' + scene + '/'
JS = r"""
() => {
  const sc = AB.scenes[%s], U = AB.util, CELL = 20, gw = 64, gh = 45;
  function blocked(x, y) { return (sc.blocks||[]).some(k => (k.e && U.inEllipse(x,y,k.e[0],k.e[1],k.e[2],k.e[3])) || (k.r && x>=k.r[0]&&x<=k.r[0]+k.r[2]&&y>=k.r[1]&&y<=k.r[1]+k.r[3]) || (k.p && U.pointInPoly(x,y,k.p))); }
  const g = new Uint8Array(gw*gh);
  for (let j=0;j<gh;j++) for (let i=0;i<gw;i++) { const x=i*CELL+10,y=j*CELL+10; g[j*gw+i] = U.pointInPoly(x,y,sc.walk) && !blocked(x,y) ? 1 : 0; }
  const pts = {};
  Object.keys(sc.spawns).forEach(k => pts['spawn:'+k] = sc.spawns[k]);
  sc.hotspots.forEach(h => pts['hot:'+h.id] = h.at);
  Object.keys(sc.npcSpots||{}).forEach(k => pts['npc:'+k] = sc.npcSpots[k].at);
  Object.keys(sc.questSpots||{}).forEach(k => pts['quest:'+k] = sc.questSpots[k]);
  (sc.props||[]).forEach((p,i) => { if (p.tap && p.at) pts['prop'+i] = p.at; });
  const cell = p => Math.floor(p[1]/CELL)*gw + Math.floor(p[0]/CELL);
  const start = cell(sc.spawns['default']);
  const seen = new Uint8Array(gw*gh); const q=[start]; seen[start]=1;
  while (q.length) { const c=q.pop(), ci=c%%gw, cj=(c-ci)/gw; for (const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]) { const ni=ci+di,nj=cj+dj; if(ni<0||nj<0||ni>=gw||nj>=gh) continue; const n=nj*gw+ni; if(g[n]&&!seen[n]){seen[n]=1;q.push(n);} } }
  const res = [];
  Object.keys(pts).forEach(k => { const c = cell(pts[k]); res.push(k + ' ' + JSON.stringify(pts[k]) + ' walk=' + g[c] + ' reach=' + seen[c]); });
  let tot=0, reach=0; for (let i=0;i<g.length;i++){ if(g[i]) {tot++; if(seen[i]) reach++;} }
  res.push('walk cells ' + tot + ' reachable ' + reach);
  // wander boxes: fraction of walkable cells
  Object.keys(sc.npcSpots||{}).forEach(k => { const w = sc.npcSpots[k].wander; if (!w) return; let a=0,b=0; for (let x=w[0];x<=w[0]+w[2];x+=20) for (let y=w[1];y<=w[1]+w[3];y+=20){a++; if (seen[cell([x,y])]) b++; if (sc.onIce && !sc.onIce(x,y)) res.push('wander off-ice '+x+','+y);} res.push('wander '+k+' '+b+'/'+a); });
  return res.join('\n');
}
"""
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width': 1280, 'height': 900})
    errs = []
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    for dbg in ('', '&debug=1'):
        pg.goto('file://' + root + '/test/scene-harness.html?scene=' + scene + '&t=' + t + dbg)
        pg.wait_for_function('document.title=="ready"', timeout=5000)
        pg.screenshot(path=out + ('dbg' if dbg else 'shot') + '_t' + t + '.png')
    print(pg.evaluate(JS % repr(scene)))
    print('\n'.join(errs) or 'no errors')
    b.close()
