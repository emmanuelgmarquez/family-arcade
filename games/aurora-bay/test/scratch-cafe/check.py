import sys, json
from playwright.sync_api import sync_playwright
JS = r'''
() => {
 const id = new URLSearchParams(location.search).get('scene'); const sc = AB.scenes[id], U = AB.util, CELL = 20;
 const gw = 64, gh = 45, g = new Uint8Array(gw*gh);
 const blocked = (x,y) => (sc.blocks||[]).some(k => (k.e && U.inEllipse(x,y,k.e[0],k.e[1],k.e[2],k.e[3])) || (k.r && x>=k.r[0]&&x<=k.r[0]+k.r[2]&&y>=k.r[1]&&y<=k.r[1]+k.r[3]) || (k.p && U.pointInPoly(x,y,k.p)));
 for (let j=0;j<gh;j++) for (let i=0;i<gw;i++){ const x=i*CELL+10,y=j*CELL+10; g[j*gw+i] = U.pointInPoly(x,y,sc.walk)&&!blocked(x,y)?1:0; }
 const cell = (x,y)=>Math.floor(y/CELL)*gw+Math.floor(x/CELL);
 const sp = sc.spawns['default']; const seen = new Uint8Array(gw*gh); const q=[cell(sp[0],sp[1])];
 if (!g[q[0]]) return {err:'default spawn not walkable'};
 seen[q[0]]=1;
 while(q.length){ const c=q.shift(), ci=c%gw, cj=(c-ci)/gw; for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){ const ni=ci+di,nj=cj+dj; if(ni<0||nj<0||ni>=gw||nj>=gh) continue; const n=nj*gw+ni; if(g[n]&&!seen[n]){seen[n]=1;q.push(n);} } }
 const pts = [];
 Object.keys(sc.spawns).forEach(k=>pts.push(['spawn:'+k, sc.spawns[k]]));
 (sc.hotspots||[]).forEach(h=>pts.push(['hot:'+h.id, h.at]));
 (sc.props||[]).forEach((p,i)=>{ if(p.tap && p.hit) pts.push(['prop'+i+'@'+Math.round(p.x)+','+Math.round(p.y), p.at || [p.x, p.y+20]]); });
 Object.keys(sc.npcSpots||{}).forEach(k=>pts.push(['npc:'+k, sc.npcSpots[k].at]));
 Object.keys(sc.questSpots||{}).forEach(k=>pts.push(['quest:'+k, sc.questSpots[k]]));
 const bad = pts.filter(p=>!seen[cell(p[1][0],p[1][1])]).map(p=>p[0]+' '+p[1]);
 // hit boxes inside HUD corners
 const hud = [];
 const inter = (a,b)=>a[0]<b[0]+b[2]&&b[0]<a[0]+a[2]&&a[1]<b[1]+b[3]&&b[1]<a[1]+a[3];
 (sc.hotspots||[]).concat(sc.props||[]).forEach(o=>{ if(o.hit && (inter(o.hit,[0,0,120,120])||inter(o.hit,[840,0,440,90]))) hud.push((o.id||'prop@'+o.x)+' '+o.hit); });
 const gems = []; 
 return {unreachable: bad, hud: hud, npcWander: Object.keys(sc.npcSpots||{}).map(k=>{const w=sc.npcSpots[k].wander; if(!w) return k+': none'; let ok=0,tot=0; for(let x=w[0];x<=w[0]+w[2];x+=20) for(let y=w[1];y<=w[1]+w[3];y+=20){tot++; if(seen[cell(x,y)]) ok++;} return k+': '+ok+'/'+tot+' reachable'; })};
}
'''
scene = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1280,'height':900})
    errs=[]
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.goto('file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scene-harness.html?scene='+scene)
    pg.wait_for_timeout(500)
    print(json.dumps(pg.evaluate(JS), indent=1)); print(errs or 'no errors')
    # exercise every tap / action with spies
    r = pg.evaluate('''() => { const id = new URLSearchParams(location.search).get('scene'); const sc = AB.scenes[id]; const log=[];
      AB.quests.revealGem=(k,x,y)=>log.push('gem '+k+' '+x+','+y); AB.go=(a,b)=>log.push('go '+a+' '+b); AB.playMinigame=m=>log.push('mini '+m);
      AB.ui.openCatalog=c=>log.push('catalog '+c); AB.petsUI={openAdopt:()=>log.push('adopt')}; AB.audio.sfx=s=>log.push('sfx '+s); AB.world.burst=(x,y,k)=>log.push('burst '+k);
      AB.world.player.pose=null;
      const out=[];
      (sc.hotspots||[]).forEach(h=>{log.length=0; h.action(); out.push('hot '+h.id+': '+log.join(' | '));});
      (sc.props||[]).forEach((p,i)=>{ if(p.tap){ log.length=0; AB.world.player.pose=null; p.tap(p); out.push('prop '+i+' ('+Math.round(p.x)+','+Math.round(p.y)+'): '+log.join(' | ')+(AB.world.player.pose?' pose='+AB.world.player.pose:'')); }});
      if (sc.update) for (let k=0;k<30;k++){ AB.world.t+=0.05; sc.update(0.05); }
      return out; }''')
    print('\n'.join(r)); print(errs or 'no errors after taps')
    b.close()
