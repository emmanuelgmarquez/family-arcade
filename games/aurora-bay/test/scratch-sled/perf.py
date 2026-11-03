from playwright.sync_api import sync_playwright
BASE='file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/minigame-harness.html?game=sled&species=fox'
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1180,'height':820})
    pg.goto(BASE); pg.wait_for_timeout(600)
    pg.evaluate('window.__paused=true; for(let i=0;i<300;i++) __inst.update(0.05)')
    r = pg.evaluate('''(()=>{
      const c=document.createElement('canvas');c.width=2560;c.height=1800;const x=c.getContext('2d');x.scale(2,2);
      const A=AB.art, out={};
      function time(name, fn){const t0=performance.now();for(let i=0;i<30;i++)fn();out[name]=((performance.now()-t0)/30).toFixed(2);}
      time('full', ()=>__inst.draw(x,1));
      time('aurora', ()=>A.aurora(x,1280,24,170,1,0.38));
      time('chars', ()=>AB.chars.draw(x,640,700,{species:'fox',outfit:{neck:'scarf_red',head:'beanie_blue'}},{t:1,pose:'sit',back:true}));
      const sp=x.createRadialGradient(0,0,0,0,0,40);
      time('glow50', ()=>{for(let i=0;i<50;i++)A.glow(x,100+i*10,400,40,'rgba(120,220,255,',0.5);});
      time('flake50', ()=>{for(let i=0;i<50;i++){A.snowflake(x,100+i*10,400,20,'#4f9fcc',6);A.snowflake(x,100+i*10,400,20,'#fff',3);}});
      out.objs=__inst._debug().objs.length;
      out.types={}; for(const o of __inst._debug().objs){out.types[o.type]=(out.types[o.type]||0)+1;}
      return out;})()''')
    print(r)
    b.close()
