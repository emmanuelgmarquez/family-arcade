// Family Arcade — home screen, import flow, game options and settings.

import {
  $, h, prefs, timeAgo, formatDuration, formatBytes, isTouchDevice, isStandalone, isIOS, sleep, mimeFor
} from './util.js';
import { library } from './library.js';
import { getStore } from './storage/index.js';
import { readImportFile, analyzePackage, installGame, quickInstall, shrinkImage } from './importer.js';
import { initPlayer, launchGame, isPlaying } from './player.js';
import { initInput } from './input.js';
import { sfx } from './sfx.js';
import {
  openSheet, toast, confirmDialog, icon, field, select, toggle, progressBar, button, isSheetOpen
} from './ui.js';
import { tileBackground, glowColors, coverUrl, EMOJIS, PALETTE } from './art.js';
import { DPAD_CHOICES, BUTTON_CHOICES, normalizeControls, describeControls, controlsEnabled } from './touch-controls.js';
import { saveSummary, resetSaves, buildBackup, restoreBackup } from './saves.js';
import { syncBundledGames, markBundledRemoved } from './bundled.js';

const APP_VERSION = '1.0.0';
const state = { games: [], index: 0, store: null, updateAccepted: false };

/* ================================================================== */
/* Boot                                                                */
/* ================================================================== */

boot();

async function boot() {
  const started = performance.now();
  setSplash('Starting the arcade…');
  try {
    state.store = await getStore();
  } catch (err) {
    showFatal(err);
    return;
  }
  initPlayer({ onExit: (id) => refresh(id) });
  initInput({
    move: (d) => selectIndex(state.index + d),
    moveTo: (i) => selectIndex(Math.min(i, state.games.length)),
    activate: () => activateSelected(),
    options: () => { const g = currentGame(); if (g) openOptions(g); },
    import: () => startImport(),
    settings: () => openSettings()
  });
  wireTopbar();
  wireDragAndDrop();
  await refresh(prefs.get('selectedId'));

  const wait = 900 - (performance.now() - started);
  if (wait > 0) await sleep(wait);
  $('#app').hidden = false;
  requestAnimationFrame(() => updateSelection('instant'));
  $('#splash').classList.add('gone');
  setTimeout(() => $('#splash').remove(), 600);

  watchForUpdates();
  syncBundledGames(
    (label, done, total) => toast(total > 1 ? `${label} (${done + 1} of ${total})` : label, { duration: 0 }),
    (game) => refresh(state.games.length ? undefined : game.id)
  ).then((added) => {
    if (added.length) {
      refresh(state.games.length ? undefined : added[0].id);
      toast(added.length === 1 ? `${added[0].title} was added to the arcade.` : `${added.length} games are ready to play!`, { tone: 'success' });
    } else {
      document.getElementById('toast')?.classList.remove('show');
    }
  });
  maybeShowInstallTip();
}

function setSplash(msg) {
  const el = $('#splash-msg');
  if (el) el.textContent = msg;
}

function showFatal(err) {
  console.error(err);
  const splash = $('#splash');
  splash.classList.add('fatal');
  setSplash('');
  $('.splash-bar', splash)?.remove();
  splash.querySelector('.splash-inner').append(
    h('div.fatal-box',
      h('h2', 'The arcade can’t start here'),
      h('p', err.message || String(err)),
      err.code === 'insecure'
        ? h('p.fatal-hint', 'Open it from an https:// address (for example GitHub Pages, Netlify or Cloudflare Pages), or from http://localhost on a computer. After the first visit it works offline.')
        : h('p.fatal-hint', 'Try closing and reopening Family Arcade.')));
}

/* ================================================================== */
/* Library state                                                       */
/* ================================================================== */

function sortGames(list) {
  if (prefs.get('sort', 'recent') === 'az') return list.slice().sort((a, b) => a.title.localeCompare(b.title));
  return list.slice().sort((a, b) => (b.lastPlayedAt || b.addedAt) - (a.lastPlayedAt || a.addedAt));
}

const currentGame = () => state.games[state.index] || null;

async function refresh(selectId) {
  const keepId = selectId || (currentGame() && currentGame().id) || null;
  state.games = sortGames(await library.all());
  let i = keepId ? state.games.findIndex((g) => g.id === keepId) : -1;
  if (i < 0) i = Math.min(state.index, state.games.length);
  if (!state.games.length) i = 0;
  state.index = i;
  renderShelf();
  renderHero();
  renderHints();
}

/* ================================================================== */
/* Home screen                                                         */
/* ================================================================== */

function renderShelf() {
  const c = $('#carousel');
  c.replaceChildren(...state.games.map((g, i) => buildTile(g, i)), buildAddTile(state.games.length));
  updateSelection('instant');
}

