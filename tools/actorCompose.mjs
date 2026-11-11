// Assets-side twin of the generator-free actor clip reader.
import { sampleClip as sampleFrames } from '../site/clipFrames.mjs';
import { applyPoint, IDENTITY_M, mulMM, rotX, rotY, rotZ, slerpQuat } from './packages/mobgen/src/core/math.ts';
import { clampJointAngles, jointAngles, jointRotation } from './packages/mobgen/src/core/joints.ts';
import { clamp, transpose } from './packages/mobgen/src/core/math.ts';
import { boneTransforms } from './packages/mobgen/src/core/pose.ts';
import { blendArmBase, eulerToMat3 } from './packages/mobgen/src/mob/attack.ts';
import { groundOffset, GROUND_SMOOTHING } from './packages/mobgen/src/mob/gait.ts';

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

/** Overlay angles interpolate linearly; at stored cursors no values are rebuilt. */
export function sampleOverlay(clip, time) {
  const u = Math.max(0, Math.min(1, time / clip.durationSimSeconds)) * (clip.frames.length - 1);
  const i = Math.floor(u);
  const w = u - i;
  const a = clip.frames[i];
  if (w === 0) return a;
  const b = clip.frames[i + 1];
  const ids = new Set([...Object.keys(a.angles), ...Object.keys(b.angles)]);
  return {
    angles: Object.fromEntries([...ids].map((id) => [id, [0, 1, 2].map((axis) => {
      const x = a.angles[id]?.[axis] ?? 0;
      return x + ((b.angles[id]?.[axis] ?? 0) - x) * w;
    })])),
    walkBlendWeight: a.walkBlendWeight + (b.walkBlendWeight - a.walkBlendWeight) * w,
    dropMetres: a.dropMetres + (b.dropMetres - a.dropMetres) * w,
  };
}

export function applyOverlay(body, base, clip, time, side, stance) {
  const frame = sampleOverlay(clip, time);
  const rotations = { ...base.rotations };
  const blendBones = new Set(clip.walkBlendBones);
  for (const [id, [x, y, z]] of Object.entries(frame.angles)) {
    const baseR = base.rotations[id] ?? IDENTITY_M;
    rotations[id] = mulMM(blendBones.has(id) ? blendArmBase(baseR, frame.walkBlendWeight) : baseR,
      eulerToMat3([x, y, z * (clip.sideScalesZ ? side : 1)]));
  }
  const probe = { root: [base.root[0], 0, base.root[2]], rotations };
  const offset = stance === 'crawling'
    ? -groundFit(body, probe, body.groundContactBones).lowest
    : groundOffset(body.bones, new Map(Object.entries(body.extents)), rotations, GROUND_SMOOTHING);
  return { root: [base.root[0], offset - frame.dropMetres, base.root[2]], rotations };
}

/** Joint deltas are weighted before clamping; sole correction follows the articulated FK. */
export function applyJointDelta(body, base, clip, cursor, { speed = 0, side = 0 } = {}) {
  if (clip.speedWeight && speed <= 0) return base;
  const count = clip.frames.length;
  const u = clip.cursor === 'gaitPhase'
    ? (((cursor / (2 * Math.PI) % 1) + 1) % 1) * count
    : clamp(cursor / (clip.durationSimSeconds ?? 1), 0, 1) * (count - 1);
  const i = Math.floor(u);
  const w = u - i;
  const a = clip.frames[i].angles;
  const b = clip.frames[(i + 1) % count].angles;
  const rotations = { ...base.rotations };
  const bones = new Map(body.bones.map((bone) => [bone.id, bone]));
  const weight = clip.speedWeight ? clamp(speed, 0, 1) : 1;
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const bone = bones.get(id);
    if (!bone) throw new Error(`missing joint delta bone ${id}`);
    const old = jointAngles(bone, rotations[id] ?? IDENTITY_M);
    const angles = old.map((value, axis) => {
      const x = a[id]?.[axis] ?? 0;
      const delta = x + ((b[id]?.[axis] ?? 0) - x) * w;
      return value + delta * weight * (axis === 2 && clip.sideScalesZ ? clamp(side, -1, 1) : 1);
    });
    rotations[id] = jointRotation(bone, clampJointAngles(bone, angles));
  }
  if (clip.footSoleHold) {
    const transforms = boneTransforms(body.bones, { ...base, rotations });
    for (const id of ['foot.L', 'foot.R']) {
      const foot = bones.get(id);
      const correction = transpose(transforms.get(foot.parent).r);
      rotations[id] = jointRotation(foot, clampJointAngles(foot, jointAngles(foot, correction)));
    }
  }
  const pose = { root: [...base.root], rotations };
  pose.root[1] -= groundFit(body, pose, body.bones.map((bone) => bone.id)).lowest;
  return pose;
}

const phaseFor = (seed, salt) => {
  const h = Math.sin(seed * 12.9898 + salt * 78.233) * 43_758.5453;
  return (h - Math.floor(h)) * 2 * Math.PI;
};

/** Each oscillator right-multiplies in content order; no stance or bone tuning lives here. */
export function applyMotion(base, motion, time, seed) {
  const rotations = { ...base.rotations };
  const axes = { x: rotX, y: rotY, z: rotZ };
  for (const oscillator of motion) {
    const angle = Math.sin(2 * Math.PI * time / oscillator.periodSimSeconds + phaseFor(seed, oscillator.salt)) * oscillator.amplitudeDeg;
    for (const { bone, axis, scale } of oscillator.bones) rotations[bone] = mulMM(rotations[bone] ?? IDENTITY_M, axes[axis](angle * scale));
  }
  return { root: [...base.root], rotations };
}

export { decodeFrame } from '../site/clipFrames.mjs';

export const sampleClip = (clip, cursor) => sampleFrames(clip, cursor, slerpQuat);
