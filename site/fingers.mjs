// @ts-check
// Hands over a rig from tools/dollRig.mjs, loaded as is by the browser and by Node like kinematics.mjs: a hand's digits
// read off the rig, a pose file's hand shorthand turned into joint angles, a grip closed on a held item by contact, and
// a hand placed on an item's grip socket, with named digits pinching points on the item. Why grips close by
// contact while a pinch reaches fingertip targets, and why the palm is placed before the fingers, is in
// docs/decisions/0010-pose-tool.md.

/** @import { Mat3, Transform, Vec3 } from '../tools/packages/construct/src/foundation/math.ts' */
/** @import { Mesh, Solid } from './clearance.mjs' */
/** @import { Angles, Bind, Bone, ClampReport, Pose, Quat } from './kinematics.mjs' */
import { posedSolid, signedDepth } from './clearance.mjs';
import {
  AXES,
  applyPoint,
  boneOf,
  boneTransforms,
  boundBox,
  clampJointAngles,
  composed,
  cross,
  IDENTITY_M,
  jointAngles,
  jointRotation,
  length,
  mulMM,
  mulMV,
  normalize,
  quatToMat3,
  rotBetween,
  solveTwoBone,
  sub,
  transformOf,
  transpose,
} from './kinematics.mjs';

/** @typedef {'flex' | 'twist' | 'abduct'} JointAxis */
/**
 * A bone of a doll's rig as tools/dollRig.mjs builds it, with what a hand reads of it.
 * @typedef {object} HandBoneOwn
 * @property {NonNullable<Bone['limits']>} limits
 * @property {Vec3} sense each angle's sense off the reference side, 1 or -1
 * @property {Bind & { mirror?: boolean | undefined }} bind
 * @property {string} [digit]
 * @property {number} [spread]
 * @property {{ chain: readonly [string, string]; pole: Vec3 }} [reach]
 * @property {number} [grip]
 * @property {number} [gripSlant]
 */
/** @typedef {Bone & HandBoneOwn} HandBone */
/** @typedef {{ across?: number; oppose?: number; lift?: number; curl?: number }} Thumb */
/** @typedef {{ preset?: string; curl?: number | Readonly<Record<string, number>>; spread?: number; thumb?: Thumb }} HandShape */
/** @typedef {{ bones: readonly HandBone[]; presets?: Readonly<Record<string, HandShape>> | undefined }} HandRig */
/**
 * @typedef {object} Hold
 * @property {string} model
 * @property {Vec3} [at]
 * @property {Quat} [turn]
 * @property {Vec3} [pole]
 * @property {{ at: Vec3; into: Vec3; axis: Vec3 }} socket
 * @property {number} [grip]
 * @property {number} [slant]
 * @property {Readonly<Record<string, Vec3>>} [pinch]
 * @property {boolean} [close]
 */

const HAND_KEYS = new Set(['preset', 'curl', 'spread', 'thumb']);
const THUMB_KEYS = new Set(['across', 'oppose', 'lift', 'curl']);
const HOLD_KEYS = new Set(['model', 'at', 'turn', 'socket', 'grip', 'slant', 'close', 'pole', 'pinch']);
const SOCKET_KEYS = new Set(['at', 'into', 'axis']);
/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/**
 * @param {unknown} degrees
 * @returns {degrees is number}
 */
const isSlant = (degrees) => typeof degrees === 'number' && degrees >= -90 && degrees <= 90;
/**
 * @param {unknown} share
 * @returns {share is number}
 */
const isGrip = (share) => typeof share === 'number' && share >= 0 && share <= 1;
/** @param {unknown} v */
const isVector = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
/**
 * @param {unknown} v
 * @returns {v is number}
 */
const isShare = (v) => typeof v === 'number' && Number.isFinite(v) && v >= -1 && v <= 1;
/** @param {HandRig} rig */
const boneById = (rig) => new Map(rig.bones.map((bone) => [bone.id, bone]));

// ---- digits ----

/**
 * The digits hanging from the hand bone `handId`: by digit name, its bones knuckle first. A digit bone names its
 * `digit` (models/dolls/player/rig.libsonnet); the chain is read off the parents.
 * @param {HandRig} rig
 * @param {string} handId
 */
