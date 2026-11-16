import { type MassProperties, massProperties, type Tensor3 } from './massProperties.ts';
import type { Template } from './template.ts';
import type { Voxels } from './voxelize.ts';

export interface TemplatePartMassProperties extends MassProperties {
  readonly fraction: number;
}

/** A part already cut away from below the part being weighed: its id and its bones. */
export interface GonePart {
  readonly part: string;
  readonly boneIndices: Iterable<number>;
}

/** Inputs for assigning a template's nominal body mass to a voxel subset. */
export interface TemplatePartMassInput {
  readonly voxels: Voxels;
  readonly partBoneIndices: Iterable<number>;
  readonly bodyBoneIndices: Iterable<number>;
  readonly voxelSize: number;
  readonly template: Pick<Template, 'bodyMassKg' | 'massFractions'>;
  readonly part: string;
  /** Parts below `part` already cut away, whose bones are among `partBoneIndices`. */
  readonly without?: readonly GonePart[];
}

/** Assign a template's nominal body mass to a voxel subset while retaining its voxel-derived COM and
 * inertia shape. Overrides are keyed by part id; otherwise the fraction is the subset's body-volume share.
 * Each part in `without` takes its own share and its voxels away, since it already left as a part of its own
 * and the body's mass must not be counted twice. */
export const templatePartMassProperties = ({
  voxels,
  partBoneIndices,
  bodyBoneIndices,
  voxelSize,
  template,
  part,
  without = [],
}: TemplatePartMassInput): TemplatePartMassProperties => {
  if (!(template.bodyMassKg > 0 && Number.isFinite(template.bodyMassKg))) {
    throw new RangeError('bodyMassKg must be positive and finite');
  }
  const bodyMass = massProperties(voxels, bodyBoneIndices, voxelSize).mass;
  const shareOf = (id: string, indices: readonly number[]): number => {
    const fraction = template.massFractions?.[id] ?? massProperties(voxels, indices, voxelSize).mass / bodyMass;
    if (!(fraction > 0 && fraction <= 1 && Number.isFinite(fraction))) {
      throw new RangeError(`mass fraction for ${id} must be in (0, 1]`);
    }
    return fraction;
  };
  const whole = [...partBoneIndices];
  const gone = without.map(({ part: id, boneIndices }) => ({ id, indices: [...boneIndices] }));
  const goneBones = new Set(gone.flatMap(({ indices }) => indices));
  const fraction = gone.reduce((share, { id, indices }) => share - shareOf(id, indices), shareOf(part, whole));
  if (!(fraction > 0)) {
    throw new RangeError(`mass fraction for ${part} must stay positive without the parts cut below it`);
  }
  const partProperties = massProperties(
    voxels,
    whole.filter((index) => !goneBones.has(index)),
    voxelSize,
  );
  const mass = template.bodyMassKg * fraction;
  const scale = mass / partProperties.mass;
  const inertia: Tensor3 = partProperties.inertia.map((row) => row.map((value) => value * scale)) as unknown as Tensor3;
  return { mass, center: partProperties.center, inertia, fraction };
};
