import sys
from playwright.sync_api import sync_playwright
BASE='file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/minigame-harness.html?game=fishing'
OUT='/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-fishing/'
species = sys.argv[1] if len(sys.argv)>1 else 'hare'
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1180,'height':820}, has_touch=True)
    errs=[]
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    pg.goto(BASE+'&tut=1'); pg.wait_for_timeout(1500)
    pg.screenshot(path=OUT+'tut_a.png'); pg.wait_for_timeout(1300); pg.screenshot(path=OUT+'tut_b.png')
    pg.goto(BASE+'&species='+species); pg.wait_for_timeout(1200)
    pg.screenshot(path=OUT+species+'_start.png')
    # hold mouse to lower hook
    pg.mouse.move(900,600); pg.mouse.down(); pg.wait_for_timeout(1500)
    pg.screenshot(path=OUT+species+'_down.png')
    pg.mouse.up(); pg.wait_for_timeout(400)
    pg.screenshot(path=OUT+species+'_up.png')
    # automated play: simulate many cycles quickly
    stats = pg.evaluate('''() => {
      const S = __inst._state; let loops=0;
      for (let i=0;i<2000 && !window.__result;i++){
        if (S.mode==='idle' && !S.carry) __inst.key('down',' '), __inst.key('up',' ');
        if (S.mode==='wait') { __inst.key('down','ArrowUp'); __inst.key('up','ArrowUp'); }
        __inst.update(0.05); loops++;
        if (i===400) window.__mid = {caught:S.caught, points:S.points, t:S.time};
      }
      return {loops, mid: window.__mid, res: window.__result, sfx: [...new Set(window.__sfx)]};
    }''')
    print(stats)
    pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+species+'_end.png')
    print('\n'.join(errs) or 'no errors')
    b.close()
