// Where each solid is drawn, so the datums an export writes (grips, anchors, round poses, collision boxes, centres of
// mass) read off the voxels the player sees rather than off the authored solids those voxels approximate.

import type { PartDef, Resolved } from '@skelly/construct/assembly/schema.ts';
import {
  add,
  applyPoint,
  extrusionPoint,
  invert,
  type Transform,
  type Vec3,
} from '@skelly/construct/foundation/math.ts';
import {
  clippedExtrudedPolygonPolyhedron,
  localSolidBounds,
  polyhedronMeasures,
} from '@skelly/construct/shapes/geometry.ts';
import { displayBevel, meshForSolid, terracedMesh } from '@skelly/construct/shapes/mesh.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import type { VoxelGrains } from './exportTypes.ts';
import { latticeOrigin, partVoxelGrain, terraceLattice } from './glb.ts';
import { fillVoxels, type VoxelFill } from './voxelize.ts';

/** A solid's bounds, centre and volume in its part's local frame and domain units. */
export interface SolidMeasure {
  readonly min: Vec3;
  readonly max: Vec3;
  readonly centre: Vec3;
  readonly volume: number;
}

const authoredVolume = (solid: Solid): { readonly volume: number; readonly centre: Vec3 } => {
  if (solid.kind === 'box') {
    return { volume: 8 * solid.box.half[0] * solid.box.half[1] * solid.box.half[2], centre: solid.box.center };
  }
  if (solid.kind === 'extruded-polygon') {
    const shape = clippedExtrudedPolygonPolyhedron(solid);
    if (!shape) {
      return { volume: 0, centre: [0, 0, 0] };
    }
    const { volume, centroid } = polyhedronMeasures(shape);
    return { volume, centre: centroid };
  }
  let volume = 0;
  let moment = 0;
  for (let i = 0; i < solid.profile.length; i++) {
    const [a, r] = solid.profile[i]!;
    const [b, s] = solid.profile[(i + 1) % solid.profile.length]!;
    volume += ((b - a) * (r * r + r * s + s * s)) / 3;
    moment += ((b - a) * ((3 * a + b) * r * r + 2 * (a + b) * r * s + (a + 3 * b) * s * s)) / 12;
  }
  const axial = volume === 0 ? 0 : moment / volume;
  return {
    volume: Math.PI * Math.abs(volume),
    centre: add(solid.origin ?? [0, 0, 0], extrusionPoint(solid.axis ?? 'z', [0, 0], axial)),
  };
};

export const authoredMeasure = (solid: Solid): SolidMeasure => {
  const [min, max] = localSolidBounds(solid);
  return { min, max, ...authoredVolume(solid) };
};

/** The point at the same fraction of `drawn`'s bounds as `point` is of `authored`'s; a flat axis takes the middle. */
export const pointWithin = (authored: readonly [Vec3, Vec3], drawn: SolidMeasure, point: Vec3): Vec3 =>
  point.map((value, axis) => {
    const span = authored[1][axis]! - authored[0][axis]!;
    const fraction = span > 1e-12 ? (value - authored[0][axis]!) / span : 0.5;
    return drawn.min[axis]! + fraction * (drawn.max[axis]! - drawn.min[axis]!);
  }) as unknown as Vec3;

export interface DrawnGeometry {
  /** The solid of `part` as it is drawn; without a voxel grain, as it is authored. */
  readonly measure: (part: string, solid: Solid) => SolidMeasure;
  /**
   * An assembly point moved to its place on the drawn model. It keeps its fraction of the bounds of the smallest drawn
   * solid or whole part around it, or, outside them all, of the nearest one.
   */
  readonly point: (at: Vec3) => Vec3;
  /**
   * The grain of the lattice, anchored at the model origin, that `part`'s drawn faces lie on in the model frame: none
   * without a voxel grain, or when the part is turned off the axes and its boxes stand off every lattice plane.
   */
  readonly grain: (part: string) => number | undefined;
  /**
   * The fill of `part`'s drawn solids, one source per solid, that its datums read off, for the file to mesh: none
   * without a grain for the part, or for a part that merges solids, which the file samples as one mesh.
   */
  readonly voxels: (part: string) => VoxelFill | undefined;
}

