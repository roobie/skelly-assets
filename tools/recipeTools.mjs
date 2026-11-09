// The tools a recipe row can belong to, each with the kinds it owns, its loader and its layout under a pack.
// Gun rows' sources resolve against this folder, where GAT's own export resolves them. A tool whose rows declare their
// inputs names the code its exports run, so tools/build.mjs can cache them; see thing-export's cache.ts, exportCache.
// Import after tools/sources.mjs, installJsonnetSources: the loaders read the compiled Jsonnet twins.
import { join } from 'node:path';

const here = import.meta.dirname;

let loaded;
export const recipeTools = () => (loaded ??= loadRecipeTools());
const loadRecipeTools = async () => {
  const gun = await import('./packages/gun-authoring-tool/src/cli/exportRecipe.ts');
  const thing = await import('./packages/thing-authoring-tool/src/exports.ts');
  return {
    gun: { kinds: gun.GUN_KINDS, load: (rows) => gun.loadExportRecipe(rows, here), directory: 'gungen', index: false },
    thing: {
      kinds: thing.THING_KINDS,
      load: thing.loadThingRecipe,
      directory: 'things',
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
const caches = new Map();
const cacheOf = async (folder, name, code) => {
  const { codeFingerprint, exportCache } = await import('./packages/thing-export/src/cache.ts');
  const dir = join(folder, name);
  if (!caches.has(dir)) caches.set(dir, exportCache(dir, codeFingerprint(here, code)));
  return caches.get(dir);
};

// Generates one recipe row through its tool, from the cache folder when given: the unit tools/workerPool.mjs runs,
// since rows export independently.
export async function generateRow({ tool, row, cache }) {
  const { generateModel } = await import('./packages/thing-export/src/files.ts');
  const owner = (await recipeTools())[tool];
  const [model] = owner.load([row]);
  return generateModel(model, cache && owner.code ? await cacheOf(cache, tool, owner.code) : undefined);
}
