// Import pipeline: ZIP or HTML file -> analysis (entry page, title, art, controls, online needs) -> install.
//
// Optional per-game metadata file at the root of a ZIP: arcade.json
// {
//   "id": "space-blaster",            // stable id (keeps saves across updates)
//   "title": "Space Blaster",
//   "description": "Dodge asteroids!",
//   "entry": "index.html",
//   "cover": "cover.png",
//   "emoji": "🚀",
//   "color": "#2fa8ff",
//   "orientation": "landscape",       // any | landscape | portrait
//   "controls": { "dpad": "arrows", "a": "Space", "b": "Enter", "start": "Escape" }   // or "controls": "none"
// }

import { unzipSync } from '../vendor/fflate.js';
import {
  bytesToText, slugify, randomSuffix, isHtmlPath, extname, decodeEntities, dirname, mimeFor
} from './util.js';
import { suggestEmoji, colorFor } from './art.js';
import { library } from './library.js';
import { getStore } from './storage/index.js';
import { normalizeControls } from './touch-controls.js';

export class ImportError extends Error {}

const JUNK = /(^|\/)(__MACOSX\/|\.git\/|node_modules\/\.cache\/|\.DS_Store$|Thumbs\.db$|desktop\.ini$|\._[^/]*$)/i;
const META_FILES = ['arcade.json', 'family-arcade.json'];
const TEXT_EXT = new Set(['html', 'htm', 'js', 'mjs', 'cjs', 'css', 'json']);
const GENERIC_TITLES = /^(document|untitled|index|game|home|page|app|react app|vite app|claude|artifact|new tab|html5 game|my game)$/i;

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

