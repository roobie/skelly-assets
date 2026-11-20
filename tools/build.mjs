// @ts-check
// Builds the repo's models from their sources in models/ into GLB files.
// Usage: node tools/build.mjs [--out dir] [--cache dir | --no-cache] [rowId ...], or node tools/build.mjs --shard i/n
// [--cache dir] to only fill the cache with one shard of the complete build's cacheable rows (fillCacheShard). The cache
// is tools/generation.mjs, DEFAULT_CACHE, unless --cache names another; --no-cache generates every model.
// With no row ids it first holds every model's title and taxonomy to their rules and every vehicle's parts at different
// sites clear of each other (tools/check-sources.mjs), then builds every
// id of the roster, models/export.json, every row of every recipe file in models/recipes/, every vehicle's placements
// (tools/placements.mjs), each doll's rig (tools/dollRig.mjs, exportDollRigs), the player's baked wields and locomotion
// (tools/wields.mjs and tools/locomotion.mjs) and built/manifest.json over them,
// the mob rows and the sound rows (tools/mobs.mjs and tools/sounds.mjs write their files), with each pack's
// dependencies (tools/packs.mjs) and the finish library (tools/manifest.mjs); with ids it builds only those
// rows, from the roster source or a recipe file, with no pack index, placements or manifest; referenced building-kit
// definitions still accompany their sidecars, so one model builds
// without the rest. Each model is written into --out (by default built/)
// at its pack's path (tools/layout.mjs, outputPath), with its sidecar; a roster-source id outside the roster is written
// flat, as its GLB alone, for comparison builds into a scratch folder. Needs the node in .node-version, which runs the TypeScript directly, and
// `npm ci` in tools.
/** @import { GeneratedModel, WrittenRecipe } from './packages/thing-export/src/files.ts' */
/** @import { RecipeRow } from './packages/thing-export/src/recipe.ts' */
/** @import { BaseIssue } from 'valibot' */
/** @import { generateRow, RecipeTask, RecipeTool, RecipeToolName } from './recipeTools.mjs' */
/** @import { WieldSets } from './wields.mjs' */
/** @import { WorkerPool } from './workerPool.mjs' */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { exportBuildingKits } from './buildingKits.mjs';
import { modelSources, sourceReport, vehicleReport } from './check-sources.mjs';
import { exportDollRigs } from './dollRig.mjs';
import { dollDressing, PLAYER, readDollParts, readDressing, wornOnParts } from './dress.mjs';
import { entryFolder } from './entryFolder.mjs';
import { CACHE_OPTIONS, cacheFolder, parseShard, shardUnits } from './generation.mjs';
import { declaredPacks, outputPath, readMobRows, readRoster, readSoundRows, smoothPack } from './layout.mjs';
import { exportLocomotion } from './locomotion.mjs';
import {
  buildManifest,
  MANIFEST,
  manifestJson,
  mobManifest,
  readCredits,
  readRenames,
  soundManifest,
} from './manifest.mjs';
import { readDependencies } from './packs.mjs';
import { danglingPartItems } from './partItems.mjs';
import { exportPlacements, readPlacements, readVehicleRows } from './placements.mjs';
import { readRecipes } from './recipes.mjs';
import { recipeTools } from './recipeTools.mjs';
import { restPokeCheck, restPokeResults, treeModels } from './restPoke.mjs';
import { readSeveredParts } from './severedParts.mjs';
import { overlapResults, readSitePieces } from './siteOverlap.mjs';
import { SOUND_SAMPLE_RATE } from './sounds.mjs';
import { installJsonnetSources } from './sources.mjs';
import { loadOutStowage } from './stowage.mjs';
import { swingResults } from './swingClearance.mjs';
import { readVocabulary } from './taxonomy.mjs';
import { exportWields, wieldShard } from './wields.mjs';
import { workerPool } from './workerPool.mjs';

const here = import.meta.dirname;
const repo = resolve(here, '..');

/** @typedef {WrittenRecipe['models'][number]} WrittenModel */

