# Drives the real game in headless Chrome at iPad landscape size.
import sys, json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8123/index.html'
OUT = '/tmp/claude-0/'
def run(steps):
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome')
        ctx = b.new_context(viewport={'width':1180,'height':820}, has_touch=True, device_scale_factor=1)
        pg = ctx.new_page()
        errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error',) else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
        pg.goto(BASE); pg.wait_for_timeout(1200)
        steps(pg)
        print('\n'.join(errs) or 'no errors')
        b.close()
if __name__ == '__main__':
    def s(pg):
        pg.screenshot(path=OUT+'g_who.png')
    run(s)