export function digitsOf(rig, handId) {
  const bones = boneById(rig);
  /** @param {HandBone} bone */
  const under = (bone) => {
    /** @type {HandBone | undefined} */
    let b = bone;
    for (; b; b = b.parent === null ? undefined : bones.get(b.parent)) if (b.parent === handId) return true;
    return false;
  };
  /** @type {Map<string, HandBone[]>} */
  const digits = new Map();
  for (const bone of rig.bones) {
    if (!bone.digit || !under(bone)) continue;
    digits.set(bone.digit, [...(digits.get(bone.digit) ?? []), bone]);
  }
  return digits;
}

// A share of a joint's range on the reference side, taken on this copy with the sense its mirroring gives the axis:
// toward the maximum when positive, the minimum when negative.
const AXIS = /** @type {const} */ ({ flex: 0, twist: 1, abduct: 2 });
/**
 * @param {HandBone} bone
 * @param {JointAxis} axis
 * @param {number} share
 */
const shareOf = (bone, axis, share) => {
  const [min, max] = bone.limits[axis];
  const signed = share * bone.sense[AXIS[axis]];
  return signed >= 0 ? signed * max : -signed * min;
};

// A hand shorthand as written, a preset's name or `{ preset?, curl?, spread?, thumb? }`, over the preset it names.
const SHAPE =
  "{ preset?, curl, spread, thumb: { across, oppose, lift, curl } } or the name of one of the rig's presets";
/**
 * @param {HandRig} rig
 * @param {string | HandShape} hand
 * @returns {HandShape | undefined}
 */
const presetOf = (rig, hand) =>
  typeof hand === 'string' ? rig.presets?.[hand] : hand.preset !== undefined ? rig.presets?.[hand.preset] : {};
/**
 * @param {HandRig} rig
 * @param {string | HandShape} hand
 * @returns {HandShape & { thumb: Thumb }}
 */
const resolveHand = (rig, hand) => {
  const preset = presetOf(rig, hand) ?? {};
  const own = typeof hand === 'string' ? {} : hand;
  return { ...preset, ...own, thumb: { ...preset.thumb, ...own.thumb } };
};

/**
 * Every way a hand shorthand does not fit: `{ preset?, curl: share | { <digit>: share }, spread: share, thumb: { across, oppose, lift, curl } }`.
 * @param {HandRig} rig
 * @param {string} handId
 * @param {unknown} hand
 */
export function handIssues(rig, handId, hand) {
  if (typeof hand === 'string') return rig.presets?.[hand] ? [] : [`hands.${handId}: the rig has no preset ${hand}`];
  if (!isObject(hand)) return [`hands.${handId} is ${SHAPE}`];
  /** @type {string[]} */
  const issues = [];
  const digits = digitsOf(rig, handId);
  if (digits.size === 0) issues.push(`hands.${handId}: ${handId} has no digits`);
  for (const key of Object.keys(hand)) if (!HAND_KEYS.has(key)) issues.push(`hands.${handId}: unknown key ${key}`);
  if (hand.preset !== undefined && !(typeof hand.preset === 'string' && rig.presets?.[hand.preset]))
    issues.push(`hands.${handId}: the rig has no preset ${hand.preset}`);
  if (hand.curl !== undefined && !isShare(hand.curl)) {
    if (!isObject(hand.curl)) issues.push(`hands.${handId}.curl is a share -1..1 or one per finger`);
    else
      for (const [digit, share] of Object.entries(hand.curl)) {
        if (!digits.has(digit) || digit === 'thumb')
          issues.push(`hands.${handId}.curl: ${handId} has no finger ${digit}`);
        if (!isShare(share)) issues.push(`hands.${handId}.curl.${digit} is a share -1..1`);
      }
  }
  if (hand.spread !== undefined && !isShare(hand.spread)) issues.push(`hands.${handId}.spread is a share -1..1`);
  if (hand.thumb !== undefined) {
    if (!isObject(hand.thumb)) issues.push(`hands.${handId}.thumb is { across, oppose, lift, curl }`);
    else
      for (const [key, share] of Object.entries(hand.thumb)) {
        if (!THUMB_KEYS.has(key)) issues.push(`hands.${handId}.thumb: unknown key ${key}`);
        else if (!isShare(share)) issues.push(`hands.${handId}.thumb.${key} is a share -1..1`);
      }
  }
  return issues;
}

