// Proves that every fitted garment, a wearable drawn as worn pieces, leaves none of any doll poking through it at
// rest, and encloses what its pieces declare they cover. The cover check (tools/dollRig.mjs, `coverGaps`)
// counts a point a piece passes beneath as covered, so only the rest probe (site/clearance.mjs, `restClearance`) can
// see the skin standing out of the piece meant to cover it. A poke is allowed by models/rest-pokes.libsonnet: `poke`
// for one that is intended and says why, `unjudged` for one nobody has judged yet, which every run lists. Both name the
// doll they were judged on and are capped at the depth they were written for, and an entry that no longer applies
// fails. Why the check is a cached build check is in `docs/decisions/0019-garment-rest-check.md`.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join, resolve } from 'node:path';
import { restClearance } from '../site/clearance.mjs';
import { compareCodeUnits } from './codeUnitOrder.mjs';
import { coverGaps, dollRig, restMeshes } from './dollRig.mjs';
import {
  dollDressings,
  dollModels,
  dollOf,
  fittedGarments,
  modelMeshes,
  modelParts,
  readDressing,
  wornPieces,
  wornSites,
} from './dress.mjs';
import { shardUnits } from './generation.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { thingEntryFile } from './layout.mjs';
import { codeFingerprint, resultFolder } from './packages/thing-export/src/cache.ts';
import { workerPool } from './workerPool.mjs';

const repo = resolve(import.meta.dirname, '..');
const EPSILON = 1e-9;
// Caps are written to the millimetre, so one a millimetre above its poke is as tight as content can state it.
const LOOSE = 1e-3;
const millimetres = (metres) => (metres * 1e3).toFixed(1);

export const readRestPokes = (root = repo) => JSON.parse(evaluateJsonnet("import 'models/rest-pokes.libsonnet'", root));

// A doll and one garment's pieces as the probe takes them, plain data so a worker thread can run it: the dressing as
// the doll wears it, which holds its rig, each doll model's GLB and anchors, and each piece's GLB with the tags and
// declarations `wornPieces` reads.
function garmentTask(garment, { models, dressing, doll }, files) {
  const tags = new Map(models.map(({ id, tags: own }) => [id, own]));
  const pieces = wornPieces(garment, models, dressing).map(({ model: id }) => {
    const { glb, entry } = files.get(id);
    return {
      id,
      tags: tags.get(id),
      glb,
      ...(entry.covers ? { covers: entry.covers } : {}),
      ...(entry.soleLift === undefined ? {} : { soleLift: entry.soleLift }),
    };
  });
  return { garment, dressing, doll, pieces };
}

// One garment at rest, the unit a worker runs: `pokes`, the deepest poke of each body part out of each piece, as
// [{ bone, piece, depth }], and `gaps`, what its pieces declare they cover but do not enclose (tools/dollRig.mjs,
// `coverGaps`). Both read the same doll and pieces, so they are probed and kept together.
export function probeGarment({ garment, dressing, doll: figure, pieces }) {
  // A Buffer crosses to a worker thread as a plain Uint8Array, and the GLB readers take a Buffer.
  const glbs = new Map(
    [...Object.entries(figure), ...pieces.map((piece) => [piece.id, piece])].map(([id, { glb }]) => [
      id,
      Buffer.from(glb.buffer, glb.byteOffset, glb.byteLength),
    ]),
  );
  const doll = dollOf(
    dressing,
    Object.fromEntries(
      Object.entries(figure).map(([id, { anchors }]) => [id, { parts: modelParts(glbs.get(id)), anchors }]),
    ),
  );
  const rig = dollRig(doll, dressing);
  const meshes = new Map();
  // Only whole models are kept: the cover check picks a few primitives of a doll part, once each.
  const meshesOf = (id, keep) => {
    if (keep) return modelMeshes(glbs.get(id), keep);
    if (!meshes.has(id)) meshes.set(id, modelMeshes(glbs.get(id)));
    return meshes.get(id);
  };
  // A garment with pieces is placed by them alone, so it has no loose box or anchors to read.
  const loose = (id) => {
    throw new Error(`${garment}: ${id} is placed loose, not by its worn pieces`);
  };
  const sites = wornSites({ id: garment }, { dressing, doll, models: pieces, boxOf: loose, anchorsOf: loose });
  const deepest = new Map();
  for (const { bone, piece, depth } of restClearance(rig, restMeshes(rig, sites, meshesOf)).pokes) {
    const pair = `${bone}\0${piece}`;
    if (!(deepest.get(pair)?.depth >= depth)) deepest.set(pair, { bone, piece, depth });
  }
  const pokes = [...deepest.values()].sort(
    (a, b) => compareCodeUnits(a.bone, b.bone) || compareCodeUnits(a.piece, b.piece),
  );
  return { pokes, gaps: coverGaps(rig, sites, meshesOf) };
}

