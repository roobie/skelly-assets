// Builds the repo's models from their sources in models/ into GLB files.
// Usage: node tools/build.mjs [--out dir] [--cache dir | --no-cache] [rowId ...], or node tools/build.mjs --shard i/n
// [--cache dir] to only fill the cache with one shard of the complete build's cacheable rows (fillCacheShard). The cache
// is tools/generation.mjs, DEFAULT_CACHE, unless --cache names another; --no-cache generates every model.
// With no row ids it first holds every model's title and taxonomy to their rules and every vehicle's parts at different
// sites clear of each other (tools/check-sources.mjs), then builds every
// id of the roster, models/export.json, every row of every recipe file in models/recipes/, every vehicle's placements
// (tools/placements.mjs), the doll's baked wields and locomotion (tools/wields.mjs and tools/locomotion.mjs) and
// built/manifest.json over them,
// the mob rows and the sound rows (tools/mobs.mjs and tools/sounds.mjs write their files), with each pack's
// dependencies (tools/packs.mjs) and the finish library (tools/manifest.mjs); with ids it builds only those
// rows, from the roster source or a recipe file, with no pack index, placements or manifest; referenced building-kit
// definitions still accompany their sidecars, so one model builds
// without the rest. Each model is written into --out (by default built/)
// at its pack's path (tools/layout.mjs, outputPath), with its sidecar; a roster-source id outside the roster is written
// flat, as its GLB alone, for comparison builds into a scratch folder. Needs the node in .node-version, which runs the TypeScript directly, and
// `npm ci` in tools.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { exportBuildingKits } from './buildingKits.mjs';
import { modelSources, sourceReport, vehicleReport } from './check-sources.mjs';
import { readDollParts, readDressing, wornOnParts } from './dress.mjs';
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

// Every model is generated on a worker thread; the files are written here in source order, so the tree does not
// depend on which model finished first. With a cache folder, unchanged models come from it (recipeTools.mjs, generateRow),
// and the pool records each tool's entries it used, so a complete build can report and keep exactly those.
export const exportPool = (cache) => {
  const pool = workerPool(new URL('./recipeTools.mjs', import.meta.url), 'generateRow');
  const used = new Map();
  const counts = { reused: 0, generated: 0 };
  return {
    run: async (task) => {
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
      for (const [name, tool] of Object.entries(await recipeTools())) {
        if (tool.code !== undefined) entryFolder(cache, name).prune(used.get(name) ?? new Set());
      }
    },
  };
};

const cacheReport = ({ reused, generated }) => `export cache: ${reused} model(s) reused, ${generated} generated`;

// Splits one recipe file's rows by owning tool, before any loader sees them.
export function partitionRecipe(packId, rows, tools) {
  if (!Array.isArray(rows)) throw new Error(`models/recipes/${packId}: a recipe file is an array of rows`);
  const owners = new Map();
  for (const [name, { kinds }] of Object.entries(tools)) {
    for (const kind of kinds) {
      if (owners.has(kind)) throw new Error(`kind ${kind} is owned by both ${owners.get(kind)} and ${name}`);
      owners.set(kind, name);
    }
  }
  const partitions = Object.fromEntries(Object.keys(tools).map((name) => [name, []]));
  for (const row of rows) {
    const owner = owners.get(row?.kind);
    if (owner === undefined)
      throw new Error(`models/recipes/${packId}: ${row?.id} has kind ${row?.kind}, which no tool owns`);
    partitions[owner].push(row);
  }
  const seen = new Map();
  for (const [name, partition] of Object.entries(partitions)) {
    for (const { id } of partition) {
      if (seen.has(id) && seen.get(id) !== name) {
        throw new Error(`models/recipes/${packId}: ${id} is exported by two tools, ${seen.get(id)} and ${name}`);
      }
      seen.set(id, name);
    }
  }
  return partitions;
}

