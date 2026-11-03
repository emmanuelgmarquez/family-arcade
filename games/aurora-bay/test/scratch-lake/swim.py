import sys
from playwright.sync_api import sync_playwright
scene='lake'; root='/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay'
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1280,'height':900})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.goto('file://'+root+'/test/scene-harness.html?scene=lake'); pg.wait_for_function('document.title=="ready"')
    # advance time until a swimmer appears, then snapshot
    for i, extra in enumerate([3, 4.5]):
        pg.evaluate("""(extra) => {
          const sc = AB.scenes.lake, off = document.createElement('canvas'); off.width=1280; off.height=900; const o = off.getContext('2d');
          let t = 2; for (; t < 200; t += 0.25) { sc.animate(o, t); }
          // find active swimmer: step until one starts, then add extra seconds
          window._t = window._t || 200;
          let tt = window._t, started = null;
          for (; tt < 400; tt += 0.25) { o.clearRect(0,0,1280,900); sc.animate(o, tt); const d=o.getImageData(0,0,1280,900).data; }
          return tt;
        }""", extra) if False else None
    # simpler: brute-force sample frames and keep the one with most dark pixels inside the ice
    res = pg.evaluate("""() => {
      const sc = AB.scenes.lake, c = document.getElementById('c'), ctx = c.getContext('2d');
      const off = document.createElement('canvas'); off.width=1280; off.height=900; const o = off.getContext('2d');
      const hits = [];
      for (let t = 2; t < 140; t += 0.5) {
        o.clearRect(0,0,1280,900); sc.animate(o, t);
        const d = o.getImageData(100, 420, 1060, 300).data; let n=0; for (let i=3;i<d.length;i+=16) if (d[i]>60 && d[i-1]>90 && d[i-3]<60) n++;
        if (n > 40) hits.push(t);
      }
      return hits;
    }""")
    print('swim frames', res[:5], '...', len(res))
    # draw a frame with a swimmer, and a frame with peek fish
    if res:
        t = res[len(res)//4]
        pg.evaluate("""(t) => {
          const sc = AB.scenes.lake, ctx = document.getElementById('c').getContext('2d');
          sc.paint(ctx); AB.art.aurora(ctx, 1280, 30, 150, t, 0.3); sc.animate(ctx, t);
          sc.props.slice().sort((a,b)=>a.y-b.y).forEach(p => p.draw(ctx, t, p));
        }""", t)
        pg.screenshot(path=root+'/test/scratch-lake/swim.png')
    pg.evaluate("""() => {
      const sc = AB.scenes.lake, ctx = document.getElementById('c').getContext('2d');
      AB.world.t = 50; const pk = sc.props.find(p => p.x === 880); pk.tap(pk); AB.world.t = 50.75; sc.update(0.016);
      sc.paint(ctx); sc.animate(ctx, 50.75); sc.props.slice().sort((a,b)=>a.y-b.y).forEach(p => p.draw(ctx, 50.75, p));
    }""")
    pg.screenshot(path=root+'/test/scratch-lake/peek.png', clip={'x':640,'y':300,'width':500,'height':400})
    print(errs or 'no errors')
    b.close()