const HERE = import.meta.dirname;
// The code a probe runs. A cached probe is only as good as the code and the runtime that made it.
const CHECKER_CODE = [
  'restPoke.mjs',
  'dress.mjs',
  'dollRig.mjs',
  'glb.mjs',
  '../site/clearance.mjs',
  '../site/hiding.mjs',
  '../site/kinematics.mjs',
];
const checkerHash = () => codeFingerprint(HERE, CHECKER_CODE);
const CACHE_FOLDER = 'rest-poke';

// A GLB stands in the key by its digest: the key is what made the result, and the bytes are only how it was carried.
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const taskHash = (task, checker) =>
  createHash('sha256')
    .update(checker)
    .update(
      JSON.stringify(task, function bytesByDigest(name, value) {
        return this[name] instanceof Uint8Array ? digest(this[name]) : value;
      }),
    )
    .digest('hex')
    .slice(0, 32);

// The pokes and cover gaps of every fitted garment among `models` ({ id, tags }) on every doll, by doll
// then garment (`probeGarment`): from the cache folder when a garment's inputs and the checker are as they were, else
// probed on worker threads, one garment each, and kept. `modelOf(id)` gives a model's { glb, entry }, its GLB and model
// entry, from a built tree or as generated. With `shard`, only that shard of the garments is probed, so CI can spread a
// clean build's probes over runners like its models (tools/build.mjs, fillCacheShard). With `prune`, entries no
// garment uses any more go, as a full build is the only run that knows them all.
/**
 * @param {{ models: readonly { id: string; tags?: unknown }[]; modelOf: (id: string) => Promise<{ glb: Buffer; entry: unknown }> }} generated
 * @param {{
 *   root?: string;
 *   cache?: string | undefined;
 *   workers?: number;
 *   prune?: boolean;
 *   shard?: import('./generation.mjs').Shard | undefined;
 *   checker?: string;
 * }} [options]
 */
export async function restPokeResults(
  { models, modelOf },
  { root = repo, cache, workers = availableParallelism(), prune = false, shard, checker = checkerHash() } = {},
) {
  const garments = fittedGarments(models).sort();
  const mine = shard === undefined ? garments : shardUnits(garments, shard);
  if (mine.length === 0) return { results: {}, reused: 0, probed: 0 };
  const dressings = dollDressings(readDressing(root));
  const pieceIds = dressings.flatMap((dressing) =>
    mine.flatMap((garment) => wornPieces(garment, models, dressing).map(({ model }) => model)),
  );
  const dollIds = dressings.flatMap(dollModels);
  const files = new Map(
    await Promise.all([...new Set([...dollIds, ...pieceIds])].map(async (id) => [id, await modelOf(id)])),
  );
  const tasks = dressings.flatMap((dressing) => {
    const doll = Object.fromEntries(
      dollModels(dressing).map((id) => [id, { glb: files.get(id).glb, anchors: files.get(id).entry.anchors }]),
    );
    return mine.map((garment) => {
      const task = garmentTask(garment, { models, dressing, doll }, files);
      return { doll: dressing.id, garment, task, hash: taskHash(task, checker) };
    });
  });
  const folder = cache === undefined ? undefined : resultFolder(resolve(cache), CACHE_FOLDER);
  const results = Object.fromEntries(dressings.map(({ id }) => [id, {}]));
  const missing = [];
  for (const entry of tasks) {
    const stored = folder?.get(entry.hash);
    if (stored === undefined) missing.push(entry);
    else results[entry.doll][entry.garment] = stored;
  }
  if (missing.length > 0) {
    const pool = workerPool(import.meta.url, 'probeGarment', Math.min(workers, missing.length));
    try {
      await Promise.all(
        missing.map(async ({ doll, garment, task, hash }) => {
          results[doll][garment] = await pool.run(task);
          folder?.put(hash, results[doll][garment]);
        }),
      );
    } finally {
      await pool.close();
    }
  }
  if (prune) folder?.prune(new Set(tasks.map(({ hash }) => hash)));
  return { results, reused: tasks.length - missing.length, probed: missing.length };
}

