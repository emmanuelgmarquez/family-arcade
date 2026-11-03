#!/usr/bin/env node
// Packs each folder in games/ into www/games/<id>.zip and writes www/games/catalog.json.
// The arcade installs catalog games automatically on first launch (and updates them when
// their contents change — saves are kept, they follow the game id).
//
//   node tools/build-games.mjs
//
// A game folder holds the game's original files plus an optional arcade.json (title, icon,
// controls, cover, add-ons). Files are copied byte-for-byte.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { zipSync } from '../www/vendor/fflate.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const gamesDir = join(root, 'games');
const outDir = join(root, 'www', 'games');
const catalogPath = join(outDir, 'catalog.json');

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

let previous = {};
try {
  for (const e of JSON.parse(readFileSync(catalogPath, 'utf8')).games || []) previous[e.id] = e;
} catch (e) { /* first build */ }

mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (f.endsWith('.zip')) rmSync(join(outDir, f));

const entries = [];
for (const id of readdirSync(gamesDir).sort()) {
  const dir = join(gamesDir, id);
  if (!statSync(dir).isDirectory()) continue;
  // arcade.json may list "exclude": ["test/", "notes.md"] — paths (or folder prefixes) left out of the cartridge.
  let exclude = [];
  try { exclude = JSON.parse(readFileSync(join(dir, 'arcade.json'), 'utf8')).exclude || []; } catch (e) { /* no arcade.json */ }
  const files = walk(dir)
    .map((p) => relative(dir, p).split(sep).join('/'))
    .filter((p) => !/(^|\/)\.DS_Store$|(^|\/)Thumbs\.db$/.test(p))
    .filter((p) => !exclude.some((x) => (x.endsWith('/') ? p.startsWith(x) : p === x)))
    .sort();
  if (!files.includes('index.html') && !files.some((p) => /\.html?$/.test(p))) {
    console.warn(`skip ${id}: no html page`);
    continue;
  }
  const hash = createHash('sha256');
  const zipInput = {};
  for (const f of files) {
    const data = readFileSync(join(dir, f));
    hash.update(f).update(data);
    // Already-compressed media is stored, everything else deflated.
    const level = /\.(png|jpe?g|webp|gif|mp3|ogg|m4a|mp4|webm|woff2?|zip)$/i.test(f) ? 0 : 9;
    zipInput[f] = [new Uint8Array(data), { level }];
  }
  const digest = hash.digest('hex').slice(0, 16);
  const meta = existsSync(join(dir, 'arcade.json')) ? JSON.parse(readFileSync(join(dir, 'arcade.json'), 'utf8')) : {};
  const prev = previous[id];
  const rev = prev ? (prev.hash === digest ? prev.rev : (prev.rev || 0) + 1) : 1;
  const zipName = `${id}.zip`;
  const zip = zipSync(zipInput);
  writeFileSync(join(outDir, zipName), zip);
  entries.push({ id, file: zipName, title: meta.title || id, rev, hash: digest, size: zip.byteLength });
  console.log(`${id.padEnd(20)} rev ${String(rev).padEnd(3)} ${files.length} files  ${(zip.byteLength / 1024 / 1024).toFixed(2)} MB`);
}

writeFileSync(catalogPath, JSON.stringify({ games: entries }, null, 2) + '\n');
console.log(`catalog.json → ${entries.length} games`);
