// Where produced files live: built/<packId>/<logical path>, the pack id naming the content pack that declares the
// file (a recipe file, a roster pack in models/export.json or a mob row's `pack` in models/mobs.json).
import { readFileSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';
import { recipePackIds } from './recipes.mjs';

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

const FORMATS = ['matrices', 'pose'];

// models/pack-formats.json: the clip representation each mob pack bakes (content, not code).
export function readPackFormats(root = repo) {
  const { packs } = JSON.parse(readFileSync(join(root, 'models/pack-formats.json'), 'utf8'));
  if (!packs || typeof packs !== 'object' || Array.isArray(packs)) throw new Error('models/pack-formats.json: packs must map pack ids to formats');
  for (const [packId, format] of Object.entries(packs)) {
    assertPackId(packId);
    if (!FORMATS.includes(format)) throw new Error(`models/pack-formats.json: ${packId} has unknown format ${format}`);
  }
  return Object.freeze({ ...packs });
}

let repoFormats;
const defaultFormats = () => (repoFormats ??= readPackFormats());

// A row's own `format` (fixture rows) must agree with its pack's; a row in no listed pack must name one.
export function mobFormat(row, packFormats = defaultFormats()) {
  const declared = Object.hasOwn(packFormats, row.pack) ? packFormats[row.pack] : undefined;
  if (row.format !== undefined && declared !== undefined && row.format !== declared) {
    throw new Error(`${row.id}: format ${row.format} disagrees with pack ${row.pack} (${declared})`);
  }
  const format = row.format ?? declared;
  if (!FORMATS.includes(format)) throw new Error(`${row.id}: no clip format for pack ${row.pack}`);
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
  return sheet.mobs.map((row) => {
    const id = row.id ?? `${row.type}.${row.seed}`;
    const stem = `actors/${id}`;
    return { ...sheet.defaults, ...row, id, glb: row.glb ?? `assets/models/${stem}.glb`, body: row.body ?? `${stem}.body.json`, clips: row.clips ?? `${stem}.clips.json` };
  });
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
