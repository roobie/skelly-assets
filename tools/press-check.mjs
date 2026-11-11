// The press check's pose files (models/poses/press-*.json) from their key frames (models/poses/press-check.libsonnet).
// A frame places the rifle against the posed figure (the stance moves the shoulder and the ground lift moves the whole
// figure), so its pose file states world points that would drift from the frames if written by hand.
// Usage: node tools/press-check.mjs [--built built]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { add, applyPoint, boneTransforms, jointRotation, mat3ToQuat, mulMM, mulMV, quatToMat3, rotX, rotY, rotZ, sub } from '../site/kinematics.mjs';
import { groundLift } from '../site/poseFile.mjs';
import { dollRig, readRigContent } from './dollRig.mjs';
import { readDoll, readDressing } from './dress.mjs';
import { glbJson } from './glb.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';

const repo = resolve(import.meta.dirname, '..');
const POSES = 'models/poses';
const DEG = Math.PI / 180;
const r4 = (v) => v.map((x) => Math.round(x * 1e4) / 1e4 || 0);

export const readPressCheck = (root = repo) => JSON.parse(evaluateJsonnet(`import '${POSES}/press-check.libsonnet'`, root));

/** How far each moving part of a GLB slides at the far end of its linear motion, in metres in the model's frame. */
export function partStrokes(glb) {
  const gltf = glbJson(glb);
  const unit = gltf.nodes.find((node) => node.extras?.gungen)?.extras.gungen.metresPerUnit;
  const strokes = {};
  const walk = (index, turn) => {
    const node = gltf.nodes[index];
    const own = node.rotation ? mulMM(turn, quatToMat3(node.rotation)) : turn;
    const motion = node.extras?.motion;
    if (motion?.kind === 'linear') strokes[node.name.split(':')[0]] = mulMV(own, sub(motion.rearmost, motion.rest).map((x) => x * unit));
    for (const child of node.children ?? []) walk(child, own);
  };
  for (const index of gltf.scenes[gltf.scene ?? 0].nodes) walk(index, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  return strokes;
}

// One axis of a look shared between two joints in proportion to how far each turns that way.
const share = (angle, [lowA, highA], [lowB, highB]) => {
  const a = angle >= 0 ? highA : -lowA, b = angle >= 0 ? highB : -lowB;
  return [angle * a / (a + b), angle * b / (a + b)];
};

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

/** The press check's pose files by name, for `rig`, from `check` (`readPressCheck`) and the rifle's part strokes. */
export function pressCheckPoses(rig, check, strokes) {
  const bone = (id) => rig.bones.find((b) => b.id === id);
  const posedAt = (angles) => {
    const rotations = Object.fromEntries(Object.entries(angles).map(([id, a]) => [id, jointRotation(bone(id), a)]));
    const transforms = boneTransforms(rig.bones, { root: [0, groundLift(rig, { root: [0, 0, 0], rotations }), 0], rotations });
    return (id, p = bone(id).head) => applyPoint(transforms.get(id), p);
  };
  const stand = posedAt(check.stance);
  const pocket = stand('spine', add(bone('upperArm.R').head, check.pocket));

  // The rifle turned by its carry, yaw then pitch then roll about its own bore, its butt pad in the pocket.
  const placed = ({ pitch, yaw, roll }) => {
    const turn = [rotY(yaw), rotX(pitch), rotZ(roll)].reduce(mulMM);
    return { turn, at: sub(pocket, mulMV(turn, check.butt)) };
  };
  const inWorld = (rifle, p) => add(mulMV(rifle.turn, p), rifle.at);

  // The neck and head turned to bring the eyes onto `target`, past the stance's own lean and twist, and tilted `tilt`
  // toward the figure's right. Turning the head moves the eyes, so the aim is taken again from where they end.
  const lookAt = (target, tilt) => {
    const [neckTilt, headTilt] = share(tilt, bone('neck').limits.abduct, bone('head').limits.abduct);
    let pitch = 0, twist = 0, angles;
    for (let pass = 0; pass < 4; pass++) {
      const [neckPitch, headPitch] = share(pitch, bone('neck').limits.flex, bone('head').limits.flex);
      const [neckTwist, headTwist] = share(twist, bone('neck').limits.twist, bone('head').limits.twist);
      angles = { neck: r4([neckPitch, neckTwist, neckTilt]), head: r4([headPitch, headTwist, headTilt]) };
      const d = sub(target, posedAt({ ...check.stance, ...angles })('head', add(bone('head').head, check.eye)));
      pitch = -Math.atan2(d[1], Math.hypot(d[0], d[2])) / DEG - check.stance.spine[0];
      twist = Math.atan2(d[0], d[2]) / DEG - check.stance.spine[1];
    }
    return angles;
  };

  const poseOf = ({ carry, gripPole, look, tilt = 0, left, moved }) => {
    const rifle = placed(carry);
    const held = { model: check.rifle, at: r4(rifle.at), turn: r4(mat3ToQuat(rifle.turn)) };
    const file = {
      rig: { id: rig.id, revision: rig.revision },
      ground: true,
      level: ['foot.R', 'foot.L'],
      angles: { ...check.stance, ...lookAt(inWorld(rifle, look), tilt) },
      hands: { 'hand.L': left.hands },
      hold: { 'hand.R': { ...held, pole: gripPole, socket: check.grip.socket } },
    };
    const { socket, grip, beneath, pole, pinch, close } = left.hold;
    const unroll = beneath ? rotZ(-carry.roll) : rotZ(0);
    const drawn = (p) => add(p, strokes['charging-handle'].map((x) => x * (left.drawn ?? 0)));
    file.hold['hand.L'] = {
      ...held,
      pole,
      socket: { at: r4(drawn(mulMV(unroll, socket.at))), into: r4(mulMV(unroll, socket.into)), axis: r4(mulMV(unroll, socket.axis)) },
      ...(grip !== undefined ? { grip } : {}),
      ...(pinch ? { pinch: Object.fromEntries(Object.entries(pinch).map(([digit, p]) => [digit, r4(drawn(p))])) } : {}),
      ...(close === false ? { close } : {}),
    };
    if (moved) file.moved = { [check.rifle]: moved };
    return file;
  };
  return Object.fromEntries(Object.entries(check.frames).map(([name, frame]) => [name, poseOf(frame)]));
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { built: { type: 'string', default: join(repo, 'built') } } });
  const built = resolve(values.built);
  const manifest = JSON.parse(readFileSync(join(built, 'manifest.json'), 'utf8'));
  const dressing = readDressing(repo);
  const rig = dollRig(readRigContent(repo), readDoll(built, manifest, dressing), dressing);
  const check = readPressCheck(repo);
  const rifle = manifest.models.find((model) => model.id === check.rifle && model.path.endsWith('.glb'));
  const poses = pressCheckPoses(rig, check, partStrokes(readFileSync(join(built, rifle.pack, rifle.path))));
  for (const [name, file] of Object.entries(poses)) writeFileSync(join(repo, POSES, `${name}.json`), `${poseJson(file)}\n`);
  console.log(`${Object.keys(poses).length} press-check poses -> ${POSES}`);
}
