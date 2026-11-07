// Assets-side twin of the generator-free actor clip reader.
import { applyPoint, quatToMat3, slerpQuat } from './packages/mobgen/src/core/math.ts';
import { boneTransforms } from './packages/mobgen/src/core/pose.ts';

/** Simulation ground geometry comes only from the serialized body, never the GLB. */
export function groundFit(body, pose, boneIds) {
  const transforms = boneTransforms(body.bones, pose);
  const half = body.voxelSize / 2;
  const byBone = new Map();
  const bones = new Map(body.bones.map((bone) => [bone.id, bone]));
  for (const id of boneIds) {
    const transform = transforms.get(id);
    const centers = bones.get(id)?.hull;
    if (!(transform && centers)) continue;
    const verticalHalfExtent = half * (Math.abs(transform.r[3]) + Math.abs(transform.r[4]) + Math.abs(transform.r[5]));
    let lowest = Infinity;
    for (const center of centers) lowest = Math.min(lowest, applyPoint(transform, center)[1] - verticalHalfExtent);
    byBone.set(id, lowest);
  }
  return { lowest: Math.min(...byBone.values()), byBone };
}

export const decodeFrame = (frame) => ({
  root: [...frame.root],
  rotations: Object.fromEntries(Object.entries(frame.rotations).map(([id, q]) => [id, quatToMat3(q)])),
});

/** Returns a stored frame unchanged at exact frame cursors, including finite endpoints. */
export function sampleClip(clip, cursor) {
  const count = clip.frames.length;
  if (!count) throw new RangeError('clip has no frames');
  if (count === 1) return clip.frames[0];
  const u = clip.loop
    ? (((cursor % 1) + 1) % 1) * count
    : Math.max(0, Math.min(1, cursor / clip.duration)) * (count - 1);
  const i = Math.floor(u);
  const w = u - i;
  const a = clip.frames[i];
  if (w === 0) return a;
  const b = clip.frames[(i + 1) % count];
  const ids = new Set([...Object.keys(a.rotations), ...Object.keys(b.rotations)]);
  return {
    root: a.root.map((x, axis) => x + (b.root[axis] - x) * w),
    rotations: Object.fromEntries([...ids].map((id) => [id, slerpQuat(a.rotations[id] ?? [0, 0, 0, 1], b.rotations[id] ?? [0, 0, 0, 1], w)])),
  };
}
