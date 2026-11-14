// The doll's melee wields (models/poses/wields/wields.libsonnet): each class's stances and strikes as pose files
// (models/poses/<class>_<action>_<kind>[-<key>].json), as sequences the pose page plays, and as baked clips a game plays
// (`wieldClips`). A key frame states where the weapon's grip is and how it is turned against the chest, so its pose file
// states world points that would drift from the frame if written by hand, as the press check's do.
// Usage: node tools/wields.mjs [--built built]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { posedSolid, signedDepth } from '../site/clearance.mjs';
import { decodeFrame, easingOf } from '../site/clipFrames.mjs';
import { add, applyPoint, boneTransforms, clampJointAngles, mat3ToQuat, mulMM, mulMV, normalize, rotX, rotY, rotZ, scale, sub, transpose } from '../site/kinematics.mjs';
import { compilePose, frameAngles } from '../site/poseFile.mjs';
import { dollRig, readRigContent, treeMeshes } from './dollRig.mjs';
import { readDoll, readDressing } from './dress.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { outputPath } from './layout.mjs';
import { lookAt, poseJson, r4 } from './keyFrames.mjs';

const repo = resolve(import.meta.dirname, '..');
const POSES = 'models/poses';

export const readWields = (root = repo) => JSON.parse(evaluateJsonnet(`import '${POSES}/wields/wields.libsonnet'`, root));

/** A strike's phases in the order it passes through them; the hit lands where `strike` ends. */
export const PHASES = ['windup', 'strike', 'follow', 'recovery'];
// The key frame each phase but the last ends in; the last returns to the guard it began from.
const ENDS = { windup: 'windup', strike: 'hit', follow: 'follow' };

/** A clip's name: its class, its action (`stance` or `strike`) and which of them. */
export const clipName = (cls, action, kind) => `${cls}_${action}_${kind}`;
const keyName = (clip, key) => `${clip}-${key}`;

/**
 * A strike's phases as shares of its span, each `{ phase, from, to }` in `PHASES` order, from its `shares`, the
 * percentage each phase takes; the shares must be positive and sum to 100, so the phases meet end to end.
 */
export function strikePhases(strike) {
  const shares = PHASES.map((phase) => strike.shares?.[phase]);
  if (!shares.every((share) => share > 0)) throw new Error(`a strike gives each of ${PHASES.join(', ')} a positive share`);
  const total = shares.reduce((sum, share) => sum + share, 0);
  if (Math.abs(total - 100) > 1e-9) throw new Error(`a strike's shares sum to 100, not ${total}`);
  let at = 0;
  return PHASES.map((phase, i) => ({ phase, from: at / 100, to: (at += shares[i]) / 100 }));
}

// ---- a weapon in the hands ----

const fromEulerXyz = ([x, y, z]) => [rotX(x), rotY(y), rotZ(z)].reduce(mulMM);

/**
 * What the wields need of a held model, from its things sidecar (`grip`, `roll`) and its mesh: the turn `held` that
 * carries its file's axes onto the held axes (working end +z, up +y), the grip point `at` in its file, and its solid.
 */
export function heldWeapon(entry, mesh) {
  const held = mulMM(fromEulerXyz(entry.grip?.turn ?? [0, 0, 0]), rotZ(entry.roll ?? 0));
  return { held, at: entry.grip?.at ?? [0, 0, 0], solid: posedSolid(mesh, { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] }) };
}

/**
 * The socket a hand closes on, in the weapon's file: `seat` metres along the handle from the grip point toward the
 * working end, the palm on the handle's surface on the side `into` (held axes) points away from, the thumb toward the
 * working end. The handle runs along the held +z, so the surface is found by depth from the axis.
 */
export function gripSocket(weapon, { seat, into }) {
  const toFile = transpose(weapon.held);
  const axis = mulMV(toFile, [0, 0, 1]);
  const centre = add(weapon.at, scale(axis, seat));
  const across = mulMV(toFile, normalize([into[0], into[1], 0]));
  const radius = -signedDepth(weapon.solid, centre);
  if (!(radius > 0)) throw new Error(`grip seat ${seat} lies off the handle`);
  return { at: r4(sub(centre, scale(across, radius))), into: r4(across), axis: r4(axis) };
}

// ---- key frames ----

const lerpV = (a, b, w) => a.map((x, i) => x + (b[i] - x) * w);
const mapValues = (object, f) => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, f(value, key)]));
const HEADER = { ground: true, level: ['foot.R', 'foot.L'] };

