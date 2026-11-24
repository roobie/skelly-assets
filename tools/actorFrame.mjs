// @ts-check
// Mobgen authors figures facing -Z and model files face +z (docs/decisions/0002-model-frame.md), so every actor
// file passes through this one turn on export; see tools/packages/mobgen/src/core/conventions.ts, TO_MODEL_FRAME.
// Turning the baked values, rather than the generator's authoring frame, leaves every authored sign in mobgen as
// it reads. Each body field is named here as turned or kept, so a new field cannot reach a file unturned unnoticed.
/** @import { Quat, Vec3 } from './packages/mobgen/src/core/math.ts' */
import { perAxis } from './packages/construct/src/foundation/math.ts';
import { TO_MODEL_FRAME as S } from './packages/mobgen/src/core/conventions.ts';

/** @import { AxisIndex } from './packages/construct/src/foundation/math.ts' */
/** @typedef {{ readonly min: Vec3; readonly max: Vec3 }} Extent */
/** @typedef {{ readonly root: Vec3; readonly rotations: Readonly<Record<string, Quat>> }} PoseFrame */
/** @typedef {{ readonly bones: readonly { readonly axis: 'x' | 'y' | 'z'; readonly scale: number }[] }} Oscillator */
/**
 * A baked clip by its kind, an idle with live motion, or a set of clips keyed by stance, name, side or direction.
 * @typedef {{ readonly kind: 'pose'; readonly frames: readonly PoseFrame[] }} PoseClip
 * @typedef {{ readonly kind: 'overlay'; readonly frames: readonly { readonly angles: Readonly<Record<string, Vec3>> }[] }} OverlayClip
 * @typedef {{ readonly kind: 'jointDelta' }} JointDeltaClip
 * @typedef {{ readonly base: PoseFrame; readonly motion: readonly Oscillator[] }} MotionClip
 * @typedef {PoseClip | OverlayClip | JointDeltaClip} KindedClip
 * @typedef {KindedClip | MotionClip | { readonly [key: string]: Clips }} Clips
 */

const AXES = /** @type {const} */ ({ x: 0, y: 1, z: 2 });

/**
 * @param {Vec3} p
 * @returns {Vec3}
 */
export const turnPoint = (p) => [p[0] * S[0], p[1] * S[1], p[2] * S[2]];
/** Angles about the generator's axes, in any order: the turn scales each one as it scales its axis. */
const turnAngles = turnPoint;
/**
 * @param {Quat} q
 * @returns {Quat}
 */
const turnQuat = ([x, y, z, w]) => [x * S[0], y * S[1], z * S[2], w];
/**
 * @template {Extent} Given
 * @param {Given} extent
 * @returns {Given}
 */
const turnExtent = ({ min, max, ...rest }) =>
  /** @type {Given} */ ({
    ...rest,
    min: perAxis((a) => (S[a] < 0 ? -max[a] : min[a])),
    max: perAxis((a) => (S[a] < 0 ? -min[a] : max[a])),
  });

/** @param {number} index of a flat xyz triple's number */
const signAt = (index) => (index % 3 === 0 ? S[0] : index % 3 === 1 ? S[1] : S[2]);

/**
 * Flat xyz triples, such as a mesh's positions or normals.
 * @param {ArrayLike<number>} array
 */
export const turnPointArray = (array) => Float32Array.from(array, (value, index) => value * signAt(index));

/**
 * @template Value, Turned
 * @param {Readonly<Record<string, Value>>} object
 * @param {(value: Value) => Turned} turn
 * @returns {Record<string, Turned>}
 */
const mapValues = (object, turn) =>
  Object.fromEntries(Object.entries(object).map(([key, value]) => [key, turn(value)]));

/**
 * `object` with each field turned by the turn of its name, which takes the field as it is and gives its type back, or
 * kept.
 * @template {object} Fields
 * @param {Fields} object
 * @param {Readonly<Record<string, (value: never) => unknown>>} turns
 * @param {ReadonlySet<string>} kept
 * @param {string} what
 * @returns {Fields}
 */
function turnFields(object, turns, kept, what) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(object)) {
    const turn = key in turns ? turns[key] : undefined;
    if (turn) out[key] = turn(/** @type {never} */ (value));
    else if (kept.has(key)) out[key] = value;
    else throw new Error(`${what} field ${key} is neither turned nor kept by tools/actorFrame.mjs`);
  }
  return /** @type {Fields} */ (out);
}

// A cell's x and z centres lie on whole voxels from the grid origin (mobgen voxelize.ts, worldPosition), so a
// negated axis keeps its cells on the grid, counted from the far end.
/** The turned index of a cell of a grid `dims` cells across, as a grid's owner array counts them. */
/** @param {Vec3} dims */
export const turnCellIndex = (dims) => {
  /**
   * @param {number} i
   * @param {AxisIndex} a
   */
  const flip = (i, a) => (S[a] < 0 ? dims[a] - 1 - i : i);
  /** @param {number} cell */
  return (cell) => {
    const i = cell % dims[0];
    const j = Math.floor(cell / dims[0]) % dims[1];
    const k = Math.floor(cell / (dims[0] * dims[1]));
    return flip(i, 0) + flip(j, 1) * dims[0] + flip(k, 2) * dims[0] * dims[1];
  };
};

