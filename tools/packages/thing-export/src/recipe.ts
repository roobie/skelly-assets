import type { NeutralModel } from '@skelly/thing-core/schema';
import {
  array,
  check,
  gtValue,
  type InferOutput,
  nonEmpty,
  number,
  optional,
  parse,
  pipe,
  regex,
  strictObject,
  string,
  unknown,
} from 'valibot';
import type { VoxelGrains } from './exportTypes.ts';

const grain = pipe(number(), gtValue(0));
// Every row names its voxel class, so no model drifts smooth beside voxel ones by omission; a row lacking one is refused.
const RowSchema = strictObject({
  id: pipe(string(), regex(/^[a-z][a-z0-9_]*$/)),
  kind: pipe(string(), nonEmpty()),
  source: pipe(string(), nonEmpty()),
  voxel: strictObject({ grain, detailGrain: optional(grain) }),
  options: optional(unknown()),
  // The model's shelf and facet tags; the repository build holds them to its vocabulary, so export only carries them.
  taxonomy: optional(unknown()),
});
const RecipeSchema = pipe(
  array(RowSchema),
  nonEmpty(),
  check((rows) => new Set(rows.map(({ id }) => id)).size === rows.length, 'duplicate export id'),
);
export type RecipeRow = InferOutput<typeof RowSchema>;
export interface ModelExport<Model extends NeutralModel = NeutralModel> {
  readonly modelEntry: Model;
  readonly glb: Uint8Array;
  /** The GLB's part node names from the resolved assembly; see `glb.ts`, `partNodeName`. */
  readonly partNodes: readonly string[];
}
export interface RecipeExport<Model extends NeutralModel = NeutralModel> {
  readonly id: string;
  readonly kind: string;
  readonly source: string;
  readonly voxel: VoxelGrains;
  readonly generate: () => ModelExport<Model>;
  /** The data that, with the generator code, fixes the output; a row without it is never cached. */
  readonly inputs?: () => unknown;
}
/** The name a model goes by when nothing else names it; the showcase titles models by the same rule (`site/app.js`, `nameOf`). */
export const displayName = (id: string) => id.charAt(0).toUpperCase() + id.slice(1).replaceAll('_', ' ');
export const recipeAsset = ({ id }: Pick<RecipeRow, 'id'>) => ({ id, file: `assets/models/${id}.glb` as const });
export const recipeOptions = (row: RecipeRow) => (row.options === undefined ? {} : row.options);
export const recipeVoxel = ({ voxel }: RecipeRow): VoxelGrains => ({
  voxelGrain: voxel.grain,
  ...(voxel.detailGrain === undefined ? {} : { voxelDetailGrain: voxel.detailGrain }),
});
const contextual = <T>(row: RecipeRow, work: () => T): T => {
  try {
    return work();
  } catch (error) {
    throw new Error(
      `Export ${row.id} (${row.kind}, ${row.source}): ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
};
export const loadRecipe = <Model extends NeutralModel>(
  value: unknown,
  exporters: Readonly<Record<string, (row: RecipeRow) => () => ModelExport<Model>>>,
  /** Per kind, what a row's export reads besides code; rows of a kind not named here are never cached. */
  inputsOf: Readonly<Record<string, (row: RecipeRow) => unknown>> = {},
): readonly RecipeExport<Model>[] =>
  parse(RecipeSchema, value).map((row) =>
    contextual(row, () => {
      if (!Object.hasOwn(exporters, row.kind)) {
        throw new Error('unknown export kind');
      }
      const generate = exporters[row.kind]!(row);
      return {
        id: row.id,
        kind: row.kind,
        source: row.source,
        voxel: recipeVoxel(row),
        generate: () => contextual(row, generate),
        ...(Object.hasOwn(inputsOf, row.kind) ? { inputs: () => ({ row, data: inputsOf[row.kind]!(row) }) } : {}),
      };
    }),
  );
