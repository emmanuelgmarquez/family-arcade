/*
 * Family Arcade — service worker
 *
 * Jobs:
 *  1. Keep the arcade shell available offline (precache, cache-first).
 *  2. Serve imported games from Cache Storage at  <scope>/play/<storeKey>/<path>
 *     so every game keeps its original files and relative paths.
 *  3. Inject the game runtime (save isolation, pause, return-to-arcade API)
 *     into each game's HTML page *as it is served* — the stored source is never modified.
 *  4. Serve captured online libraries (CDN scripts/fonts) offline.
 *
 * When you change any shell file, bump VERSION (or run `node tools/bump-version.mjs`).
 */
const VERSION = '30ae9f6997';
const SHELL_CACHE = 'fa-shell-' + VERSION;
const EXTERNAL_CACHE = 'fa-external';
const GAME_CACHE_PREFIX = 'fa-game-';
const INDEX_FILE = '__fa__/index.json';

const SHELL_FILES = [
  './',
  'css/arcade.css',
  'fonts/press-start-2p.woff2',
  'games/catalog.json',
  'icons/apple-touch-icon.png',
  'icons/favicon-64.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'index.html',
  'js/app.js',
  'js/art.js',
  'js/bundled.js',
  'js/importer.js',
  'js/input.js',
  'js/library.js',
  'js/player.js',
  'js/saves.js',
  'js/sfx.js',
  'js/storage/html-inject.js',
  'js/storage/index.js',
  'js/storage/native-store.js',
  'js/storage/web-store.js',
  'js/touch-controls.js',
  'js/ui.js',
  'js/util.js',
  'manifest.webmanifest',
  'runtime/game-shim.js',
  'vendor/fflate.js'
];

const SCOPE_URL = new URL(self.registration.scope);
const PLAY_PATH = SCOPE_URL.pathname + 'play/';
const GAMES_PATH = SCOPE_URL.pathname + 'games/';
const SHIM_PATH = new URL('runtime/game-shim.js', SCOPE_URL).pathname;

/* ---------- lifecycle ---------- */

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL_FILES.map((f) => new Request(new URL(f, SCOPE_URL).href, { cache: 'reload' })));
    // First install: take control immediately. Updates wait for the player to tap "Update".
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((n) => n.startsWith('fa-shell-') && n !== SHELL_CACHE)
      .map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'GET_VERSION' && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
});

/* ---------- routing ---------- */

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === SCOPE_URL.origin) {
    if (url.pathname.startsWith(PLAY_PATH)) { event.respondWith(serveGame(req, url)); return; }
    if (url.pathname.startsWith(GAMES_PATH)) { event.respondWith(networkFirst(req)); return; }
    if (url.pathname.startsWith(SCOPE_URL.pathname)) { event.respondWith(serveShell(req)); return; }
    return;
  }
  if (url.protocol === 'http:' || url.protocol === 'https:') {
    event.respondWith(serveExternal(req));
  }
});

async function serveShell(req) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try {
    return await fetch(req);
  } catch (err) {
    if (req.mode === 'navigate') {
      const index = await cache.match(new URL('index.html', SCOPE_URL).href);
      if (index) return index;
    }
    return Response.error();
  }
}

async function networkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res.ok && req.url.endsWith('catalog.json')) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    return hit || new Response('Offline', { status: 503 });
  }
}

async function serveExternal(req) {
  try {
    const cache = await caches.open(EXTERNAL_CACHE);
    const hit = await cache.match(req.url, { ignoreVary: true });
    // An opaque copy can only satisfy no-cors requests (e.g. a classic <script src>).
    if (hit && (hit.type !== 'opaque' || req.mode === 'no-cors')) return hit;
  } catch (err) { /* fall through */ }
  return fetch(req);
}

/* ---------- games ---------- */

function decodeSafe(s) {
  try { return decodeURIComponent(s); } catch (e) { return s; }
}
function encodePath(p) {
  return p.split('/').map(encodeURIComponent).join('/');
}
function fileKey(storeKey, path) {
  return SCOPE_URL.href + 'play/' + encodeURIComponent(storeKey) + '/' + encodePath(path);
}
function gameIdFromStoreKey(storeKey) {
  return storeKey.replace(/--r\d+$/, '');
}