function tileArt(g, coverSrc) {
  const src = coverSrc !== undefined ? coverSrc : coverUrl(g.cover);
  return h('div.tile-art', { style: { background: src ? '#0d0f1c' : tileBackground(g.color) } },
    src ? h('img', { src, alt: '', draggable: false }) : h('span.tile-emoji', g.emoji),
    h('span.tile-shine'));
}

function buildTile(g, i) {
  const el = h('button.tile', { type: 'button', role: 'option', 'aria-label': g.title, style: { '--tile-color': g.color } },
    tileArt(g),
    h('span.tile-title', g.title));
  attachPress(el, i, () => openOptions(g));
  return el;
}

function buildAddTile(i) {
  const el = h('button.tile.tile-add', { type: 'button', role: 'option', 'aria-label': 'Add a game' },
    h('div.tile-art', icon('plus'), h('span.tile-add-label', 'Add game')),
    h('span.tile-title', 'Add game'));
  attachPress(el, i, null);
  return el;
}

function attachPress(el, i, onLongPress) {
  let timer = null, longPressed = false, start = null;
  el.addEventListener('pointerdown', (e) => {
    sfx.unlock();
    longPressed = false;
    start = { x: e.clientX, y: e.clientY };
    if (onLongPress) {
      timer = setTimeout(() => {
        longPressed = true;
        if (state.index !== i) selectIndex(i, { sound: false });
        onLongPress();
      }, 520);
    }
  });
  const cancel = () => { clearTimeout(timer); timer = null; };
  el.addEventListener('pointermove', (e) => { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancel(); });
  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('click', (e) => {
    e.preventDefault();
    if (longPressed) { longPressed = false; return; }
    if (state.index === i) activateSelected();
    else selectIndex(i);
  });
}

function selectIndex(i, { sound = true, scroll = true } = {}) {
  const max = state.games.length; // last slot is the "Add game" tile
  const next = Math.max(0, Math.min(max, i));
  if (next === state.index && i === next) { if (scroll) updateSelection(true); return; }
  state.index = next;
  const g = currentGame();
  if (g) prefs.set('selectedId', g.id);
  if (sound && next === i) sfx.move();
  updateSelection(scroll);
  renderHero();
}

