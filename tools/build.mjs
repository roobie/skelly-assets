// Builds the repo's models from their sources in models/ into GLB files.
// Usage: node tools/build.mjs [--out dir] [rowId ...]
// With no row ids it builds every id of the roster, models/export.json, every row of every recipe file in
// models/recipes/ and built/manifest.json (tools/manifest.mjs); with ids it builds those roster-source rows, any row
// in the sources, and no manifest. A roster id is written into --out (by default built/, where games load them) at its
// pack's path, tools/layout.mjs, rosterFile; an id outside the roster is written flat, for comparison builds into a
// scratch folder. Needs node (26 or later, which runs the TypeScript directly) and `npm ci` in tools.
// Adapted from skelly's tools/model-look.mjs (see README.md beside this file).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { outputPath, readMobRows, readRoster } from './layout.mjs';
import { buildManifest, MANIFEST, manifestJson, mobManifest, readCredits } from './manifest.mjs';
import { readRecipes } from './recipes.mjs';
import { installJsonnetSources } from './sources.mjs';

const here = import.meta.dirname;
const repo = resolve(here, '..');

// The tools a recipe row can belong to, each with the kinds it owns, its loader and its layout under a pack.
// Gun rows' sources resolve against this folder, where GAT's own export resolves them.
let loadedTools;
const recipeTools = () => (loadedTools ??= loadRecipeTools());
const loadRecipeTools = async () => {
  const gun = await import('./packages/gun-authoring-tool/src/cli/exportRecipe.ts');
  const thing = await import('./packages/thing-authoring-tool/src/exports.ts');
  return {
    gun: { kinds: gun.GUN_KINDS, load: (rows) => gun.loadExportRecipe(rows, here), directory: 'gungen', index: false },
    thing: { kinds: thing.THING_KINDS, load: thing.loadThingRecipe, directory: 'things', index: true },
  };
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
// Every file is partitioned (and so checked) before any output is written. Returns every model written, with its
// pack, kind, GLB path under the pack and part node names, and every file written as <packId>/<logical path>.
export async function exportRecipes({ root = repo, out = join(repo, 'built'), tools: names }) {
  installJsonnetSources();
  const tools = await recipeTools();
  for (const name of names) if (!Object.hasOwn(tools, name)) throw new Error(`no recipe tool ${name}`);
  const { writeRecipeExports } = await import('./packages/thing-export/src/files.ts');
  const packs = readRecipes(root).map(({ packId, value }) => ({ packId, partitions: partitionRecipe(packId, value, tools) }));
  const loaded = packs.flatMap(({ packId, partitions }) =>
    names.filter((name) => partitions[name].length > 0).map((name) => ({ packId, tool: tools[name], recipe: tools[name].load(partitions[name]) })));
  const models = [];
  const files = [];
  for (const { packId, tool, recipe } of loaded) {
    const written = writeRecipeExports(recipe, resolve(out, outputPath(packId, tool.directory), '..'), tool.directory, { index: tool.index });
    models.push(...written.models.map(({ id, kind, path, partNodes }) => ({ id, kind, pack: packId, path, nodes: partNodes })));
    files.push(...written.files.map((file) => outputPath(packId, file)));
  }
  return { models, files };
}

// The production entry: the roster through TAT's catalogue, the tools that write recipe files into built/, and the
// manifest over them and the mob rows (tools/mobs.mjs writes the mob files themselves).
const PRODUCTION_RECIPE_TOOLS = ['gun', 'thing'];

function buildRoster(loadThingRecipe, ids, out, roster) {
  let failed = false;
  const models = [];
  const recipe = loadThingRecipe(JSON.parse(readFileSync(join(here, 'packages/thing-authoring-tool/exports/deadvox.json'), 'utf8')));
  const missing = ids.filter((id) => !recipe.some((row) => row.id === id));
  if (missing.length > 0) {
    console.log(`not in the model sources: ${missing.join(' ')}`);
    failed = true;
  }
  for (const { id, kind, generate } of recipe.filter((row) => ids.includes(row.id))) {
    try {
      const file = roster.get(id)?.file ?? `${id}.glb`;
      const { glb, partNodes } = generate();
      mkdirSync(dirname(join(out, file)), { recursive: true });
      writeFileSync(join(out, file), glb);
      console.log(`built ${file}`);
      const row = roster.get(id);
      if (row) models.push({ id, kind, pack: row.packId, path: file.slice(row.packId.length + 1), nodes: partNodes });
    } catch (error) {
      console.log(`EXPORT FAILED ${id}: ${error.message}`);
      failed = true;
    }
  }
  return { failed, models };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: 'string', default: join(repo, 'built') } },
  });
  const roster = new Map(readRoster().map((row) => [row.id, row]));
  const ids = positionals.length > 0 ? positionals : [...roster.keys()];
  const out = resolve(values.out);
  mkdirSync(out, { recursive: true });
  installJsonnetSources();
  let failed = false;
  try {
    const { loadThingRecipe } = await import('./packages/thing-authoring-tool/src/exports.ts');
    const built = buildRoster(loadThingRecipe, ids, out, roster);
    failed = built.failed;
    if (positionals.length === 0) {
      const recipes = await exportRecipes({ out, tools: PRODUCTION_RECIPE_TOOLS });
      for (const file of recipes.files) console.log(`built ${file}`);
      const mobs = mobManifest(readMobRows(repo));
      const manifest = buildManifest({
        models: [...built.models, ...recipes.models, ...mobs.models],
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
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
