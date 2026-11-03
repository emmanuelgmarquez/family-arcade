from playwright.sync_api import sync_playwright
D='/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-cocoa/'
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',args=['--allow-file-access-from-files'])
    pg=b.new_page(viewport={'width':1180,'height':820}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto('file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/minigame-harness.html?game=cocoa&species=fox&palette=blue'); pg.wait_for_timeout(300)
    pg.evaluate('window.__paused=true')
    pg.evaluate('()=>{for(let i=0;i<140;i++)__inst.update(0.05)}'); pg.wait_for_timeout(50); pg.screenshot(path=D+'hint.png')
    pg.evaluate('()=>{for(let i=0;i<1000;i++)__inst.update(0.05)}'); pg.wait_for_timeout(50); pg.screenshot(path=D+'shrug.png')
    pg.keyboard.press('ArrowRight'); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(50); pg.screenshot(path=D+'focus.png')
    print(pg.evaluate('JSON.stringify(__inst._debug().customers)')); print(errs or 'no errors'); b.close()
