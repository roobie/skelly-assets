import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NeutralModel } from '@skelly/thing-core/schema';
import type { RecipeExport } from './recipe.ts';

// Serialised in-process: a formatter subprocess per model cost more than generating most models.
const formattedJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
export const modelEntryJson = (entry: NeutralModel): string => formattedJson(entry);
/** What one recipe wrote: each model's GLB path and part nodes, and every file, all relative to the base. */
export interface WrittenRecipe {
  readonly models: readonly { readonly id: string; readonly kind: string; readonly path: string; readonly partNodes: readonly string[] }[];
  readonly files: readonly string[];
}
export const writeRecipeExports = (
  recipe: readonly RecipeExport[],
  base: string,
  directory: string,
  { index = false }: { readonly index?: boolean } = {},
): WrittenRecipe => {
  const outputs = recipe.map(({ id, kind, generate }) => ({ id, kind, ...generate() }));
  mkdirSync(resolve(base, directory), { recursive: true });
  mkdirSync(resolve(base, 'assets/models'), { recursive: true });
  const files: string[] = [];
  if (index) {
    writeFileSync(
      resolve(base, directory, 'index.json'),
      formattedJson(outputs.map(({ modelEntry }) => modelEntry)),
    );
    files.push(`${directory}/index.json`);
  }
  for (const { modelEntry, glb } of outputs) {
    writeFileSync(resolve(base, directory, `${modelEntry.id}.model.json`), modelEntryJson(modelEntry));
    writeFileSync(resolve(base, modelEntry.file), glb);
    files.push(`${directory}/${modelEntry.id}.model.json`, modelEntry.file);
  }
  return {
    models: outputs.map(({ id, kind, modelEntry, partNodes }) => ({ id, kind, path: modelEntry.file, partNodes })),
    files,
  };
};
