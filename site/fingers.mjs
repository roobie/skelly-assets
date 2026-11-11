// Hands over a rig from tools/dollRig.mjs, loaded as is by the browser and by Node like kinematics.mjs: a hand's digits
// read off the rig, a pose file's hand shorthand turned into joint angles, a grip closed on a held item by contact, and
// a hand placed on an item's grip socket, with named digits pinching points on the item. Why grips close by
// contact while a pinch reaches fingertip targets, and why the palm is placed before the fingers, is in
// docs/decisions/0010-pose-tool.md.
import { applyPoint, boneTransforms, clampJointAngles, cross, jointAngles, jointRotation, length, mulMM, mulMV, normalize, quatToMat3, rotBetween, solveTwoBone, sub, transpose, IDENTITY_M } from './kinematics.mjs';
import { posedSolid, signedDepth } from './clearance.mjs';

const HAND_KEYS = new Set(['preset', 'curl', 'spread', 'thumb']);
const THUMB_KEYS = new Set(['across', 'oppose', 'lift', 'curl']);
const HOLD_KEYS = new Set(['model', 'at', 'turn', 'socket', 'close', 'pole', 'pinch']);
const SOCKET_KEYS = new Set(['at', 'into', 'axis']);
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isVector = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
const isShare = (v) => Number.isFinite(v) && v >= -1 && v <= 1;
const boneById = (rig) => new Map(rig.bones.map((bone) => [bone.id, bone]));

// ---- digits ----

/**
 * The digits hanging from the hand bone `handId`: by digit name, its bones knuckle first. A digit bone names its
 * `digit` (models/poses/rig.libsonnet); the chain is read off the parents.
 */
export function digitsOf(rig, handId) {
  const bones = boneById(rig);
  const under = (bone) => { for (let b = bone; b; b = bones.get(b.parent)) if (b.parent === handId) return true; return false; };
  const digits = new Map();
  for (const bone of rig.bones) {
    if (!bone.digit || !under(bone)) continue;
    digits.set(bone.digit, [...(digits.get(bone.digit) ?? []), bone]);
  }
  return digits;
}

// A share of a joint's range on the reference side, taken on this copy with the sense its mirroring gives the axis:
// toward the maximum when positive, the minimum when negative.
const AXIS = { flex: 0, twist: 1, abduct: 2 };
const shareOf = (bone, axis, share) => {
  const [min, max] = bone.limits[axis];
  const signed = share * bone.sense[AXIS[axis]];
  return signed >= 0 ? signed * max : -signed * min;
};

// A hand shorthand as written, a preset's name or `{ preset?, curl?, spread?, thumb? }`, over the preset it names.
const SHAPE = '{ preset?, curl, spread, thumb: { across, oppose, lift, curl } } or the name of one of the rig\'s presets';
const presetOf = (rig, hand) => (typeof hand === 'string' ? rig.presets?.[hand] : hand.preset !== undefined ? rig.presets?.[hand.preset] : {});
const resolveHand = (rig, hand) => {
  const preset = presetOf(rig, hand) ?? {};
  const own = typeof hand === 'string' ? {} : hand;
  return { ...preset, ...own, thumb: { ...preset.thumb, ...own.thumb } };
};