// A declaration a worn piece does not enclose, which a consumer hiding the body by it would open to view.
const gapProblem = (doll, garment, { piece, side, name, open, at }) =>
  `${garment} on ${doll}: ${piece} (${side}) covers ${name} but would hide body it does not enclose: ${
    open === 'nothing' ? 'it names nothing there' : `${open} samples show, one at [${at.map((x) => x.toFixed(3))}]`
  }`;

// The report on every garment at rest, as { problems, notes }, from what `restPokeResults` returned and the allowances
// of models/rest-pokes.libsonnet, each of which names the doll it was judged on. A problem is a cover gap, which no
// entry allows, a poke that no entry covers to its depth, and an entry that is stale: its doll or garment is not among
// the results or nothing pokes there any more, or it is listed twice or capped above what it measures by more than a
// millimetre. A note is a poke marked `unjudged`, said again on every run.
export function restPokeReport(resultsByDoll, { pokes: judged, unjudged }) {
  const results = Object.entries(resultsByDoll).flatMap(([doll, own]) =>
    Object.entries(own).map(([garment, result]) => ({ doll, garment, ...result })),
  );
  const problems = results.flatMap(({ doll, garment, gaps }) => gaps.map((gap) => gapProblem(doll, garment, gap)));
  const notes = [];
  const pairOf = ({ doll, garment, bone, piece }) => `${doll}\0${garment}\0${bone}\0${piece}`;
  const allowed = new Map([...judged, ...unjudged].map((entry) => [pairOf(entry), entry]));
  const found = new Map();
  for (const { doll, garment, pokes } of results) {
    for (const poke of pokes) {
      found.set(pairOf({ doll, garment, ...poke }), poke);
      const cap = allowed.get(pairOf({ doll, garment, ...poke }))?.depth ?? 0;
      if (poke.depth <= cap + EPSILON) continue;
      const limit = cap > 0 ? `, more than the ${millimetres(cap)} mm allowed` : '';
      problems.push(
        `${garment} on ${doll}: the doll's ${poke.bone} pokes out of ${poke.piece} at rest by ${millimetres(poke.depth)} mm${limit}`,
      );
    }
  }
  const seen = new Set();
  for (const entry of [...judged, ...unjudged]) {
    const pair = pairOf(entry);
    const where = `${entry.garment} on ${entry.doll}: allowed rest poke of ${entry.bone} out of ${entry.piece}`;
    const poke = found.get(pair);
    if (seen.has(pair)) problems.push(`${where} is listed twice`);
    else if (!poke) problems.push(`${where} is stale: nothing pokes there any more`);
    else if (entry.depth - poke.depth > LOOSE + EPSILON)
      problems.push(
        `${where} is capped at ${millimetres(entry.depth)} mm, far above the ${millimetres(poke.depth)} mm it measures`,
      );
    seen.add(pair);
    if (poke && unjudged.includes(entry))
      notes.push(
        `${entry.garment} on ${entry.doll}: the doll's ${entry.bone} pokes out of ${entry.piece} at rest by ${millimetres(poke.depth)} mm and is not judged: ${entry.note}`,
      );
  }
  return { problems, notes };
}

// A built tree's models as `restPokeResults` reads them: `models` is the build's model list, each with its pack, GLB
// path and taxonomy, and every model entry is the thing export's sidecar beside its GLB.
export const treeModels = (out, models) => {
  const byId = new Map(models.map((model) => [model.id, model]));
  return {
    models: models.map(({ id, taxonomy }) => ({ id, tags: taxonomy?.tags })),
    modelOf: async (id) => {
      const { pack, path } = byId.get(id);
      return {
        glb: readFileSync(join(out, pack, path)),
        entry: JSON.parse(readFileSync(join(out, thingEntryFile(pack, id)), 'utf8')),
      };
    },
  };
};

// The check over a model set, as `restPokeReport` gives it, with every garment probed or reused from the cache.
/**
 * @param {Parameters<typeof restPokeResults>[0]} generated
 * @param {Parameters<typeof restPokeResults>[1]} [options]
 */
export const restPokeCheck = async (generated, { root = repo, ...options } = {}) =>
  restPokeReport((await restPokeResults(generated, { root, ...options })).results, readRestPokes(root));
