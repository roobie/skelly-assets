// Builds the repo's models from their sources in models/ into GLB files.
// Usage: node tools/build.mjs [--out dir] [--cache dir] [rowId ...], or node tools/build.mjs --shard i/n --cache dir
// to only fill the cache with one shard of the complete build's cacheable rows (fillCacheShard).
// With no row ids it first holds every model's taxonomy to the vocabulary (tools/check-taxonomy.mjs), then builds every
// id of the roster, models/export.json, every row of every recipe file in models/recipes/, every vehicle's placements
// (tools/placements.mjs) and built/manifest.json with each pack's dependencies (tools/packs.mjs)
// (tools/manifest.mjs); with ids it builds only those rows, from the roster source or a recipe file, with no pack index,
// placements or manifest, so one model builds without the rest. Each model is written into --out (by default built/)
// at its pack's path (tools/layout.mjs, rosterFile, outputPath); a roster-source id outside the roster is written flat,
// for comparison builds into a scratch folder. Needs the node in .node-version, which runs the TypeScript directly, and
// `npm ci` in tools.
// Adapted from skelly's tools/model-look.mjs (see README.md beside this file).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { declaredPacks, outputPath, readMobRows, readRoster } from './layout.mjs';
import { modelTaxonomies } from './check-taxonomy.mjs';
import { buildManifest, MANIFEST, manifestJson, mobManifest, readCredits, readRenames } from './manifest.mjs';
import { readDependencies } from './packs.mjs';
import { exportPlacements, readPlacements, readVehicleRows } from './placements.mjs';
import { readRecipes } from './recipes.mjs';
import { recipeTools } from './recipeTools.mjs';
import { installJsonnetSources } from './sources.mjs';
import { readVocabulary, taxonomyReport } from './taxonomy.mjs';
import { workerPool } from './workerPool.mjs';

const here = import.meta.dirname;
const repo = resolve(here, '..');

// Every model is generated on a worker thread; the files are written here in source order, so the tree does not
// depend on which model finished first. With a cache folder, unchanged models come from it (recipeTools.mjs, generateRow).
export const exportPool = (cache) => {
  const pool = workerPool(new URL('./recipeTools.mjs', import.meta.url), 'generateRow');
  return { run: (task) => pool.run({ ...task, cache }), close: () => pool.close() };
};

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
    if (owner === undefined) throw new Error(`models/recipes/${packId}: ${row?.id} has kind ${row?.kind}, which no tool owns`);
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
  const packs = readRecipes(root).map(({ packId, value }) => ({ packId, partitions: partitionRecipe(packId, value, tools) }));
  return packs.flatMap(({ packId, partitions }) =>
    names.filter((name) => partitions[name].length > 0).map((name) => ({ packId, name, rows: partitions[name] })));
}

// Each unit with its tool's tasks, one per row, which loads (and so checks) every unit's rows.
const withTasks = (tools, units) => Promise.all(units.map(async (unit) => ({ ...unit, tasks: await tools[unit.name].tasks(unit.rows) })));

// Builds each recipe file of root's models/recipes/ through the named tools into out/<packId>/, in each tool's layout.
// Every file is partitioned and loaded (and so checked) before any output is written. Returns every model written, with
// its pack, kind, GLB path under the pack, part node names and label, and every file written as <packId>/<logical path>.
// A caller exporting more than recipes passes its own pool, so every export shares the cores. With an `ids` set, every
// row is still loaded, since a loader may check rows against each other, but only those rows are written, and no pack
// index, which would misstate the pack.
export async function exportRecipes({ root = repo, out = join(repo, 'built'), tools: names, pool, ids }) {
  await installJsonnetSources();
  const tools = await recipeTools();
  const { writeModelExports } = await import('./packages/thing-export/src/files.ts');
  const units = await withTasks(tools, recipeUnits(root, tools, names));
  const selected = ids === undefined ? units : units
    .map((unit) => ({ ...unit, tasks: unit.tasks.filter((_, at) => ids.has(unit.rows[at].id)) }))
    .filter(({ tasks }) => tasks.length > 0);
  const generator = pool ?? exportPool();
  let generated;
  try {
    generated = await Promise.all(selected.map(({ name, tasks }) => Promise.all(tasks.map((task) => generator.run({ tool: name, task })))));
  } finally {
    if (!pool) await generator.close();
  }
  const models = [];
  const files = [];
  for (const [at, { packId, name }] of selected.entries()) {
    const tool = tools[name];
    const written = writeModelExports(generated[at], resolve(out, outputPath(packId, tool.directory), '..'), tool.directory, { index: ids === undefined && tool.index });
    models.push(...written.models.map(({ id, kind, path, partNodes, label, paintable }) => ({ id, kind, pack: packId, path, nodes: partNodes, label, paintable })));
    files.push(...written.files.map((file) => outputPath(packId, file)));
  }
  return { models, files };
}

