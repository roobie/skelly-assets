import { mat3ToQuat } from './packages/mobgen/src/core/math.ts';

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