const onAxes = ({ r }: Transform): boolean => r.every((x) => [-1, 0, 1].some((q) => Math.abs(x - q) < 1e-9));

interface Region {
  readonly placed: Transform;
  readonly toLocal: Transform;
  readonly authored: readonly [Vec3, Vec3];
  readonly drawn: () => SolidMeasure;
}

interface Sampled {
  readonly fill: VoxelFill;
  readonly measures: Map<Solid, SolidMeasure | undefined>;
}

const sizeOf = ([min, max]: readonly [Vec3, Vec3]): number => (max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]);

const distanceTo = ([min, max]: readonly [Vec3, Vec3], point: Vec3): number =>
  Math.hypot(...point.map((value, axis) => Math.max(min[axis]! - value, 0, value - max[axis]!)));

const unionOf = (boxes: readonly (readonly [Vec3, Vec3])[]): [Vec3, Vec3] => [
  [0, 1, 2].map((axis) => Math.min(...boxes.map(([min]) => min[axis]!))) as unknown as Vec3,
  [0, 1, 2].map((axis) => Math.max(...boxes.map(([, max]) => max[axis]!))) as unknown as Vec3,
];

/**
 * Reads datums off the drawn voxels of `resolved` at the export's grains: each solid is sampled on its part's lattice
 * together with the solids it is drawn among, as `glb.ts` samples them for the file, and measured by the voxels it
 * fills there. Without a grain, for the file or the part, the file holds the authored meshes, so datums stay on the
 * authored solids.
 */