function updateSelection(scroll) {
  const c = $('#carousel');
  const tiles = [...c.children];
  tiles.forEach((t, i) => {
    const on = i === state.index;
    t.classList.toggle('selected', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
  });
  const tile = tiles[state.index];
  if (tile && scroll !== false) {
    const left = tile.offsetLeft - (c.clientWidth - tile.offsetWidth) / 2;
    c.scrollTo({ left, behavior: scroll === true ? 'smooth' : 'auto' });
  }
  const g = currentGame();
  const [c1, c2, c3] = glowColors(g ? g.color : '#7c5cff');
  const root = document.documentElement.style;
  root.setProperty('--glow-1', c1);
  root.setProperty('--glow-2', c2);
  root.setProperty('--glow-3', c3);
}

function activateSelected() {
  sfx.unlock();
  const g = currentGame();
  if (g) play(g);
  else startImport();
}

function play(g) {
  if (isPlaying()) return;
  launchGame(g);
}

function renderHero() {
  const hero = $('#hero');
  const g = currentGame();
  let content;
  if (!state.games.length) content = welcomeHero();
  else if (!g) content = addHero();
  else content = gameHero(g);
  hero.replaceChildren(content);
  hero.classList.remove('swap');
  void hero.offsetWidth;
  hero.classList.add('swap');
}

function gameHero(g) {
  const n = state.games.length;
  const meta = [
    g.lastPlayedAt ? `Played ${timeAgo(g.lastPlayedAt).toLowerCase()}` : 'New — never played',
    g.playTimeMs > 60000 ? `${formatDuration(g.playTimeMs)} total` : null,
    controlsEnabled(g.controls) ? 'On-screen controls' : null
  ].filter(Boolean);
  const needsNet = g.missingExternal && g.missingExternal.length;
  return h('div.hero-inner',
    h('div.hero-text',
      h('div.hero-kicker', `GAME ${String(state.index + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`),
      h('h1.hero-title', g.title),
      g.description ? h('p.hero-desc', g.description) : null,
      h('div.hero-meta', meta.map((m) => h('span.meta-item', m)),
        needsNet ? h('span.meta-item.meta-warn', icon('wifiOff'), 'Needs internet for some parts') : null),
      h('div.hero-actions',
        button({ label: 'Play', kind: 'play', glyph: 'A', onClick: () => play(g) }),
        button({ label: 'Options', kind: 'ghost', glyph: 'Y', onClick: () => openOptions(g) }))),
    h('div.hero-show',
      h('div.showcase', { style: { '--tile-color': g.color } }, tileArt(g), h('div.showcase-glare'))));
}

function addHero() {
  return h('div.hero-inner',
    h('div.hero-text',
      h('div.hero-kicker', 'NEW CARTRIDGE'),
      h('h1.hero-title', 'Add a game'),
      h('p.hero-desc', 'Import a game made in Claude — a single .html file, or a .zip of the game’s folder. It’s stored on this iPad and plays offline.'),
      h('div.hero-actions',
        button({ label: 'Choose file', kind: 'play', glyph: 'A', onClick: () => startImport() }),
        button({ label: 'How it works', kind: 'ghost', onClick: () => openHelp() }))),
    h('div.hero-show', h('div.showcase.showcase-add', h('div.tile-art', icon('plus')))));
}

function welcomeHero() {
  return h('div.hero-inner.hero-welcome',
    h('div.hero-text',
      h('div.hero-kicker', 'PRESS START'),
      h('h1.hero-title', 'Welcome to the Family Arcade'),
      h('p.hero-desc', 'Your library is empty. Add the games you’ve made in Claude — each one gets its own save slot and plays full-screen, even with no internet.'),
      h('div.hero-actions',
        button({ label: 'Add your first game', kind: 'play', icon: 'plus', onClick: () => startImport() }),
        button({ label: 'How it works', kind: 'ghost', onClick: () => openHelp() }))),
    h('div.hero-show', h('div.showcase.showcase-empty',
      h('div.cart-slot', h('div.cart-slot-mouth'), h('div.cart-slot-label', 'INSERT GAME')))));
}

function renderHints() {
  const hasPad = navigator.getGamepads && [...navigator.getGamepads()].some(Boolean);
  const hint = (glyph, text) => h('span.hint', glyph ? h('span.glyph.glyph-' + glyph.toLowerCase(), glyph) : null, text);
  let items;
  if (hasPad) items = [hint('A', 'Play'), hint('Y', 'Options'), hint('X', 'Add game'), hint('≡', 'Settings')];
  else if (isTouchDevice()) items = [h('span.hint', 'Tap a game to choose it · tap again to play'), h('span.hint', 'Hold a game for options')];
  else items = [hint('←→', 'Choose'), hint('↵', 'Play'), hint('O', 'Options'), hint('I', 'Add game')];
  $('#hints').replaceChildren(...items);
}
window.addEventListener('gamepadconnected', () => { renderHints(); toast('Controller connected 🎮', { tone: 'success' }); });
window.addEventListener('gamepaddisconnected', renderHints);

/* ================================================================== */
/* Top bar                                                             */
/* ================================================================== */

function wireTopbar() {
  $('#btn-import').append(icon('plus'));
  $('#btn-settings').append(icon('gear'));
  const soundBtn = $('#btn-sound');
  const paintSound = () => soundBtn.replaceChildren(icon(sfx.enabled ? 'soundOn' : 'soundOff'));
  paintSound();
  soundBtn.addEventListener('click', () => { sfx.setEnabled(!sfx.enabled); paintSound(); });
  $('#btn-import').addEventListener('click', () => startImport());
  $('#btn-settings').addEventListener('click', () => openSettings());

  const clock = $('#clock');
  const tick = () => { clock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
  tick();
  setInterval(tick, 15000);

  $('#offline-pill').hidden = !navigator.serviceWorker || !navigator.serviceWorker.controller;
}

function wireDragAndDrop() {
  window.addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('dropping'); });
  window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dropping'); });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    document.body.classList.remove('dropping');
    const files = [...(e.dataTransfer?.files || [])];
    if (files.length && !isPlaying()) handleFiles(files);
  });
}

/* ================================================================== */
/* Import                                                              */
/* ================================================================== */

function startImport({ updateGame = null } = {}) {
  if (isPlaying()) return;
  sfx.unlock();
  const input = $('#file-input');
  input.value = '';
  input.multiple = !updateGame;
  input.onchange = () => {
    const files = [...input.files];
    if (files.length) handleFiles(files, { updateGame });
  };
  input.click();
}

function busy(text) {
  return h('div.busy', h('div.spinner'), h('p', text));
}

function errorBox(err) {
  return h('div.error-box', icon('info'), h('p', err.message || String(err)));
}

