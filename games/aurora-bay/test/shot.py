import sys, asyncio
from playwright.sync_api import sync_playwright
url, out = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv)>3 else 1400; h=int(sys.argv[4]) if len(sys.argv)>4 else 760
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':w,'height':h})
    errs=[]
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    pg.goto(url); pg.wait_for_timeout(800)
    pg.screenshot(path=out)
    print('\n'.join(errs) or 'no errors')
    b.close()