/**
 * The pose file of key frame `key` of class `cls` (`readWields().classes`), for `rig`, the weapon (`heldWeapon`) and its
 * hands' sockets (`gripSocket`) given when the class wields one. Points are read off the figure as its body angles
 * stand it, from the shoulder of the hand they belong to (a grip point from the class's leading hand's), in the chest's
 * frame, so a twisting chest carries the hands round with it.
 */
function poseOf(rig, cls, key, weapon, sockets) {
  const bone = (id) => rig.bones.find((b) => b.id === id);
  const shoulder = (hand) => bone(bone(hand).reach.chain[0]).head;
  const header = { rig: { id: rig.id, revision: rig.revision }, ...HEADER };
  const stood = boneTransforms(rig.bones, decodeFrame(compilePose(rig, { ...header, angles: key.body }).frame));
  const chest = stood.get('spine');
  const inChest = (hand, p) => applyPoint(chest, add(shoulder(hand), p));
  const file = { ...header, angles: { ...key.body, ...lookAt(rig, key.body, cls.look) }, hands: {}, reach: {}, hold: {} };
  if (cls.weapon) {
    const { pitch, yaw, roll } = key.weapon.aim;
    const r = [chest.r, rotY(yaw), rotX(pitch), rotZ(roll), weapon.held].reduce(mulMM);
    const at = sub(inChest(cls.weapon.lead, key.weapon.at), mulMV(r, weapon.at));
    for (const [hand, { hands }] of Object.entries(cls.weapon.hands)) {
      file.hands[hand] = hands;
      file.hold[hand] = { model: cls.weapon.model, at: r4(at), turn: r4(mat3ToQuat(r)), pole: key.weapon.poles[hand], socket: sockets[hand] };
    }
  }
  for (const [hand, { hands }] of Object.entries(cls.free ?? {})) {
    const { at, pole, twist = 0, wrist = [0, 0] } = key.free[hand];
    file.hands[hand] = hands;
    file.angles[hand] = [wrist[0], 0, wrist[1]];
    file.reach[hand] = { target: r4(inChest(hand, at)), pole, twist };
  }
  for (const part of ['hands', 'reach', 'hold']) if (Object.keys(file[part]).length === 0) delete file[part];
  return file;
}

/**
 * What the wields need of the built tree: each class's weapon (`heldWeapon`) and its hands' sockets (`gripSocket`),
 * by class. `entryOf(model)` gives a held model's things sidecar and `meshOf(model)` its closed mesh.
 */
export function wieldWeapons(wields, entryOf, meshOf) {
  return mapValues(wields.classes, (cls) => {
    if (!cls.weapon) return {};
    const weapon = heldWeapon(entryOf(cls.weapon.model), meshOf(cls.weapon.model));
    return { weapon, sockets: mapValues(cls.weapon.hands, (hand) => gripSocket(weapon, hand)) };
  });
}

/** Every wield's pose files by name: each stance, and each strike's key frames (`ENDS`). */
export function wieldPoses(rig, wields, weapons) {
  const poses = {};
  for (const [name, cls] of Object.entries(wields.classes)) {
    const { weapon, sockets } = weapons[name];
    for (const [stance, key] of Object.entries(cls.stances)) poses[clipName(name, 'stance', stance)] = poseOf(rig, cls, key, weapon, sockets);
    for (const [strike, spec] of Object.entries(cls.strikes)) {
      for (const key of Object.values(ENDS)) poses[keyName(clipName(name, 'strike', strike), key)] = poseOf(rig, cls, spec[key], weapon, sockets);
    }
  }
  return poses;
}

// Each phase's easing, the wields' own unless the strike names one.
const easings = (wields, strike) => PHASES.map((phase) => strike.easing?.[phase] ?? wields.easing[phase]);

/** Each strike as a sequence of its pose files for the pose page: guard, the three keys and back, at their seconds. */
export function wieldSequences(wields) {
  const sequences = {};
  for (const [name, cls] of Object.entries(wields.classes)) {
    for (const [strike, spec] of Object.entries(cls.strikes)) {
      const clip = clipName(name, 'strike', strike);
      const guard = clipName(name, 'stance', 'guard');
      const phases = strikePhases(spec);
      sequences[clip] = {
        keys: [{ fixture: guard, at: 0 }, ...phases.map(({ phase, to }) => ({ fixture: ENDS[phase] ? keyName(clip, ENDS[phase]) : guard, at: to * spec.seconds }))],
        easing: easings(wields, spec),
      };
    }
  }
  return sequences;
}