export const drawnGeometry = (
  resolved: Resolved,
  options: Partial<VoxelGrains> & { readonly revolveFacets?: number | undefined } = {},
): DrawnGeometry => {
  const { voxelGrain } = options;
  const unit = resolved.domain.units.metresPerUnit;
  const authoredMeasures = new Map<Solid, SolidMeasure>();
  // Judging a part's grain bounds all its solids, and every solid of the part is measured, so it is judged once.
  const grains = new Map<PartDef, number | undefined>();
  const grainOf = (def: PartDef): number | undefined => {
    if (voxelGrain === undefined) {
      return undefined;
    }
    if (!grains.has(def)) {
      grains.set(def, partVoxelGrain(def, { ...options, voxelGrain }, unit));
    }
    return grains.get(def);
  };
  /**
   * Per list of solids sampled together and per lattice they are sampled on, their fill and each solid's drawn measure,
   * undefined where it draws none. Parts built from one definition share its solids list but not their placement.
   */
  const sampled = new Map<readonly Solid[], Map<string, Sampled>>();
  const sampledOf = (siblings: readonly Solid[], grain: number, placed: Transform): Sampled => {
    const origin = latticeOrigin(placed, grain, unit);
    const lattices = sampled.get(siblings) ?? new Map<string, Sampled>();
    sampled.set(siblings, lattices);
    const key = [grain, ...origin].join(' ');
    const known = lattices.get(key);
    if (known) {
      return known;
    }
    const lattice = terraceLattice(placed, grain, unit);
    const sources = siblings.map((solid) => {
      const bevel = solid.display?.mergeGroup === undefined ? displayBevel(solid, resolved.domain.units) : 0;
      const mesh = terracedMesh(solid, lattice) ?? meshForSolid(solid, bevel, options.revolveFacets);
      // A solid without triangles draws nothing, and the file leaves it out of its sampling.
      return mesh.triangleCount === 0 || mesh.indices.length === 0
        ? { positions: [], indices: [] }
        : { positions: mesh.positions.map((x) => x * unit), indices: mesh.indices };
    });
    const inUnits = (v: readonly number[]): Vec3 => [v[0]! / unit, v[1]! / unit, v[2]! / unit];
    const fill = fillVoxels(sources, grain, origin);
    const measures = new Map(
      siblings.map((solid, index) => {
        const own = fill.measures[index];
        return [
          solid,
          own && {
            min: inUnits(own.min),
            max: inUnits(own.max),
            centre: inUnits(own.centroid),
            volume: own.voxels * (grain / unit) ** 3,
          },
        ];
      }),
    );
    const entry = { fill, measures };
    lattices.set(key, entry);
    return entry;
  };
  const placedPart = (partId: string) => {
    const def = resolved.defs.get(partId);
    const placed = resolved.placed.get(partId);
    if (!(def && placed)) {
      throw new Error(`No placed part ${partId} to read a datum from`);
    }
    return { def, placed };
  };
  const measure = (partId: string, solid: Solid): SolidMeasure => {
    const { def, placed } = placedPart(partId);
    const grain = grainOf(def);
    if (grain === undefined) {
      const authored = authoredMeasures.get(solid) ?? authoredMeasure(solid);
      authoredMeasures.set(solid, authored);
      return authored;
    }
    // A solid is sampled with the solids it is drawn among, as the file samples them; a collision solid the file does
    // not draw, with the part's other collision solids.
    const siblings = [def.displaySolids ?? def.solids, def.solids].find((list) => list.includes(solid)) ?? [solid];
    const found = sampledOf(siblings, grain, placed).measures.get(solid);
    if (!found) {
      throw new Error(`Solid ${solid.id} of ${partId} draws no voxels to read its datums from`);
    }
    return found;
  };
  const voxels = (partId: string): VoxelFill | undefined => {
    const { def, placed } = placedPart(partId);
    const grain = grainOf(def);
    const drawn = def.displaySolids ?? def.solids;
    return grain === undefined || drawn.some((solid) => solid.display?.mergeGroup !== undefined)
      ? undefined
      : sampledOf(drawn, grain, placed).fill;
  };
  let regions: Region[] | undefined;
  const regionsOf = (): Region[] => {
    regions ??= [...resolved.defs].flatMap(([part, def]) => {
      const placed = resolved.placed.get(part);
      const solids = def.displaySolids ?? def.solids;
      if (!placed || solids.length === 0) {
        return [];
      }
      const toLocal = invert(placed);
      const own = solids.map(
        (solid): Region => ({
          placed,
          toLocal,
          authored: localSolidBounds(solid),
          drawn: () => measure(part, solid),
        }),
      );
      const whole: Region = {
        placed,
        toLocal,
        authored: unionOf(own.map(({ authored }) => authored)),
        drawn: () => {
          const [min, max] = unionOf(own.map(({ drawn }) => [drawn().min, drawn().max]));
          return { min, max, centre: [0, 0, 0], volume: 0 };
        },
      };
      return [...own, whole];
    });
    return regions;
  };
  const point = (at: Vec3): Vec3 => {
    if (voxelGrain === undefined) {
      return at;
    }
    const located = regionsOf().map((region) => {
      const local = applyPoint(region.toLocal, at);
      return { region, local, distance: distanceTo(region.authored, local), size: sizeOf(region.authored) };
    });
    const inside = located.filter(({ distance }) => distance <= 1e-9);
    const [chosen] = (inside.length > 0 ? inside : located).sort((a, b) =>
      inside.length > 0 ? a.size - b.size : a.distance - b.distance,
    );
    if (!chosen) {
      throw new Error('No drawn solid to place a datum on');
    }
    return applyPoint(chosen.region.placed, pointWithin(chosen.region.authored, chosen.region.drawn(), chosen.local));
  };
  const grain = (part: string): number | undefined => {
    const def = resolved.defs.get(part);
    const placed = resolved.placed.get(part);
    return def && placed && onAxes(placed) ? grainOf(def) : undefined;
  };
  return { measure, point, grain, voxels };
};
