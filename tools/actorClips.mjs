import { mat3ToQuat } from './packages/mobgen/src/core/math.ts';
import { createGaitCache, footRestExtents, IDLE_BLEND_SPEED_MPS, walkPose } from './packages/mobgen/src/mob/gait.ts';
import { idleBasePose, idleMotion } from './packages/mobgen/src/mob/idle.ts';
import { crawlGaitPose, crawlHitAngles, CRAWL_HIT_PEAK_FRACTION } from './packages/mobgen/src/mob/crawl.ts';
import { ARM_BONES, attackClipFor, attackOverlayFrame } from './packages/mobgen/src/mob/attack.ts';
import { HIT_FLINCH, flinchClipFor } from './packages/mobgen/src/mob/reactions.ts';
import { consumableTemplate } from './packages/mobgen/src/core/template.ts';

/** Absolute local rotations, without a coordinate conversion or precision reduction. */
export const poseFrame = (pose) => ({
  root: [...pose.root],
  rotations: Object.fromEntries(Object.entries(pose.rotations).map(([id, rotation]) => [id, mat3ToQuat(rotation)])),
});

/** Loop cursors are normalized; finite cursors are seconds. One frame is a static pose. */
export function poseClip(at, { frames, loop, duration, period, cycles, ...metadata }) {
  if (!Number.isInteger(frames) || frames < 1) throw new RangeError('frames must be a positive integer');
  if (typeof loop !== 'boolean') throw new TypeError('loop must be explicit');
  const span = period ?? duration ?? 1;
  if (!(Number.isFinite(span) && span > 0)) throw new RangeError('clip span must be positive and finite');
  const clip = { kind: 'pose', loop, ...metadata };
  if (duration !== undefined) clip.duration = duration;
  if (period !== undefined) clip.period = period;
  if (cycles !== undefined) clip.cycles = cycles;
  clip.frames = Array.from({ length: frames }, (_, i) => poseFrame(at(frames === 1 ? 0 : span * i / (loop ? frames : frames - 1))));
  return clip;
}

/** Both locomotion sets use the same figure, including injured crawling on a standing rig. */
export function humanoidPoseClips(figure, row) {
  if (!(Number.isInteger(row.walkCycles) && row.walkCycles > 0)) throw new RangeError('walkCycles must be a positive integer');
  const actor = {
    bones: figure.realized.body.bones,
    extents: footRestExtents(figure.realized.body.bones, figure.realized.voxels),
    params: figure.genome.params, seed: figure.seed,
    cache: createGaitCache(), planPeriodSteps: 2 * row.walkCycles,
  };
  const crawling = {
    idle: poseClip(() => crawlGaitPose(figure.realized, 0, 0), { frames: 1, loop: false }),
    walk: poseClip((cursor) => crawlGaitPose(figure.realized, cursor * 2 * Math.PI, row.walk_speed), { frames: row.walk_frames, loop: true, cycles: 1 }),
  };
  if (row.legCut !== undefined) return { crawling };
  const standing = {
    idle: Object.fromEntries(['slack', 'aggravated'].map((stance) => [stance, {
      base: poseFrame(idleBasePose(actor, stance)), motion: idleMotion(stance),
    }])),
    walk: poseClip((cursor) => {
      const steps = cursor * 2 * row.walkCycles;
      return walkPose(actor, { stepIndex: Math.floor(steps), progress: steps % 1 }, row.walk_speed);
    }, { frames: row.walk_frames, loop: true, cycles: row.walkCycles, idleBlendSpeed: IDLE_BLEND_SPEED_MPS }),
  };
  return { standing, crawling };
}

/** Endpoint-inclusive action frames are independent of their eventual live base. */
export function humanoidClips(figure, template, row) {
  const sets = humanoidPoseClips(figure, { ...row, legCut: template.legCut });
  const actor = {
    bones: figure.realized.body.bones,
    extents: footRestExtents(figure.realized.body.bones, figure.realized.voxels),
    params: figure.genome.params, seed: figure.seed,
  };
  if (!(Number.isInteger(row.attack_frames) && row.attack_frames >= 2)) throw new RangeError('attack_frames must be at least two');
  const overlay = (clip, flinch, crawling) => ({
    kind: 'overlay', duration: clip.duration,
    ...(flinch ? { peak: clip.keys[1].t } : { hitTime: clip.hitTime }),
    sideScalesZ: flinch, walkBlendBones: [...ARM_BONES],
    frames: Array.from({ length: row.attack_frames }, (_, i) => {
      const frame = attackOverlayFrame(actor, clip, clip.duration * i / (row.attack_frames - 1));
      return crawling ? { ...frame, dropMetres: 0 } : frame;
    }),
  });
  if (sets.standing) {
    sets.standing.attack = overlay(attackClipFor(template), false, false);
    sets.standing.flinch = overlay(flinchClipFor(template), true, false);
  }
  sets.crawling.attack = overlay(attackClipFor(consumableTemplate('legless-humanoid')), false, true);
  sets.crawling.flinch = {
    kind: 'overlay', duration: HIT_FLINCH.duration, peak: HIT_FLINCH.duration * CRAWL_HIT_PEAK_FRACTION,
    sideScalesZ: true, walkBlendBones: [],
    frames: Array.from({ length: row.attack_frames }, (_, i) => ({
      angles: crawlHitAngles(HIT_FLINCH.duration * i / (row.attack_frames - 1)), walkBlendWeight: 1, dropMetres: 0,
    })),
  };
  return sets;
}