/**
 * The joint angles a hand shorthand (or the preset it names, under its own keys) asks of the digits of `handId`: a
 * finger's `curl` flexes each of its joints by that share of its range, `spread` abducts the knuckles by their share
 * of the spread, and the thumb's root swings `across` the palm by its flex, rolls into opposition by `oppose` and
 * `lift`s off the palm's plane by its abduction, while `curl` bends the joints beyond it
 * (models/dolls/player/rig.libsonnet, the thumb). Returns
 * `{ <bone>: [flex, twist, abduct] }`.
 * @param {HandRig} rig
 * @param {string} handId
 * @param {string | HandShape} asked
 */
export function handAngles(rig, handId, asked) {
  const hand = resolveHand(rig, asked);
  /** @type {Record<string, Angles>} */
  const angles = {};
  const { curl: curls } = hand;
  /** @param {string} digit */
  const curlOf = (digit) => (typeof curls === 'number' ? curls : (curls?.[digit] ?? 0));
  for (const [digit, chain] of digitsOf(rig, handId)) {
    if (digit === 'thumb') {
      const { across = 0, oppose = 0, lift = 0, curl = 0 } = hand.thumb;
      chain.forEach((bone, k) => {
        angles[bone.id] =
          k === 0
            ? [shareOf(bone, 'flex', across), shareOf(bone, 'twist', oppose), shareOf(bone, 'abduct', lift)]
            : [shareOf(bone, 'flex', curl), 0, 0];
      });
      continue;
    }
    chain.forEach((bone, k) => {
      angles[bone.id] = [
        shareOf(bone, 'flex', curlOf(digit)),
        0,
        k === 0 ? shareOf(bone, 'abduct', (hand.spread ?? 0) * (bone.spread ?? 0)) : 0,
      ];
    });
  }
  return angles;
}

// ---- contact ----

// The points a bone's part is probed at: a lattice over the faces of its rest box, a quarter of each edge apart, which
// stands in for a blocky phalanx closely enough to feel a surface, an item's edge included, which would pass between
// the corners and face middles alone.
const LATTICE = 4;
/** @param {Bind['box']} box */
const boxPoints = ({ min, max }) => {
  /** @type {Vec3[]} */
  const points = [];
  /**
   * @param {0 | 1 | 2} a
   * @param {number} i
   */
  const at = (a, i) => min[a] + (i / LATTICE) * (max[a] - min[a]);
  for (let i = 0; i <= LATTICE; i++)
    for (let j = 0; j <= LATTICE; j++)
      for (let k = 0; k <= LATTICE; k++) {
        if ([i, j, k].some((n) => n === 0 || n === LATTICE)) points.push([at(0, i), at(1, j), at(2, k)]);
      }
  return points;
};

/**
 * The points `bone`'s part is probed at in the bone's frame, its rest box's lattice carried by its rest turn, where
 * that box bounds it exactly. Whatever checks a part's contact probes it here, so no check can find a part sunk or
 * clear between the points another probes.
 * @param {Pick<HandBone, 'bind'>} bone
 */
export const probeOf = (bone) => {
  const { box, rest } = boundBox(bone.bind);
  return boxPoints(box).map((p) => applyPoint(rest, p));
};

// How close a part may come to a held item before it is in contact, how far away a point is still measured, how many
// steps a joint's swing is checked at and how many halvings then find where it meets the item.
const CONTACT = 0.001;
const REACH = 0.05;
const SWEEP = 12;
const STEPS = 12;

// The nearest any of `bones` comes to any of `solids` in the pose, negative when one has sunk in.
/**
 * @param {HandRig} rig
 * @param {Pose} pose
 * @param {readonly HandBone[]} bones
 * @param {readonly Solid[]} solids
 */
const nearest = (rig, pose, bones, solids) => {
  const transforms = boneTransforms(rig.bones, pose);
  let least = Infinity;
  for (const bone of bones) {
    const t = transformOf(transforms, bone.id);
    for (const p of probeOf(bone))
      for (const solid of solids) least = Math.min(least, signedDepth(solid, applyPoint(t, p), REACH));
  }
  return least;
};

