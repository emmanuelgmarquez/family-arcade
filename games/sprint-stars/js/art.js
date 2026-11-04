'use strict';
// Art: original characters drawn as vector shapes at 4x, then point-sampled
// down to crisp 1x pixel art with a dark outline (see G.renderPixel).
(function (G) {
  const SS = 4; // supersample factor
  const SPR = 64, CX = 32, CY = 34; // character sprite canvas & physics-centre
  G.SPR = { size: SPR, cx: CX, cy: CY };

  // Draw with fn(ctx) in a w*h logical canvas, return crisp pixel art canvas.
  G.renderPixel = function (w, h, fn, outline) {
    const hi = G.makeCanvas(w * SS, h * SS);
    const hc = hi.getContext('2d');
    hc.scale(SS, SS);
    hc.lineJoin = 'round';
    hc.lineCap = 'round';
    fn(hc);
    const src = hc.getImageData(0, 0, w * SS, h * SS).data;
    const out = G.makeCanvas(w, h);
    const oc = out.getContext('2d');
    const img = oc.createImageData(w, h);
    const d = img.data;
    const W4 = w * SS;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const si = ((y * SS + 2) * W4 + (x * SS + 2)) * 4;
        const di = (y * w + x) * 4;
        const a = src[si + 3];
        if (a < 100) continue;
        const k = 255 / a;
        d[di] = Math.min(255, src[si] * (a < 255 ? k : 1));
        d[di + 1] = Math.min(255, src[si + 1] * (a < 255 ? k : 1));
        d[di + 2] = Math.min(255, src[si + 2] * (a < 255 ? k : 1));
        d[di + 3] = 255;
      }
    oc.putImageData(img, 0, 0);
    if (outline) G.pixelize(out, outline);
    return out;
  };

  // ---------- small drawing helpers ----------
  const H = (G.Draw = {
    ell(c, x, y, rx, ry, rot, fill, stroke, lw) {
      c.beginPath();
      c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, G.TAU);
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
    },
    // ellipse with cel shading: dark crescent bottom-left, highlight top-right
    shaded(c, x, y, rx, ry, rot, base, dark, light, line) {
      c.save();
      c.beginPath();
      c.ellipse(x, y, rx, ry, rot || 0, 0, G.TAU);
      c.fillStyle = dark; c.fill();
      c.clip();
      H.ell(c, x + rx * 0.18, y - ry * 0.2, rx * 0.95, ry * 0.92, rot, base);
      if (light) H.ell(c, x + rx * 0.38, y - ry * 0.48, rx * 0.35, ry * 0.25, rot, light);
      c.restore();
      if (line) H.ell(c, x, y, rx, ry, rot, null, line, 1);
    },
    path(c, pts, fill, stroke, lw, close = true) {
      c.beginPath();
      c.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
      if (close) c.closePath();
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
    },
    line(c, x1, y1, x2, y2, col, lw) {
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
      c.strokeStyle = col; c.lineWidth = lw || 1; c.stroke();
    },
    // limb segment with dark rim
    limb(c, x1, y1, x2, y2, col, rim, w) {
      H.line(c, x1, y1, x2, y2, rim, w + 1.6);
      H.line(c, x1, y1, x2, y2, col, w);
    },
    star(c, x, y, r1, r2, n, rot, fill, stroke) {
      const p = [];
      for (let i = 0; i < n * 2; i++) {
        const a = rot + (i * Math.PI) / n - Math.PI / 2;
        const r = i % 2 ? r2 : r1;
        p.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      H.path(c, p, fill, stroke);
    },
  });

  // ---------- character definitions ----------
  G.CHARS = {
    bolt: {
      id: 'bolt', name: 'BOLT', species: 'fox', title: 'THE SPEEDY FOX',
      desc: ['TOP SPEED: FASTEST', 'SPIN DASH: STRONGEST'],
      top: 6.4, acc: 0.0546875, air: 0.09375, jump: 6.5, jumpRel: 4, dashMul: 1.05, doubleJump: 0,
      fur: '#2a78e4', furD: '#17459e', furL: '#74b8ff', cream: '#fff1d6', creamD: '#e0b98a',
      inner: '#ff9cb6', shoe: '#ffc61c', shoeD: '#d27c06', strap: '#e8403a', sole: '#ffffff',
      iris: '#1fae58', nose: '#1b1530', line: '#0c1638', limb: '#2a78e4', limbD: '#17459e',
      paw: '#fff1d6', outline: '#0b1030',
    },
    rosie: {
      id: 'rosie', name: 'ROSIE', species: 'panda', title: 'THE TWIRLING RED PANDA',
      desc: ['JUMP: HIGHEST', 'AIR JUMP: TWIRL!'],
      top: 6.0, acc: 0.0625, air: 0.1, jump: 6.8, jumpRel: 4, dashMul: 0.95, doubleJump: 5.2,
      fur: '#d8592a', furD: '#972f12', furL: '#f79a5a', cream: '#fff7ea', creamD: '#e6c8a8',
      inner: '#3a1a10', shoe: '#2fd39c', shoeD: '#16916a', strap: '#ffffff', sole: '#fffbe0',
      iris: '#6a3014', nose: '#22100a', line: '#3a1206', limb: '#5a2716', limbD: '#36130a',
      paw: '#4a1f12', scarf: '#8b63ff', scarfD: '#5634c4', outline: '#1e0a06',
    },
  };

  // 2-bone IK: knee bends forward (+x)
  function ik(hx, hy, tx, ty, l1, l2) {
    let dx = tx - hx, dy = ty - hy;
    let d = Math.hypot(dx, dy);
    const dmax = l1 + l2 - 0.01, dmin = Math.abs(l1 - l2) + 0.3;
    if (d > dmax) { dx *= dmax / d; dy *= dmax / d; d = dmax; }
    if (d < dmin) { d = dmin; }
    const th = Math.atan2(dx, dy); // angle from straight down, + is forward
    const al = Math.acos(G.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const a1 = th + al;
    const kx = hx + Math.sin(a1) * l1, ky = hy + Math.cos(a1) * l1;
    const ax = hx + Math.sin(th) * d, ay = hy + Math.cos(th) * d;
    return { kx, ky, ax, ay };
  }

  function drawShoe(c, d, x, y, ang, dark) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    const sh = dark ? G.shade(d.shoe, -0.18) : d.shoe;
    // upper
    c.beginPath();
    c.moveTo(-2.6, -1.8);
    c.quadraticCurveTo(-3.6, 3.2, -1, 3.2);
    c.lineTo(6.2, 3.2);
    c.quadraticCurveTo(8.6, 2.6, 7.4, -0.2);
    c.quadraticCurveTo(5.8, -3.2, 1.2, -2.8);
    c.closePath();
    c.fillStyle = d.shoeD; c.fill();
    c.save(); c.clip();
    H.ell(c, 2.4, -0.8, 5.4, 3.0, 0, sh);
    H.ell(c, 4.4, -1.6, 1.6, 0.9, 0, G.shade(sh, 0.45));
    // strap
    c.fillStyle = d.strap; c.fillRect(0.4, -3.5, 2.2, 6);
    c.fillStyle = d.sole; c.fillRect(-4, 2.0, 13, 1.4);
    c.restore();
    c.strokeStyle = d.line; c.lineWidth = 0.9; c.stroke();
    c.restore();
  }

  function drawTail(c, d, P) {
    const t = P.tail || 0; // radians: + raises the tail
    c.save();
    c.translate(-4.5, 4);
    c.rotate(t);
    if (d.species === 'fox') {
      c.beginPath();
      c.moveTo(1, -1.5);
      c.quadraticCurveTo(-4, -8, -11, -9.5);
      c.quadraticCurveTo(-17, -10.5, -20, -6);
      c.quadraticCurveTo(-18, -4.6, -19.4, -2);
      c.quadraticCurveTo(-13, 1.6, -6, 3);
      c.quadraticCurveTo(-2, 3.8, 1, 2.2);
      c.closePath();
      c.fillStyle = d.furD; c.fill();
      c.save(); c.clip();
      H.ell(c, -7, -3.5, 10, 5.2, -0.15, d.fur);
      H.ell(c, -6, -6, 6.5, 1.8, -0.2, d.furL);
      H.ell(c, -18, -5, 5.6, 5.8, 0.3, d.cream);
      H.ell(c, -18.5, -7, 3, 2, 0.3, '#ffffff');
      H.line(c, -9, -1, -13, -2.2, d.furD, 0.8);
      H.line(c, -6, 0.5, -9.5, -0.2, d.furD, 0.8);
      c.restore();
      c.strokeStyle = d.line; c.lineWidth = 0.9; c.stroke();
    } else {
      // red panda: thick ringed tail
      const n = 8;
      for (let i = n; i >= 0; i--) {
        const u = i / n;
        const x = -u * 15, y = -Math.sin(u * 2.4) * 4.2 + u * u * 1.5;
        const r = 4.4 - u * 0.9;
        const ring = i % 2 === 0 ? d.fur : d.cream;
        H.ell(c, x, y, r + 0.7, r + 0.7, 0, d.line);
        H.ell(c, x, y, r, r, 0, i === n ? d.furD : ring);
        H.ell(c, x + 0.6, y - r * 0.45, r * 0.45, r * 0.25, 0, G.shade(ring, 0.35));
      }
    }
    c.restore();
  }

  function drawEars(c, d, P, front) {
    const s = P.ears || 0;
    if (d.species === 'fox') {
      if (!front) {
        H.path(c, [-7.5, -2.5, -9 - s * 9, -19 + s * 12, -0.5, -7.5], d.furD, d.line, 0.9);
        H.path(c, [-6.6, -3.6, -8.4 - s * 8, -16.4 + s * 10.6, -2.4, -7.6], G.shade(d.inner, -0.3));
      } else {
        c.beginPath();
        c.moveTo(-3, -5.5);
        c.quadraticCurveTo(-5 - s * 4, -14 + s * 3, -2 - s * 11, -23.5 + s * 14);
        c.quadraticCurveTo(4 - s * 4, -15 + s * 4, 6, -6.5);
        c.closePath();
        c.fillStyle = d.fur; c.fill(); c.strokeStyle = d.line; c.lineWidth = 0.9; c.stroke();
        c.beginPath();
        c.moveTo(-1.4, -6.5);
        c.quadraticCurveTo(-3 - s * 4, -13 + s * 3, -1.8 - s * 9.4, -20 + s * 12);
        c.quadraticCurveTo(2.6 - s * 3, -13.6 + s * 3.4, 3.8, -7);
        c.closePath();
        c.fillStyle = d.inner; c.fill();
        H.path(c, [-1, -8, -1.6 - s * 7, -17 + s * 9, 0.4 - s * 3, -12 + s * 3], G.shade(d.inner, 0.4));
      }
    } else {
      const bx = front ? 1.8 - s * 3 : -5.4 - s * 2.5, by = front ? -8.4 + s * 2 : -7 + s * 2.2;
      H.ell(c, bx, by, 4.6, 4.3, 0, front ? d.fur : d.furD, d.line, 0.9);
      H.ell(c, bx, by + 0.4, 3.3, 3.0, 0, d.cream);
      H.ell(c, bx + 0.2, by + 0.9, 2.2, 2.0, 0, d.inner);
    }
  }

  function drawEyes(c, d, P) {
    const e = P.eye || 'open';
    const ink = d.line;
    const ex = 3.6, ey = -2.4;
    if (e === 'blink' || e === 'happy' || e === 'shut') {
      c.beginPath();
      if (e === 'happy') { c.moveTo(ex - 2.2, ey + 0.8); c.quadraticCurveTo(ex, ey - 2.4, ex + 2.2, ey + 0.8); c.moveTo(7, ey + 0.6); c.quadraticCurveTo(8, ey - 1.6, 9, ey + 0.6); }
      else { c.moveTo(ex - 2.2, ey + 0.4); c.quadraticCurveTo(ex, ey + 1.6, ex + 2.3, ey + 0.2); c.moveTo(6.8, ey + 0.4); c.lineTo(9, ey + 0.2); }
      c.strokeStyle = ink; c.lineWidth = 1.1; c.stroke();
      return;
    }
    if (e === 'hurt') {
      H.path(c, [ex - 2, ey - 2, ex + 1.6, ey, ex - 2, ey + 2], null, ink, 1.1, false);
      H.path(c, [9.2, ey - 2, 7, ey, 9.2, ey + 2], null, ink, 1.1, false);
      return;
    }
    if (e === 'x') {
      H.line(c, ex - 1.6, ey - 1.6, ex + 1.6, ey + 1.6, ink, 1); H.line(c, ex + 1.6, ey - 1.6, ex - 1.6, ey + 1.6, ink, 1);
      H.line(c, 7, ey - 1.4, 9.2, ey + 1.4, ink, 1); H.line(c, 9.2, ey - 1.4, 7, ey + 1.4, ink, 1);
      return;
    }
    const wide = e === 'wide';
    const look = e === 'look';
    const up = P.lookUp ? -0.9 : 0;
    // far eye
    H.ell(c, 7.8, ey - 0.2, 1.6, wide ? 3.3 : 3.0, 0.1, '#ffffff', ink, 0.7);
    H.ell(c, 8.3 - (look ? 0.6 : 0), ey + 0.3 + up, 1.0, wide ? 1.4 : 2.1, 0.1, wide ? ink : d.iris);
    // near eye
    H.ell(c, ex, ey, 2.9, wide ? 4.1 : 3.8, 0, '#ffffff', ink, 0.8);
    const ix = look ? ex : ex + 0.8;
    if (wide) H.ell(c, ix, ey + up, 1.0, 1.3, 0, ink);
    else {
      H.ell(c, ix, ey + 0.3 + up, 1.7, 2.6, 0, d.iris);
      H.ell(c, ix + 0.3, ey + 0.4 + up, 0.9, 1.7, 0, ink);
      H.ell(c, ix + 0.6, ey - 1.0 + up, 0.7, 0.7, 0, '#ffffff');
    }
    if (e === 'half') H.path(c, [ex - 3, ey - 4.2, ex + 3, ey - 4.2, ex + 3, ey - 0.6, ex - 3, ey - 1.2], d.fur);
  }

  function drawMouth(c, d, P) {
    const m = P.mouth || 'smile';
    const ink = d.line;
    if (m === 'smile') {
      c.beginPath(); c.moveTo(6.2, 3.4); c.quadraticCurveTo(8, 5, 9.8, 3.2);
      c.strokeStyle = ink; c.lineWidth = 0.8; c.stroke();
    } else if (m === 'grin') {
      H.path(c, [5.8, 3, 10, 2.6, 8.4, 5.6, 6.6, 5.2], '#ffffff', ink, 0.7);
    } else if (m === 'open') {
      H.ell(c, 7.8, 4.2, 1.8, 1.7, 0, '#6a1020', ink, 0.7);
      H.ell(c, 7.8, 5.0, 1.1, 0.7, 0, '#ff7a8a');
    } else if (m === 'o') {
      H.ell(c, 8, 4.2, 1.1, 1.3, 0, '#6a1020', ink, 0.7);
    } else if (m === 'grit') {
      H.path(c, [6, 3.2, 9.8, 3, 9.6, 5, 6.4, 5], '#ffffff', ink, 0.7);
      H.line(c, 6.2, 4.1, 9.6, 4.0, ink, 0.5);
    }
  }

  function drawHead(c, d, P) {
    c.save();
    c.translate(2 + (P.hx || 0), -9 + (P.hy || 0));
    c.rotate(P.ht || 0);
    drawEars(c, d, P, false);
    // head + cheek fluff
    if (d.species === 'fox') {
      H.path(c, [-7, 1, -12, 4.5, -8, 4.8, -10.6, 7.6, -4, 7.2], d.cream, d.line, 0.9);
    } else {
      H.path(c, [-7, 0, -11.4, 3.6, -7.6, 4, -9.6, 6.6, -3.5, 6.6], d.fur, d.line, 0.9);
    }
    H.shaded(c, 0, 0, 9.6, 8.6, 0, d.fur, d.furD, d.furL, d.line);
    // muzzle / mask
    c.save();
    c.beginPath(); c.ellipse(0, 0, 9.6, 8.6, 0, 0, G.TAU); c.clip();
    if (d.species === 'fox') {
      H.ell(c, 5, 4.2, 7.2, 4.6, -0.15, d.cream);
      H.ell(c, -1.5, 6.6, 4.5, 3, 0, d.cream);
    } else {
      H.ell(c, 5.2, 3.8, 6.4, 4.4, -0.1, d.cream);
      H.ell(c, -2.2, 3.4, 3.2, 2.6, 0.2, d.cream);
      H.ell(c, 1.8, -7.0, 1.5, 0.9, 0, d.cream);
      H.line(c, 2.6, 1.6, 1.6, 6.5, d.furD, 1.2);
    }
    c.restore();
    // snout tip pokes slightly out of the head silhouette
    H.ell(c, 9.4, 1.6, 2.6, 2.2, 0, d.cream);
    H.ell(c, 10.6, 0.6, 1.6, 1.15, 0, d.nose);
    H.ell(c, 10.9, 0.2, 0.55, 0.4, 0, '#8a8aa8');
    drawEyes(c, d, P);
    drawMouth(c, d, P);
    drawEars(c, d, P, true);
    c.restore();
  }

  function legPositions(P) {
    // returns [{hip, knee, ankle, footAng}] back, front
    const res = [];
    const hips = [{ x: -1.8, y: 5 }, { x: 0.6, y: 5 }];
    for (let i = 0; i < 2; i++) {
      const L = P.legs[i];
      const hx = hips[i].x, hy = hips[i].y;
      if (L.fx !== undefined) {
        const r = ik(hx, hy, L.fx, L.fy, 6, 5.6);
        res.push({ hx, hy, kx: r.kx, ky: r.ky, ax: r.ax, ay: r.ay, fa: L.fa || 0 });
      } else {
        const a1 = L.a, a2 = L.a - (L.k || 0);
        const kx = hx + Math.sin(a1) * 6, ky = hy + Math.cos(a1) * 6;
        const ax = kx + Math.sin(a2) * 5.6, ay = ky + Math.cos(a2) * 5.6;
        res.push({ hx, hy, kx, ky, ax, ay, fa: L.fa !== undefined ? L.fa : -a2 * 0.6 });
      }
    }
    return res;
  }

  function drawLeg(c, d, L, back) {
    const col = back ? G.shade(d.limb, -0.22) : d.limb;
    H.limb(c, L.hx, L.hy, L.kx, L.ky, col, d.line, 2.6);
    H.limb(c, L.kx, L.ky, L.ax, L.ay, col, d.line, 2.4);
    drawShoe(c, d, L.ax, L.ay + 0.4, L.fa, back);
  }

  function drawArm(c, d, A, back) {
    const sx = back ? -0.6 : 1.6, sy = -1.2;
    const a1 = A.a, a2 = A.a + (A.e || 0);
    const ex = sx + Math.sin(a1) * 4.6, ey = sy + Math.cos(a1) * 4.6;
    const hx = ex + Math.sin(a2) * 4.4, hy = ey + Math.cos(a2) * 4.4;
    const col = back ? G.shade(d.limb, -0.22) : d.limb;
    H.limb(c, sx, sy, ex, ey, col, d.line, 2.3);
    H.limb(c, ex, ey, hx, hy, col, d.line, 2.2);
    const paw = back ? G.shade(d.paw, -0.15) : d.paw;
    H.ell(c, hx, hy, 2.3, 2.3, 0, paw, d.line, 0.8);
    if (A.thumb) H.ell(c, hx + Math.sin(a2 + 1.5) * 1.6, hy - 2, 0.9, 1.6, 0, paw, d.line, 0.6);
  }

  function drawTorso(c, d, P) {
    H.shaded(c, -0.4, 1.8, 5.6, 6.6, 0.05, d.fur, d.furD, d.furL, d.line);
    H.ell(c, 1.6, 3.0, 3.1, 4.4, 0.08, d.cream);
    if (d.scarf) {
      // scarf around neck with a fluttering tail
      const fl = P.scarf || 0;
      H.path(c, [-3.5, -4.5, -8 - fl * 2, -5.2 + Math.sin(fl * 5) * 1.5, -11 - fl * 3, -3.5 + Math.cos(fl * 4) * 1.6, -8.5, -2.2, -3.6, -1.6], d.scarfD, d.line, 0.8);
      H.ell(c, 0.6, -3.4, 5.4, 2.2, 0.1, d.scarf, d.line, 0.8);
      H.ell(c, 2, -4.1, 2.5, 0.7, 0.1, G.shade(d.scarf, 0.35));
    }
  }

  function drawSprintLegs(c, d, P) {
    const ph = P.wheel || 0;
    const cx = 1.5, cy = 11;
    const legD = G.shade(d.limb, -0.25);
    // blurred leg loop
    H.ell(c, cx, cy, 7.5, 5.2, 0, null, d.line, 3.4);
    H.ell(c, cx, cy, 7.5, 5.2, 0, null, legD, 1.8);
    for (let k = 0; k < 2; k++) {
      const a = ph + k * Math.PI;
      const fx = cx + Math.cos(a) * 7.5, fy = cy + Math.sin(a) * 5.2;
      H.limb(c, k ? 0.6 : -1.6, 5, fx, fy - 1, k ? d.limb : legD, d.line, 2.3);
      drawShoe(c, d, fx, fy, -Math.sin(a) * 0.5 + 0.1, k === 0);
    }
    // speed streaks
    H.line(c, cx - 11, cy - 3, cx - 7, cy - 3, '#ffffff', 0.8);
    H.line(c, cx - 12, cy + 2, cx - 8, cy + 2, '#ffffff', 0.8);
  }

  function drawBall(c, d, P) {
    const ph = P.spin || 0;
    const sx = P.squash || 1;
    c.save();
    c.scale(sx, 1 / sx);
    H.ell(c, 0, 0, 13.4, 13.4, 0, d.furD, d.line, 1.1);
    c.save();
    c.beginPath(); c.ellipse(0, 0, 13.4, 13.4, 0, 0, G.TAU); c.clip();
    H.ell(c, 1.6, -1.6, 11.6, 11.6, 0, d.fur);
    c.rotate(ph);
    // swirl bands (fur tufts / tail curling around)
    for (let k = 0; k < 3; k++) {
      c.rotate(G.TAU / 3);
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(7, -2, 13.5, -9);
      c.quadraticCurveTo(9, 0, 0, 2.6);
      c.closePath();
      c.fillStyle = k === 0 ? d.cream : k === 1 ? d.furL : d.furD;
      c.fill();
    }
    // ear / tail tip & shoe peeking
    H.path(c, [-4, -11, 0, -19, 3, -11], d.species === 'fox' ? d.fur : d.cream, d.line, 0.8);
    H.ell(c, 9, 7, 3.8, 2.4, 0.6, d.shoe, d.line, 0.8);
    c.restore();
    H.ell(c, 4, -6, 3.5, 2.2, -0.6, G.shade(d.furL, 0.25));
    c.restore();
  }

  function drawChar(c, d, P) {
    c.save();
    c.translate(CX + (P.bx || 0), CY + (P.by || 0));
    if (P.sx) c.scale(P.sx, 1);
    if (P.ball) { drawBall(c, d, P); c.restore(); return; }
    if (P.rot) c.rotate(P.rot);
    const hip = { x: -0.5, y: 5 };
    const upper = (fn) => {
      c.save();
      c.translate(hip.x, hip.y); c.rotate(P.lean || 0); c.translate(-hip.x, -hip.y);
      fn(); c.restore();
    };
    const legs = P.wheel !== undefined ? null : legPositions(P);
    // back ear (behind everything) is drawn with the head; tail first
    drawTail(c, d, P);
    upper(() => drawArm(c, d, P.arms[0], true));
    if (legs) drawLeg(c, d, legs[0], true);
    if (legs) drawLeg(c, d, legs[1], false);
    else drawSprintLegs(c, d, P);
    upper(() => {
      drawTorso(c, d, P);
      drawHead(c, d, P);
      drawArm(c, d, P.arms[1], false);
    });
    c.restore();
  }

  // ---------- pose library ----------
  const GY = 16.2; // ankle height when planted
  function base() {
    return {
      by: 0, lean: 0, tail: 0.25, ears: 0, eye: 'open', mouth: 'smile',
      legs: [{ fx: -2.6, fy: GY }, { fx: 2.4, fy: GY }],
      arms: [{ a: -0.25, e: 0.5 }, { a: 0.15, e: 0.6 }],
    };
  }
  const POSES = {
    idle(i, n) {
      const P = base();
      const t = (i / n) * G.TAU;
      P.by = Math.round(-Math.sin(t) * 0.6 * 2) / 2;
      P.tail = 0.25 + Math.sin(t) * 0.12;
      P.arms = [{ a: -0.2 + Math.sin(t) * 0.05, e: 0.5 }, { a: 0.1, e: 0.7 + Math.sin(t) * 0.06 }];
      P.legs = [{ fx: -2.6, fy: GY - P.by }, { fx: 2.4, fy: GY - P.by }];
      if (i === 4) P.eye = 'blink';
      return P;
    },
    wait(i, n) {
      const P = base();
      const t = (i / n) * G.TAU;
      P.eye = 'look'; P.mouth = i % 4 < 2 ? 'smile' : 'grin';
      P.tail = 0.4 + Math.sin(t * 2) * 0.35;
      P.arms = [{ a: 0.9, e: 1.9 }, { a: 0.8, e: 2.0 }];
      P.legs = [{ fx: -2.6, fy: GY }, { fx: 4.2, fy: GY - (i % 2 ? 1.6 : 0), fa: i % 2 ? -0.35 : 0 }];
      P.ht = Math.sin(t) * 0.06;
      return P;
    },
    walk(i, n) {
      const P = base();
      const t = (i / n) * G.TAU;
      P.lean = 0.08;
      P.by = -Math.abs(Math.sin(t)) * 1.1 + 0.4;
      const leg = (ph) => {
        const fx = Math.cos(ph) * 6;
        const lift = Math.max(0, -Math.sin(ph)) * 3.6;
        return { fx: fx + 0.5, fy: GY - lift - P.by, fa: lift > 0.5 ? -0.35 * Math.cos(ph) : 0 };
      };
      P.legs = [leg(t + Math.PI), leg(t)];
      P.arms = [{ a: Math.cos(t) * 0.7, e: 0.6 }, { a: -Math.cos(t) * 0.7, e: 0.6 }];
      P.tail = 0.2 + Math.sin(t * 2) * 0.1;
      return P;
    },
    run(i, n) {
      const P = base();
      const t = (i / n) * G.TAU;
      P.lean = 0.28; P.ears = 0.45; P.mouth = 'grin';
      P.by = -Math.abs(Math.sin(t)) * 1.6 + 0.6;
      const leg = (ph) => {
        const fx = Math.cos(ph) * 8.2 + 1.2;
        const lift = Math.max(0, -Math.sin(ph)) * 6.5 + (Math.cos(ph) < 0 ? -Math.cos(ph) * 2 : 0);
        return { fx, fy: GY - lift - P.by, fa: -0.5 * Math.max(0, -Math.sin(ph)) };
      };
      P.legs = [leg(t + Math.PI), leg(t)];
      P.arms = [{ a: Math.cos(t) * 1.1, e: 1.5 }, { a: -Math.cos(t) * 1.1, e: 1.5 }];
      P.tail = 0.05 + Math.sin(t * 2) * 0.12;
      P.scarf = 0.6 + (i % 4) * 0.2;
      return P;
    },
    sprint(i, n) {
      const P = base();
      P.lean = 0.42; P.ears = 1; P.mouth = 'grin'; P.by = i % 2 ? -0.5 : 0;
      P.wheel = (i / n) * G.TAU;
      P.arms = [{ a: -1.35, e: 0.25 }, { a: -1.15, e: 0.35 }];
      P.tail = 0.05 + (i % 2) * 0.08;
      P.scarf = 1 + (i % 2) * 0.3;
      return P;
    },
    spin(i, n) { return { ball: true, spin: (i / n) * G.TAU }; },
    spindash(i, n) {
      return { ball: true, spin: (i / n) * G.TAU * 2, squash: 1.12, by: 1.5 };
    },
    twirl(i, n) {
      const P = base();
      const t = (i / n) * G.TAU;
      P.sx = Math.cos(t) >= 0 ? Math.max(0.25, Math.cos(t)) : Math.min(-0.25, Math.cos(t));
      P.eye = 'happy'; P.mouth = 'open';
      P.arms = [{ a: -2.2, e: 0.2 }, { a: 2.2, e: -0.2 }];
      P.legs = [{ a: -0.2, k: 0.6 }, { a: 0.3, k: 0.3 }];
      P.tail = 0.8;
      return P;
    },
    spring(i, n) {
      const P = base();
      P.eye = 'happy'; P.mouth = 'open';
      P.by = -1;
      P.arms = [{ a: Math.PI * 0.92 + (i % 2) * 0.1, e: 0.1 }, { a: Math.PI * 0.86 - (i % 2) * 0.1, e: -0.1 }];
      P.legs = [{ a: -0.15, k: 0.2 }, { a: 0.1, k: 0.15 }];
      P.tail = -0.7; P.ears = -0.15;
      return P;
    },
    fall(i, n) {
      const P = base();
      P.eye = 'wide'; P.mouth = 'o';
      const w = Math.sin((i / n) * G.TAU);
      P.arms = [{ a: 2.2 + w * 0.3, e: 0.5 }, { a: 2.0 - w * 0.3, e: 0.6 }];
      P.legs = [{ a: -0.3 + w * 0.2, k: 0.5 }, { a: 0.4 - w * 0.2, k: 0.8 }];
      P.tail = 0.6; P.ears = -0.2;
      return P;
    },
    skid(i, n) {
      const P = base();
      P.lean = -0.32; P.mouth = 'grit'; P.ears = -0.25; P.by = 1.2 + (i % 2) * 0.4;
      P.legs = [{ fx: -3.5, fy: GY - P.by }, { fx: 7.5, fy: GY - P.by + 0.2, fa: -0.35 }];
      P.arms = [{ a: -1.6, e: 0.3 }, { a: -0.9 + (i % 2) * 0.2, e: 0.6 }];
      P.tail = 0.9;
      return P;
    },
    push(i, n) {
      const P = base();
      const t = (i / n) * G.TAU;
      P.lean = 0.5; P.mouth = 'grit'; P.eye = 'half'; P.by = 1;
      P.legs = [{ fx: -6 + Math.sin(t) * 1.5, fy: GY - 1 }, { fx: -1.5 - Math.sin(t) * 1.5, fy: GY - 1 }];
      P.arms = [{ a: 1.45, e: 0.1 }, { a: 1.55, e: 0.05 }];
      return P;
    },
    crouch(i, n) {
      const P = base();
      P.by = 5; P.lean = 0.15; P.ears = 0.3; P.hy = 1;
      P.legs = [{ fx: -3, fy: GY - 5 }, { fx: 3.5, fy: GY - 5 }];
      P.arms = [{ a: 0.6, e: 0.6 }, { a: 0.8, e: 0.4 }];
      P.tail = 0.05;
      return P;
    },
    lookup(i, n) {
      const P = base();
      P.ht = -0.32; P.lean = -0.08; P.lookUp = true; P.mouth = 'o';
      P.arms = [{ a: -0.4, e: 0.4 }, { a: -0.2, e: 0.5 }];
      return P;
    },
    hurt(i, n) {
      const P = base();
      P.lean = -0.4; P.eye = 'hurt'; P.mouth = 'open'; P.ears = -0.3;
      P.arms = [{ a: 2.4, e: 0.4 }, { a: 2.0, e: 0.6 }];
      P.legs = [{ a: -0.6, k: 0.4 }, { a: 0.6, k: 0.9 }];
      P.tail = 1;
      P.bx = i % 2 ? 0.5 : 0;
      return P;
    },
    dead(i, n) {
      const P = base();
      P.eye = 'x'; P.mouth = 'open'; P.ears = -0.3;
      P.arms = [{ a: 2.7, e: 0.2 }, { a: 2.6, e: -0.2 }];
      P.legs = [{ a: -0.4, k: 0.3 }, { a: 0.4, k: 0.5 }];
      P.tail = -0.5;
      return P;
    },
    victory(i, n) {
      const P = base();
      // hop + fist pump + wink
      const hop = [0, -2, -4, -3, -1, 0][i % 6];
      P.by = hop;
      P.eye = i % 6 < 3 ? 'happy' : 'open';
      P.mouth = 'grin';
      P.legs = hop < 0 ? [{ a: -0.2, k: 0.6 }, { a: 0.35, k: 0.8 }] : [{ fx: -2.6, fy: GY }, { fx: 2.4, fy: GY }];
      P.arms = [{ a: -0.3, e: 1.6 }, { a: Math.PI * 0.82 + Math.sin(i) * 0.12, e: 0.25, thumb: true }];
      P.tail = 0.6 + (i % 2) * 0.2;
      return P;
    },
  };
  const COUNTS = { idle: 6, wait: 8, walk: 8, run: 8, sprint: 4, spin: 8, spindash: 6, twirl: 8, spring: 2, fall: 4, skid: 2, push: 4, crouch: 1, lookup: 1, hurt: 2, dead: 1, victory: 6 };

  const cache = {};
  G.Art = {
    charFrames(id, anim) {
      const key = id + ':' + anim;
      if (cache[key]) return cache[key];
      const d = G.CHARS[id];
      const n = COUNTS[anim] || 1;
      const arr = [];
      for (let i = 0; i < n; i++) {
        const P = POSES[anim](i, n);
        arr.push(G.renderPixel(SPR, SPR, (c) => drawChar(c, d, P), d.outline));
      }
      cache[key] = arr;
      return arr;
    },
    preloadChar(id) { for (const a in COUNTS) this.charFrames(id, a); },
    // big portrait for menus: render the pose at 2x logical size
    portrait(id, anim = 'idle', frame = 0, scale = 2) {
      const key = 'por:' + id + anim + frame + scale;
      if (cache[key]) return cache[key];
      const d = G.CHARS[id];
      const P = POSES[anim](frame, COUNTS[anim] || 1);
      const img = G.renderPixel(SPR * scale, SPR * scale, (c) => { c.scale(scale, scale); drawChar(c, d, P); }, d.outline);
      cache[key] = img;
      return img;
    },
    head(id) {
      const key = 'head:' + id;
      if (cache[key]) return cache[key];
      const d = G.CHARS[id];
      const P = base();
      P.mouth = 'grin';
      const img = G.renderPixel(28, 28, (c) => { c.translate(13, 19); drawHead(c, d, P); }, d.outline);
      cache[key] = img;
      return img;
    },
    _drawChar: drawChar, _poses: POSES,
  };
})(window.G);
