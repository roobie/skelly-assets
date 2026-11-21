// @ts-check
// The catalogue as one JSON file per row, `<folder>/<id>.json`, and a manifest that lists the ids in catalogue order.
// A reader wants one row or a few by id, and an edit reaches one or two rows, so a row's file is written only when its
// bytes change and nothing a dev server watches moves but that. The folder is not the source of truth, because a
// refresh races its readers and its sibling refreshes: the manifest is, and the files it does not list are strays,
// swept by readdir. A reader may see the catalogue half way between two refreshes; a row file is never half written.
// The manifest lists the ids under the row file that holds them, so a reader that evaluates one row's Jsonnet can
// evaluate its file alone. It also records the fragment each row file's rows were written from, since the twins' stamp
// records twins and a checkout on another branch moves it without touching this folder.
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { jsonText, replaceFileIfChanged } from './generated-json.mjs';
import { ID_PATTERN } from './packages/thing-core/src/schema.ts';

/** @typedef {{ folder: string, manifest: string }} CatalogueOutput Where the rows go, and the manifest that lists them. */
/**
 * @typedef {{ shards: Record<string, { digest: string, ids: string[] }> }} CatalogueManifest Each row file's fragment
 * digest and its rows' ids, the row files in catalogue order.
 */
/**
 * @typedef {object} Shard The rows of one row file.
 * @property {string} path The row file, which names it in a failure.
 * @property {string} digest The digest of its fragment, which its rows are written from.
 * @property {readonly string[]} ids Its rows' ids, in order.
 * @property {() => string} rows Its rows as JSON text; read only for a row file whose rows are to be written.
 */

const ROW_SUFFIX = '.json';
// What a refresh leaves of a row file it was writing when it died; see `replaceFile`.
const PARTIAL = /\.json\.(\d+)\.partial$/;
const PARTIAL_LIFETIME_MS = 60 * 60 * 1000;

/** @returns {CatalogueManifest | undefined} The manifest as the last refresh wrote it, none when there is no sound one. */
const readManifest = (/** @type {string} */ path) => {
  try {
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    const shards = manifest?.shards;
    return typeof shards === 'object' &&
      shards !== null &&
      !Array.isArray(shards) &&
      Object.values(shards).every((shard) => typeof shard?.digest === 'string' && Array.isArray(shard.ids))
      ? manifest
      : undefined;
  } catch (error) {
    if (error instanceof SyntaxError || /** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT')
      return undefined;
    throw error;
  }
};

/** @returns {Set<string>} The names in the folder, none when it is missing. */
const namesIn = (/** @type {string} */ folder) => {
  try {
    return new Set(readdirSync(folder));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return new Set();
    throw error;
  }
};

const fileOf = (/** @type {string} */ id) => `${id}${ROW_SUFFIX}`;

/**
 * @param {CatalogueOutput} output
 * @param {Readonly<Record<string, string>>} digests Each row file's fragment digest, in catalogue order.
 * @returns {boolean} Whether the catalogue on disk is the one these fragments make, every row's file present.
 */
export const catalogueIsCurrent = ({ folder, manifest }, digests) => {
  const written = readManifest(manifest);
  if (written === undefined) return false;
  const shards = Object.entries(written.shards);
  const writtenDigests = shards.map(([path, { digest }]) => [path, digest]);
  if (JSON.stringify(writtenDigests) !== JSON.stringify(Object.entries(digests))) return false;
  const present = namesIn(folder);
  return shards.every(([, { ids }]) => ids.every((id) => present.has(fileOf(id))));
};

/**
 * @param {readonly Shard[]} shards
 * @returns {string[]} Every row's id, in the order of the shards.
 */
const idsOf = (shards) => {
  /** @type {Map<string, string>} */
  const holder = new Map();
  for (const { path, ids } of shards)
    for (const id of ids) {
      // An id is a file name, so one that is not a plain id could name a file outside the folder.
      if (!ID_PATTERN.test(id)) throw new Error(`${path}: row ${id} has no id of lowercase letters, digits and _`);
      const other = holder.get(id);
      if (other !== undefined) throw new Error(`${path}: row ${id} is also a row of ${other}`);
      holder.set(id, path);
    }
  return [...holder.keys()];
};

// A partial file is another refresh's row on its way while its process lives, and a crash's leavings after.
/** @param {number} pid */
const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return /** @type {NodeJS.ErrnoException} */ (error).code === 'EPERM';
  }
};

/** @param {string} path */
const isAbandoned = (path) => {
  const pid = PARTIAL.exec(path)?.[1];
  if (pid === undefined) return false;
  try {
    return !isAlive(Number(pid)) || Date.now() - statSync(path).mtimeMs > PARTIAL_LIFETIME_MS;
  } catch (error) {
    // Its refresh renamed it into place since the folder was read.
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return false;
    throw error;
  }
};

// Rows first, then the manifest, then the sweep: whatever the manifest lists exists, whenever a reader reads it, and a
// failure before the manifest leaves the catalogue as it was but for rows no manifest lists yet.
/**
 * @param {CatalogueOutput} output
 * @param {readonly Shard[]} shards In catalogue order.
 */
export const writeCatalogueRows = ({ folder, manifest }, shards) => {
  const ids = idsOf(shards);
  mkdirSync(folder, { recursive: true });
  const before = readManifest(manifest)?.shards;
  const present = namesIn(folder);
  for (const { path, digest, ids: own, rows } of shards) {
    if (before?.[path]?.digest === digest && own.every((id) => present.has(fileOf(id)))) continue;
    for (const row of /** @type {{ id: string }[]} */ (JSON.parse(rows())))
      replaceFileIfChanged(join(folder, fileOf(row.id)), jsonText(row));
  }
  /** @type {CatalogueManifest} */
  const written = {
    shards: Object.fromEntries(shards.map(({ path, digest, ids: own }) => [path, { digest, ids: [...own] }])),
  };
  replaceFileIfChanged(manifest, jsonText(written));
  const listed = new Set(ids.map(fileOf));
  for (const name of namesIn(folder)) {
    const path = join(folder, name);
    if ((name.endsWith(ROW_SUFFIX) && !listed.has(name)) || isAbandoned(path)) rmSync(path, { force: true });
  }
};