/**
 * One model a recipe export wrote.
 * @typedef {object} RecipeModel
 * @property {string} id
 * @property {string} kind
 * @property {string} pack
 * @property {string} path The GLB's logical path under the pack.
 * @property {{ pack: string; path: string }} smooth The smooth copy's pack and its GLB's logical path under it.
 * @property {readonly string[]} nodes The GLB's part node names from the resolved assembly.
 * @property {WrittenModel['label'] | undefined} [label]
 * @property {WrittenModel['paintable'] | undefined} [paintable]
 * @property {WrittenModel['covers'] | undefined} [covers]
 * @property {WrittenModel['soleLift'] | undefined} [soleLift]
 * @property {number | undefined} [massKg]
 * @property {number | undefined} [volumeM3]
 */

/**
 * @typedef {object} RecipePool
 * @property {(task: RecipeTask) => Promise<GeneratedModel>} run
 */

/** @typedef {{ reused: number; generated: number }} CacheUsage */

// Every model is generated on a worker thread; the files are written here in source order, so the tree does not
// depend on which model finished first. With a cache folder, unchanged models come from it (recipeTools.mjs, generateRow),
// and the pool records each tool's entries it used, so a complete build can report and keep exactly those.
/** @param {string} [cache] */
export const exportPool = (cache) => {
  /** @type {WorkerPool<typeof generateRow>} */
  const pool = workerPool(new URL('./recipeTools.mjs', import.meta.url), 'generateRow');
  /** @type {Map<string, Set<string>>} */
  const used = new Map();
  /** @type {CacheUsage} */
  const counts = { reused: 0, generated: 0 };
  return {
    /** @type {RecipePool['run']} */
    run: async (task) => {
      /** @type {GeneratedModel} */
      const generated = await pool.run({ ...task, cache });
      if (generated.entry === undefined) counts.generated += 1;
      else {
        counts[generated.entry.reused ? 'reused' : 'generated'] += 1;
        used.set(task.tool, (used.get(task.tool) ?? new Set()).add(generated.entry.key));
      }
      return generated;
    },
    close: () => pool.close(),
    // How many models this pool took from the cache and how many it generated.
    usage: () => ({ ...counts }),
    // Every entry of a tool's cache but those this pool used goes; only a build that ran every row may prune.
    prune: async () => {
      if (cache === undefined) throw new Error('an export pool with no cache has no entries to prune');
      for (const [name, tool] of Object.entries(await recipeTools())) {
        if (tool.code !== undefined) entryFolder(cache, name).prune(used.get(name) ?? new Set());
      }
    },
  };
};

/**
 * What `use` gives on an export pool of its own, closed once `use` settles.
 * @template T
 * @param {(pool: RecipePool) => Promise<T>} use
 */
const withOwnPool = async (use) => {
  const pool = exportPool();
  try {
    return await use(pool);
  } finally {
    await pool.close();
  }
};

/** @param {CacheUsage} usage */
const cacheReport = ({ reused, generated }) => `export cache: ${reused} model(s) reused, ${generated} generated`;

/**
 * A row's `kind` and `id` as written, before any loader has checked the row.
 * @param {unknown} row
 */
const rowHead = (row) =>
  typeof row === 'object' && row !== null
    ? { kind: 'kind' in row ? row.kind : undefined, id: 'id' in row ? row.id : undefined }
    : { kind: undefined, id: undefined };

/**
 * Splits one recipe file's rows by owning tool, before any loader sees them.
 * @param {string} packId
 * @param {unknown} rows
 * @param {Readonly<Record<string, { readonly kinds: readonly string[] }>>} tools
 * @returns {Record<string, unknown[]>}
 */
export function partitionRecipe(packId, rows, tools) {
  if (!Array.isArray(rows)) throw new Error(`models/recipes/${packId}: a recipe file is an array of rows`);
  const partitions = Object.entries(tools).map(([name, { kinds }]) => ({
    name,
    kinds,
    /** @type {unknown[]} */
    rows: [],
  }));
  /** @type {Map<string, (typeof partitions)[number]>} */
  const owners = new Map();
  for (const partition of partitions) {
    for (const kind of partition.kinds) {
      const other = owners.get(kind);
      if (other !== undefined) throw new Error(`kind ${kind} is owned by both ${other.name} and ${partition.name}`);
      owners.set(kind, partition);
    }
  }
  for (const row of rows) {
    const { kind, id } = rowHead(row);
    const owner = typeof kind === 'string' ? owners.get(kind) : undefined;
    if (owner === undefined) throw new Error(`models/recipes/${packId}: ${id} has kind ${kind}, which no tool owns`);
    owner.rows.push(row);
  }
  /** @type {Map<unknown, string>} */
  const seen = new Map();
  for (const { name, rows: partition } of partitions) {
    for (const row of partition) {
      const { id } = rowHead(row);
      const other = seen.get(id);
      if (other !== undefined && other !== name) {
        throw new Error(`models/recipes/${packId}: ${id} is exported by two tools, ${other} and ${name}`);
      }
      seen.set(id, name);
    }
  }
  return Object.fromEntries(partitions.map(({ name, rows }) => [name, rows]));
}

