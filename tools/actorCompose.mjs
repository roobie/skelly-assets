// @ts-check
// Assets-side twin of the generator-free actor clip reader.
/** @import { Bone } from './packages/mobgen/src/core/body.ts' */
/** @import { Vec3 } from './packages/mobgen/src/core/math.ts' */
/** @import { Pose } from './packages/mobgen/src/core/pose.ts' */
/** @import { Extent } from './packages/mobgen/src/mob/gait.ts' */
/** @import { IdleOscillator } from './packages/mobgen/src/mob/idle.ts' */
import { clampJointAngles, jointAngles, jointRotation } from './packages/mobgen/src/core/joints.ts';
import { applyPoint, clamp, IDENTITY_M, mulMM, rotX, rotY, rotZ, transpose } from './packages/mobgen/src/core/math.ts';
import { blendPose, boneTransforms } from './packages/mobgen/src/core/pose.ts';
import { blendArmBase, eulerToMat3 } from './packages/mobgen/src/mob/attack.ts';
import { GROUND_SMOOTHING, groundOffset } from './packages/mobgen/src/mob/gait.ts';

/**
 * What these read of a body file (tools/actorBody.mjs) and of the clips beside it (tools/actorClips.mjs).
 * @typedef {object} FileBody
 * @property {readonly (Bone & { readonly hull?: readonly Vec3[] })[]} bones
 * @property {number} voxelSize
 * @property {readonly string[]} [groundContactBones]
 * @property {Readonly<Record<string, Extent>>} extents
 * @property {{ readonly headBone?: string }} [lookAt]
 */
/** @typedef {Readonly<Record<string, Vec3>>} Angles joint angles in degrees by bone */
/** @typedef {{ readonly angles: Angles; readonly walkBlendWeight: number; readonly dropMetres: number }} OverlayFrame */
/**
 * @typedef {object} OverlayClip
 * @property {number} durationSimSeconds
 * @property {boolean} sideScalesZ
 * @property {readonly string[]} walkBlendBones
 * @property {readonly OverlayFrame[]} frames
 */
/**
 * @typedef {object} JointDeltaClip
 * @property {'gaitPhase' | 'time' | 'progress'} cursor
 * @property {boolean} speedWeight
 * @property {boolean} sideScalesZ
 * @property {boolean} footSoleHold
 * @property {number} [durationSimSeconds]
 * @property {readonly { readonly angles: Angles }[]} frames
 */

/**
 * @template Frame
 * @param {readonly Frame[]} frames
 * @param {number} index
 */
const frameAt = (frames, index) => {
  const frame = frames[index];
  if (frame === undefined) throw new Error(`a clip of ${frames.length} frames has no frame ${index}`);
  return frame;
};

/**
 * Simulation ground geometry comes only from the serialized body, never the GLB.
 * @param {Pick<FileBody, 'bones' | 'voxelSize'>} body
 * @param {Pose} pose
 * @param {Iterable<string>} boneIds
 */
