// The press check's pose files (models/poses/press-*.json) from their key frames (models/poses/press-check.libsonnet).
// A frame places the rifle against the posed figure (the stance moves the shoulder and the ground lift moves the whole
// figure), so its pose file states world points that would drift from the frames if written by hand.
// Usage: node tools/press-check.mjs [--built built]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { add, mat3ToQuat, mulMM, mulMV, rotX, rotY, rotZ, sub } from '../site/kinematics.mjs';
import { compareNumbered } from './codeUnitOrder.mjs';
import { dollRig, readRigContent } from './dollRig.mjs';
import { readDoll, readDressing } from './dress.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { lookAt, poseJson, r4, shoulderPoints, standing } from './keyFrames.mjs';
import { poseAt } from './packages/motion/src/motion.ts';
import { graspOf, handSocket, heldItems, heldWeapon } from './wields.mjs';

const repo = resolve(import.meta.dirname, '..');
const POSES = 'models/poses';

export const readPressCheck = (root = repo) =>
  JSON.parse(evaluateJsonnet(`import '${POSES}/press-check.libsonnet'`, root));

/** How far each moving part of a gun slides at the end of its motion, in metres in the model's frame, keyed by part. */
export const partStrokes = (entry) =>
  Object.fromEntries(
    Object.values(entry.gun.action.parts).map(({ node, motion }) => [node.split(':')[0], poseAt(motion, 1).shift]),
  );

/**
 * The press check as a clip of its pose files: each key a fixture and the seconds from the start at which the figure
 * stands in it, the frames in their names' numbered order, a held frame keyed where it arrives and where it leaves.
 */
export function pressCheckClip(check) {
  const names = Object.keys(check.frames).sort((a, b) => compareNumbered(a, b));
  const keys = [];
  let at = 0;
  for (const [k, name] of names.entries()) {
    const { into, hold = 0 } = check.frames[name];
    if (k > 0 && !(into > 0)) throw new Error(`press check ${name}: into must be seconds above 0`);
    if (k === 0 && into !== undefined)
      throw new Error(`press check ${name}: the first frame has nothing to move in from`);
    if (!(hold >= 0)) throw new Error(`press check ${name}: hold must be seconds, 0 or more`);
    at += into ?? 0;
    keys.push({ fixture: name, at });
    if (hold > 0) {
      at += hold;
      keys.push({ fixture: name, at });
    }
  }
  return { keys, easing: check.easing };
}

/** The rifle's sockets the press check names (`check.sockets`), on the rifle as `heldWeapon` gives it. */
export const pressCheckSockets = (check, rifle) =>
  Object.fromEntries(Object.entries(check.sockets).map(([name, hand]) => [name, handSocket(rifle, hand)]));

/**
 * The press check's pose files by name, for `rig`, from `check` (`readPressCheck`), the rifle's part strokes and its
 * sockets (`pressCheckSockets`); a frame's hold naming a socket takes that one.
 */
export function pressCheckPoses(rig, check, strokes, sockets) {
  const pocket = shoulderPoints(rig, check.stance)('hand.R', check.pocket);

  // The rifle turned by its carry, yaw then pitch then roll about its own bore, its butt pad in the pocket.
  const placed = ({ pitch, yaw, roll }) => {
    const turn = [rotY(yaw), rotX(pitch), rotZ(roll)].reduce(mulMM);
    return { turn, at: sub(pocket, mulMV(turn, check.butt)) };
  };
  const inWorld = (rifle, p) => add(mulMV(rifle.turn, p), rifle.at);

  const poseOf = ({ carry, gripPole, look, tilt = 0, left, moved }) => {
    const rifle = placed(carry);
    const held = { model: check.rifle, at: r4(rifle.at), turn: r4(mat3ToQuat(rifle.turn)) };
    const file = {
      ...standing(rig),
      angles: { ...check.stance, ...lookAt(rig, check.stance, inWorld(rifle, look), { tilt }) },
      hands: { 'hand.R': check.sockets.grip.hands, 'hand.L': left.hands },
      hold: { 'hand.R': { ...held, pole: gripPole, socket: sockets.grip, ...graspOf(check.sockets.grip) } },
    };
    const { grip, slant, beneath, pole, pinch, close } = left.hold;
    const socket = typeof left.hold.socket === 'string' ? sockets[left.hold.socket] : left.hold.socket;
    const unroll = beneath ? rotZ(-carry.roll) : rotZ(0);
    const drawn = (p) =>
      add(
        p,
        strokes['charging-handle'].map((x) => x * (left.drawn ?? 0)),
      );
    file.hold['hand.L'] = {
      ...held,
      pole,
      socket: {
        at: r4(drawn(mulMV(unroll, socket.at))),
        into: r4(mulMV(unroll, socket.into)),
        axis: r4(mulMV(unroll, socket.axis)),
      },
      ...(grip !== undefined ? { grip } : {}),
      ...(slant !== undefined ? { slant } : {}),
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
  const { meshOf, entryOf } = heldItems(built, manifest);
  const sockets = pressCheckSockets(check, heldWeapon(entryOf(check.rifle), meshOf(check.rifle)));
  const poses = pressCheckPoses(rig, check, partStrokes(entryOf(check.rifle)), sockets);
  for (const [name, file] of Object.entries(poses))
    writeFileSync(join(repo, POSES, `${name}.json`), `${poseJson(file)}\n`);
  console.log(`${Object.keys(poses).length} press-check poses -> ${POSES}`);
}
