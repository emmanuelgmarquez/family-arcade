import sys
from playwright.sync_api import sync_playwright
BASE='file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/minigame-harness.html?game=fishing'
OUT='/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-fishing/'
species = sys.argv[1] if len(sys.argv)>1 else 'penguin'
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1180,'height':820}, has_touch=True)
    errs=[]
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    # balance: sloppy kid (idle 1.5s between casts, random reel depth, never steers)
    res=[]
    for IDLE in (1.5,)*5+(3,)*5:
        pg.goto(BASE+'&species='+species); pg.wait_for_timeout(300)
        r = pg.evaluate('''() => { window.__paused=true; const IDLE=%s; const S=__inst._state; let idle=0, target=0;
          for (let i=0;i<3000 && !window.__result;i++){
            if (S.mode==='idle'){ idle+=0.05; if(idle>IDLE){ idle=0; target=300+Math.random()*520; __inst.pointer('down',900,600); __inst.pointer('up',900,600);} }
            else if (S.mode==='down' && S.hookY>target){ __inst.pointer('down',900,600); __inst.pointer('up',900,600); }
            else if (S.mode==='wait'){ __inst.pointer('down',900,600); __inst.pointer('up',900,600); }
            __inst.update(0.05);
          } return window.__result; }''' % IDLE)
        res.append((r['score'], r['coins'], r['stats'][0]['value']))
    print('sloppy', res)
    # visual states
    pg.goto(BASE+'&species='+species); pg.wait_for_timeout(500)
    pg.evaluate('''() => { window.__paused=true; const S=__inst._state;
       S.time=40; S.jelly.alpha=1; S.jelly.x=600; S.jelly.y=500; S.jelly.tx=600; S.jelly.ty=500;
       S.hookY=600; S.hookX=760; S.aimX=760; S.mode='up'; S.carry={type:'junk',jt:'boot',rot:0}; S.oopsT=1; S.happyT=0;
       S.kinds=['sunny','gold','rosy']; S.shown=3; S.points=25;
       S.crab.state='awake'; S.crab.x=300;
       for (let i=0;i<3;i++) __inst.update(0.016);
    }''')
    pg.wait_for_timeout(200); pg.screenshot(path=OUT+species+'_junk.png')
    pg.evaluate('''() => { const S=__inst._state; S.carry={type:'crab'}; S.crab.state='held'; S.hookY=500; S.mode='up'; S.oopsT=1; }''')
    pg.wait_for_timeout(200); pg.screenshot(path=OUT+species+'_crab.png')
    pg.evaluate('''() => { const S=__inst._state; S.crab.state='sleep'; S.crab.x=300; S.carry={type:'fish',kind:'gold',s:1.7,dir:1}; S.hookX=640; S.aimX=640; S.hookY=470; S.jelly.cool=0; S.happyT=0; S.oopsT=0;
        for (let i=0;i<6;i++) __inst.update(0.03); }''')
    pg.wait_for_timeout(100); pg.screenshot(path=OUT+species+'_poof.png')
    pg.evaluate('''() => { const S=__inst._state; S.mode='idle'; S.hookY=300; S.carry={type:'fish',kind:'star',s:1.3,dir:1}; __inst._state.flyers=[]; 
       S.hookY=301; S.mode='up'; for (let i=0;i<8;i++) __inst.update(0.03); }''')
    pg.wait_for_timeout(100); pg.screenshot(path=OUT+species+'_catch.png')
    pg.evaluate('''() => { const S=__inst._state; S.time=74.9; for (let i=0;i<6;i++) __inst.update(0.05); }''')
    pg.wait_for_timeout(100); pg.screenshot(path=OUT+species+'_ending.png')
    print('\n'.join(errs) or 'no errors')
    b.close()
