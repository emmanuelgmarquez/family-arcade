'use strict';
// Boot: canvas scaling, fixed-timestep loop, scene manager with fades.
(function (G) {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  function resize() {
    const vw = innerWidth, vh = innerHeight;
    G.W = G.clamp(Math.round((G.H * (vw / vh)) / 2) * 2, 320, 480);
    canvas.width = G.W;
    canvas.height = G.H;
    ctx.imageSmoothingEnabled = false;
    const s = Math.min(vw / G.W, vh / G.H);
    canvas.style.width = Math.floor(G.W * s) + 'px';
    canvas.style.height = Math.floor(G.H * s) + 'px';
    if (G.Touch.canvas) G.Touch.resize();
  }

  G.Game = {
    scene: null, next: null, fade: 0, fadeDir: 0,
    go(factory) {
      if (this.fadeDir === 1) return;
      this.next = factory;
      this.fadeDir = 1;
    },
    set(scene) {
      if (this.scene && this.scene.exit) this.scene.exit();
      this.scene = scene;
      scene.touchControls = scene instanceof G.PlayScene;
      if (scene.enter) scene.enter();
    },
    step() {
      G.Input.poll();
      if (this.fadeDir === 1) {
        this.fade += 1 / 16;
        if (this.fade >= 1) {
          this.fade = 1;
          this.set(this.next());
          this.next = null;
          this.fadeDir = -1;
        }
      } else if (this.fadeDir === -1) {
        this.fade -= 1 / 16;
        if (this.fade <= 0) { this.fade = 0; this.fadeDir = 0; }
      }
      if (this.scene && this.fadeDir !== 1) this.scene.update();
      G.Input.endStep();
      G.frame++;
    },
    render() {
      ctx.imageSmoothingEnabled = false;
      if (this.scene) this.scene.render(ctx);
      if (this.fade > 0) {
        ctx.fillStyle = `rgba(0,0,0,${this.fade})`;
        ctx.fillRect(0, 0, G.W, G.H);
      }
    },
  };

  let last = performance.now(), acc = 0;
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    acc += dt;
    let n = 0;
    while (acc >= G.DT - 0.0005 && n < 5) {
      G.Game.step();
      acc -= G.DT;
      n++;
    }
    if (acc < 0) acc = 0;
    try { G.Game.render(); } catch (e) { console.error(e); }
    G.Touch.render();
    requestAnimationFrame(frame);
  }

  function boot() {
    G.Input.init(canvas);
    G.Touch.init();
    resize();
    addEventListener('resize', resize);
    addEventListener('orientationchange', () => setTimeout(resize, 200));
    G.Save.load();
    // dev shortcut: ?level=w1a1&char=rosie jumps straight into a level
    const q = new URLSearchParams(location.search);
    if (q.get('level') && G.LEVELS[q.get('level')]) {
      if (!G.Save.slot(0)) G.Save.newSlot(0, q.get('char') || 'bolt');
      G.Save.begin(0);
      G.Session.charId = q.get('char') || G.Session.charId;
      G.Game.set(new G.PlayScene({ levelId: q.get('level'), charId: G.Session.charId }));
    } else {
      G.Game.set(new G.TitleScene());
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !G.noAutoPause && G.Game.scene instanceof G.PlayScene && !G.Game.scene.finish) G.Game.scene.paused = true;
    });
    requestAnimationFrame(frame);
    // Inside Family Arcade: track which corner its return button sits in so our HUD and
    // touch buttons move out of its way. The arcade also handles offline play.
    G.faCorner = null;
    try {
      if (window.FamilyArcade || window.__FA_RUNTIME__) {
        G.faCorner = 'tl';
        const pd = window.parent !== window && window.parent.document, btn = pd && pd.querySelector('.home-btn');
        if (btn) {
          const sync = () => { G.faCorner = btn.dataset.corner || 'tl'; G.Touch.layout(); };
          sync();
          new MutationObserver(sync).observe(btn, { attributes: true, attributeFilter: ['data-corner'] });
        }
      }
    } catch (e) { /* cross-origin parent: keep the default corner */ }
    if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !navigator.serviceWorker.controller && !G.faCorner) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  G.boot = boot;
})(window.G);
