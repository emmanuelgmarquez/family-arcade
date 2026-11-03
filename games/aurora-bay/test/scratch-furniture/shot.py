import sys
from playwright.sync_api import sync_playwright
D='file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-furniture/'
O='/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-furniture/'
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1400,'height':1000})
    errs=[]
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    for name, q in [('preview','preview.html'),('styles','styles.html')]:
        pg.goto(D+q); pg.wait_for_timeout(500)
        print(name, pg.title())
        pg.locator('canvas').first.screenshot(path=O+name+'_1.png')
        if name=='preview': pg.locator('#cat').screenshot(path=O+'catalog.png')
    print('\n'.join(errs) or 'no errors')
    b.close()
