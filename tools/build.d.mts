export type RecipeToolName = 'gun' | 'thing';
export function partitionRecipe(
  packId: string,
  rows: unknown,
  tools: Readonly<Record<string, { readonly kinds: readonly string[] }>>,
): Record<string, unknown[]>;
export function exportRecipes(options: {
  root?: string;
  out?: string;
  tools: readonly RecipeToolName[];
}): Promise<string[]>;
