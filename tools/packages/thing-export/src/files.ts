import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NeutralModel } from '@skelly/thing-core/schema';
import type { ExportCache } from './cache.ts';
import type { ModelExport, RecipeExport } from './recipe.ts';

// Serialised in-process: a formatter subprocess per model cost more than generating most models.
const formattedJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
export const modelEntryJson = (entry: NeutralModel): string => formattedJson(entry);
/** What one recipe wrote: each model's GLB path, part nodes and label, and every file, all relative to the base. */
export interface WrittenRecipe {
  readonly models: readonly {
    readonly id: string;
    readonly kind: string;
    readonly path: string;
    readonly partNodes: readonly string[];
    readonly label?: NeutralModel['label'];
    readonly paintable?: NeutralModel['paintable'];
  }[];
  readonly files: readonly string[];
}
/** One generated recipe row: plain data, so a worker thread can generate it and hand it back to be written. */
export interface GeneratedModel extends ModelExport {
  readonly id: string;
  readonly kind: string;
}
export const generateModel = (row: RecipeExport, cache?: ExportCache): GeneratedModel => {
  const { modelEntry, glb, partNodes } = cache ? cache.export(row) : row.generate();
  return { id: row.id, kind: row.kind, modelEntry, glb, partNodes };
};

/** Writes generated rows in the given order, so the files do not depend on which row finished first. */
export const writeModelExports = (
  outputs: readonly GeneratedModel[],
  base: string,
  directory: string,
  { index = false }: { readonly index?: boolean } = {},
): WrittenRecipe => {
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
    models: outputs.map(({ id, kind, modelEntry, partNodes }) => ({
      id,
      kind,
      path: modelEntry.file,
      partNodes,
      ...(modelEntry.label === undefined ? {} : { label: modelEntry.label }),
      ...(modelEntry.paintable === undefined ? {} : { paintable: modelEntry.paintable }),
    })),
    files,
  };
};
export const writeRecipeExports = (
  recipe: readonly RecipeExport[],
  base: string,
  directory: string,
  options: { readonly index?: boolean } = {},
): WrittenRecipe => writeModelExports(recipe.map((row) => generateModel(row)), base, directory, options);
