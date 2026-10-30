// Full-screen game player: runs one game at a time in its own frame, with a
// floating return button, a pause menu and optional on-screen touch controls.

import { $, h, prefs, isStandalone, isTouchDevice, sleep } from './util.js';
import { getStore } from './storage/index.js';
import { library } from './library.js';
import { TouchControls, controlsEnabled } from './touch-controls.js';
import { tileBackground, coverUrl } from './art.js';
import { icon, confirmDialog, toast } from './ui.js';
import { sfx } from './sfx.js';

let root, stage, loading, tcLayer, homeBtn, menu, menuCard, orientHint;
let current = null;
let touch = null;
let onExitCallback = () => {};
let wakeLock = null;
let enteredFullscreen = false;

/* The runtime shim inside each game talks to the arcade through this object. */
window.FamilyArcadeHost = {
  launchOptions(gameId) {
    if (!current || current.game.id !== gameId) return {};
    return { touchHygiene: current.game.touchHygiene !== false };
  },
  requestExit() { if (current) exitGame(); },
  requestMenu() { if (current) openMenu(); },
  reportError(gameId, message) {
    if (!current) return;
    if (current.errors.length < 20) current.errors.push(message);
    console.warn('[Family Arcade] game error:', message);
  }
};

export const isPlaying = () => !!current;
export const isMenuOpen = () => !!current && current.menuOpen;

export function initPlayer({ onExit }) {
  onExitCallback = onExit || onExitCallback;
  root = $('#player');
  stage = h('div.player-stage');
  loading = h('div.player-loading');
  tcLayer = h('div.tc-layer');
  homeBtn = h('button.home-btn', { type: 'button', 'aria-label': 'Pause and return to the arcade' }, icon('home'));
  menuCard = h('div.pause-card');
  menu = h('div.pause', { hidden: true }, menuCard);
  orientHint = h('div.orient-hint', { hidden: true });
  root.append(stage, loading, tcLayer, homeBtn, menu, orientHint);
  touch = new TouchControls(tcLayer, (type, key) => {
    const rt = runtime();
    if (rt && rt.key) rt.key(type, key);
  });
  setupHomeButton();

  document.addEventListener('visibilitychange', () => {
    if (!current) return;
    if (document.hidden) {
      if (!current.menuOpen) openMenu({ silent: true });
      releaseWakeLock();
    } else {
      requestWakeLock();
    }
  });
  const portrait = matchMedia('(orientation: portrait)');
  portrait.addEventListener?.('change', updateOrientationHint);
}

function runtime() {
  try { return current && current.iframe.contentWindow && current.iframe.contentWindow.__FA_RUNTIME__; } catch (e) { return null; }
}

/* ---------------- launching ---------------- */

export async function launchGame(game) {
  if (current) await exitGame({ quiet: true });
  // Must happen synchronously inside the tap, before any await.
  enterFullscreen();
  sfx.launch();

  current = {
    game, iframe: null, startedAt: performance.now(), segmentStart: 0, playMs: 0,
    menuOpen: false, errors: [], touchVisible: prefs.get('touchVisible', true)
  };
  const session = current;
  root.style.setProperty('--game-color', game.color);
  renderLoading(game);
  root.hidden = false;
  document.body.classList.add('playing');
  requestAnimationFrame(() => root.classList.add('open'));

  let target;
  try {
    const store = await getStore();
    target = await store.launchTarget(game);
  } catch (err) {
    toast(err.message || 'This game could not start.', { tone: 'error' });
    await exitGame({ quiet: true });
    return;
  }
  if (current !== session) return;

  const iframe = h('iframe.game-frame', {
    title: game.title,
    allow: 'autoplay; fullscreen; gamepad; accelerometer; gyroscope; screen-wake-lock; clipboard-write'
  });
  iframe.addEventListener('load', () => onFrameLoad(session), { once: false });
  if (target.src) iframe.src = target.src;
  else iframe.srcdoc = target.srcdoc;
  session.iframe = iframe;
  stage.replaceChildren(iframe);

  library.update(game.id, { lastPlayedAt: Date.now(), playCount: (game.playCount || 0) + 1 });
  requestWakeLock();
  updateOrientationHint();
}

