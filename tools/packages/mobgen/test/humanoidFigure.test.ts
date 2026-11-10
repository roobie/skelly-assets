import { describe, expect, it } from 'vitest';
import type { Body } from '../src/core/body.ts';
import { registerBodyPlan } from '../src/core/generate.ts';
import { registerTemplate, type Template } from '../src/core/template.ts';
import { cellIndex, worldPosition } from '../src/core/voxelize.ts';
import {
  type BoneVoxelBox,
  type HumanoidFigure,
  type HumanoidHitRegion,
  humanoidFigure,
  templateFigure,
} from '../src/mob/humanoidFigure.ts';

// Fixture seeds: Deadvox authors the shipped pool, and its own tests check those.
const FIXTURE_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

// One cheap bone whose budget rejects every odd seed, so an odd seed's next seed is valid: a figure
// that fell through to the next valid seed would return that body instead of refusing.
const VALID_SEED = 2;
const alternatingTemplate: Template = {
  name: 'fixture-alternating-validity',
  bodyPlan: 'fixture-alternating-validity',
  description: 'fixture',
  voxelSize: 0.05,
  bodyMassKg: 1,
  params: {},
  supportBones: ['spine'],
  materials: { flesh: { color: [0.5, 0.5, 0.5], emissive: 0 }, bone: { color: [1, 1, 1], emissive: 0 } },
  budgets: {
    totalVoxels: { min: 1, max: Number.POSITIVE_INFINITY },
    totalTriangles: { min: 0, max: Number.POSITIVE_INFINITY },
    groups: {},
  },
};
const alternatingBody: Body = {
  bones: [{ id: 'spine', parent: null, head: [0, 0, 0], tail: [0, 0.2, 0] }],
  features: [
    {
      bone: 'spine',
      op: 'add',
      material: 'flesh',
      shape: { kind: 'capsule', a: [0, 0.06, 0], b: [0, 0.2, 0], ra: 0.06, rb: 0.06 },
    },
  ],
  materials: alternatingTemplate.materials,
};
registerBodyPlan(alternatingTemplate.bodyPlan, {
  sample: () => ({ params: {}, wounds: [] }),
  build: () => alternatingBody,
  paramOrder: [],
  woundBones: [],
  budgets: (genome, template) =>
    genome.seed % 2 === 0
      ? template.budgets
      : { ...template.budgets, totalVoxels: { min: Number.POSITIVE_INFINITY, max: Number.POSITIVE_INFINITY } },
  limbBones: [],
  regionBones: { head: [], torso: ['spine'], leftArm: [], rightArm: [], leftLeg: [], rightLeg: [] },
});
registerTemplate(alternatingTemplate);

const REGION_BONES: Readonly<Record<HumanoidHitRegion, readonly string[]>> = {
  head: ['head', 'jaw'],
  torso: ['pelvis', 'spine', 'chest', 'neck'],
  leftArm: ['upperArm.L', 'forearm.L', 'hand.L'],
  rightArm: ['upperArm.R', 'forearm.R', 'hand.R'],
  leftLeg: ['thigh.L', 'shin.L', 'foot.L'],
  rightLeg: ['thigh.R', 'shin.R', 'foot.R'],
};

const regionBoneErrors = (figure: HumanoidFigure): string[] => {
  const errors: string[] = [];
  for (const [region, bones] of Object.entries(REGION_BONES) as [HumanoidHitRegion, readonly string[]][]) {
    for (const bone of bones) {
      if (!(figure.boxes[region].some((box) => box.bone === bone) && figure.voxelCentersByBone.get(bone)?.length)) {
        errors.push(`${region}/${bone} missing voxel bounds`);
      }
    }
  }
  return errors;
};

const voxelOutsideBox = (point: readonly number[], box: BoneVoxelBox) =>
  point.some((coordinate, axis) => Math.abs(coordinate - box.center[axis]!) > box.halfSize[axis]! + 1e-9);

const voxelContainmentErrors = (figure: HumanoidFigure): string[] => {
  const errors: string[] = [];
  const boneToBox = new Map(
    Object.values(figure.boxes)
      .flat()
      .map((box) => [box.bone, box]),
  );
  const { voxels } = figure.realized;
  for (let k = 0; k < voxels.dims[2]; k++) {
    for (let j = 0; j < voxels.dims[1]; j++) {
      for (let i = 0; i < voxels.dims[0]; i++) {
        const owner = voxels.owner[cellIndex(voxels.dims, i, j, k)]! - 1;
        if (owner < 0) {
          continue;
        }
        const bone = figure.realized.body.bones[owner]!.id;
        const box = boneToBox.get(bone)!;
        const point = worldPosition(voxels, i, j, k);
        if (voxelOutsideBox(point, box)) {
          errors.push(`${figure.seed}/${bone} voxel outside bounds`);
        }
      }
    }
  }
  return errors;
};

describe('shared humanoid hit-region figures', () => {
  it('realizes valid figures and caches tight per-bone rest boxes', () => {
    for (const seed of FIXTURE_SEEDS) {
      const figure = humanoidFigure(seed);
      expect(figure.genome.seed).toBe(seed);
      expect(humanoidFigure(seed)).toBe(figure);
      expect(regionBoneErrors(figure)).toEqual([]);
      expect(voxelContainmentErrors(figure)).toEqual([]);
    }
  });

  it('never draws one seed as another seed: a model refuses a seed that is not valid itself', () => {
    expect(templateFigure(alternatingTemplate.name, VALID_SEED).genome.seed).toBe(VALID_SEED);
    expect(() => templateFigure(alternatingTemplate.name, VALID_SEED - 1)).toThrowError('not valid');
  });
});