async function handleFiles(files, { updateGame = null } = {}) {
  if (files.length === 1) {
    const sheet = openSheet({ title: updateGame ? `Update ${updateGame.title}` : 'Add a game', className: 'sheet-wide', body: busy(`Reading ${files[0].name}…`) });
    try {
      const pkg = await readImportFile(files[0]);
      const games = await library.all();
      const analysis = analyzePackage(pkg, games);
      if (updateGame) {
        analysis.existing = games.find((g) => g.id === updateGame.id) || updateGame;
        analysis.id = updateGame.id;
      }
      renderReview(sheet, analysis, { forceUpdate: !!updateGame });
    } catch (err) {
      sfx.error();
      sheet.setBody(errorBox(err));
      sheet.setActions([{ label: 'Close', onClick: () => sheet.close() }]);
    }
    return;
  }

  const sheet = openSheet({ title: `Adding ${files.length} games`, dismissible: false });
  const bar = progressBar();
  const log = h('ul.batch-log');
  sheet.setBody(bar.el, log);
  let ok = 0, lastId = null;
  for (const [i, f] of files.entries()) {
    bar.set(`Installing ${f.name} —`, i, files.length);
    try {
      const pkg = await readImportFile(f);
      const g = await quickInstall(pkg);
      ok++;
      lastId = g.id;
      log.append(h('li.ok', icon('check'), h('span', g.title), g.missingExternal.length ? h('em', ' (needs internet for some parts)') : null));
    } catch (err) {
      log.append(h('li.bad', icon('close'), h('span', `${f.name}: ${err.message}`)));
    }
  }
  bar.set(`Done — ${ok} of ${files.length} added.`);
  ok ? sfx.success() : sfx.error();
  sheet.dismissible = true;
  sheet.setActions([{ label: 'Done', kind: 'primary', onClick: () => sheet.close() }]);
  await refresh(lastId);
}

function renderReview(sheet, a, { forceUpdate }) {
  const ex = a.existing;
  const keepLook = forceUpdate && ex;
  const choice = {
    mode: ex ? 'update' : 'new',
    title: keepLook ? ex.title : a.title,
    emoji: keepLook ? ex.emoji : a.emoji,
    color: keepLook ? ex.color : a.color,
    useCover: !!a.coverPath,
    entry: a.entry,
    controls: { ...(keepLook && ex.controls ? ex.controls : a.controls) },
    orientation: keepLook && ex.orientation ? ex.orientation : a.orientation,
    captureExternal: true
  };
  let coverSrc = null;
  if (a.coverPath) {
    const f = a.pkg.files.find((x) => x.path === a.coverPath);
    if (f) coverSrc = URL.createObjectURL(new Blob([f.data], { type: mimeFor(f.path).split(';')[0] }));
  }

  const preview = h('div.review-preview');
  const paintPreview = () => {
    const fake = { title: choice.title || 'Untitled', emoji: choice.emoji, color: choice.color };
    preview.replaceChildren(
      h('div.showcase.showcase-small', { style: { '--tile-color': choice.color } }, tileArt(fake, choice.useCover ? coverSrc : null), h('div.showcase-glare')),
      h('div.review-title', fake.title),
      h('div.review-stats', `${a.fileCount} file${a.fileCount === 1 ? '' : 's'} · ${formatBytes(a.size)}`));
  };
  paintPreview();

  const appearance = lookEditor(choice, { hasCover: !!a.coverPath, onChange: paintPreview });

  const parts = [];
  if (ex && !forceUpdate) {
    const modeRow = h('div.mode-choice',
      modeCard('update', `Update “${ex.title}”`, 'Replaces the old version. Saved progress is kept.'),
      modeCard('new', 'Add as a separate game', 'Keeps both. The new copy starts with fresh progress.'));
    function modeCard(value, title, text) {
      const card = h('button.mode-card', { type: 'button', onclick: () => {
        choice.mode = value;
        [...modeRow.children].forEach((c) => c.classList.toggle('on', c === card));
      } }, h('strong', title), h('span', text));
      if (choice.mode === value) card.classList.add('on');
      return card;
    }
    parts.push(h('section.form-section', h('h3', 'This game is already in your arcade'), modeRow));
  }

  parts.push(h('section.form-section', h('h3', 'Look'), appearance));

  const controlsSection = h('section.form-section',
    h('h3', 'Touch controls'),
    a.controlsSuggested ? h('p.suggest', icon('pad'), 'This game looks keyboard-only, so on-screen buttons are turned on. Adjust if needed.') : null,
    controlsEditor(choice.controls, () => {}));
  parts.push(controlsSection);

  const advanced = [];
  if (a.candidates.length > 1) {
    advanced.push(field('Start page', select(a.candidates.map((c) => [c, c]), choice.entry, (v) => { choice.entry = v; })));
  }
  advanced.push(field('Screen orientation', select([['any', 'Any'], ['landscape', 'Landscape (sideways)'], ['portrait', 'Portrait (upright)']], choice.orientation, (v) => { choice.orientation = v; })));
  parts.push(h('section.form-section', h('h3', 'Game setup'), h('div.grid-2', advanced)));

  if (a.warnings.length) {
    const box = h('section.form-section.notes', h('h3', 'Good to know'),
      h('ul.note-list', a.warnings.map((w) => h('li', w.text))));
    if (a.external.length) {
      if (state.store.supportsExternalCapture && navigator.onLine) {
        box.append(toggle(true, (v) => { choice.captureExternal = v; }, 'Save these online files so the game works offline (recommended)'));
      } else if (!navigator.onLine) {
        box.append(h('p.field-hint', 'You’re offline right now. Import again while connected to save the online files for offline play.'));
      }
    }
    parts.push(box);
  }

  sheet.setTitle(forceUpdate ? `Update ${ex.title}` : 'Add a game');
  sheet.setBody(h('div.review', preview, h('div.review-form', parts)));
  sheet.setActions([
    { label: 'Cancel', onClick: () => sheet.close() },
    { label: forceUpdate || (ex && choice.mode === 'update') ? 'Update game' : 'Add to arcade', kind: 'primary', icon: 'check', onClick: () => doInstall() }
  ]);

  async function doInstall() {
    sheet.dismissible = false;
    const bar = progressBar();
    sheet.setBody(h('div.installing', preview, bar.el));
    sheet.setActions([]);
    try {
      const game = await installGame(a, { ...choice, mode: forceUpdate ? 'update' : choice.mode, controls: normalizeControls(choice.controls) },
        ({ label, done, total }) => bar.set(label, done, total));
      if (coverSrc) URL.revokeObjectURL(coverSrc);
      sfx.success();
      sheet.close();
      await refresh(game.id);
      const missing = game.missingExternal.length;
      toast(missing ? `${game.title} added. Some online files couldn’t be saved — it may need internet.` : `${game.title} is ready to play!`,
        { tone: missing ? 'warn' : 'success', duration: 6000, action: { label: 'Play', onClick: () => play(game) } });
    } catch (err) {
      console.error(err);
      sfx.error();
      sheet.dismissible = true;
      sheet.setBody(errorBox(new Error('Install failed: ' + (err.message || err) + (err.name === 'QuotaExceededError' ? ' — the iPad may be out of storage.' : ''))));
      sheet.setActions([{ label: 'Close', onClick: () => sheet.close() }]);
    }
  }
}

