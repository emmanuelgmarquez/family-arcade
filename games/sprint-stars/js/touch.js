'use strict';
// On-screen controls for iPad / phones: floating d-pad on the left,
// big JUMP and SPIN buttons on the right, pause at the top.
(function (G) {
  const T = (G.Touch = {
    canvas: null, ctx: null, ptrs: new Map(), visible: false, dpr: 1,
    pad: { x: 0, y: 0, active: false, dx: 0, dy: 0 },
    init() {
      const c = (this.canvas = document.getElementById('touch'));
      this.ctx = c.getContext('2d');
      const on = (e) => this.down(e), mv = (e) => this.move(e), up = (e) => this.up(e);
      window.addEventListener('pointerdown', on, { passive: false });
      window.addEventListener('pointermove', mv, { passive: false });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      // stop iOS gestures / double-tap zoom from getting in the way
      document.addEventListener('touchstart', (e) => { if (e.target.tagName === 'CANVAS') e.preventDefault(); }, { passive: false });
      document.addEventListener('gesturestart', (e) => e.preventDefault());
      this.resize();
    },
    resize() {
      const dpr = (this.dpr = Math.min(2, window.devicePixelRatio || 1));
      this.canvas.width = innerWidth * dpr;
      this.canvas.height = innerHeight * dpr;
      this.canvas.style.width = innerWidth + 'px';
      this.canvas.style.height = innerHeight + 'px';
      const s = Math.min(innerWidth, innerHeight);
      this.R = G.clamp(s * 0.16, 52, 96); // d-pad radius (css px)
      this.B = G.clamp(s * 0.12, 40, 72); // jump button radius
      this.layout();
    },
    layout() {
      const W = innerWidth, H = innerHeight, R = this.R, B = this.B;
      this.home = { x: 24 + R * 1.15, y: H - 24 - R * 1.15 };
      this.jump = { x: W - 24 - B * 1.2, y: H - 24 - B * 1.25, r: B };
      this.dash = { x: W - 24 - B * 3.3, y: H - 24 - B * 0.85, r: B * 0.72 };
      this.pause = { x: W / 2, y: 26, r: 20 };
      // keep clear of Family Arcade's return button
      const lift = 64;
      if (G.faCorner === 'bl') this.home.y -= lift;
      if (G.faCorner === 'br') { this.jump.y -= lift; this.dash.y -= lift; }
    },
    inPlay() { return G.Game.scene && G.Game.scene.touchControls && !G.Game.scene.paused && !(G.Game.scene.finish && G.Game.scene.finish.stage >= 2); },
    down(e) {
      if (e.pointerType === 'mouse') return;
      if (!G.Input.usingTouch) { G.Input.usingTouch = true; }
      this.visible = true;
      G.Audio.unlock();
      const x = e.clientX, y = e.clientY;
      if (!this.inPlay()) return; // menus use canvas taps
      let ctl = null;
      const d = (o) => Math.hypot(x - o.x, y - o.y);
      if (d(this.pause) < this.pause.r * 1.6) { ctl = 'pause'; G.Input.setTouch('pause', true); }
      else if (d(this.dash) < this.dash.r * 1.25) ctl = 'dash';
      else if (x > innerWidth * 0.5) ctl = 'jump';
      else if (x < innerWidth * 0.5) {
        ctl = 'pad';
        this.pad.active = true;
        // floating pad: centre where the thumb lands (near home position)
        this.pad.x = G.clamp(x, this.R * 0.8, innerWidth * 0.45);
        this.pad.y = G.clamp(y, innerHeight * 0.35, innerHeight - this.R * 0.8);
        this.pad.id = e.pointerId;
        this.padMove(x, y);
      }
      if (ctl === 'jump' || ctl === 'dash') G.Input.setTouch(ctl, true);
      this.ptrs.set(e.pointerId, ctl);
      e.preventDefault();
    },
    move(e) {
      const ctl = this.ptrs.get(e.pointerId);
      if (ctl === 'pad') this.padMove(e.clientX, e.clientY);
    },
    up(e) {
      const ctl = this.ptrs.get(e.pointerId);
      this.ptrs.delete(e.pointerId);
      if (!ctl) return;
      if (ctl === 'pad') {
        this.pad.active = false; this.pad.dx = 0; this.pad.dy = 0;
        for (const a of ['left', 'right', 'up', 'down']) G.Input.setTouch(a, false);
      } else G.Input.setTouch(ctl, false);
    },
    padMove(x, y) {
      const P = this.pad, R = this.R;
      let dx = x - P.x, dy = y - P.y;
      const l = Math.hypot(dx, dy);
      // drag the pad centre along if the thumb wanders far
      if (l > R * 1.3) { P.x += (dx / l) * (l - R * 1.3); P.y += (dy / l) * (l - R * 1.3); dx = x - P.x; dy = y - P.y; }
      P.dx = dx; P.dy = dy;
      const dead = R * 0.28;
      G.Input.setTouch('left', dx < -dead && Math.abs(dx) > Math.abs(dy) * 0.5);
      G.Input.setTouch('right', dx > dead && Math.abs(dx) > Math.abs(dy) * 0.5);
      G.Input.setTouch('down', dy > R * 0.45 && dy > Math.abs(dx) * 0.6);
      G.Input.setTouch('up', dy < -R * 0.5 && -dy > Math.abs(dx) * 0.8);
    },
    render() {
      const c = this.ctx, dpr = this.dpr;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (!this.visible || !this.inPlay()) return;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const I = G.Input.touch;
      // d-pad
      const P = this.pad.active ? this.pad : this.home;
      c.globalAlpha = 0.28;
      c.fillStyle = '#000'; c.beginPath(); c.arc(P.x, P.y, this.R, 0, G.TAU); c.fill();
      c.globalAlpha = 0.55; c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
      const arrow = (ang, on) => {
        c.save(); c.translate(P.x, P.y); c.rotate(ang);
        c.globalAlpha = on ? 0.95 : 0.5; c.fillStyle = on ? '#ffd23a' : '#fff';
        c.beginPath(); c.moveTo(this.R * 0.82, 0); c.lineTo(this.R * 0.55, -this.R * 0.2); c.lineTo(this.R * 0.55, this.R * 0.2); c.fill();
        c.restore();
      };
      arrow(0, I.right); arrow(Math.PI, I.left); arrow(Math.PI / 2, I.down); arrow(-Math.PI / 2, I.up);
      const kx = this.pad.active ? G.clamp(this.pad.dx, -this.R, this.R) : 0, ky = this.pad.active ? G.clamp(this.pad.dy, -this.R, this.R) : 0;
      c.globalAlpha = 0.6; c.fillStyle = '#fff';
      c.beginPath(); c.arc(P.x + kx * 0.5, P.y + ky * 0.5, this.R * 0.32, 0, G.TAU); c.fill();
      // buttons
      const btn = (o, label, on, col) => {
        c.globalAlpha = on ? 0.75 : 0.4;
        c.fillStyle = col; c.beginPath(); c.arc(o.x, o.y, o.r, 0, G.TAU); c.fill();
        c.globalAlpha = 0.8; c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
        c.globalAlpha = 0.95; c.fillStyle = '#fff';
        c.font = `bold ${Math.round(o.r * 0.42)}px system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(label, o.x, o.y + 1);
      };
      btn(this.jump, 'JUMP', I.jump, '#2a78e4');
      btn(this.dash, 'SPIN', I.dash, '#e8402a');
      // pause
      c.globalAlpha = 0.5; c.fillStyle = '#000';
      c.beginPath(); c.arc(this.pause.x, this.pause.y, this.pause.r, 0, G.TAU); c.fill();
      c.globalAlpha = 0.9; c.fillStyle = '#fff';
      c.fillRect(this.pause.x - 7, this.pause.y - 8, 5, 16); c.fillRect(this.pause.x + 2, this.pause.y - 8, 5, 16);
      c.globalAlpha = 1;
    },
  });
})(window.G);
