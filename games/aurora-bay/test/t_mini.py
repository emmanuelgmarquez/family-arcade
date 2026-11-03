import sys, json; sys.path.insert(0,'test')
from playwright.sync_api import sync_playwright
OUT='/tmp/claude-0/'; BASE='http://localhost:8123/index.html'
games = sys.argv[1].split(',') if len(sys.argv)>1 else ['fishing']
ok=[]; bad=[]
def check(n,c,i=''): (ok if c else bad).append(n+('' if c else '  <-- '+str(i)))
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome'); ctx=b.new_context(viewport={'width':1180,'height':820},has_touch=True); pg=ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and '404' not in m.text else None)
    pg.goto(BASE); pg.wait_for_timeout(1200)
    pg.click('.who-card.add'); pg.wait_for_timeout(300); pg.click('.species button[data-sp=seal]'); pg.fill('.namebox input','Ava'); pg.click('.go'); pg.wait_for_timeout(2300)
    pg.click('.dialog .btn')
    for g in games:
        c0 = pg.evaluate('AB.game.profile.coins')
        pg.evaluate('AB.playMinigame("%s")' % g); pg.wait_for_timeout(900)
        pg.screenshot(path=OUT+'m_%s_tut.png' % g)
        pg.click('.go'); pg.wait_for_timeout(600)
        # play a little with real input: taps and arrows
        for i in range(6):
            pg.mouse.click(400+i*80, 500); pg.wait_for_timeout(250)
            pg.keyboard.press('ArrowLeft' if i%2 else 'ArrowRight')
        pg.wait_for_timeout(1500)
        pg.screenshot(path=OUT+'m_%s_play.png' % g)
        pg.click('.mg-pause .tool'); pg.wait_for_timeout(300)
        check(g+' pause shows', pg.query_selector('.btn.res') is not None)
        pg.click('.btn.res'); pg.wait_for_timeout(200)
        # fast-forward to the end
        pg.evaluate('for (var i=0;i<4000 && !document.querySelector(".results");i++){ AB.shell.inst && AB.shell.inst.update(0.05); }'); pg.wait_for_timeout(1500)
        pg.evaluate('for (var i=0;i<400 && !document.querySelector(".results");i++){ AB.shell.inst && AB.shell.inst.update(0.05); }'); pg.wait_for_timeout(1200)
        check(g+' results shown', pg.query_selector('.results') is not None)
        pg.wait_for_timeout(1500)
        pg.screenshot(path=OUT+'m_%s_res.png' % g)
        c1 = pg.evaluate('AB.game.profile.coins')
        check(g+' coins awarded (>=15)', c1 - c0 >= 15, (c0, c1))
        pg.click('.results .back'); pg.wait_for_timeout(500)
        check(g+' back in world', pg.evaluate('AB.mode') == 'world')
        check(g+' coins awarded once', pg.evaluate('AB.game.profile.coins') == c1)
        check(g+' record saved', pg.evaluate('AB.game.profile.records["%s"].plays' % g) == 1)
        # exit mid-game gives no coins and returns
        pg.evaluate('AB.playMinigame("%s")' % g); pg.wait_for_timeout(500); pg.click('.go'); pg.wait_for_timeout(500)
        pg.click('.mg-pause .tool'); pg.wait_for_timeout(200); pg.click('.btn.ext'); pg.wait_for_timeout(400)
        check(g+' exit mid-game', pg.evaluate('AB.mode') == 'world' and pg.evaluate('AB.game.profile.coins') == c1)
    print('PASS', len(ok)); print('FAIL', len(bad)); [print('  XX', x) for x in bad]; print('errors:', errs[:6])
    b.close()