/** @typedef {Readonly<Record<RecipeToolName, RecipeTool>>} RecipeTools */

/**
 * Each recipe file's rows of the named tools, one unit per pack and tool, in source order.
 * @param {string} root
 * @param {RecipeTools} tools
 * @param {readonly RecipeToolName[]} names
 */
function recipeUnits(root, tools, names) {
  for (const name of names) if (!Object.hasOwn(tools, name)) throw new Error(`no recipe tool ${name}`);
  const packs = readRecipes(root).map(({ packId, value }) => ({
    packId,
    partitions: partitionRecipe(packId, value, tools),
  }));
  return packs.flatMap(({ packId, partitions }) =>
    names.flatMap((name) => {
      const rows = partitions[name];
      return rows !== undefined && rows.length > 0 ? [{ packId, name, rows }] : [];
    }),
  );
}

/**
 * Each unit with its tool's tasks, one per row, which loads (and so checks) every unit's rows; past that load each row
 * is a RecipeRow.
 * @template {{ name: RecipeToolName; rows: readonly unknown[] }} Unit
 * @param {RecipeTools} tools
 * @param {readonly Unit[]} units
 * @returns {Promise<(Omit<Unit, 'rows'> & { rows: readonly RecipeRow[]; tasks: readonly unknown[] })[]>}
 */
const withTasks = (tools, units) =>
  Promise.all(
    units.map(async (unit) => {
      const tasks = await tools[unit.name].tasks(unit.rows);
      return { ...unit, rows: /** @type {readonly RecipeRow[]} */ (unit.rows), tasks };
    }),
  );

/**
 * A model's taxonomy tags, whatever its row holds; the vocabulary check holds them to their rules.
 * @param {unknown} taxonomy
 */
const tagsOf = (taxonomy) =>
  typeof taxonomy === 'object' && taxonomy !== null && 'tags' in taxonomy ? taxonomy.tags : undefined;

/**
 * The units' models as tools/restPoke.mjs reads them, generated through the pool, so a shard checks garments with no
 * tree.
 * @param {readonly { name: RecipeToolName; rows: readonly RecipeRow[]; tasks: readonly unknown[] }[]} units
 * @param {RecipePool} pool
 */
const generatedModels = (units, pool) => {
  const runs = new Map(
    units.flatMap(({ name, rows, tasks }) =>
      rows.map((row, at) => /** @type {const} */ ([row.id, { tool: name, task: tasks[at] }])),
    ),
  );
  return {
    models: units.flatMap(({ rows }) => rows.map(({ id, taxonomy }) => ({ id, tags: tagsOf(taxonomy) }))),
    /** @param {string} id */
    modelOf: async (id) => {
      const run = runs.get(id);
      if (run === undefined) throw new Error(`no generated model ${id}`);
      const { glb, modelEntry } = await pool.run(run);
      // A GLB crosses back from a worker thread as a plain Uint8Array, and the GLB readers take a Buffer, as a tree gives.
      return { glb: Buffer.from(glb.buffer, glb.byteOffset, glb.byteLength), entry: modelEntry };
    },
  };
};

/**
 * Builds each recipe file of root's models/recipes/ through the named tools into out/<packId>/, in each tool's layout.
 * Every file is partitioned and loaded (and so checked) before any output is written. Returns every model written, with
 * its pack, kind, GLB path under the pack, part node names and label, and every file written as <packId>/<logical path>.
 * A caller exporting more than recipes passes its own pool, so every export shares the cores. With an `ids` set, every
 * row is still loaded, since a loader may check rows against each other, but only those rows are written, and no pack
 * index, which would misstate the pack.
 * @param {object} options
 * @param {string} [options.root]
 * @param {string} [options.out]
 * @param {readonly RecipeToolName[]} options.tools
 * @param {RecipePool} [options.pool] Generates each row; the default is a pool of worker threads.
 * @param {ReadonlySet<string> | undefined} [options.ids]
 * @returns {Promise<{ models: RecipeModel[]; files: string[] }>}
 */