/** Every way a hand shorthand does not fit: `{ preset?, curl: share | { <digit>: share }, spread: share, thumb: { across, oppose, lift, curl } }`. */
export function handIssues(rig, handId, hand) {
  if (typeof hand === 'string') return rig.presets?.[hand] ? [] : [`hands.${handId}: the rig has no preset ${hand}`];
  if (!isObject(hand)) return [`hands.${handId} is ${SHAPE}`];
  const issues = [];
  const digits = digitsOf(rig, handId);
  if (digits.size === 0) issues.push(`hands.${handId}: ${handId} has no digits`);
  for (const key of Object.keys(hand)) if (!HAND_KEYS.has(key)) issues.push(`hands.${handId}: unknown key ${key}`);
  if (hand.preset !== undefined && !rig.presets?.[hand.preset]) issues.push(`hands.${handId}: the rig has no preset ${hand.preset}`);
  if (hand.curl !== undefined && !isShare(hand.curl)) {
    if (!isObject(hand.curl)) issues.push(`hands.${handId}.curl is a share -1..1 or one per finger`);
    else for (const [digit, share] of Object.entries(hand.curl)) {
      if (!digits.has(digit) || digit === 'thumb') issues.push(`hands.${handId}.curl: ${handId} has no finger ${digit}`);
      if (!isShare(share)) issues.push(`hands.${handId}.curl.${digit} is a share -1..1`);
    }
  }
  if (hand.spread !== undefined && !isShare(hand.spread)) issues.push(`hands.${handId}.spread is a share -1..1`);
  if (hand.thumb !== undefined) {
    if (!isObject(hand.thumb)) issues.push(`hands.${handId}.thumb is { across, oppose, lift, curl }`);
    else for (const [key, share] of Object.entries(hand.thumb)) {
      if (!THUMB_KEYS.has(key)) issues.push(`hands.${handId}.thumb: unknown key ${key}`);
      else if (!isShare(share)) issues.push(`hands.${handId}.thumb.${key} is a share -1..1`);
    }
  }
  return issues;
}

/**
 * The joint angles a hand shorthand (or the preset it names, under its own keys) asks of the digits of `handId`: a
 * finger's `curl` flexes each of its joints by that share of its range, `spread` abducts the knuckles by their share
 * of the spread, and the thumb's root goes `across` the palm, rolls into opposition by `oppose` and `lift`s toward the
 * palm, while `curl` bends the joints beyond it (models/poses/rig.libsonnet, the thumb). Returns
 * `{ <bone>: [flex, twist, abduct] }`.
 */
export function handAngles(rig, handId, asked) {
  const hand = resolveHand(rig, asked);
  const angles = {};
  const curlOf = (digit) => (isObject(hand.curl) ? hand.curl[digit] ?? 0 : hand.curl ?? 0);
  for (const [digit, chain] of digitsOf(rig, handId)) {
    if (digit === 'thumb') {
      const [root, ...rest] = chain;
      const { across = 0, oppose = 0, lift = 0, curl = 0 } = hand.thumb;
      // Across the palm is the root's negative abduction.
      angles[root.id] = [shareOf(root, 'flex', lift), shareOf(root, 'twist', oppose), shareOf(root, 'abduct', -across)];
      for (const bone of rest) angles[bone.id] = [shareOf(bone, 'flex', curl), 0, 0];
      continue;
    }
    chain.forEach((bone, k) => {
      angles[bone.id] = [shareOf(bone, 'flex', curlOf(digit)), 0, k === 0 ? shareOf(bone, 'abduct', (hand.spread ?? 0) * (bone.spread ?? 0)) : 0];
    });
  }
  return angles;
}

// ---- contact ----

// The points a bone's part is probed at: the corners, edge middles and face centres of its rest box, which stand in for
// a blocky phalanx closely enough to feel a surface.
const boxPoints = ({ min, max }) => {
  const points = [];
  for (const x of [min[0], (min[0] + max[0]) / 2, max[0]]) for (const y of [min[1], (min[1] + max[1]) / 2, max[1]]) for (const z of [min[2], (min[2] + max[2]) / 2, max[2]]) {
    if (x !== (min[0] + max[0]) / 2 || y !== (min[1] + max[1]) / 2 || z !== (min[2] + max[2]) / 2) points.push([x, y, z]);
  }
  return points;
};

// How close a part may come to a held item before it is in contact, how far away a point is still measured, how many
// steps a joint's swing is checked at and how many halvings then find where it meets the item.
const CONTACT = 0.001;
const REACH = 0.05;
const SWEEP = 12;
const STEPS = 12;

