// Hands over a rig from tools/dollRig.mjs, loaded as is by the browser and by Node like kinematics.mjs: a hand's digits
// read off the rig, a pose file's hand shorthand turned into joint angles, a grip closed on a held item by contact, and
// a hand placed on an item's grip socket, with named digits pinching points on the item. Why grips close by
// contact while a pinch reaches fingertip targets, and why the palm is placed before the fingers, is in
// docs/decisions/0010-pose-tool.md.

import { posedSolid, signedDepth } from './clearance.mjs';
import {
  applyPoint,
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
  transpose,
} from './kinematics.mjs';

const HAND_KEYS = new Set(['preset', 'curl', 'spread', 'thumb']);
const THUMB_KEYS = new Set(['across', 'oppose', 'lift', 'curl']);
const HOLD_KEYS = new Set(['model', 'at', 'turn', 'socket', 'grip', 'slant', 'close', 'pole', 'pinch']);
const SOCKET_KEYS = new Set(['at', 'into', 'axis']);
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isSlant = (degrees) => degrees >= -90 && degrees <= 90;
const isVector = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
const isShare = (v) => Number.isFinite(v) && v >= -1 && v <= 1;
const boneById = (rig) => new Map(rig.bones.map((bone) => [bone.id, bone]));

// ---- digits ----

/**
 * The digits hanging from the hand bone `handId`: by digit name, its bones knuckle first. A digit bone names its
 * `digit` (models/dolls/player/rig.libsonnet); the chain is read off the parents.
 */
export function digitsOf(rig, handId) {
  const bones = boneById(rig);
  const under = (bone) => {
    for (let b = bone; b; b = bones.get(b.parent)) if (b.parent === handId) return true;
    return false;
  };
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
const SHAPE =
  "{ preset?, curl, spread, thumb: { across, oppose, lift, curl } } or the name of one of the rig's presets";
const presetOf = (rig, hand) =>
  typeof hand === 'string' ? rig.presets?.[hand] : hand.preset !== undefined ? rig.presets?.[hand.preset] : {};
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
  if (hand.preset !== undefined && !rig.presets?.[hand.preset])
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
 * of the spread, and the thumb's root goes `across` the palm, rolls into opposition by `oppose` and `lift`s toward the
 * palm, while `curl` bends the joints beyond it (models/dolls/player/rig.libsonnet, the thumb). Returns
 * `{ <bone>: [flex, twist, abduct] }`.
 */
export function handAngles(rig, handId, asked) {
  const hand = resolveHand(rig, asked);
  const angles = {};
  const curlOf = (digit) => (isObject(hand.curl) ? (hand.curl[digit] ?? 0) : (hand.curl ?? 0));
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
const boxPoints = ({ min, max }) => {
  const points = [];
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
 * that box bounds it exactly, and the sphere round them. Whatever checks a part's contact probes it here, so no check
 * can find a part sunk or clear between the points another probes.
 */
export const probeOf = (bone) => {
  const { box, rest } = boundBox(bone.bind);
  const points = boxPoints(box).map((p) => applyPoint(rest, p));
  const middle = box.min.map((low, a) => (low + box.max[a]) / 2);
  const centre = applyPoint(rest, middle);
  return { points, centre, radius: Math.max(...points.map((p) => length(sub(p, centre)))) };
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
    for (const p of probeOf(bone).points)
      for (const solid of solids) least = Math.min(least, signedDepth(solid, applyPoint(t, p), REACH));
  }
  return least;
};

// A bone's part box as a posed solid, so a digit can close on another.
const BOX_FACES = [
  [0, 1, 3, 2],
  [4, 6, 7, 5],
  [0, 4, 5, 1],
  [2, 3, 7, 6],
  [0, 2, 6, 4],
  [1, 5, 7, 3],
];
const boxSolid = (bind, transform) => {
  const { box, rest } = boundBox(bind);
  return posedSolid(
    {
      positions: [0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) =>
        [0, 1, 2].map((a) => ((i >> a) & 1 ? box.max[a] : box.min[a])),
      ),
      indices: BOX_FACES.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]),
    },
    composed(transform, rest),
  );
};

// Sweeps an angle from `from` toward `to` for the first angle where `hit` holds, in steps and then halving the step it
// came in, so a part cannot pass through a thin item to rest beyond it: `met`, that angle, and `short`, the last before
// it that missed; undefined when it never holds.
const sweepTo = (from, to, hit) => {
  let short = from,
    met;
  for (let i = 1; i <= SWEEP && met === undefined; i++) {
    const next = from + ((to - from) * i) / SWEEP;
    if (hit(next)) met = next;
    else short = next;
  }
  if (met === undefined) return undefined;
  for (let i = 0; i < STEPS; i++) {
    const mid = (short + met) / 2;
    if (hit(mid)) met = mid;
    else short = mid;
  }
  return { short, met };
};

