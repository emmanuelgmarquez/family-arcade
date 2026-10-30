// Console-style navigation: hardware keyboard and game controllers (MFi / Xbox / PlayStation
// controllers paired with the iPad all appear through the standard Gamepad API).

import { isSheetOpen, topSheet, closeTopSheet } from './ui.js';
import { isPlaying, isMenuOpen, openMenu, closeMenu } from './player.js';

const BTN = { A: 0, B: 1, X: 2, Y: 3, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, HOME: 16 };
const FOCUSABLE = 'button:not([disabled]), select, input:not([type=hidden]), [tabindex="0"], summary';

let handlers = {};

export function initInput(h) {
  handlers = h;
  window.addEventListener('keydown', onKey);
  window.addEventListener('gamepadconnected', startPolling);
  if (navigator.getGamepads && [...navigator.getGamepads()].some(Boolean)) startPolling();
}

/* ---------------- keyboard ---------------- */

function onKey(e) {
  if (isPlaying()) {
    if (!isMenuOpen()) return; // keys belong to the game
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); moveFocus(document.querySelector('.pause-card'), e.key === 'ArrowDown' ? 1 : -1); }
    return;
  }
  if (isSheetOpen()) {
    if (e.key === 'Escape') { e.preventDefault(); closeTopSheet(); }
    return;
  }
  const typing = /input|select|textarea/i.test(e.target.tagName);
  if (typing) return;
  switch (e.key) {
    case 'ArrowRight': e.preventDefault(); handlers.move?.(1); break;
    case 'ArrowLeft': e.preventDefault(); handlers.move?.(-1); break;
    case 'Home': e.preventDefault(); handlers.moveTo?.(0); break;
    case 'End': e.preventDefault(); handlers.moveTo?.(Infinity); break;
    case 'Enter':
    case ' ':
      if (e.target.closest && e.target.closest('button') && !e.target.closest('.tile')) return; // let real buttons work
      e.preventDefault(); handlers.activate?.(); break;
    case 'o': case 'O': case 'y': case 'Y': handlers.options?.(); break;
    case '+': case 'i': case 'I': handlers.import?.(); break;
    case ',': case 's': case 'S': handlers.settings?.(); break;
    default: break;
  }
}

/* ---------------- gamepads ---------------- */

let polling = false;
const prev = new Map(); // gamepad index -> pressed[]
const repeatAt = new Map();

function startPolling() {
  if (polling) return;
  polling = true;
  requestAnimationFrame(poll);
}

function poll(t) {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  if (!pads.length) { polling = false; return; }
  for (const pad of pads) {
    const pressed = pad.buttons.map((b) => b.pressed || b.value > 0.6);
    // Treat the left stick like a d-pad.
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    if (ax < -0.6) pressed[BTN.LEFT] = true;
    if (ax > 0.6) pressed[BTN.RIGHT] = true;
    if (ay < -0.6) pressed[BTN.UP] = true;
    if (ay > 0.6) pressed[BTN.DOWN] = true;
    const before = prev.get(pad.index) || [];
    for (let i = 0; i < pressed.length; i++) {
      const isDir = i >= BTN.UP && i <= BTN.RIGHT;
      const key = pad.index + ':' + i;
      if (pressed[i] && !before[i]) {
        repeatAt.set(key, t + 380);
        onButton(i, pressed);
      } else if (pressed[i] && isDir && t >= (repeatAt.get(key) || Infinity)) {
        repeatAt.set(key, t + 110);
        onButton(i, pressed);
      }
    }
    prev.set(pad.index, pressed);
  }
  requestAnimationFrame(poll);
}

function onButton(i, pressed) {
  if (isPlaying()) {
    if (!isMenuOpen()) {
      // In-game, only the Home button (or Select+Start together) belongs to the arcade.
      if (i === BTN.HOME || (pressed[BTN.SELECT] && pressed[BTN.START] && (i === BTN.SELECT || i === BTN.START))) openMenu();
      return;
    }
    const card = document.querySelector('.pause-card');
    if (i === BTN.UP || i === BTN.LEFT) moveFocus(card, -1);
    else if (i === BTN.DOWN || i === BTN.RIGHT) moveFocus(card, 1);
    else if (i === BTN.A) activateFocused(card);
    else if (i === BTN.B || i === BTN.HOME || i === BTN.START) closeMenu();
    return;
  }

  if (isSheetOpen()) {
    const sheet = topSheet().el;
    if (i === BTN.UP || i === BTN.LEFT) moveFocus(sheet, -1);
    else if (i === BTN.DOWN || i === BTN.RIGHT) moveFocus(sheet, 1);
    else if (i === BTN.A) activateFocused(sheet);
    else if (i === BTN.B) closeTopSheet();
    return;
  }

  switch (i) {
    case BTN.LEFT: handlers.move?.(-1); break;
    case BTN.RIGHT: handlers.move?.(1); break;
    case BTN.A: handlers.activate?.(); break;
    case BTN.Y: handlers.options?.(); break;
    case BTN.X: handlers.import?.(); break;
    case BTN.START: handlers.settings?.(); break;
    default: break;
  }
}

function focusables(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
}

export function moveFocus(container, dir) {
  if (!container) return;
  const list = focusables(container);
  if (!list.length) return;
  const i = list.indexOf(document.activeElement);
  const next = list[(i + dir + list.length) % list.length] || list[0];
  next.focus({ preventScroll: false });
  next.scrollIntoView?.({ block: 'nearest' });
  handlers.focusMoved?.();
}

function activateFocused(container) {
  const el = document.activeElement;
  if (!el || !container.contains(el)) { moveFocus(container, 1); return; }
  if (el.tagName === 'INPUT' && el.type === 'checkbox') { el.click(); return; }
  if (el.tagName === 'SELECT') {
    // Cycle through options with A since native pickers can't be driven by a controller.
    el.selectedIndex = (el.selectedIndex + 1) % el.options.length;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  el.click();
}
