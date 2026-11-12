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

// How a clip moves between two key frames, by the weight of the later one. Minimum jerk is how a practised hand moves
// from one place to the next: from rest to rest, fastest midway.
const EASINGS = { 'minimum-jerk': (w) => w * w * w * (10 - 15 * w + 6 * w * w) };

/**
 * The two stored frames a cursor falls between, `i` and `j`, and the weight `w` of `j`, so what rides along with a
 * clip's frames is blended at the same place as the frames. Frames stand evenly through the span unless the clip
 * states each one's place, `keyPhases` (0 for the first, rising, and 1 for the last of a finite clip); a loop's last
 * frame moves on to its first over the rest of the span. `easing` names how it moves between them, evenly if unnamed.
 */
export function clipKeys(clip, cursor) {
  const count = clip.frames.length;
  if (!count) throw new RangeError('clip has no frames');
  if (count === 1) return { i: 0, j: 0, w: 0 };
  const phases = clip.keyPhases ?? clip.frames.map((_, k) => k / (clip.loop ? count : count - 1));
  if (phases.length !== count || phases[0] !== 0 || phases.some((at, k) => k > 0 && !(at > phases[k - 1]))) {
    throw new RangeError(`clip key phases [${phases}] are not ${count} rising places from 0`);
  }
  if (!clip.loop && phases[count - 1] !== 1) throw new RangeError('a finite clip\'s last key phase is 1');
  const ease = clip.easing === undefined ? (w) => w : EASINGS[clip.easing];
  if (!ease) throw new RangeError(`clip easing ${clip.easing} is none of ${Object.keys(EASINGS).join(', ')}`);
  const phase = clip.loop ? ((cursor % 1) + 1) % 1 : Math.max(0, Math.min(1, cursor / clipSpanSeconds(clip)));
  const i = phases.findLastIndex((at) => at <= phase);
  if (!clip.loop && i === count - 1) return { i, j: i, w: 0 };
  const j = (i + 1) % count;
  const end = j === 0 ? 1 : phases[j];
  return { i, j, w: ease((phase - phases[i]) / (end - phases[i])) };
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