async function onFrameLoad(session) {
  if (current !== session) return;
  const elapsed = performance.now() - session.startedAt;
  if (elapsed < 900) await sleep(900 - elapsed);
  if (current !== session) return;
  loading.classList.add('done');
  session.segmentStart = performance.now();
  try { session.iframe.contentWindow.focus(); } catch (e) { /* ignore */ }

  const showTouch = controlsEnabled(session.game.controls) && (isTouchDevice() || prefs.get('touchOnDesktop', false));
  if (showTouch && !touch.el) {
    touch.mount(session.game.controls);
    touch.setVisible(session.touchVisible);
  }
}

function renderLoading(game) {
  loading.classList.remove('done');
  const art = h('div.load-cart', { style: { background: game.cover ? '#000' : tileBackground(game.color) } });
  if (game.cover) art.append(h('img', { src: coverUrl(game.cover), alt: '' }));
  else art.append(h('span.load-emoji', game.emoji));
  loading.replaceChildren(
    h('div.load-inner',
      h('div.load-slot', art),
      h('div.load-title', game.title),
      h('div.load-bar', h('span'))));
}

/* ---------------- pause menu ---------------- */

export function openMenu({ silent = false } = {}) {
  if (!current || current.menuOpen) return;
  current.menuOpen = true;
  accumulatePlayTime();
  touch.releaseAll();
  const rt = runtime();
  if (rt) rt.pause();
  if (!silent) sfx.open();
  renderMenu();
  menu.hidden = false;
  requestAnimationFrame(() => menu.classList.add('open'));
  const first = menuCard.querySelector('button');
  if (first) first.focus({ preventScroll: true });
}

export function closeMenu() {
  if (!current || !current.menuOpen) return;
  current.menuOpen = false;
  menu.classList.remove('open');
  setTimeout(() => { if (!current || !current.menuOpen) menu.hidden = true; }, 180);
  sfx.select();
  const rt = runtime();
  if (rt) rt.resume();
  current.segmentStart = performance.now();
  try { current.iframe.contentWindow.focus(); } catch (e) { /* ignore */ }
}

function renderMenu() {
  const g = current.game;
  const hasTouch = controlsEnabled(g.controls) && !!touch.el;
  const row = (ic, label, onClick, cls = '') => h('button.pause-btn' + cls, { type: 'button', onclick: onClick }, icon(ic), h('span', label));
  const art = h('div.pause-art', { style: { background: g.cover ? '#000' : tileBackground(g.color) } },
    g.cover ? h('img', { src: coverUrl(g.cover), alt: '' }) : h('span', g.emoji));

  menuCard.replaceChildren(
    h('div.pause-head', art, h('div', h('div.pause-label', 'PAUSED'), h('div.pause-title', g.title))),
    h('div.pause-list',
      row('play', 'Resume', () => closeMenu(), '.pause-primary'),
      row('restart', 'Restart game', () => restartGame()),
      hasTouch ? row('pad', current.touchVisible ? 'Hide touch controls' : 'Show touch controls', () => {
        current.touchVisible = !current.touchVisible;
        prefs.set('touchVisible', current.touchVisible);
        touch.setVisible(current.touchVisible);
        renderMenu();
      }) : null,
      row('home', 'Back to Arcade', () => exitGame(), '.pause-exit')),
    current.errors.length
      ? h('details.pause-errors', h('summary', `This game reported ${current.errors.length} error${current.errors.length > 1 ? 's' : ''}`),
        h('ul', current.errors.slice(0, 6).map((e) => h('li', e))))
      : '');
}

async function restartGame() {
  const ok = await confirmDialog({
    title: 'Restart game?',
    message: 'The game starts over from its title screen. Anything the game already saved is kept.',
    confirmLabel: 'Restart'
  });
  if (!ok || !current) return;
  const session = current;
  touch.releaseAll();
  menu.classList.remove('open');
  menu.hidden = true;
  session.menuOpen = false;
  session.errors = [];
  session.startedAt = performance.now();
  renderLoading(session.game);
  try {
    if (session.iframe.srcdoc) { const s = session.iframe.srcdoc; session.iframe.srcdoc = ''; session.iframe.srcdoc = s; }
    else session.iframe.contentWindow.location.reload();
  } catch (e) {
    const src = session.iframe.src; session.iframe.src = 'about:blank'; session.iframe.src = src;
  }
}

/* ---------------- exit ---------------- */