// Each recipe file's rows of the named tools, one unit per pack and tool, in source order.
function recipeUnits(root, tools, names) {
  for (const name of names) if (!Object.hasOwn(tools, name)) throw new Error(`no recipe tool ${name}`);
  const packs = readRecipes(root).map(({ packId, value }) => ({
    packId,
    partitions: partitionRecipe(packId, value, tools),
  }));
  return packs.flatMap(({ packId, partitions }) =>
    names.filter((name) => partitions[name].length > 0).map((name) => ({ packId, name, rows: partitions[name] })),
  );
}

// Each unit with its tool's tasks, one per row, which loads (and so checks) every unit's rows.
const withTasks = (tools, units) =>
  Promise.all(units.map(async (unit) => ({ ...unit, tasks: await tools[unit.name].tasks(unit.rows) })));

// The units' models as tools/restPoke.mjs reads them, generated through the pool, so a shard checks garments with no tree.
const generatedModels = (units, pool) => {
  const runs = new Map(
    units.flatMap(({ name, rows, tasks }) => rows.map((row, at) => [row.id, { tool: name, task: tasks[at] }])),
  );
  return {
    models: units.flatMap(({ rows }) => rows.map(({ id, taxonomy }) => ({ id, tags: taxonomy?.tags }))),
    modelOf: async (id) => {
      const { glb, modelEntry } = await pool.run(runs.get(id));
      // A GLB crosses back from a worker thread as a plain Uint8Array, and the GLB readers take a Buffer, as a tree gives.
      return { glb: Buffer.from(glb.buffer, glb.byteOffset, glb.byteLength), entry: modelEntry };
    },
  };
};

// Builds each recipe file of root's models/recipes/ through the named tools into out/<packId>/, in each tool's layout.
// Every file is partitioned and loaded (and so checked) before any output is written. Returns every model written, with
// its pack, kind, GLB path under the pack, part node names and label, and every file written as <packId>/<logical path>.
// A caller exporting more than recipes passes its own pool, so every export shares the cores. With an `ids` set, every
// row is still loaded, since a loader may check rows against each other, but only those rows are written, and no pack
// index, which would misstate the pack.
export async function exportRecipes({ root = repo, out = join(repo, 'built'), tools: names, pool, ids }) {
  await installJsonnetSources();
  const tools = await recipeTools();
  const units = await withTasks(tools, recipeUnits(root, tools, names));
  const selected =
    ids === undefined
      ? units
      : units
          .map((unit) => ({ ...unit, tasks: unit.tasks.filter((_, at) => ids.has(unit.rows[at].id)) }))
          .filter(({ tasks }) => tasks.length > 0);
  const generator = pool ?? exportPool();
  let generated;
  try {
    generated = await Promise.all(
      selected.map(({ name, tasks }) => Promise.all(tasks.map((task) => generator.run({ tool: name, task })))),
    );
  } finally {
    if (!pool) await generator.close();
  }
  const models = [];
  const files = [];
  for (const [at, { packId, name }] of selected.entries()) {
    const written = await writePack(out, packId, tools[name], generated[at], { index: ids === undefined });
    models.push(...written.models);
    files.push(...written.files);
  }
  return { models, files };
}