// The nearest any of `bones` comes to any of `solids` in the pose, negative when one has sunk in.
const nearest = (rig, pose, bones, solids) => {
  const transforms = boneTransforms(rig.bones, pose);
  let least = Infinity;
  for (const bone of bones) {
    const t = transforms.get(bone.id);
    for (const p of boxPoints(bone.bind.box)) for (const solid of solids) least = Math.min(least, signedDepth(solid, applyPoint(t, p), REACH));
  }
  return least;
};

// A bone's part box as a posed solid, so a digit can close on another.
const BOX_FACES = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
const boxSolid = ({ min, max }, transform) => posedSolid({
  positions: [0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => [0, 1, 2].map((a) => ((i >> a) & 1 ? max[a] : min[a]))),
  indices: BOX_FACES.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]),
}, transform);

const withAngles = (pose, bone, angles) => ({ ...pose, rotations: { ...pose.rotations, [bone.id]: jointRotation(bone, angles) } });

/**
 * Closes the digits of `handId` on `solid` (a posed solid, `clearance.mjs`, `posedSolid`), each joint in turn from the
 * knuckle out: a joint flexes from where the pose holds it until the part it moves, or any beyond it, touches the item,
 * or until its limit; the next joint then goes on from there, so a finger wraps a handle and a fingertip stops on a
 * surface. The fingers close first and the thumb last, on the item and on the closed fingers, so it comes to rest over
 * them rather than through them. Digits that touch nothing close fully; the digits named in `keep` stay as the pose
 * has them. Returns the pose and, per digit closed, how far it closed and whether it touched.
 */
export function closeHand(rig, pose, handId, solid, { keep = [] } = {}) {
  const closed = {};
  const digits = [...digitsOf(rig, handId)].sort(([a], [b]) => (a === 'thumb') - (b === 'thumb'));
  for (const [digit, chain] of digits) {
    if (keep.includes(digit)) continue;
    const fingers = digit !== 'thumb' ? [] : digits.filter(([other]) => other !== 'thumb').flatMap(([, bones]) => bones);
    const transforms = boneTransforms(rig.bones, pose);
    const solids = [solid, ...fingers.map((bone) => boxSolid(bone.bind.box, transforms.get(bone.id)))];
    const apart = (p, moved) => nearest(rig, p, moved, solids) > CONTACT;
    let touched = false;
    chain.forEach((bone, k) => {
      // A thumb its root has laid on the item or the fingers keeps its phalanges as posed, pressing its pad where it
      // landed; bending them on would only lift the pad off.
      if (digit === 'thumb' && touched) return;
      const moved = chain.slice(k);
      const [flex, twist, abduct] = jointAngles(bone, pose.rotations[bone.id] ?? IDENTITY_M);
      const at = (f) => withAngles(pose, bone, clampJointAngles(bone, [f, twist, abduct]));
      if (!apart(at(flex), moved)) { touched = true; return; }
      // The far end of the joint's range in the sense that closes: a phalanx curls toward the palm, while the thumb's
      // root, which a grip opens wide (lifted off the palm), comes back down onto the item from beyond it.
      const lowers = digit === 'thumb' && k === 0;
      const end = (bone.sense[0] > 0) !== lowers ? bone.limits.flex[1] : bone.limits.flex[0];
      // Swept in steps, not judged at the far end alone, so a part cannot pass through a thin item to rest beyond it.
      let open = flex, closed = end;
      for (let i = 1; i <= SWEEP; i++) {
        const next = flex + ((end - flex) * i) / SWEEP;
        if (!apart(at(next), moved)) { closed = next; break; }
        open = next;
      }
      if (open === end) { pose = at(end); return; }
      for (let i = 0; i < STEPS; i++) {
        const mid = (open + closed) / 2;
        if (apart(at(mid), moved)) open = mid; else closed = mid;
      }
      pose = at(open);
      touched = true;
    });
    closed[digit] = { touched, angles: Object.fromEntries(chain.map((bone) => [bone.id, jointAngles(bone, pose.rotations[bone.id] ?? IDENTITY_M).map((a) => Math.round(a * 10) / 10)])) };
  }
  return { pose, closed };
}

