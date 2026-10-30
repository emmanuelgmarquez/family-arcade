// Native (Capacitor iOS) storage — for the future App Store / TestFlight build.
//
// WKWebView in Capacitor apps doesn't run service workers, so instead:
//   - game files are written to the app's private Data folder with @capacitor/filesystem
//   - games are launched in an iframe via srcdoc with a <base href> pointing at that folder
//     (Capacitor.convertFileSrc turns the file path into a loadable capacitor:// URL)
//   - the same runtime shim is injected, so saves stay separate per game.
//
// Status: written against the Capacitor 6/7 Filesystem API but NOT yet tested on a device.
// Requires: npm i @capacitor/core @capacitor/filesystem (see README → "Packaging for iPad").

import { bytesToBase64, base64ToBytes, bytesToText, encodePath, dirname } from '../util.js';
import { buildSrcdoc } from './html-inject.js';

const DIR = 'DATA';
const ROOT = 'family-arcade/games';

export function isNativeApp() {
  const cap = window.Capacitor;
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
}

export function createNativeStore() {
  const cap = window.Capacitor;
  const fs = () => {
    const plugin = cap && cap.Plugins && cap.Plugins.Filesystem;
    if (!plugin) throw new Error('Capacitor Filesystem plugin is missing. Run: npm i @capacitor/filesystem && npx cap sync');
    return plugin;
  };
  const gamePath = (storeKey, path = '') => `${ROOT}/${storeKey}/${path}`;

  return {
    kind: 'native',
    supportsExternalCapture: false,

    async init() { fs(); },

    async writeGame(storeKey, files, onProgress = () => {}) {
      let done = 0;
      for (const f of files) {
        await fs().writeFile({ path: gamePath(storeKey, f.path), data: bytesToBase64(f.data), directory: DIR, recursive: true });
        onProgress(++done, files.length);
      }
    },

    async readFile(storeKey, path) {
      try {
        const res = await fs().readFile({ path: gamePath(storeKey, path), directory: DIR });
        if (typeof res.data === 'string') return base64ToBytes(res.data);
        return new Uint8Array(await res.data.arrayBuffer());
      } catch (e) { return null; }
    },

    async deleteGame(storeKey) {
      try { await fs().rmdir({ path: gamePath(storeKey), directory: DIR, recursive: true }); } catch (e) { /* already gone */ }
    },

    async listStoreKeys() {
      try {
        const res = await fs().readdir({ path: ROOT, directory: DIR });
        return res.files.map((f) => (typeof f === 'string' ? f : f.name));
      } catch (e) { return []; }
    },

    async launchTarget(game) {
      const { uri } = await fs().getUri({ path: gamePath(game.storeKey), directory: DIR });
      const folder = cap.convertFileSrc(uri.endsWith('/') ? uri : uri + '/');
      const bytes = await this.readFile(game.storeKey, game.entry);
      if (!bytes) throw new Error('Game files are missing. Try re-importing the game.');
      return {
        srcdoc: buildSrcdoc(bytesToText(bytes), {
          baseHref: folder + encodePath(dirname(game.entry)),
          shimSrc: new URL('runtime/game-shim.js', document.baseURI).href,
          gameId: game.id
        })
      };
    },

    async captureExternal(urls) {
      // Not available without a service worker. Games that need CDN libraries should bundle them in their ZIP.
      return { captured: [], failed: urls.slice() };
    },

    async releaseExternal() {},

    async estimate() { return null; }
  };
}
