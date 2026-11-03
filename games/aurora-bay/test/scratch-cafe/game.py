from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1280,'height':900})
    errs=[]
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type=='error' else None)
    pg.goto('file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/index.html'); pg.wait_for_timeout(1200)
    pg.evaluate("()=>AB.store.create({ name: 'Testy', species: 'fox', palette: 'winter' }).then(p=>AB.game.setProfile(p))"); pg.wait_for_timeout(300)
    print('pre', errs)
    for sc in ['cafe','shop','lodge']:
        r = pg.evaluate('''(sc)=>{ try {
            
            AB.world.locked=false;
            AB.world.enter(sc, 'town');
            var c=document.createElement('canvas'); c.width=1280; c.height=900; var x=c.getContext('2d');
            for (var i=0;i<60;i++){ AB.world.update(1/30); AB.world.draw(x); }
            // walk player to each target and tap it
            var hs = AB.world.scene.hotspots.filter(h=>h.id!=='exit').length;
            (AB.world.scene.props||[]).forEach(p=>{ if(p.tap) p.tap(p); });
            for (var i=0;i<60;i++){ AB.world.update(1/30); AB.world.draw(x); }
            return 'ok npcs='+AB.world.npcs.map(n=>n.name+'@'+Math.round(n.x)+','+Math.round(n.y)).join(' ')+' pickups='+AB.world.pickups.map(p=>p.key).join(',');
          } catch(e) { return 'ERR '+e.stack; } }''', sc)
        print(sc, r)
        pg.screenshot(path='/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-%s/game.png' % sc)
    
    print(errs or 'no errors')
    b.close()
