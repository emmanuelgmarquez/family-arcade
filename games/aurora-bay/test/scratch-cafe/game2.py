import base64
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1280,'height':900})
    errs=[]
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    pg.goto('file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/index.html'); pg.wait_for_timeout(1000)
    pg.evaluate("()=>AB.store.create({ name: 'Testy', species: 'fox', palette: 'winter' }).then(p=>AB.game.setProfile(p))"); pg.wait_for_timeout(300)
    for sc in ['cafe','shop','lodge']:
        d = pg.evaluate('''(sc)=>{ AB.world.enter(sc,'town'); var c=document.createElement('canvas'); c.width=1280; c.height=900; var x=c.getContext('2d');
          for (var i=0;i<150;i++){ AB.world.update(1/30); } AB.world.draw(x); return c.toDataURL(); }''', sc)
        open('/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-%s/game.png' % sc,'wb').write(base64.b64decode(d.split(',')[1]))
    print(errs or 'no errors')
    b.close()
