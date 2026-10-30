// Multi-file self-test: ES module import, image (requested with different letter case),
// JSON via fetch, <audio> playback (byte-range requests), requestAnimationFrame + performance.now.
import { clampDt } from './lib.js';
const c = document.getElementById('c'), ctx = c.getContext('2d'), hud = document.getElementById('hud');
const img = new Image(); img.src = 'img/sprite.png';
let level = null, x = 0, dir = 1, last = performance.now(), jumps = 0, maxGap = 0;
fetch('data/level.json').then(r => r.json()).then(j => { level = j; });
function resize() { c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; }
addEventListener('resize', resize); resize();
addEventListener('pointerdown', () => { const a = document.getElementById('beep'); a.currentTime = 0; a.play().catch(()=>{}); });
function frame(t) {
  const gap = t - last; maxGap = Math.max(maxGap, gap); if (gap > 500) jumps++;
  const dt = clampDt(gap / 1000); last = t;
  x += dir * 300 * dt * devicePixelRatio; if (x > c.width - 128 || x < 0) dir *= -1;
  ctx.fillStyle = '#1b1036'; ctx.fillRect(0, 0, c.width, c.height);
  if (img.complete && img.naturalWidth) ctx.drawImage(img, x, c.height / 2 - 64, 128, 128);
  hud.textContent = `module ✓  image ${img.naturalWidth ? '✓' : '…'}  json ${level ? '✓ ' + level.name : '…'}  time jumps: ${jumps}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__selftest = () => ({ img: img.naturalWidth > 0, level: !!level, jumps, maxGap });
