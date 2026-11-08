import { planOf } from './packages/mobgen/src/core/generate.ts';
import { worldPosition } from './packages/mobgen/src/core/voxelize.ts';
import { regionSeverableParts } from './packages/mobgen/src/mob/dismember.ts';
import { fusedMassManifest } from './packages/mobgen/src/mob/fusedMass.ts';

/** Adapt an already-realized row, preserving the figure consumers' rest-world conventions. */
export function figureFor(generated, template, scale) {
  const { realized, genome } = generated;
  const { voxels, body } = realized;
  const voxelCentersByBone = new Map();
  const limits = new Map();
  const total = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (let k = 0; k < voxels.dims[2]; k++) for (let j = 0; j < voxels.dims[1]; j++) for (let i = 0; i < voxels.dims[0]; i++) {
    const owner = voxels.owner[i + j * voxels.dims[0] + k * voxels.dims[0] * voxels.dims[1]];
    if (!owner) continue;
    const id = body.bones[owner - 1].id;
    const point = worldPosition(voxels, i, j, k);
    if (!voxelCentersByBone.has(id)) voxelCentersByBone.set(id, []);
    voxelCentersByBone.get(id).push(point);
    if (!limits.has(id)) limits.set(id, { min: [...point], max: [...point] });
    const bounds = limits.get(id);
    for (let axis = 0; axis < 3; axis++) {
      bounds.min[axis] = Math.min(bounds.min[axis], point[axis]);
      bounds.max[axis] = Math.max(bounds.max[axis], point[axis]);
      total.min[axis] = Math.min(total.min[axis], point[axis] - voxels.size / 2);
      total.max[axis] = Math.max(total.max[axis], point[axis] + voxels.size / 2);
    }
  }
  const fused = template.bodyPlan === 'fused-mass';
  const manifest = fused ? fusedMassManifest(body, voxels) : undefined;
  // Creature plans without gameplay-specific regions still serialize one complete body region.
  const regions = fused
    ? Object.fromEntries(manifest.regions.map((r) => [r.id, r.boneIds]))
    : planOf(template.bodyPlan).regionBones ?? { body: body.bones.map((bone) => bone.id) };
  const margin = voxels.size / 2 + (fused ? 0 : 0.001);
  const boxes = Object.fromEntries(Object.entries(regions).map(([region, ids]) => [region, ids.flatMap((bone) => {
    const bounds = limits.get(bone);
    return bounds ? [{ bone, center: bounds.min.map((v, a) => (v + bounds.max[a]) / 2), halfSize: bounds.min.map((v, a) => (bounds.max[a] - v) / 2 + margin) }] : [];
  })]));
  const figure = { seed: genome.seed, genome, realized, regions, boxes, severableParts: regionSeverableParts(body.bones, regions), voxelCentersByBone };
  if (!fused) return figure;
  if (!(Number.isFinite(scale) && scale > 0)) throw new RangeError('fused scale must be positive and finite');
  const bounds = { min: total.min.map((v) => v * scale), max: total.max.map((v) => v * scale) };
  const originOffset = total.min.map((v, a) => -(a === 1 ? v : (v + total.max[a]) / 2) * scale);
  const centers = voxelCentersByBone.get('core');
  if (!centers?.length) throw new Error('fused mass has no core voxels');
  // Match fusedMassFigure: use the centroid only when it lies inside a core cell.
  const centroid = centers.reduce((sum, point) => sum.map((v, a) => v + point[a] / centers.length), [0, 0, 0]);
  const distance = (p) => p.reduce((sum, v, a) => sum + (v - centroid[a]) ** 2, 0);
  const coreInteriorPoint = centers.some((p) => p.every((v, a) => Math.abs(v - centroid[a]) < voxels.size / 2))
    ? centroid : centers.reduce((nearest, point) => distance(point) < distance(nearest) ? point : nearest, centers[0]);
  return { ...figure, scale, manifest, bounds, originOffset, coreInteriorPoint, restStrikeOrigin: coreInteriorPoint.map((v, a) => v * scale + originOffset[a]) };
}
