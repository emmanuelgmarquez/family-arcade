import sys, json
from playwright.sync_api import sync_playwright
D = '/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-cocoa/'
BASE = 'file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/minigame-harness.html?game=cocoa'
species = sys.argv[1] if len(sys.argv) > 1 else 'hare'
mode = sys.argv[2] if len(sys.argv) > 2 else 'play'

def step(pg, secs):
    pg.evaluate('(n)=>{for(let i=0;i<n;i++){ if(window.__inst) __inst.update(0.05);} }', int(secs / 0.05))

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width': 1180, 'height': 820}, has_touch=True)
    errs = []
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    if mode == 'tut':
        pg.set_viewport_size({'width': 1180, 'height': 360})
        pg.goto(BASE + '&tut=1&species=' + species)
        for i, w in enumerate([1200, 1000, 900]):
            pg.wait_for_timeout(w); pg.screenshot(path=D + 'tut%d.png' % i)
        print('\n'.join(errs) or 'no errors'); b.close(); sys.exit()
    pg.goto(BASE + '&species=' + species)
    pg.wait_for_timeout(500)
    pg.evaluate('window.__paused=true')
    step(pg, 3.5)
    pg.wait_for_timeout(100); pg.screenshot(path=D + 's1_%s.png' % species)
    # Convert logical->css: view scale
    sc = pg.evaluate('Math.min(innerWidth/1280, innerHeight/900)')
    ox = (1180 - 1280 * sc) / 2; oy = (820 - 900 * sc) / 2
    def tap(x, y):
        pg.mouse.click(ox + x * sc, oy + y * sc)
    tap(235, 790)  # blue mug
    step(pg, 0.3)
    tap(520, 790)  # cocoa
    step(pg, 0.5)
    pg.wait_for_timeout(50); pg.screenshot(path=D + 's2_pour_%s.png' % species)
    step(pg, 1)
    pg.screenshot(path=D + 's3_built_%s.png' % species)
    # Play a full round with an auto-player using keyboard
    auto = '''
    () => {
      // read internals indirectly: not exposed; use keys guessing order from screen is not possible
      return 0;
    }'''
    pg.keyboard.press('Enter'); step(pg, 0.6)
    pg.screenshot(path=D + 's4_served_%s.png' % species)
    # random play with keys
    import random
    t = 5
    shots = {20: 's5', 45: 's6', 62: 's7', 76: 's8'}
    while t < 84:
        for k in random.sample(['1', '2', '3'], 1) + random.sample(['4', '5', '6'], 1):
            pg.keyboard.press(k); step(pg, 0.3)
        step(pg, 1.0)
        if random.random() < 0.7:
            pg.keyboard.press(random.choice(['7', '8', '9'])); step(pg, 0.4)
        pg.keyboard.press('Enter'); step(pg, 1.2)
        t += 3.2
        for s in list(shots):
            if t >= s:
                pg.wait_for_timeout(30); pg.screenshot(path=D + shots[s] + '_' + species + '.png'); del shots[s]
        if random.random() < 0.1: pg.keyboard.press('Backspace')
    step(pg, 1.0); pg.screenshot(path=D + 's9_end_%s.png' % species)
    step(pg, 3)
    print('RESULT', json.dumps(pg.evaluate('window.__result')))
    print('SFX', pg.evaluate('JSON.stringify(window.__sfx.reduce((a,n)=>(a[n]=(a[n]||0)+1,a),{}))'))
    print('\n'.join(errs) or 'no errors')
    b.close()
