// @ts-check
/** @import { Figure } from './actorFigure.mjs' */
/** @import { MobRow } from './layout.mjs' */
/** @import { Template } from './packages/mobgen/src/core/template.ts' */
import { fusedFigure, realizedRegionBones } from './actorFigure.mjs';
import { planOf } from './packages/mobgen/src/core/generate.ts';
import { hullCentersByBone } from './packages/mobgen/src/core/voxelBounds.ts';
import { acidTemplate } from './packages/mobgen/src/mob/acidTemplate.ts';
import { attackClipFor } from './packages/mobgen/src/mob/attack.ts';
import { GROUND_CONTACT_BONES } from './packages/mobgen/src/mob/crawl.ts';
import { burstBones } from './packages/mobgen/src/mob/dismember.ts';
import { footRestExtents } from './packages/mobgen/src/mob/gait.ts';
import { flinchClipFor, HIT_FLINCH } from './packages/mobgen/src/mob/reactions.ts';

// All owned cells serve mass/reach; hull candidates serve only ground fitting.
/**
 * @param {Pick<Figure, 'realized' | 'voxelCentersByBone'>} figure
 * @param {Pick<Template, 'bodyMassKg' | 'massFractions'>} template
 */
export const bodyGeometry = (figure, template) => {
  const hulls = hullCentersByBone(figure.realized);
  return {
    voxelSize: figure.realized.voxels.size,
    bones: figure.realized.body.bones.map(({ id, parent, head, tail, frame, limits, disposition }) => ({
      id,
      parent,
      head,
      tail,
      ...(frame === undefined ? {} : { frame }),
      ...(limits === undefined ? {} : { limits }),
      ...(disposition === undefined ? {} : { disposition }),
      ...(figure.voxelCentersByBone.has(id) ? { voxels: figure.voxelCentersByBone.get(id), hull: hulls.get(id) } : {}),
    })),
    bodyMassKg: template.bodyMassKg,
    ...(template.massFractions === undefined ? {} : { massFractions: template.massFractions }),
  };
};

/** @param {Template} template */
const humanoidAnimation = (template) => {
  const attack = attackClipFor(template);
  return {
    attackPeakAtSimSeconds: attack.hitTime,
    attackDurationSimSeconds: attack.duration,
    hitDurationSimSeconds: template.legCut === undefined ? flinchClipFor(template).duration : HIT_FLINCH.duration,
  };
};

// A fused mass has no clips; it flinches by its whole body, as far as the flinch's peak turns a chest.
const fusedFlinch = () => {
  const peak = HIT_FLINCH.keys[1];
  const chest = peak?.rotations.chest;
  if (!peak || !chest) throw new Error('the hit flinch needs a peak key that turns the chest');
  return { peakAtSimSeconds: peak.t, durationSimSeconds: HIT_FLINCH.duration, pitch: chest[0], roll: chest[2] };
};

/**
 * Figure metadata in the generator's rest-world frame, turned on export (tools/actorFrame.mjs); scale is carried, not applied.
 * @param {Figure} figure
 * @param {Template} template
 * @param {{ type: string; model: string; seed: number; scale: number; lookAt: MobRow['lookAt'] }} row
 */
export function actorBody(figure, template, { type, model, seed, scale, lookAt }) {
  if (!(Number.isFinite(scale) && scale > 0)) throw new RangeError('actor scale must be positive and finite');
  const { bones, anchors } = figure.realized.body;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const mesh of figure.realized.meshes.values()) {
    mesh.positions.forEach((y, index) => {
      if (index % 3 !== 1) return;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
  }
  const fused = template.bodyPlan === 'fused-mass';
  const humanoid = template.bodyPlan === 'humanoid';
  const acid = template.bodyPlan === 'acid';
  const mass = fused ? fusedFigure(figure) : undefined;
  const boneIds = new Set(bones.map((bone) => bone.id));
  const regions = figure.regions ?? realizedRegionBones(planOf(template.bodyPlan).regionBones, boneIds);
  return {
    type,
    model,
    seed,
    bodyPlan: template.bodyPlan,
    ...(template.legCut === undefined ? {} : { legCut: template.legCut }),
    scale,
    height: maxY - minY,
    ...bodyGeometry(figure, template),
    anchors: anchors ?? {},
    ...(regions === undefined ? {} : { regions, boxes: figure.boxes, severableParts: figure.severableParts }),
    burstBones: burstBones(bones),
    extents: Object.fromEntries(footRestExtents(bones, figure.realized.voxels)),
    ...(humanoid ? { groundContactBones: GROUND_CONTACT_BONES.filter((id) => boneIds.has(id)) } : {}),
    ...(lookAt === undefined ? {} : { lookAt }),
    ...(mass
      ? {
          manifest: mass.manifest,
          bounds: mass.bounds,
          originOffset: mass.originOffset,
          coreInteriorPoint: mass.coreInteriorPoint,
          restStrikeOrigin: mass.restStrikeOrigin,
          cells: {
            size: figure.realized.voxels.size,
            origin: figure.realized.voxels.origin,
            dims: figure.realized.voxels.dims,
            filled: Array.from(figure.realized.voxels.owner).flatMap((owner, index) => (owner ? [[index, owner]] : [])),
          },
        }
      : {}),
    animation: fused
      ? { flinch: fusedFlinch() }
      : acid
        ? {
            attackPeakAtSimSeconds: acidTemplate.animation.attackPeak,
            attackDurationSimSeconds: acidTemplate.animation.attackDuration,
            hitDurationSimSeconds: acidTemplate.animation.hitDuration,
            deathDurationRealSeconds: acidTemplate.animation.deathDuration,
          }
        : humanoid
          ? humanoidAnimation(template)
          : {},
  };
}
