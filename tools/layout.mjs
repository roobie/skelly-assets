// @ts-check
// Where produced files live: built/<packId>/<logical path>, the pack id naming the content pack that declares the
// file (a recipe file, a roster pack in models/export.json, a mob row's `pack` in models/mobs.json or a sound file).
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';
import { recipePackIds } from './recipes.mjs';
import { inheritTaxonomy } from './taxonomy.mjs';

/**
 * models/mobs.json as written.
 * @typedef {{ taxonomy?: Record<string, unknown> } & Record<string, unknown>} MobDefaults
 * @typedef {{ id?: string, pack: string, glb?: string, body?: string, clips?: string, genome?: string } & MobDefaults} MobSheetRow
 * @typedef {{ defaults?: MobDefaults, mobs: MobSheetRow[] }} MobSheet
 */

/** @import { Template } from './packages/mobgen/src/core/template.ts' */
/** @import { LookAtProfile } from './packages/mobgen/src/mob/lookAtProfiles.ts' */

/**
 * A mob row with the sheet's defaults applied and its files named. What every row has, of itself or of the defaults,
 * `readMobRows` checks; the rest is a row's own to give, and the bake reads it (tools/mobTemplates.mjs, tools/actorBake.mjs).
 * @typedef {object} MobRowFields
 * @property {string} id
 * @property {string} pack
 * @property {string} glb
 * @property {string} body
 * @property {string} clips
 * @property {string} genome
 * @property {string} template
 * @property {number} seed
 * @property {number} scale
 * @property {number} lod_divisor
 * @property {number} walk_speed
 * @property {number} walkCycles
 * @property {number} walk_frames
 * @property {number} attack_frames
 * @property {number} crawl_stride
 * @property {string} idle
 * @property {boolean} crawls
 * @property {Record<string, unknown> | undefined} taxonomy
 * @property {string} [title]
 * @property {string} [type]
 * @property {string} [model]
 * @property {Template['params']} [params]
 * @property {Readonly<Record<string, { color: string | Template['materials'][string]['color']; emissive?: number; charged?: boolean }>>} [materials]
 * @property {NonNullable<Template['parts']>} [parts]
 * @property {string} [attack_clip]
 * @property {number} [budget_headroom]
 * @property {Partial<Template['budgets']>} [budgets]
 * @property {LookAtProfile} [lookAt]
 */
/** @typedef {MobRowFields & Record<string, unknown>} MobRow */

/**
 * A sound row with the files it is baked to under its pack.
 * @typedef {object} SoundRow
 * @property {string} id
 * @property {string} pack
 * @property {{ seeds: number[] } & Record<string, unknown>} row
 * @property {string} data
 * @property {{ seed: number, path: string }[]} variants
 */

const repo = resolve(import.meta.dirname, '..');

/**
 * @param {unknown} packId
 * @returns {asserts packId is string}
 */
function assertPackId(packId) {
  if (typeof packId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(packId) || packId === '.' || packId === '..') {
    throw new Error(`Invalid pack id: ${packId}`);
  }
}

/**
 * @param {string} packId
 * @param {string} file
 * @returns {string}
 */
export function outputPath(packId, file) {
  assertPackId(packId);
  if (
    !file ||
    file.includes('\\') ||
    posix.isAbsolute(file) ||
    file.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')
  ) {
    throw new Error(`Invalid logical output path: ${file}`);
  }
  return posix.join(packId, file);
}

/** The folder under a pack each recipe tool (tools/recipeTools.mjs) writes its model sidecars to, by tool. */
export const SIDECAR_DIRECTORIES = { gun: 'gungen', thing: 'things' };

// A model's sidecar at its logical path under its pack, in the folder its tool writes sidecars to; it holds what the
// GLB does not, such as the anchors.
/**
 * @param {string} packId
 * @param {string} directory
 * @param {string} id
 */
export const sidecarFile = (packId, directory, id) => outputPath(packId, `${directory}/${id}.model.json`);

/**
 * @param {string} packId
 * @param {string} id
 */
export const thingEntryFile = (packId, id) => sidecarFile(packId, SIDECAR_DIRECTORIES.thing, id);

// models/export.json: pack id -> the roster ids it declares.
/**
 * @param {string} [root]
 * @returns {{ packId: string, id: string }[]}
 */
export function readRoster(root = repo) {
  /** @type {Record<string, unknown>} */
  const packs = JSON.parse(readFileSync(join(root, 'models/export.json'), 'utf8'));
  return Object.entries(packs).flatMap(([packId, ids]) => {
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
      throw new Error(`models/export.json: ${packId} must list ids`);
    }
    return ids.map((id) => ({ packId, id }));
  });
}

// models/mobs.json's rows with the sheet's defaults applied; a row's taxonomy inherits the defaults' by the taxonomy rule.
/**
 * @param {string} [root]
 * @returns {MobRow[]}
 */