export function groundFit(body, pose, boneIds) {
  const transforms = boneTransforms(body.bones, pose);
  const half = body.voxelSize / 2;
  /** @type {Map<string, number>} */
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

/**
 * Overlay angles interpolate linearly; at stored cursors no values are rebuilt.
 * @param {Pick<OverlayClip, 'durationSimSeconds' | 'frames'>} clip
 * @param {number} time
 * @returns {OverlayFrame}
 */
export function sampleOverlay(clip, time) {
  const u = Math.max(0, Math.min(1, time / clip.durationSimSeconds)) * (clip.frames.length - 1);
  const i = Math.floor(u);
  const w = u - i;
  const a = frameAt(clip.frames, i);
  if (w === 0) return a;
  const b = frameAt(clip.frames, i + 1);
  const ids = new Set([...Object.keys(a.angles), ...Object.keys(b.angles)]);
  /**
   * @param {string} id
   * @param {0 | 1 | 2} axis
   */
  const between = (id, axis) => {
    const x = a.angles[id]?.[axis] ?? 0;
    return x + ((b.angles[id]?.[axis] ?? 0) - x) * w;
  };
  return {
    angles: Object.fromEntries(
      [...ids].map(/** @returns {[string, Vec3]} */ (id) => [id, [between(id, 0), between(id, 1), between(id, 2)]]),
    ),
    walkBlendWeight: a.walkBlendWeight + (b.walkBlendWeight - a.walkBlendWeight) * w,
    dropMetres: a.dropMetres + (b.dropMetres - a.dropMetres) * w,
  };
}

/**
 * @param {FileBody} body
 * @param {Pose} base
 * @param {OverlayClip} clip
 * @param {number} time
 * @param {number} side
 * @param {string} stance
 * @returns {Pose}
 */
export function applyOverlay(body, base, clip, time, side, stance) {
  const frame = sampleOverlay(clip, time);
  const rotations = { ...base.rotations };
  const blendBones = new Set(clip.walkBlendBones);
  for (const [id, [x, y, z]] of Object.entries(frame.angles)) {
    const baseR = base.rotations[id] ?? IDENTITY_M;
    rotations[id] = mulMM(
      blendBones.has(id) ? blendArmBase(baseR, frame.walkBlendWeight) : baseR,
      eulerToMat3([x, y, z * (clip.sideScalesZ ? side : 1)]),
    );
  }
  /** @type {Pose} */
  const probe = { root: [base.root[0], 0, base.root[2]], rotations };
  const offset =
    stance === 'crawling'
      ? -groundFit(body, probe, groundContactBones(body)).lowest
      : groundOffset(body.bones, new Map(Object.entries(body.extents)), rotations, GROUND_SMOOTHING);
  return { root: [base.root[0], offset - frame.dropMetres, base.root[2]], rotations };
}

/** @param {FileBody} body */
const groundContactBones = (body) => {
  if (!body.groundContactBones) throw new Error('a crawling body needs groundContactBones');
  return body.groundContactBones;
};

/**
 * Joint deltas are weighted before clamping; sole correction follows the articulated FK.
 * @param {FileBody} body
 * @param {Pose} base
 * @param {JointDeltaClip} clip
 * @param {number} cursor
 * @param {{ speed?: number; side?: number }} [live]
 * @returns {Pose}
 */
export function applyJointDelta(body, base, clip, cursor, { speed = 0, side = 0 } = {}) {
  if (clip.speedWeight && speed <= 0) return base;
  const count = clip.frames.length;
  const u =
    clip.cursor === 'gaitPhase'
      ? ((((cursor / (2 * Math.PI)) % 1) + 1) % 1) * count
      : clamp(cursor / (clip.durationSimSeconds ?? 1), 0, 1) * (count - 1);
  const i = Math.floor(u);
  const w = u - i;
  const a = frameAt(clip.frames, i).angles;
  const b = frameAt(clip.frames, (i + 1) % count).angles;
  const rotations = { ...base.rotations };
  const bones = new Map(body.bones.map((bone) => [bone.id, bone]));
  const weight = clip.speedWeight ? clamp(speed, 0, 1) : 1;
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const bone = bones.get(id);
    if (!bone) throw new Error(`missing joint delta bone ${id}`);
    const old = jointAngles(bone, rotations[id] ?? IDENTITY_M);
    /** @param {0 | 1 | 2} axis */
    const moved = (axis) => {
      const x = a[id]?.[axis] ?? 0;
      const delta = x + ((b[id]?.[axis] ?? 0) - x) * w;
      return old[axis] + delta * weight * (axis === 2 && clip.sideScalesZ ? clamp(side, -1, 1) : 1);
    };
    rotations[id] = jointRotation(bone, clampJointAngles(bone, [moved(0), moved(1), moved(2)]));
  }
  if (clip.footSoleHold) {
    const transforms = boneTransforms(body.bones, { ...base, rotations });
    for (const id of ['foot.L', 'foot.R']) {
      const foot = bones.get(id);
      const shin = foot?.parent ? transforms.get(foot.parent) : undefined;
      if (!foot || !shin) throw new Error(`a clip that holds the soles needs ${id} and its parent`);
      const correction = transpose(shin.r);
      rotations[id] = jointRotation(foot, clampJointAngles(foot, jointAngles(foot, correction)));
    }
  }
  /** @type {Pose} */
  const pose = { root: base.root, rotations };
  const { lowest } = groundFit(
    body,
    pose,
    body.bones.map((bone) => bone.id),
  );
  return { root: [base.root[0], base.root[1] - lowest, base.root[2]], rotations };
}

/**
 * @param {number} seed
 * @param {number} salt
 */
const phaseFor = (seed, salt) => {
  const h = Math.sin(seed * 12.9898 + salt * 78.233) * 43_758.5453;
  return (h - Math.floor(h)) * 2 * Math.PI;
};

/**
 * Each oscillator right-multiplies in content order; no stance or bone tuning lives here.
 * @param {Pose} base
 * @param {readonly IdleOscillator[]} motion
 * @param {number} time
 * @param {number} seed
 * @returns {Pose}
 */
export function applyMotion(base, motion, time, seed) {
  const rotations = { ...base.rotations };
  const axes = { x: rotX, y: rotY, z: rotZ };
  for (const oscillator of motion) {
    const angle =
      Math.sin((2 * Math.PI * time) / oscillator.periodSimSeconds + phaseFor(seed, oscillator.salt)) *
      oscillator.amplitudeDeg;
    for (const { bone, axis, scale } of oscillator.bones)
      rotations[bone] = mulMM(rotations[bone] ?? IDENTITY_M, axes[axis](angle * scale));
  }
  return { root: [base.root[0], base.root[1], base.root[2]], rotations };
}

/**
 * The walk cross-faded into the idle: fully the idle standing still, fully the walk at and above `idleBlendSpeed`.
 * @param {Pose} walk
 * @param {Pose} idle
 * @param {number} speed
 * @param {number} idleBlendSpeed
 */
export const walkToIdle = (walk, idle, speed, idleBlendSpeed) =>
  blendPose(walk, idle, clamp(1 - speed / idleBlendSpeed, 0, 1));

/**
 * `headYaw` radians about the look-at head bone's own y, innermost, held to its limits where it is a framed joint.
 * @param {Pick<FileBody, 'bones' | 'lookAt'>} body
 * @param {Pose} pose
 * @param {number} headYaw
 * @returns {Pose}
 */
export function applyHeadYaw(body, pose, headYaw) {
  if (headYaw === 0) return pose;
  const id = body.lookAt?.headBone ?? 'head';
  const head = body.bones.find((bone) => bone.id === id);
  if (!head) throw new Error(`missing head bone ${id}`);
  const turned = mulMM(pose.rotations[id] ?? IDENTITY_M, rotY((headYaw * 180) / Math.PI));
  const held =
    head.frame && head.limits ? jointRotation(head, clampJointAngles(head, jointAngles(head, turned))) : turned;
  return { ...pose, rotations: { ...pose.rotations, [id]: held } };
}

export { clipSpanSeconds, decodeFrame, sampleClip } from '../site/clipFrames.mjs';
