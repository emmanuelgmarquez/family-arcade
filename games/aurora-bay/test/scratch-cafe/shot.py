import sys
from playwright.sync_api import sync_playwright
# usage: shot.py scene out.png [debug] [t]
scene, out = sys.argv[1], sys.argv[2]
dbg = len(sys.argv) > 3 and sys.argv[3] == '1'
t = sys.argv[4] if len(sys.argv) > 4 else '2'
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1280,'height':900})
    errs=[]
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    pg.goto('file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scene-harness.html?scene=%s&t=%s%s' % (scene, t, '&debug=1' if dbg else ''))
    pg.wait_for_timeout(600)
    pg.screenshot(path=out)
    print('\n'.join(errs) or 'no errors', pg.title())
    b.close()
