# Core verification: profiles, purchases, persistence, visiting, export/import.
import sys, json; sys.path.insert(0,'test')
from playwright.sync_api import sync_playwright
OUT='/tmp/claude-0/'
BASE='http://localhost:8123/index.html'
ok=[]; bad=[]
def check(name, cond, info=''):
    (ok if cond else bad).append(name + ('' if cond else '  <-- ' + str(info)))
def ev(pg, js): return pg.evaluate(js)
def create(pg, species, name):
    pg.click('.who-card.add'); pg.wait_for_timeout(400)
    pg.click('.species button[data-sp=%s]' % species); pg.fill('.namebox input', name); pg.click('.go'); pg.wait_for_timeout(2300)
    if pg.query_selector('.dialog .btn'): pg.click('.dialog .btn'); pg.wait_for_timeout(200)
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    ctx = b.new_context(viewport={'width':1180,'height':820}, has_touch=True)
    pg = ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and '404' not in m.text else None)
    pg.goto(BASE); pg.wait_for_timeout(1200)
    create(pg, 'fox', 'Mia')
    mia = ev(pg, 'AB.game.profile.id')
    ev(pg, 'AB.game.addCoins(400, "test")')
    # buy a sofa through the catalog UI, double-tapping Buy
    ev(pg, 'AB.ui.openCatalog("furniture")'); pg.wait_for_timeout(400)
    before = ev(pg, 'JSON.stringify({c:AB.game.profile.coins, n:AB.game.profile.owned.furniture.sofa_red||0})'); before=json.loads(before)
    pg.click('.card:has-text("Comfy Sofa")'); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+'c_confirm.png')
    pg.dblclick('.btn.yes'); pg.wait_for_timeout(500)
    after = json.loads(ev(pg, 'JSON.stringify({c:AB.game.profile.coins, n:AB.game.profile.owned.furniture.sofa_red||0})'))
    check('buy deducts once', after['c'] == before['c'] - 90, (before, after))
    check('buy adds once', after['n'] == before['n'] + 1, (before, after))
    # buying the same clothes twice is impossible; buy a hat
    check('double tap opened nothing else', pg.query_selector('.btn.yes') is None)
    ev(pg, 'AB.ui.closeAll()')
    r = ev(pg, 'JSON.stringify([AB.game.buy("clothes","top_hat"), AB.game.buy("clothes","top_hat"), AB.game.profile.coins])')
    r = json.loads(r); check('clothes bought once only', r[0] is True and r[1] is False and r[2] == after['c'] - 60, r)
    # not enough coins -> refused
    r = ev(pg, 'var c=AB.game.profile.coins; AB.game.profile.coins=5; var x=AB.game.buy("furniture","piano"); var y=AB.game.profile.coins; AB.game.profile.coins=c; JSON.stringify([x,y])')
    check('cannot overspend', json.loads(r) == [False, 5], r)
    # decorate: place the sofa
    pg.click('.tool.t-home'); pg.wait_for_timeout(1400)
    pg.click('text=Decorate'); pg.wait_for_timeout(400)
    pg.click('.deco-items .card:has-text("Comfy Sofa")'); pg.wait_for_timeout(300)
    s = json.loads(ev(pg, 'JSON.stringify(AB.game.profile.igloo.placed.filter(function(p){return p.item=="sofa_red"})[0])'))
    sc = ev(pg, 'JSON.stringify(AB.toScreen(%f,%f))' % (s['x'], s['y']-30)); sc=json.loads(sc)
    pg.mouse.move(sc['x'], sc['y']); pg.mouse.down()
    for i in range(8): pg.mouse.move(sc['x']-i*30, sc['y']-i*8); pg.wait_for_timeout(16)
    pg.mouse.up(); pg.wait_for_timeout(200)
    pg.click('.sel-tools .tool[aria-label=Flip]'); pg.wait_for_timeout(100)
    pg.click('.deco-top .done'); pg.wait_for_timeout(600)
    sofa = json.loads(ev(pg, 'JSON.stringify(AB.game.profile.igloo.placed.filter(function(p){return p.item=="sofa_red"})[0])'))
    check('sofa moved and flipped', sofa['flip'] is True and abs(sofa['x'] - s['x']) > 50, (s, sofa))
    mia_coins = ev(pg, 'AB.game.profile.coins')
    pg.screenshot(path=OUT+'c_igloo_sofa.png')
    # reload -> persistence
    pg.reload(); pg.wait_for_timeout(1500)
    pg.click('.who-card:has-text("Mia")'); pg.wait_for_timeout(1600)
    sofa2 = json.loads(ev(pg, 'JSON.stringify(AB.game.profile.igloo.placed.filter(function(p){return p.item=="sofa_red"})[0])'))
    check('furniture survives reload', sofa2 == sofa, (sofa, sofa2))
    check('coins survive reload', ev(pg, 'AB.game.profile.coins') == mia_coins)
    check('resumes in igloo', ev(pg, 'AB.world.sceneId') == 'igloo', ev(pg, 'AB.world.sceneId'))
    # second child
    ev(pg, 'AB.ui.switchPlayer()'); pg.wait_for_timeout(800)
    create(pg, 'penguin', 'Sam')
    sam = ev(pg, 'AB.game.profile.id')
    check('second profile separate coins', ev(pg, 'AB.game.profile.coins') == 50)
    check('second profile no sofa', ev(pg, 'AB.game.profile.owned.furniture.sofa_red||0') == 0)
    check('mia untouched', ev(pg, 'AB.store.get("%s").coins' % mia) == mia_coins)
    # visit Mia
    ev(pg, 'AB.visit("%s")' % mia); pg.wait_for_timeout(1500)
    check('visiting keeps Sam active', ev(pg, 'AB.game.profile.id') == sam)
    check('visit shows Mia igloo', ev(pg, 'AB.iglooRoom.owner().id') == mia)
    check('no decorate button when visiting', pg.query_selector('text=Decorate') is None)
    ev(pg, 'AB.decorate.enter()'); check('decorate refused when visiting', ev(pg, 'AB.mode') == 'world')
    check('host present', ev(pg, 'AB.world.npcs.some(function(n){return n.isHost})'))
    pg.screenshot(path=OUT+'c_visit.png')
    # tap every furniture prop as a visitor
    ev(pg, 'AB.scenes.igloo.props.forEach(function(p){ if(p.tap) p.tap(p) })'); pg.wait_for_timeout(300)
    real = json.loads(ev(pg, 'JSON.stringify(AB.store.get("%s").igloo.placed)' % mia))
    check('visitor cannot change sibling igloo', any(x['item']=='sofa_red' and x['x']==sofa['x'] and x['flip'] for x in real) and len(real) == 7, real)
    check('visitor coins unchanged', ev(pg, 'AB.store.get("%s").coins' % mia) == mia_coins)
    # export / delete / import
    js = ev(pg, 'AB.store.exportAll()')
    ev(pg, 'AB.store.remove("%s")' % mia); pg.wait_for_timeout(300)
    check('deleted', ev(pg, 'AB.store.list().length') == 1)
    ev(pg, 'var P=AB.store.parseImport(%s); window.__pi=P; AB.store.applyImport(P)' % json.dumps(js)); pg.wait_for_timeout(500)
    check('import restores all', ev(pg, 'AB.store.list().map(function(p){return p.name}).sort().join()') == 'Mia,Sam')
    check('import restores mia igloo', json.loads(ev(pg, 'JSON.stringify(AB.store.get("%s").igloo.placed.filter(function(p){return p.item=="sofa_red"})[0])' % mia)) == sofa)
    pg.reload(); pg.wait_for_timeout(1500)
    check('import survives reload', ev(pg, 'AB.store.list().length') == 2)
    check('IndexedDB in use', ev(pg, 'AB.store.backend') == 'indexeddb')
    print('PASS', len(ok)); [print('  ok', x) for x in ok]
    print('FAIL', len(bad)); [print('  XX', x) for x in bad]
    print('errors:', errs[:5])
    b.close()
