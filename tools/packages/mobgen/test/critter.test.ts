import { describe, expect, it } from 'vitest';
import { generate, realize } from '../src/core/generate.ts';
import { applyPoint } from '../src/core/math.ts';
import { boneTransforms, type Pose } from '../src/core/pose.ts';
import { posedVoxelSurfaceBoundsForBones } from '../src/core/voxelBounds.ts';
import {
  CRITTER_DEATH_SECONDS,
  CRITTER_TAIL,
  critterDeathPose,
  critterGaitPose,
  critterIdlePose,
  critterStance,
  critterStrideLength,
} from '../src/mob/critter.ts';
import { critterTemplate } from '../src/mob/critterTemplate.ts';
import { quadrupedPawBones } from '../src/mob/quadruped.ts';
import { TEMPLATES } from '../src/mob/templates.ts';

const SEEDS = [1, 2, 7, 42];
const realizedFor = (seed: number) => realize(generate(critterTemplate, seed));
type Realized = ReturnType<typeof realizedFor>;
const stanceFor = (seed: number) => critterStance(generate(critterTemplate, seed).params);

const lowestSurface = (realized: Realized, pose: Pose): number =>
  Math.min(
    ...posedVoxelSurfaceBoundsForBones(
      realized,
      pose,
      realized.body.bones.map((bone) => bone.id),
    ).values(),
  );

/** Every bone's head where a pose puts it in the world. */
const bonePoints = (realized: Realized, pose: Pose): number[] => {
  const transforms = boneTransforms(realized.body.bones, pose);
  return realized.body.bones.flatMap((bone) => [...applyPoint(transforms.get(bone.id)!, bone.head)]);
};

/** The mean height of one side's paws, where its bones put their heads. */
const sideHeight = (realized: Realized, pose: Pose, side: 'L' | 'R'): number => {
  const transforms = boneTransforms(realized.body.bones, pose);
  const heights = quadrupedPawBones
    .filter((id) => id.endsWith(`.${side}`))
    .map((id) => applyPoint(transforms.get(id)!, realized.body.bones.find((bone) => bone.id === id)!.head)[1]);
  return heights.reduce((sum, y) => sum + y, 0) / heights.length;
};

describe('critter', () => {
  it('is its own body plan, outside the templates Deadvox spawns', () => {
    expect(critterTemplate.bodyPlan).toBe('critter');
    expect(TEMPLATES.some((template) => template.name === 'critter')).toBe(false);
  });

  it.each(SEEDS)('validates as a connected, grounded, budgeted body for seed %i', (seed) => {
    const realized = realizedFor(seed);
    expect(realized.report.ok, realized.report.issues.map((issue) => issue.message).join('; ')).toBe(true);
  });

  it('carries a jointed tail and stands on its four paws', () => {
    const realized = realizedFor(7);
    const ids = realized.body.bones.map((bone) => bone.id);
    for (const id of CRITTER_TAIL) expect(ids).toContain(id);
    expect(realized.supportBones).toEqual(new Set(quadrupedPawBones));
    const rest = critterIdlePose(realized, stanceFor(7));
    expect(Math.abs(lowestSurface(realized, rest))).toBeLessThanOrEqual(realized.voxels.size);
  });

  it.each([1, 7])('plants a paw on the ground at every phase of the walk for seed %i', (seed) => {
    const realized = realizedFor(seed);
    const stance = stanceFor(seed);
    const stride = critterStrideLength(realized, stance);
    const tolerance = realized.voxels.size;
    for (let k = 0; k < 12; k++) {
      const pose = critterGaitPose(realized, (k / 12) * stride, 1.4, stance);
      const paws = [...posedVoxelSurfaceBoundsForBones(realized, pose, quadrupedPawBones).values()];
      expect(lowestSurface(realized, pose)).toBeGreaterThanOrEqual(-tolerance);
      expect(Math.min(...paws)).toBeLessThanOrEqual(tolerance);
    }
  });

  it.each(['L', 'R'] as const)('falls from its idle pose onto its %s side and lies grounded there', (side) => {
    const realized = realizedFor(7);
    const rest = critterIdlePose(realized, stanceFor(7));
    const start = bonePoints(realized, critterDeathPose(realized, rest, 0, side));
    bonePoints(realized, rest).forEach((value, k) => expect(start[k]).toBeCloseTo(value, 9));
    const dead = critterDeathPose(realized, rest, CRITTER_DEATH_SECONDS, side);
    const other = side === 'L' ? 'R' : 'L';
    expect(sideHeight(realized, dead, other)).toBeGreaterThan(
      sideHeight(realized, dead, side) + 0.3 * generate(critterTemplate, 7).params.height!,
    );
    expect(Math.abs(lowestSurface(realized, dead))).toBeLessThanOrEqual(realized.voxels.size);
  });
});