// The bones that move a hand to a hold: its arm from the shoulder down, the digits too. Parents come first in the rig.
const armBones = (rig, hand) => {
  const ids = new Set([rig.bones.find((bone) => bone.id === hand).reach.chain[0]]);
  for (const bone of rig.bones) if (ids.has(bone.parent)) ids.add(bone.id);
  return ids;
};

/**
 * Where the weapon rides on its leading hand: the transform `{ r, t }` that carries the weapon's file into the hand
 * bone's rest frame, read off a compiled frame and the weapon's world transform in it. The palm sits on its socket in
 * every key frame, so one seat serves the class.
 */
function seatOn(rig, frame, item, lead) {
  const hand = boneTransforms(rig.bones, decodeFrame(frame)).get(lead);
  const back = transpose(hand.r);
  return { r: mulMM(back, item.r), t: mulMV(back, sub(item.t, hand.t)) };
}

/**
 * The seat as a game reads it: the leading hand's bone, and the weapon's grip point and held axes (working end +z, up
 * +y) in that bone's rest frame, so the bone's transform carries them and a game seats any weapon of the class by its
 * own grip.
 */
const heldSeat = (seat, weapon, lead) => ({
  bone: lead,
  at: r4(add(mulMV(seat.r, weapon.at), seat.t)),
  turn: r4(mat3ToQuat(mulMM(seat.r, transpose(weapon.held)))),
});

/**
 * Every wield baked for a game: stances as one-frame clips, and strikes as clips of frames evenly through their span.
 * Between key frames each joint turns from one key's angles to the next's by its phase's easing, as the pose page blends
 * them, so a swing sweeps an arc and no joint passes its limits. The weapon rides the leading hand; any other hand on it
 * takes it again by its socket in every frame. A strike carries its phases' ends and its hit in Sim seconds; a weapon
 * class's clips carry the held seat (`heldSeat`). Returns the clips by name and each frame's pose report by clip, for a
 * caller that checks them.
 */
export function wieldClips(rig, wields, weapons, meshOf) {
  const clips = {}, reports = {};
  const header = { rig: { id: rig.id, revision: rig.revision }, ...HEADER };
  for (const [name, cls] of Object.entries(wields.classes)) {
    const { weapon, sockets } = weapons[name];
    const compileKey = (key) => {
      const file = poseOf(rig, cls, key, weapon, sockets);
      const { frame, report, held } = compilePose(rig, file, { meshOf });
      // Read back within the limits the frame was posed to, past rounding, so a blend of two keys stays inside them.
      const angles = mapValues(frameAngles(rig, frame), (turn, id) => clampJointAngles(rig.bones.find((bone) => bone.id === id), turn));
      return { frame, report, angles, poles: mapValues(file.hold ?? {}, ({ pole }) => pole), item: held[cls.weapon?.lead] };
    };
    const guard = compileKey(cls.stances.guard);
    const seat = cls.weapon && seatOn(rig, guard.frame, guard.item, cls.weapon.lead);
    const held = seat ? { held: heldSeat(seat, weapon, cls.weapon.lead) } : {};
    const others = cls.weapon ? Object.keys(cls.weapon.hands).filter((hand) => hand !== cls.weapon.lead) : [];
    const regripped = new Set(others.flatMap((hand) => [...armBones(rig, hand)]));
    // The frame `w` of the way from compiled key `a` to `b`.
    const between = (a, b, w) => {
      const ids = [...new Set([...Object.keys(a.angles), ...Object.keys(b.angles)])].filter((id) => !regripped.has(id));
      const angles = Object.fromEntries(ids.map((id) => [id, lerpV(a.angles[id] ?? [0, 0, 0], b.angles[id] ?? [0, 0, 0], w)]));
      const posed = compilePose(rig, { ...header, angles });
      if (others.length === 0) return posed;
      const hand = boneTransforms(rig.bones, decodeFrame(posed.frame)).get(cls.weapon.lead);
      const item = { r: mulMM(hand.r, seat.r), t: add(mulMV(hand.r, seat.t), hand.t) };
      const hold = Object.fromEntries(others.map((id) => [id, {
        model: cls.weapon.model,
        at: item.t,
        turn: mat3ToQuat(item.r),
        pole: normalize(lerpV(normalize(a.poles[id]), normalize(b.poles[id]), w)),
        socket: sockets[id],
      }]));
      const hands = Object.fromEntries(others.map((id) => [id, cls.weapon.hands[id].hands]));
      return compilePose(rig, { ...header, angles, hands, hold }, { meshOf });
    };
    for (const [stance, key] of Object.entries(cls.stances)) {
      const { frame, report } = compileKey(key);
      clips[clipName(name, 'stance', stance)] = { kind: 'pose', ...held, frames: [frame] };
      reports[clipName(name, 'stance', stance)] = [report];
    }
    for (const [strike, spec] of Object.entries(cls.strikes)) {
      const clip = clipName(name, 'strike', strike);
      const keys = [guard, ...Object.values(ENDS).map((key) => compileKey(spec[key])), guard];
      const phases = strikePhases(spec);
      const eases = easings(wields, spec);
      const count = Math.max(2, Math.round(spec.seconds * wields.framesPerSecond) + 1);
      const baked = Array.from({ length: count }, (_, k) => {
        const at = k / (count - 1);
        const i = phases.findLastIndex(({ from }) => from <= at);
        const { from, to } = phases[i];
        return between(keys[i], keys[i + 1], easingOf(eases, i)((at - from) / (to - from)));
      });
      clips[clip] = {
        kind: 'pose',
        loop: false,
        durationSimSeconds: spec.seconds,
        hitAtSimSeconds: r4([phases.find(({ phase }) => phase === 'strike').to * spec.seconds])[0],
        phases: phases.map(({ phase, to }) => ({ phase, endsAtSimSeconds: r4([to * spec.seconds])[0] })),
        ...held,
        frames: baked.map(({ frame }) => frame),
      };
      reports[clip] = baked.map(({ report }) => report);
    }
  }
  return { clips, reports };
}

