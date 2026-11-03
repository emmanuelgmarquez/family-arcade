import sys; sys.path.insert(0,'test')
from play import run, OUT
def steps(pg):
    pg.click('.who-card.add'); pg.wait_for_timeout(400)
    pg.click('.species button[data-sp=hare]'); pg.fill('.namebox input', 'Leo'); pg.click('.go'); pg.wait_for_timeout(2200)
    pg.click('.dialog .btn'); pg.wait_for_timeout(200)
    pg.click('.tool.t-home'); pg.wait_for_timeout(1500)
    pg.screenshot(path=OUT+'g_igloo.png')
    pg.click('text=Decorate'); pg.wait_for_timeout(600)
    pg.screenshot(path=OUT+'g_deco.png')
    # drag the bed (first placed item) somewhere
    r = pg.evaluate('(function(){var pl=AB.game.profile.igloo.placed.filter(function(p){return p.item==="bed_cozy"})[0];var s=AB.toScreen(pl.x,pl.y-40);return [s.x,s.y,pl.x,pl.y]})()')
    pg.mouse.move(r[0], r[1]); pg.mouse.down(); 
    for i in range(10): pg.mouse.move(r[0]+i*40, r[1]+i*30); pg.wait_for_timeout(20)
    pg.mouse.move(r[0]+600, r[1]+600); pg.mouse.up(); pg.wait_for_timeout(300)
    print('bed after drag', pg.evaluate('JSON.stringify(AB.game.profile.igloo.placed.filter(function(p){return p.item==="bed_cozy"})[0])'))
    pg.screenshot(path=OUT+'g_deco2.png')
    pg.click('.deco-top .done'); pg.wait_for_timeout(400)
    pg.screenshot(path=OUT+'g_igloo2.png')
run(steps)