export async function exitGame({ quiet = false } = {}) {
  if (!current) return;
  const session = current;
  if (!session.menuOpen) accumulatePlayTime();
  // Pausing first fires the game's own "page hidden" handlers, which is when many games save.
  const rt = runtime();
  if (rt && !rt.isPaused()) rt.pause();
  current = null;
  if (!quiet) sfx.back();
  touch.unmount();
  await sleep(60);
  root.classList.remove('open');
  menu.classList.remove('open');
  menu.hidden = true;
  orientHint.hidden = true;
  if (session.iframe) session.iframe.remove();
  stage.replaceChildren();
  releaseWakeLock();
  exitFullscreen();
  document.body.classList.remove('playing');
  setTimeout(() => { if (!current) root.hidden = true; }, 250);

  const game = await library.get(session.game.id);
  if (game) await library.update(game.id, { playTimeMs: (game.playTimeMs || 0) + session.playMs, lastPlayedAt: Date.now() });
  onExitCallback(session.game.id);
}

function accumulatePlayTime() {
  if (current && current.segmentStart) {
    current.playMs += performance.now() - current.segmentStart;
    current.segmentStart = 0;
  }
}

/* ---------------- floating return button ---------------- */

function setupHomeButton() {
  homeBtn.dataset.corner = prefs.get('homeCorner', 'tl');
  let start = null;
  let dragging = false;
  let fadeTimer = null;
  const wake = () => {
    homeBtn.classList.remove('dim');
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => homeBtn.classList.add('dim'), 2500);
  };
  root.addEventListener('pointerdown', wake, true);

  homeBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dragging = false;
    homeBtn.setPointerCapture?.(e.pointerId);
    wake();
  });
  homeBtn.addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!dragging && Math.hypot(dx, dy) > 12) { dragging = true; homeBtn.classList.add('dragging'); }
    if (dragging) homeBtn.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  const finish = (e) => {
    if (!start || e.pointerId !== start.id) return;
    start = null;
    if (dragging) {
      const corner = (e.clientY < innerHeight / 2 ? 't' : 'b') + (e.clientX < innerWidth / 2 ? 'l' : 'r');
      homeBtn.dataset.corner = corner;
      prefs.set('homeCorner', corner);
      homeBtn.style.transform = '';
      homeBtn.classList.remove('dragging');
      dragging = false;
    } else if (e.type === 'pointerup') {
      if (current && current.menuOpen) closeMenu();
      else openMenu();
    }
  };
  homeBtn.addEventListener('pointerup', finish);
  homeBtn.addEventListener('pointercancel', finish);
  homeBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMenu(); } });
}

/* ---------------- orientation, fullscreen, wake lock ---------------- */

function updateOrientationHint() {
  if (!current) { orientHint.hidden = true; return; }
  const want = current.game.orientation;
  const portrait = matchMedia('(orientation: portrait)').matches;
  const wrong = (want === 'landscape' && portrait) || (want === 'portrait' && !portrait);
  if (!wrong || current.dismissedOrientation) { orientHint.hidden = true; return; }
  orientHint.replaceChildren(
    h('div.orient-card',
      h('div.orient-device' + (want === 'landscape' ? '.to-landscape' : '.to-portrait')),
      h('p', `Turn your iPad ${want === 'landscape' ? 'sideways' : 'upright'} to play ${current.game.title}.`),
      h('button.btn.btn-secondary', { type: 'button', onclick: () => { current.dismissedOrientation = true; orientHint.hidden = true; } }, 'Play anyway')));
  orientHint.hidden = false;
}

function enterFullscreen() {
  enteredFullscreen = false;
  if (isStandalone() || !prefs.get('fullscreen', true)) return;
  const el = document.documentElement;
  try {
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req && !(document.fullscreenElement || document.webkitFullscreenElement)) {
      const p = req.call(el, { navigationUI: 'hide' });
      enteredFullscreen = true;
      if (p && p.catch) p.catch(() => { enteredFullscreen = false; });
    }
  } catch (e) { enteredFullscreen = false; }
}

function exitFullscreen() {
  if (!enteredFullscreen) return;
  enteredFullscreen = false;
  try {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) return;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    const p = exit && exit.call(document);
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* ignore */ }
}

async function requestWakeLock() {
  try {
    if (navigator.wakeLock && !wakeLock && current) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (e) { wakeLock = null; }
}

function releaseWakeLock() {
  try { if (wakeLock) wakeLock.release(); } catch (e) { /* ignore */ }
  wakeLock = null;
}