/** Title, icon, color (and cover on/off) editor shared by import and options. */
function lookEditor(model, { hasCover, onChange }) {
  const wrap = h('div.look-editor');
  const titleInput = h('input.input', {
    value: model.title, maxlength: 60, autocomplete: 'off', spellcheck: false,
    oninput: (e) => { model.title = e.target.value; onChange('title'); }
  });
  const emojiGrid = h('div.emoji-grid');
  const paintEmoji = () => {
    emojiGrid.classList.toggle('muted', !!(hasCover && model.useCover));
    emojiGrid.replaceChildren(...EMOJIS.map((em) => h('button.emoji' + (em === model.emoji ? '.on' : ''), {
      type: 'button', 'aria-label': 'Icon ' + em,
      onclick: () => { model.emoji = em; if (hasCover) model.useCover = false; paintEmoji(); paintCover(); onChange('emoji'); }
    }, em)));
  };
  const swatches = h('div.swatches');
  const paintSwatches = () => swatches.replaceChildren(...PALETTE.map((c) => h('button.swatch' + (c === model.color ? '.on' : ''), {
    type: 'button', 'aria-label': 'Color ' + c, style: { background: c },
    onclick: () => { model.color = c; paintSwatches(); onChange('color'); }
  })));
  const coverRow = h('div');
  const paintCover = () => {
    coverRow.replaceChildren(hasCover
      ? toggle(!!model.useCover, (v) => { model.useCover = v; paintEmoji(); onChange('cover'); }, 'Use the picture that came with the game')
      : '');
  };
  paintEmoji(); paintSwatches(); paintCover();
  wrap.append(field('Name', titleInput), coverRow, field('Icon', emojiGrid), field('Color', swatches));
  return wrap;
}

function controlsEditor(c, onChange) {
  const wrap = h('div.controls-editor');
  const render = () => {
    const btnFields = [
      field('A button', select(BUTTON_CHOICES, c.a, (v) => { c.a = v; onChange(c); })),
      field('B button', select(BUTTON_CHOICES, c.b, (v) => { c.b = v; onChange(c); })),
      field('Start button', select(BUTTON_CHOICES, c.start, (v) => { c.start = v; onChange(c); }))
    ];
    wrap.replaceChildren(
      h('div.preset-row',
        presetBtn('Off', { dpad: 'off', a: 'none', b: 'none', start: 'none' }),
        presetBtn('Arrows + Space', { dpad: 'arrows', a: 'Space', b: 'Enter', start: 'Escape' }),
        presetBtn('WASD + Space', { dpad: 'wasd', a: 'Space', b: 'ShiftLeft', start: 'Escape' }),
        presetBtn('Buttons only', { dpad: 'off', a: 'Space', b: 'Enter', start: 'none' })),
      h('div.grid-2',
        field('D-pad', select(DPAD_CHOICES, c.dpad, (v) => { c.dpad = v; onChange(c); })),
        ...btnFields),
      h('p.field-hint', 'On-screen buttons press these keys inside the game. Turn them off for games that already have their own touch controls.'));
  };
  function presetBtn(label, preset) {
    const on = c.dpad === preset.dpad && c.a === preset.a && c.b === preset.b && c.start === preset.start;
    return h('button.chip' + (on ? '.on' : ''), { type: 'button', onclick: () => { Object.assign(c, preset); onChange(c); render(); } }, label);
  }
  render();
  return wrap;
}

