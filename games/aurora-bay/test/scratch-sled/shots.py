import sys
from playwright.sync_api import sync_playwright
BASE='file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/minigame-harness.html?game=sled'
OUT='/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-sled/'
species = sys.argv[1] if len(sys.argv)>1 else 'hare'
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1180,'height':820}, has_touch=True)
    errs=[]
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    pg.goto(BASE+'&tut=1'); pg.wait_for_timeout(1200)
    pg.screenshot(path=OUT+'tut.png')
    pg.goto(BASE+'&species='+species); pg.wait_for_timeout(1500)
    pg.screenshot(path=OUT+species+'_count.png')
    pg.evaluate('window.__paused=true')
    pg.evaluate('for(let i=0;i<120;i++) __inst.update(0.05)')
    pg.wait_for_timeout(100); pg.screenshot(path=OUT+species+'_run1.png')
    pg.keyboard.down('ArrowLeft')
    pg.evaluate('for(let i=0;i<10;i++) __inst.update(0.05)')
    pg.wait_for_timeout(100); pg.screenshot(path=OUT+species+'_left.png')
    pg.keyboard.up('ArrowLeft')
    print(pg.evaluate('JSON.stringify((d=>({phase:d.phase,el:d.elapsed,fl:d.flakes,st:d.stars,j:d.jumps,c:d.crashes,sp:d.speed,n:d.objs.length}))(__inst._debug()))'))
    print('\n'.join(errs) or 'no errors')
    b.close()
