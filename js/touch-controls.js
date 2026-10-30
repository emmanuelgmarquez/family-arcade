// On-screen gamepad for keyboard-only games. Presses are turned into real keyboard
// events inside the game page (via the runtime shim), so the game's code is unchanged.

import { h } from './util.js';

export const KEYS = {
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  KeyW: { key: 'w', code: 'KeyW', keyCode: 87 },
  KeyA: { key: 'a', code: 'KeyA', keyCode: 65 },
  KeyS: { key: 's', code: 'KeyS', keyCode: 83 },
  KeyD: { key: 'd', code: 'KeyD', keyCode: 68 },
  Space: { key: ' ', code: 'Space', keyCode: 32 },
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
  ShiftLeft: { key: 'Shift', code: 'ShiftLeft', keyCode: 16 },
  ControlLeft: { key: 'Control', code: 'ControlLeft', keyCode: 17 },
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  KeyZ: { key: 'z', code: 'KeyZ', keyCode: 90 },
  KeyX: { key: 'x', code: 'KeyX', keyCode: 88 },
  KeyC: { key: 'c', code: 'KeyC', keyCode: 67 },
  KeyE: { key: 'e', code: 'KeyE', keyCode: 69 },
  KeyQ: { key: 'q', code: 'KeyQ', keyCode: 81 },
  KeyR: { key: 'r', code: 'KeyR', keyCode: 82 },
  KeyF: { key: 'f', code: 'KeyF', keyCode: 70 },
  KeyJ: { key: 'j', code: 'KeyJ', keyCode: 74 },
  KeyK: { key: 'k', code: 'KeyK', keyCode: 75 },
  KeyM: { key: 'm', code: 'KeyM', keyCode: 77 },
  KeyP: { key: 'p', code: 'KeyP', keyCode: 80 }
};

export const DPAD_CHOICES = [['off', 'No D-pad'], ['arrows', 'Arrow keys'], ['wasd', 'W A S D'], ['dual', '2 players: WASD left · arrows right']];
export const BUTTON_CHOICES = [
  ['none', '— none —'], ['Space', 'Space'], ['Enter', 'Enter'], ['KeyZ', 'Z'], ['KeyX', 'X'], ['KeyC', 'C'],
  ['ShiftLeft', 'Shift'], ['ControlLeft', 'Ctrl'], ['Escape', 'Esc'], ['KeyP', 'P'], ['KeyE', 'E'], ['KeyQ', 'Q'],
  ['KeyR', 'R'], ['KeyF', 'F'], ['KeyJ', 'J'], ['KeyK', 'K'], ['KeyM', 'M']
];
const LABEL = Object.fromEntries(BUTTON_CHOICES);

const DIRS = {
  arrows: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' },
  wasd: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }
};

export function normalizeControls(c) {
  if (!c || c === 'none' || c === 'off') return { dpad: 'off', a: 'none', b: 'none', start: 'none' };
  const pick = (k) => (KEYS[c[k]] ? c[k] : 'none');
  return {
    dpad: ['arrows', 'wasd', 'dual'].includes(c.dpad) ? c.dpad : 'off',
    a: pick('a'), b: pick('b'), start: pick('start')
  };
}

export function controlsEnabled(c) {
  return !!c && (c.dpad !== 'off' || c.a !== 'none' || c.b !== 'none' || c.start !== 'none');
}

export function describeControls(c) {
  if (!controlsEnabled(c)) return 'Off';
  const parts = [];
  if (c.dpad !== 'off') parts.push(c.dpad === 'dual' ? 'Two D-pads (2 players)' : c.dpad === 'wasd' ? 'D-pad (WASD)' : 'D-pad (arrows)');
  if (c.a !== 'none') parts.push('A = ' + LABEL[c.a]);
  if (c.b !== 'none') parts.push('B = ' + LABEL[c.b]);
  if (c.start !== 'none') parts.push('Start = ' + LABEL[c.start]);
  return parts.join(' · ');
}

