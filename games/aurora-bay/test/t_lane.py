import sys; sys.path.insert(0,'test')
from play import run, OUT
def steps(pg):
    for nm, sp in [('Mia','fox'),('Sam','penguin'),('Lily','bear')]:
        pg.click('.who-card.add'); pg.wait_for_timeout(300); pg.click('.species button[data-sp=%s]'%sp); pg.fill('.namebox input',nm); pg.click('.go'); pg.wait_for_timeout(2200); pg.click('.dialog .btn')
        if nm != 'Lily': pg.evaluate('AB.ui.switchPlayer()'); pg.wait_for_timeout(500)
    pg.screenshot(path=OUT+'l_town.png')
    pg.evaluate('AB.go("iglooLane","town")'); pg.wait_for_timeout(1200)
    pg.screenshot(path=OUT+'l_lane.png')
    pg.evaluate('AB.ui.switchPlayer()'); pg.wait_for_timeout(600); pg.screenshot(path=OUT+'l_who.png')
run(steps)
