// Game library metadata (titles, art, play stats, settings) in IndexedDB.
// Game *files* live in the storage backend (js/storage); game *saves* live under "fa:g:<id>:".
//
// Game record:
// {
//   id, storeKey, title, description, emoji, color, cover (Blob|null), coverPath,
//   entry, fileCount, size, external: [urls], capturedExternal: [urls], warnings: [],
//   controls: { dpad: 'off'|'arrows'|'wasd', a, b, start },
//   touchHygiene: true, orientation: 'any'|'landscape'|'portrait',
//   source: 'import'|'bundled', sourceName, bundledRev,
//   addedAt, updatedAt, lastPlayedAt, playCount, playTimeMs, rev
// }

const DB_NAME = 'family-arcade-library';
const DB_VERSION = 1;
let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('games')) db.createObjectStore('games', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx(mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction('games', mode);
    const store = t.objectStore('games');
    let result;
    Promise.resolve(fn(store)).then((r) => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

const reqToPromise = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

export const library = {
  async all() {
    return tx('readonly', (s) => reqToPromise(s.getAll()));
  },
  async get(id) {
    return tx('readonly', (s) => reqToPromise(s.get(id)));
  },
  async put(game) {
    await tx('readwrite', (s) => { s.put(game); });
    return game;
  },
  async update(id, changes) {
    const game = await this.get(id);
    if (!game) return null;
    const next = { ...game, ...changes };
    await this.put(next);
    return next;
  },
  async remove(id) {
    await tx('readwrite', (s) => { s.delete(id); });
  }
};

export const DEFAULT_CONTROLS = Object.freeze({ dpad: 'off', a: 'none', b: 'none', start: 'none' });
