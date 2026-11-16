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
export interface ExportPool {
  run(input: { tool: RecipeToolName; task: unknown }): Promise<unknown>;
  close(): Promise<void>;
  usage(): { reused: number; generated: number };
  prune(): Promise<void>;
}
export function exportPool(cache?: string): ExportPool;
export function exportRecipes(options: {
  root?: string;
  out?: string;
  tools: readonly RecipeToolName[];
  /** Generates each row; the default is a pool of worker threads. */
  pool?: Pick<ExportPool, 'run'>;
  /** Builds only these row ids. */
  ids?: ReadonlySet<string>;
}): Promise<{ models: RecipeModel[]; files: string[] }>;
export function withSources<Model extends { pack: string; id: string }>(
  models: readonly Model[],
  sources: readonly { pack: string; id: string; title: unknown; taxonomy: unknown }[],
): (Model & { title: unknown; taxonomy: unknown })[];
export function withWornOn<Model extends { id: string; taxonomy?: { tags?: readonly string[] } }>(
  models: readonly Model[],
  dressing: unknown,
  dollParts: unknown,
): (Model & { wornOn?: unknown })[];
export function fillCacheShard(options: {
  root?: string;
  shard: { index: number; count: number };
  cache: string;
  sitePieces?: unknown;
}): Promise<void>;
