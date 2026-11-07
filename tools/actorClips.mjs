import { mat3ToQuat } from './packages/mobgen/src/core/math.ts';
import { createGaitCache, footRestExtents, IDLE_BLEND_SPEED_MPS, walkPose } from './packages/mobgen/src/mob/gait.ts';
import { idleBasePose, idleMotion } from './packages/mobgen/src/mob/idle.ts';
import { crawlGaitPose } from './packages/mobgen/src/mob/crawl.ts';

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
