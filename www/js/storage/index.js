// Picks the storage backend for game files.
//
//   web    — installable PWA. Files live in Cache Storage and are served by sw.js.
//   native — Capacitor iOS app (future). Files live in the app's Data folder via
//            @capacitor/filesystem and are loaded with a <base>-tagged srcdoc.
//
// Both implement the same interface, so the rest of the app never needs to know which one is active:
//
//   kind                          'web' | 'native'
//   supportsExternalCapture       boolean — can it save CDN libraries for offline use?
//   init()                        prepare storage (registers the service worker on web)
//   writeGame(storeKey, files, onProgress)   files: [{ path, data: Uint8Array }]
//   readFile(storeKey, path)      -> Uint8Array | null
//   deleteGame(storeKey)
//   listStoreKeys()               -> string[] (for cleaning up orphans)
//   launchTarget(game)            -> { src } or { srcdoc }
//   captureExternal(urls, onProgress) -> { captured: string[], failed: string[] }
//   releaseExternal(urls)

import { createWebStore } from './web-store.js';
import { createNativeStore, isNativeApp } from './native-store.js';

let storePromise = null;

export function getStore() {
  if (!storePromise) {
    const store = isNativeApp() ? createNativeStore() : createWebStore();
    storePromise = store.init().then(() => store);
  }
  return storePromise;
}