/* ================================================================== */
/* Game options                                                        */
/* ================================================================== */

async function openOptions(game) {
  if (isPlaying()) return;
  let g = await library.get(game.id);
  if (!g) return;
  const sheet = openSheet({ title: g.title, subtitle: 'Game options', className: 'sheet-wide' });

  const model = { title: g.title, emoji: g.emoji, color: g.color, useCover: !!g.cover };
  let saveTimer = null;
  const save = (changes) => {
    Object.assign(g, changes);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await library.update(g.id, changes);
      await refresh(g.id);
    }, 200);
  };

  const preview = h('div.review-preview');
  const paintPreview = () => {
    preview.replaceChildren(
      h('div.showcase.showcase-small', { style: { '--tile-color': model.color } }, tileArt({ ...g, ...model }, model.useCover ? coverUrl(g.cover) : null), h('div.showcase-glare')),
      h('div.review-title', model.title || g.title),
      h('div.review-stats', g.lastPlayedAt ? `Played ${g.playCount || 0}× · ${formatDuration(g.playTimeMs)}` : 'Not played yet'),
      h('div.options-quick',
        button({ label: 'Play', kind: 'play', icon: 'play', onClick: () => { sheet.close(); play(g); } }),
        button({ label: 'Update game…', kind: 'secondary', icon: 'upload', onClick: () => { sheet.close(); startImport({ updateGame: g }); } })));
  };

  const look = lookEditor(model, {
    hasCover: !!(g.cover || g.coverPath),
    onChange: async (what) => {
      paintPreview();
      if (what === 'title') { if (model.title.trim()) save({ title: model.title.trim() }); sheet.setTitle(model.title || g.title); }
      if (what === 'emoji') save({ emoji: model.emoji, ...(g.cover && !model.useCover ? { cover: null } : {}) });
      if (what === 'color') save({ color: model.color });
      if (what === 'cover') {
        if (model.useCover && !g.cover && g.coverPath) {
          const bytes = await state.store.readFile(g.storeKey, g.coverPath);
          if (bytes) { g.cover = await shrinkImage(new Blob([bytes], { type: mimeFor(g.coverPath).split(';')[0] })); }
          paintPreview();
        }
        save({ cover: model.useCover ? g.cover : null });
      }
    }
  });
  paintPreview();

  const controls = { ...normalizeControls(g.controls) };
  const savesInfo = h('p.field-hint', 'Checking…');
  saveSummary(g.id).then((s) => {
    savesInfo.textContent = s.items || s.databases
      ? `${s.items} saved item${s.items === 1 ? '' : 's'}${s.databases ? ` + ${s.databases} database${s.databases === 1 ? '' : 's'}` : ''} (${formatBytes(s.bytes)}). Kept separate from every other game.`
      : 'Nothing saved yet.';
  });

  const info = [
    ['Start page', g.entry],
    ['Files', `${g.fileCount} · ${formatBytes(g.size)}`],
    ['Imported from', g.sourceName || '—'],
    ['Added', new Date(g.addedAt).toLocaleDateString()],
    ['Updated', new Date(g.updatedAt).toLocaleDateString()]
  ];
  if (g.external && g.external.length) {
    info.push(['Online files', `${(g.capturedExternal || []).length} of ${g.external.length} saved for offline play`]);
  }

  sheet.setBody(h('div.review', preview, h('div.review-form',
    h('section.form-section', h('h3', 'Look'), look),
    h('section.form-section', h('h3', 'Touch controls'), controlsEditor(controls, (c) => save({ controls: normalizeControls(c) }))),
    h('section.form-section', h('h3', 'Play settings'),
      h('div.grid-2',
        field('Screen orientation', select([['any', 'Any'], ['landscape', 'Landscape (sideways)'], ['portrait', 'Portrait (upright)']], g.orientation || 'any', (v) => save({ orientation: v })))),
      toggle(g.touchHygiene !== false, (v) => save({ touchHygiene: v }), 'Block text selection and long-press menus inside the game (recommended for kids)')),
    h('section.form-section', h('h3', 'Saved progress'), savesInfo,
      button({ label: 'Reset progress…', kind: 'secondary', icon: 'restart', onClick: async () => {
        const ok = await confirmDialog({ title: `Reset ${g.title}?`, message: 'All saved progress, scores and settings for this game will be erased. This can’t be undone.', confirmLabel: 'Reset', danger: true });
        if (!ok) return;
        await resetSaves(g.id);
        savesInfo.textContent = 'Nothing saved yet.';
        toast(`${g.title} was reset.`);
      } })),
    h('section.form-section', h('h3', 'About this game'),
      h('dl.info-list', info.map(([k, v]) => [h('dt', k), h('dd', v)])),
      g.warnings && g.warnings.length ? h('ul.note-list', g.warnings.map((w) => h('li', w))) : null),
    h('section.form-section.danger-zone',
      button({ label: 'Remove from arcade…', kind: 'danger', icon: 'trash', onClick: () => removeGame(g, sheet) })))));
  sheet.setActions([{ label: 'Done', kind: 'primary', onClick: () => sheet.close() }]);
}

