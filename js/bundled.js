// Optional pre-installed games: drop ZIP (or HTML) files into www/games/ and list them in
// www/games/catalog.json. On launch the arcade installs any new or updated entries through the
// same import pipeline as manual imports. Useful for a Capacitor build that ships with games.
//
// catalog.json:
// { "games": [ { "file": "space-blaster.zip", "id": "space-blaster", "rev": 1 } ] }
// Bump "rev" when you replace a file to push the update (saves are kept — they follow the id).

import { library } from './library.js';
import { readImportFile, quickInstall } from './importer.js';
import { prefs, slugify } from './util.js';

export async function syncBundledGames(onProgress = () => {}, onInstalled = () => {}) {
  let catalog;
  try {
    const res = await fetch('games/catalog.json', { cache: 'no-cache' });
    if (!res.ok) return [];
    catalog = await res.json();
  } catch (e) {
    return [];
  }
  const entries = (Array.isArray(catalog) ? catalog : catalog.games || []).filter((e) => e && e.file);
  const removed = new Set(prefs.get('removedBundled', []));
  const installed = [];

  const todo = [];
  for (const entry of entries) {
    const id = slugify(entry.id || entry.file.replace(/\.(zip|html?)$/i, ''));
    if (removed.has(id)) continue;
    const rev = Number(entry.rev || 1);
    const existing = await library.get(id);
    if (existing && (existing.bundledRev || 0) >= rev) continue;
    todo.push({ entry, id, rev, existing });
  }
  for (const [i, { entry, id, rev, existing }] of todo.entries()) {
    try {
      onProgress(`${existing ? 'Updating' : 'Installing'} ${entry.title || entry.file}…`, i, todo.length);
      const res = await fetch('games/' + entry.file.split('/').map(encodeURIComponent).join('/'));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const file = new File([await res.blob()], entry.file.split('/').pop());
      const pkg = await readImportFile(file);
      const extra = { fixedId: id, bundledRev: rev };
      if (entry.title) extra.title = entry.title;
      const game = await quickInstall(pkg, extra);
      installed.push(game);
      onInstalled(game, i + 1, todo.length);
    } catch (err) {
      console.warn('[Family Arcade] bundled game failed:', entry.file, err);
    }
  }
  return installed;
}

/** Remember that the family removed a bundled game so it isn't reinstalled on next launch. */
export function markBundledRemoved(id) {
  const list = new Set(prefs.get('removedBundled', []));
  list.add(id);
  prefs.set('removedBundled', [...list]);
}