export async function readImportFile(file) {
  const name = file.name || 'game';
  const bytes = new Uint8Array(await file.arrayBuffer());
  let files;
  let kind;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    kind = 'zip';
    let entries;
    try { entries = unzipSync(bytes); } catch (e) {
      throw new ImportError(`“${name}” couldn't be opened. The ZIP may be damaged or password-protected.`);
    }
    files = Object.entries(entries).filter(([p]) => !p.endsWith('/')).map(([path, data]) => ({ path, data }));
  } else if (isHtmlPath(name) || looksLikeHtml(bytes)) {
    kind = 'html';
    const clean = name.replace(/[\\/:*?"<>|]+/g, '_');
    files = [{ path: isHtmlPath(clean) ? clean : clean + '.html', data: bytes }];
  } else if (/\.jsx$|\.tsx$/i.test(name)) {
    throw new ImportError(`“${name}” is React source code. Export it from Claude as an HTML file (or a ZIP of the built game) and import that instead.`);
  } else {
    throw new ImportError(`“${name}” isn't a ZIP or HTML file.`);
  }
  files = normalizeFiles(files);
  if (!files.length) throw new ImportError(`“${name}” is empty.`);
  return { sourceName: name, kind, files };
}

function looksLikeHtml(bytes) {
  const head = bytesToText(bytes.subarray(0, 512)).trim().toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html');
}

function normalizeFiles(files) {
  let out = [];
  for (const f of files) {
    let p = f.path.replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/^\/+/, '');
    if (!p || JUNK.test(p) || p.split('/').some((seg) => seg === '..' || seg === '.')) continue;
    out.push({ path: p, data: f.data });
  }
  // A ZIP of a folder: strip the shared top-level folder so index.html sits at the root.
  for (;;) {
    if (!out.length || !out.every((f) => f.path.includes('/'))) break;
    const first = out[0].path.split('/')[0];
    if (!out.every((f) => f.path.split('/')[0] === first)) break;
    out = out.map((f) => ({ ...f, path: f.path.slice(first.length + 1) }));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Analysis                                                            */
/* ------------------------------------------------------------------ */

export function analyzePackage(pkg, games = []) {
  const { files } = pkg;
  const byPath = new Map(files.map((f) => [f.path, f]));
  const htmlFiles = files.filter((f) => isHtmlPath(f.path)).map((f) => f.path);
  if (!htmlFiles.length) {
    throw new ImportError(`No web page found in “${pkg.sourceName}”. A game needs an index.html (or another .html file) to start from.`);
  }

  const meta = readMeta(byPath);
  const candidates = htmlFiles.slice().sort((a, b) => entryScore(b) - entryScore(a) || a.localeCompare(b));
  const entry = meta.entry && byPath.has(meta.entry) ? meta.entry : candidates[0];
  const entryHtml = bytesToText(byPath.get(entry).data);

  const title = cleanTitle(meta.title) || titleFromHtml(entryHtml) || titleFromFileName(pkg.sourceName);
  const description = String(meta.description || metaContent(entryHtml, 'description') || '').trim().slice(0, 280);
  const id = slugify(meta.id || title);
  const existing = games.find((g) => g.id === id) ||
    games.find((g) => g.title.trim().toLowerCase() === title.trim().toLowerCase()) || null;

  const texts = collectTexts(files);
  const online = scanExternal(texts);
  const controls = meta.controls !== undefined ? normalizeControls(meta.controls) : suggestControls(texts);
  const size = files.reduce((n, f) => n + f.data.byteLength, 0);

  const warnings = [];
  if (online.urls.length) {
    const hosts = [...new Set(online.urls.map((u) => new URL(u).hostname))];
    warnings.push({ kind: 'external', text: `Loads ${online.urls.length} file${online.urls.length > 1 ? 's' : ''} from the internet (${hosts.slice(0, 3).join(', ')}${hosts.length > 3 ? '…' : ''}).` });
  }
  if (online.services) warnings.push({ kind: 'online', text: 'Uses online features (live data, multiplayer or accounts) that won’t work offline.' });
  if (htmlFiles.length > 1 && !meta.entry) warnings.push({ kind: 'entry', text: `Has ${htmlFiles.length} pages — starting with “${entry}”. You can change this below.` });
  if (size > 300 * 1024 * 1024) warnings.push({ kind: 'size', text: 'This is a very large game and may use a lot of iPad storage.' });

  return {
    pkg,
    id,
    existing,
    entry,
    candidates,
    title,
    description,
    coverPath: findCover(byPath, meta, entry, entryHtml),
    emoji: meta.emoji || (existing && existing.emoji) || suggestEmoji(title + ' ' + description),
    color: /^#[0-9a-f]{6}$/i.test(meta.color || '') ? meta.color : (existing && existing.color) || colorFor(title),
    controls: existing && meta.controls === undefined ? existing.controls : controls,
    controlsSuggested: meta.controls === undefined && !existing && controls.dpad !== 'off',
    orientation: ['landscape', 'portrait'].includes(meta.orientation) ? meta.orientation : 'any',
    external: online.urls,
    warnings,
    size,
    fileCount: files.length
  };
}

function readMeta(byPath) {
  for (const name of META_FILES) {
    const f = byPath.get(name);
    if (!f) continue;
    try { return JSON.parse(bytesToText(f.data)) || {}; } catch (e) { return {}; }
  }
  return {};
}

function entryScore(p) {
  const depth = p.split('/').length - 1;
  const base = p.split('/').pop().toLowerCase();
  let s = -depth * 10;
  if (base === 'index.html' || base === 'index.htm') s += 100;
  if (/^(game|main|play|start|app)\.html?$/.test(base)) s += 40;
  if (/test|demo|example|readme|license|credits|404/.test(base)) s -= 30;
  return s - p.length * 0.01;
}

function cleanTitle(t) {
  const s = decodeEntities(String(t || '')).replace(/\s+/g, ' ').trim();
  if (!s || GENERIC_TITLES.test(s)) return '';
  return s.slice(0, 60);
}

function titleFromHtml(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? cleanTitle(m[1].replace(/\s*[|–—-]\s*(play|game|html5).*$/i, '')) : '';
}

function titleFromFileName(name) {
  const base = String(name || 'New Game')
    .replace(/\.[a-z0-9]+$/i, '').replace(/\s*\(\d+\)$/, '').replace(/[-_ ]+copy$/i, '')
    .replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim();
  const t = base.replace(/\b\w/g, (c) => c.toUpperCase());
  return cleanTitle(t) || 'New Game';
}

function metaContent(html, name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, 'i');
  const tag = html.match(re);
  if (!tag) return '';
  const c = tag[0].match(/content=["']([^"']*)["']/i);
  return c ? decodeEntities(c[1]) : '';
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|avif)$/i;
function findCover(byPath, meta, entry, html) {
  for (const p of [meta.cover, meta.icon]) if (p && byPath.has(p) && IMAGE_EXT.test(p)) return p;
  const order = ['cover', 'thumbnail', 'thumb', 'screenshot', 'preview', 'poster', 'banner', 'apple-touch-icon', 'icon', 'logo'];
  const root = [...byPath.keys()].filter((p) => !p.includes('/') && IMAGE_EXT.test(p));
  for (const word of order) {
    const hit = root.find((p) => p.toLowerCase().startsWith(word));
    if (hit) return hit;
  }
  const refs = [metaContent(html, 'og:image')];
  const link = html.match(/<link[^>]+rel=["'](?:apple-touch-icon|icon)["'][^>]*>/i);
  if (link) { const href = link[0].match(/href=["']([^"']+)["']/i); if (href) refs.push(href[1]); }
  for (const ref of refs) {
    if (!ref || /^(https?:|data:|\/\/)/i.test(ref)) continue;
    const resolved = resolveRelative(dirname(entry), ref);
    if (byPath.has(resolved) && IMAGE_EXT.test(resolved)) return resolved;
  }
  return null;
}

function resolveRelative(dir, ref) {
  const parts = (dir + ref.split(/[?#]/)[0]).split('/');
  const out = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p !== '.' && p !== '') out.push(p);
  }
  return out.join('/');
}

function collectTexts(files) {
  // Pages are always read in full, even big single-file games (a 3D game can be 5 MB+ of
  // inline code), because their <script src> tags are where online libraries are found.
  const out = [];
  let budget = 48 * 1024 * 1024;
  const pagesFirst = files.slice().sort((a, b) => Number(isHtmlPath(b.path)) - Number(isHtmlPath(a.path)));
  for (const f of pagesFirst) {
    const ext = extname(f.path);
    if (!TEXT_EXT.has(ext)) continue;
    const page = ext === 'html' || ext === 'htm';
    if (!page && (f.data.byteLength > 8 * 1024 * 1024 || budget <= 0)) continue;
    if (page && f.data.byteLength > 64 * 1024 * 1024) continue;
    budget -= f.data.byteLength;
    out.push({ path: f.path, ext, text: bytesToText(f.data) });
  }
  return out;
}

/** Finds files a game loads from the internet so they can be saved for offline play. */
export function scanExternal(texts) {
  const urls = new Set();
  let services = false;
  const add = (raw) => {
    let u = String(raw || '').trim();
    if (u.startsWith('//')) u = 'https:' + u;
    try {
      const x = new URL(u);
      if (!/^https?:$/.test(x.protocol)) return;
      if (/(^|\.)w3\.org$|(^|\.)xmlns\.com$/.test(x.hostname)) return;
      x.hash = '';
      urls.add(x.href);
    } catch (e) { /* not a URL */ }
  };
  const ABS = `((?:https?:)?\\/\\/[^"'\\s>]+)`;
  for (const { ext, text } of texts) {
    if (ext === 'html' || ext === 'htm') {
      for (const m of text.matchAll(new RegExp(`<script\\b[^>]*\\bsrc\\s*=\\s*["']${ABS}["']`, 'gi'))) add(m[1]);
      for (const m of text.matchAll(/<link\b[^>]*>/gi)) {
        const rel = (m[0].match(/\brel\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
        const href = (m[0].match(/\bhref\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
        if (/stylesheet|preload|modulepreload|icon/i.test(rel) && /^(https?:)?\/\//i.test(href)) add(href);
      }
      for (const m of text.matchAll(new RegExp(`<(?:img|audio|video|source|image|track)\\b[^>]*\\b(?:src|href)\\s*=\\s*["']${ABS}["']`, 'gi'))) add(m[1]);
      for (const m of text.matchAll(/<script\b[^>]*type\s*=\s*["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
          const map = JSON.parse(m[1]);
          const walk = (o) => Object.values(o || {}).forEach((v) => (typeof v === 'string' ? add(v) : walk(v)));
          walk(map);
        } catch (e) { /* ignore */ }
      }
    }
    if (ext !== 'json') {
      for (const m of text.matchAll(/url\(\s*['"]?((?:https?:)?\/\/[^'")\s]+)['"]?\s*\)/gi)) add(m[1]);
      for (const m of text.matchAll(/@import\s+(?:url\()?\s*['"]((?:https?:)?\/\/[^'"]+)['"]/gi)) add(m[1]);
    }
    if (ext !== 'css' && ext !== 'json') {
      for (const m of text.matchAll(/\bfrom\s*['"](https?:\/\/[^'"\n]+)['"]/g)) add(m[1]);
      for (const m of text.matchAll(/\bimport\s*\(?\s*['"](https?:\/\/[^'"\n]+)['"]/g)) add(m[1]);
      if (/new\s+WebSocket\s*\(|firebaseio\.com|firestore|supabase\.co|socket\.io|\bPeerJS\b|new\s+RTCPeerConnection/i.test(text)) services = true;
    }
  }
  return { urls: [...urls], services };
}

function suggestControls(texts) {
  const code = texts.filter((t) => t.ext !== 'json' && t.ext !== 'css').map((t) => t.text).join('\n');
  const usesKeys = /\bkey(?:down|up|press)\b|onkey(?:down|up)/i.test(code);
  const usesTouch = /touchstart|touchmove|pointerdown|pointermove|ontouchstart|hammer(?:js)?\b/i.test(code);
  if (!usesKeys || usesTouch) return normalizeControls('none');

  const has = (re) => re.test(code);
  const arrows = has(/ArrowLeft|ArrowRight|ArrowUp|ArrowDown|keyCode\s*={2,3}\s*3[7-9]|keyCode\s*={2,3}\s*40|case\s+3[7-9]\s*:/);
  const wasd = has(/KeyW|KeyA|KeyS|KeyD|['"]w['"]|['"]a['"]|['"]s['"]|['"]d['"]/);
  const dpad = arrows ? 'arrows' : wasd ? 'wasd' : 'off';

  const space = has(/['"] ['"]|['"]Space['"]|Spacebar|keyCode\s*={2,3}\s*32|case\s+32\s*:/);
  const enter = has(/['"]Enter['"]|keyCode\s*={2,3}\s*13|case\s+13\s*:/);
  const z = has(/KeyZ|['"]z['"]/), x = has(/KeyX|['"]x['"]/);
  const shift = has(/['"]Shift(?:Left|Right)?['"]/);
  const esc = has(/['"]Escape['"]|['"]Esc['"]|keyCode\s*={2,3}\s*27/);
  const p = has(/KeyP|['"]p['"]/);

  const buttons = [];
  if (space) buttons.push('Space');
  if (z) buttons.push('KeyZ');
  if (x) buttons.push('KeyX');
  if (enter) buttons.push('Enter');
  if (shift) buttons.push('ShiftLeft');
  return normalizeControls({
    dpad,
    a: buttons[0] || 'none',
    b: buttons[1] || 'none',
    start: esc ? 'Escape' : p ? 'KeyP' : (enter && !buttons.slice(0, 2).includes('Enter') ? 'Enter' : 'none')
  });
}

/* ------------------------------------------------------------------ */
/* Installing                                                          */
/* ------------------------------------------------------------------ */

/**
 * @param analysis  from analyzePackage()
 * @param choices   { mode: 'update'|'new', title, emoji, color, entry, controls, orientation, captureExternal, bundledRev, fixedId }
 * @param onProgress ({ label, done, total })
 */
export async function installGame(analysis, choices = {}, onProgress = () => {}) {
  const store = await getStore();
  const games = await library.all();
  const updating = choices.mode !== 'new' && analysis.existing;
  const prev = updating ? analysis.existing : null;

  let id = choices.fixedId || (prev ? prev.id : analysis.id);
  if (!prev && !choices.fixedId) {
    while (games.some((g) => g.id === id)) id = `${analysis.id}-${randomSuffix(3)}`;
  }
  const existingRecord = prev || games.find((g) => g.id === id) || null;
  const rev = (existingRecord ? existingRecord.rev || 0 : 0) + 1;
  const storeKey = `${id}--r${rev}`;
  const files = analysis.pkg.files;

  onProgress({ label: 'Copying game files…', done: 0, total: files.length });
  await store.writeGame(storeKey, files, (done, total) => onProgress({ label: 'Copying game files…', done, total }));

  let captured = [];
  let failedExternal = [];
  if (analysis.external.length && choices.captureExternal !== false && store.supportsExternalCapture && navigator.onLine) {
    onProgress({ label: 'Saving online libraries for offline play…', done: 0, total: analysis.external.length });
    const res = await store.captureExternal(analysis.external, (done, total) =>
      onProgress({ label: 'Saving online libraries for offline play…', done, total }));
    captured = res.captured;
    failedExternal = res.failed;
  } else if (analysis.external.length) {
    failedExternal = analysis.external.slice();
  }

  let cover = existingRecord && !analysis.coverPath ? existingRecord.cover || null : null;
  if (analysis.coverPath && choices.useCover !== false) {
    const f = files.find((x) => x.path === analysis.coverPath);
    if (f) cover = await shrinkImage(new Blob([f.data], { type: mimeFor(f.path).split(';')[0] }));
  }

  const now = Date.now();
  const game = {
    id,
    storeKey,
    rev,
    title: (choices.title || analysis.title).trim() || 'New Game',
    description: analysis.description,
    emoji: choices.emoji || analysis.emoji,
    color: choices.color || analysis.color,
    cover,
    coverPath: analysis.coverPath,
    entry: choices.entry || analysis.entry,
    fileCount: analysis.fileCount,
    size: analysis.size,
    external: analysis.external,
    capturedExternal: captured,
    missingExternal: failedExternal,
    warnings: analysis.warnings.map((w) => w.text),
    controls: normalizeControls(choices.controls || analysis.controls),
    orientation: choices.orientation || analysis.orientation,
    touchHygiene: existingRecord ? existingRecord.touchHygiene !== false : true,
    source: choices.bundledRev ? 'bundled' : 'import',
    bundledRev: choices.bundledRev || (existingRecord && existingRecord.bundledRev) || 0,
    sourceName: analysis.pkg.sourceName,
    addedAt: existingRecord ? existingRecord.addedAt : now,
    updatedAt: now,
    lastPlayedAt: existingRecord ? existingRecord.lastPlayedAt || 0 : 0,
    playCount: existingRecord ? existingRecord.playCount || 0 : 0,
    playTimeMs: existingRecord ? existingRecord.playTimeMs || 0 : 0
  };
  await library.put(game);
  if (existingRecord && existingRecord.storeKey !== storeKey) {
    await store.deleteGame(existingRecord.storeKey);
  }
  return game;
}

/** Installs with automatic choices (used for multi-file imports and bundled games). */
export async function quickInstall(pkg, extra = {}, onProgress) {
  const games = await library.all();
  const analysis = analyzePackage(pkg, games);
  if (extra.fixedId) {
    analysis.id = extra.fixedId;
    analysis.existing = games.find((g) => g.id === extra.fixedId) || null;
  }
  return installGame(analysis, { mode: 'update', captureExternal: true, ...extra }, onProgress);
}

export async function shrinkImage(blob, max = 640) {
  if (blob.type === 'image/svg+xml' || blob.type === 'image/gif' || blob.size < 250 * 1024) return blob;
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const type = blob.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const out = await new Promise((r) => canvas.toBlob(r, type, 0.86));
    return out || blob;
  } catch (e) {
    return blob;
  }
}
