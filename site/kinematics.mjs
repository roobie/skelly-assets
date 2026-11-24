// @ts-check
// Plain-JavaScript kinematics for a rig of bones, loaded as is by the browser and by Node. It is the twin of mobgen's
// core/pose.ts and core/joints.ts over the same data: a bone has a head, a tail, a joint frame and limits, a pose is a
// root translation plus one rotation per bone about its head in rest-world axes, composed parent to child. Keeping the
// same contract lets a doll pose, a mob clip and a game read one format (docs/decisions/0010-pose-tool.md). A bone that
// `pronates` reads its joint in an order of its own, which no mobgen bone asks for, so the twin agrees with mobgen on
// every bone they share.
//
// Matrices are row-major 3×3 arrays and quaternions [x, y, z, w], as the clip files store them.

/** @import { Mat3, Transform, Vec3 } from '../tools/packages/construct/src/foundation/math.ts' */

/** @typedef {readonly [x: number, y: number, z: number, w: number]} Quat */
/** @typedef {readonly [flex: number, twist: number, abduct: number]} Angles A joint's turns, in degrees. */
/** @typedef {{ x: Vec3; y: Vec3; z: Vec3 }} JointFrame */
/** @typedef {{ min: Vec3; max: Vec3 }} Box */
/**
 * What kinematics reads of a rig's bone; a rig says more of each (tools/dollRig.mjs).
 * @typedef {object} Bone
 * @property {string} id
 * @property {string | null} parent
 * @property {Vec3} head
 * @property {Vec3} tail
 * @property {JointFrame} [frame]
 * @property {{ flex: readonly [number, number]; twist: readonly [number, number]; abduct: readonly [number, number] }} [limits]
 * @property {boolean} [pronates]
 */
/** @typedef {{ bones: readonly Bone[] }} Rig Its bones parents-first. */
/** @typedef {{ root: Vec3; rotations: Readonly<Record<string, Mat3>> }} Pose */
/** @typedef {{ bone: string; asked: Angles; held: Angles }[]} ClampReport The bones a solve held to their limits. */
/**
 * How a part is bound to its bone: its box and, if the doll rests it turned, the turn and the box as it hangs.
 * @typedef {{ box: Box; turn?: Quat | undefined; hanging?: { box: Box; about: Vec3 } | undefined }} Bind
 */

const DEG = Math.PI / 180;
/** @type {readonly (0 | 1 | 2)[]} */
const AXES = [0, 1, 2];

// ---- vectors ----

/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {Vec3}
 */
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {Vec3}
 */
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
/**
 * @param {Vec3} a
 * @param {number} s
 * @returns {Vec3}
 */
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
/**
 * @param {Vec3} a
 * @param {Vec3} b
 */
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {Vec3}
 */
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** @param {Vec3} a */
export const length = (a) => Math.hypot(a[0], a[1], a[2]);
/**
 * @param {Vec3} a
 * @returns {Vec3}
 */
export const normalize = (a) => {
  const l = length(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
/**
 * @param {number} x
 * @param {number} lo
 * @param {number} hi
 */
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// ---- 3×3 matrices ----

/** @type {Mat3} */
export const IDENTITY_M = [1, 0, 0, 0, 1, 0, 0, 0, 1];
/**
 * @param {Mat3} a
 * @param {Mat3} b
 * @returns {Mat3}
 */
export const mulMM = (a, b) => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
  a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
  a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
  a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
  a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
  a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
  a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
];
/**
 * @param {Mat3} m
 * @param {Vec3} v
 * @returns {Vec3}
 */
export const mulMV = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];
/**
 * @param {Mat3} m
 * @returns {Mat3}
 */
export const transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
/**
 * @param {number} deg
 * @returns {Mat3}
 */
export const rotX = (deg) => {
  const c = Math.cos(deg * DEG),
    s = Math.sin(deg * DEG);
  return [1, 0, 0, 0, c, -s, 0, s, c];
};
/**
 * @param {number} deg
 * @returns {Mat3}
 */
