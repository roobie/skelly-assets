// The tools a recipe row can belong to, each with the kinds it owns, its loader and its layout under a pack.
// Gun rows' sources resolve against this folder, where GAT's own export resolves them. Import after
// tools/sources.mjs, installJsonnetSources: the loaders read the compiled Jsonnet twins.
const here = import.meta.dirname;

let loaded;
export const recipeTools = () => (loaded ??= loadRecipeTools());
const loadRecipeTools = async () => {
  const gun = await import('./packages/gun-authoring-tool/src/cli/exportRecipe.ts');
  const thing = await import('./packages/thing-authoring-tool/src/exports.ts');
  return {
    gun: { kinds: gun.GUN_KINDS, load: (rows) => gun.loadExportRecipe(rows, here), directory: 'gungen', index: false },
    thing: { kinds: thing.THING_KINDS, load: thing.loadThingRecipe, directory: 'things', index: true },
  };
};

// Generates one recipe row through its tool: the unit tools/workerPool.mjs runs, since rows export independently.
export async function generateRow({ tool, row }) {
  const { generateModel } = await import('./packages/thing-export/src/files.ts');
  const [model] = (await recipeTools())[tool].load([row]);
  return generateModel(model);
}
