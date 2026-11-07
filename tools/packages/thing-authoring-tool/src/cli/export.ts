import { resolve } from 'node:path';
import process from 'node:process';
import { writeRecipeExports } from '@skelly/thing-export/files.ts';
import { readRecipes } from '../../../../recipes.mjs';
import { outputPath } from '../../../../layout.mjs';
import { installJsonnetSources } from '../../../../sources.mjs';

installJsonnetSources();
const { loadThingRecipe } = await import('../exports.ts');

export const exportThingRecipes = (
  repositoryRoot = resolve(import.meta.dirname, '../../../../..'),
  out = resolve(repositoryRoot, 'built'),
): void => {
  for (const { packId, value } of readRecipes(repositoryRoot)) {
    const base = resolve(out, outputPath(packId, 'things'), '..');
    writeRecipeExports(loadThingRecipe(value), base, 'things', { index: true });
  }
};

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  if (!process.argv[2] || !process.argv[3]) throw new Error('Usage: export.ts <repository root> <output root>');
  exportThingRecipes(resolve(process.argv[2]), resolve(process.argv[3]));
}