// ---- holding ----

/**
 * Every way a hold does not fit: `{ model, at?, turn?, pole?, socket: { at, into, axis }, pinch?, close? }`. The
 * socket is on the item, in its own frame: `at` where the palm's face meets it, `into` the direction from the palm into
 * the item, `axis` along the grip, the way the thumb points. With `at` the item stands in the world and the arm reaches
 * it, the elbow bending toward `pole` or the rig's own; without, the item follows the hand. `pinch`,
 * `{ <digit>: [x, y, z] }`, sets each named digit's pad on that point of the item, in its frame. `close` false leaves
 * the other digits as the pose has them.
 */
export function holdIssues(rig, handId, hold) {
  if (!isObject(hold)) return [`hold.${handId} is { model, at?, turn?, pole?, socket, pinch?, close? }`];
  const issues = [];
  const hand = boneById(rig).get(handId);
  if (!hand?.reach) issues.push(`hold.${handId}: ${handId} is not a reach bone`);
  else if (!(hand.grip >= 0 && hand.grip <= 1)) issues.push(`hold.${handId}: ${handId} has no grip share in [0, 1]`);
  for (const key of Object.keys(hold)) if (!HOLD_KEYS.has(key)) issues.push(`hold.${handId}: unknown key ${key}`);
  if (typeof hold.model !== 'string') issues.push(`hold.${handId}.model names a model`);
  if (hold.at !== undefined && !isVector(hold.at)) issues.push(`hold.${handId}.at is a finite point [x, y, z]`);
  if (hold.turn !== undefined && !(Array.isArray(hold.turn) && hold.turn.length === 4 && hold.turn.every(Number.isFinite))) issues.push(`hold.${handId}.turn is a quaternion [x, y, z, w]`);
  if (hold.pole !== undefined && !isVector(hold.pole)) issues.push(`hold.${handId}.pole is a finite direction [x, y, z]`);
  if (!isObject(hold.socket)) issues.push(`hold.${handId}.socket is { at, into, axis }`);
  else {
    for (const key of Object.keys(hold.socket)) if (!SOCKET_KEYS.has(key)) issues.push(`hold.${handId}.socket: unknown key ${key}`);
    for (const key of SOCKET_KEYS) if (!isVector(hold.socket[key])) issues.push(`hold.${handId}.socket.${key} is a finite [x, y, z]`);
  }
  if (hold.pinch !== undefined) {
    if (!isObject(hold.pinch)) issues.push(`hold.${handId}.pinch is { <digit>: [x, y, z] }`);
    else {
      const digits = digitsOf(rig, handId);
      for (const [digit, point] of Object.entries(hold.pinch)) {
        if (!digits.has(digit)) issues.push(`hold.${handId}.pinch: ${handId} has no digit ${digit}`);
        if (!isVector(point)) issues.push(`hold.${handId}.pinch.${digit} is a finite point [x, y, z]`);
      }
    }
  }
  if (hold.close !== undefined && typeof hold.close !== 'boolean') issues.push(`hold.${handId}.close is true or false`);
  return issues;
}

// A right-handed frame from a direction into a surface and an axis along it, as columns.
const triad = (into, axis) => {
  const x = normalize(into);
  const z = normalize(cross(x, axis));
  const y = cross(z, x);
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
};

// The hand's own socket in rest doll axes: the palm's face where the hand's `grip` share of the palm's length from the
// wrist crosses it, the palm's normal and the thumb's direction along the knuckle row, read off the palm part's box and
// which way the part faces.
const palmSocket = (hand) => {
  const { min, max } = hand.bind.box;
  const sign = hand.bind.mirror ? -1 : 1;
  return { at: [sign > 0 ? max[0] : min[0], max[1] + hand.grip * (min[1] - max[1]), (min[2] + max[2]) / 2], into: [sign, 0, 0], axis: [0, 0, 1] };
};

