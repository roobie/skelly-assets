import { hullCentersByBone } from './packages/mobgen/src/core/voxelBounds.ts';

// All owned cells serve mass/reach; hull candidates serve only ground fitting.
export const bodyGeometry = (figure, template) => {
  const hulls = hullCentersByBone(figure.realized);
  return {
    voxelSize: figure.realized.voxels.size,
    bones: figure.realized.body.bones.map(({ id, parent, head, tail, frame, limits, disposition }) => ({
      id, parent, head, tail,
      ...(frame === undefined ? {} : { frame }),
      ...(limits === undefined ? {} : { limits }),
      ...(disposition === undefined ? {} : { disposition }),
      ...(figure.voxelCentersByBone.has(id) ? { voxels: figure.voxelCentersByBone.get(id), hull: hulls.get(id) } : {}),
    })),
    bodyMassKg: template.bodyMassKg,
    ...(template.massFractions === undefined ? {} : { massFractions: template.massFractions }),
  };
};
