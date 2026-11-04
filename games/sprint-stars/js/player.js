'use strict';
// Player: classic momentum physics over vector terrain.
// Units are pixels per frame at 60 Hz (the classic 16-bit constants).
(function (G) {
  const PHYS = {
    acc: 0.0546875, dec: 0.5, frc: 0.046875, top: 6.2, air: 0.09375, grv: 0.21875,
    jump: 6.5, jumpRel: 4, slp: 0.125, slpUp: 0.078125, slpDown: 0.3125,
    rollFrc: 0.0234375, rollDec: 0.125, maxSpd: 16,
  };
  G.PHYS = PHYS;

  class Player {
    constructor(scene, def, x, y) {
      this.scene = scene;
      this.terrain = scene.terrain;
      this.def = def;
      this.x = x; this.y = y;
      this.vx = 0; this.vy = 0; this.gsp = 0; this.ang = 0;
      this.onGround = false; this.layer = 1;
      this.ball = false; this.rolling = false; this.jumping = false;
      this.facing = 1; this.ctrlLock = 0;
      this.spindash = false; this.spinrev = 0;
      this.crouch = false; this.lookUp = false; this.skid = false; this.pushing = false;
      this.hurt = false; this.invuln = 0; this.dead = false; this.deadT = 0;
      this.shield = false; this.inv = 0; this.shoes = 0;
      this.rings = 0; this.chain = 0;
      this.groundSeg = null; this.springT = 0; this.twirl = 0; this.doubleJumped = false;
      this.anim = 'idle'; this.animT = 0; this.idleT = 0; this.dispAng = 0;
      this.victory = false; this.victoryT = 0; this.autoRun = 0; this.frozen = false;
      this.boostT = 0; this.ice = false; this.airLock = 0;
      const self = this;
      this._ignore = (s) => s.ref && s.ref.passable && s.ref.passable(self);
      this._qG = { mask: 1, oneWay: true, ignore: this._ignore };
      this._qA = { mask: 1, oneWay: false, ignore: this._ignore };
    }
    get hr() { return this.ball ? 14 : 19; }
    get wr() { return this.ball ? 7 : 9; }
    q(oneWay) {
      const q = oneWay ? this._qG : this._qA;
      q.mask = this.layer;
      return q;
    }
    get top() { return (this.shoes > 0 ? 2 : 1) * this.def.top; }
    get acc() { return (this.shoes > 0 ? 2 : 1) * this.def.acc; }
    get isAttacking() { return this.ball || this.spindash || this.inv > 0; }

    setBall(b) {
      if (b === this.ball) return;
      if (this.onGround) {
        const s = Math.sin(this.ang), c = Math.cos(this.ang);
        const d = b ? 5 : -5; // move centre toward the ground when curling up
        this.x += -s * d; this.y += c * d;
      }
      this.ball = b;
    }

    readInput() {
      const I = G.Input;
      const locked = this.frozen || this.victory;
      const inp = {
        left: !locked && I.held.left && !I.held.right,
        right: !locked && I.held.right && !I.held.left,
        up: !locked && I.held.up,
        down: !locked && I.held.down,
        jump: !locked && I.held.jump,
        jumpP: !locked && I.pressed.jump,
        dash: !locked && I.held.dash,
        dashP: !locked && I.pressed.dash,
      };
      if (this.autoRun) { inp.right = this.autoRun > 0; inp.left = this.autoRun < 0; }
      return inp;
    }

    update() {
      if (this.dead) {
        this.deadT++;
        this.vy = Math.min(this.vy + 0.21875, 12);
        this.y += this.vy;
        this.anim = 'dead';
        return;
      }
      const inp = this.readInput();
      this.pushing = false;
      if (this.onGround) this.groundUpdate(inp);
      else this.airUpdate(inp);

      if (this.invuln > 0) this.invuln--;
      if (this.inv > 0) { this.inv--; if (this.inv === 0) this.scene.onPowerEnd('inv'); }
      if (this.shoes > 0) { this.shoes--; if (this.shoes === 0) this.scene.onPowerEnd('shoes'); }
      if (this.springT > 0) this.springT--;
      if (this.twirl > 0) this.twirl--;
      if (this.boostT > 0) this.boostT--;
      if (this.victory) this.victoryT++;
      this.updateAnim(inp);
    }

    // ---------------- ground ----------------
    groundUpdate(inp) {
      const sin = Math.sin(this.ang);
      const ice = this.groundSeg && this.groundSeg.ice;
      this.ice = ice;
      if (this.spindash) {
        if (inp.jumpP || inp.dashP) {
          this.spinrev = Math.min(this.spinrev + 2, 8);
          G.Audio.sfx('charge', { rev: this.spinrev });
        }
        if (inp.dash) this.spinrev = Math.min(this.spinrev + 0.1, 8);
        else this.spinrev -= this.spinrev / 32;
        if (inp.left) this.facing = -1;
        else if (inp.right) this.facing = 1;
        if (!inp.down && !inp.dash) {
          this.spindash = false;
          this.rolling = true;
          this.gsp = this.facing * (8 + Math.floor(this.spinrev) / 2) * this.def.dashMul;
          this.scene.camLag = 10;
          G.Audio.sfx('release');
          this.scene.fx.burst(this.x - this.facing * 10, this.y + 10, 'dust', 6);
        } else {
          if (G.frame % 3 === 0) this.scene.fx.spawn('dust', this.x - this.facing * 12, this.y + 11, -this.facing * (1 + Math.random() * 2), -Math.random());
        }
        this.groundMove();
        return;
      }

      const conveyor = this.groundSeg ? this.groundSeg.conveyor : 0;

      if (this.rolling) {
        const downhill = this.gsp === 0 || Math.sign(this.gsp) === Math.sign(sin);
        this.gsp += (downhill ? PHYS.slpDown : PHYS.slpUp) * sin;
        if (inp.left && this.gsp > 0) this.gsp -= PHYS.rollDec;
        else if (inp.right && this.gsp < 0) this.gsp += PHYS.rollDec;
        this.gsp = G.approach(this.gsp, 0, ice ? PHYS.rollFrc * 0.4 : PHYS.rollFrc);
        if (Math.abs(this.gsp) < 0.5 && Math.abs(sin) < 0.5 && !this.tunnel) {
          this.rolling = false;
          this.setBall(false);
        }
        this.gsp = G.clamp(this.gsp, -PHYS.maxSpd, PHYS.maxSpd);
        this.skid = false;
      } else {
        if (this.gsp !== 0 || Math.abs(sin) > 0.3) this.gsp += PHYS.slp * sin;
        const lock = this.ctrlLock > 0;
        const dec = ice ? PHYS.dec * 0.25 : PHYS.dec;
        const acc = ice ? this.acc * 0.5 : this.acc;
        const frc = ice ? PHYS.frc * 0.15 : PHYS.frc;
        let pressing = false;
        if (!lock && inp.left) {
          pressing = true;
          if (this.gsp > 0) {
            if (this.gsp >= 4 && !this.skid && Math.abs(sin) < 0.5) { this.skid = true; G.Audio.sfx('skid'); }
            this.gsp -= dec;
            if (this.gsp <= 0) this.gsp = -0.5;
          } else if (this.gsp > -this.top) {
            this.gsp = Math.max(this.gsp - acc, -this.top);
          }
          if (this.gsp <= 0) { this.facing = -1; this.skid = false; }
        } else if (!lock && inp.right) {
          pressing = true;
          if (this.gsp < 0) {
            if (this.gsp <= -4 && !this.skid && Math.abs(sin) < 0.5) { this.skid = true; G.Audio.sfx('skid'); }
            this.gsp += dec;
            if (this.gsp >= 0) this.gsp = 0.5;
          } else if (this.gsp < this.top) {
            this.gsp = Math.min(this.gsp + acc, this.top);
          }
          if (this.gsp >= 0) { this.facing = 1; this.skid = false; }
        }
        if (!pressing) {
          this.gsp = G.approach(this.gsp, 0, frc);
          this.skid = false;
        }
        if (this.skid && G.frame % 4 === 0) this.scene.fx.spawn('dust', this.x, this.y + 17, -this.gsp * 0.2, -0.5);
        // crouch / look up / roll / spindash
        const slow = Math.abs(this.gsp) < 1;
        this.crouch = !lock && inp.down && slow && Math.abs(sin) < 0.4;
        this.lookUp = !lock && inp.up && slow && Math.abs(this.gsp) < 0.1 && !inp.down;
        if (this.crouch) this.gsp = 0;
        if (!lock && ((this.crouch && inp.jumpP) || (inp.dashP && slow && Math.abs(sin) < 0.4))) {
          this.spindash = true;
          this.spinrev = inp.dashP ? 2 : 0;
          this.crouch = false;
          this.setBall(true);
          G.Audio.sfx('charge', { rev: this.spinrev });
          this.groundMove();
          return;
        }
        if (!lock && ((inp.down && !slow) || (inp.dashP && !slow))) {
          this.rolling = true;
          this.setBall(true);
          G.Audio.sfx('roll');
        }
      }
      if (this.ctrlLock > 0) this.ctrlLock--;

      if (inp.jumpP && !this.crouch) {
        this.doJump();
        return;
      }
      if (this.gsp > 0.3) this.facing = this.rolling ? 1 : this.facing;
      if (this.gsp < -0.3 && this.rolling) this.facing = -1;
      if (conveyor) {
        this.x += conveyor;
      }
      this.groundMove();
    }

    groundMove() {
      const steps = Math.max(1, Math.ceil(Math.abs(this.gsp) / 4));
      for (let i = 0; i < steps; i++) {
        const c = Math.cos(this.ang), s = Math.sin(this.ang);
        this.x += (c * this.gsp) / steps;
        this.y += (s * this.gsp) / steps;
        this.wallCheckGround();
        if (!this.snapGround()) {
          this.leaveGround();
          return;
        }
      }
      if (!this.onGround) return;
      // too slow on a steep wall / ceiling
      const a = Math.abs(this.ang);
      if (Math.abs(this.gsp) < 2.5 && a > 0.8 && this.ctrlLock === 0) {
        if (a > 1.45) {
          this.leaveGround();
        } else {
          this.ctrlLock = 30;
        }
      }
    }

    snapGround() {
      const hr = this.hr, wr = this.wr;
      const c = Math.cos(this.ang), s = Math.sin(this.ang);
      const dx = -s, dy = c; // down vector
      const range = hr + Math.min(Math.abs(this.gsp) + 4, 14);
      const q = this.q(true);
      let best = null;
      for (let side = -1; side <= 1; side += 2) {
        const ox = this.x + c * wr * side, oy = this.y + s * wr * side;
        const h = this.terrain.raycast(ox, oy, dx, dy, range, q);
        if (!h) continue;
        const na = Math.atan2(h.nx, -h.ny);
        if (Math.abs(G.angDiff(na, this.ang)) > 1.2) continue;
        if (!best || h.t < best.t) best = h;
      }
      if (!best) return false;
      this.x += dx * (best.t - hr);
      this.y += dy * (best.t - hr);
      let na = Math.atan2(best.nx, -best.ny);
      if (Math.abs(na) < 0.03) na = 0;
      this.ang = na;
      this.groundSeg = best.seg;
      return true;
    }

    wallCheckGround() {
      const dir = Math.sign(this.gsp);
      if (!dir) return false;
      const c = Math.cos(this.ang), s = Math.sin(this.ang);
      const ux = s, uy = -c;
      const off = Math.abs(this.ang) < 0.3 && !this.ball ? 8 : 0;
      const ox = this.x - ux * off, oy = this.y - uy * off;
      const len = this.wr + 1;
      const h = this.terrain.raycast(ox, oy, c * dir, s * dir, len, this.q(false));
      if (h) {
        const dot = h.nx * ux + h.ny * uy;
        if (Math.abs(dot) < 0.55) {
          this.x -= c * dir * (len - h.t);
          this.y -= s * dir * (len - h.t);
          this.gsp = 0;
          this.pushing = true;
          return true;
        }
      }
      return false;
    }

    leaveGround() {
      const c = Math.cos(this.ang), s = Math.sin(this.ang);
      this.vx = this.gsp * c;
      this.vy = this.gsp * s;
      this.onGround = false;
      this.ang = 0;
      this.groundSeg = null;
      this.skid = false;
      this.crouch = false;
      this.spindash = false;
    }

    doJump() {
      const s = Math.sin(this.ang), c = Math.cos(this.ang);
      const J = this.def.jump;
      this.vx = this.gsp * c + s * J;
      this.vy = this.gsp * s - c * J;
      this.onGround = false;
      this.ang = 0;
      this.jumping = true;
      this.rolling = false;
      this.skid = false;
      this.groundSeg = null;
      this.setBall(true);
      this.doubleJumped = false;
      G.Audio.sfx('jump');
    }

    // ---------------- air ----------------
    airUpdate(inp) {
      const top = this.top;
      const acc = this.def.air * (this.shoes > 0 ? 2 : 1);
      if (this.airLock > 0) this.airLock--;
      if (!this.hurt && this.airLock === 0) {
        if (inp.left) { if (this.vx > -top) this.vx = Math.max(this.vx - acc, -top); this.facing = -1; }
        else if (inp.right) { if (this.vx < top) this.vx = Math.min(this.vx + acc, top); this.facing = 1; }
      }
      if (this.vy < 0 && this.vy > -4 && Math.abs(this.vx) >= 0.125) this.vx -= this.vx / 32;
      if (this.jumping && !inp.jump && this.vy < -this.def.jumpRel) this.vy = -this.def.jumpRel;
      // Rosie-style twirl: a small second jump
      if (inp.jumpP && this.def.doubleJump && this.jumping && !this.doubleJumped && !this.hurt) {
        this.doubleJumped = true;
        this.vy = Math.min(this.vy, -this.def.doubleJump);
        this.twirl = 24;
        G.Audio.sfx('twirl');
        this.scene.fx.burst(this.x, this.y + 6, 'sparkle', 5);
      }
      this.vy += this.hurt ? 0.1875 : this.twirl > 0 ? PHYS.grv * 0.7 : PHYS.grv;
      if (this.vy > 16) this.vy = 16;

      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(this.vx), Math.abs(this.vy)) / 4));
      for (let i = 0; i < steps; i++) {
        this.x += this.vx / steps;
        this.y += this.vy / steps;
        this.airWalls();
        if (this.vy < 0 && this.airCeiling()) { if (this.onGround) return; }
        if (this.airFloor()) return;
      }
      // ease the sprite back upright
    }

    airWalls() {
      const len = this.wr + 1;
      const q = this.q(false);
      for (let dir = -1; dir <= 1; dir += 2) {
        const h = this.terrain.raycast(this.x, this.y, dir, 0, len, q);
        if (h && Math.abs(h.nx) > 0.7) {
          this.x -= dir * (len - h.t);
          if (Math.sign(this.vx) === dir) this.vx = 0;
        }
      }
    }

    airCeiling() {
      const q = this.q(false);
      let best = null;
      for (let side = -1; side <= 1; side += 2) {
        const h = this.terrain.raycast(this.x + side * this.wr, this.y, 0, -1, this.hr, q);
        if (h && (!best || h.t < best.t)) best = h;
      }
      if (!best) return false;
      const vn = this.vx * best.nx + this.vy * best.ny;
      if (vn > 0) return false;
      const ca = Math.atan2(best.nx, -best.ny);
      const aa = Math.abs(ca);
      if (aa > 1.65 && aa < 2.6 && !this.hurt) {
        this.y += this.hr - best.t;
        this.ang = ca;
        this.gsp = this.vx * Math.cos(ca) + this.vy * Math.sin(ca);
        this.onGround = true;
        this.jumping = false;
        this.groundSeg = best.seg;
        return true;
      }
      this.y += this.hr - best.t;
      if (this.vy < 0) this.vy = 0;
      return true;
    }

    airFloor() {
      const q = this.q(this.vy >= 0);
      let best = null;
      for (let side = -1; side <= 1; side += 2) {
        const h = this.terrain.raycast(this.x + side * this.wr, this.y, 0, 1, this.hr, q);
        if (h && (!best || h.t < best.t)) best = h;
      }
      if (!best) return false;
      const vn = this.vx * best.nx + this.vy * best.ny;
      if (vn > 0.001) return false;
      this.y += best.t - this.hr;
      this.land(best);
      return true;
    }

    land(h) {
      this.ang = Math.atan2(h.nx, -h.ny);
      if (Math.abs(this.ang) < 0.03) this.ang = 0;
      this.gsp = this.vx * Math.cos(this.ang) + this.vy * Math.sin(this.ang);
      this.onGround = true;
      this.jumping = false;
      this.doubleJumped = false;
      this.twirl = 0;
      this.groundSeg = h.seg;
      this.chain = 0;
      this.airLock = 0;
      if (this.hurt) {
        this.hurt = false;
        this.gsp = 0;
        this.invuln = 120;
      }
      if (this.ball) {
        if (G.Input.held.down && Math.abs(this.gsp) > 1) this.rolling = true;
        else { this.rolling = false; this.setBall(false); }
      }
      this.snapGround();
    }

    // ---------------- interactions ----------------
    bounce(vy) {
      // bounce off an enemy / monitor
      if (this.onGround) return;
      if (G.Input.held.jump) this.vy = Math.min(-vy, this.vy < 0 ? this.vy : -vy);
      else this.vy = -Math.max(3, Math.min(vy, 5));
    }
    spring(vx, vy, opts = {}) {
      if (this.dead) return;
      if (vy !== 0 || !this.onGround) {
        if (this.onGround) this.leaveGround();
        if (vx) this.vx = vx;
        if (vy) this.vy = vy;
        this.jumping = false;
        this.setBall(false);
        this.rolling = false;
        this.springT = vy < 0 ? 40 : 0;
        if (vx) { this.facing = Math.sign(vx); this.airLock = opts.lock || 0; }
      } else {
        this.gsp = vx;
        this.facing = Math.sign(vx);
        this.ctrlLock = 16;
      }
      this.hurt = false;
    }
    hit(srcX, opts = {}) {
      if (this.dead || this.victory) return false;
      if (!opts.force && (this.invuln > 0 || this.inv > 0 || this.hurt)) return false;
      if (this.shield && !opts.force) {
        this.shield = false;
        G.Audio.sfx('hurt');
        this.knockback(srcX);
        return true;
      }
      if (this.rings > 0 && !opts.instant) {
        this.scene.scatterRings(this.x, this.y, this.rings);
        this.rings = 0;
        G.Audio.sfx('ringloss');
        this.knockback(srcX);
        return true;
      }
      this.die();
      return true;
    }
    knockback(srcX) {
      const dir = Math.sign(this.x - srcX) || -this.facing;
      if (this.onGround) this.leaveGround();
      this.onGround = false;
      this.vx = 2 * dir; this.vy = -4;
      this.hurt = true; this.jumping = false;
      this.setBall(false); this.rolling = false; this.spindash = false;
      this.facing = -dir;
    }
    die() {
      if (this.dead) return;
      this.dead = true;
      this.deadT = 0;
      this.onGround = false;
      this.vy = -7; this.vx = 0;
      this.ball = false; this.shield = false; this.inv = 0; this.shoes = 0;
      G.Audio.sfx('die');
      this.scene.onPlayerDeath();
    }

    // ---------------- animation ----------------
    updateAnim(inp) {
      let a, rate = 0.15;
      const spd = Math.abs(this.onGround ? this.gsp : this.vx);
      if (this.victory) { a = 'victory'; rate = 0.12; }
      else if (this.hurt) { a = 'hurt'; rate = 0.1; }
      else if (this.spindash) { a = 'spindash'; rate = 0.5; }
      else if (this.twirl > 0) { a = 'twirl'; rate = 0.4; }
      else if (this.ball) { a = 'spin'; rate = 0.25 + Math.min(spd, 12) / 24; }
      else if (!this.onGround) {
        if (this.springT > 0 && this.vy < 0) { a = 'spring'; rate = 0.2; }
        else { a = 'fall'; rate = 0.2; }
      } else if (this.skid) { a = 'skid'; rate = 0.2; }
      else if (this.pushing && (inp.left || inp.right)) { a = 'push'; rate = 0.08; }
      else if (this.crouch) { a = 'crouch'; rate = 0.2; }
      else if (this.lookUp) { a = 'lookup'; rate = 0.2; }
      else if (spd < 0.1) {
        this.idleT++;
        a = this.idleT > 300 ? 'wait' : 'idle';
        rate = a === 'wait' ? 0.08 : 0.06;
      } else if (spd < 4.2) { a = 'walk'; rate = 0.1 + spd / 22; }
      else if (spd < 9.5) { a = 'run'; rate = 0.2 + spd / 30; }
      else { a = 'sprint'; rate = 0.5; }
      if (a !== 'idle' && a !== 'wait') this.idleT = 0;
      if (a !== this.anim) { this.anim = a; this.animT = 0; }
      else this.animT += rate;
      // display rotation
      let target = 0;
      if (this.onGround && !this.ball && Math.abs(this.ang) > 0.25) target = this.ang;
      if (this.onGround && !this.ball) {
        const d = G.angDiff(target, this.dispAng);
        this.dispAng = Math.abs(d) < 0.02 ? target : this.dispAng + d * 0.5;
      } else {
        this.dispAng = G.approach(this.dispAng, 0, 0.1);
        if (Math.abs(this.dispAng) < 0.1) this.dispAng = 0;
      }
    }

    render(ctx, camX, camY) {
      if (this.invuln > 0 && !this.hurt && (G.frame >> 2) % 2) return;
      const frames = G.Art.charFrames(this.def.id, this.anim);
      const fi = Math.floor(this.animT) % frames.length;
      const img = frames[fi];
      const px = Math.round(this.x - camX), py = Math.round(this.y - camY);
      ctx.save();
      ctx.translate(px, py);
      let rot = this.dispAng;
      if (this.ball && !this.spindash) rot = 0;
      if (rot) {
        // snap to 1/32 turns for a crisper rotated sprite
        rot = Math.round(rot / (G.TAU / 32)) * (G.TAU / 32);
        ctx.rotate(rot);
      }
      if (this.facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -G.SPR.cx, -G.SPR.cy);
      ctx.restore();
    }
  }
  G.Player = Player;
})(window.G);