export const rotY = (deg) => {
  const c = Math.cos(deg * DEG),
    s = Math.sin(deg * DEG);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
};
/**
 * @param {number} deg
 * @returns {Mat3}
 */
export const rotZ = (deg) => {
  const c = Math.cos(deg * DEG),
    s = Math.sin(deg * DEG);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};

// Rotation by `deg` about the unit axis.
/**
 * @param {Vec3} axis
 * @param {number} deg
 * @returns {Mat3}
 */
export const rotAxis = (axis, deg) => {
  const [x, y, z] = normalize(axis),
    c = Math.cos(deg * DEG),
    s = Math.sin(deg * DEG),
    t = 1 - c;
  return [
    t * x * x + c,
    t * x * y - s * z,
    t * x * z + s * y,
    t * x * y + s * z,
    t * y * y + c,
    t * y * z - s * x,
    t * x * z - s * y,
    t * y * z + s * x,
    t * z * z + c,
  ];
};

// The smallest rotation carrying unit vector `from` onto unit vector `to`.
/**
 * @param {Vec3} from
 * @param {Vec3} to
 */
export const rotBetween = (from, to) => {
  const axis = cross(from, to),
    s = length(axis),
    c = clamp(dot(from, to), -1, 1);
  if (s < 1e-9) {
    if (c > 0) return IDENTITY_M;
    // Opposite vectors: a half turn about any axis square to `from`.
    /** @type {Vec3} */
    const any = Math.abs(from[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    return rotAxis(normalize(cross(from, any)), 180);
  }
  return rotAxis(axis, Math.atan2(s, c) / DEG);
};

// Divided by the quaternion's squared length, so one rounded to a file's few decimals still turns without skewing.
/**
 * @param {Quat} q
 * @returns {Mat3}
 */
export const quatToMat3 = ([x, y, z, w]) => {
  const s = 2 / (x * x + y * y + z * z + w * w);
  return [
    1 - s * (y * y + z * z),
    s * (x * y - z * w),
    s * (x * z + y * w),
    s * (x * y + z * w),
    1 - s * (x * x + z * z),
    s * (y * z - x * w),
    s * (x * z - y * w),
    s * (y * z + x * w),
    1 - s * (x * x + y * y),
  ];
};

/**
 * @param {Mat3} m
 * @returns {Quat}
 */
export const mat3ToQuat = (m) => {
  const trace = m[0] + m[4] + m[8];
  /** @type {Quat} */
  let q;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    q = [(m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s, s / 4];
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
    q = [s / 4, (m[1] + m[3]) / s, (m[2] + m[6]) / s, (m[7] - m[5]) / s];
  } else if (m[4] > m[8]) {
    const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
    q = [(m[1] + m[3]) / s, s / 4, (m[5] + m[7]) / s, (m[2] - m[6]) / s];
  } else {
    const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
    q = [(m[2] + m[6]) / s, (m[5] + m[7]) / s, s / 4, (m[3] - m[1]) / s];
  }
  const n = Math.hypot(...q);
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
};

// ---- joints: angles [flex, twist, abduct] in degrees about the bone's frame x, y, z ----

/**
 * @param {Pick<Bone, 'frame' | 'id'>} bone
 * @returns {Mat3}
 */
const jointFrame = ({ frame, id }) => {
  if (!frame) throw new Error(`missing joint frame ${id}`);
  const { x, y, z } = frame;
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
};

// A joint's turns compose in the joint's own order, each about the axis the earlier turns carried: a ball joint
// abducts, twists, then flexes, so the twist chooses which way its hinge lies. A bone that `pronates` twists last, so
// the twist rolls the posed bone about its own length, as a forearm turns the hand, instead of carrying the flexed bone
// round a cone; its flex is the outer turn because the middle one reads back only within a quarter turn either way, and
// an elbow closes further than that while such a bone barely abducts (models/dolls/player/rig.libsonnet, `pronates`).
/**
 * @param {Pick<Bone, 'pronates'>} bone
 * @param {Angles} angles
 */
const localRotation = ({ pronates }, [flex, twist, abduct]) =>
  pronates ? mulMM(rotX(flex), mulMM(rotZ(abduct), rotY(twist))) : mulMM(rotZ(abduct), mulMM(rotY(twist), rotX(flex)));

// The angles whose local rotation is `m`, in degrees.
/**
 * @param {Pick<Bone, 'pronates'>} bone
 * @param {Mat3} m
 * @returns {Angles}
 */
const localAngles = ({ pronates }, m) => {
  /** @type {Angles} */
  const [flex, twist, abduct] = pronates
    ? [Math.atan2(m[7], m[4]), Math.atan2(m[2], m[0]), Math.asin(clamp(-m[1], -1, 1))]
    : [Math.atan2(m[7], m[8]), Math.asin(clamp(-m[6], -1, 1)), Math.atan2(m[3], m[0])];
  return [flex / DEG, twist / DEG, abduct / DEG];
};

/**
 * @param {Bone} bone
 * @param {Angles} angles
 */
export const jointRotation = (bone, angles) => {
  const frame = jointFrame(bone);
  return mulMM(frame, mulMM(localRotation(bone, angles), transpose(frame)));
};

/**
 * @param {Bone} bone
 * @param {Mat3} rotation
 */
export const jointAngles = (bone, rotation) => {
  const frame = jointFrame(bone);
  return localAngles(bone, mulMM(transpose(frame), mulMM(rotation, frame)));
};

/**
 * @param {Pick<Bone, 'limits' | 'id'>} bone
 * @param {Angles} angles
 * @returns {Angles}
 */
export const clampJointAngles = ({ limits, id }, angles) => {
  if (!limits) throw new Error(`missing joint limits ${id}`);
  const { flex, twist, abduct } = limits;
  return [clamp(angles[0], ...flex), clamp(angles[1], ...twist), clamp(angles[2], ...abduct)];
};

// A joint frame whose x is the flex axis and whose y follows the bone as closely as stays square to it.
/**
 * @param {Vec3} head
 * @param {Vec3} tail
 * @param {Vec3} flexAxis
 * @returns {JointFrame}
 */
export const frameAbout = (head, tail, flexAxis) => {
  const x = normalize(flexAxis);
  const along = sub(tail, head);
  const y = normalize(sub(along, scale(x, dot(along, x))));
  return { x, y, z: cross(x, y) };
};

// ---- forward kinematics ----

/**
 * @param {Transform} transform
 * @param {Vec3} p
 */
export const applyPoint = ({ r, t }, p) => add(mulMV(r, p), t);
// `b`, then `a`.
/**
 * @param {Transform} a
 * @param {Transform} b
 * @returns {Transform}
 */
export const composed = (a, b) => ({ r: mulMM(a.r, b.r), t: applyPoint(a, b.t) });

// A bound part's box where it is exact, with the rest placing that carries it into the rig frame: a part the doll rests
// turned (tools/dollRig.mjs, `bind.hanging`) is boxed as it hangs before the turn swings it about the anchor it hangs
// from, as its box turned would be a looser one at any angle but a quarter turn.
/**
 * @param {Bind} bind
 * @returns {{ box: Box; rest: Transform }}
 */
export const boundBox = ({ box, turn, hanging }) => {
  if (!turn) return { box, rest: { r: IDENTITY_M, t: [0, 0, 0] } };
  if (!hanging) throw new Error('a part bound turned needs the box it hangs in');
  const r = quatToMat3(turn);
  return { box: hanging.box, rest: { r, t: sub(hanging.about, mulMV(r, hanging.about)) } };
};

// World transform (rest -> posed) of every bone; `bones` are parents-first. A bone with no rotation keeps its rest
// orientation. T_b = T_parent ∘ translate(head) ∘ R_b ∘ translate(-head), the root also translated by pose.root.
/**
 * @param {readonly Bone[]} bones
 * @param {Pose} pose
 */
export function boneTransforms(bones, pose) {
  /** @type {Map<string, Transform>} */
  const out = new Map();
  for (const bone of bones) {
    const r = pose.rotations[bone.id] ?? IDENTITY_M;
    const t = sub(bone.head, mulMV(r, bone.head));
    if (bone.parent === null) out.set(bone.id, { r, t: add(t, pose.root) });
    else {
      const parent = out.get(bone.parent);
      if (!parent) throw new Error(`bone ${bone.id} comes before its parent ${bone.parent}`);
      out.set(bone.id, { r: mulMM(parent.r, r), t: add(mulMV(parent.r, t), parent.t) });
    }
  }
  return out;
}

// ---- inverse kinematics ----

/** @param {Rig} rig */
const boneById = (rig) => new Map(rig.bones.map((bone) => [bone.id, bone]));
/**
 * The bone `id` of a rig's bones, and the transform of one, each refused by name when there is none.
 * @param {ReadonlyMap<string, Bone>} bones
 * @param {string} id
 */
const boneOf = (bones, id) => {
  const bone = bones.get(id);
  if (!bone) throw new Error(`the rig has no bone ${id}`);
  return bone;
};
/**
 * @param {ReadonlyMap<string, Transform>} transforms
 * @param {string} id
 */
const transformOf = (transforms, id) => {
  const transform = transforms.get(id);
  if (!transform) throw new Error(`no transform of bone ${id}`);
  return transform;
};
/**
 * @param {ReadonlyMap<string, Transform>} transforms
 * @param {Bone} bone
 * @returns {Transform}
 */
const parentWorld = (transforms, bone) =>
  bone.parent === null ? { r: IDENTITY_M, t: [0, 0, 0] } : transformOf(transforms, bone.parent);
/**
 * @param {Pose} pose
 * @param {string} id
 * @param {Mat3} r
 * @returns {Pose}
 */
const withRotation = (pose, id, r) => ({ ...pose, rotations: { ...pose.rotations, [id]: r } });

// A bone's local rotation held to its limits; `report` collects the bones that were held.
/**
 * @param {Bone} bone
 * @param {Mat3} r
 * @param {ClampReport} [report]
 */
const held = (bone, r, report) => {
  const angles = jointAngles(bone, r);
  const kept = clampJointAngles(bone, angles);
  if (AXES.some((i) => Math.abs(kept[i] - angles[i]) > 1e-6))
    report?.push({ bone: bone.id, asked: angles, held: kept });
  return jointRotation(bone, kept);
};

// A limb never quite straightens or folds flat, where the bend direction would be undefined.
const SLACK = 1e-4;

// For a two-segment limb from `start` toward `target`: the nearest point it can reach and its middle joint there, bent
// toward `pole`.
/**
 * @param {Vec3} start
 * @param {Vec3} target
 * @param {number} l1
 * @param {number} l2
 * @param {Vec3} pole
 */
const limbJoints = (start, target, l1, l2, pole) => {
  const axis = normalize(sub(target, start));
  const span = clamp(length(sub(target, start)), Math.abs(l1 - l2) + SLACK, l1 + l2 - SLACK);
  const bend = normalize(sub(pole, scale(axis, dot(pole, axis))));
  const along = (l1 * l1 - l2 * l2 + span * span) / (2 * span);
  const middle = add(add(start, scale(axis, along)), scale(bend, Math.sqrt(Math.max(0, l1 * l1 - along * along))));
  return { middle, end: add(start, scale(axis, span)) };
};

/**
 * Analytic two-bone IK: turns `upper` and `lower` (parent and child) so `lower`'s tail reaches `target`, a point in the
 * rig frame, its middle joint bent toward `pole`, a direction in the rest axes of the bone the chain hangs from, so the
 * pole turns with the trunk. The upper bone is twisted so the lower bone's bend lies in its flex plane, which keeps a
 * hinge (an elbow or a knee) a hinge; both rotations are then held to their limits. Returns the new pose and the
 * distance left to the target.
 * @param {Rig} rig
 * @param {Pose} pose
 * @param {readonly [upper: string, lower: string]} chain
 * @param {Vec3} target
 * @param {Vec3} pole
 * @param {ClampReport} [report]
 */
export function solveTwoBone(rig, pose, [upperId, lowerId], target, pole, report) {
  const bones = boneById(rig);
  const upper = boneOf(bones, upperId),
    lower = boneOf(bones, lowerId);
  if (!lower.frame) throw new Error(`missing joint frame ${lowerId}`);
  const flexAxis = lower.frame.x;
  const transforms = boneTransforms(rig.bones, pose);
  const parent = parentWorld(transforms, upper);
  const start = applyPoint(transformOf(transforms, upperId), upper.head);
  const r1 = normalize(sub(upper.tail, upper.head)),
    r2 = normalize(sub(lower.tail, lower.head));
  const { middle, end } = limbJoints(
    start,
    target,
    length(sub(upper.tail, upper.head)),
    length(sub(lower.tail, lower.head)),
    mulMV(parent.r, pole),
  );
  const u1 = normalize(sub(middle, start)),
    u2 = normalize(sub(end, middle));
  // Both bones from an upper world orientation, each held to its limits, with the distance the tail stays short.
  /** @param {Mat3} upperWorld */
  const solve = (upperWorld) => {
    /** @type {ClampReport} */
    const clamps = [];
    const upperLocal = held(upper, mulMM(transpose(parent.r), upperWorld), clamps);
    const upperNow = mulMM(parent.r, upperLocal);
    const lowerWorld = mulMM(rotBetween(mulMV(upperNow, r2), u2), upperNow);
    const lowerLocal = held(lower, mulMM(transpose(upperNow), lowerWorld), clamps);
    const posed = withRotation(withRotation(pose, upperId, upperLocal), lowerId, lowerLocal);
    const reached = applyPoint(transformOf(boneTransforms(rig.bones, posed), lowerId), lower.tail);
    return { pose: posed, residual: length(sub(reached, target)), clamps };
  };
  // The upper bone carries its rest direction onto u1, then twists about u1 until the lower bone's flex axis is square
  // to the bend plane, so the lower bone's rotation is a pure flex. The axis can face either way along the bend
  // normal: one way the hinge closes positively, the other it would open backwards, and which the limits allow is only
  // known after clamping, so the closer of the two solutions wins.
  const carried = rotBetween(r1, u1);
  const bendNormal = cross(u1, u2);
  /** @type {Mat3[]} */
  const candidates = [];
  if (length(bendNormal) < 1e-6) candidates.push(carried);
  else {
    const flexNow = mulMV(carried, flexAxis);
    const flexFlat = normalize(sub(flexNow, scale(u1, dot(flexNow, u1))));
    for (const wanted of [normalize(bendNormal), scale(normalize(bendNormal), -1)]) {
      const twist = Math.atan2(dot(cross(flexFlat, wanted), u1), dot(flexFlat, wanted)) / DEG;
      candidates.push(mulMM(rotAxis(u1, twist), carried));
    }
  }
  const best = candidates.map(solve).reduce((a, b) => (b.residual < a.residual - 1e-9 ? b : a));
  report?.push(...best.clamps);
  return { pose: best.pose, residual: best.residual };
}

// Holds a bone's world orientation to its rest orientation, within its limits: a planted foot keeps its sole level
// whatever the leg above it does.
/**
 * @param {Rig} rig
 * @param {Pose} pose
 * @param {string} id
 * @param {ClampReport} [report]
 */
export function levelBone(rig, pose, id, report) {
  const bone = boneOf(boneById(rig), id);
  const parent = parentWorld(boneTransforms(rig.bones, pose), bone);
  return withRotation(pose, id, held(bone, transpose(parent.r), report));
}