export async function exportRecipes({ root = repo, out = join(repo, 'built'), tools: names, pool, ids }) {
  await installJsonnetSources();
  const tools = await recipeTools();
  const units = await withTasks(tools, recipeUnits(root, tools, names));
  const selected =
    ids === undefined
      ? units
      : units
          .map((unit) => ({
            ...unit,
            tasks: unit.rows.flatMap((row, at) => (ids.has(row.id) ? [unit.tasks[at]] : [])),
          }))
          .filter(({ tasks }) => tasks.length > 0);
  /** @param {RecipePool} generator */
  const generate = (generator) =>
    Promise.all(
      selected.map(async (unit) => ({
        ...unit,
        generated: await Promise.all(unit.tasks.map((task) => generator.run({ tool: unit.name, task }))),
      })),
    );
  const packs = pool ? await generate(pool) : await withOwnPool(generate);
  /** @type {RecipeModel[]} */
  const models = [];
  /** @type {string[]} */
  const files = [];
  for (const { packId, name, generated } of packs) {
    const written = await writePack(out, packId, tools[name], generated, { index: ids === undefined });
    models.push(...written.models);
    files.push(...written.files);
  }
  return { models, files };
}

/**
 * Writes one pack's generated models into out/<packId>/ in its tool's layout, each GLB with its sidecar, and its smooth
 * copy at the same path in out/<packId>.smooth/, and with `index` the pack's index if the tool keeps one. Returns each
 * model written, with its pack and its smooth copy's, and every file written as <packId>/<logical path>.
 * @param {string} out
 * @param {string} packId
 * @param {Pick<RecipeTool, 'directory' | 'index'>} tool
 * @param {readonly GeneratedModel[]} generated
 * @param {{ index: boolean }} options
 * @returns {Promise<{ models: RecipeModel[]; files: string[] }>}
 */
async function writePack(out, packId, tool, generated, { index }) {
  const { writeModelExports } = await import('./packages/thing-export/src/files.ts');
  /** @param {string} pack */
  const base = (pack) => resolve(out, outputPath(pack, tool.directory), '..');
  const smooth = smoothPack(packId);
  const written = writeModelExports(generated, base(packId), tool.directory, {
    index: index && tool.index,
    smoothBase: base(smooth),
  });
  return {
    models: written.models.map(
      ({ id, kind, path, partNodes, label, paintable, covers, soleLift, building, physical }) => ({
        id,
        kind,
        pack: packId,
        path,
        smooth: { pack: smooth, path },
        nodes: partNodes,
        label,
        paintable,
        covers,
        soleLift,
        ...(building === undefined ? {} : { building }),
        massKg: physical?.massKg,
        volumeM3: physical?.volumeM3,
      }),
    ),
    files: [
      ...written.files.map((file) => outputPath(packId, file)),
      ...written.smoothFiles.map((file) => outputPath(smooth, file)),
    ],
  };
}

// The production entry: the roster through TAT's catalogue, the tools that write recipe files into built/, and the
// manifest over them, the mob rows and the sound rows (tools/mobs.mjs and tools/sounds.mjs write their files).
/** @type {readonly RecipeToolName[]} */
const PRODUCTION_RECIPE_TOOLS = ['gun', 'thing'];

/**
 * A model's source row as tools/check-sources.mjs, modelSources, reads it.
 * @typedef {{ pack: string; id: string; title?: unknown; taxonomy?: unknown }} ModelSource
 */

/**
 * Each model's title and taxonomy from its source row, keyed by pack and id; the models built and the models whose
 * sources were read must be the same set, so no model reaches the manifest without its title and taxonomy having been
 * checked.
 * @template {{ pack: string; id: string }} Model
 * @param {readonly Model[]} models
 * @param {readonly ModelSource[]} sources
 * @returns {(Model & { title: unknown; taxonomy: unknown })[]}
 */
