// model-history.json: for each GLB model id and each vehicle id (its placements file), the release that introduced it, the release that last changed its file and
// the file's hash, so the showcase can say when a model appeared and moved. Builds are reproducible (the assets workflow
// holds two builds equal), so a hash differs between releases only when the model really changed. Each release carries
// the cumulative file, built from the previous release's; why the history is not read from git is that a model's id and
// source move, while its published bytes are what a consumer sees.
// A model absent from a release leaves the history, so one that returns is new again: a gap in the releases is a gap a
// consumer could have seen, and keeping the old entry would claim a continuity nobody can check.
// Usage: node tools/model-history.mjs release --tag <v*> --built <dir> --out <file>   merge the previous release's history
//        node tools/model-history.mjs fetch --out <file> [--optional]   the latest release's history, for the showcase
//        node tools/model-history.mjs backfill --out <file> --work <dir>   rebuild it by walking every release
// The release commands read GitHub through `gh`.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { MANIFEST } from './manifest.mjs';

export const HISTORY_ASSET = 'model-history.json';

const VERSION = /^v(\d+)\.(\d+)\.(\d+)$/;

export function compareVersions(a, b) {
  const parse = (v) => {
    const match = VERSION.exec(v);
    if (!match) throw new Error(`${v} is not a vMAJOR.MINOR.PATCH version`);
    return match.slice(1).map(Number);
  };
  const [pa, pb] = [parse(a), parse(b)];
  return pa.reduce((diff, part, i) => diff || part - pb[i], 0);
}

const releaseVersions = (tags) => tags.filter((tag) => VERSION.test(tag)).sort(compareVersions);

/** The release before `tag`, or the latest release when no tag is given; undefined when there is none. */
export function previousTag(tags, tag) {
  const earlier = releaseVersions(tags).filter((v) => tag === undefined || compareVersions(v, tag) < 0);
  return earlier.at(-1);
}

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

/**
 * id -> sha256 of the file a built tree's manifest names: a model's GLB, or a vehicle's placements file, which is what
 * a vehicle is made of beside the models at its sites.
 */
export function hashModels(built, manifest) {
  const hashes = {};
  const add = (id, pack, path) => {
    if (Object.hasOwn(hashes, id)) throw new Error(`${id} names more than one file to hash`);
    hashes[id] = sha256(join(built, pack, path));
  };
  for (const { id, pack, path } of manifest.models) if (path.endsWith('.glb')) add(id, pack, path);
  for (const { id, pack, path } of manifest.vehicles ?? []) add(id, pack, path);
  return hashes;
}

/** The previous history's entries by the ids this release holds: renamed ids move, removed ones are dropped. */
function carry(previous, hashes, renames) {
  const carried = {};
  for (const [id, entry] of Object.entries(previous?.models ?? {})) {
    const current = renames[id] ?? id;
    if (!Object.hasOwn(hashes, current)) continue;
    const kept = carried[current];
    carried[current] = kept === undefined ? entry : {
      introduced: [kept.introduced, entry.introduced].sort(compareVersions)[0],
      updated: [kept.updated, entry.updated].sort(compareVersions).at(-1),
      sha256: null,
    };
  }
  return carried;
}

/**
 * The history after `version`. previous: the earlier release's history or undefined; hashes: the models of this
 * release; renames: retired id -> current id. A renamed model keeps its history, and merged models keep the earliest
 * introduction; merging counts as a change, since no one hash stands for both.
 */
export function mergeHistory({ previous, version, hashes, renames = {} }) {
  const carried = carry(previous, hashes, renames);
  const models = {};
  for (const [id, sha256] of Object.entries(hashes).sort(([a], [b]) => (a < b ? -1 : 1))) {
    const was = carried[id];
    if (was === undefined) models[id] = { introduced: version, updated: version, sha256 };
    else models[id] = was.sha256 === sha256 ? was : { introduced: was.introduced, updated: version, sha256 };
  }
  return { version, models };
}

/**
 * How each id of a later build stands against a release's history, through the renames since: its two versions and
 * whether the build differs, or null when no release holds it.
 */
export function standings(history, hashes, renames = {}) {
  const carried = carry(history, hashes, renames);
  return Object.fromEntries(Object.keys(hashes).map((id) => {
    const entry = carried[id];
    return [id, entry === undefined ? null : { introduced: entry.introduced, updated: entry.updated, changed: entry.sha256 !== hashes[id] }];
  }));
}

/**
 * A vehicle stands by its placements file and the models at its sites: it was introduced with its placements file, a
 * part's introduction says nothing of the vehicle, and it last changed when its placements or any part did. A part no
 * release holds is a change.
 */
