// Per-game saved progress. Every game's storage is namespaced by the runtime shim:
//   localStorage / sessionStorage keys  ->  "fa:g:<gameId>:<key>"
//   IndexedDB databases                 ->  "fa:g:<gameId>:<name>"
//   Cache Storage caches                ->  "fa-gc:<gameId>:<name>"

export const savePrefix = (id) => `fa:g:${id}:`;

function keysWithPrefix(storage, prefix) {
  const out = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(prefix)) out.push(k);
    }
  } catch (e) { /* storage unavailable */ }
  return out;
}

export async function saveSummary(id) {
  const prefix = savePrefix(id);
  const keys = keysWithPrefix(localStorage, prefix);
  let bytes = 0;
  for (const k of keys) bytes += (k.length + (localStorage.getItem(k) || '').length) * 2;
  let databases = 0;
  try {
    if (indexedDB.databases) databases = (await indexedDB.databases()).filter((d) => d.name && d.name.startsWith(prefix)).length;
  } catch (e) { /* not supported */ }
  return { items: keys.length, bytes, databases };
}

export async function resetSaves(id) {
  const prefix = savePrefix(id);
  for (const k of keysWithPrefix(localStorage, prefix)) localStorage.removeItem(k);
  for (const k of keysWithPrefix(sessionStorage, prefix)) sessionStorage.removeItem(k);
  try {
    if (indexedDB.databases) {
      const dbs = (await indexedDB.databases()).filter((d) => d.name && d.name.startsWith(prefix));
      await Promise.all(dbs.map((d) => new Promise((resolve) => {
        const req = indexedDB.deleteDatabase(d.name);
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      })));
    }
  } catch (e) { /* ignore */ }
  try {
    const cp = `fa-gc:${id}:`;
    await Promise.all((await caches.keys()).filter((k) => k.startsWith(cp)).map((k) => caches.delete(k)));
  } catch (e) { /* ignore */ }
}

/** Backup of every game's localStorage saves (what nearly all small web games use). */
export function buildBackup(games) {
  const out = { app: 'family-arcade', kind: 'saves-backup', version: 1, exportedAt: new Date().toISOString(), games: {} };
  for (const g of games) {
    const prefix = savePrefix(g.id);
    const data = {};
    for (const k of keysWithPrefix(localStorage, prefix)) data[k.slice(prefix.length)] = localStorage.getItem(k);
    if (Object.keys(data).length) out.games[g.id] = { title: g.title, localStorage: data };
  }
  return out;
}

export async function restoreBackup(file) {
  let json;
  try { json = JSON.parse(await file.text()); } catch (e) { throw new Error('That file isn’t a Family Arcade backup.'); }
  if (!json || json.app !== 'family-arcade' || !json.games) throw new Error('That file isn’t a Family Arcade backup.');
  let games = 0, items = 0;
  for (const [id, entry] of Object.entries(json.games)) {
    const prefix = savePrefix(id);
    const data = (entry && entry.localStorage) || {};
    for (const [k, v] of Object.entries(data)) {
      localStorage.setItem(prefix + k, String(v));
      items++;
    }
    games++;
  }
  return { games, items };
}
