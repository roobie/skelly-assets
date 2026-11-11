// Clip frames, as a clip stores them: sampling a clip and decoding a frame into matrices. Loaded as is by the browser
// and by Node, because the browser cannot reach tools/actorCompose.mjs (mobgen TypeScript, Jsonnet source), which
// re-exports these for the games and tools that compose clips.
import { quatToMat3 } from './kinematics.mjs';

/** A finite clip carries exactly one span key, named for the clock its caller samples it on; never guess. */
export function clipSpanSeconds(clip) {
  if ((clip.durationSimSeconds === undefined) === (clip.durationRealSeconds === undefined)) {
    throw new RangeError('finite clip must carry exactly one of durationSimSeconds or durationRealSeconds');
  }
  return clip.durationSimSeconds ?? clip.durationRealSeconds;
}

/**
 * Returns a stored frame unchanged at exact frame cursors, including finite endpoints. The caller supplies `slerp`
 * (quaternion a, quaternion b, weight) because the browser interpolates with three.js and Node with mobgen.
 */
export function sampleClip(clip, cursor, slerp) {
  const count = clip.frames.length;
  if (!count) throw new RangeError('clip has no frames');
  if (count === 1) return clip.frames[0];
  const u = clip.loop
    ? (((cursor % 1) + 1) % 1) * count
    : Math.max(0, Math.min(1, cursor / clipSpanSeconds(clip))) * (count - 1);
  const i = Math.floor(u);
  const w = u - i;
  const a = clip.frames[i];
  if (w === 0) return a;
  const b = clip.frames[(i + 1) % count];
  const ids = new Set([...Object.keys(a.rotations), ...Object.keys(b.rotations)]);
  return {
    root: a.root.map((x, axis) => x + (b.root[axis] - x) * w),
    rotations: Object.fromEntries([...ids].map((id) => [id, slerp(a.rotations[id] ?? [0, 0, 0, 1], b.rotations[id] ?? [0, 0, 0, 1], w)])),
  };
}

export const decodeFrame = (frame) => ({
  root: [...frame.root],
  rotations: Object.fromEntries(Object.entries(frame.rotations).map(([id, q]) => [id, quatToMat3(q)])),
});