// A bone's part box as a posed solid, so a digit can close on another.
const BOX_FACES = /** @type {const} */ ([
  [0, 1, 3, 2],
  [4, 6, 7, 5],
  [0, 4, 5, 1],
  [2, 3, 7, 6],
  [0, 2, 6, 4],
  [1, 5, 7, 3],
]);
/**
 * @param {Bind} bind
 * @param {Transform} transform
 */
const boxSolid = (bind, transform) => {
  const { box, rest } = boundBox(bind);
  return posedSolid(
    {
      positions: [0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => AXES.map((a) => ((i >> a) & 1 ? box.max[a] : box.min[a]))),
      indices: BOX_FACES.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]),
    },
    composed(transform, rest),
  );
};

// Sweeps an angle from `from` toward `to` for the first angle where `hit` holds, in steps and then halving the step it
// came in, so a part cannot pass through a thin item to rest beyond it: `met`, that angle, and `short`, the last before
// it that missed; undefined when it never holds.
/**
 * @param {number} from
 * @param {number} to
 * @param {(angle: number) => boolean} hit
 */
const sweepTo = (from, to, hit) => {
  let short = from;
  /** @type {number | undefined} */
  let met;
  for (let i = 1; i <= SWEEP && met === undefined; i++) {
    const next = from + ((to - from) * i) / SWEEP;
    if (hit(next)) met = next;
    else short = next;
  }
  if (met === undefined) return undefined;
  let found = met;
  for (let i = 0; i < STEPS; i++) {
    const mid = (short + found) / 2;
    if (hit(mid)) found = mid;
    else short = mid;
  }
  return { short, met: found };
};

/**
 * @param {Pose} pose
 * @param {HandBone} bone
 * @param {Angles} angles
 * @returns {Pose}
 */
const withAngles = (pose, bone, angles) => ({
  ...pose,
  rotations: { ...pose.rotations, [bone.id]: jointRotation(bone, angles) },
});

/**
 * Flexes each joint of a digit's `chain` in turn from the knuckle out until the part it moves, or any beyond it,
 * touches `solids`, or until its limit; the next joint then goes on from there. A joint whose parts the pose sinks in
 * opens instead until they rest on the surface, or, when its range cannot lift them clear, opens fully and leaves the
 * next joint out to free them. Returns the pose and whether the digit touched.
 * @param {HandRig} rig
 * @param {Pose} pose
 * @param {readonly HandBone[]} chain
 * @param {readonly Solid[]} solids
 */
function closeChain(rig, pose, chain, solids) {
  /**
   * @param {Pose} p
   * @param {readonly HandBone[]} moved
   */
  const apart = (p, moved) => nearest(rig, p, moved, solids) > CONTACT;
  let touched = false;
  chain.forEach((bone, k) => {
    const moved = chain.slice(k);
    const [flex, twist, abduct] = jointAngles(bone, pose.rotations[bone.id] ?? IDENTITY_M);
    /** @param {number} f */
    const at = (f) => withAngles(pose, bone, clampJointAngles(bone, [f, twist, abduct]));
    // The ends of the joint's range in the senses that open and close it.
    const [least, most] = bone.limits.flex;
    const [opened, end] = bone.sense[0] > 0 ? [least, most] : [most, least];
    const gap = nearest(rig, at(flex), moved, solids);
    if (gap < -CONTACT) {
      // Posed sunk into the item: backed out the way the joint opens until it rests on the surface, or as far as it
      // goes, leaving the joints beyond it to free their parts.
      const out = sweepTo(flex, opened, (f) => apart(at(f), moved));
      pose = at(out ? out.met : opened);
      if (out) touched = true;
      return;
    }
    if (gap <= CONTACT) {
      touched = true;
      return;
    }
    const met = sweepTo(flex, end, (f) => !apart(at(f), moved));
    pose = at(met ? met.short : end);
    if (met) touched = true;
  });
  return { pose, touched };
}