// Writes one pack's generated models into out/<packId>/ in its tool's layout, each GLB with its sidecar, and its smooth
// copy at the same path in out/<packId>.smooth/, and with `index` the pack's index if the tool keeps one. Returns each
// model written, with its pack and its smooth copy's, and every file written as <packId>/<logical path>.
async function writePack(out, packId, tool, generated, { index }) {
  const { writeModelExports } = await import('./packages/thing-export/src/files.ts');
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
const PRODUCTION_RECIPE_TOOLS = ['gun', 'thing'];

// Each model's title and taxonomy from its source row, keyed by pack and id; the models built and the models whose
// sources were read must be the same set, so no model reaches the manifest without its title and taxonomy having been checked.
export function withSources(models, sources) {
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
  return models.map((model) => ({
    ...model,
    title: byModel.get(key(model)).title,
    taxonomy: byModel.get(key(model)).taxonomy,
  }));
}

// Each model with the doll part it sits on, if it is worn (tools/dress.mjs, `wornOnParts`), read from its taxonomy.
export function withWornOn(models, dressing, dollParts) {
  const wornOn = wornOnParts(
    models.map(({ id, taxonomy }) => ({ id, tags: taxonomy?.tags })),
    dressing,
    dollParts,
  );
  return models.map((model) => (wornOn.has(model.id) ? { ...model, wornOn: wornOn.get(model.id) } : model));
}

// The catalogue's finish library, which vehicle sites name their paint from (tools/placements.mjs, siteProblems). Loaded
// only after installJsonnetSources: the library reads the compiled finishes, which a module graph imported earlier would
// have read before they were regenerated.
const finishLibrary = async () => {
  const { catalogue } = await import('./packages/thing-authoring-tool/src/content.ts');
  return (await import('./packages/thing-authoring-tool/src/exports.ts')).finishLibrary(catalogue);
};

// The roster's source rows: TAT's catalogue export, which the roster selects from.
const rosterSource = () =>
  JSON.parse(readFileSync(join(here, 'packages/thing-authoring-tool/exports/deadvox.json'), 'utf8'));

// Builds the ids of the roster's source rows into out, each roster id into its pack as the thing tool writes a recipe's
// (writePack), and an id outside the roster flat; with `index`, a complete build's, each pack's index too. A row that
// fails is reported and left out, so every other row still builds.
async function buildRoster(thing, rows, ids, out, roster, pool, { index }) {
  let failed = false;
  const tasks = await thing.tasks(rows);
  const wanted = rows.flatMap((row, at) => (ids.includes(row.id) ? [{ id: row.id, task: tasks[at] }] : []));
  const results = await Promise.allSettled(wanted.map(({ task }) => pool.run({ tool: 'thing', task })));
  const packs = new Map();
  for (const [at, { id }] of wanted.entries()) {
    const result = results[at];
    if (result.status === 'rejected') {
      console.log(`EXPORT FAILED ${id}: ${result.reason.message}`);
      failed = true;
      continue;
    }
    const row = roster.get(id);
    if (row) packs.set(row.packId, [...(packs.get(row.packId) ?? []), result.value]);
    else {
      writeFileSync(join(out, `${id}.glb`), result.value.glb);
      writeFileSync(join(out, `${id}.smooth.glb`), result.value.smoothGlb);
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

// Generates one shard of the production build's cacheable rows into the cache and writes no tree. CI spreads a clean
// build's generation over runners this way, then builds the tree from their merged caches, where every cacheable row
// is a hit. The tree is the same as an uncached build's: a hit returns the stored GLB and the parse of the stored JSON,
// which serialises back to the same text. `sitePieces` are the vehicle sites whose overlaps and swings the shard
// measures, by default the root's (readSitePieces), and `wieldSets` the sets whose classes it bakes, by default
// WIELD_SETS, so a fixture root can name a fleet and sets of its own.
export async function fillCacheShard({ root = repo, shard, cache, sitePieces, wieldSets }) {
  await installJsonnetSources();
  const tools = await recipeTools();
  const roster = new Set(readRoster(root).map(({ id }) => id));
  const units = await withTasks(
    tools,
    [
      { name: 'thing', rows: rosterSource().filter((row) => roster.has(row.id)) },
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
      const dressing = readDressing(repo);
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
        ...wields.files,
        ...locomotion.files,
      ];
      const dangling = danglingPartItems({ files, out, models });
      if (dangling.length > 0) throw new Error(dangling.join('\n'));
      const manifest = buildManifest({
        models,
        buildingKits: kits.buildingKits,
        vehicles: placed.vehicles,
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
    if (!error.issues) {
      throw error;
    }
    for (const issue of error.issues) {
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
