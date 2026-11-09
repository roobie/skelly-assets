// Mobgen authors figures facing -Z and model files face +z (docs/decisions/0002-model-frame.md), so every actor
// file passes through this one turn on export; see tools/packages/mobgen/src/core/conventions.ts, TO_MODEL_FRAME.
// Turning the baked values, rather than the generator's authoring frame, leaves every authored sign in mobgen as
// it reads. Each body field is named here as turned or kept, so a new field cannot reach a file unturned unnoticed.
import { TO_MODEL_FRAME as S } from './packages/mobgen/src/core/conventions.ts';

const AXES = { x: 0, y: 1, z: 2 };

export const turnPoint = (p) => p.map((v, a) => v * S[a]);
/** Angles about the generator's axes, in any order: the turn scales each one as it scales its axis. */
export const turnAngles = turnPoint;
export const turnQuat = ([x, y, z, w]) => [x * S[0], y * S[1], z * S[2], w];
export const turnExtent = ({ min, max, ...rest }) => ({
  ...rest,
  min: min.map((v, a) => (S[a] < 0 ? -max[a] : v)),
  max: max.map((v, a) => (S[a] < 0 ? -min[a] : v)),
});

/** Flat xyz triples, such as a mesh's positions or normals. */
export function turnPointArray(array) {
  const out = new Float32Array(array.length);
  for (let i = 0; i < array.length; i++) out[i] = array[i] * S[i % 3];
  return out;
}

const mapValues = (object, turn) => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, turn(value)]));

function turnFields(object, turns, kept, what) {
  const out = {};
  for (const [key, value] of Object.entries(object)) {
    if (key in turns) out[key] = turns[key](value);
    else if (kept.has(key)) out[key] = value;
    else throw new Error(`${what} field ${key} is neither turned nor kept by tools/actorFrame.mjs`);
  }
  return out;
}

// A cell's x and z centres lie on whole voxels from the grid origin (mobgen voxelize.ts, worldPosition), so a
// negated axis keeps its cells on the grid, counted from the far end.
/** The turned index of a cell of a grid `dims` cells across, as a grid's owner array counts them. */
export const turnCellIndex = (dims) => {
  const flip = (i, a) => (S[a] < 0 ? dims[a] - 1 - i : i);
  return (cell) => {
    const i = cell % dims[0];
    const j = Math.floor(cell / dims[0]) % dims[1];
    const k = Math.floor(cell / (dims[0] * dims[1]));
    return flip(i, 0) + flip(j, 1) * dims[0] + flip(k, 2) * dims[0] * dims[1];
  };
};

function turnCells({ size, origin, dims, filled }) {
  const index = turnCellIndex(dims);
  return {
    size, dims,
    origin: origin.map((o, a) => (S[a] < 0 ? -(o + dims[a] - 1) : o)),
    filled: filled.map(([cell, owner]) => [index(cell), owner]).sort((a, b) => a[0] - b[0]),
  };
}

const BONE_TURNS = {
  head: turnPoint, tail: turnPoint,
  frame: (frame) => mapValues(frame, turnPoint),
  voxels: (points) => points.map(turnPoint), hull: (points) => points.map(turnPoint),
};
// Joint limits and ids read in the bone's own joint frame, which turns with the bone.
const BONE_KEPT = new Set(['id', 'parent', 'limits', 'disposition']);

const BODY_TURNS = {
  bones: (bones) => bones.map((bone) => turnFields(bone, BONE_TURNS, BONE_KEPT, 'bone')),
  anchors: (anchors) => mapValues(anchors, (anchor) => ({ ...anchor, position: turnPoint(anchor.position) })),
  // A half turn about +y keeps an axis-aligned box axis-aligned, with its half sizes.
  boxes: (boxes) => mapValues(boxes, (list) => list.map((box) => ({ ...box, center: turnPoint(box.center) }))),
  extents: (extents) => mapValues(extents, turnExtent),
  bounds: turnExtent,
  originOffset: turnPoint, coreInteriorPoint: turnPoint, restStrikeOrigin: turnPoint,
  cells: turnCells,
  animation: ({ flinch, ...timing }) => ({
    ...timing,
    ...(flinch === undefined ? {} : { flinch: { ...flinch, pitch: flinch.pitch * S[0], roll: flinch.roll * S[2] } }),
  }),
};
const BODY_KEPT = new Set([
  'type', 'model', 'seed', 'bodyPlan', 'legCut', 'scale', 'height', 'voxelSize', 'bodyMassKg', 'massFractions',
  'regions', 'severableParts', 'burstBones', 'groundContactBones', 'lookAt', 'manifest',
]);

/** A baked body in the model frame. */
export const fileBody = (body) => turnFields(body, BODY_TURNS, BODY_KEPT, 'body');

const turnPose = (frame) => ({ ...frame, root: turnPoint(frame.root), rotations: mapValues(frame.rotations, turnQuat) });

const turnOscillator = (oscillator) => ({
  ...oscillator,
  bones: oscillator.bones.map((bone) => ({ ...bone, scale: bone.scale * S[AXES[bone.axis]] })),
});

function turnClip(clip) {
  switch (clip.kind) {
    case 'pose': return { ...clip, frames: clip.frames.map(turnPose) };
    case 'overlay': return { ...clip, frames: clip.frames.map((frame) => ({ ...frame, angles: mapValues(frame.angles, turnAngles) })) };
    // Its angles are about each bone's joint frame, which the body turns.
    case 'jointDelta': return clip;
    case undefined:
      // An idle with live motion, or a set of clips keyed by stance, name, side or direction.
      return 'motion' in clip ? { ...clip, base: turnPose(clip.base), motion: clip.motion.map(turnOscillator) } : mapValues(clip, turnClip);
    default: throw new Error(`unknown clip kind ${clip.kind}`);
  }
}

/** Baked clips in the model frame. */
export const fileClips = turnClip;