export function withSources(models, sources) {
  /** @param {{ pack: string; id: string }} model */
  const key = ({ pack, id }) => `${pack}/${id}`;
  const byModel = new Map(sources.map((entry) => [key(entry), entry]));
  const built = new Set(models.map(key));
  const unread = models.map(key).filter((model) => !byModel.has(model));
  const unbuilt = [...byModel.keys()].filter((model) => !built.has(model));
  if (unread.length > 0 || unbuilt.length > 0) {
    throw new Error(
      `model sources and built models differ: built without a source row ${unread.join(' ') || '(none)'}; ` +
        `source row not built ${unbuilt.join(' ') || '(none)'}`,
    );
  }
  return models.flatMap((model) => {
    const source = byModel.get(key(model));
    return source === undefined ? [] : [{ ...model, title: source.title, taxonomy: source.taxonomy }];
  });
}

/**
 * Each model with the doll part it sits on, if it is worn (tools/dress.mjs, `wornOnParts`), read from its taxonomy.
 * @template {{ id: string; taxonomy?: unknown }} Model
 * @param {readonly Model[]} models
 * @param {Parameters<typeof wornOnParts>[1]} dressing
 * @param {Parameters<typeof wornOnParts>[2]} dollParts
 */
export function withWornOn(models, dressing, dollParts) {
  const wornOn = wornOnParts(
    models.map(({ id, taxonomy }) => ({ id, tags: tagsOf(taxonomy) })),
    dressing,
    dollParts,
  );
  return models.map((model) => (wornOn.has(model.id) ? { ...model, wornOn: wornOn.get(model.id) } : model));
}

// The catalogue's finish library, which vehicle sites name their paint from (tools/placements.mjs, siteProblems). Loaded
// only after installJsonnetSources: the library reads the compiled finishes, which a module graph imported earlier would
// have read before they were regenerated.
const finishLibrary = async () => {
  const { settings } = await import('./packages/thing-authoring-tool/src/settings.ts');
  return (await import('./packages/thing-authoring-tool/src/exports.ts')).finishLibrary(settings);
};

/**
 * The roster's source rows: TAT's catalogue export, which the roster selects from. They are the thing tool's rows, which
 * its tasks parse.
 * @returns {readonly RecipeRow[]}
 */
const rosterSource = () =>
  JSON.parse(readFileSync(join(here, 'packages/thing-authoring-tool/exports/deadvox.json'), 'utf8'));

/**
 * Builds the ids of the roster's source rows into out, each roster id into its pack as the thing tool writes a recipe's
 * (writePack), and an id outside the roster flat; with `index`, a complete build's, each pack's index too. A row that
 * fails is reported and left out, so every other row still builds.
 * @param {RecipeTool} thing
 * @param {readonly RecipeRow[]} rows
 * @param {readonly string[]} ids
 * @param {string} out
 * @param {ReadonlyMap<string, { packId: string }>} roster
 * @param {RecipePool} pool
 * @param {{ index: boolean }} options
 */
async function buildRoster(thing, rows, ids, out, roster, pool, { index }) {
  let failed = false;
  const tasks = await thing.tasks(rows);
  const wanted = rows.flatMap((row, at) => (ids.includes(row.id) ? [{ id: row.id, task: tasks[at] }] : []));
  const results = await Promise.all(
    wanted.map(async ({ id, task }) => {
      try {
        return { id, generated: await pool.run({ tool: 'thing', task }) };
      } catch (reason) {
        return { id, reason };
      }
    }),
  );
  /** @type {Map<string, GeneratedModel[]>} */
  const packs = new Map();
  for (const result of results) {
    const { id } = result;
    if (!('generated' in result)) {
      console.log(`EXPORT FAILED ${id}: ${result.reason instanceof Error ? result.reason.message : result.reason}`);
      failed = true;
      continue;
    }
    const { generated } = result;
    const row = roster.get(id);
    if (row) packs.set(row.packId, [...(packs.get(row.packId) ?? []), generated]);
    else {
      writeFileSync(join(out, `${id}.glb`), generated.glb);
      writeFileSync(join(out, `${id}.smooth.glb`), generated.smoothGlb);
      console.log(`built ${id}.glb and ${id}.smooth.glb`);
    }
  }
  const models = [];
  const files = [];
  for (const [packId, generated] of packs) {
    const written = await writePack(out, packId, thing, generated, { index });
    models.push(...written.models);
    files.push(...written.files);
  }
  for (const file of files) console.log(`built ${file}`);
  return { failed, models, files };
}

