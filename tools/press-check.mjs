// The press check's pose files (models/poses/press-*.json) from their key frames (models/poses/press-check.libsonnet).
// A frame places the rifle against the posed figure (the stance moves the shoulder and the ground lift moves the whole
// figure), so its pose file states world points that would drift from the frames if written by hand.
// Usage: node tools/press-check.mjs [--built built]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { gunMovers } from '../site/heldMotion.mjs';
import { add, mat3ToQuat, mulMM, mulMV, rotX, rotY, rotZ, sub } from '../site/kinematics.mjs';
import { compareNumbered } from './codeUnitOrder.mjs';
import { dollRig, readRigContent } from './dollRig.mjs';
import { readDoll, readDressing } from './dress.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { lookAt, poseJson, r4, shoulderPoints, standing } from './keyFrames.mjs';
import { posePoint } from './packages/motion/src/motion.ts';
import { anchorPoint, graspOf, handSocket, heldItems, heldWeapon } from './wields.mjs';

const repo = resolve(import.meta.dirname, '..');
const POSES = 'models/poses';

export const readPressCheck = (root = repo) =>
  JSON.parse(evaluateJsonnet(`import '${POSES}/press-check.libsonnet'`, root));

/** Each part of a gun its sidecar moves, its motion keyed by the part. */
export const partMotions = (entry) =>
  Object.fromEntries(gunMovers(entry.gun).map(({ node, motion }) => [node.split(':')[0], motion]));

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

/**
 * The press check's pose files by name, for `rig`, from `check` (`readPressCheck`), the rifle as `heldWeapon` gives it
 * and the motions of its moving parts (`partMotions`). Each rifle point the check names is read off the rifle's
 * anchors, and one `on` a moving part is carried by that part's motion as far as the frame's `moved` stands it; a
 * frame's hold naming a socket takes that one of the check's `sockets`.
 */
export function pressCheckPoses(rig, check, rifle, motions) {
  const pocket = shoulderPoints(rig, check.stance)('hand.R', check.pocket);
  const restPoint = (named) => anchorPoint(rifle, named);
  const sockets = Object.fromEntries(
    Object.entries(check.sockets).map(([name, hand]) => [name, handSocket(rifle, hand)]),
  );
  const butt = restPoint(check.butt);

  // The rifle turned by its carry, yaw then pitch then roll about its own bore, its butt pad in the pocket.
  const placed = ({ pitch, yaw, roll }) => {
    const turn = [rotY(yaw), rotX(pitch), rotZ(roll)].reduce(mulMM);
    return { turn, at: sub(pocket, mulMV(turn, butt)) };
  };
  const inWorld = (place, p) => add(mulMV(place.turn, p), place.at);

  const poseOf = ({ carry, gripPole, look, tilt = 0, left, moved }) => {
    const point = (named) => {
      if (named.on === undefined) return restPoint(named);
      const motion = motions[named.on];
      if (!motion) throw new Error(`press check: ${check.rifle} has no moving ${named.on}`);
      return posePoint(motion, restPoint(named), moved?.[named.on] ?? 0);
    };
    const place = placed(carry);
    const held = { model: check.rifle, at: r4(place.at), turn: r4(mat3ToQuat(place.turn)) };
    const file = {
      ...standing(rig),
      angles: { ...check.stance, ...lookAt(rig, check.stance, inWorld(place, point(look)), { tilt }) },
      hands: { 'hand.R': check.sockets.grip.hands, 'hand.L': left.hands },
      hold: { 'hand.R': { ...held, pole: gripPole, socket: sockets.grip, ...graspOf(check.sockets.grip) } },
    };
    const { grip, slant, beneath, pole, pinch, close } = left.hold;
    const socket =
      typeof left.hold.socket === 'string'
        ? sockets[left.hold.socket]
        : { ...left.hold.socket, at: point(left.hold.socket.at) };
    const unroll = beneath ? rotZ(-carry.roll) : rotZ(0);
    file.hold['hand.L'] = {
      ...held,
      pole,
      socket: {
        at: r4(mulMV(unroll, socket.at)),
        into: r4(mulMV(unroll, socket.into)),
        axis: r4(mulMV(unroll, socket.axis)),
      },
      ...(grip !== undefined ? { grip } : {}),
      ...(slant !== undefined ? { slant } : {}),
      ...(pinch ? { pinch: Object.fromEntries(Object.entries(pinch).map(([digit, p]) => [digit, r4(point(p))])) } : {}),
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
  const rifle = heldWeapon(entryOf(check.rifle), meshOf(check.rifle));
  const poses = pressCheckPoses(rig, check, rifle, partMotions(entryOf(check.rifle)));
  for (const [name, file] of Object.entries(poses))
    writeFileSync(join(repo, POSES, `${name}.json`), `${poseJson(file)}\n`);
  console.log(`${Object.keys(poses).length} press-check poses -> ${POSES}`);
}
