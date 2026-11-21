// What the generators of key-frame pose files share (tools/press-check.mjs, tools/wields.mjs): how a pose file stands
// the figure and the figure so stood, so a frame's points are read off the figure as the pose file will stand it, the
// head turned to look at a point, and the layout pose files are written in.
import { decodeFrame } from '../site/clipFrames.mjs';
import { add, applyPoint, boneTransforms, mulMV, sub } from '../site/kinematics.mjs';
import { compilePose } from '../site/poseFile.mjs';

const DEG = Math.PI / 180;
export const r4 = (v) => v.map((x) => Math.round(x * 1e4) / 1e4 || 0);
// A rounded quaternion scaled back to unit length.
export const unitQuat = (q) => {
  const n = Math.hypot(...q);
  return q.map((c) => c / n);
};

/**
 * The head of a generated pose file for `rig`: the figure stood on the ground on level feet. The feet are the player
 * doll's bones, as the generators that use this (wields, press check) are the player's.
 */
export const standing = (rig) => ({
  rig: { id: rig.id, revision: rig.revision },
  ground: true,
  level: ['foot.R', 'foot.L'],
});

/** The rig posed by `angles` and stood as `standing` stands it: the world transform of each bone by id. */
export const posedAt = (rig, angles) =>
  boneTransforms(rig.bones, decodeFrame(compilePose(rig, { ...standing(rig), angles }).frame));

/**
 * Where a point a key frame gives from the shoulder of `hand`, in the chest's frame, stands in the world as `angles`
 * stand the figure: `(hand, p) => point`. Key frames give points so, as a twisting or leaning chest carries the hands
 * and a shouldered stock round with it.
 */
export function shoulderPoints(rig, angles) {
  const bone = (id) => rig.bones.find((b) => b.id === id);
  const chest = posedAt(rig, angles).get('spine');
  return (hand, p) => applyPoint(chest, add(bone(bone(hand).reach.chain[0]).head, p));
}

// A look is turned again until its face misses by less than this many degrees on every axis, or for at most so many
// passes, as one held past a joint's limit never closes. A head bowed and tilted at once overshoots each pass by a
// little less than it did the last, so it closes slowly.
const LOOK_TOLERANCE = 0.01;
const LOOK_PASSES = 96;

// One axis of a look shared between two joints in proportion to how far each turns that way, past what each already
// turns (`fromA`, `fromB`), so a neck jutted forward keeps less of its forward bend for the look.
const share = (angle, limitsA, limitsB, fromA = 0, fromB = 0) => {
  const [lowA, highA] = limitsA.map((limit) => limit - fromA),
    [lowB, highB] = limitsB.map((limit) => limit - fromB);
  const a = angle >= 0 ? highA : -lowA,
    b = angle >= 0 ? highB : -lowB;
  return [(angle * a) / (a + b), (angle * b) / (a + b)];
};

/**
 * The neck and head angles that bring the eyes (the rig's `eye`, in the head's frame) onto `target` past the trunk's
 * own lean and twist, as `bearing` carries the head: tilted `tilt` degrees toward the figure's right, jutted forward by
 * the neck bending `jut` degrees forward and the head as far back, and leant `lean` degrees forward of the line the
 * eyes look along, as a head bowed over a stock looks out from under the brow. The tilt and lean are the face's own,
 * against the world's upright: each pass measures the posed face's heading, pitch and tilt and turns the look by what
 * they miss, since the neck's and head's tilt is taken about the trunk's forward axis, and once the trunk twists away
 * from the target, a tilt about that axis lifts the face and leans the head back. Turning the head moves the eyes, so
 * the aim is taken again from where they end. A look that never settles throws, so a target out of the neck's and
 * head's reach fails the pose rather than writing a head left wherever the last pass turned it.
 */
export function lookAt(rig, angles, target, { tilt = 0, jut = 0, lean = 0 } = {}) {
  const bone = (id) => rig.bones.find((b) => b.id === id);
  let pitch = 0,
    twist = 0,
    roll = tilt,
    look;
  for (let pass = 0; pass < LOOK_PASSES; pass++) {
    const [neckPitch, headPitch] = share(pitch, bone('neck').limits.flex, bone('head').limits.flex, jut, lean - jut);
    const [neckTwist, headTwist] = share(twist, bone('neck').limits.twist, bone('head').limits.twist);
    const [neckTilt, headTilt] = share(roll, bone('neck').limits.abduct, bone('head').limits.abduct);
    look = {
      neck: r4([neckPitch + jut, neckTwist, neckTilt]),
      head: r4([headPitch - jut + lean, headTwist, headTilt]),
    };
    const head = posedAt(rig, { ...angles, ...look }).get('head');
    const d = sub(target, applyPoint(head, add(bone('head').head, rig.eye)));
    const [x, y, z] = mulMV(head.r, [0, 0, 1]);
    const up = mulMV(head.r, [0, 1, 0]);
    const miss = [
      -Math.atan2(d[1], Math.hypot(d[0], d[2])) / DEG + lean + Math.asin(y) / DEG,
      (Math.atan2(d[0], d[2]) - Math.atan2(x, z)) / DEG,
      tilt - Math.asin((x * up[2] - z * up[0]) / Math.hypot(x, z)) / DEG,
    ];
    if (miss.every((m) => Math.abs(m) < LOOK_TOLERANCE)) return look;
    pitch += miss[0];
    twist += miss[1];
    roll += miss[2];
  }
  throw new Error(`the eyes do not settle on [${target}] in ${LOOK_PASSES} passes, the look ${JSON.stringify(look)}`);
}

// A pose file's JSON laid out as the hand-written ones are: one key per line, each value on its key's line while it fits.
const inline = (value) => {
  if (Array.isArray(value)) return `[${value.map(inline).join(', ')}]`;
  if (typeof value !== 'object' || value === null) return JSON.stringify(value);
  const entries = Object.entries(value).map(([key, v]) => `${JSON.stringify(key)}: ${inline(v)}`);
  return entries.length ? `{ ${entries.join(', ')} }` : '{}';
};
export function poseJson(value, indent = '') {
  const flat = inline(value);
  if (typeof value !== 'object' || value === null || Array.isArray(value) || indent.length + flat.length <= 100)
    return flat;
  const inner = `${indent}  `;
  return `{\n${Object.entries(value)
    .map(([key, v]) => `${inner}${JSON.stringify(key)}: ${poseJson(v, inner)}`)
    .join(',\n')}\n${indent}}`;
}
