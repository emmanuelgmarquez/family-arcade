import sys
from playwright.sync_api import sync_playwright
base='file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-pets/preview.html'
ts=[float(a) for a in sys.argv[1].split(',')]
extra=sys.argv[2] if len(sys.argv)>2 else ''
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',args=['--allow-file-access-from-files'])
    pg=b.new_page(viewport={'width':1400,'height':1300})
    errs=[]
    pg.on('console',lambda m: errs.append(m.type+': '+m.text) if m.type in('error','warning') else None)
    pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)))
    pg.goto(base+'?'+extra); pg.wait_for_timeout(400)
    for t in ts:
        pg.evaluate('t=>{window.__t=t}',t); pg.wait_for_timeout(120)
        name='shot_%s%s.png'%(str(t).replace('.','_'), ('_'+extra.replace('=','').replace('&','_')) if extra else '')
        pg.screenshot(path=name); print(name)
    print('\n'.join(errs) or 'no errors')
    b.close()
