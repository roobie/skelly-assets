// Where produced files live: built/<packId>/<logical path>, the pack id naming the content pack that declares the
// file (a recipe file, a roster pack in models/export.json, a mob row's `pack` in models/mobs.json or a sound file).
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';
import { recipePackIds } from './recipes.mjs';
import { inheritTaxonomy } from './taxonomy.mjs';

const repo = resolve(import.meta.dirname, '..');

function assertPackId(packId) {
  if (typeof packId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(packId) || packId === '.' || packId === '..') {
    throw new Error(`Invalid pack id: ${packId}`);
  }
}

export function outputPath(packId, file) {
  assertPackId(packId);
  if (!file || file.includes('\\') || posix.isAbsolute(file) || file.split('/').some(segment => segment === '..' || segment === '.' || segment === '')) {
    throw new Error(`Invalid logical output path: ${file}`);
  }
  return posix.join(packId, file);
}

// models/export.json: pack id -> the roster ids it declares.
export function readRoster(root = repo) {
  const packs = JSON.parse(readFileSync(join(root, 'models/export.json'), 'utf8'));
  return Object.entries(packs).flatMap(([packId, ids]) => {
    if (!Array.isArray(ids)) throw new Error(`models/export.json: ${packId} must list ids`);
    return ids.map((id) => ({ packId, id }));
  });
}

// models/mobs.json's rows with the sheet's defaults applied; a row's taxonomy inherits the defaults' by the taxonomy rule.
export function readMobRows(root = repo) {
  const sheet = JSON.parse(readFileSync(join(root, 'models/mobs.json'), 'utf8'));
  return sheet.mobs.map((row) => {
    const id = row.id ?? `${row.type}.${row.seed}`;
    const stem = `actors/${id}`;
    return {
      ...sheet.defaults,
      ...row,
      id,
      glb: row.glb ?? `assets/models/${stem}.glb`,
      body: row.body ?? `${stem}.body.json`,
      clips: row.clips ?? `${stem}.clips.json`,
      taxonomy: inheritTaxonomy(sheet.defaults?.taxonomy, row.taxonomy),
    };
  });
}

// models/sounds/<packId>.jsonnet: each file holds one pack's sound rows, so its name declares the pack, as a recipe
// file's does, and the packs are known without compiling the rows.
export const SOUNDS = 'models/sounds';
export const soundPackIds = (root = repo) => readdirSync(join(root, SOUNDS)).filter((name) => name.endsWith('.jsonnet')).sort()
  .map((name) => name.slice(0, -'.jsonnet'.length));

// Pack id -> its compiled rows by id, as written; tools/packages/impact-synth/src/schema.ts validates them.
export const readSoundPacks = (root = repo) => Object.fromEntries(soundPackIds(root)
  .map((pack) => [pack, JSON.parse(readFileSync(join(root, SOUNDS, `${pack}.json`), 'utf8'))]));

// Every sound row with the files it is baked to under its pack: the row itself as data, so a tool can render it again,
// and one audio file per seed.
export const readSoundRows = (root = repo) => Object.entries(readSoundPacks(root)).flatMap(([pack, rows]) => Object.entries(rows)
  .map(([id, row]) => ({
    id,
    pack,
    row,
    data: `sounds/${id}.json`,
    variants: row.seeds.map((seed) => ({ seed, path: `sounds/${id}/${seed}.ogg` })),
  })));

export function declaredPacks(root = repo) {
  return new Set([
    ...recipePackIds(root),
    ...readRoster(root).map((row) => row.packId),
    ...readMobRows(root).map((row) => row.pack),
    ...soundPackIds(root),
  ]);
}

// Every directory directly under built/ must be a declared pack; flat files are not directories.
export function undeclaredDirectories(paths, declared) {
  const directories = new Set(paths.map((path) => path.split('/')).filter((parts) => parts[0] === 'built' && parts.length > 2).map((parts) => parts[1]));
  return [...directories].filter((directory) => !declared.has(directory)).sort().map((directory) => `built/${directory}`);
}
