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

// A bone's local rotation clamped to its limits; `report` collects the bones that were clamped.
const clamped = (bone, r, report) => {
  const angles = jointAngles(bone, r);
  const held = clampJointAngles(bone, angles);
  if (held.some((a, i) => Math.abs(a - angles[i]) > 1e-6)) report?.push({ bone: bone.id, asked: angles, held });
  return jointRotation(bone, held);
};

// The middle joint of a two-segment limb from `start` to `end`, bent toward `pole`.
const bentJoint = (start, end, l1, l2, pole) => {
  const span = clamp(length(sub(end, start)), Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
  const axis = normalize(sub(end, start));
  const bend = normalize(sub(pole, scale(axis, dot(pole, axis))));
  const along = (l1 * l1 - l2 * l2 + span * span) / (2 * span);
  return add(add(start, scale(axis, along)), scale(bend, Math.sqrt(Math.max(0, l1 * l1 - along * along))));
};

/**
 * Analytic two-bone IK: turns `upper` and `lower` (parent and child, their rest directions colinear or not) so
 * `lower`'s tail reaches `target`, bending the middle joint toward `pole`, a direction in world axes. The upper bone
 * is twisted so the lower bone's bend lies in its flex plane, which keeps a hinge (an elbow or a knee) a hinge; both
 * rotations are then held to their limits. Returns the new pose and the distance left to the target.
 */
export function solveTwoBone(rig, pose, [upperId, lowerId], target, pole, report) {
  const bones = boneById(rig);
  const upper = bones.get(upperId), lower = bones.get(lowerId);
  const transforms = boneTransforms(rig.bones, pose);
  const parent = parentWorld(transforms, upper);
  const start = applyPoint(transforms.get(upperId), upper.head);
  const l1 = length(sub(upper.tail, upper.head)), l2 = length(sub(lower.tail, lower.head));
  const middle = bentJoint(start, target, l1, l2, pole);
  const u1 = normalize(sub(middle, start));
  const reach = add(start, scale(normalize(sub(target, start)), clamp(length(sub(target, start)), Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4)));
  const u2 = normalize(sub(reach, middle));
  const r1 = normalize(sub(upper.tail, upper.head)), r2 = normalize(sub(lower.tail, lower.head));
  const carried = rotBetween(r1, u1);
  // Both bones from an upper world orientation, each held to its limits, with the distance the hand stays short.
  const solve = (upperWorld) => {
    const clamps = [];
    const upperLocal = clamped(upper, mulMM(transpose(parent.r), upperWorld), clamps);
    const upperNow = mulMM(parent.r, upperLocal);
    const lowerWorld = mulMM(rotBetween(mulMV(upperNow, r2), u2), upperNow);
    const lowerLocal = clamped(lower, mulMM(transpose(upperNow), lowerWorld), clamps);
    const posed = withRotation(withRotation(pose, upperId, upperLocal), lowerId, lowerLocal);
    const end = applyPoint(boneTransforms(rig.bones, posed).get(lowerId), lower.tail);
    return { pose: posed, residual: length(sub(end, target)), clamps };
  };
  // The upper bone carries its rest direction onto u1, then twists about u1 until the lower bone's flex axis is square
  // to the bend plane, so the lower bone's rotation is a pure flex. The axis can face either way along the bend
  // normal: one way the hinge closes positively, the other it would open backwards, and which the limits allow is only
  // known after clamping, so the closer of the two solutions wins.
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

/**
 * Cyclic coordinate descent over `chain` (parents first), moving the last bone's tail toward `target`: each joint in
 * turn, tip to root, turns by the smallest rotation that points its tail-to-effector line at the target, held to its
 * limits. It fits chains of many short hinges, such as fingers, where an analytic solve has no closed form.
 */
export function solveCCD(rig, pose, chain, target, { iterations = 12, tolerance = 1e-4 } = {}, report) {
  const bones = boneById(rig);
  const tip = bones.get(chain.at(-1));
  let posed = pose;
  let residual = Infinity;
  for (let i = 0; i < iterations && residual > tolerance; i++) {
    for (const id of [...chain].reverse()) {
      const bone = bones.get(id);
      const transforms = boneTransforms(rig.bones, posed);
      const pivot = applyPoint(transforms.get(id), bone.head);
      const effector = applyPoint(transforms.get(tip.id), tip.tail);
      const toEffector = normalize(sub(effector, pivot)), toTarget = normalize(sub(target, pivot));
      const parent = parentWorld(transforms, bone);
      const world = mulMM(rotBetween(toEffector, toTarget), transforms.get(id).r);
      posed = withRotation(posed, id, clamped(bone, mulMM(transpose(parent.r), world), report));
    }
    residual = length(sub(applyPoint(boneTransforms(rig.bones, posed).get(tip.id), tip.tail), target));
  }
  return { pose: posed, residual };
}

// Holds a bone's world orientation to its rest orientation, within its limits: a planted foot keeps its sole level
// whatever the leg above it does.
export function levelBone(rig, pose, id, report) {
  const bone = boneById(rig).get(id);
  const parent = parentWorld(boneTransforms(rig.bones, pose), bone);
  return withRotation(pose, id, clamped(bone, transpose(parent.r), report));
}

// ---- pose files ----

// The corners of each bone's bound part box, posed: what stands on the ground and what a camera frames.
const posedCorners = (rig, transforms) => rig.bones.flatMap((bone) => {
  const { min, max } = bone.bind.box;
  const t = transforms.get(bone.id);
  return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => applyPoint(t, [0, 1, 2].map((a) => ((i >> a) & 1 ? max[a] : min[a]))));
});

// The root lift that stands the lowest posed corner on y = 0.
export const groundLift = (rig, pose) => -Math.min(...posedCorners(rig, boneTransforms(rig.bones, pose)).map((p) => p[1]));

/**
 * A pose file, as an author writes it, into a clip frame, as a clip stores it:
 *   { angles: { <bone>: [flex, twist, abduct] }, ik: { <bone>: { target, pole?, method? } }, level: [<bone>],
 *     root?: [x, y, z], ground?: true }
 * Angles are held to each bone's limits; an IK entry names the chain's last bone and reaches with its two parents
 * (`method: "two-bone"`, the default) or walks the chain of `depth` bones by CCD; `level` bones keep their rest
 * orientation; `ground` lifts the root so the figure stands on y = 0. Returns the frame with the limits that held
 * and the IK distances left, so a caller or a test can see what the file asked for that the rig refused.
 */
export function compilePose(rig, file) {
  const bones = boneById(rig);
  const report = { clamped: [], residuals: {} };
  const rotations = {};
  for (const [id, angles] of Object.entries(file.angles ?? {})) {
    const bone = bones.get(id);
    if (!bone) throw new Error(`pose names no rig bone ${id}`);
    const held = clampJointAngles(bone, angles);
    if (held.some((a, i) => a !== angles[i])) report.clamped.push({ bone: id, asked: angles, held });
    rotations[id] = jointRotation(bone, held);
  }
  let pose = { root: file.root ?? [0, 0, 0], rotations };
  for (const [id, goal] of Object.entries(file.ik ?? {})) {
    const chain = [];
    for (let bone = bones.get(id), n = goal.depth ?? 3; bone && n > 0; bone = bones.get(bone.parent), n--) chain.unshift(bone.id);
    if (goal.method === 'ccd') {
      ({ pose, residual: report.residuals[id] } = solveCCD(rig, pose, chain, goal.target, goal, report.clamped));
    } else {
      const [upper, lower] = chain.slice(-3, -1);
      ({ pose, residual: report.residuals[id] } = solveTwoBone(rig, pose, [upper, lower], goal.target, goal.pole ?? [0, 0, -1], report.clamped));
    }
  }
  for (const id of file.level ?? []) pose = levelBone(rig, pose, id, report.clamped);
  if (file.ground) pose = { ...pose, root: [pose.root[0], pose.root[1] + groundLift(rig, pose), pose.root[2]] };
  return { frame: { root: pose.root, rotations: Object.fromEntries(Object.entries(pose.rotations).map(([id, r]) => [id, mat3ToQuat(r)])) }, report };
}

// A clip frame back to a pose of matrices, and its angles per bone for a panel of sliders.
export const decodeFrame = (frame) => ({ root: [...frame.root], rotations: Object.fromEntries(Object.entries(frame.rotations).map(([id, q]) => [id, quatToMat3(q)])) });
export const frameAngles = (rig, frame) => Object.fromEntries(rig.bones.filter((bone) => frame.rotations[bone.id]).map((bone) => [bone.id, jointAngles(bone, quatToMat3(frame.rotations[bone.id]))]));