/** The doll's rig and its parts' sites as the built tree holds them, with what the wields need of it. */
export function readWieldTree(built, root = repo) {
  const manifest = JSON.parse(readFileSync(join(built, 'manifest.json'), 'utf8'));
  return wieldTree(built, manifest, root);
}

/** As `readWieldTree`, for a tree whose models `manifest` lists. */
export function wieldTree(built, manifest, root = repo) {
  const dressing = readDressing(root);
  const doll = readDoll(built, manifest, dressing);
  const rig = dollRig(readRigContent(root), doll, dressing);
  const wields = readWields(root);
  const meshes = treeMeshes(built, manifest);
  const meshOf = (id) => meshes(id).reduce((mesh, part) => {
    const base = mesh.positions.length / 3;
    return { positions: [...mesh.positions, ...part.positions], indices: [...mesh.indices, ...part.indices.map((i) => base + i)] };
  }, { positions: [], indices: [] });
  const entryOf = (id) => {
    const { pack } = manifest.models.find((model) => model.id === id && model.path.endsWith('.glb'));
    return JSON.parse(readFileSync(join(built, pack, 'things', `${id}.model.json`), 'utf8'));
  };
  return { rig, doll, wields, meshOf, weapons: wieldWeapons(wields, entryOf, meshOf) };
}

// Where a release carries the doll's wields, in the pack of the doll's parts.
const MOTIONS = { id: 'doll_melee', pack: 'skelly.body', path: 'motions/doll.melee.json', rig: 'motions/doll.rig.json' };

/**
 * Writes the doll's rig and its baked wields into the built tree `out`, whose models `manifest` lists, for a game to
 * play: the rig a clip's frames turn, with each part's site on it, and the clips by name. Returns the files written,
 * under their packs, and the manifest's motions entry for them.
 */
export function exportWields(out, manifest, root = repo) {
  const { rig, doll, wields, meshOf, weapons } = wieldTree(out, manifest, root);
  const { clips, reports } = wieldClips(rig, wields, weapons, meshOf);
  const off = Object.entries(reports).flatMap(([clip, frames]) => frames.flatMap(({ clamped }, k) => (clamped.length ? [`${clip} frame ${k}`] : [])));
  if (off.length > 0) throw new Error(`wield frames past a limit: ${off.join(', ')}`);
  const files = {
    [MOTIONS.rig]: { ...rig, doll: doll.sites },
    [MOTIONS.path]: { rig: { id: rig.id, revision: rig.revision }, clips },
  };
  return {
    files: Object.entries(files).map(([path, value]) => {
      const file = outputPath(MOTIONS.pack, path);
      mkdirSync(dirname(join(out, file)), { recursive: true });
      writeFileSync(join(out, file), `${JSON.stringify(value)}\n`);
      return file;
    }),
    motions: [MOTIONS],
  };
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { built: { type: 'string', default: join(repo, 'built') } } });
  const { rig, wields, weapons } = readWieldTree(resolve(values.built));
  const poses = wieldPoses(rig, wields, weapons);
  for (const [name, file] of Object.entries(poses)) writeFileSync(join(repo, POSES, `${name}.json`), `${poseJson(file)}\n`);
  console.log(`${Object.keys(poses).length} wield poses -> ${POSES}`);
}
