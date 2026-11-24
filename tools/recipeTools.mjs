// @ts-check
// The tools a recipe row can belong to, each with the kinds it owns, its layout under a pack, and the two halves of its
// loader: `tasks` checks a tool's rows together and gives each the portable data its export needs, and `exportOf`
// turns one task into its export on a worker thread.
// Gun rows name their sources relative to the repository root, which GAT's loader resolves them against. A tool whose
// rows declare their inputs names the code its exports run and the data that code imports, so tools/build.mjs can
// cache them; see thing-export's cache.ts, codeFingerprint.
// Import after tools/sources.mjs, installJsonnetSources: the loaders read the compiled Jsonnet twins.
/** @import { ExportCache } from './packages/thing-export/src/cache.ts' */
/** @import { GeneratedModel } from './packages/thing-export/src/files.ts' */
/** @import { RecipeExport, RecipeRow } from './packages/thing-export/src/recipe.ts' */
/** @import { thingTasks } from './packages/thing-authoring-tool/src/exports.ts' */
import { join } from 'node:path';
import { SIDECAR_DIRECTORIES } from './layout.mjs';

const here = import.meta.dirname;

/** @typedef {'gun' | 'thing'} RecipeToolName */

/**
 * One recipe tool. A task crosses to a worker thread by structured clone, so it is opaque past its tool's `tasks`.
 * @typedef {object} RecipeTool
 * @property {readonly string[]} kinds
 * @property {(rows: readonly unknown[]) => readonly unknown[] | Promise<readonly unknown[]>} tasks
 * @property {(task: unknown) => RecipeExport} exportOf
 * @property {string} directory
 * @property {boolean} index
 * @property {readonly string[]} [code]
 * @property {readonly string[]} [data]
 */

/**
 * One row's generation as a worker runs it: the owning tool and the task its `tasks` gave the row.
 * @typedef {{ tool: RecipeToolName; task: unknown }} RecipeTask
 */

/**
 * The one export a single-row load gives.
 * @param {readonly RecipeExport[]} exports
 */
const onlyExport = (exports) => {
  const [only] = exports;
  if (only === undefined) throw new Error('a recipe row loaded to no export');
  return only;
};

/** @type {Promise<Readonly<Record<RecipeToolName, RecipeTool>>> | undefined} */
let loaded;
export const recipeTools = () => (loaded ??= loadRecipeTools());
/** @returns {Promise<Readonly<Record<RecipeToolName, RecipeTool>>>} */
const loadRecipeTools = async () => {
  const gun = await import('./packages/gun-authoring-tool/src/cli/exportRecipe.ts');
  const thing = await import('./packages/thing-authoring-tool/src/exports.ts');
  return {
    gun: {
      kinds: gun.GUN_KINDS,
      tasks: (rows) => {
        gun.loadExportRecipe(rows);
        return rows;
      },
      exportOf: (row) => onlyExport(gun.loadExportRecipe([row])),
      directory: SIDECAR_DIRECTORIES.gun,
      index: false,
      code: [
        'package-lock.json',
        'packages/construct/src',
        'packages/thing-core/src',
        'packages/thing-export/src',
        'packages/gun-authoring-tool/src',
      ],
      // The gun code imports its tables, cartridges and the materials as JSON, whatever the row.
      data: ['../models/guns/tables', '../models/guns/cartridges', '../models/finishes.json'],
    },
    thing: {
      kinds: thing.THING_KINDS,
      // Only the parent reads the rows the recipes select; a worker gets its row's slice.
      tasks: async (rows) =>
        thing.thingTasks(
          /** @type {readonly RecipeRow[]} */ (rows),
          (await import('./packages/thing-authoring-tool/src/cli/content.ts')).readCatalogue,
        ),
      exportOf: (task) => {
        const { row, catalogue } = /** @type {ReturnType<typeof thingTasks>[number]} */ (task);
        return onlyExport(thing.loadThingRecipe([row], catalogue));
      },
      directory: SIDECAR_DIRECTORIES.thing,
      index: true,
      code: [
        'package-lock.json',
        'packages/construct/src',
        'packages/thing-core/src',
        'packages/thing-export/src',
        'packages/thing-authoring-tool/src',
      ],
    },
  };
};

// One cache per tool in the build's cache folder, so each tool's entries are keyed by its own code.
/** @type {Map<string, ExportCache>} */
const caches = new Map();
/**
 * @param {string} folder
 * @param {RecipeToolName} name
 * @param {readonly string[]} code
 * @param {readonly string[]} [data]
 */
const cacheOf = async (folder, name, code, data) => {
  const { codeFingerprint, exportCache } = await import('./packages/thing-export/src/cache.ts');
  const dir = join(folder, name);
  let cache = caches.get(dir);
  if (cache === undefined) {
    cache = exportCache(folder, name, codeFingerprint(here, code, data));
    caches.set(dir, cache);
  }
  return cache;
};

/**
 * Generates one recipe row from its tool's task, from the cache folder when given: the unit tools/workerPool.mjs runs,
 * since rows export independently.
 * @param {RecipeTask & { cache?: string | undefined }} input
 * @returns {Promise<GeneratedModel>}
 */
export async function generateRow({ tool, task, cache }) {
  const { generateModel } = await import('./packages/thing-export/src/files.ts');
  const owner = (await recipeTools())[tool];
  return generateModel(
    owner.exportOf(task),
    cache && owner.code ? await cacheOf(cache, tool, owner.code, owner.data) : undefined,
  );
}