export function readMobRows(root = repo) {
  /** @type {MobSheet} */
  const sheet = JSON.parse(readFileSync(join(root, 'models/mobs.json'), 'utf8'));
  return sheet.mobs.map((row) => {
    const id = row.id ?? `${row.type}.${row.seed}`;
    const stem = `actors/${id}`;
    const merged = { ...sheet.defaults, ...row };
    /** @param {string} what */
    const refuse = (what) => new Error(`models/mobs.json: ${id} needs ${what}, its own or the defaults'`);
    /** @param {string} field */
    const number = (field) => {
      const value = merged[field];
      if (typeof value !== 'number') throw refuse(`a number ${field}`);
      return value;
    };
    const { template, idle, crawls } = merged;
    if (typeof template !== 'string') throw refuse('a template');
    if (typeof idle !== 'string') throw refuse('an idle');
    if (typeof crawls !== 'boolean') throw refuse('crawls, true or false');
    // Each key keeps the place it has in the merged row, so the row reads as it is written.
    return {
      ...merged,
      template,
      idle,
      crawls,
      seed: number('seed'),
      scale: number('scale'),
      lod_divisor: number('lod_divisor'),
      walk_speed: number('walk_speed'),
      walkCycles: number('walkCycles'),
      walk_frames: number('walk_frames'),
      attack_frames: number('attack_frames'),
      crawl_stride: number('crawl_stride'),
      id,
      glb: row.glb ?? `assets/models/${stem}.glb`,
      body: row.body ?? `${stem}.body.json`,
      clips: row.clips ?? `${stem}.clips.json`,
      genome: row.genome ?? `${stem}.genome.json`,
      taxonomy: inheritTaxonomy(sheet.defaults?.taxonomy, row.taxonomy),
    };
  });
}

// models/sounds/<packId>.jsonnet: each file holds one pack's sound rows, so its name declares the pack, as a recipe
// file's does, and the packs are known without compiling the rows.
export const SOUNDS = 'models/sounds';
/** @param {string} [root] */
export const soundPackIds = (root = repo) =>
  readdirSync(join(root, SOUNDS))
    .filter((name) => name.endsWith('.jsonnet'))
    .sort()
    .map((name) => name.slice(0, -'.jsonnet'.length));

// Pack id -> its compiled rows by id, as written; tools/packages/impact-synth/src/schema.ts validates them.
/**
 * @param {string} [root]
 * @returns {Record<string, Record<string, unknown>>}
 */
export const readSoundPacks = (root = repo) =>
  Object.fromEntries(
    soundPackIds(root).map((pack) => [pack, JSON.parse(readFileSync(join(root, SOUNDS, `${pack}.json`), 'utf8'))]),
  );

/**
 * @param {unknown} row
 * @returns {row is SoundRow['row']}
 */
const hasSeeds = (row) =>
  typeof row === 'object' &&
  row !== null &&
  'seeds' in row &&
  Array.isArray(row.seeds) &&
  row.seeds.every((seed) => typeof seed === 'number');

// Every sound row with the files it is baked to under its pack: the row itself as data, so a tool can render it again,
// and one audio file per seed.
/**
 * @param {string} [root]
 * @returns {SoundRow[]}
 */
export const readSoundRows = (root = repo) =>
  Object.entries(readSoundPacks(root)).flatMap(([pack, rows]) =>
    Object.entries(rows).map(([id, row]) => {
      if (!hasSeeds(row)) throw new Error(`${SOUNDS}/${pack}.json: ${id} must list its seeds`);
      return {
        id,
        pack,
        row,
        data: `sounds/${id}.json`,
        variants: row.seeds.map((seed) => ({ seed, path: `sounds/${id}/${seed}.ogg` })),
      };
    }),
  );

// A model pack's smooth copy ships as a pack of its own beside it, so a consumer that draws only voxels never loads it;
// the why is in docs/decisions/0020-smooth-copy.md.
const SMOOTH = '.smooth';
/** @param {string} packId */
export const smoothPack = (packId) => `${packId}${SMOOTH}`;
// The pack a smooth pack is the copy of, or undefined for a pack that is not one.
/** @param {string} packId */
export const smoothedPack = (packId) => (packId.endsWith(SMOOTH) ? packId.slice(0, -SMOOTH.length) : undefined);

/**
 * @param {string} [root]
 * @returns {Set<string>}
 */
export function declaredPacks(root = repo) {
  const models = new Set([...recipePackIds(root), ...readRoster(root).map((row) => row.packId)]);
  const declared = new Set([...models, ...readMobRows(root).map((row) => row.pack), ...soundPackIds(root)]);
  const named = [...declared].filter((pack) => smoothedPack(pack) !== undefined);
  if (named.length > 0) throw new Error(`a source declares a smooth pack's name: ${named.sort().join(' ')}`);
  return new Set([...declared, ...[...models].map(smoothPack)]);
}

// Every directory directly under built/ must be a declared pack; flat files are not directories.
/**
 * @param {readonly string[]} paths
 * @param {ReadonlySet<string>} declared
 * @returns {string[]}
 */
export function undeclaredDirectories(paths, declared) {
  const directories = new Set(
    paths
      .map((path) => path.split('/'))
      .flatMap(([top, directory, ...rest]) =>
        top === 'built' && directory !== undefined && rest.length > 0 ? [directory] : [],
      ),
  );
  return [...directories]
    .filter((directory) => !declared.has(directory))
    .sort()
    .map((directory) => `built/${directory}`);
}