async function serveGame(req, url) {
  const rest = url.pathname.slice(PLAY_PATH.length);
  const slash = rest.indexOf('/');
  if (slash === -1) return Response.redirect(url.href.replace(/\/?(\?|$)/, '/$1'), 302);

  const storeKey = decodeSafe(rest.slice(0, slash));
  const sub = rest.slice(slash + 1).split('/').map(decodeSafe).join('/');
  const cache = await caches.open(GAME_CACHE_PREFIX + storeKey);

  let res = await lookup(cache, storeKey, sub);
  if (!res) {
    return new Response('Not found in this game: ' + sub, {
      status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const type = res.headers.get('Content-Type') || '';
  if (req.mode === 'navigate' && type.startsWith('text/html')) {
    return injectRuntime(res, gameIdFromStoreKey(storeKey), await addOnTags(cache, storeKey));
  }
  const range = req.headers.get('Range');
  if (range) return rangeResponse(res, range);
  return res;
}

async function lookup(cache, storeKey, sub) {
  const candidates = [];
  if (sub === '' || sub.endsWith('/')) candidates.push(sub + 'index.html');
  else candidates.push(sub);
  if (!/\.[a-z0-9]+$/i.test(sub)) candidates.push(sub.replace(/\/?$/, '/index.html'), sub + '.html');

  for (const c of candidates) {
    const hit = await cache.match(fileKey(storeKey, c));
    if (hit) return hit;
  }
  // Case-insensitive fallback (games made on Windows/Mac often mix "Sprite.PNG" and "sprite.png").
  const indexRes = await cache.match(fileKey(storeKey, INDEX_FILE));
  if (!indexRes) return null;
  let index;
  try { index = await indexRes.json(); } catch (e) { return null; }
  const paths = index.files || [];
  for (const c of candidates) {
    const lower = c.toLowerCase();
    const found = paths.find((p) => p.toLowerCase() === lower);
    if (found) return cache.match(fileKey(storeKey, found));
  }
  return null;
}

/* Same logic as js/storage/html-inject.js (kept in sync; service workers can't import ES modules everywhere). */
function injectIntoHead(html, snippet) {
  const head = html.match(/<head(\s[^>]*)?>/i);
  if (head) return html.slice(0, head.index + head[0].length) + snippet + html.slice(head.index + head[0].length);
  const root = html.match(/<html(\s[^>]*)?>/i);
  if (root) return html.slice(0, root.index + root[0].length) + snippet + html.slice(root.index + root[0].length);
  const doctype = html.match(/<!doctype[^>]*>/i);
  if (doctype) return html.slice(0, doctype.index + doctype[0].length) + snippet + html.slice(doctype.index + doctype[0].length);
  return snippet + html;
}

/*
 * Optional add-ons listed in a game's arcade.json ("inject": ["extra.js", "extra.css"]).
 * They load right after the runtime, before the game's own code, so the game's files stay untouched.
 */
async function addOnTags(cache, storeKey) {
  try {
    const meta = await cache.match(fileKey(storeKey, 'arcade.json'));
    if (!meta) return '';
    const list = (await meta.json()).inject;
    if (!Array.isArray(list)) return '';
    const base = PLAY_PATH + encodeURIComponent(storeKey) + '/';
    return list
      .filter((p) => typeof p === 'string' && /^[\w.\/-]+\.(js|css)$/.test(p) && !p.includes('..'))
      .map((p) => /\.css$/.test(p)
        ? '<link rel="stylesheet" href="' + base + encodePath(p) + '">'
        : '<script src="' + base + encodePath(p) + '"></script>')
      .join('');
  } catch (e) {
    return '';
  }
}

async function injectRuntime(res, gameId, extra = '') {
  const html = await res.text();
  const safeId = gameId.replace(/[^a-z0-9_-]/gi, '');
  const tag = '<script src="' + SHIM_PATH + '" data-fa-game="' + safeId + '"></script>' + extra;
  return new Response(injectIntoHead(html, tag), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function rangeResponse(res, rangeHeader) {
  const blob = await res.blob();
  const size = blob.size;
  const type = res.headers.get('Content-Type') || 'application/octet-stream';
  const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!m || (m[1] === '' && m[2] === '')) {
    return new Response(blob, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
  }
  let start, end;
  if (m[1] === '') { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start >= size || start > end) {
    return new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': type,
      'Content-Length': String(end - start + 1),
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Accept-Ranges': 'bytes'
    }
  });
}
