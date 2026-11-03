from playwright.sync_api import sync_playwright
root='/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay'
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1280,'height':900})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://'+root+'/test/scene-harness.html?scene=lake'); pg.wait_for_function('document.title=="ready"')
    for n in range(3):
        ts = pg.evaluate("""(n) => {
          const sc = AB.scenes.lake, ctx = document.getElementById('c').getContext('2d');
          const off = document.createElement('canvas'); off.width=1280; off.height=900; const o = off.getContext('2d');
          window._t = window._t || 2; let starts = 0, prev = false, tStart = null;
          for (let t = window._t; t < window._t + 200; t += 0.2) {
            o.clearRect(0,0,1280,900); sc.animate(o, t);
            const d = o.getImageData(0, 380, 1280, 400).data; let k=0; for (let i=0;i<d.length;i+=64) if (d[i]<40 && d[i+2]>80 && d[i+2]<130 && d[i+3]>40) k++;
            const on = k > 3;
            if (on && !prev) { tStart = t; }
            if (on && tStart !== null && t - tStart > 3.5) {
              sc.paint(ctx); AB.art.aurora(ctx, 1280, 30, 150, t, 0.3); sc.animate(ctx, t);
              sc.props.slice().sort((a,b)=>a.y-b.y).forEach(p => p.draw(ctx, t, p));
              window._t = t + 12; return [tStart, t];
            }
            prev = on;
          }
          return null;
        }""", n)
        print('swimmer', ts)
        pg.screenshot(path=root+'/test/scratch-lake/swim%d.png' % n)
    gaps = pg.evaluate("""() => {
      const sc = AB.scenes.lake; const off = document.createElement('canvas'); off.width=1280; off.height=900; const o = off.getContext('2d');
      let prev=false, starts=[];
      for (let t = 400; t < 700; t += 0.25) { o.clearRect(0,0,1280,900); sc.animate(o, t);
        const d = o.getImageData(0, 380, 1280, 400).data; let k=0; for (let i=0;i<d.length;i+=64) if (d[i]<40 && d[i+2]>80 && d[i+2]<130 && d[i+3]>40) k++;
        const on=k>3; if (on && !prev) starts.push(t); prev=on; }
      return starts;
    }""")
    print('starts', gaps)
    print(errs or 'no errors')
    b.close()