// How far a rotation turns, in degrees.
const turnOf = (m) => Math.acos(Math.min(1, Math.max(-1, (m[0] + m[4] + m[8] - 1) / 2))) * 180 / Math.PI;

// The joint `bone` set to `angles` in `pose`, each held to its limits, the held ones on `report` when held by more
// than the twist sweep's last step leaves.
const HELD_BY = 0.05;
const setJoint = (pose, bone, angles, report) => {
  const kept = clampJointAngles(bone, angles);
  if (kept.some((a, i) => Math.abs(a - angles[i]) > HELD_BY)) report?.push({ bone: bone.id, asked: angles, held: kept });
  return withAngles(pose, bone, kept);
};

// The steps the forearm's twist is swept at: its whole range coarsely, then about the best ever finer.
const TWIST_STEPS = [5, 1, 0.1];

/**
 * Turns `hand` onto the world orientation `wanted` as far as its limits allow, its parent twisting about itself to
 * carry it the rest of the way: a wrist does not twist, the forearm does, so a palm is turned onto a socket by both.
 * The parent's twist is swept within its limits for the one that leaves the hand's own turn least short.
 */
function turnHand(rig, pose, hand, wanted, report) {
  const bones = boneById(rig);
  const parent = bones.get(hand.parent);
  const parentAngles = jointAngles(parent, pose.rotations[parent.id] ?? IDENTITY_M);
  const shortBy = (twist) => {
    const twisted = withAngles(pose, parent, clampJointAngles(parent, [parentAngles[0], twist, parentAngles[2]]));
    const local = mulMM(transpose(boneTransforms(rig.bones, twisted).get(parent.id).r), wanted);
    const angles = jointAngles(hand, local);
    return { twist, angles, short: turnOf(mulMM(transpose(jointRotation(hand, clampJointAngles(hand, angles))), local)) };
  };
  // The least short wins; among equals, the twist that moves the parent least from where the pose has it.
  const better = (a, b) => !b || a.short < b.short - 1e-6
    || (Math.abs(a.short - b.short) <= 1e-6 && Math.abs(a.twist - parentAngles[1]) < Math.abs(b.twist - parentAngles[1]));
  const sweep = (from, to, step) => {
    let best;
    for (let twist = from; twist <= to + 1e-9; twist += step) {
      const tried = shortBy(twist);
      if (better(tried, best)) best = tried;
    }
    return best;
  };
  const [min, max] = parent.limits.twist;
  let best = sweep(min, max, TWIST_STEPS[0]);
  for (let i = 1; i < TWIST_STEPS.length; i++) best = sweep(Math.max(min, best.twist - TWIST_STEPS[i - 1]), Math.min(max, best.twist + TWIST_STEPS[i - 1]), TWIST_STEPS[i]);
  const twisted = setJoint(pose, parent, [parentAngles[0], best.twist, parentAngles[2]], report);
  return setJoint(twisted, hand, best.angles, report);
}

/**
 * Places `handId` on a hold. With `hold.at` the item is at `at` turned by `turn`, and the arm reaches so the palm's face
 * meets the socket, two-bone IK placing the wrist and the hand then turned onto the socket within its limits
 * (`turnHand`); without, the item is placed where the posed palm is. Returns the pose, the item's world transform
 * `{ r, t }` and the reach residual; the limits that held go on `report`.
 */
