import sys, json
from playwright.sync_api import sync_playwright
D = '/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-cocoa/'
BASE = 'file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/minigame-harness.html?game=cocoa'
species = sys.argv[1]; mode = sys.argv[2]  # perfect | slow | idle | touch
CUPS = ['red', 'blue', 'yellow']; DR = ['cocoa', 'pink', 'mint']; TP = ['cream', 'marsh', 'sprinkles']

def step(pg, secs):
    pg.evaluate('(n)=>{for(let i=0;i<n;i++){ if(window.__inst) __inst.update(0.05);} }', int(secs / 0.05))

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width': 1180, 'height': 820}, has_touch=True)
    errs = []
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.goto(BASE + '&species=' + species); pg.wait_for_timeout(400)
    pg.evaluate('window.__paused=true')
    sc = pg.evaluate('Math.min(innerWidth/1280, innerHeight/900)')
    ox = (1180 - 1280 * sc) / 2; oy = (820 - 900 * sc) / 2
    tilex = [105, 235, 365, 520, 650, 780, 935, 1065, 1195]
    def tap(x, y): pg.touchscreen.tap(ox + x * sc, oy + y * sc)
    def press(i):
        if mode == 'touch': tap(tilex[i], 790)
        else: pg.keyboard.press(str(i + 1))
    t = 0; shot = 0
    while pg.evaluate('!window.__result') and t < 120:
        if mode == 'idle': step(pg, 1); t += 1; continue
        d = pg.evaluate('__inst._debug()')
        waits = [c for c in d['customers'] if c['state'] == 'wait']
        if not waits: step(pg, 0.3); t += 0.3; continue
        c = min(waits, key=lambda c: c['patience'])
        o = c['order']
        if mode == 'slow': step(pg, 4); t += 4
        press(CUPS.index(o['cup'])); step(pg, 0.35)
        press(3 + DR.index(o['drink'])); step(pg, 1.05)
        if o['top']: press(6 + TP.index(o['top'])); step(pg, 0.35)
        if mode == 'touch':
            # drag the mug to the target customer
            pg.mouse.move(ox + 640 * sc, oy + 560 * sc); pg.mouse.down()
            pg.mouse.move(ox + c['x'] * sc, oy + 380 * sc, steps=5); pg.mouse.up()
        else:
            pg.keyboard.press('Enter')
        step(pg, 0.5); t += 2.3
        if shot < 3 and d['stage'] >= 3 + (shot > 0):
            pg.wait_for_timeout(30); pg.screenshot(path=D + 'bot_%s_%s_%d.png' % (mode, species, shot)); shot += 1
    step(pg, 4)
    print(mode, species, 'RESULT', json.dumps(pg.evaluate('window.__result')))
    print('\n'.join(errs) or 'no errors')
    b.close()
