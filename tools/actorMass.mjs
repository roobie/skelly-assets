// @ts-check
// Point-list twin of mobgen/core/massProperties.ts and core/templateMass.ts.
// Kept grid-free so the same arithmetic can consume serialized actor bodies.
/** @import { Vec3 } from './packages/mobgen/src/core/math.ts' */
import { AXES } from './packages/construct/src/foundation/math.ts';

/**
 * @param {number} value
 * @param {string} name
 */
const positive = (value, name) => {
  if (!(value > 0 && Number.isFinite(value))) throw new RangeError(`${name} must be positive and finite`);
};
/** @param {readonly Vec3[]} points */
const nonempty = (points) => {
  if (points.length === 0) throw new RangeError('selected bones contain no voxels');
};

/**
 * @param {readonly Vec3[]} points
 * @param {Vec3} center
 * @param {number} voxelMass
 * @param {number} size
 * @returns {[Vec3, Vec3, Vec3]}
 */
const tensorAtCenter = (points, center, voxelMass, size) => {
  let xx = 0;
  let yy = 0;
  let zz = 0;
  let xy = 0;
  let xz = 0;
  let yz = 0;
  for (const p of points) {
    const x = p[0] - center[0];
    const y = p[1] - center[1];
    const z = p[2] - center[2];
    xx += voxelMass * (y * y + z * z);
    yy += voxelMass * (x * x + z * z);
    zz += voxelMass * (x * x + y * y);
    xy -= voxelMass * x * y;
    xz -= voxelMass * x * z;
    yz -= voxelMass * y * z;
  }
  const ownCube = (voxelMass * size * size * points.length) / 6;
  return [
    [xx + ownCube, xy, xz],
    [xy, yy + ownCube, yz],
    [xz, yz, zz + ownCube],
  ];
};

/**
 * @param {readonly Vec3[]} points
 * @param {number} voxelSize
 * @param {number} voxelMass
 */
export const voxelMassProperties = (points, voxelSize, voxelMass) => {
  positive(voxelSize, 'voxelSize');
  positive(voxelMass, 'voxelMass');
  nonempty(points);
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const p of points) {
    sx += p[0];
    sy += p[1];
    sz += p[2];
  }
  /** @type {Vec3} */
  const center = [sx / points.length, sy / points.length, sz / points.length];
  return { mass: points.length * voxelMass, center, inertia: tensorAtCenter(points, center, voxelMass, voxelSize) };
};

/**
 * @param {readonly Vec3[]} points
 * @param {number} voxelSize
 * @param {Vec3} [reference]
 */
export const voxelBounds = (points, voxelSize, reference = [0, 0, 0]) => {
  positive(voxelSize, 'voxelSize');
  nonempty(points);
  const half = voxelSize / 2;
  /** @type {[number, number, number]} */
  const min = [Infinity, Infinity, Infinity];
  /** @type {[number, number, number]} */
  const max = [-Infinity, -Infinity, -Infinity];
  for (const point of points) {
    for (const axis of AXES) {
      min[axis] = Math.min(min[axis], point[axis] - half);
      max[axis] = Math.max(max[axis], point[axis] + half);
    }
  }
  /** @type {Vec3} */
  const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  /** @type {Vec3} */
  const halfExtents = [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2];
  /** @type {Vec3[]} */
  const corners = [];
  for (const x of [-halfExtents[0], halfExtents[0]]) {
    for (const y of [-halfExtents[1], halfExtents[1]]) {
      for (const z of [-halfExtents[2], halfExtents[2]]) {
        corners.push([center[0] + x - reference[0], center[1] + y - reference[1], center[2] + z - reference[2]]);
      }
    }
  }
  return { center, halfExtents, corners };
};

/**
 * @param {object} of
 * @param {readonly Vec3[]} of.points
 * @param {number} of.voxelSize
 * @param {number} of.bodyVoxelCount
 * @param {number} of.bodyMassKg
 * @param {Readonly<Record<string, number>>} [of.massFractions]
 * @param {string} of.part
 */
export const partMassProperties = ({ points, voxelSize, bodyVoxelCount, bodyMassKg, massFractions, part }) => {
  positive(bodyMassKg, 'bodyMassKg');
  const fraction = massFractions?.[part] ?? points.length / bodyVoxelCount;
  if (!(fraction > 0 && fraction <= 1 && Number.isFinite(fraction))) {
    throw new RangeError(`mass fraction for ${part} must be in (0, 1]`);
  }
  const mass = bodyMassKg * fraction;
  const { center, inertia } = voxelMassProperties(points, voxelSize, mass / points.length);
  // Return the authored product, not count * (mass / count), which can lose an ulp.
  return { mass, center, inertia, fraction };
};
