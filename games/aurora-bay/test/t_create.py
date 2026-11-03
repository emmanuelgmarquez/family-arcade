import sys; sys.path.insert(0,'test')
from play import run, OUT
def steps(pg):
    pg.click('.who-card.add'); pg.wait_for_timeout(500)
    pg.click('.species button[data-sp=fox]'); pg.wait_for_timeout(200)
    pg.click('.swatches button:nth-child(2)'); pg.click('.starters button:nth-child(2)')
    pg.fill('.namebox input', 'Mia'); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT+'g_creator.png')
    pg.click('.go'); pg.wait_for_timeout(2500)
    pg.screenshot(path=OUT+'g_town1.png')
    pg.click('.dialog .btn'); pg.wait_for_timeout(300)
    # walk somewhere
    pg.mouse.click(300, 600); pg.wait_for_timeout(1500)
    pg.screenshot(path=OUT+'g_town2.png')
    print(pg.evaluate('JSON.stringify({mode:AB.mode, scene:AB.world.sceneId, p:[AB.world.player.x|0,AB.world.player.y|0], coins:AB.game.profile.coins, placed:AB.game.profile.igloo.placed.length})'))
run(steps)