/**
 * Generates one shard of the production build's cacheable rows into the cache and writes no tree. CI spreads a clean
 * build's generation over runners this way, then builds the tree from their merged caches, where every cacheable row
 * is a hit. The tree is the same as an uncached build's: a hit returns the stored GLB and the parse of the stored JSON,
 * which serialises back to the same text. `sitePieces` are the vehicle sites whose overlaps and swings the shard
 * measures, by default the root's (readSitePieces), and `wieldSets` the sets whose classes it bakes, by default
 * WIELD_SETS, so a fixture root can name a fleet and sets of its own.
 * @param {object} options
 * @param {string} [options.root]
 * @param {ReturnType<typeof parseShard>} options.shard
 * @param {string} options.cache
 * @param {ReturnType<typeof readSitePieces>} [options.sitePieces]
 * @param {WieldSets} [options.wieldSets]
 */
export async function fillCacheShard({ root = repo, shard, cache, sitePieces, wieldSets }) {
  await installJsonnetSources();
  const tools = await recipeTools();
  const roster = new Set(readRoster(root).map(({ id }) => id));
  const units = await withTasks(
    tools,
    [
      { name: /** @type {const} */ ('thing'), rows: rosterSource().filter((row) => roster.has(row.id)) },
      ...recipeUnits(root, tools, PRODUCTION_RECIPE_TOOLS),
    ].filter(({ name, rows }) => tools[name].code !== undefined && rows.length > 0),
  );
  const tasks = units.flatMap(({ name, tasks }) => tasks.map((task) => ({ tool: name, task })));
  const pool = exportPool(cache);
  try {
    await Promise.all(shardUnits(tasks, shard).map((task) => pool.run(task)));
    const generated = generatedModels(units, pool);
    await restPokeResults(generated, { root, cache, shard });
    await wieldShard(generated.modelOf, { root, sets: wieldSets, cache, shard });
    console.log(cacheReport(pool.usage()));
    const pieces = sitePieces ?? readSitePieces(root);
    overlapResults(pieces, { cache, shard });
    await swingResults(pieces, { cache, shard });
  } finally {
    await pool.close();
  }
}

/**
 * The schema issues a row error carries, thrown here or revived from a worker (tools/workerPool.mjs).
 * @param {unknown} error
 * @returns {readonly BaseIssue<unknown>[] | undefined}
 */
