import sys
from playwright.sync_api import sync_playwright
D='file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-furniture/'
O=D.replace('file://','')
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1400,'height':1000})
    errs=[]
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    for q,out in zip(sys.argv[1::2], sys.argv[2::2]):
        pg.goto(D+q); pg.wait_for_timeout(400)
        pg.locator('canvas').first.screenshot(path=O+out)
    print('\n'.join(errs) or 'no errors')
    b.close()
