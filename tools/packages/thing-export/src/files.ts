import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NeutralModel } from '@skelly/thing-core/schema';
import type { CachedExport, ExportCache } from './cache.ts';
import type { ModelExport, ModelPhysical, RecipeExport } from './recipe.ts';

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
    readonly covers?: NeutralModel['covers'];
    readonly physical?: ModelPhysical;
  }[];
  readonly files: readonly string[];
}
/**
 * One generated recipe row: plain data, so a worker thread can generate it and hand it back to be written. A cached
 * row carries its cache entry, so the build can count what it reused and keep exactly the entries it used.
 */
export interface GeneratedModel extends ModelExport {
  readonly id: string;
  readonly kind: string;
  readonly entry?: CachedExport['entry'];
}
export const generateModel = (row: RecipeExport, cache?: ExportCache): GeneratedModel => {
  const { model, entry } = cache ? cache.export(row) : { model: row.generate() };
  const { modelEntry, glb, partNodes, physical } = model;
  return {
    id: row.id,
    kind: row.kind,
    modelEntry,
    glb,
    partNodes,
    ...(physical === undefined ? {} : { physical }),
    ...(entry === undefined ? {} : { entry }),
  };
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
    models: outputs.map(({ id, kind, modelEntry, partNodes, physical }) => ({
      id,
      kind,
      path: modelEntry.file,
      partNodes,
      ...(modelEntry.label === undefined ? {} : { label: modelEntry.label }),
      ...(modelEntry.paintable === undefined ? {} : { paintable: modelEntry.paintable }),
      ...(modelEntry.covers === undefined ? {} : { covers: modelEntry.covers }),
      ...(physical === undefined ? {} : { physical }),
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