export function vehicleStanding(own, parts) {
  if (own === null) return null;
  const updates = [own.updated, ...parts.filter(Boolean).map(({ updated }) => updated)];
  return {
    introduced: own.introduced,
    updated: updates.sort(compareVersions).at(-1),
    changed: own.changed || parts.some((part) => part === null || part.changed),
  };
}

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 2 ** 28 });
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

const releaseTags = () => JSON.parse(gh('release', 'list', '--json', 'tagName', '--limit', '1000')).map(({ tagName }) => tagName);

function download(tag, dir, ...patterns) {
  mkdirSync(dir, { recursive: true });
  gh('release', 'download', tag, '--dir', dir, '--clobber', ...patterns.flatMap((p) => ['--pattern', p]));
}

/** The history a release published, or undefined when it carries none. */
function publishedHistory(tag, dir) {
  const assets = JSON.parse(gh('release', 'view', tag, '--json', 'assets')).assets.map(({ name }) => name);
  if (!assets.includes(HISTORY_ASSET)) return undefined;
  download(tag, dir, HISTORY_ASSET);
  return readJson(join(dir, HISTORY_ASSET));
}

const write = (file, history) => writeFileSync(file, `${JSON.stringify(history, null, 2)}\n`);

function releaseCommand({ tag, built, out }) {
  const before = previousTag(releaseTags(), tag);
  let previous;
  if (before !== undefined) {
    const dir = join(resolve(out, '..'), `.previous-${before}`);
    previous = publishedHistory(before, dir);
    rmSync(dir, { recursive: true, force: true });
    // A silent fresh start would stamp every model as introduced now, and that error could not be undone later.
    if (previous === undefined) throw new Error(`${before} has no ${HISTORY_ASSET}; build one with \`node tools/model-history.mjs backfill --out ${HISTORY_ASSET} --work <scratch dir>\` and attach it to that release`);
  }
  const manifest = readJson(join(built, MANIFEST));
  write(out, mergeHistory({ previous, version: tag, hashes: hashModels(built, manifest), renames: manifest.renames }));
}

function fetchCommand({ out, optional }) {
  const latest = previousTag(releaseTags());
  const history = latest && publishedHistory(latest, join(resolve(out, '..'), '.latest'));
  rmSync(join(resolve(out, '..'), '.latest'), { recursive: true, force: true });
  if (history !== undefined) return write(out, history);
  const why = latest === undefined ? 'no release yet' : `${latest} has no ${HISTORY_ASSET}`;
  if (!optional) throw new Error(why);
  console.warn(`::warning::the showcase shows no model versions: ${why}`);
}

// Walks the releases oldest first, merging each one's models, so the result is what the release job would have written
// had it run at every tag. A release's archives are deleted once hashed.
function backfillCommand({ out, work }) {
  let history;
  for (const tag of releaseVersions(releaseTags())) {
    const dir = join(work, tag);
    download(tag, dir, MANIFEST, '*.tar.gz');
    for (const archive of readdirSync(dir).filter((f) => f.endsWith('.tar.gz'))) execFileSync('tar', ['-C', dir, '-xzf', join(dir, archive)]);
    const manifest = readJson(join(dir, MANIFEST));
    history = mergeHistory({ previous: history, version: tag, hashes: hashModels(dir, manifest), renames: manifest.renames });
    rmSync(dir, { recursive: true, force: true });
    console.log(`${tag}: ${Object.keys(history.models).length} models, ${Object.values(history.models).filter((m) => m.updated === tag && m.introduced !== tag).length} changed, ${Object.values(history.models).filter((m) => m.introduced === tag).length} new`);
  }
  write(out, history);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, ...rest] = process.argv.slice(2);
  const { values } = parseArgs({ args: rest, options: { tag: { type: 'string' }, built: { type: 'string' }, out: { type: 'string' }, work: { type: 'string' }, optional: { type: 'boolean', default: false } } });
  const commands = { release: releaseCommand, fetch: fetchCommand, backfill: backfillCommand };
  if (!commands[command] || !values.out) throw new Error('usage: node tools/model-history.mjs release|fetch|backfill --out <file> (see the file header)');
  if (command === 'backfill' && !values.work) throw new Error('backfill needs --work <dir>, where it downloads each release and deletes it again');
  if (command === 'release' && !(values.tag && values.built)) throw new Error('release needs --tag <v*> and --built <dir>');
  commands[command]({ ...values, out: resolve(values.out) });
}
