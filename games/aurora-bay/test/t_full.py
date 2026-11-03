# Full-game verification: locations & exits, reachability, input separation, quests, pets, parent gate.
import sys, json; sys.path.insert(0, 'test')
from playwright.sync_api import sync_playwright
OUT = '/tmp/claude-0/'; BASE = 'http://localhost:8123/index.html'
ok = []; bad = []
def check(n, c, i=''): (ok if c else bad).append(n + ('' if c else '  <-- ' + str(i)))
def ev(pg, js): return pg.evaluate(js)
def go(pg, scene, frm='map'):
    ev(pg, 'AB.ui.closeAll(); AB.go("%s","%s")' % (scene, frm)); pg.wait_for_timeout(700)

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    ctx = b.new_context(viewport={'width': 1180, 'height': 820}, has_touch=True)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(BASE); pg.wait_for_timeout(1200)
    pg.click('.who-card.add'); pg.wait_for_timeout(300); pg.click('.species button[data-sp=hare]'); pg.fill('.namebox input', 'Kit'); pg.click('.go'); pg.wait_for_timeout(2300); pg.click('.dialog .btn')
    kit = ev(pg, 'AB.game.profile.id')

    scenes = json.loads(ev(pg, 'JSON.stringify(Object.keys(AB.scenes))'))
    expected = ['town', 'iglooLane', 'igloo', 'cafe', 'shop', 'lodge', 'lake', 'slopes', 'harbor', 'lighthouse']
    check('all 10 locations registered', all(s in scenes for s in expected), scenes)
    check('all 3 minigames registered', ev(pg, 'Object.keys(AB.minigames).sort().join()') == 'cocoa,fishing,sled', ev(pg, 'Object.keys(AB.minigames).join()'))

    # ---- every hotspot leads somewhere real; every travel hotspot round-trips
    for sid in expected:
        if sid == 'igloo': continue
        go(pg, sid)
        check(sid + ' entered', ev(pg, 'AB.world.sceneId') == sid)
        pg.screenshot(path=OUT + 'f_' + sid + '.png')
        info = json.loads(ev(pg, '''JSON.stringify((function(){
          var sc = AB.scene = AB.world.scene, W = AB.world, res = {hot:[], unreach:[], badspots:[]};
          var sp = W.player;
          (sc.hotspots||[]).forEach(function(h){ var p = W.findPath(sp.x, sp.y, h.at[0], h.at[1]); if(!p) res.unreach.push('hot:'+h.id); res.hot.push(h.id); });
          Object.keys(sc.npcSpots||{}).forEach(function(k){ var a = sc.npcSpots[k].at; if(!W.walkable(a[0],a[1])) res.badspots.push('npc:'+k); else if(!W.findPath(sp.x,sp.y,a[0],a[1])) res.unreach.push('npc:'+k); });
          Object.keys(sc.questSpots||{}).forEach(function(k){ var a = sc.questSpots[k]; var n = W.walkable(a[0],a[1]) ? a : W.nearestWalkable(a[0],a[1]); if(!n || !W.findPath(sp.x,sp.y,n[0],n[1])) res.unreach.push('quest:'+k); });
          (sc.props||[]).forEach(function(pr,i){ if(pr.tap && pr.hit){ var at = pr.at || [pr.x, pr.y+20]; var n = W.walkable(at[0],at[1]) ? at : W.nearestWalkable(at[0],at[1]); if(!n || !W.findPath(sp.x,sp.y,n[0],n[1])) res.unreach.push('prop:'+i); } });
          Object.keys(sc.spawns||{}).forEach(function(k){ var a = sc.spawns[k]; if(!W.walkable(a[0],a[1])) res.badspots.push('spawn:'+k); });
          return res; })())'''))
        check(sid + ' everything reachable', not info['unreach'], info['unreach'])
        check(sid + ' spots walkable', not info['badspots'], info['badspots'])
        # exercise each travel hotspot
        hots = info['hot']
        for hid in hots:
            go(pg, sid)
            before = ev(pg, 'AB.world.sceneId')
            r = ev(pg, '''(function(){ var h = AB.world.scene.hotspots.filter(function(x){return x.id==="%s"})[0]; var cnt = document.querySelectorAll('.scrim').length;
                 try { h.action(); } catch(e) { return 'ERR ' + e.message; } return 'ok'; })()''' % hid)
            pg.wait_for_timeout(800)
            after = ev(pg, 'AB.world.sceneId'); mode = ev(pg, 'AB.mode'); modal = ev(pg, 'AB.ui.hasModal()')
            did = (after != before) or mode == 'minigame' or modal
            check('%s.%s does something' % (sid, hid), r == 'ok' and did, (r, after, mode, modal))
            if mode == 'minigame':
                ev(pg, 'AB.shell.exit()'); pg.wait_for_timeout(200)
            ev(pg, 'AB.ui.closeAll(); if (AB.game.visiting) AB.visitEnd();')
            if after != before and after in expected and after != 'igloo':
                # the destination must have a way back
                back = ev(pg, 'JSON.stringify(AB.world.scene.hotspots.filter(function(h){ var s=h.action.toString(); return s.indexOf("%s")>=0; }).map(function(h){return h.id}))' % before)
                check('%s -> %s has a way back' % (sid, after), len(json.loads(back)) > 0, back)
    # igloo exit
    go(pg, 'igloo'); ev(pg, 'AB.world.scene.hotspots[0].action()'); pg.wait_for_timeout(800)
    check('igloo exit -> lane', ev(pg, 'AB.world.sceneId') == 'iglooLane')

    # ---- tap vs drag never mixes
    go(pg, 'town')
    p0 = json.loads(ev(pg, 'JSON.stringify([AB.world.player.x, AB.world.player.y])'))
    pg.mouse.move(600, 600); pg.mouse.down()
    for i in range(10): pg.mouse.move(600 + i * 20, 600 - i * 5); pg.wait_for_timeout(10)
    pg.mouse.up(); pg.wait_for_timeout(600)
    p1 = json.loads(ev(pg, 'JSON.stringify([AB.world.player.x, AB.world.player.y])'))
    check('drag in world does not walk', p0 == p1, (p0, p1))
    pg.mouse.click(400, 650); pg.wait_for_timeout(900)
    p2 = json.loads(ev(pg, 'JSON.stringify([AB.world.player.x, AB.world.player.y])'))
    check('tap in world walks', p2 != p1, (p1, p2))
    pg.touchscreen.tap(800, 650); pg.wait_for_timeout(3000)
    p3 = json.loads(ev(pg, 'JSON.stringify([AB.world.player.x, AB.world.player.y])'))
    check('touch tap walks', p3 != p2, (p2, p3))
    # menus block the world: tapping inside a panel doesn't walk
    pg.click('.tool.t-bag'); pg.wait_for_timeout(300)
    pg.mouse.click(590, 500); pg.wait_for_timeout(600)
    check('tap in a menu does not walk', json.loads(ev(pg, 'JSON.stringify([AB.world.player.x, AB.world.player.y])')) == p3)
    ev(pg, 'AB.ui.closeAll()')
    # decorate: dragging furniture doesn't move the character
    go(pg, 'igloo'); pg.click('text=Decorate'); pg.wait_for_timeout(400)
    pp = json.loads(ev(pg, 'JSON.stringify([AB.world.player.x, AB.world.player.y])'))
    pl = json.loads(ev(pg, 'JSON.stringify(AB.game.profile.igloo.placed.filter(function(p){return p.item=="table_round"})[0])'))
    s = json.loads(ev(pg, 'JSON.stringify(AB.toScreen(%f,%f))' % (pl['x'], pl['y'] - 20)))
    pg.mouse.move(s['x'], s['y']); pg.mouse.down()
    for i in range(10): pg.mouse.move(s['x'] - i * 25, s['y'] - i * 4); pg.wait_for_timeout(10)
    pg.mouse.up(); pg.wait_for_timeout(300)
    pl2 = json.loads(ev(pg, 'JSON.stringify(AB.game.profile.igloo.placed.filter(function(p){return p.item=="table_round"})[0])'))
    check('furniture drags', abs(pl2['x'] - pl['x']) > 100, (pl, pl2))
    check('dragging furniture does not walk', json.loads(ev(pg, 'JSON.stringify([AB.world.player.x, AB.world.player.y])')) == pp)
    # furniture can't be pushed off-screen or into the doorway
    ev(pg, 'var t = AB.game.profile.igloo.placed[0]; t.x = 5000; t.y = 5000; AB.iglooRoom.clamp(t);')
    t = json.loads(ev(pg, 'JSON.stringify(AB.game.profile.igloo.placed[0])'))
    check('clamped inside room', 0 < t['x'] < 1280 and 0 < t['y'] < 900, t)
    ev(pg, 'var t = AB.game.profile.igloo.placed.filter(function(p){return AB.furniture[p.item].place=="floor"})[0]; t.x = 640; t.y = 850; AB.iglooRoom.clamp(t);')
    d = json.loads(ev(pg, 'JSON.stringify(AB.game.profile.igloo.placed.filter(function(p){return AB.furniture[p.item].place=="floor"})[0])'))
    f = json.loads(ev(pg, 'JSON.stringify(AB.furniture["%s"])' % d['item']))
    check('doorway stays clear', not (d['y'] > 740 and d['x'] + f['w'] / 2 > 545 and d['x'] - f['w'] / 2 < 735), d)
    pg.click('.deco-top .done'); pg.wait_for_timeout(300)
    check('exit always reachable after decorating', ev(pg, '!!AB.world.findPath(AB.world.player.x, AB.world.player.y, 640, 868)'))

    # ---- quest playthrough: Dot's scarf
    go(pg, 'town'); ev(pg, 'AB.villagers.talk(AB.world.npcs.filter(function(n){return n.id=="dot"})[0])'); pg.wait_for_timeout(300)
    pg.click('.dialog .btn.green'); pg.wait_for_timeout(900); ev(pg, 'AB.ui.closeAll()')
    go(pg, 'lake', 'town')
    ev(pg, 'AB.quests.event("tap","scarfTree")'); pg.wait_for_timeout(1200)
    has = ev(pg, 'AB.world.pickups.filter(function(p){return p.type=="scarf"}).length')
    check('scarf drops from the tree', has == 1)
    ev(pg, 'AB.quests.collect(AB.world.pickups.filter(function(p){return p.type=="scarf"})[0])'); pg.wait_for_timeout(300); ev(pg, 'AB.ui.closeAll()')
    check('scarf collected', ev(pg, 'AB.game.profile.quests.scarf.step') == 1)
    c0 = ev(pg, 'AB.game.profile.coins')
    go(pg, 'town', 'lake'); ev(pg, 'AB.villagers.talk(AB.world.npcs.filter(function(n){return n.id=="dot"})[0])'); pg.wait_for_timeout(300)
    check('scarf quest done', ev(pg, 'AB.game.profile.quests.scarf.state') == 'done')
    check('scarf reward coins', ev(pg, 'AB.game.profile.coins') == c0 + 40)
    check('scarf reward item', ev(pg, '!!AB.game.profile.owned.clothes.scarf_dot'))
    ev(pg, 'AB.ui.closeAll()')
    # hints point somewhere real for every quest offer
    ev(pg, 'AB.quests.defs.sculpture.talk(null)'); pg.wait_for_timeout(200); pg.click('.dialog .btn.green'); pg.wait_for_timeout(200); ev(pg, 'AB.ui.closeAll()')
    h = json.loads(ev(pg, 'AB.quests.showHint("sculpture"); AB.ui.closeAll(); JSON.stringify(AB.world.hint)'))
    check('hint has a target', h and h.get('scene') == 'lake' and h.get('x') is not None, h)
    # gems
    ev(pg, 'AB.quests.revealGem("gem_lake_1", 640, 700)')
    go(pg, 'town')
    ev(pg, 'AB.quests.revealGem("gem_bell", 850, 500)'); g = ev(pg, 'AB.world.pickups.filter(function(p){return p.type=="gem"}).length')
    check('gem appears', g == 1)
    c1 = ev(pg, 'AB.game.profile.coins'); ev(pg, 'AB.quests.collect(AB.world.pickups.filter(function(p){return p.type=="gem"})[0])')
    check('gem collected +10', ev(pg, 'AB.game.profile.coins') == c1 + 10 and ev(pg, '!!AB.game.profile.found.gem_bell'))

    # ---- pets
    go(pg, 'lodge'); ev(pg, 'AB.petsUI.openAdopt()'); pg.wait_for_timeout(400)
    pg.click('.kinds .card:nth-child(2)'); pg.wait_for_timeout(200); pg.fill('.panel input', 'Bubbles'); pg.click('.panel .go'); pg.wait_for_timeout(500)
    pg.screenshot(path=OUT + 'f_adopt.png'); ev(pg, 'AB.ui.closeAll()')
    check('pet adopted', ev(pg, 'AB.game.profile.pets.length') == 1 and ev(pg, 'AB.game.profile.pets[0].name') == 'Bubbles')
    check('pet follows', ev(pg, '!!AB.world.pet'))
    go(pg, 'town'); check('pet follows to town', ev(pg, '!!AB.world.pet'))
    pg.click('.tool.t-pet'); pg.wait_for_timeout(300); pg.click('.panel .feed'); pg.click('.panel .love'); pg.click('.panel .play'); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT + 'f_petcare.png')
    check('pet care saved', ev(pg, 'AB.game.profile.pets[0].fed') == 1 and ev(pg, 'AB.game.profile.pets[0].petted') == 1)
    ev(pg, 'AB.ui.closeAll()')
    pg.reload(); pg.wait_for_timeout(1500); pg.click('.who-card:has-text("Kit")'); pg.wait_for_timeout(1500)
    check('pet survives reload', ev(pg, 'AB.game.profile.pets[0].name') == 'Bubbles')
    ev(pg, 'AB.ui.switchPlayer()'); pg.wait_for_timeout(500)
    pg.click('.who-card.add'); pg.wait_for_timeout(300); pg.click('.species button[data-sp=bear]'); pg.fill('.namebox input', 'Bo'); pg.click('.go'); pg.wait_for_timeout(2300); pg.click('.dialog .btn')
    check('pets belong to their owner', ev(pg, 'AB.game.profile.pets.length') == 0 and ev(pg, 'AB.store.get("%s").pets.length' % kit) == 1)
    check('quest progress per child', ev(pg, '!AB.game.profile.quests.scarf'))

    # ---- parent gate guards delete
    pg.click('.tool.t-gear'); pg.wait_for_timeout(300); pg.click('.pa'); pg.wait_for_timeout(300)
    word = pg.inner_text('.gate-num')
    tens = {'twenty': 2, 'thirty': 3, 'forty': 4, 'fifty': 5, 'sixty': 6, 'seventy': 7, 'eighty': 8, 'ninety': 9}
    ones = {'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9}
    a, c = word.split('-'); num = str(tens[a] * 10 + ones[c])
    check('hold button disabled before number', pg.is_disabled('.holdbtn'))
    for ch in num: pg.click('.keypad button:text-is("%s")' % ch)
    hb = pg.query_selector('.holdbtn').bounding_box()
    pg.mouse.move(hb['x'] + 20, hb['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(1800); pg.mouse.up(); pg.wait_for_timeout(300)
    check('grown-up area opens', pg.query_selector('.plist') is not None)
    pg.screenshot(path=OUT + 'f_parent.png')
    n0 = ev(pg, 'AB.store.list().length')
    pg.click('.prow:has-text("Kit") .dl'); pg.wait_for_timeout(200); pg.click('.btn.yes'); pg.wait_for_timeout(500)
    check('delete via gate', ev(pg, 'AB.store.list().length') == n0 - 1)
    pg.click('.undo-row .btn'); pg.wait_for_timeout(500)
    check('undo delete', ev(pg, 'AB.store.list().length') == n0 and ev(pg, 'AB.store.get("%s").pets.length' % kit) == 1)

    print('PASS', len(ok)); print('FAIL', len(bad)); [print('  XX', x) for x in bad]
    print('errors:', [e for e in errs if '404' not in e][:8])
    b.close()
