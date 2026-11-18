// Clip frames, as a clip stores them: sampling a clip and decoding a frame into matrices. Loaded as is by the browser
// and by Node, because the browser cannot reach tools/actorCompose.mjs (mobgen TypeScript, Jsonnet source). That
// module re-exports it. Nothing here imports three.js, so the decode path stays free of the renderer.
import { quatToMat3 } from './kinematics.mjs';

/** A finite clip carries exactly one span key, named for the clock its caller samples it on; never guess. */
export function clipSpanSeconds(clip) {
  if ((clip.durationSimSeconds === undefined) === (clip.durationRealSeconds === undefined)) {
    throw new RangeError('finite clip must carry exactly one of durationSimSeconds or durationRealSeconds');
  }
  return clip.durationSimSeconds ?? clip.durationRealSeconds;
}

// How a clip moves between two key frames, by the weight of the later one. Minimum jerk is how a practised hand moves
// from one place to the next: from rest to rest, fastest midway. A blow does not stop where it lands: it speeds up into
// the hit from rest (`ease-in`) and slows to rest after it (`ease-out`), each leaving or meeting the other at speed.
export const EASINGS = {
  'minimum-jerk': (w) => w * w * w * (10 - 15 * w + 6 * w * w),
  'ease-in': (w) => w * w,
  'ease-out': (w) => w * (2 - w),
};

// The easing of the move from key frame `i`: one named for every move, or a list naming each move's own.
export function easingOf(easing, i) {
  const name = Array.isArray(easing) ? easing[i] : easing;
  if (name === undefined) return (w) => w;
  const ease = EASINGS[name];
  if (!ease) throw new RangeError(`clip easing ${name} is none of ${Object.keys(EASINGS).join(', ')}`);
  return ease;
}

/**
 * The two stored frames a cursor falls between, `i` and `j`, and the weight `w` of `j`, so what rides along with a
 * clip's frames is blended at the same place as the frames. Frames stand evenly through the span unless the clip
 * states each one's place, `keyPhases` (0 for the first, rising, and 1 for the last of a finite clip); a loop's last
 * frame moves on to its first over the rest of the span. `easing` names how it moves between them, evenly if unnamed,
 * or lists a name for each move in turn.
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
  const phase = clip.loop ? ((cursor % 1) + 1) % 1 : Math.max(0, Math.min(1, cursor / clipSpanSeconds(clip)));
  const i = phases.findLastIndex((at) => at <= phase);
  if (!clip.loop && i === count - 1) return { i, j: i, w: 0 };
  const j = (i + 1) % count;
  const end = j === 0 ? 1 : phases[j];
  return { i, j, w: easingOf(clip.easing, i)((phase - phases[i]) / (end - phases[i])) };
}

/**
 * The unit quaternion `weight` of the way from `a` to `b` along the shorter arc, as [x, y, z, w]. Nearly parallel
 * quaternions are lerped and normalised, because the spherical weights divide by a sine that vanishes there.
 */
export function slerp(a, b, weight) {
  let [bx, by, bz, bw] = b;
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cos < 0) {
    cos = -cos;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  if (cos > 0.9995) {
    const x = a[0] + (bx - a[0]) * weight, y = a[1] + (by - a[1]) * weight;
    const z = a[2] + (bz - a[2]) * weight, w = a[3] + (bw - a[3]) * weight;
    const n = Math.hypot(x, y, z, w) || 1;
    return [x / n, y / n, z / n, w / n];
  }
  const half = Math.acos(cos);
  const sin = Math.sin(half);
  const wa = Math.sin((1 - weight) * half) / sin;
  const wb = Math.sin(weight * half) / sin;
  return [a[0] * wa + bx * wb, a[1] * wa + by * wb, a[2] * wa + bz * wb, a[3] * wa + bw * wb];
}

/** Returns a stored frame unchanged at exact frame cursors, including finite endpoints; rotations blend with `slerpRotation`. */
export function sampleClip(clip, cursor, slerpRotation = slerp) {
  const { i, j, w } = clipKeys(clip, cursor);
  const a = clip.frames[i];
  if (w === 0) return a;
  const b = clip.frames[j];
  const ids = new Set([...Object.keys(a.rotations), ...Object.keys(b.rotations)]);
  return {
    root: a.root.map((x, axis) => x + (b.root[axis] - x) * w),
    rotations: Object.fromEntries([...ids].map((id) => [id, slerpRotation(a.rotations[id] ?? [0, 0, 0, 1], b.rotations[id] ?? [0, 0, 0, 1], w)])),
  };
}

export const decodeFrame = (frame) => ({
  root: [...frame.root],
  rotations: Object.fromEntries(Object.entries(frame.rotations).map(([id, q]) => [id, quatToMat3(q)])),
});
