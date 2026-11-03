from playwright.sync_api import sync_playwright
root='/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay'
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width':1280,'height':900})
    errs=[]
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e))); pg.on('requestfailed', lambda r: errs.append('FAILED '+r.url))
    pg.goto('file://'+root+'/index.html'); pg.wait_for_timeout(1500)
    print(pg.evaluate("""async () => {
      const p = await AB.store.create({ name: 'Test', species: 'fox', palette: AB.chars.species.fox.palettes ? Object.keys(AB.chars.species.fox.palettes)[0] : '' });
      AB.game.setProfile(p); AB.ui.closeAll();
      AB.go('lake', 'town');
      return 'ok';
    }"""))
    pg.wait_for_timeout(1200)
    print(pg.evaluate("""() => {
      const W = AB.world, out = [];
      out.push('scene ' + W.sceneId + ' player ' + Math.round(W.player.x) + ',' + Math.round(W.player.y) + ' skate=' + W.player.skate);
      out.push('npcs ' + W.npcs.map(n => n.id + '@' + Math.round(n.x) + ',' + Math.round(n.y) + (n.skate?'(skate)':'')).join(' '));
      out.push('pickups ' + JSON.stringify(W.pickups.map(p => [p.type, Math.round(p.x), Math.round(p.y)])));
      W.player.x = 700; W.player.y = 600; W.update(0.016);
      out.push('on ice skate=' + W.player.skate);
      return out.join('\\n');
    }"""))
    pg.wait_for_timeout(600)
    pg.screenshot(path=root+'/test/scratch-lake/game_lake.png')
    # tap the scarf tree via pointer (logical coordinates == viewport only if letterbox scale 1)
    print(pg.evaluate("""() => {
      const W = AB.world; const tg = W.targetAt(150, 250); return tg ? tg.kind + ' ' + (tg.o.id || tg.o.x) : 'none';
    }"""))
    print(pg.evaluate("""() => {
      const W = AB.world; const tree = W.scene.props[0]; W.player.x = 242; W.player.y = 428; tree.tap(tree);
      return 'after tap pickups ' + JSON.stringify(W.pickups.map(p => [p.type, Math.round(p.x), Math.round(p.y), !!p.falling]));
    }"""))
    pg.wait_for_timeout(1200)
    pg.screenshot(path=root+'/test/scratch-lake/game_lake2.png')
    # walk along a path test: find path from town spawn to each spot
    print(pg.evaluate("""() => {
      const W = AB.world, sc = W.scene, r = [];
      const from = sc.spawns.town;
      const tgts = Object.assign({}, sc.questSpots); sc.hotspots.forEach(h => tgts[h.id] = h.at);
      Object.keys(tgts).forEach(k => { const p = W.findPath(from[0], from[1], tgts[k][0], tgts[k][1]); r.push(k + ':' + (p ? p.length : 'NONE')); });
      return r.join(' ');
    }"""))
    pg.evaluate("AB.go('slopes', 'town')"); pg.wait_for_timeout(1200)
    print(pg.evaluate("""() => {
      const W = AB.world, sc = W.scene, r = ['scene ' + W.sceneId + ' player ' + Math.round(W.player.x) + ',' + Math.round(W.player.y) + ' skate=' + W.player.skate];
      const from = sc.spawns.town;
      const tgts = Object.assign({}, sc.questSpots); sc.hotspots.forEach(h => tgts[h.id] = h.at);
      Object.keys(tgts).forEach(k => { const p = W.findPath(from[0], from[1], tgts[k][0], tgts[k][1]); r.push(k + ':' + (p ? p.length : 'NONE')); });
      r.push('npcs ' + W.npcs.map(n => n.id).join(','));
      return r.join(' ');
    }"""))
    pg.screenshot(path=root+'/test/scratch-slopes/game_slopes.png')
    print('\n'.join(errs) or 'no errors')
    b.close()
