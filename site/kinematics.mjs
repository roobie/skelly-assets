// Plain-JavaScript kinematics for a rig of bones, loaded as is by the browser and by Node. It is the twin of mobgen's
// core/pose.ts and core/joints.ts over the same data: a bone has a head, a tail, a joint frame and limits, a pose is a
// root translation plus one rotation per bone about its head in rest-world axes, composed parent to child. Keeping the
// same contract lets a doll pose, a mob clip and a game read one format (docs/decisions/0010-pose-tool.md).
//
// Matrices are row-major 3×3 arrays and quaternions [x, y, z, w], as the clip files store them.

const DEG = Math.PI / 180;

// ---- vectors ----

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a) => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a) => { const l = length(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// ---- 3×3 matrices ----

export const IDENTITY_M = [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const mulMM = (a, b) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => a[r * 3] * b[c] + a[r * 3 + 1] * b[c + 3] + a[r * 3 + 2] * b[c + 6]));
export const mulMV = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
export const transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
export const rotX = (deg) => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [1, 0, 0, 0, c, -s, 0, s, c]; };
export const rotY = (deg) => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
export const rotZ = (deg) => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [c, -s, 0, s, c, 0, 0, 0, 1]; };

// Rotation by `deg` about the unit axis.
export const rotAxis = (axis, deg) => {
  const [x, y, z] = normalize(axis), c = Math.cos(deg * DEG), s = Math.sin(deg * DEG), t = 1 - c;
  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
};

// The smallest rotation carrying unit vector `from` onto unit vector `to`.
export const rotBetween = (from, to) => {
  const axis = cross(from, to), s = length(axis), c = clamp(dot(from, to), -1, 1);
  if (s < 1e-9) {
    if (c > 0) return IDENTITY_M;
    // Opposite vectors: a half turn about any axis square to `from`.
    const any = Math.abs(from[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    return rotAxis(normalize(cross(from, any)), 180);
  }
  return rotAxis(axis, Math.atan2(s, c) / DEG);
};

export const quatToMat3 = ([x, y, z, w]) => [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];

export const mat3ToQuat = (m) => {
  const trace = m[0] + m[4] + m[8];
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
  return q.map((c) => c / n);
};

// ---- joints: angles [flex, twist, abduct] in degrees about the bone's frame x, y, z ----

const jointFrame = ({ frame, id }) => {
  if (!frame) throw new Error(`missing joint frame ${id}`);
  const { x, y, z } = frame;
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
};

export const jointRotation = (bone, [flex, twist, abduct]) => {
  const frame = jointFrame(bone);
  return mulMM(frame, mulMM(mulMM(rotZ(abduct), mulMM(rotY(twist), rotX(flex))), transpose(frame)));
};

export const jointAngles = (bone, rotation) => {
  const frame = jointFrame(bone);
  const local = mulMM(transpose(frame), mulMM(rotation, frame));
  return [Math.atan2(local[7], local[8]) / DEG, Math.asin(clamp(-local[6], -1, 1)) / DEG, Math.atan2(local[3], local[0]) / DEG];
};

export const clampJointAngles = ({ limits, id }, angles) => {
  if (!limits) throw new Error(`missing joint limits ${id}`);
  const { flex, twist, abduct } = limits;
  return [clamp(angles[0], ...flex), clamp(angles[1], ...twist), clamp(angles[2], ...abduct)];
};

// A joint frame whose x is the flex axis and whose y follows the bone as closely as stays square to it.
export const frameAbout = (head, tail, flexAxis) => {
  const x = normalize(flexAxis);
  const along = sub(tail, head);
  const y = normalize(sub(along, scale(x, dot(along, x))));
  return { x, y, z: cross(x, y) };
};

// ---- forward kinematics ----

export const applyPoint = ({ r, t }, p) => add(mulMV(r, p), t);

// World transform (rest -> posed) of every bone; `bones` are parents-first. A bone with no rotation keeps its rest
// orientation. T_b = T_parent ∘ translate(head) ∘ R_b ∘ translate(-head), the root also translated by pose.root.
export function boneTransforms(bones, pose) {
  const out = new Map();
  for (const bone of bones) {
    const r = pose.rotations[bone.id] ?? IDENTITY_M;
    let t = sub(bone.head, mulMV(r, bone.head));
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

const boneById = (rig) => new Map(rig.bones.map((bone) => [bone.id, bone]));
const parentWorld = (transforms, bone) => (bone.parent === null ? { r: IDENTITY_M, t: [0, 0, 0] } : transforms.get(bone.parent));
const withRotation = (pose, id, r) => ({ ...pose, rotations: { ...pose.rotations, [id]: r } });

// A bone's local rotation held to its limits; `report` collects the bones that were held.
const held = (bone, r, report) => {
  const angles = jointAngles(bone, r);
  const kept = clampJointAngles(bone, angles);
  if (kept.some((a, i) => Math.abs(a - angles[i]) > 1e-6)) report?.push({ bone: bone.id, asked: angles, held: kept });
  return jointRotation(bone, kept);
};

// A limb never quite straightens or folds flat, where the bend direction would be undefined.
const SLACK = 1e-4;

// For a two-segment limb from `start` toward `target`: the nearest point it can reach and its middle joint there, bent
// toward `pole`.
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
 */
export function solveTwoBone(rig, pose, [upperId, lowerId], target, pole, report) {
  const bones = boneById(rig);
  const upper = bones.get(upperId), lower = bones.get(lowerId);
  const transforms = boneTransforms(rig.bones, pose);
  const parent = parentWorld(transforms, upper);
  const start = applyPoint(transforms.get(upperId), upper.head);
  const r1 = normalize(sub(upper.tail, upper.head)), r2 = normalize(sub(lower.tail, lower.head));
  const { middle, end } = limbJoints(start, target, length(sub(upper.tail, upper.head)), length(sub(lower.tail, lower.head)), mulMV(parent.r, pole));
  const u1 = normalize(sub(middle, start)), u2 = normalize(sub(end, middle));
  // Both bones from an upper world orientation, each held to its limits, with the distance the tail stays short.
  const solve = (upperWorld) => {
    const clamps = [];
    const upperLocal = held(upper, mulMM(transpose(parent.r), upperWorld), clamps);
    const upperNow = mulMM(parent.r, upperLocal);
    const lowerWorld = mulMM(rotBetween(mulMV(upperNow, r2), u2), upperNow);
    const lowerLocal = held(lower, mulMM(transpose(upperNow), lowerWorld), clamps);
    const posed = withRotation(withRotation(pose, upperId, upperLocal), lowerId, lowerLocal);
    const reached = applyPoint(boneTransforms(rig.bones, posed).get(lowerId), lower.tail);
    return { pose: posed, residual: length(sub(reached, target)), clamps };
  };
  // The upper bone carries its rest direction onto u1, then twists about u1 until the lower bone's flex axis is square
  // to the bend plane, so the lower bone's rotation is a pure flex. The axis can face either way along the bend
  // normal: one way the hinge closes positively, the other it would open backwards, and which the limits allow is only
  // known after clamping, so the closer of the two solutions wins.
  const carried = rotBetween(r1, u1);
  const bendNormal = cross(u1, u2);
  const candidates = [];
  if (length(bendNormal) < 1e-6) candidates.push(carried);
  else {
    const flexNow = mulMV(carried, lower.frame.x);
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
export function levelBone(rig, pose, id, report) {
  const bone = boneById(rig).get(id);
  const parent = parentWorld(boneTransforms(rig.bones, pose), bone);
  return withRotation(pose, id, held(bone, transpose(parent.r), report));
}
