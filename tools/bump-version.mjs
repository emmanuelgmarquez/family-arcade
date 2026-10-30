#!/usr/bin/env node
// Regenerates the service worker's precache list and version from the files in www/.
// Run after changing any arcade file:   node tools/bump-version.mjs
// (Installed copies then show "A new version of Family Arcade is ready → Update".)

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../www/', import.meta.url));
const swPath = join(root, 'sw.js');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(root)
  .map((p) => relative(root, p).split(sep).join('/'))
  .filter((p) => p !== 'sw.js')
  .filter((p) => !/\.(txt|md)$/i.test(p) && !p.endsWith('.DS_Store'))
  .filter((p) => !p.startsWith('games/') || p === 'games/catalog.json') // bundled games are fetched on demand
  .sort();

const hash = createHash('sha256');
for (const f of files) hash.update(f).update(readFileSync(join(root, f)));
const version = hash.digest('hex').slice(0, 10);

let sw = readFileSync(swPath, 'utf8');
sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
sw = sw.replace(/const SHELL_FILES = \[[\s\S]*?\];/, `const SHELL_FILES = [\n  './',\n${files.map((f) => `  '${f}'`).join(',\n')}\n];`);
writeFileSync(swPath, sw);
console.log(`sw.js → version ${version}, ${files.length + 1} files precached`);