/**
 * @typedef {{ readonly size: number; readonly origin: Vec3; readonly dims: Vec3; readonly filled: readonly (readonly [cell: number, owner: number])[] }} Cells
 */
/** @param {Cells} cells */
function turnCells({ size, origin, dims, filled }) {
  const index = turnCellIndex(dims);
  return {
    size,
    dims,
    origin: perAxis((a) => (S[a] < 0 ? -(origin[a] + dims[a] - 1) : origin[a])),
    filled: filled
      .map(/** @returns {[number, number]} */ ([cell, owner]) => [index(cell), owner])
      .sort((a, b) => a[0] - b[0]),
  };
}

const BONE_TURNS = {
  head: turnPoint,
  tail: turnPoint,
  /** @param {Readonly<Record<'x' | 'y' | 'z', Vec3>>} frame */
  frame: (frame) => mapValues(frame, turnPoint),
  /** @param {readonly Vec3[]} points */
  voxels: (points) => points.map(turnPoint),
  /** @param {readonly Vec3[]} points */
  hull: (points) => points.map(turnPoint),
};
// Joint limits and ids read in the bone's own joint frame, which turns with the bone.
const BONE_KEPT = new Set(['id', 'parent', 'limits', 'disposition']);

const BODY_TURNS = {
  /** @param {readonly object[]} bones */
  bones: (bones) => bones.map((bone) => turnFields(bone, BONE_TURNS, BONE_KEPT, 'bone')),
  /** @param {Readonly<Record<string, { readonly position: Vec3 }>>} anchors */
  anchors: (anchors) => mapValues(anchors, (anchor) => ({ ...anchor, position: turnPoint(anchor.position) })),
  // A half turn about +y keeps an axis-aligned box axis-aligned, with its half sizes.
  /** @param {Readonly<Record<string, readonly { readonly center: Vec3 }[]>>} boxes */
  boxes: (boxes) => mapValues(boxes, (list) => list.map((box) => ({ ...box, center: turnPoint(box.center) }))),
  /** @param {Readonly<Record<string, Extent>>} extents */
  extents: (extents) => mapValues(extents, turnExtent),
  bounds: turnExtent,
  originOffset: turnPoint,
  coreInteriorPoint: turnPoint,
  restStrikeOrigin: turnPoint,
  cells: turnCells,
  /** @param {{ readonly flinch?: { readonly pitch: number; readonly roll: number } }} animation */
  animation: ({ flinch, ...timing }) => ({
    ...timing,
    ...(flinch === undefined ? {} : { flinch: { ...flinch, pitch: flinch.pitch * S[0], roll: flinch.roll * S[2] } }),
  }),
};
const BODY_KEPT = new Set([
  'type',
  'model',
  'seed',
  'bodyPlan',
  'legCut',
  'scale',
  'height',
  'voxelSize',
  'bodyMassKg',
  'massFractions',
  'regions',
  'severableParts',
  'burstBones',
  'groundContactBones',
  'lookAt',
  'manifest',
]);

/**
 * A baked body in the model frame.
 * @template {object} Body
 * @param {Body} body
 */
export const fileBody = (body) => turnFields(body, BODY_TURNS, BODY_KEPT, 'body');

/** @param {PoseFrame} frame */
const turnPose = (frame) => ({
  ...frame,
  root: turnPoint(frame.root),
  rotations: mapValues(frame.rotations, turnQuat),
});

/** @param {Oscillator} oscillator */
const turnOscillator = (oscillator) => ({
  ...oscillator,
  bones: oscillator.bones.map((bone) => ({ ...bone, scale: bone.scale * S[AXES[bone.axis]] })),
});

/**
 * @param {Clips} clips
 * @returns {clips is KindedClip}
 */
const isKinded = (clips) => 'kind' in clips && clips.kind !== undefined;
/**
 * @param {Clips} clips
 * @returns {clips is MotionClip}
 */
const isMotion = (clips) => 'motion' in clips;

/**
 * @param {Clips} clip
 * @returns {Clips}
 */
function turnClip(clip) {
  // An idle with live motion, or a set of clips keyed by stance, name, side or direction.
  if (!isKinded(clip)) {
    return isMotion(clip)
      ? { ...clip, base: turnPose(clip.base), motion: clip.motion.map(turnOscillator) }
      : mapValues(clip, turnClip);
  }
  switch (clip.kind) {
    case 'pose':
      return { ...clip, frames: clip.frames.map(turnPose) };
    case 'overlay':
      return {
        ...clip,
        frames: clip.frames.map((frame) => ({ ...frame, angles: mapValues(frame.angles, turnAngles) })),
      };
    // Its angles are about each bone's joint frame, which the body turns.
    case 'jointDelta':
      return clip;
    default:
      throw new Error(`unknown clip kind ${/** @type {{ kind: unknown }} */ (clip).kind}`);
  }
}

/**
 * Baked clips in the model frame.
 * @template {Clips} Baked
 * @param {Baked} clips
 * @returns {Baked}
 */
export const fileClips = (clips) => /** @type {Baked} */ (turnClip(clips));
