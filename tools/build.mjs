// Builds the repo's models from their sources in models/ into GLB files.
// Usage: node tools/build.mjs [--out dir] [--cache dir] [rowId ...]
// With no row ids it first holds every model's taxonomy to the vocabulary (tools/check-taxonomy.mjs), then builds every
// id of the roster, models/export.json, every row of every recipe file in models/recipes/ and built/manifest.json
// (tools/manifest.mjs); with ids it builds those roster-source rows, any row
// in the sources, and no manifest. A roster id is written into --out (by default built/) at its pack's path,
// tools/layout.mjs, rosterFile; an id outside the roster is written flat, for comparison builds into a scratch folder. Needs node (26 or later, which runs the TypeScript directly) and `npm ci` in tools.
// Adapted from skelly's tools/model-look.mjs (see README.md beside this file).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { outputPath, readMobRows, readRoster } from './layout.mjs';
import { modelTaxonomies } from './check-taxonomy.mjs';
import { buildManifest, MANIFEST, manifestJson, mobManifest, readCredits } from './manifest.mjs';
import { readRecipes } from './recipes.mjs';
import { recipeTools } from './recipeTools.mjs';
import { installJsonnetSources } from './sources.mjs';
import { readVocabulary, taxonomyReport } from './taxonomy.mjs';
import { workerPool } from './workerPool.mjs';

const here = import.meta.dirname;
const repo = resolve(here, '..');

// Every model is generated on a worker thread; the files are written here in source order, so the tree does not
// depend on which model finished first. With a cache folder, unchanged models come from it (recipeTools.mjs, generateRow).
const exportPool = (cache) => {
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

// Builds each recipe file of root's models/recipes/ through the named tools into out/<packId>/, in each tool's layout.
// Every file is partitioned and loaded (and so checked) before any output is written. Returns every model written, with
// its pack, kind, GLB path under the pack and part node names, and every file written as <packId>/<logical path>.
// A caller exporting more than recipes passes its own pool, so every export shares the cores.
export async function exportRecipes({ root = repo, out = join(repo, 'built'), tools: names, pool }) {
  installJsonnetSources();
  const tools = await recipeTools();
  for (const name of names) if (!Object.hasOwn(tools, name)) throw new Error(`no recipe tool ${name}`);
  const { writeModelExports } = await import('./packages/thing-export/src/files.ts');
  const packs = readRecipes(root).map(({ packId, value }) => ({ packId, partitions: partitionRecipe(packId, value, tools) }));
  const units = packs.flatMap(({ packId, partitions }) =>
    names.filter((name) => partitions[name].length > 0).map((name) => ({ packId, name, rows: partitions[name] })));
  for (const { name, rows } of units) tools[name].load(rows);
  const generator = pool ?? exportPool();
  let generated;
  try {
    generated = await Promise.all(units.map(({ name, rows }) => Promise.all(rows.map((row) => generator.run({ tool: name, row })))));
  } finally {
    if (!pool) await generator.close();
  }
  const models = [];
  const files = [];
  for (const [at, { packId, name }] of units.entries()) {
    const tool = tools[name];
    const written = writeModelExports(generated[at], resolve(out, outputPath(packId, tool.directory), '..'), tool.directory, { index: tool.index });
    models.push(...written.models.map(({ id, kind, path, partNodes }) => ({ id, kind, pack: packId, path, nodes: partNodes })));
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

async function buildRoster(thing, ids, out, roster, pool) {
  let failed = false;
  const models = [];
  const rows = JSON.parse(readFileSync(join(here, 'packages/thing-authoring-tool/exports/deadvox.json'), 'utf8'));
  const recipe = thing.load(rows);
  const missing = ids.filter((id) => !recipe.some((row) => row.id === id));
  if (missing.length > 0) {
    console.log(`not in the model sources: ${missing.join(' ')}`);
    failed = true;
  }
  const wanted = rows.filter((row) => ids.includes(row.id));
  const results = await Promise.allSettled(wanted.map((row) => pool.run({ tool: 'thing', row })));
  for (const [at, { id }] of wanted.entries()) {
    const result = results[at];
    if (result.status === 'rejected') {
      console.log(`EXPORT FAILED ${id}: ${result.reason.message}`);
      failed = true;
      continue;
    }
    const { kind, glb, partNodes } = result.value;
    const file = roster.get(id)?.file ?? `${id}.glb`;
    mkdirSync(dirname(join(out, file)), { recursive: true });
    writeFileSync(join(out, file), glb);
    console.log(`built ${file}`);
    const row = roster.get(id);
    if (row) models.push({ id, kind, pack: row.packId, path: file.slice(row.packId.length + 1), nodes: partNodes });
  }
  return { failed, models };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: 'string', default: join(repo, 'built') }, cache: { type: 'string' } },
  });
  const roster = new Map(readRoster().map((row) => [row.id, row]));
  const ids = positionals.length > 0 ? positionals : [...roster.keys()];
  const out = resolve(values.out);
  mkdirSync(out, { recursive: true });
  installJsonnetSources();
  // A taxonomy problem fails the production build before any model is written.
  const taxonomies = positionals.length === 0 ? modelTaxonomies(repo) : [];
  if (positionals.length === 0) {
    const { problems } = taxonomyReport(taxonomies, readVocabulary(repo));
    for (const { message } of problems) console.log(`TAXONOMY ${message}`);
    if (problems.length > 0) process.exit(1);
  }
  let failed = false;
  const pool = exportPool(values.cache && resolve(values.cache));
  try {
    const [built, recipes] = await Promise.all([
      buildRoster((await recipeTools()).thing, ids, out, roster, pool),
      positionals.length === 0 ? exportRecipes({ out, tools: PRODUCTION_RECIPE_TOOLS, pool }) : undefined,
    ]);
    failed = built.failed;
    if (recipes) {
      for (const file of recipes.files) console.log(`built ${file}`);
      const mobs = mobManifest(readMobRows(repo));
      const manifest = buildManifest({
        models: withTaxonomy([...built.models, ...recipes.models, ...mobs.models], taxonomies),
        files: [...built.models.map(({ pack, path }) => outputPath(pack, path)), ...recipes.files, ...mobs.files],
        credit: readCredits(repo),
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
