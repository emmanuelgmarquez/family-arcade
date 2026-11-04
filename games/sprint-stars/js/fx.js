'use strict';
// Particle effects: dust, sparkles, explosions, debris, score popups.
(function (G) {
  class FX {
    constructor() { this.list = []; }
    spawn(type, x, y, vx, vy, extra) {
      if (this.list.length > 300) this.list.shift();
      const p = { type, x, y, vx: vx || 0, vy: vy || 0, t: 0, life: 20, extra };
      switch (type) {
        case 'dust': p.life = 18; break;
        case 'sparkle': p.life = 16; break;
        case 'explode': p.life = 24; break;
        case 'debris': p.life = 70; p.col = Math.random() < 0.5 ? '#8e4518' : '#c06a26'; break;
        case 'score': p.life = 40; p.vy = -1.2; break;
        case 'puff': p.life = 12; break;
        case 'star': p.life = 30; break;
        case 'snow': p.life = 50; break;
        case 'confetti': p.life = 120; p.col = ['#ff5a5a', '#ffd23a', '#5ad0ff', '#7ee35a', '#ff8ad8'][Math.floor(Math.random() * 5)]; break;
      }
      this.list.push(p);
      return p;
    }
    burst(x, y, type, n) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * G.TAU + Math.random() * 0.3;
        const s = type === 'sparkle' ? 1.5 + Math.random() : 1 + Math.random();
        this.spawn(type, x, y, Math.cos(a) * s, Math.sin(a) * s - (type === 'dust' ? 0.5 : 0));
      }
    }
    update() {
      for (const p of this.list) {
        p.t++;
        p.x += p.vx; p.y += p.vy;
        if (p.type === 'debris' || p.type === 'confetti') p.vy += p.type === 'confetti' ? 0.05 : 0.2;
        if (p.type === 'confetti') p.vx *= 0.98;
        if (p.type === 'dust') { p.vx *= 0.9; p.vy *= 0.9; }
        if (p.type === 'score') p.vy *= 0.95;
      }
      this.list = this.list.filter((p) => p.t < p.life);
    }
    render(ctx, cx, cy) {
      const A = G.ObjArt;
      for (const p of this.list) {
        const x = Math.round(p.x - cx), y = Math.round(p.y - cy);
        switch (p.type) {
          case 'dust': {
            const r = 2 + (p.t / p.life) * 4;
            ctx.fillStyle = p.t < 8 ? '#ffffff' : '#d8d8e8';
            ctx.beginPath(); ctx.arc(x, y, r, 0, G.TAU); ctx.fill();
            break;
          }
          case 'sparkle': {
            const f = A.sparkle();
            ctx.drawImage(f[Math.min(3, Math.floor(p.t / 4))], x - 8, y - 8);
            break;
          }
          case 'explode': {
            const f = A.explosion();
            ctx.drawImage(f[Math.min(5, Math.floor(p.t / 4))], x - 16, y - 16);
            break;
          }
          case 'puff': {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(x, y, 2 + p.t / 3, 0, G.TAU); ctx.fill();
            break;
          }
          case 'debris':
            ctx.fillStyle = p.col; ctx.fillRect(x - 3, y - 3, 6, 6);
            ctx.fillStyle = '#3c1806'; ctx.fillRect(x - 3, y + 2, 6, 1);
            break;
          case 'confetti':
            ctx.fillStyle = p.col; ctx.fillRect(x, y, 3, (p.t >> 2) % 2 ? 2 : 3);
            break;
          case 'snow':
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 2, 2);
            break;
          case 'score':
            G.Font.draw(ctx, String(p.extra), x, y - 4, { align: 'center', color: '#ffffff', color2: '#ffe24a' });
            break;
          case 'star': {
            G.Draw.star(ctx, x, y, 3, 1.2, 4, p.t * 0.2, '#ffffff');
            break;
          }
        }
      }
    }
  }
  G.FX = FX;
})(window.G);