/**
 * Closes the digits of `handId` on `solid` (a posed solid, `clearance.mjs`, `posedSolid`), each joint in turn from the
 * knuckle out (`closeChain`), so a finger wraps a handle and a fingertip stops on a surface. The fingers close first
 * and the thumb last, on the item and on the closed fingers, so it comes to rest over them rather than through them:
 * its root swings across from where the pose lifts it, and its further joints bend down onto whatever lies under them.
 * Digits that touch nothing close fully; the digits named in `keep` stay as the pose has them. Returns the pose and,
 * per digit closed, how far it closed and whether it touched.
 * @param {HandRig} rig
 * @param {Pose} pose
 * @param {string} handId
 * @param {Solid} solid
 * @param {{ keep?: readonly string[] }} [options]
 */
export function closeHand(rig, pose, handId, solid, { keep = [] } = {}) {
  /** @type {Record<string, { touched: boolean; angles: Record<string, number[]> }>} */
  const closed = {};
  const digits = [...digitsOf(rig, handId)].sort(([a], [b]) => Number(a === 'thumb') - Number(b === 'thumb'));
  for (const [digit, chain] of digits) {
    if (keep.includes(digit)) continue;
    /** @type {boolean} */
    let touched;
    if (digit === 'thumb') {
      const transforms = boneTransforms(rig.bones, pose);
      const fingers = digits.filter(([other]) => other !== 'thumb').flatMap(([, bones]) => bones);
      const solids = fingers.map((bone) => boxSolid(bone.bind, transformOf(transforms, bone.id)));
      ({ pose, touched } = closeChain(rig, pose, chain, [solid, ...solids]));
    } else ({ pose, touched } = closeChain(rig, pose, chain, [solid]));
    closed[digit] = {
      touched,
      angles: Object.fromEntries(
        chain.map((bone) => [
          bone.id,
          jointAngles(bone, pose.rotations[bone.id] ?? IDENTITY_M).map((a) => Math.round(a * 10) / 10),
        ]),
      ),
    };
  }
  return { pose, closed };
}

// ---- holding ----

/**
 * Every way a hold does not fit: `{ model, at?, turn?, pole?, socket: { at, into, axis }, grip?, slant?, pinch?, close? }`.
 * The socket is on the item, in its own frame: `at` where the palm's face meets it, `into` the direction from the palm
 * into the item, `axis` along the grip, the way the thumb points. `grip` is where on the palm the socket sits, a share
 * of its length from the wrist, and `slant` how far in degrees its axis turns from square across the palm, its thumb
 * end toward the fingers; each is the hand's own (a power grip's) unless given. With `at` the item stands in the world
 * and the arm reaches it, the elbow bending toward `pole` or the rig's own; without, the item follows the hand.
 * `pinch`, `{ <digit>: [x, y, z] }`, sets each named digit's pad on that point of the item, in its frame. `close`
 * false leaves the other digits as the pose has them.
 * @param {HandRig} rig
 * @param {string} handId
 * @param {unknown} hold
 */
