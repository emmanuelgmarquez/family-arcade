// Web/PWA storage: game files in Cache Storage, served offline by sw.js.

import { encodePath, mimeFor } from '../util.js';

const GAME_CACHE_PREFIX = 'fa-game-';
const EXTERNAL_CACHE = 'fa-external';
const INDEX_FILE = '__fa__/index.json';

export class StoreError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export function createWebStore() {
  const scope = new URL('./', document.baseURI);
  const fileKey = (storeKey, path) => scope.href + 'play/' + encodeURIComponent(storeKey) + '/' + encodePath(path);

  async function waitForController(ms) {
    if (navigator.serviceWorker.controller) return true;
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve(!!navigator.serviceWorker.controller), ms);
      navigator.serviceWorker.addEventListener('controllerchange', () => { clearTimeout(t); resolve(true); }, { once: true });
    });
  }

  return {
    kind: 'web',
    supportsExternalCapture: true,
    registration: null,

    async init() {
      if (!window.isSecureContext || !('serviceWorker' in navigator) || !('caches' in window)) {
        throw new StoreError('insecure', 'Family Arcade must be opened over HTTPS (or localhost) so it can work offline.');
      }
      this.registration = await navigator.serviceWorker.register('sw.js', { scope: './' });
      await navigator.serviceWorker.ready;
      const controlled = await waitForController(4000);
      if (!controlled) {
        // A hard refresh bypasses the service worker; reload once so games can be served.
        if (!sessionStorage.getItem('fa-shell:reloaded')) {
          sessionStorage.setItem('fa-shell:reloaded', '1');
          location.reload();
          await new Promise(() => {});
        }
        throw new StoreError('uncontrolled', 'Offline engine not active. Close and reopen Family Arcade.');
      }
      sessionStorage.removeItem('fa-shell:reloaded');
      try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* optional */ }
    },

    async writeGame(storeKey, files, onProgress = () => {}) {
      const cache = await caches.open(GAME_CACHE_PREFIX + storeKey);
      let done = 0;
      const queue = files.slice();
      const worker = async () => {
        while (queue.length) {
          const f = queue.shift();
          await cache.put(fileKey(storeKey, f.path), new Response(f.data, {
            headers: {
              'Content-Type': mimeFor(f.path),
              'Content-Length': String(f.data.byteLength),
              'Accept-Ranges': 'bytes'
            }
          }));
          onProgress(++done, files.length);
        }
      };
      await Promise.all(Array.from({ length: Math.min(6, files.length || 1) }, worker));
      await cache.put(fileKey(storeKey, INDEX_FILE), new Response(JSON.stringify({ files: files.map((f) => f.path) }), {
        headers: { 'Content-Type': 'application/json' }
      }));
    },

    async readFile(storeKey, path) {
      const cache = await caches.open(GAME_CACHE_PREFIX + storeKey);
      const res = await cache.match(fileKey(storeKey, path));
      return res ? new Uint8Array(await res.arrayBuffer()) : null;
    },

    async deleteGame(storeKey) {
      await caches.delete(GAME_CACHE_PREFIX + storeKey);
    },

    async listStoreKeys() {
      return (await caches.keys()).filter((k) => k.startsWith(GAME_CACHE_PREFIX)).map((k) => k.slice(GAME_CACHE_PREFIX.length));
    },

    async launchTarget(game) {
      return { src: 'play/' + encodeURIComponent(game.storeKey) + '/' + encodePath(game.entry) };
    },

    /**
     * Saves online libraries a game links to (CDN scripts, stylesheets, fonts, ES modules)
     * so the service worker can serve them offline. The game's code is not changed.
     */
    async captureExternal(urls, onProgress = () => {}) {
      const cache = await caches.open(EXTERNAL_CACHE);
      const captured = [], failed = [];
      const seen = new Set();
      const queue = urls.map((u) => ({ url: u, depth: 0 }));
      let total = queue.length;
      while (queue.length && seen.size < 150) {
        const { url, depth } = queue.shift();
        if (seen.has(url)) continue;
        seen.add(url);
        let res = null, readable = false;
        try {
          res = await fetch(url, { mode: 'cors', credentials: 'omit' });
          if (!res.ok) throw new Error(String(res.status));
          readable = true;
        } catch (e) {
          try { res = await fetch(url, { mode: 'no-cors', credentials: 'omit' }); } catch (e2) { res = null; }
        }
        if (!res || (res.type !== 'opaque' && !res.ok)) { failed.push(url); onProgress(captured.length + failed.length, total); continue; }

        // Follow nested references (fonts inside CSS, imports inside ES modules) a few levels deep.
        if (readable && depth < 4) {
          const type = res.headers.get('Content-Type') || '';
          if (/css|javascript|ecmascript/.test(type) || /\.(css|m?js)(\?|$)/.test(url)) {
            const text = await res.clone().text();
            for (const ref of findNestedRefs(text, url, /css/.test(type) || /\.css(\?|$)/.test(url))) {
              if (!seen.has(ref)) { queue.push({ url: ref, depth: depth + 1 }); total++; }
            }
          }
        }
        await cache.put(url, res);
        captured.push(url);
        onProgress(captured.length + failed.length, total);
      }
      return { captured, failed };
    },

    async releaseExternal(urls) {
      const cache = await caches.open(EXTERNAL_CACHE);
      await Promise.all(urls.map((u) => cache.delete(u)));
    },

    async estimate() {
      try { return await navigator.storage.estimate(); } catch (e) { return null; }
    }
  };
}

function findNestedRefs(text, baseUrl, isCss) {
  const out = new Set();
  const add = (ref) => {
    if (!ref || ref.startsWith('data:') || ref.startsWith('blob:') || ref.startsWith('#')) return;
    try {
      const u = new URL(ref, baseUrl);
      if (u.protocol === 'https:' || u.protocol === 'http:') out.add(u.href);
    } catch (e) { /* ignore */ }
  };
  if (isCss) {
    for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) add(m[1].trim());
    for (const m of text.matchAll(/@import\s+['"]([^'"]+)['"]/g)) add(m[1]);
  } else {
    for (const m of text.matchAll(/(?:import|export)\s*(?:[\w*{}\s,$]+?\s*from\s*)?['"]([^'"\n]+)['"]/g)) {
      if (/^(https?:|\/|\.\.?\/)/.test(m[1])) add(m[1]);
    }
    for (const m of text.matchAll(/import\(\s*['"]([^'"\n]+)['"]\s*\)/g)) {
      if (/^(https?:|\/|\.\.?\/)/.test(m[1])) add(m[1]);
    }
  }
  return out;
}
