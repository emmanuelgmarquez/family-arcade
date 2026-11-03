import sys; sys.path.insert(0,'test')
from play import run, OUT
def steps(pg):
    pg.click('.who-card.add'); pg.wait_for_timeout(300); pg.click('.species button[data-sp=owl]'); pg.fill('.namebox input','Zoe'); pg.click('.go'); pg.wait_for_timeout(2300); pg.click('.dialog .btn')
    pg.evaluate('AB.game.profile.discovered.lake=true'); 
    pg.click('.tool.t-map'); pg.wait_for_timeout(600); pg.screenshot(path=OUT+'p_map.png'); pg.evaluate('AB.ui.closeAll()')
    pg.click('.tool.t-bag'); pg.wait_for_timeout(500); pg.screenshot(path=OUT+'p_bag.png')
    pg.click('.tab[data-t=treasure]'); pg.wait_for_timeout(300); pg.screenshot(path=OUT+'p_treasure.png'); pg.evaluate('AB.ui.closeAll()')
    # talk to Dot to start the scarf quest
    pg.evaluate('AB.villagers.talk(AB.world.npcs.filter(function(n){return n.id=="dot"})[0])'); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'p_dot.png')
    pg.click('.dialog .btn.green'); pg.wait_for_timeout(800); pg.evaluate('AB.ui.closeAll()')
    pg.click('.tool.t-quest'); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'p_quests.png'); pg.evaluate('AB.ui.closeAll()')
    pg.click('.tool.t-gear'); pg.wait_for_timeout(400); pg.screenshot(path=OUT+'p_settings.png')
    pg.click('.pa'); pg.wait_for_timeout(300); pg.screenshot(path=OUT+'p_gate.png')
run(steps)