export function holdIssues(rig, handId, hold) {
  if (!isObject(hold)) return [`hold.${handId} is { model, at?, turn?, pole?, socket, grip?, slant?, pinch?, close? }`];
  /** @type {string[]} */
  const issues = [];
  const hand = boneById(rig).get(handId);
  if (!hand?.reach) issues.push(`hold.${handId}: ${handId} is not a reach bone`);
  else {
    if (!isGrip(hand.grip)) issues.push(`hold.${handId}: ${handId} has no grip share in [0, 1]`);
    if (!isSlant(hand.gripSlant)) issues.push(`hold.${handId}: ${handId} has no grip slant in [-90, 90] degrees`);
  }
  for (const key of Object.keys(hold)) if (!HOLD_KEYS.has(key)) issues.push(`hold.${handId}: unknown key ${key}`);
  if (typeof hold.model !== 'string') issues.push(`hold.${handId}.model names a model`);
  if (hold.at !== undefined && !isVector(hold.at)) issues.push(`hold.${handId}.at is a finite point [x, y, z]`);
  if (
    hold.turn !== undefined &&
    !(Array.isArray(hold.turn) && hold.turn.length === 4 && hold.turn.every(Number.isFinite))
  )
    issues.push(`hold.${handId}.turn is a quaternion [x, y, z, w]`);
  if (hold.grip !== undefined && !isGrip(hold.grip)) issues.push(`hold.${handId}.grip is a share in [0, 1]`);
  if (hold.slant !== undefined && !isSlant(hold.slant)) issues.push(`hold.${handId}.slant is degrees in [-90, 90]`);
  if (hold.pole !== undefined && !isVector(hold.pole))
    issues.push(`hold.${handId}.pole is a finite direction [x, y, z]`);
  if (!isObject(hold.socket)) issues.push(`hold.${handId}.socket is { at, into, axis }`);
  else {
    const { socket } = hold;
    for (const key of Object.keys(socket))
      if (!SOCKET_KEYS.has(key)) issues.push(`hold.${handId}.socket: unknown key ${key}`);
    for (const key of SOCKET_KEYS)
      if (!isVector(socket[key])) issues.push(`hold.${handId}.socket.${key} is a finite [x, y, z]`);
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
/**
 * @param {Vec3} into
 * @param {Vec3} axis
 * @returns {Mat3}
 */
const triad = (into, axis) => {
  const x = normalize(into);
  const z = normalize(cross(x, axis));
  const y = cross(z, x);
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
};

// The hand's own socket in rest doll axes: the palm's face where `grip`, a share of the palm's length from the wrist,
// crosses it, the palm's normal, and the thumb's direction across the palm turned `slant` degrees toward the fingers,
// read off the palm part's box as the hand hangs down -y, which the doll's rest turn then carries.
/**
 * @param {HandBone} hand
 * @param {number} grip
 * @param {number} slant
 */
const palmSocket = (hand, grip, slant) => {
  const { box, rest } = boundBox(hand.bind);
  const { min, max } = box;
  const sign = hand.bind.mirror ? -1 : 1;
  const a = (slant * Math.PI) / 180;
  return {
    at: applyPoint(rest, [sign > 0 ? max[0] : min[0], max[1] + grip * (min[1] - max[1]), (min[2] + max[2]) / 2]),
    into: mulMV(rest.r, [sign, 0, 0]),
    axis: mulMV(rest.r, [0, -Math.sin(a), Math.cos(a)]),
  };
};

// How far a rotation turns, in degrees.
/** @param {Mat3} m */
const turnOf = (m) => (Math.acos(Math.min(1, Math.max(-1, (m[0] + m[4] + m[8] - 1) / 2))) * 180) / Math.PI;

// The joint `bone` set to `angles` in `pose`, each held to its limits, the held ones on `report` when held by more
// than the twist sweep's last step leaves.
const HELD_BY = 0.05;
/**
 * @param {Pose} pose
 * @param {HandBone} bone
 * @param {Angles} angles
 * @param {ClampReport} [report]
 */
const setJoint = (pose, bone, angles, report) => {
  const kept = clampJointAngles(bone, angles);
  if (AXES.some((i) => Math.abs(kept[i] - angles[i]) > HELD_BY))
    report?.push({ bone: bone.id, asked: angles, held: kept });
  return withAngles(pose, bone, kept);
};

// The steps the forearm's twist is swept at: its whole range coarsely, then about the best ever finer.
const TWIST_STEPS = /** @type {const} */ ([5, 1, 0.1]);

/**
 * Turns `hand` onto the world orientation `wanted` as far as its limits allow, its parent twisting about itself to
 * carry it the rest of the way: a wrist does not twist, the forearm does, so a palm is turned onto a socket by both.
 * The parent's twist is swept within its limits for the one that leaves the hand's own turn least short.
 * @param {HandRig} rig
 * @param {Pose} pose
 * @param {HandBone} hand
 * @param {Mat3} wanted
 * @param {ClampReport} [report]
 */
function turnHand(rig, pose, hand, wanted, report) {
  if (hand.parent === null) throw new Error(`${hand.id} has no parent to twist it onto a socket`);
  const parent = boneOf(boneById(rig), hand.parent);
  const parentAngles = jointAngles(parent, pose.rotations[parent.id] ?? IDENTITY_M);
  /** @param {number} twist */
  const shortBy = (twist) => {
    const twisted = withAngles(pose, parent, clampJointAngles(parent, [parentAngles[0], twist, parentAngles[2]]));
    const local = mulMM(transpose(transformOf(boneTransforms(rig.bones, twisted), parent.id).r), wanted);
    const angles = jointAngles(hand, local);
    return {
      twist,
      angles,
      short: turnOf(mulMM(transpose(jointRotation(hand, clampJointAngles(hand, angles))), local)),
    };
  };
  // The least short wins; among equals, the twist that moves the parent least from where the pose has it.
  /** @typedef {ReturnType<typeof shortBy>} Tried */
  /**
   * @param {Tried} a
   * @param {Tried} b
   */
  const better = (a, b) =>
    a.short < b.short - 1e-6 ||
    (Math.abs(a.short - b.short) <= 1e-6 && Math.abs(a.twist - parentAngles[1]) < Math.abs(b.twist - parentAngles[1]));
  /**
   * The best of the twists from `from` to `to`, `from` among them.
   * @param {number} from
   * @param {number} to
   * @param {number} step
   */
  const sweep = (from, to, step) => {
    let best = shortBy(from);
    for (let twist = from + step; twist <= to + 1e-9; twist += step) {
      const tried = shortBy(twist);
      if (better(tried, best)) best = tried;
    }
    return best;
  };
  const [min, max] = parent.limits.twist;
  const [coarse, ...finer] = TWIST_STEPS;
  let best = sweep(min, max, coarse);
  /** @type {number} */
  let around = coarse;
  for (const step of finer) {
    best = sweep(Math.max(min, best.twist - around), Math.min(max, best.twist + around), step);
    around = step;
  }
  const twisted = setJoint(pose, parent, [parentAngles[0], best.twist, parentAngles[2]], report);
  return setJoint(twisted, hand, best.angles, report);
}

/**
 * Places `handId` on a hold. With `hold.at` the item is at `at` turned by `turn`, and the arm reaches so the palm's face
 * meets the socket, two-bone IK placing the wrist and the hand then turned onto the socket within its limits
 * (`turnHand`); without, the item is placed where the posed palm is. Returns the pose, the item's world transform
 * `{ r, t }` and the reach residual; the limits that held go on `report`.
 * @param {HandRig} rig
 * @param {Pose} pose
 * @param {string} handId
 * @param {Hold} hold
 * @param {ClampReport} [report]
 * @returns {{ pose: Pose; item: Transform; residual: number }}
 */
export function holdItem(rig, pose, handId, hold, report) {
  const hand = boneOf(boneById(rig), handId);
  const grip = hold.grip ?? hand.grip;
  const slant = hold.slant ?? hand.gripSlant;
  if (grip === undefined || slant === undefined) throw new Error(`hold.${handId}: ${handId} has no grip of its own`);
  const own = palmSocket(hand, grip, slant);
  const mate = mulMM(triad(hold.socket.into, hold.socket.axis), transpose(triad(own.into, own.axis)));
  if (hold.at === undefined) {
    const t = transformOf(boneTransforms(rig.bones, pose), handId);
    const r = mulMM(t.r, transpose(mate));
    return { pose, item: { r, t: sub(applyPoint(t, own.at), mulMV(r, hold.socket.at)) }, residual: 0 };
  }
  if (!hand.reach) throw new Error(`hold.${handId}: ${handId} is not a reach bone`);
  /** @type {Transform} */
  const item = { r: hold.turn ? quatToMat3(hold.turn) : IDENTITY_M, t: hold.at };
  const wanted = mulMM(item.r, mate);
  const wrist = sub(applyPoint(item, hold.socket.at), mulMV(wanted, sub(own.at, hand.head)));
  const reached = solveTwoBone(rig, pose, hand.reach.chain, wrist, hold.pole ?? hand.reach.pole, report);
  return { pose: turnHand(rig, reached.pose, hand, wanted, report), item, residual: reached.residual };
}

// The item's mesh carried to where it is held, ready for contact.
/**
 * @param {Mesh} mesh
 * @param {Transform} item
 */
export const heldSolid = (mesh, item) => posedSolid(mesh, item);

// ---- pinching ----

/**
 * Cyclic coordinate descent on `chain` (bone ids, root first) so `end`, a point of the last bone in rest doll axes
 * (its tail unless given), reaches `target`, each joint held to its limits at every step. Returns the pose and the
 * distance left.
 * @param {HandRig} rig
 * @param {Pose} pose
 * @param {readonly string[]} chain
 * @param {Vec3} target
 * @param {{ end?: Vec3; iterations?: number; report?: ClampReport }} [options]
 */
export function solveCCD(rig, pose, chain, target, { end: endAt, iterations = 24, report } = {}) {
  const bones = boneById(rig);
  const tipId = chain.at(-1);
  if (tipId === undefined) throw new Error('a chain of no bones reaches nothing');
  const tip = boneOf(bones, tipId);
  const reach = endAt ?? tip.tail;
  let residual = Infinity;
  for (let i = 0; i < iterations && residual > 1e-4; i++) {
    for (const id of [...chain].reverse()) {
      const bone = boneOf(bones, id);
      const transforms = boneTransforms(rig.bones, pose);
      const own = transformOf(transforms, id);
      const joint = applyPoint(own, bone.head);
      const end = applyPoint(transformOf(transforms, tip.id), reach);
      const turn = rotBetween(normalize(sub(end, joint)), normalize(sub(target, joint)));
      const parent = bone.parent === null ? IDENTITY_M : transformOf(transforms, bone.parent).r;
      const local = mulMM(transpose(parent), mulMM(turn, own.r));
      const angles = jointAngles(bone, local),
        kept = clampJointAngles(bone, angles);
      if (AXES.some((k) => Math.abs(kept[k] - angles[k]) > 1e-6)) report?.push({ bone: id, asked: angles, held: kept });
      pose = { ...pose, rotations: { ...pose.rotations, [id]: jointRotation(bone, kept) } };
    }
    residual = length(sub(applyPoint(transformOf(boneTransforms(rig.bones, pose), tip.id), reach), target));
  }
  return { pose, residual };
}

// How far back from the tip a digit's pad lies, as a share of its last phalanx.
const PAD = 0.3;

/**
 * The pad of a digit's last bone `tip` in rest doll axes: on the face of its part the palm faces, near the tip, read off
 * its box as the hand hangs down -y, which the doll's rest turn then carries.
 * @param {HandBone} tip
 */
export const padOf = (tip) => {
  const { box, rest } = boundBox(tip.bind);
  const { min, max } = box;
  return applyPoint(rest, [tip.bind.mirror ? min[0] : max[0], min[1] + PAD * (max[1] - min[1]), (min[2] + max[2]) / 2]);
};

/**
 * Sets the pad of each digit `pinch` names on its point of `item` (`{ r, t }`, the point in the item's frame) by
 * `solveCCD` over the digit's chain, the palm staying where the hold placed it. Returns the pose and, per digit, the
 * distance its pad is left from its point and its angles. The descent meets limits on its way however the pinch ends,
 * so what a pinch could not reach shows in that distance, not as held limits.
 * @param {HandRig} rig
 * @param {Pose} pose
 * @param {string} handId
 * @param {Readonly<Record<string, Vec3>>} pinch
 * @param {Transform} item
 */
export function pinchItem(rig, pose, handId, pinch, item) {
  const digits = digitsOf(rig, handId);
  /** @type {Record<string, { residual: number; angles: Record<string, number[]> }>} */
  const pinched = {};
  for (const [digit, point] of Object.entries(pinch)) {
    const chain = digits.get(digit);
    const tip = chain?.at(-1);
    if (!chain || !tip) throw new Error(`pinch: ${handId} has no digit ${digit}`);
    /** @type {number} */
    let residual;
    ({ pose, residual } = solveCCD(
      rig,
      pose,
      chain.map((bone) => bone.id),
      applyPoint(item, point),
      { end: padOf(tip) },
    ));
    pinched[digit] = {
      residual,
      angles: Object.fromEntries(
        chain.map((bone) => [
          bone.id,
          jointAngles(bone, pose.rotations[bone.id] ?? IDENTITY_M).map((a) => Math.round(a * 10) / 10),
        ]),
      ),
    };
  }
  return { pose, pinched };
}