export class TouchControls {
  /**
   * @param root     container element inside the player overlay
   * @param sendKey  (type: 'keydown'|'keyup'|'keypress', key: KEYS[x]) => void
   */
  constructor(root, sendKey) {
    this.root = root;
    this.sendKey = sendKey;
    this.down = new Set();
    this.config = null;
  }

  press(id) {
    if (!id || id === 'none' || this.down.has(id)) return;
    this.down.add(id);
    const k = KEYS[id];
    this.sendKey('keydown', k);
    if (k.key.length === 1 || k.key === 'Enter') this.sendKey('keypress', k);
  }

  release(id) {
    if (!id || !this.down.has(id)) return;
    this.down.delete(id);
    this.sendKey('keyup', KEYS[id]);
  }

  releaseAll() {
    for (const id of [...this.down]) this.release(id);
  }

  mount(config) {
    this.unmount();
    this.config = config;
    if (!controlsEnabled(config)) return;
    const wrap = h('div.tc');

    if (config.dpad === 'dual') {
      wrap.append(this.buildDpad(DIRS.wasd, 'tc-p2'), this.buildDpad(DIRS.arrows, 'tc-p1'));
    } else if (config.dpad !== 'off') {
      wrap.append(this.buildDpad(DIRS[config.dpad]));
    }

    const btns = h('div.tc-buttons');
    if (config.b !== 'none') btns.append(this.buildButton('B', config.b, 'tc-b'));
    if (config.a !== 'none') btns.append(this.buildButton('A', config.a, 'tc-a'));
    if (btns.children.length) wrap.append(btns);

    if (config.start !== 'none') wrap.append(this.buildButton('START', config.start, 'tc-start'));

    this.root.append(wrap);
    this.el = wrap;
  }

  unmount() {
    this.releaseAll();
    if (this.el) this.el.remove();
    this.el = null;
  }

  setVisible(visible) {
    if (this.el) this.el.classList.toggle('tc-hidden', !visible);
    if (!visible) this.releaseAll();
  }

  buildButton(label, keyId, cls) {
    const btn = h('div.tc-btn.' + cls, { role: 'button', 'aria-label': label + ' button' },
      h('span.tc-btn-label', label),
      label === 'START' ? null : h('span.tc-btn-key', LABEL[keyId]));
    const active = new Set();
    const on = (e) => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      active.add(e.pointerId);
      btn.classList.add('on');
      this.press(keyId);
    };
    const off = (e) => {
      if (!active.has(e.pointerId)) return;
      active.delete(e.pointerId);
      if (!active.size) {
        btn.classList.remove('on');
        this.release(keyId);
      }
    };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('lostpointercapture', off);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    return btn;
  }

  buildDpad(map, extraClass = '') {
    const arms = {};
    const pad = h('div.tc-dpad' + (extraClass ? '.' + extraClass : ''), { role: 'group', 'aria-label': 'Direction pad' },
      h('div.tc-dpad-ring'),
      ...['up', 'down', 'left', 'right'].map((d) => (arms[d] = h('div.tc-arm.tc-' + d, h('span.tc-arrow')))),
      h('div.tc-hub'));
    let pointer = null;
    let current = new Set();

    const apply = (next) => {
      for (const d of current) if (!next.has(d)) { this.release(map[d]); arms[d].classList.remove('on'); }
      for (const d of next) if (!current.has(d)) { this.press(map[d]); arms[d].classList.add('on'); }
      current = next;
    };
    const track = (e) => {
      const r = pad.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const next = new Set();
      if (Math.hypot(dx, dy) > 0.22) {
        const a = Math.atan2(dy, dx);
        const c = Math.cos(a), s = Math.sin(a);
        if (c > 0.38) next.add('right');
        if (c < -0.38) next.add('left');
        if (s > 0.38) next.add('down');
        if (s < -0.38) next.add('up');
      }
      apply(next);
    };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (pointer !== null) return;
      pointer = e.pointerId;
      pad.setPointerCapture?.(e.pointerId);
      track(e);
    });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === pointer) track(e); });
    const end = (e) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      apply(new Set());
    };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
    pad.addEventListener('lostpointercapture', end);
    pad.addEventListener('contextmenu', (e) => e.preventDefault());
    return pad;
  }
}