export function holdItem(rig, pose, handId, hold, report) {
  const hand = boneById(rig).get(handId);
  const own = palmSocket(hand);
  const mate = mulMM(triad(hold.socket.into, hold.socket.axis), transpose(triad(own.into, own.axis)));
  if (hold.at === undefined) {
    const t = boneTransforms(rig.bones, pose).get(handId);
    const r = mulMM(t.r, transpose(mate));
    return { pose, item: { r, t: sub(applyPoint(t, own.at), mulMV(r, hold.socket.at)) }, residual: 0 };
  }
  const item = { r: hold.turn ? quatToMat3(hold.turn) : IDENTITY_M, t: hold.at };
  const wanted = mulMM(item.r, mate);
  const wrist = sub(applyPoint(item, hold.socket.at), mulMV(wanted, sub(own.at, hand.head)));
  const reached = solveTwoBone(rig, pose, hand.reach.chain, wrist, hold.pole ?? hand.reach.pole, report);
  return { pose: turnHand(rig, reached.pose, hand, wanted, report), item, residual: reached.residual };
}

// The item's mesh carried to where it is held, ready for contact.
export const heldSolid = (mesh, item) => posedSolid(mesh, item);

// ---- pinching ----

/**
 * Cyclic coordinate descent on `chain` (bone ids, root first) so `end`, a point of the last bone in rest doll axes
 * (its tail unless given), reaches `target`, each joint held to its limits at every step. Returns the pose and the
 * distance left.
 */
export function solveCCD(rig, pose, chain, target, { end: endAt, iterations = 24, report } = {}) {
  const bones = boneById(rig);
  const tip = bones.get(chain.at(-1));
  const reach = endAt ?? tip.tail;
  let residual = Infinity;
  for (let i = 0; i < iterations && residual > 1e-4; i++) {
    for (const id of [...chain].reverse()) {
      const bone = bones.get(id);
      const transforms = boneTransforms(rig.bones, pose);
      const joint = applyPoint(transforms.get(id), bone.head);
      const end = applyPoint(transforms.get(tip.id), reach);
      const turn = rotBetween(normalize(sub(end, joint)), normalize(sub(target, joint)));
      const parent = bone.parent === null ? IDENTITY_M : transforms.get(bone.parent).r;
      const local = mulMM(transpose(parent), mulMM(turn, transforms.get(id).r));
      const angles = jointAngles(bone, local), kept = clampJointAngles(bone, angles);
      if (kept.some((a, k) => Math.abs(a - angles[k]) > 1e-6)) report?.push({ bone: id, asked: angles, held: kept });
      pose = { ...pose, rotations: { ...pose.rotations, [id]: jointRotation(bone, kept) } };
    }
    residual = length(sub(applyPoint(boneTransforms(rig.bones, pose).get(tip.id), reach), target));
  }
  return { pose, residual };
}

// How far back from the tip a digit's pad lies, as a share of its last phalanx.
const PAD = 0.3;

/** The pad of a digit's last bone `tip` in rest doll axes: on the face of its part the palm faces, near the tip. */
export const padOf = (tip) => {
  const { min, max } = tip.bind.box;
  return [tip.bind.mirror ? min[0] : max[0], min[1] + PAD * (max[1] - min[1]), (min[2] + max[2]) / 2];
};

/**
 * Sets the pad of each digit `pinch` names on its point of `item` (`{ r, t }`, the point in the item's frame) by
 * `solveCCD` over the digit's chain, the palm staying where the hold placed it. Returns the pose and, per digit, the
 * distance its pad is left from its point and its angles. The descent meets limits on its way however the pinch ends,
 * so what a pinch could not reach shows in that distance, not as held limits.
 */
export function pinchItem(rig, pose, handId, pinch, item) {
  const digits = digitsOf(rig, handId);
  const pinched = {};
  for (const [digit, point] of Object.entries(pinch)) {
    const chain = digits.get(digit);
    let residual;
    ({ pose, residual } = solveCCD(rig, pose, chain.map((bone) => bone.id), applyPoint(item, point), { end: padOf(chain.at(-1)) }));
    pinched[digit] = { residual, angles: Object.fromEntries(chain.map((bone) => [bone.id, jointAngles(bone, pose.rotations[bone.id] ?? IDENTITY_M).map((a) => Math.round(a * 10) / 10)])) };
  }
  return { pose, pinched };
}