const rowIssues = (error) =>
  error instanceof Error && 'issues' in error && Array.isArray(error.issues) ? error.issues : undefined;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: 'string', default: join(repo, 'built') }, ...CACHE_OPTIONS, shard: { type: 'string' } },
  });
  const cache = cacheFolder(values);
  if (values.shard !== undefined) {
    if (cache === undefined || positionals.length > 0) throw new Error('--shard fills a cache and takes no ids');
    await fillCacheShard({ shard: parseShard(values.shard), cache });
    return;
  }
  const roster = new Map(readRoster().map((row) => [row.id, row]));
  const ids = positionals.length > 0 ? positionals : [...roster.keys()];
  const out = resolve(values.out);
  mkdirSync(out, { recursive: true });
  await installJsonnetSources();
  const rosterRows = rosterSource();
  // A title, taxonomy or pack dependency problem fails the production build before any model is written.
  const sources = positionals.length === 0 ? await modelSources(repo) : [];
  const vocabulary = readVocabulary(repo);
  const dependsOn = positionals.length === 0 ? readDependencies(declaredPacks(repo), repo) : {};
  let swings = {};
  if (positionals.length === 0) {
    const report = sourceReport(sources, vocabulary);
    const { unlisted } = report;
    const vehicles = await vehicleReport(repo, { cache, prune: true });
    swings = vehicles.swing;
    const problems = [...report.problems, ...vehicles.problems];
    for (const { message } of [...unlisted, ...vehicles.unjudged]) console.log(`SOURCE note: ${message}`);
    for (const { message } of problems) console.log(`SOURCE ${message}`);
    if (problems.length > 0) {
      process.exitCode = 1;
      return;
    }
  }
  let failed = false;
  const pool = exportPool(cache);
  try {
    const [built, recipes] = await Promise.all([
      buildRoster((await recipeTools()).thing, rosterRows, ids, out, roster, pool, { index: positionals.length === 0 }),
      exportRecipes({
        out,
        tools: PRODUCTION_RECIPE_TOOLS,
        pool,
        ids: positionals.length > 0 ? new Set(positionals) : undefined,
      }),
    ]);
    failed = built.failed;
    // The full build's ids are the roster's, which only the roster source may supply.
    const known = new Set([...rosterRows, ...(positionals.length > 0 ? recipes.models : [])].map(({ id }) => id));
    const missing = ids.filter((id) => !known.has(id));
    if (missing.length > 0) {
      console.log(`not in the model sources: ${missing.join(' ')}`);
      failed = true;
    }
    for (const file of recipes.files) console.log(`built ${file}`);
    const kits = exportBuildingKits({
      models: [...built.models, ...recipes.models],
      out,
      complete: positionals.length === 0,
    });
    for (const file of kits.files) console.log(`built ${file}`);
    if (positionals.length === 0) {
      const mobs = mobManifest(readMobRows(repo), await readSeveredParts(repo));
      const sounds = soundManifest(readSoundRows(repo), SOUND_SAMPLE_RATE);
      // A wearable's wornOn names one doll's part copies; fitting one garment to many dolls is not built yet.
      const dressing = dollDressing(readDressing(repo), PLAYER);
      const models = withWornOn(
        withSources([...built.models, ...recipes.models, ...mobs.models], sources),
        dressing,
        await readDollParts(dressing),
      );
      const rest = await restPokeCheck(treeModels(out, models), { cache, prune: true });
      for (const message of rest.notes) console.log(`REST note: ${message}`);
      for (const message of rest.problems) console.log(`REST ${message}`);
      if (rest.problems.length > 0) failed = true;
      const placements = readPlacements(repo);
      const finishes = await finishLibrary();
      const placed = exportPlacements({
        placements,
        models,
        vehicleRows: readVehicleRows(repo),
        dependsOn,
        vocabulary,
        stowage: loadOutStowage(out, models, placements),
        swings,
        finishes,
        out,
      });
      for (const file of placed.files) console.log(`built ${file}`);
      const dollRigs = exportDollRigs(out, { models });
      for (const file of dollRigs.files) console.log(`built ${file}`);
      const wields = exportWields(out, { models }, { cache, prune: true });
      for (const file of wields.files) console.log(`built ${file}`);
      const locomotion = exportLocomotion(out, { models });
      for (const file of locomotion.files) console.log(`built ${file}`);
      const files = [
        ...built.files,
        ...recipes.files,
        ...kits.files,
        ...mobs.files,
        ...sounds.files,
        ...placed.files,
        ...dollRigs.files,
        ...wields.files,
        ...locomotion.files,
      ];
      const dangling = danglingPartItems({ files, out, models });
      if (dangling.length > 0) throw new Error(dangling.join('\n'));
      const manifest = buildManifest({
        models,
        buildingKits: kits.buildingKits,
        vehicles: placed.vehicles,
        dolls: dollRigs.dolls,
        motions: [...wields.motions, ...locomotion.motions],
        sounds: sounds.sounds,
        dependsOn,
        files,
        credit: readCredits(repo),
        renames: readRenames(repo),
        finishes,
      });
      writeFileSync(join(out, MANIFEST), manifestJson(manifest));
      console.log(`built ${MANIFEST}`);
      if (cache !== undefined && !failed) await pool.prune();
    }
    console.log(cacheReport(pool.usage()));
  } catch (error) {
    // A row error arrives as a long issue dump; one line per issue with its path is what an author needs.
    const issues = rowIssues(error);
    if (issues === undefined) {
      throw error;
    }
    for (const issue of issues) {
      console.log(
        `ROW ERROR ${(issue.path ?? []).map((p) => p.key).join('.')}: ${issue.message} (${JSON.stringify(issue.input)})`,
      );
    }
    failed = true;
  } finally {
    await pool.close();
  }
  // Not process.exit: on a pipe stdout writes asynchronously, and exiting drops the report lines still queued.
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