async function removeGame(g, sheet) {
  let erase = true;
  const ok = await confirmDialog({
    title: `Remove ${g.title}?`,
    message: 'The game’s files are deleted from this iPad. You can import it again later.',
    confirmLabel: 'Remove',
    danger: true,
    extra: toggle(true, (v) => { erase = v; }, 'Also erase its saved progress')
  });
  if (!ok) return;
  await state.store.deleteGame(g.storeKey);
  const others = (await library.all()).filter((x) => x.id !== g.id);
  const stillUsed = new Set(others.flatMap((x) => x.capturedExternal || []));
  await state.store.releaseExternal((g.capturedExternal || []).filter((u) => !stillUsed.has(u)));
  await library.remove(g.id);
  if (erase) await resetSaves(g.id);
  if (g.source === 'bundled') markBundledRemoved(g.id);
  sheet.close();
  await refresh();
  toast(`${g.title} was removed.`);
}

/* ================================================================== */
/* Settings & help                                                     */
/* ================================================================== */

async function openSettings() {
  if (isPlaying() || isSheetOpen()) return;
  const sheet = openSheet({ title: 'Settings', className: 'sheet-wide' });
  const storageLine = h('p.field-hint', 'Checking storage…');
  const est = await (state.store.estimate ? state.store.estimate() : null);
  let persisted = null;
  try { persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) { /* ignore */ }
  storageLine.textContent = est && est.quota
    ? `Using ${formatBytes(est.usage)} of ${formatBytes(est.quota)} available to the arcade.` + (persisted ? ' Protected from automatic cleanup.' : '')
    : 'Storage details aren’t available on this device.';

  const version = await swVersion();
  const games = await library.all();

  sheet.setBody(h('div.settings',
    h('section.form-section', h('h3', 'Arcade'),
      toggle(sfx.enabled, (v) => { sfx.setEnabled(v); $('#btn-sound').replaceChildren(icon(v ? 'soundOn' : 'soundOff')); }, 'Menu sound effects'),
      isStandalone() ? null : toggle(prefs.get('fullscreen', true), (v) => prefs.set('fullscreen', v), 'Go full screen when a game starts'),
      isTouchDevice() ? null : toggle(prefs.get('touchOnDesktop', false), (v) => prefs.set('touchOnDesktop', v), 'Show on-screen controls on this computer (for testing)'),
      h('div.grid-2',
        field('Library order', select([['recent', 'Recently played first'], ['az', 'A to Z']], prefs.get('sort', 'recent'), (v) => { prefs.set('sort', v); refresh(); })),
        field('Return button', button({ label: 'Move back to top-left', kind: 'secondary', onClick: () => { prefs.set('homeCorner', 'tl'); const b = document.querySelector('.home-btn'); if (b) b.dataset.corner = 'tl'; toast('Return button moved.'); } })))),
    h('section.form-section', h('h3', 'Saved progress'),
      h('p.field-hint', 'Make a backup file of every game’s saves (keep it in Files or iCloud Drive). Restoring merges the backup into this iPad.'),
      h('div.btn-row',
        button({ label: 'Back up saves', kind: 'secondary', icon: 'download', onClick: () => exportBackup(games) }),
        button({ label: 'Restore backup…', kind: 'secondary', icon: 'upload', onClick: () => importBackup() }))),
    h('section.form-section', h('h3', 'Storage'), storageLine),
    isStandalone() ? null : h('section.form-section', h('h3', 'Install on this iPad'),
      h('p.field-hint', isIOS()
        ? 'In Safari, tap the Share button, then “Add to Home Screen”. Family Arcade then opens full-screen like an app and works with no internet.'
        : 'Use your browser’s “Install app” or “Add to Home Screen” option to install Family Arcade.')),
    h('section.form-section', h('h3', 'Adding games'),
      button({ label: 'How to add and update games', kind: 'secondary', icon: 'info', onClick: () => openHelp() })),
    h('section.form-section', h('h3', 'About'),
      h('dl.info-list',
        h('dt', 'Version'), h('dd', `${APP_VERSION} (offline engine ${version || 'unknown'})`),
        h('dt', 'Games'), h('dd', String(games.length)),
        h('dt', 'Storage engine'), h('dd', state.store.kind === 'web' ? 'Web app (works offline)' : 'iPad app'),
        h('dt', 'Privacy'), h('dd', 'No accounts, ads or tracking. Everything stays on this device.')))));
  sheet.setActions([{ label: 'Done', kind: 'primary', onClick: () => sheet.close() }]);
}

