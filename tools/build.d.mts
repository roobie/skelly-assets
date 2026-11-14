export type RecipeToolName = 'gun' | 'thing';
export function partitionRecipe(
  packId: string,
  rows: unknown,
  tools: Readonly<Record<string, { readonly kinds: readonly string[] }>>,
): Record<string, unknown[]>;
export interface RecipeModel {
  id: string;
  kind: string;
  pack: string;
  /** The GLB's logical path under the pack. */
  path: string;
  /** The GLB's part node names from the resolved assembly. */
  nodes: readonly string[];
}
export function exportRecipes(options: {
  root?: string;
  out?: string;
  tools: readonly RecipeToolName[];
  /** Generates each row; the default is a pool of worker threads. */
  pool?: { run(input: { tool: RecipeToolName; task: unknown }): Promise<unknown> };
}): Promise<{ models: RecipeModel[]; files: string[] }>;
