// Where produced files live: built/<packId>/<logical path>, the pack id naming the content pack that declares the
// file (a recipe file, a roster pack in models/export.json or a mob row's `pack` in models/mobs.json).
import { readFileSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';
import { recipePackIds } from './recipes.mjs';

const repo = resolve(import.meta.dirname, '..');

export function outputPath(packId, file) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(packId) || packId === '.' || packId === '..') {
    throw new Error(`Invalid pack id: ${packId}`);
  }
  if (!file || file.includes('\\') || posix.isAbsolute(file) || file.split('/').some(segment => segment === '..' || segment === '.' || segment === '')) {
    throw new Error(`Invalid logical output path: ${file}`);
  }
  return posix.join(packId, file);
}

// The clip representation each mob pack bakes. The bestiary keeps matrices until its rows move to pose.
export const packFormats = Object.freeze({
  'skelly.bestiary': 'matrices',
  'skelly.deadvox.actors': 'pose',
  'skelly.body': 'pose',
});

// A row's own `format` (fixture rows) must agree with its pack's; a row in no listed pack must name one.
export function mobFormat(row) {
  const declared = Object.hasOwn(packFormats, row.pack) ? packFormats[row.pack] : undefined;
  if (row.format !== undefined && declared !== undefined && row.format !== declared) {
    throw new Error(`${row.id}: format ${row.format} disagrees with pack ${row.pack} (${declared})`);
  }
  const format = row.format ?? declared;
  if (format !== 'matrices' && format !== 'pose') throw new Error(`${row.id}: no clip format for pack ${row.pack}`);
  return format;
}

// models/export.json: pack id -> the roster ids it declares.
export function readRoster(root = repo) {
  const packs = JSON.parse(readFileSync(join(root, 'models/export.json'), 'utf8'));
  return Object.entries(packs).flatMap(([packId, ids]) => {
    if (!Array.isArray(ids)) throw new Error(`models/export.json: ${packId} must list ids`);
    return ids.map((id) => ({ packId, id, file: rosterFile(packId, id) }));
  });
}

// A roster row's GLB at TAT's logical path under its pack.
export const rosterFile = (packId, id) => outputPath(packId, `assets/models/${id}.glb`);

// models/mobs.json's rows with the sheet's defaults applied.
export function readMobRows(root = repo) {
  const sheet = JSON.parse(readFileSync(join(root, 'models/mobs.json'), 'utf8'));
  return sheet.mobs.map((row) => ({ ...sheet.defaults, ...row }));
}

export function declaredPacks(root = repo) {
  return new Set([
    ...recipePackIds(root),
    ...readRoster(root).map((row) => row.packId),
    ...readMobRows(root).map((row) => row.pack),
  ]);
}

// Every directory directly under built/ must be a declared pack; flat files are not directories.
export function undeclaredDirectories(paths, declared) {
  const directories = new Set(paths.map((path) => path.split('/')).filter((parts) => parts[0] === 'built' && parts.length > 2).map((parts) => parts[1]));
  return [...directories].filter((directory) => !declared.has(directory)).sort().map((directory) => `built/${directory}`);
}

// The produced models under built/, by row: each GLB's path relative to built/ and, for a matrix mob row, its clips.
export function producedModels(root = repo) {
  return [
    ...readRoster(root).map(({ id, file }) => ({ id, file, clips: null })),
    ...readMobRows(root).map((row) => ({
      id: row.id,
      file: outputPath(row.pack, row.glb),
      clips: mobFormat(row) === 'matrices' ? outputPath(row.pack, row.clips) : null,
    })),
  ];
}
