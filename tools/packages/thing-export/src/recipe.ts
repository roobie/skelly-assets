import type { NeutralModel } from '@skelly/thing-core/schema';
import {
  array,
  boolean,
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
import { TitleSchema } from './title.ts';

const grain = pipe(number(), gtValue(0));
// Every row names its voxel class, so no model drifts smooth beside voxel ones by omission; a row lacking one is refused.
const RowSchema = strictObject({
  id: pipe(string(), regex(/^[a-z][a-z0-9_]*$/)),
  kind: pipe(string(), nonEmpty()),
  source: pipe(string(), nonEmpty()),
  voxel: strictObject({ grain, detailGrain: optional(grain), detailThinParts: optional(boolean()) }),
  options: optional(unknown()),
  // What the model is called wherever it is listed or printed; authored, never derived from the id.
  title: TitleSchema,
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
  /** The model's total mass and drawn volume, for tools that author the mass; see `physical.ts`, `drawnVolumeM3`. */
  readonly physical?: ModelPhysical;
}
export interface ModelPhysical {
  readonly massKg: number;
  /** Left out by a tool that weighs its parts but does not measure the voxels it draws, such as the gun tool. */
  readonly volumeM3?: number;
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
export const recipeAsset = ({ id }: Pick<RecipeRow, 'id'>) => ({ id, file: `assets/models/${id}.glb` as const });
export const recipeOptions = (row: RecipeRow) => (row.options === undefined ? {} : row.options);
/** A voxel class, as a recipe row or a single-file export names it, in the form the GLB writer takes. */
export const recipeVoxel = ({ voxel }: Pick<RecipeRow, 'voxel'>): VoxelGrains => ({
  voxelGrain: voxel.grain,
  ...(voxel.detailGrain === undefined ? {} : { voxelDetailGrain: voxel.detailGrain }),
  ...(voxel.detailThinParts === undefined ? {} : { voxelDetailThinParts: voxel.detailThinParts }),
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
