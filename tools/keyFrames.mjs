// What the generators of key-frame pose files share (tools/press-check.mjs, tools/wields.mjs): the figure posed by
// its angles and stood on the ground, so a frame's points are read off the figure as the pose file will stand it, the
// head turned to look at a point, and the layout pose files are written in.
import { add, applyPoint, boneTransforms, jointRotation, sub } from '../site/kinematics.mjs';
import { groundLift } from '../site/poseFile.mjs';

const DEG = Math.PI / 180;
export const r4 = (v) => v.map((x) => Math.round(x * 1e4) / 1e4 || 0);

/** The rig posed by `angles` and stood on the ground: the world transform of each bone by id. */
export function posedAt(rig, angles) {
  const bone = (id) => rig.bones.find((b) => b.id === id);
  const rotations = Object.fromEntries(Object.entries(angles).map(([id, a]) => [id, jointRotation(bone(id), a)]));
  return boneTransforms(rig.bones, { root: [0, groundLift(rig, { root: [0, 0, 0], rotations }), 0], rotations });
}

// One axis of a look shared between two joints in proportion to how far each turns that way.
const share = (angle, [lowA, highA], [lowB, highB]) => {
  const a = angle >= 0 ? highA : -lowA, b = angle >= 0 ? highB : -lowB;
  return [angle * a / (a + b), angle * b / (a + b)];
};

/**
 * The neck and head angles that bring the eyes (the rig's `eye`, in the head's frame) onto `target` past the trunk's
 * own lean and twist, tilted `tilt` degrees toward the figure's right. Turning the head moves the eyes, so the aim is
 * taken again from where they end.
 */
export function lookAt(rig, angles, target, tilt = 0) {
  const bone = (id) => rig.bones.find((b) => b.id === id);
  const trunk = ['pelvis', 'spine'].map((id) => angles[id] ?? [0, 0, 0]);
  const [neckTilt, headTilt] = share(tilt, bone('neck').limits.abduct, bone('head').limits.abduct);
  let pitch = 0, twist = 0, look;
  for (let pass = 0; pass < 4; pass++) {
    const [neckPitch, headPitch] = share(pitch, bone('neck').limits.flex, bone('head').limits.flex);
    const [neckTwist, headTwist] = share(twist, bone('neck').limits.twist, bone('head').limits.twist);
    look = { neck: r4([neckPitch, neckTwist, neckTilt]), head: r4([headPitch, headTwist, headTilt]) };
    const d = sub(target, applyPoint(posedAt(rig, { ...angles, ...look }).get('head'), add(bone('head').head, rig.eye)));
    pitch = -Math.atan2(d[1], Math.hypot(d[0], d[2])) / DEG - trunk.reduce((sum, a) => sum + a[0], 0);
    twist = Math.atan2(d[0], d[2]) / DEG - trunk.reduce((sum, a) => sum + a[1], 0);
  }
  return look;
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
  if (typeof value !== 'object' || value === null || Array.isArray(value) || indent.length + flat.length <= 100) return flat;
  const inner = `${indent}  `;
  return `{\n${Object.entries(value).map(([key, v]) => `${inner}${JSON.stringify(key)}: ${poseJson(v, inner)}`).join(',\n')}\n${indent}}`;
}
