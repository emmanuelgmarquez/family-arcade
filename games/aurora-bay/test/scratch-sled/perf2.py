from playwright.sync_api import sync_playwright
BASE='file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/minigame-harness.html?game=sled&species=fox'
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1180,'height':820})
    pg.goto(BASE); pg.wait_for_timeout(600)
    pg.evaluate('window.__paused=true; for(let i=0;i<300;i++) __inst.update(0.05)')
    r = pg.evaluate('''(()=>{
      const c=document.createElement('canvas');c.width=2360;c.height=1640;const x=c.getContext('2d');x.scale(1.84,1.84);
      const out={};
      function time(name, fn){fn(); x.getImageData(0,0,1,1); const t0=performance.now();for(let i=0;i<20;i++){fn(); x.getImageData(0,0,1,1);}out[name]=((performance.now()-t0)/20).toFixed(2);}
      time('full', ()=>__inst.draw(x,1));
      time('empty', ()=>{});
      const objs=__inst._debug().objs; const saved=objs.slice();
      const keep=t=>{objs.length=0; for(const o of saved) if(t(o)) objs.push(o);};
      keep(o=>o.type!=='tree'); time('noTrees', ()=>__inst.draw(x,1));
      keep(o=>o.type!=='glint'&&o.type!=='bank'); time('noGlintBank', ()=>__inst.draw(x,1));
      keep(o=>false); time('noObjs', ()=>__inst.draw(x,1));
      objs.length=0; for(const o of saved) objs.push(o);
      return out;})()''')
    print(r)
    b.close()
