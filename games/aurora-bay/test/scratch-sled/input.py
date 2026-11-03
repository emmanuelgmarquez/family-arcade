from playwright.sync_api import sync_playwright
BASE='file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/minigame-harness.html?game=sled'
OUT='/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-sled/'
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1180,'height':820}, has_touch=True)
    errs=[]
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    pg.goto(BASE+'&tut=1'); pg.wait_for_timeout(2700); pg.screenshot(path=OUT+'tut2.png')
    pg.goto(BASE+'&species=bear'); pg.wait_for_timeout(3000)
    px = lambda: pg.evaluate('__inst._debug().px')
    # view scale: 1180/1280 vs 820/900 -> s=min(.92,.911)=.911
    s = min(1180/1280, 820/900); ox=(1180-1280*s)/2; oy=(820-900*s)/2
    L=lambda x,y:(ox+x*s, oy+y*s)
    a=px(); pg.mouse.move(*L(125,790)); pg.mouse.down(); pg.wait_for_timeout(500); pg.mouse.up(); bb=px(); print('left button', a, '->', bb)
    pg.mouse.move(*L(1155,790)); pg.mouse.down(); pg.wait_for_timeout(700); pg.mouse.up(); c=px(); print('right button ->', c)
    pg.keyboard.down('a'); pg.wait_for_timeout(500); pg.keyboard.up('a'); d=px(); print('key a ->', d)
    pg.keyboard.down('ArrowRight'); pg.wait_for_timeout(400); pg.keyboard.up('ArrowRight'); e=px(); print('ArrowRight ->', e)
    # drag
    pg.mouse.move(*L(640,500)); pg.mouse.down(); pg.mouse.move(*L(200,500), steps=5); pg.wait_for_timeout(900); f=px(); print('drag left ->', f)
    pg.mouse.move(*L(1000,450), steps=5); pg.wait_for_timeout(900); g=px(); pg.mouse.up(); print('drag right ->', g)
    # touch tap
    pg.touchscreen.tap(*L(125,790)); print('tap ok')
    pg.screenshot(path=OUT+'bear_live.png')
    # perf
    t = pg.evaluate('''(()=>{const c=document.createElement('canvas');c.width=1280;c.height=900;const x=c.getContext('2d');const t0=performance.now();for(let i=0;i<60;i++){__inst.draw(x,i/60);}return (performance.now()-t0)/60;})()''')
    print('avg draw ms', round(t,2))
    print('\n'.join(errs) or 'no errors')
    b.close()