// The production entry: the roster through TAT's catalogue, the tools that write recipe files into built/, and the
// manifest over them and the mob rows (tools/mobs.mjs writes the mob files themselves).
const PRODUCTION_RECIPE_TOOLS = ['gun', 'thing'];

// Each model's taxonomy from its source row, keyed by pack and id; the models built and the models whose sources were
// read must be the same set, so no model reaches the manifest without its taxonomy having been checked.
export function withTaxonomy(models, taxonomies) {
  const key = ({ pack, id }) => `${pack}/${id}`;
  const byModel = new Map(taxonomies.map((entry) => [key(entry), entry.taxonomy]));
  const built = new Set(models.map(key));
  const unread = models.map(key).filter((model) => !byModel.has(model));
  const unbuilt = [...byModel.keys()].filter((model) => !built.has(model));
  if (unread.length > 0 || unbuilt.length > 0) {
    throw new Error(`taxonomy sources and built models differ: built without a source row ${unread.join(' ') || '(none)'}; `
      + `source row not built ${unbuilt.join(' ') || '(none)'}`);
  }
  return models.map((model) => ({ ...model, taxonomy: byModel.get(key(model)) }));
}

// The roster's source rows: TAT's catalogue export, which the roster selects from.
const rosterSource = () => JSON.parse(readFileSync(join(here, 'packages/thing-authoring-tool/exports/deadvox.json'), 'utf8'));

async function buildRoster(thing, rows, ids, out, roster, pool) {
  let failed = false;
  const models = [];
  const tasks = await thing.tasks(rows);
  const wanted = rows.flatMap((row, at) => (ids.includes(row.id) ? [{ id: row.id, task: tasks[at] }] : []));
  const results = await Promise.allSettled(wanted.map(({ task }) => pool.run({ tool: 'thing', task })));
  for (const [at, { id }] of wanted.entries()) {
    const result = results[at];
    if (result.status === 'rejected') {
      console.log(`EXPORT FAILED ${id}: ${result.reason.message}`);
      failed = true;
      continue;
    }
    const { kind, glb, partNodes, modelEntry } = result.value;
    const file = roster.get(id)?.file ?? `${id}.glb`;
    mkdirSync(dirname(join(out, file)), { recursive: true });
    writeFileSync(join(out, file), glb);
    console.log(`built ${file}`);
    const row = roster.get(id);
    if (row) models.push({ id, kind, pack: row.packId, path: file.slice(row.packId.length + 1), nodes: partNodes, label: modelEntry.label, paintable: modelEntry.paintable });
  }
  return { failed, models };
}

// Shard `index` of `count` takes every count-th unit, so each shard's share interleaves all packs and the shards stay
// balanced however unevenly rows are spread over packs.
export const shardUnits = (units, { index, count }) => units.filter((_, at) => at % count === index - 1);

