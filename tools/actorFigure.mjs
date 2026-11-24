// @ts-check
/** @import { Genome, Template } from './packages/mobgen/src/core/template.ts' */
/** @import { Realized } from './packages/mobgen/src/core/generate.ts' */
/** @import { Vec3 } from './packages/mobgen/src/core/math.ts' */
import { AXES, perAxis } from './packages/construct/src/foundation/math.ts';
import { planOf } from './packages/mobgen/src/core/generate.ts';
import { worldPosition } from './packages/mobgen/src/core/voxelize.ts';
import { regionSeverableParts } from './packages/mobgen/src/mob/dismember.ts';
import { fusedMassManifest } from './packages/mobgen/src/mob/fusedMass.ts';

/** A body exports only hit regions naming bones it realizes, so an amputated plan leaves no dangling references. */
/**
 * @param {Readonly<Record<string, readonly string[]>> | undefined} regionBones
 * @param {ReadonlySet<string>} boneIds
 * @returns {Record<string, string[]> | undefined}
 */
export const realizedRegionBones = (regionBones, boneIds) =>
  regionBones === undefined
    ? undefined
    : Object.fromEntries(
        Object.entries(regionBones).map(([region, ids]) => [region, ids.filter((id) => boneIds.has(id))]),
      );

/** Adapt an already-realized row in the generator's rest-world frame, which the export turns (tools/actorFrame.mjs). */
/** @typedef {ReturnType<typeof figureFor>} Figure a generated mob measured for its files */
/** @typedef {Extract<Figure, { manifest: unknown }>} FusedFigure a fused mass's figure, with the cells and bounds it alone has */

/**
 * @param {Figure} figure
 * @returns {FusedFigure}
 */
export const fusedFigure = (figure) => {
  if (!('manifest' in figure)) throw new Error('a fused mass needs a figure measured from a fused-mass template');
  return figure;
};

/**
 * @param {{ readonly realized: Realized; readonly genome: Genome }} generated
 * @param {Template} template
 * @param {number} scale
 */
export function figureFor(generated, template, scale) {
  const { realized, genome } = generated;
  const { voxels, body } = realized;
  /** @typedef {{ min: [number, number, number]; max: [number, number, number] }} Limits */
  /** @type {Map<string, Vec3[]>} */
  const voxelCentersByBone = new Map();
  /** @type {Map<string, Limits>} */
  const limits = new Map();
  /** @type {Limits} */
  const total = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (let k = 0; k < voxels.dims[2]; k++)
    for (let j = 0; j < voxels.dims[1]; j++)
      for (let i = 0; i < voxels.dims[0]; i++) {
        const owner = voxels.owner[i + j * voxels.dims[0] + k * voxels.dims[0] * voxels.dims[1]];
        if (!owner) continue;
        const bone = body.bones[owner - 1];
        if (!bone) throw new Error(`a voxel is owned by bone ${owner}, which the body lacks`);
        const { id } = bone;
        const point = worldPosition(voxels, i, j, k);
        let centers = voxelCentersByBone.get(id);
        if (!centers) {
          centers = [];
          voxelCentersByBone.set(id, centers);
        }
        centers.push(point);
        let bounds = limits.get(id);
        if (!bounds) {
          bounds = { min: [...point], max: [...point] };
          limits.set(id, bounds);
        }
        for (const axis of AXES) {
          bounds.min[axis] = Math.min(bounds.min[axis], point[axis]);
          bounds.max[axis] = Math.max(bounds.max[axis], point[axis]);
          total.min[axis] = Math.min(total.min[axis], point[axis] - voxels.size / 2);
          total.max[axis] = Math.max(total.max[axis], point[axis] + voxels.size / 2);
        }
      }
  const fused = template.bodyPlan === 'fused-mass';
  const manifest = fused ? fusedMassManifest(body, voxels) : undefined;
  /** @type {Readonly<Record<string, readonly string[]>> | undefined} */
  const regions = manifest
    ? Object.fromEntries(manifest.regions.map((r) => [r.id, r.boneIds]))
    : realizedRegionBones(planOf(template.bodyPlan).regionBones, new Set(body.bones.map((bone) => bone.id)));
  const margin = voxels.size / 2 + (fused ? 0 : 0.001);
  const boxes =
    regions === undefined
      ? undefined
      : Object.fromEntries(
          Object.entries(regions).map(([region, ids]) => [
            region,
            ids.flatMap((bone) => {
              const bounds = limits.get(bone);
              return bounds
                ? [
                    {
                      bone,
                      center: perAxis((a) => (bounds.min[a] + bounds.max[a]) / 2),
                      halfSize: perAxis((a) => (bounds.max[a] - bounds.min[a]) / 2 + margin),
                    },
                  ]
                : [];
            }),
          ]),
        );
  const figure = {
    seed: genome.seed,
    genome,
    realized,
    ...(regions === undefined ? {} : { regions, boxes, severableParts: regionSeverableParts(body.bones, regions) }),
    voxelCentersByBone,
  };
  if (!fused) return figure;
  if (!(Number.isFinite(scale) && scale > 0)) throw new RangeError('fused scale must be positive and finite');
  const bounds = { min: perAxis((a) => total.min[a] * scale), max: perAxis((a) => total.max[a] * scale) };
  const originOffset = perAxis((a) => -(a === 1 ? total.min[a] : (total.min[a] + total.max[a]) / 2) * scale);
  const centers = voxelCentersByBone.get('core');
  const first = centers?.[0];
  if (!centers || !first) throw new Error('fused mass has no core voxels');
  // Match fusedMassFigure: use the centroid only when it lies inside a core cell.
  /** @type {Vec3} */
  const none = [0, 0, 0];
  const centroid = centers.reduce((sum, point) => perAxis((a) => sum[a] + point[a] / centers.length), none);
  /** @param {Vec3} p */
  const distance = (p) => (p[0] - centroid[0]) ** 2 + (p[1] - centroid[1]) ** 2 + (p[2] - centroid[2]) ** 2;
  const coreInteriorPoint = centers.some((p) => AXES.every((a) => Math.abs(p[a] - centroid[a]) < voxels.size / 2))
    ? centroid
    : centers.reduce((nearest, point) => (distance(point) < distance(nearest) ? point : nearest), first);
  return {
    ...figure,
    scale,
    manifest,
    bounds,
    originOffset,
    coreInteriorPoint,
    restStrikeOrigin: perAxis((a) => coreInteriorPoint[a] * scale + originOffset[a]),
  };
}