const withAngles = (pose, bone, angles) => ({
  ...pose,
  rotations: { ...pose.rotations, [bone.id]: jointRotation(bone, angles) },
});

/**
 * Flexes each joint of a digit's `chain` in turn from the knuckle out until the part it moves, or any beyond it,
 * touches `solids`, or until its limit; the next joint then goes on from there. A joint whose parts the pose sinks in
 * opens instead until they rest on the surface, or, when its range cannot lift them clear, opens fully and leaves the
 * next joint out to free them. Returns the pose and whether the digit touched.
 */
function closeChain(rig, pose, chain, solids) {
  const apart = (p, moved) => nearest(rig, p, moved, solids) > CONTACT;
  let touched = false;
  chain.forEach((bone, k) => {
    // A thumb its root has laid on the item or the fingers keeps its phalanges as posed, pressing its pad where it
    // landed; bending them on would only lift the pad off.
    if (bone.digit === 'thumb' && touched) return;
    const moved = chain.slice(k);
    const [flex, twist, abduct] = jointAngles(bone, pose.rotations[bone.id] ?? IDENTITY_M);
    const at = (f) => withAngles(pose, bone, clampJointAngles(bone, [f, twist, abduct]));
    // The ends of the joint's range in the senses that close and open it: a phalanx curls toward the palm, while the
    // thumb's root, which a grip opens wide (lifted off the palm), comes back down onto the item from beyond it.
    const lowers = bone.digit === 'thumb' && k === 0;
    const [opened, end] = bone.sense[0] > 0 !== lowers ? bone.limits.flex : [...bone.limits.flex].reverse();
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

// The steps, in degrees, the thumb is seated at: its root's angles over their whole range, then every angle of the
// thumb in turn about the best few, each step finer than the last, as the thumb fits a handle in more than one hollow.
const ROOT_STEP = 20;
const REFINE = [8, 4, 2, 1, 0.5];
const SEEDS = 3;
// How much a seat counts a segment sunk past contact against one standing as far off the item, so the thumb comes to
// rest on the item and the fingers rather than in them. A thumb may sink no further than a finger, `CONTACT`.
const SINK = 100;
const AXES = ['flex', 'twist', 'abduct'];

// How far `p` lies outside `solid`, negative inside, when that is less than `bound`, and otherwise `bound` or more: a
// least depth over many points needs only what would lower it, and the search for the surface stops at `bound`.
const depthBelow = (solid, p, bound) => {
  if (bound <= 0) return signedDepth(solid, p, REACH);
  const depth = signedDepth(solid, p, Math.min(bound, REACH));
  return depth === -Infinity ? signedDepth(solid, p, REACH) : depth;
};

/**
 * Seats the thumb's `chain` on `solid`, beside the closed `fingers` (each a bone and its posed solid). Closing joint
 * by joint finds only where the thumb meets the item in the plane its root's roll and sweep across the palm leave it,
 * and its first segment lies on a handle from well before the rest of it can, so the thumb is seated instead: the
 * angles of its joints, the roll and the sweep across among them, are searched within their limits for the thumb whose
 * segments each come nearest bearing on the item, sunk into neither it nor the fingers. Only the thumb moves, so the
 * search carries the thumb alone from the hand and probes only the fingers near each segment. Returns the pose and
 * whether the thumb touched, or nothing when the best seat lays no segment short of the tip on the item: a thumb that
 * lies along an item bears on it before its tip, whereas one that only reaches it with its tip touches the near face,
 * and that item the thumb closes on as a finger does.
 */
function seatThumb(rig, pose, chain, solid, fingers) {
  const transforms = boneTransforms(rig.bones, pose);
  const hand = transforms.get(chain[0].parent);
  const probes = chain.map(probeOf);
  const parts = fingers.map(({ bone, solid: part }) => {
    const { centre, radius } = probeOf(bone);
    return { solid: part, centre: applyPoint(transforms.get(bone.id), centre), radius };
  });
  // Each joint angle with a range to search, a joint's others staying as the pose holds them.
  const free = chain.flatMap((bone, k) =>
    AXES.map((name, axis) => ({ k, axis, range: bone.limits[name] })).filter(({ range }) => range[1] > range[0]),
  );
  const held = chain.map((bone) => jointAngles(bone, pose.rotations[bone.id] ?? IDENTITY_M));
  const anglesAt = (x) => {
    const angles = held.map((a) => [...a]);
    free.forEach(({ k, axis }, i) => {
      angles[k][axis] = x[i];
    });
    return angles.map((a, k) => clampJointAngles(chain[k], a));
  };
  // Each segment's nearest approach to the item, and to the item or a finger, as `boneTransforms` carries it.
  const bearings = (x) => {
    let parent = hand;
    return anglesAt(x).map((angles, k) => {
      const bone = chain[k];
      const r = jointRotation(bone, angles);
      parent = { r: mulMM(parent.r, r), t: applyPoint(parent, sub(bone.head, mulMV(r, bone.head))) };
      const { points, centre, radius } = probes[k];
      const at = applyPoint(parent, centre);
      const near = parts.filter((part) => length(sub(part.centre, at)) < part.radius + radius + CONTACT);
      let gap = Infinity;
      let least = Infinity;
      for (const p of points) {
        const q = applyPoint(parent, p);
        gap = Math.min(gap, depthBelow(solid, q, gap));
        for (const part of near) least = Math.min(least, depthBelow(part.solid, q, CONTACT));
      }
      return { gap, least: Math.min(gap, least) };
    });
  };
  // Each segment's distance off the item past contact, and how far past contact it sinks into the item or the fingers,
  // the latter counting the more.
  const misfit = (x) =>
    bearings(x).reduce((sum, { gap, least }) => {
      const off = Math.max(0, gap - CONTACT);
      const sunk = Math.max(0, -least - CONTACT);
      return sum + off * off + SINK * sunk * sunk;
    }, 0);
  const clamped = (x) => x.map((v, i) => Math.min(free[i].range[1], Math.max(free[i].range[0], v)));
  const refined = (start) => {
    let { x, cost } = start;
    for (const step of REFINE) {
      for (let moved = true; moved; ) {
        moved = false;
        for (let i = 0; i < free.length; i++)
          for (const sign of [1, -1]) {
            const next = clamped(x.map((v, j) => (j === i ? v + sign * step : v)));
            const nextCost = misfit(next);
            if (nextCost < cost) [x, cost, moved] = [next, nextCost, true];
          }
      }
    }
    return { x, cost };
  };
  const root = free.flatMap(({ k }, i) => (k === 0 ? [i] : []));
  const grid = root.reduce(
    (points, i) => {
      const [from, to] = free[i].range;
      const steps = Math.ceil((to - from) / ROOT_STEP);
      return points.flatMap((x) =>
        Array.from({ length: steps + 1 }, (_, s) => x.map((v, j) => (j === i ? from + ((to - from) * s) / steps : v))),
      );
    },
    [clamped(free.map(({ k, axis }) => held[k][axis]))],
  );
  const byCost = (a, b) => a.cost - b.cost;
  const [best] = grid
    .map((x) => ({ x, cost: misfit(x) }))
    .sort(byCost)
    .slice(0, SEEDS)
    .map(refined)
    .sort(byCost);
  const seated = bearings(best.x);
  if (!seated.slice(0, -1).some(({ gap }) => gap <= CONTACT)) return null;
  const angles = anglesAt(best.x);
  return { pose: chain.reduce((p, bone, k) => withAngles(p, bone, angles[k]), pose), touched: true };
}

/**
 * Closes the digits of `handId` on `solid` (a posed solid, `clearance.mjs`, `posedSolid`), each joint in turn from the
 * knuckle out (`closeChain`), so a finger wraps a handle and a fingertip stops on a surface. The fingers close first
 * and the thumb last, on the item and on the closed fingers, so it comes to rest over them rather than through them.
 * The thumb is seated so it wraps the item, every segment bearing on it (`seatThumb`), and closes as a finger does on
 * an item it cannot lie along. Digits that touch nothing close fully; the digits named in `keep` stay as the pose has
 * them. Returns the pose and, per digit closed, how far it closed and whether it touched.
 */
export function closeHand(rig, pose, handId, solid, { keep = [] } = {}) {
  const closed = {};
  const digits = [...digitsOf(rig, handId)].sort(([a], [b]) => (a === 'thumb') - (b === 'thumb'));
  for (const [digit, chain] of digits) {
    if (keep.includes(digit)) continue;
    let touched;
    if (digit === 'thumb') {
      const transforms = boneTransforms(rig.bones, pose);
      const fingers = digits
        .filter(([other]) => other !== 'thumb')
        .flatMap(([, bones]) => bones)
        .map((bone) => ({ bone, solid: boxSolid(bone.bind, transforms.get(bone.id)) }));
      ({ pose, touched } =
        seatThumb(rig, pose, chain, solid, fingers) ??
        closeChain(rig, pose, chain, [solid, ...fingers.map((finger) => finger.solid)]));
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
 */
export function holdIssues(rig, handId, hold) {
  if (!isObject(hold)) return [`hold.${handId} is { model, at?, turn?, pole?, socket, grip?, slant?, pinch?, close? }`];
  const issues = [];
  const hand = boneById(rig).get(handId);
  if (!hand?.reach) issues.push(`hold.${handId}: ${handId} is not a reach bone`);
  else {
    if (!(hand.grip >= 0 && hand.grip <= 1)) issues.push(`hold.${handId}: ${handId} has no grip share in [0, 1]`);
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
  if (hold.grip !== undefined && !(hold.grip >= 0 && hold.grip <= 1))
    issues.push(`hold.${handId}.grip is a share in [0, 1]`);
  if (hold.slant !== undefined && !isSlant(hold.slant)) issues.push(`hold.${handId}.slant is degrees in [-90, 90]`);
  if (hold.pole !== undefined && !isVector(hold.pole))
    issues.push(`hold.${handId}.pole is a finite direction [x, y, z]`);
  if (!isObject(hold.socket)) issues.push(`hold.${handId}.socket is { at, into, axis }`);
  else {
    for (const key of Object.keys(hold.socket))
      if (!SOCKET_KEYS.has(key)) issues.push(`hold.${handId}.socket: unknown key ${key}`);
    for (const key of SOCKET_KEYS)
      if (!isVector(hold.socket[key])) issues.push(`hold.${handId}.socket.${key} is a finite [x, y, z]`);
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

// The hand's own socket in rest doll axes: the palm's face where `grip`, a share of the palm's length from the wrist,
// crosses it, the palm's normal, and the thumb's direction across the palm turned `slant` degrees toward the fingers,
// read off the palm part's box as the hand hangs down -y, which the doll's rest turn then carries.
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
const turnOf = (m) => (Math.acos(Math.min(1, Math.max(-1, (m[0] + m[4] + m[8] - 1) / 2))) * 180) / Math.PI;

// The joint `bone` set to `angles` in `pose`, each held to its limits, the held ones on `report` when held by more
// than the twist sweep's last step leaves.
const HELD_BY = 0.05;
const setJoint = (pose, bone, angles, report) => {
  const kept = clampJointAngles(bone, angles);
  if (kept.some((a, i) => Math.abs(a - angles[i]) > HELD_BY))
    report?.push({ bone: bone.id, asked: angles, held: kept });
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
    return {
      twist,
      angles,
      short: turnOf(mulMM(transpose(jointRotation(hand, clampJointAngles(hand, angles))), local)),
    };
  };
  // The least short wins; among equals, the twist that moves the parent least from where the pose has it.
  const better = (a, b) =>
    !b ||
    a.short < b.short - 1e-6 ||
    (Math.abs(a.short - b.short) <= 1e-6 && Math.abs(a.twist - parentAngles[1]) < Math.abs(b.twist - parentAngles[1]));
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
  for (let i = 1; i < TWIST_STEPS.length; i++)
    best = sweep(
      Math.max(min, best.twist - TWIST_STEPS[i - 1]),
      Math.min(max, best.twist + TWIST_STEPS[i - 1]),
      TWIST_STEPS[i],
    );
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
  const own = palmSocket(hand, hold.grip ?? hand.grip, hold.slant ?? hand.gripSlant);
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
      const angles = jointAngles(bone, local),
        kept = clampJointAngles(bone, angles);
      if (kept.some((a, k) => Math.abs(a - angles[k]) > 1e-6)) report?.push({ bone: id, asked: angles, held: kept });
      pose = { ...pose, rotations: { ...pose.rotations, [id]: jointRotation(bone, kept) } };
    }
    residual = length(sub(applyPoint(boneTransforms(rig.bones, pose).get(tip.id), reach), target));
  }
  return { pose, residual };
}

// How far back from the tip a digit's pad lies, as a share of its last phalanx.
const PAD = 0.3;

/**
 * The pad of a digit's last bone `tip` in rest doll axes: on the face of its part the palm faces, near the tip, read off
 * its box as the hand hangs down -y, which the doll's rest turn then carries.
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
 */
export function pinchItem(rig, pose, handId, pinch, item) {
  const digits = digitsOf(rig, handId);
  const pinched = {};
  for (const [digit, point] of Object.entries(pinch)) {
    const chain = digits.get(digit);
    let residual;
    ({ pose, residual } = solveCCD(
      rig,
      pose,
      chain.map((bone) => bone.id),
      applyPoint(item, point),
      { end: padOf(chain.at(-1)) },
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