async function exportBackup(games) {
  const data = buildBackup(games);
  const count = Object.keys(data.games).length;
  if (!count) { toast('No saved progress to back up yet.'); return; }
  const name = `family-arcade-saves-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Family Arcade saves' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  toast(`Backed up saves for ${count} game${count === 1 ? '' : 's'}.`, { tone: 'success' });
}

function importBackup() {
  const input = $('#backup-input');
  input.value = '';
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    try {
      const r = await restoreBackup(f);
      toast(`Restored ${r.items} saved item${r.items === 1 ? '' : 's'} for ${r.games} game${r.games === 1 ? '' : 's'}.`, { tone: 'success' });
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  };
  input.click();
}

function openHelp() {
  const step = (n, title, text) => h('li.help-step', h('span.help-num', String(n)), h('div', h('strong', title), h('p', text)));
  const sheet = openSheet({
    title: 'Adding games',
    className: 'sheet-wide',
    body: h('div.help',
      h('ol.help-steps',
        step(1, 'Get the game file', 'For a one-file game, download or save its .html file. For a game with several files (images, sounds, scripts), put them in one folder and compress it to a .zip — in the Files app, press and hold the folder, then tap Compress.'),
        step(2, 'Tap + in the arcade', 'Choose one or more .zip or .html files. Family Arcade finds the start page, the name and a picture automatically. You can change the name, icon and color.'),
        step(3, 'Play offline', 'Games are copied onto this iPad. If a game uses online libraries (like Three.js or Phaser from a CDN), import while connected and they’re saved for offline play too.'),
        step(4, 'Updating a game', 'Import a newer version with the same name — or use Options → Update game — and saved progress carries over.')),
      h('h3', 'Optional: arcade.json'),
      h('p.field-hint', 'Put this file next to index.html inside a ZIP to set the details yourself:'),
      h('pre.code', '{\n  "id": "space-blaster",\n  "title": "Space Blaster",\n  "description": "Dodge the asteroids!",\n  "entry": "index.html",\n  "cover": "cover.png",\n  "emoji": "🚀",\n  "color": "#2fa8ff",\n  "orientation": "landscape",\n  "controls": { "dpad": "arrows", "a": "Space", "b": "Enter" }\n}'),
      h('h3', 'For game makers'),
      h('p.field-hint', 'Each game gets its own private storage automatically — localStorage, IndexedDB and Claude’s window.storage all work unchanged. A game can call FamilyArcade.exit() to return to the arcade.'))
  });
  sheet.setActions([{ label: 'Got it', kind: 'primary', onClick: () => sheet.close() }]);
}

/* ================================================================== */
/* Updates & install tip                                               */
/* ================================================================== */

async function swVersion() {
  const ctrl = navigator.serviceWorker && navigator.serviceWorker.controller;
  if (!ctrl) return null;
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    const t = setTimeout(() => resolve(null), 800);
    ch.port1.onmessage = (e) => { clearTimeout(t); resolve(e.data && e.data.version); };
    ctrl.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
  });
}

function watchForUpdates() {
  const reg = state.store.registration;
  if (!reg) return;
  const offer = (worker) => toast('A new version of Family Arcade is ready.', {
    duration: 0,
    action: { label: 'Update', onClick: () => { state.updateAccepted = true; worker.postMessage({ type: 'SKIP_WAITING' }); } }
  });
  if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    if (!w) return;
    w.addEventListener('statechange', () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
    });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    $('#offline-pill').hidden = false;
    if (state.updateAccepted) location.reload();
  });
  if (navigator.onLine) reg.update().catch(() => {});
}

function maybeShowInstallTip() {
  if (isStandalone() || !isIOS() || prefs.get('installTipShown', false)) return;
  prefs.set('installTipShown', true);
  setTimeout(() => toast('Tip: tap Share → “Add to Home Screen” to install Family Arcade.', { duration: 8000 }), 1500);
}
