import type { Resolved } from '@skelly/construct/assembly/schema.ts';
import { MATERIALS } from '@skelly/thing-core/materials';
import type { DrawnGeometry } from '@skelly/thing-export/drawn.ts';
import { check, finite, type InferOutput, minValue, number, optional, pipe, record, strictObject, string } from 'valibot';
import type { ToolItem } from './catalogue.ts';

const density = pipe(number(), finite(), minValue(0));
const ordered = <Bounds extends { readonly min?: number | undefined; readonly max?: number | undefined }>({
  min,
  max,
}: Bounds) => min === undefined || max === undefined || min <= max;
/**
 * The drawn densities, in kilograms per cubic metre of a part's voxels, that a part's authored mass may plausibly
 * have: `min` and `max` for any voxel, and either of them in place of those for a voxel a named material draws.
 */
export const DensityBoundsSchema = pipe(
  strictObject({
    min: density,
    max: density,
    materials: optional(
      record(
        pipe(
          string(),
          check((id) => Object.hasOwn(MATERIALS, id), 'unknown shared material'),
        ),
        pipe(strictObject({ min: optional(density), max: optional(density) }), check(ordered, 'min above max')),
      ),
    ),
  }),
  check(ordered, 'min above max'),
);
export type DensityBounds = InferOutput<typeof DensityBoundsSchema>;

/**
 * Refuses a part whose authored mass its drawn voxels could not plausibly weigh: each voxel weighs between its
 * material's bounds, so a part's mass lies between the sums of them over its voxels. A voxel's material is its solid's
 * own, else its finish slot's.
 */
export const checkDrawnDensity = (
  item: ToolItem,
  resolved: Resolved,
  drawn: DrawnGeometry,
  masses: Readonly<Record<string, number>>,
  bounds: DensityBounds,
): void => {
  const cubicMetres = resolved.domain.units.metresPerUnit ** 3;
  for (const [id, def] of resolved.defs) {
    const part = item.parts.find((candidate) => candidate.id === id);
    if (!part) {
      throw new Error(`${item.id}: no authored part ${id} to weigh`);
    }
    let volume = 0;
    let lightest = 0;
    let heaviest = 0;
    for (const solid of def.solids) {
      const drawnVolume = drawn.measure(id, solid).volume * cubicMetres;
      const own = bounds.materials?.[solid.material ?? part.finish[solid.slot!]!];
      volume += drawnVolume;
      lightest += drawnVolume * (own?.min ?? bounds.min);
      heaviest += drawnVolume * (own?.max ?? bounds.max);
    }
    const massKg = masses[id]!;
    if (massKg < lightest || massKg > heaviest) {
      throw new Error(
        `${item.id}/${id}: ${massKg} kg is implausible for its ${volume.toFixed(4)} m3 of drawn voxels, ` +
          `which its materials bound to ${lightest.toFixed(1)}-${heaviest.toFixed(1)} kg`,
      );
    }
  }
};
