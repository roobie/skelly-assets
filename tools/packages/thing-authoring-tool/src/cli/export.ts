import { resolve } from 'node:path';
import process from 'node:process';
import { exportRecipes } from '../../../../build.mjs';
import { installJsonnetSources } from '../../../../sources.mjs';

// The thing partition of every recipe file, through the one driver, into <out>/<packId>/things/ and assets/models/.
export const exportThingRecipes = (
  repositoryRoot = resolve(import.meta.dirname, '../../../../..'),
  out = resolve(repositoryRoot, 'built'),
): Promise<readonly string[]> => exportRecipes({ root: repositoryRoot, out, tools: ['thing'], sourcesReady: true });

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  if (!process.argv[2] || !process.argv[3]) throw new Error('Usage: export.ts <repository root> <output root>');
  installJsonnetSources();
  await exportThingRecipes(resolve(process.argv[2]), resolve(process.argv[3]));
}
