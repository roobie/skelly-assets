// Clip frames, as a clip stores them: sampling a clip and decoding a frame into matrices. Loaded as is by the browser
// and by Node, because the browser cannot reach tools/actorCompose.mjs (mobgen TypeScript, Jsonnet source). That
// module wraps sampleClip with mobgen's slerp and re-exports the rest.
import { quatToMat3 } from './kinematics.mjs';

/** A finite clip carries exactly one span key, named for the clock its caller samples it on; never guess. */
export function clipSpanSeconds(clip) {
  if ((clip.durationSimSeconds === undefined) === (clip.durationRealSeconds === undefined)) {
    throw new RangeError('finite clip must carry exactly one of durationSimSeconds or durationRealSeconds');
  }
  return clip.durationSimSeconds ?? clip.durationRealSeconds;
}

/**
 * The two stored frames a cursor falls between, `i` and `j`, and the weight `w` of `j`, so what rides along with a
 * clip's frames is blended at the same place as the frames.
 */
export function clipKeys(clip, cursor) {
  const count = clip.frames.length;
  if (!count) throw new RangeError('clip has no frames');
  if (count === 1) return { i: 0, j: 0, w: 0 };
  const u = clip.loop
    ? (((cursor % 1) + 1) % 1) * count
    : Math.max(0, Math.min(1, cursor / clipSpanSeconds(clip))) * (count - 1);
  const i = Math.floor(u);
  return { i, j: (i + 1) % count, w: u - i };
}

/**
 * Returns a stored frame unchanged at exact frame cursors, including finite endpoints. The caller supplies `slerp`
 * (quaternion a, quaternion b, weight) because the browser interpolates with three.js and Node with mobgen.
 */
export function sampleClip(clip, cursor, slerp) {
  const { i, j, w } = clipKeys(clip, cursor);
  const a = clip.frames[i];
  if (w === 0) return a;
  const b = clip.frames[j];
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