// Generates one shard of the production build's cacheable rows into the cache and writes no tree. CI spreads a clean
// build's generation over runners this way, then builds the tree from their merged caches, where every cacheable row
// is a hit. The tree is the same as an uncached build's: a hit returns the stored GLB and the parse of the stored JSON,
// which serialises back to the same text.
export async function fillCacheShard({ root = repo, shard, cache }) {
  await installJsonnetSources();
  const tools = await recipeTools();
  const roster = new Set(readRoster(root).map(({ id }) => id));
  const units = await withTasks(tools, [
    { name: 'thing', rows: rosterSource().filter((row) => roster.has(row.id)) },
    ...recipeUnits(root, tools, PRODUCTION_RECIPE_TOOLS),
  ].filter(({ name, rows }) => tools[name].code !== undefined && rows.length > 0));
  const tasks = units.flatMap(({ name, tasks }) => tasks.map((task) => ({ tool: name, task })));
  const pool = exportPool(cache);
  try {
    await Promise.all(shardUnits(tasks, shard).map((task) => pool.run(task)));
  } finally {
    await pool.close();
  }
}

const parseShard = (text) => {
  const [index, count] = text.split('/').map(Number);
  if (!(Number.isInteger(index) && Number.isInteger(count) && index >= 1 && index <= count)) {
    throw new Error(`--shard takes <index>/<count>, 1 <= index <= count: ${text}`);
  }
  return { index, count };
};

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: 'string', default: join(repo, 'built') }, cache: { type: 'string' }, shard: { type: 'string' } },
  });
  if (values.shard !== undefined) {
    if (values.cache === undefined || positionals.length > 0) throw new Error('--shard fills a --cache and takes no ids');
    await fillCacheShard({ shard: parseShard(values.shard), cache: resolve(values.cache) });
    return;
  }
  const roster = new Map(readRoster().map((row) => [row.id, row]));
  const ids = positionals.length > 0 ? positionals : [...roster.keys()];
  const out = resolve(values.out);
  mkdirSync(out, { recursive: true });
  await installJsonnetSources();
  const rosterRows = rosterSource();
  // A taxonomy or pack dependency problem fails the production build before any model is written.
  const taxonomies = positionals.length === 0 ? await modelTaxonomies(repo) : [];
  const vocabulary = readVocabulary(repo);
  const dependsOn = positionals.length === 0 ? readDependencies(declaredPacks(repo), repo) : {};
  if (positionals.length === 0) {
    const { problems } = taxonomyReport(taxonomies, vocabulary);
    for (const { message } of problems) console.log(`TAXONOMY ${message}`);
    if (problems.length > 0) process.exit(1);
  }
  let failed = false;
  const pool = exportPool(values.cache && resolve(values.cache));
  try {
    const [built, recipes] = await Promise.all([
      buildRoster((await recipeTools()).thing, rosterRows, ids, out, roster, pool),
      exportRecipes({ out, tools: PRODUCTION_RECIPE_TOOLS, pool, ids: positionals.length > 0 ? new Set(positionals) : undefined }),
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
    if (positionals.length === 0) {
      const mobs = mobManifest(readMobRows(repo));
      const models = withTaxonomy([...built.models, ...recipes.models, ...mobs.models], taxonomies);
      const placed = exportPlacements({
        placements: readPlacements(repo),
        models,
        vehicleRows: readVehicleRows(repo),
        dependsOn,
        vocabulary,
        out,
      });
      for (const file of placed.files) console.log(`built ${file}`);
      const manifest = buildManifest({
        models,
        vehicles: placed.vehicles,
        dependsOn,
        files: [...built.models.map(({ pack, path }) => outputPath(pack, path)), ...recipes.files, ...mobs.files, ...placed.files],
        credit: readCredits(repo),
        renames: readRenames(repo),
      });
      writeFileSync(join(out, MANIFEST), manifestJson(manifest));
      console.log(`built ${MANIFEST}`);
    }
  } catch (error) {
    // A row error arrives as a long issue dump; one line per issue with its path is what an author needs.
    if (!error.issues) {
      throw error;
    }
    for (const issue of error.issues) {
      console.log(`ROW ERROR ${(issue.path ?? []).map((p) => p.key).join('.')}: ${issue.message} (${JSON.stringify(issue.input)})`);
    }
    failed = true;
  } finally {
    await pool.close();
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
