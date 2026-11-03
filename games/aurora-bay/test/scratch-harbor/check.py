import sys, json
from playwright.sync_api import sync_playwright
scene = sys.argv[1]
JS = r'''
() => {
  var sc = AB.scenes[SCENE], U = AB.util, CELL = 20, gw = 64, gh = 45, out = [];
  function blocked(x, y) { return (sc.blocks||[]).some(function (k) { return (k.e && U.inEllipse(x,y,k.e[0],k.e[1],k.e[2],k.e[3])) || (k.r && x>=k.r[0]&&x<=k.r[0]+k.r[2]&&y>=k.r[1]&&y<=k.r[1]+k.r[3]) || (k.p && U.pointInPoly(x,y,k.p)); }); }
  var g = new Uint8Array(gw*gh);
  for (var j=0;j<gh;j++) for (var i=0;i<gw;i++) { var x=i*CELL+10,y=j*CELL+10; g[j*gw+i] = U.pointInPoly(x,y,sc.walk)&&!blocked(x,y)?1:0; }
  function cell(p){ return Math.floor(p[1]/CELL)*gw+Math.floor(p[0]/CELL); }
  var pts = [];
  Object.keys(sc.spawns).forEach(function(k){ pts.push(['spawn:'+k, sc.spawns[k]]); });
  (sc.hotspots||[]).forEach(function(h){ pts.push(['hot:'+h.id, h.at]); });
  Object.keys(sc.npcSpots||{}).forEach(function(k){ pts.push(['npc:'+k, sc.npcSpots[k].at]); var w=sc.npcSpots[k].wander; if (w) { var ok=0,n=0; for (var a=0;a<10;a++) for (var b=0;b<10;b++){ n++; if (g[cell([w[0]+w[2]*a/9, w[1]+w[3]*b/9])]) ok++; } out.push('wander '+k+' walkable '+ok+'/'+n); } });
  Object.keys(sc.questSpots||{}).forEach(function(k){ pts.push(['quest:'+k, sc.questSpots[k]]); });
  (sc.props||[]).forEach(function(p,i){ if (p.tap) pts.push(['prop'+i+'@'+p.x+','+p.y, p.at || [p.x, p.y+20]]); });
  // flood from default spawn
  var seen = new Uint8Array(gw*gh), st=[cell(sc.spawns['default'])]; seen[st[0]]=1;
  while (st.length) { var c=st.pop(), ci=c%gw, cj=(c-ci)/gw; for (var dj=-1;dj<=1;dj++) for (var di=-1;di<=1;di++) { var ni=ci+di,nj=cj+dj; if(ni<0||nj<0||ni>=gw||nj>=gh) continue; var id=nj*gw+ni; if(g[id]&&!seen[id]){ if (di&&dj&&(!g[cj*gw+ni]||!g[nj*gw+ci])) continue; seen[id]=1; st.push(id);} } }
  pts.forEach(function(p){ var c=cell(p[1]); if(!g[c]) out.push('NOT WALKABLE '+p[0]+' '+p[1]); else if(!seen[c]) out.push('NOT CONNECTED '+p[0]+' '+p[1]); });
  var total=0, reach=0; for (var q=0;q<g.length;q++){ if(g[q]){total++; if(seen[q]) reach++;} } out.push('walk cells '+total+' reachable '+reach);
  // run every tap/action and draw at many times
  var calls = []; AB.go = function(a,b){ calls.push('go '+a+' '+b); }; AB.quests.revealGem = function(k,x,y){ calls.push('gem '+k+' '+x+','+y); var c2=cell([x,y]); if(!g[c2]) calls.push('  (gem spot not walkable!)'); };
  AB.quests.event = function(a,b){ calls.push('event '+a+' '+b); };
  AB.world.player = { x:0, y:0, dir:1 }; AB.audio.sfx = function(n){ calls.push('sfx '+n); };
  AB.world.particles = []; AB.world.burst = function(){ calls.push('burst'); };
  var ctx = document.getElementById('c').getContext('2d');
  (sc.hotspots||[]).forEach(function(h){ calls.push('[hot '+h.id+']'); h.action(); });
  (sc.props||[]).forEach(function(p,i){ if (p.tap) { calls.push('[prop '+i+']'); AB.world.t = 10; p.tap(p); for (var t=10;t<13;t+=0.1){ AB.world.t=t; p.draw(ctx,t,p); if (sc.update) sc.update(0.1);} } });
  for (var t=0;t<30;t+=0.37){ if (sc.animate) sc.animate(ctx,t); if (sc.overlay) sc.overlay(ctx,t); (sc.props||[]).forEach(function(p){ p.draw(ctx,t,p); }); }
  return out.concat(calls).join('\n');
}
'''.replace('SCENE', json.dumps(scene))
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1280,'height':900})
    errs=[]
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    pg.goto('file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scene-harness.html?scene='+scene)
    pg.wait_for_function('document.title=="ready"')
    print(pg.evaluate(JS))
    print('\n'.join(errs) or 'no errors')
    b.close()
