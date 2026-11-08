import { planOf } from './packages/mobgen/src/core/generate.ts';
import { realizedRegionBones } from './actorFigure.mjs';
import { burstBones } from './packages/mobgen/src/mob/dismember.ts';
import { footRestExtents } from './packages/mobgen/src/mob/gait.ts';
import { GROUND_CONTACT_BONES } from './packages/mobgen/src/mob/crawl.ts';
import { attackClipFor } from './packages/mobgen/src/mob/attack.ts';
import { HIT_FLINCH, flinchClipFor } from './packages/mobgen/src/mob/reactions.ts';
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

/** Figure metadata stays in the generator's rest-world frame; scale is carried, not applied. */
export function actorBody(figure, template, { type, model, seed, scale, lookAt }) {
  if (!(Number.isFinite(scale) && scale > 0)) throw new RangeError('actor scale must be positive and finite');
  const { bones, anchors } = figure.realized.body;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const mesh of figure.realized.meshes.values()) {
    for (let i = 1; i < mesh.positions.length; i += 3) {
      minY = Math.min(minY, mesh.positions[i]);
      maxY = Math.max(maxY, mesh.positions[i]);
    }
  }
  const fused = template.bodyPlan === 'fused-mass';
  const humanoid = template.bodyPlan === 'humanoid';
  const acid = template.bodyPlan === 'acid';
  const attack = humanoid ? attackClipFor(template) : undefined;
  const peak = HIT_FLINCH.keys[1];
  const boneIds = new Set(bones.map((bone) => bone.id));
  const regions = figure.regions ?? realizedRegionBones(planOf(template.bodyPlan).regionBones, boneIds);
  return {
    type, model, seed, bodyPlan: template.bodyPlan,
    ...(template.legCut === undefined ? {} : { legCut: template.legCut }),
    scale, height: maxY - minY,
    ...bodyGeometry(figure, template),
    anchors: anchors ?? {},
    ...(regions === undefined ? {} : { regions, boxes: figure.boxes, severableParts: figure.severableParts }),
    burstBones: burstBones(bones),
    extents: Object.fromEntries(footRestExtents(bones, figure.realized.voxels)),
    ...(humanoid ? { groundContactBones: GROUND_CONTACT_BONES.filter((id) => boneIds.has(id)) } : {}),
    ...(lookAt === undefined ? {} : { lookAt }),
    ...(fused ? {
      manifest: figure.manifest, bounds: figure.bounds, originOffset: figure.originOffset,
      coreInteriorPoint: figure.coreInteriorPoint, restStrikeOrigin: figure.restStrikeOrigin,
      cells: {
        size: figure.realized.voxels.size, origin: figure.realized.voxels.origin, dims: figure.realized.voxels.dims,
        filled: Array.from(figure.realized.voxels.owner).flatMap((owner, index) => owner ? [[index, owner]] : []),
      },
    } : {}),
    animation: fused ? {
      flinch: { peak: peak.t, duration: HIT_FLINCH.duration, pitch: peak.rotations.chest[0], roll: peak.rotations.chest[2] },
    } : acid ? {
      attackPeak: template.animation.attackPeak,
      attackDuration: template.animation.attackDuration,
      hitDuration: template.animation.hitDuration,
      deathDuration: template.animation.deathDuration,
    } : humanoid ? {
      attackPeak: attack.hitTime,
      attackDuration: attack.duration,
      hitDuration: template.legCut === undefined ? flinchClipFor(template).duration : HIT_FLINCH.duration,
    } : {}, 
  };
}
