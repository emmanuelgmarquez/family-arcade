import sys, json
from playwright.sync_api import sync_playwright
BASE='file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/minigame-harness.html?game=sled'
OUT='/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-sled/'
species = sys.argv[1] if len(sys.argv)>1 else 'penguin'
def step(pg, n): pg.evaluate('n=>{for(let i=0;i<n;i++) __inst.update(0.05)}', n)
def put(pg, typ, kind, dz, x=None):
    pg.evaluate('''([typ,kind,dz,x])=>{const d=__inst._debug(); const o={type:typ,kind:kind,x:x==null?d.px:x,z:d.pz+dz,done:false,hk:kind||typ,wob:0,stars:[]}; d.objs.push(o);}''', [typ, kind, dz, x])
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1180,'height':820}, has_touch=True)
    errs=[]
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    pg.goto(BASE+'&species='+species); pg.wait_for_timeout(800)
    pg.evaluate('window.__paused=true')
    step(pg, 80)
    # clear gameplay objs near player
    pg.evaluate("(()=>{const d=__inst._debug(); for(const o of d.objs){ if(['flake','star','obs','ramp','ice','bump'].includes(o.type) && o.z < d.pz+3000) o.done=true; }})()")
    put(pg,'obs','snowman',700)
    step(pg, 12); pg.wait_for_timeout(80); pg.screenshot(path=OUT+species+'_tumble1.png')
    step(pg, 8); pg.wait_for_timeout(80); pg.screenshot(path=OUT+species+'_tumble2.png')
    step(pg, 10); pg.wait_for_timeout(80); pg.screenshot(path=OUT+species+'_tumble3.png')
    step(pg, 20)
    put(pg,'ice',None,500)
    step(pg, 13); pg.wait_for_timeout(80); pg.screenshot(path=OUT+species+'_spin.png')
    step(pg, 30)
    pg.evaluate("(()=>{const d=__inst._debug(); for(const o of d.objs){ if(['flake','star','obs','ramp','ice','bump'].includes(o.type) && o.z < d.pz+3000) o.done=true; }})()")
    pg.evaluate('''(()=>{const d=__inst._debug(); const r={type:'ramp',x:d.px,z:d.pz+900,done:false,hk:'ramp',stars:[]}; for(let k=0;k<3;k++){const s={type:'star',x:d.px,z:d.pz+3000+k*200,h:[240,272,240][k],ph:0,done:false,hk:'star'}; d.objs.push(s); r.stars.push(s);} d.objs.push(r);})()''')
    step(pg, 8); pg.wait_for_timeout(80); pg.screenshot(path=OUT+species+'_ramp.png')
    for i in range(6):
        step(pg, 3)
    pg.wait_for_timeout(80); pg.screenshot(path=OUT+species+'_jump.png')
    step(pg, 30)
    print(pg.evaluate('JSON.stringify((d=>({phase:d.phase,el:d.elapsed,fl:d.flakes,st:d.stars,j:d.jumps,c:d.crashes,sp:d.speed}))(__inst._debug()))'))
    # run to finish line
    for i in range(400):
        step(pg, 5)
        if pg.evaluate('__inst && __inst._debug().phase')=='finish': break
    step(pg, 4); pg.wait_for_timeout(80); pg.screenshot(path=OUT+species+'_finish.png')
    # just before crossing
    print(pg.evaluate('JSON.stringify(window.__result)'))
    step(pg, 80)
    print('result', pg.evaluate('JSON.stringify(window.__result)'))
    print('\n'.join(errs) or 'no errors')
    b.close()
