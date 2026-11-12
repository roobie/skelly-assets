import type { Budgets } from '../core/rules.ts';
import type { Genome, ParamSpec, Template } from '../core/template.ts';

const scaledRange = (bounds: { readonly min: number; readonly max: number }, factor: number, upperCellMargin = 0) => ({
  min: Math.max(1, Math.floor(bounds.min * factor)),
  max: Math.max(1, Math.ceil(bounds.max * factor) + upperCellMargin),
});

const parameterCenter = (spec: ParamSpec | undefined, name: string): number => {
  if (spec === undefined) {
    throw new Error(`template is missing param "${name}"`);
  }
  if (typeof spec === 'number') {
    return spec;
  }
  if ('choices' in spec) {
    return spec.choices.reduce((sum, value) => sum + value, 0) / spec.choices.length;
  }
  return (spec.min + spec.max) / 2;
};

// These plans share height/head scaling; keeping it outside core lets other anatomies choose their own.
export const heightHeadBudgets = (genome: Genome, template: Template): Budgets => {
  const ratio = template.voxelSize / genome.voxelSize;
  const basis = template.budgetParams ?? template.params;
  const { height, headScale } = genome.params;
  if (height === undefined || headScale === undefined) {
    throw new Error(`genome "${genome.template}" is missing height or headScale`);
  }
  const heightRatio = height / parameterCenter(basis.height, 'height');
  const headScaleRatio = headScale / parameterCenter(basis.headScale, 'headScale');
  const volumeScale = ratio ** 3 * heightRatio ** 3;
  const headVolumeScale = volumeScale * headScaleRatio ** 3;
  const surfaceScale = ratio ** 2 * heightRatio ** 2;
  const cellMargin = ratio < 1 ? 1 : 0;
  const groups = Object.fromEntries(
    Object.entries(template.budgets.groups).map(([name, group]) => [
      name,
      { ...group, ...scaledRange(group, headVolumeScale, cellMargin) },
    ]),
  );
  return {
    totalVoxels: scaledRange(template.budgets.totalVoxels, volumeScale, cellMargin),
    totalTriangles: scaledRange(template.budgets.totalTriangles, surfaceScale),
    groups,
  };
};

/** Budgets authored at the template voxel size, for a body that keeps its size on another grid: counts
 * scale with cell volume and triangles with cell area. */
export const gridScaledBudgets = (genome: Genome, template: Template): Budgets => {
  const ratio = template.voxelSize / genome.voxelSize;
  const volume = ratio ** 3;
  const area = ratio ** 2;
  const { totalVoxels, totalTriangles, groups } = template.budgets;
  return {
    totalVoxels: { min: totalVoxels.min * volume, max: totalVoxels.max * volume },
    totalTriangles: { min: totalTriangles.min * area, max: totalTriangles.max * area },
    groups: Object.fromEntries(
      Object.entries(groups).map(([name, group]) => [
        name,
        { ...group, min: group.min * volume, max: group.max * volume },
      ]),
    ),
  };
};
