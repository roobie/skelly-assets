// The doll's wields, its melee weapons (models/poses/wields/wields.libsonnet) and its guns (models/poses/guns/
// guns.libsonnet): each class's stances and strikes as pose files (models/poses/<class>_<action>_<kind>[-<key>].json),
// as sequences the pose page plays, and as baked clips a game plays (`wieldClips`). A key frame states where the
// weapon's grip is and how it is turned against the chest, so its pose file states world points that would drift from
// the frame if written by hand, as the press check's do.
// Usage: node tools/wields.mjs [--built built]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { COINCIDENT, posedSolid, runAlong, signedDepth } from '../site/clearance.mjs';
import { decodeFrame, easingOf } from '../site/clipFrames.mjs';
import {
  add,
  applyPoint,
  boneTransforms,
  clampJointAngles,
  mat3ToQuat,
  mulMM,
  mulMV,
  normalize,
  quatToMat3,
  rotAxis,
  rotX,
  rotY,
  rotZ,
  scale,
  sub,
  transpose,
} from '../site/kinematics.mjs';
import { compilePose, frameAngles } from '../site/poseFile.mjs';
import { DOLL_MOTIONS, dollRig, readRigContent } from './dollRig.mjs';
import { dollFrom, dollModels, modelMeshes, readDressing } from './dress.mjs';
import { shardUnits } from './generation.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { lookAt, posedAt, poseJson, r4, shoulderPoints, standing } from './keyFrames.mjs';
import { outputPath, sidecarFile } from './layout.mjs';
import { armSwing, askedClamps, framePhase, readLocomotion, walkAngles, walkLoop } from './locomotion.mjs';
import { codeFingerprint, resultFolder } from './packages/thing-export/src/cache.ts';
import { SIDECAR_DIRECTORIES } from './recipeTools.mjs';

const repo = resolve(import.meta.dirname, '..');
const POSES = 'models/poses';

/**
 * A set of wields: `{ classes, framesPerSecond, easing }` from its content file under models/poses, each class's stances
 * and, for a set that swings, its strikes.
 */
export const readWields = (root = repo, file = 'wields/wields.libsonnet') =>
  JSON.parse(evaluateJsonnet(`import '${POSES}/${file}'`, root));

/** A strike's phases in the order it passes through them; the hit lands where `strike` ends. */
export const PHASES = ['windup', 'strike', 'follow', 'recovery'];
// The key frame each phase but the last ends in; the last returns to the guard it began from.
const ENDS = { windup: 'windup', strike: 'hit', follow: 'follow' };

/** A clip's name: its class, its action (`stance`, `strike` or a walk of the gait) and which of them. */
export const clipName = (cls, action, kind) => `${cls}_${action}_${kind}`;
const keyName = (clip, key) => `${clip}-${key}`;

/**
 * A strike's phases as shares of its span, each `{ phase, from, to }` in `PHASES` order, from its `shares`, the
 * percentage each phase takes; the shares must be positive and sum to 100, so the phases meet end to end.
 */
export function strikePhases(strike) {
  const shares = PHASES.map((phase) => strike.shares?.[phase]);
  if (!shares.every((share) => share > 0))
    throw new Error(`a strike gives each of ${PHASES.join(', ')} a positive share`);
  const total = shares.reduce((sum, share) => sum + share, 0);
  if (Math.abs(total - 100) > 1e-9) throw new Error(`a strike's shares sum to 100, not ${total}`);
  let from = 0;
  return PHASES.map((phase, i) => {
    const to = from + shares[i];
    const span = { phase, from: from / 100, to: to / 100 };
    from = to;
    return span;
  });
}

/** A strike's timing as its clip carries it, in Sim seconds: its span, its hit and where each phase ends. */
export function strikeTiming(strike) {
  const phases = strikePhases(strike);
  const seconds = (share) => r4([share * strike.seconds])[0];
  return {
    durationSimSeconds: seconds(1),
    hitAtSimSeconds: seconds(phases.find(({ phase }) => phase === 'strike').to),
    phases: phases.map(({ phase, to }) => ({ phase, endsAtSimSeconds: seconds(to) })),
  };
}

// ---- a weapon in the hands ----

const fromEulerXyz = ([x, y, z]) => [rotX(x), rotY(y), rotZ(z)].reduce(mulMM);

/**
 * What the wields need of a held model, from its sidecar (`grip`, `roll`, `anchors`) and its mesh: the turn `held`
 * that carries its file's axes onto the held axes (working end +z, up +y), the grip point `at` in its file, its named
 * points in its file (`anchors`, the grip point among them as `grip`), a gun's sight (`sight`: the `eye` point and the
 * `direction` it looks along, in its file) and its solid.
 */
export function heldWeapon(entry, mesh) {
  const held = mulMM(fromEulerXyz(entry.grip?.turn ?? [0, 0, 0]), rotZ(entry.roll ?? 0));
  const at = entry.grip?.at ?? [0, 0, 0];
  return {
    held,
    at,
    anchors: { ...entry.anchors, grip: at },
    sight: entry.gun?.sight,
    solid: posedSolid(mesh, { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] }),
  };
}

/**
 * The socket a hand closes on, in the weapon's file: `seat` metres along the handle from the grip point toward the
 * working end, on the handle's axis, the palm facing it from the side `into` (held axes) points away from, the thumb
 * toward the working end. A game's figure holds an item with its grip point on the palm's face, so the doll's palm
 * meets the axis rather than the handle's surface, and a clip baked on the doll seats the weapon in the figure's fist.
 */
export function gripSocket(weapon, { seat, into }) {
  const toFile = transpose(weapon.held);
  const axis = mulMV(toFile, [0, 0, 1]);
  const centre = add(weapon.at, scale(axis, seat));
  if (!(signedDepth(weapon.solid, centre) < 0)) throw new Error(`grip seat ${seat} lies off the handle`);
  return { at: r4(centre), into: r4(mulMV(toFile, normalize([into[0], into[1], 0]))), axis: r4(axis) };
}

/** The anchor `from` of the weapon (`heldWeapon`'s `anchors`) moved by `offset` (held axes, metres), in its file. */
export function anchorPoint(weapon, { from, offset = [0, 0, 0] }) {
  const anchor = weapon.anchors[from];
  if (!anchor) throw new Error(`the weapon has no ${from} anchor`);
  return add(anchor, mulMV(transpose(weapon.held), offset));
}

// How far a socket may lie from its anchor's point along `into`, past which the anchor is not on that part of the
// weapon.
const PRESS_REACH = 0.03;

/**
 * The socket a hand closes on at a named point of the weapon, in its file: the anchor `from` (`heldWeapon`'s
 * `anchors`), moved by `offset` (held axes, metres), pressed along `into` (held axes, from the palm into the weapon)
 * onto the weapon's surface, so a reshaped weapon carries the palm with it. `axis` is the way the thumb points.
 */
export function anchorSocket(weapon, { from, offset, into, axis }) {
  const toFile = transpose(weapon.held);
  const start = anchorPoint(weapon, { from, offset });
  const inward = mulMV(toFile, normalize(into));
  const depth = signedDepth(weapon.solid, start);
  // Out to the surface from inside, in to it from outside; a point already on it stays.
  const run =
    Math.abs(depth) < COINCIDENT
      ? 0
      : depth > 0
        ? runAlong(weapon.solid, start, inward)
        : -runAlong(weapon.solid, start, scale(inward, -1));
  if (!(Math.abs(run) <= PRESS_REACH)) throw new Error(`the socket from ${from} lies off the weapon along its into`);
  return { at: r4(add(start, scale(inward, run))), into: r4(mulMV(toFile, into)), axis: r4(mulMV(toFile, axis)) };
}

/** A hand's socket on the weapon: from a named point (`anchorSocket`) when it names one, else a seat along the handle. */
export const handSocket = (weapon, hand) => (hand.from ? anchorSocket : gripSocket)(weapon, hand);

// What of a hand's spec its hold passes to the pose file: how deep the item seats in the palm and how it slants across.
const GRASP = ['grip', 'slant'];
export const graspOf = (hand) =>
  Object.fromEntries(GRASP.filter((key) => hand[key] !== undefined).map((key) => [key, hand[key]]));

// ---- key frames ----

const lerpV = (a, b, w) => a.map((x, i) => x + (b[i] - x) * w);
const mapValues = (object, f) => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, f(value, key)]));

// How far ahead of a gun's sight the eyes look down it, far enough that the line they look along is the sight's.
const SIGHT_RANGE = 10;
// The figure's right, the axis a swing forward turns about (models/poses/wields/wields.libsonnet).
const RIGHT = [-1, 0, 0];

/**
 * The pose file of key frame `key` of class `cls` (`readWields().classes`), for `rig`, the weapon (`heldWeapon`) and its
 * hands' sockets (`handSocket`) given when the class wields one. Points are read off the figure as its body angles
 * stand it, from the shoulder of the hand they belong to (`shoulderPoints`). A weapon stands with its grip point at
 * the key's `at`, from the leading hand's shoulder, or, shouldered, with its butt (the class's `butt`, `anchorPoint`)
 * at the key's `pocket`, from the same shoulder. The eyes look at the class's `look`, or down the gun's sight when the
 * key has them `sight` along it, the head carried as `sight` bears it (`lookAt`) to lay the cheek on the stock.
 *
 * Walking, the figure stands in `body` rather than the key's own (`walkingBody`) and its points are read off it, so the
 * weapon rides the walk's lean and bob; but the weapon is turned as the key's own body turns the chest, tipped forward
 * only `lean` degrees of the walk's lean about the point the key places, and then swung `sway` degrees forward about the
 * leading shoulder, turn and point alike.
 */
function poseOf(rig, cls, key, weapon, sockets, { body = key.body, lean = 0, sway = 0 } = {}) {
  const header = standing(rig);
  const chest = posedAt(rig, key.body).get('spine');
  const inChest = shoulderPoints(rig, body);
  const file = {
    ...header,
    angles: { ...body },
    hands: {},
    reach: {},
    hold: {},
  };
  let look = cls.look;
  if (cls.weapon) {
    const { lead } = cls.weapon;
    const { pitch, yaw, roll } = key.weapon.aim;
    const swing = rotAxis(RIGHT, sway);
    const shoulder = inChest(lead, [0, 0, 0]);
    const swung = (p) => add(shoulder, mulMV(swing, sub(p, shoulder)));
    // Turned about the right axis, as a lean forward turns the chest, a forward lean tips the working end down.
    const tip = rotAxis(RIGHT, -lean);
    const r = [swing, tip, chest.r, rotY(yaw), rotX(pitch), rotZ(roll), weapon.held].reduce(mulMM);
    const at = key.weapon.pocket
      ? sub(swung(inChest(lead, key.weapon.pocket)), mulMV(r, anchorPoint(weapon, cls.weapon.butt)))
      : sub(swung(inChest(lead, key.weapon.at)), mulMV(r, weapon.at));
    if (key.sight)
      look = add(add(at, mulMV(r, weapon.sight.eye)), scale(mulMV(r, weapon.sight.direction), SIGHT_RANGE));
    for (const [hand, spec] of Object.entries(cls.weapon.hands)) {
      file.hands[hand] = spec.hands;
      file.hold[hand] = {
        model: cls.weapon.model,
        at: r4(at),
        turn: r4(mat3ToQuat(r)),
        pole: key.weapon.poles[hand],
        socket: sockets[hand],
        ...graspOf(spec),
      };
    }
  }
  Object.assign(file.angles, lookAt(rig, body, look, key.sight));
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
 * What the wields need of the built tree: each class's weapon (`heldWeapon`) and its hands' sockets (`handSocket`),
 * by class. `entryOf(model)` gives a held model's things sidecar and `meshOf(model)` its closed mesh.
 */
export function wieldWeapons(wields, entryOf, meshOf) {
  return mapValues(wields.classes, (cls) => {
    if (!cls.weapon) return {};
    const weapon = heldWeapon(entryOf(cls.weapon.model), meshOf(cls.weapon.model));
    return { weapon, sockets: mapValues(cls.weapon.hands, (hand) => handSocket(weapon, hand)) };
  });
}

/** Every wield's pose files by name: each stance, and each strike's key frames (`strikeMoves`). */
export function wieldPoses(rig, wields, weapons) {
  const poses = {};
  for (const [name, cls] of Object.entries(wields.classes)) {
    const { weapon, sockets } = weapons[name];
    for (const [stance, key] of Object.entries(cls.stances))
      poses[clipName(name, 'stance', stance)] = poseOf(rig, cls, key, weapon, sockets);
    for (const [strike, spec] of Object.entries(cls.strikes ?? {})) {
      for (const { key } of strikeMoves(wields, spec).filter(({ key }) => key))
        poses[keyName(clipName(name, 'strike', strike), key)] = poseOf(rig, cls, spec[key], weapon, sockets);
    }
  }
  return poses;
}

// Each phase's easing, the wields' own unless the strike names one.
const easings = (wields, strike) => PHASES.map((phase) => strike.easing?.[phase] ?? wields.easing[phase]);

/**
 * The key frames a strike moves through from its guard, in turn, each `{ key, at, easing }`: the key's name in the
 * strike, none for the guard; where it falls, as a share of the strike's span; and how the move into it eases. Each
 * phase but the last ends in its key (`ENDS`) and the recovery in the guard. A strike that names a `drawn` key recovers
 * through it, halfway through the recovery: from the follow's rest it gathers speed into the drawn key and slows from
 * there into the guard, so a guard held high takes the weapon back by where the strike draws it rather than swinging
 * its end out past the hit.
 */
export function strikeMoves(wields, spec) {
  const eases = easings(wields, spec);
  return [
    { at: 0 },
    ...strikePhases(spec).flatMap(({ phase, from, to }, i) =>
      phase === 'recovery' && spec.drawn
        ? [
            { key: 'drawn', at: (from + to) / 2, easing: 'ease-in' },
            { at: to, easing: 'ease-out' },
          ]
        : [{ key: ENDS[phase], at: to, easing: eases[i] }],
    ),
  ];
}

/** Each strike as a sequence of its pose files for the pose page: guard, its keys (`strikeMoves`) and back. */
export function wieldSequences(wields) {
  const sequences = {};
  for (const [name, cls] of Object.entries(wields.classes)) {
    for (const [strike, spec] of Object.entries(cls.strikes ?? {})) {
      const clip = clipName(name, 'strike', strike);
      const guard = clipName(name, 'stance', 'guard');
      const moves = strikeMoves(wields, spec);
      sequences[clip] = {
        keys: moves.map(({ key, at }) => ({ fixture: key ? keyName(clip, key) : guard, at: at * spec.seconds })),
        easing: moves.slice(1).map(({ easing }) => easing),
      };
    }
  }
  return sequences;
}

// How far an elbow may swing from its pole, in degrees, nearest first.
const SWINGS = [0, ...Array.from({ length: 6 }, (_, i) => 10 * (i + 1)).flatMap((swing) => [swing, -swing])];

// The first bone of the chain that reaches a hand.
const shoulderOf = (rig, hand) =>
  rig.bones.find((bone) => bone.id === rig.bones.find((b) => b.id === hand).reach.chain[0]);

// Bone `id` and every bone below it. Parents come first in the rig.
const limbFrom = (rig, id) => {
  const ids = new Set([id]);
  for (const bone of rig.bones) if (ids.has(bone.parent)) ids.add(bone.id);
  return ids;
};

// The bones that move a hand to a hold: its arm from the shoulder down, the digits too.
const armBones = (rig, hand) => limbFrom(rig, shoulderOf(rig, hand).id);

// The digits of `hand`: every bone below it.
const digitsOf = (rig, hand) => [...limbFrom(rig, hand)].filter((id) => id !== hand);

/**
 * The holds of a pose file (`hold`) with each elbow's pole swung `swing` degrees about the line from its shoulder, as
 * `stood` (bone transforms) stands it, to its socket on the item, which moves the elbow and leaves the hand where it is.
 */
const swungHolds = (rig, hold, stood, swing) =>
  mapValues(hold, (entry, id) => {
    const shoulder = shoulderOf(rig, id);
    const item = { r: quatToMat3(entry.turn), t: entry.at };
    const reach = sub(applyPoint(item, entry.socket.at), applyPoint(stood.get(shoulder.id), shoulder.head));
    return { ...entry, pole: mulMV(rotAxis(normalize(reach), swing), entry.pole) };
  });

// How far a compiled pose's joints were asked past their limits, in degrees summed.
const bent = ({ report }) =>
  report.clamped.reduce((sum, { asked, held }) => sum + asked.reduce((s, x, i) => s + Math.abs(x - held[i]), 0), 0);

/**
 * The pose `compileAt(swing)` compiles with its elbows swung by the least of `SWINGS` that holds every joint within its
 * limits, else the one asking least past them: poles that hold a wrist within its limits in one pose do not in every
 * pose near it, and swinging the elbow about the line from shoulder to grip turns the wrist without moving the hand.
 */
function leastBent(compileAt) {
  let best;
  for (const swing of SWINGS) {
    const compiled = compileAt(swing);
    if (bent(compiled) === 0) return compiled;
    if (!best || bent(compiled) < bent(best)) best = compiled;
  }
  return best;
}

/**
 * The body of a key (`key.body`) as frame `step` of a walk (`walkAngles`) carries it: the gait's legs, knees and lean,
 * the key's trunk turned on top, a bone both turn (the spine) turned by both. The key's legs give way to the gait's, and
 * the gait's arms are left out for the hands to carry to the weapon; the feet stand level.
 */
function walkingBody(gait, body, step) {
  const { legs, knees, feet, arms, elbows, lean } = gait.bones;
  const walked = new Set([...legs, ...knees, ...feet, ...arms, ...elbows]);
  const angles = Object.fromEntries(Object.entries(body).filter(([id]) => !walked.has(id)));
  for (const id of [...legs, ...knees, ...lean]) angles[id] = add(angles[id] ?? [0, 0, 0], step[id]);
  return angles;
}

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

// A rounded quaternion scaled back to unit length.
const unitQuat = (q) => {
  const n = Math.hypot(...q);
  return q.map((c) => c / n);
};

/**
 * The seat as a game reads it: the leading hand's bone, and the weapon's grip point and held axes (working end +z, up
 * +y) in that bone's rest frame, so the bone's transform carries them and a game seats any weapon of the class by its
 * own grip. The turn is unit length as written, so a game checks it as strictly as any other rotation.
 */
const heldSeat = (seat, weapon, lead) => ({
  bone: lead,
  at: r4(add(mulMV(seat.r, weapon.at), seat.t)),
  turn: unitQuat(r4(mat3ToQuat(mulMM(seat.r, transpose(weapon.held))))),
});

/**
 * Every wield baked for a game: stances as one-frame clips, and strikes as clips of frames evenly through their span.
 * Between key frames each joint turns from one key's angles to the next's by its phase's easing, as the pose page blends
 * them, so a swing sweeps an arc and no joint passes its limits. The weapon rides the leading hand; any other hand on it
 * takes it again by its socket in every frame, its elbow swung as far as its wrist needs. A strike carries its phases'
 * ends and its hit in Sim seconds; a weapon class's clips carry the held seat (`heldSeat`). Each walk of `gait`
 * (readLocomotion) is baked in each stance its class walks in (`walkClips`). Returns the clips by name and each frame's
 * pose report by clip, for a caller that checks them. `set` is one of `wieldModels`' sets: `{ wields, weapons, gait }`.
 */
export function wieldClips(rig, { wields, weapons, gait }, meshOf) {
  const baked = Object.entries(wields.classes).map(([name, cls]) =>
    classClips(rig, wields, gait, name, cls, weapons[name], meshOf),
  );
  return {
    clips: Object.assign({}, ...baked.map(({ clips }) => clips)),
    reports: Object.assign({}, ...baked.map(({ reports }) => reports)),
  };
}

// One class's clips and their frames' reports, as `wieldClips` bakes them. A class reads nothing of another, so each
// is the unit the bake caches.
function classClips(rig, wields, gait, name, cls, carried, meshOf) {
  const { weapon, sockets } = carried;
  const clips = {},
    reports = {};
  const header = standing(rig);
  const compileKey = (key) => {
    const file = poseOf(rig, cls, key, weapon, sockets);
    const { frame, report, held } = compilePose(rig, file, { meshOf });
    // Read back within the limits the frame was posed to, past rounding, so a blend of two keys stays inside them.
    const angles = mapValues(frameAngles(rig, frame), (turn, id) =>
      clampJointAngles(
        rig.bones.find((bone) => bone.id === id),
        turn,
      ),
    );
    return {
      frame,
      report,
      angles,
      poles: mapValues(file.hold ?? {}, ({ pole }) => pole),
      item: held[cls.weapon?.lead],
    };
  };
  const stances = mapValues(cls.stances, compileKey);
  const { guard } = stances;
  const seat = cls.weapon && seatOn(rig, guard.frame, guard.item, cls.weapon.lead);
  const held = seat ? { held: heldSeat(seat, weapon, cls.weapon.lead) } : {};
  const others = cls.weapon ? Object.keys(cls.weapon.hands).filter((hand) => hand !== cls.weapon.lead) : [];
  const regripped = new Set(others.flatMap((hand) => [...armBones(rig, hand)]));
  // The frame `w` of the way from compiled key `a` to `b`.
  const between = (a, b, w) => {
    const ids = [...new Set([...Object.keys(a.angles), ...Object.keys(b.angles)])].filter((id) => !regripped.has(id));
    const angles = Object.fromEntries(
      ids.map((id) => [id, lerpV(a.angles[id] ?? [0, 0, 0], b.angles[id] ?? [0, 0, 0], w)]),
    );
    const posed = compilePose(rig, { ...header, angles });
    if (others.length === 0) return posed;
    const stood = boneTransforms(rig.bones, decodeFrame(posed.frame));
    const hand = stood.get(cls.weapon.lead);
    const item = { r: mulMM(hand.r, seat.r), t: add(mulMV(hand.r, seat.t), hand.t) };
    const hands = Object.fromEntries(others.map((id) => [id, cls.weapon.hands[id].hands]));
    const hold = Object.fromEntries(
      others.map((id) => [
        id,
        {
          model: cls.weapon.model,
          at: item.t,
          turn: mat3ToQuat(item.r),
          pole: normalize(lerpV(normalize(a.poles[id]), normalize(b.poles[id]), w)),
          socket: sockets[id],
          ...graspOf(cls.weapon.hands[id]),
        },
      ]),
    );
    // The keys' poles hold the wrist within its limits at the keys, not always between them.
    return leastBent((swing) =>
      compilePose(rig, { ...header, angles, hands, hold: swungHolds(rig, hold, stood, swing) }, { meshOf }),
    );
  };
  for (const [stance, { frame, report }] of Object.entries(stances)) {
    clips[clipName(name, 'stance', stance)] = { kind: 'pose', loop: false, ...held, frames: [frame] };
    reports[clipName(name, 'stance', stance)] = [report];
  }
  for (const [strike, spec] of Object.entries(cls.strikes ?? {})) {
    const clip = clipName(name, 'strike', strike);
    const moves = strikeMoves(wields, spec);
    const keys = moves.map(({ key }) => (key ? compileKey(spec[key]) : guard));
    const count = Math.max(2, Math.round(spec.seconds * wields.framesPerSecond) + 1);
    const baked = Array.from({ length: count }, (_, k) => {
      const at = k / (count - 1);
      const i = moves.slice(0, -1).findLastIndex(({ at: from }) => from <= at);
      const [from, to] = [moves[i].at, moves[i + 1].at];
      return between(keys[i], keys[i + 1], easingOf(moves[i + 1].easing)((at - from) / (to - from)));
    });
    clips[clip] = {
      kind: 'pose',
      loop: false,
      ...strikeTiming(spec),
      ...held,
      frames: baked.map(({ frame }) => frame),
    };
    reports[clip] = baked.map(({ report }) => report);
  }
  const walks = walkClips(rig, gait, name, cls, carried, stances, held, meshOf);
  return { clips: { ...clips, ...walks.clips }, reports: { ...reports, ...walks.reports } };
}

/**
 * The held walks of class `name`, as `classClips` bakes them: each walk of `gait` in each stance the class walks in
 * (`cls.walks`), named `<class>_<walk>_<stance>`, shaped as the empty walk (`walkLoop`) with the class's `held` seat, and
 * their frames' reports. The arms carry as the stance's `arms` says (models/poses/wields/wields.libsonnet). `stances`
 * are the class's stances compiled. A walk frame stands its feet level, so where a planted foot stops at its ankle's
 * limit, as the gait means it to, its report leaves the stop out (`askedClamps`).
 */
function walkClips(rig, gait, name, cls, { weapon, sockets }, stances, held, meshOf) {
  const lead = cls.weapon?.lead;
  // Which of the gait's arms (left then right) is the leading hand's.
  const leadSide = () => {
    const side = gait.bones.arms.indexOf(shoulderOf(rig, lead).id);
    if (side < 0) throw new Error(`${name}: the gait swings no arm of ${lead}`);
    return side;
  };
  const compileStep = (file) => {
    const { frame, report } = compilePose(rig, file, { meshOf });
    return { frame, report: { ...report, clamped: askedClamps(file, report.clamped) } };
  };
  // The digits of `hands` as the compiled stance angles `closed` stand them, a digit it leaves at rest open.
  const closedDigits = (hands, closed) =>
    Object.fromEntries(hands.flatMap((hand) => digitsOf(rig, hand).map((id) => [id, closed[id] ?? [0, 0, 0]])));
  const carries = {
    // The stance's hands kept on the weapon over the walking body (`walkingBody`), the weapon placed by the key
    // (`poseOf`), tipped by `lean`, that share of the walk's lean, and swayed by `sway`, that share of the leading arm's
    // swing, never past `swayLimitDeg` either way; each hand taking its socket by reach, its elbow swung as far as its
    // wrist needs (`leastBent`), the head aimed again. The palms stand on the stance's sockets, so the digits close as
    // the stance's did rather than closing again by contact, most of a bake's cost.
    held: (stance, { lean = 0, sway = 0, swayLimitDeg = Infinity }, walk, k) => {
      const key = cls.stances[stance];
      const body = walkingBody(gait, key.body, walkAngles(rig, gait, walk, k));
      const swing = lead ? sway * armSwing(walk, framePhase(walk, k), leadSide()) : 0;
      const {
        hands = {},
        hold,
        ...file
      } = poseOf(rig, cls, key, weapon, sockets, {
        body,
        lean: lean * walk.leanDeg,
        sway: Math.max(-swayLimitDeg, Math.min(swayLimitDeg, swing)),
      });
      file.angles = { ...file.angles, ...closedDigits(Object.keys(hands), stances[stance].angles) };
      if (!hold) return compileStep(file);
      const open = mapValues(hold, (entry) => ({ ...entry, close: false }));
      const stood = posedAt(rig, body);
      return leastBent((turn) => compileStep({ ...file, hold: swungHolds(rig, open, stood, turn) }));
    },
    // The arms swinging as in the empty walk, each hand the class closes (the leading hand, any free hand) turned and
    // closed as the stance's, the leading forearm twisted as the stance's, so the weapon hangs from the hand as there;
    // a second hand on the weapon lets go, open.
    swing: (stance, _carry, walk, k) => {
      const closed = stances[stance].angles;
      const angles = walkAngles(rig, gait, walk, k);
      for (const hand of [lead, ...Object.keys(cls.free ?? {})].filter(Boolean)) {
        angles[hand] = closed[hand] ?? [0, 0, 0];
        Object.assign(angles, closedDigits([hand], closed));
      }
      if (lead) {
        const forearm = rig.bones.find((bone) => bone.id === lead).parent;
        const [flex, , abduct] = angles[forearm];
        angles[forearm] = [flex, closed[forearm]?.[1] ?? 0, abduct];
      }
      return compileStep({ ...standing(rig), angles });
    },
  };
  const clips = {},
    reports = {};
  for (const [stance, carry] of Object.entries(cls.walks ?? {})) {
    const step = carries[carry.arms];
    if (!step) throw new Error(`${name}: walks ${stance} with its arms ${carry.arms}, not held or swing`);
    for (const [walkName, walk] of Object.entries(gait.walks)) {
      const baked = Array.from({ length: walk.frames }, (_, k) => step(stance, carry, walk, k));
      const clip = clipName(name, walkName, stance);
      clips[clip] = { ...walkLoop(rig, gait, walk), ...held, frames: baked.map(({ frame }) => frame) };
      reports[clip] = baked.map(({ report }) => report);
    }
  }
  return { clips, reports };
}

const HERE = import.meta.dirname;
// The code a bake runs. A cached bake is only as good as the code and the runtime that made it.
const BAKE_CODE = [
  'wields.mjs',
  'keyFrames.mjs',
  'locomotion.mjs',
  '../site/poseFile.mjs',
  '../site/fingers.mjs',
  '../site/clearance.mjs',
  '../site/hiding.mjs',
  '../site/kinematics.mjs',
  '../site/clipFrames.mjs',
];
const bakeHash = () => codeFingerprint(HERE, BAKE_CODE);
const CACHE_FOLDER = 'wields';

// What `classClips` reads, so its key changes with nothing else the wields or the gait say. The weapon's solid is its
// mesh's, which the key holds.
const bakeTask = (rig, { easing, framesPerSecond }, { bones, walks }, name, cls, { weapon, sockets }, meshOf) => {
  const { solid, ...held } = weapon ?? {};
  return {
    rig,
    easing,
    framesPerSecond,
    gait: { bones, walks },
    name,
    cls,
    weapon: held,
    sockets,
    mesh: cls.weapon ? meshOf(cls.weapon.model) : null,
  };
};
const taskHash = (task, bake) =>
  createHash('sha256').update(bake).update(JSON.stringify(task)).digest('hex').slice(0, 32);

/**
 * Each of `sets`' clips, as `wieldClips` bakes them, and the `wieldProblems` of their frames, by set: each class from
 * the cache folder when what it reads and the bake are as they were, else baked and kept, since closing the hands on a
 * weapon is most of the bake. A class keeps its problems rather than its reports, which the cache could not carry
 * whole. `bake` is the fingerprint of the code that bakes, which a test may change. With `shard`, only that shard of
 * the classes is baked, so CI can spread a clean build's bakes over runners like its models (`wieldShard`), and each
 * set holds only the shard's clips. With `prune`, entries none of `sets` uses any more go, so only a run over every set
 * may prune.
 */
export function wieldResults(rig, sets, meshOf, { cache, prune = false, shard, bake = bakeHash() } = {}) {
  const folder = cache === undefined ? undefined : resultFolder(resolve(cache), CACHE_FOLDER);
  const classes = Object.entries(sets).flatMap(([set, { wields, weapons, gait }]) =>
    Object.entries(wields.classes).map(([name, cls]) => {
      const inputs = [rig, wields, gait, name, cls, weapons[name], meshOf];
      return { set, inputs, hash: taskHash(bakeTask(...inputs), bake) };
    }),
  );
  const mine = shard === undefined ? classes : shardUnits(classes, shard);
  let reused = 0;
  const made = mine.map(({ set, inputs, hash }) => {
    const stored = folder?.get(hash);
    if (stored !== undefined) {
      reused++;
      return { set, ...stored };
    }
    const { clips, reports } = classClips(...inputs);
    const result = { clips, problems: wieldProblems(reports) };
    folder?.put(hash, result);
    return { set, ...result };
  });
  if (prune) folder?.prune(new Set(classes.map(({ hash }) => hash)));
  const results = mapValues(sets, (_, set) => {
    const own = made.filter((result) => result.set === set);
    return {
      clips: Object.assign({}, ...own.map(({ clips }) => clips)),
      problems: own.flatMap(({ problems }) => problems),
    };
  });
  return { results, reused, baked: mine.length - reused };
}

/**
 * Bakes one shard of every wield class into the cache, from `modelOf(id)`, a model's `{ glb, entry }` as a build
 * generates it (tools/build.mjs, fillCacheShard), so the classes are baked by the shards rather than by the build that
 * reads them all back. Every shard reads the doll and every weapon, since each class's key holds the rig and its seat.
 * @param {(id: string) => Promise<{ glb: Buffer; entry: unknown }>} modelOf
 * @param {{ root?: string; sets?: WieldSets | undefined; cache: string; shard: import('./generation.mjs').Shard }} options
 */
export async function wieldShard(modelOf, { root = repo, sets = WIELD_SETS, cache, shard }) {
  // With no set there is nothing to bake, and a root without sets, such as a test's, may have no doll.
  if (Object.keys(sets).length === 0) return;
  const weapons = Object.values(sets).flatMap(({ file }) =>
    Object.values(readWields(root, file).classes).flatMap(({ weapon }) => (weapon ? [weapon.model] : [])),
  );
  const ids = new Set([...dollModels(readDressing(root)), ...weapons]);
  const files = new Map(await Promise.all([...ids].map(async (id) => [id, await modelOf(id)])));
  const { rig, meshOf, sets: read } = wieldModels((id) => files.get(id), { root, sets });
  wieldResults(rig, read, meshOf, { cache, shard });
}

/** The doll's rig and its parts' sites as the built tree holds them, with what the wields need of it. */
export function readWieldTree(built, root = repo) {
  const manifest = JSON.parse(readFileSync(join(built, 'manifest.json'), 'utf8'));
  return wieldModels(treeFiles(built, manifest), { root });
}

/**
 * The doll's rig and each of `sets` as `{ wields, weapons, gait }`, from `filesOf(id)`, a model's `{ glb, entry }`: its
 * GLB and its sidecar, as a built tree holds them (`treeFiles`) or a build generates them. `gait` is the doll's
 * (readLocomotion), whose walks each set's classes walk holding what they hold.
 */
export function wieldModels(filesOf, { root = repo, sets = WIELD_SETS } = {}) {
  const dressing = readDressing(root);
  const doll = dollFrom(dressing, filesOf);
  const rig = dollRig(readRigContent(root), doll, dressing);
  const { meshOf, entryOf } = heldModels(filesOf);
  const read = mapValues(sets, ({ file }) => {
    const wields = readWields(root, file);
    return { wields, weapons: wieldWeapons(wields, entryOf, meshOf), gait: readLocomotion(root) };
  });
  return { rig, doll, meshOf, sets: read };
}

/**
 * Each model's `{ glb, entry }` in a built tree whose models `manifest` lists: its GLB and its sidecar, from whichever
 * tool's folder under its pack holds it.
 */
export function treeFiles(built, manifest) {
  return (id) => {
    const model = manifest.models.find((entry) => entry.id === id && entry.path.endsWith('.glb'));
    if (!model) throw new Error(`the built tree holds no ${id}`);
    const sidecars = Object.values(SIDECAR_DIRECTORIES).map((folder) =>
      join(built, sidecarFile(model.pack, folder, id)),
    );
    const sidecar = sidecars.find((path) => existsSync(path));
    if (!sidecar) throw new Error(`${id}: no sidecar under ${model.pack}`);
    return { glb: readFileSync(join(built, model.pack, model.path)), entry: JSON.parse(readFileSync(sidecar, 'utf8')) };
  };
}

/** What a hand needs of the models a built tree holds, as `heldModels` gives it. */
export const heldItems = (built, manifest) => heldModels(treeFiles(built, manifest));

/**
 * What a hand needs of the models `filesOf` gives (`wieldModels`): `meshOf(id)`, the model's parts at rest as one mesh,
 * and `entryOf(id)`, its sidecar.
 */
export function heldModels(filesOf) {
  const parsed = new Map();
  const meshes = (id) => {
    if (!parsed.has(id)) parsed.set(id, modelMeshes(filesOf(id).glb));
    return parsed.get(id);
  };
  const meshOf = (id) =>
    meshes(id).reduce(
      (mesh, part) => {
        const base = mesh.positions.length / 3;
        return {
          positions: [...mesh.positions, ...part.positions],
          indices: [...mesh.indices, ...part.indices.map((i) => base + i)],
        };
      },
      { positions: [], indices: [] },
    );
  return { meshOf, entryOf: (id) => filesOf(id).entry };
}

/**
 * What the pose reports of baked frames (`wieldClips`) show wrong, one line each: a joint asked past its limit, a reach
 * short of its target, a digit's pinch off its point. A game plays the frames as they are, so none may stand.
 */
export function wieldProblems(reports) {
  return Object.entries(reports).flatMap(([clip, frames]) =>
    frames.flatMap(({ clamped, residuals, grips = {} }, k) => [
      ...clamped.map(({ bone }) => `${clip} frame ${k}: ${bone} asks past a limit`),
      ...Object.entries(residuals)
        .filter(([, left]) => !(left < 1e-6))
        .map(([id, left]) => `${clip} frame ${k}: ${id} falls ${left} m short`),
      ...Object.entries(grips).flatMap(([hand, digits]) =>
        Object.entries(digits)
          .filter(([, { residual }]) => residual > 1e-3)
          .map(([digit, { residual }]) => `${clip} frame ${k}: ${hand} ${digit} pinches ${residual} m off`),
      ),
    ]),
  );
}

// What the rig holds for authoring poses, not for playing clips: the pose page's clips, the eye a look aims, the hand
// presets a pose file names.
const AUTHORING = new Set(['clips', 'eye', 'presets']);
const MELEE_DOC =
  "The doll's melee clips by name, <class>_<stance|strike|walk>_<kind>, posing the rig the manifest's motions entry names. A frame turns each bone it names from its rest by a quaternion [x, y, z, w] and stands the root at a point, which stands the doll barefoot on the ground: a game adds the largest soleLift among the models a figure wears (the manifest's models) to the root's height; a strike's frames stand evenly through durationSimSeconds, the first and last in its class's guard. phases: where each of windup, strike, follow and recovery ends; hitAtSimSeconds: where the strike phase ends and the blow lands, which a game scales with the clip to its own timing while its simulation decides the hit. <class>_<walk>_idle, for each walk of doll.locomotion.json (sneak, walk, run, crouch_walk): that walk holding what the class holds, shaped and played as the empty walk is (a loop in place, advanced by the ground travelled over strideMetres, with its speedMetresPerSecond), its legs the empty walk's; a class wielding with one hand swings its arms as there, the weapon riding the leading hand, while a two-hand class keeps both hands on its weapon as its idle holds it. held, on a weapon class's clips: the bone of the hand that leads the weapon, and the weapon's grip point (at) and its held axes (turn: working end +z, up +y) in that bone's frame, so a game seats any weapon of the class by its own grip; each hand on the weapon holds its handle's axis on the palm's face beside the arm's grip anchor, where a figure's fist holds an item.";
const GUNS_DOC =
  "The doll's held gun clips by name, <gun>_stance_<idle|guard> and <gun>_<walk>_<idle|guard>, one set per gun family (the gun's model id), posing the rig the manifest's motions entry names. A frame turns each bone it names from its rest by a quaternion [x, y, z, w] and stands the root at a point, which stands the doll barefoot on the ground: a game adds the largest soleLift among the models a figure wears (the manifest's models) to the root's height. idle: low ready, the gun carried muzzle down across the body; guard: shouldered, the bore level ahead and the eye on the sight line, the stance a game plays for ready whatever is in hand, as the melee clips' guard. <gun>_<walk>_<stance>, for each walk of doll.locomotion.json (sneak, walk, run, crouch_walk): that walk in that stance, shaped and played as the empty walk is (a loop in place, advanced by the ground travelled over strideMetres, with its speedMetresPerSecond), its legs the empty walk's and both hands on the gun as in the stance, the gun tipped down by its stance's share of the walk's forward lean; at idle the gun sways a little with the stride, at guard the bore stays ahead and does not sway. held: the bone of the hand on the pistol grip or stock wrist, and the gun's grip point (at) and its held axes (turn: bore +z, up +y) in that bone's frame, so a game seats the gun by its own grip.at; the clip was baked on that gun, so the support hand lies on its fore-end.";
/**
 * The doll's sets of wields: each one's content file under models/poses, and the motions entry a release carries its
 * baked clips in, in the pack of the doll's parts, so a game that plays only one set loads only its file.
 */
export const WIELD_SETS = {
  melee: {
    file: 'wields/wields.libsonnet',
    motions: { id: 'doll_melee', ...DOLL_MOTIONS, path: 'motions/doll.melee.json' },
    doc: MELEE_DOC,
  },
  guns: {
    file: 'guns/guns.libsonnet',
    motions: { id: 'doll_guns', ...DOLL_MOTIONS, path: 'motions/doll.guns.json' },
    doc: GUNS_DOC,
  },
};
/** @typedef {Readonly<Record<string, (typeof WIELD_SETS)[keyof typeof WIELD_SETS]>>} WieldSets */

/**
 * Writes the doll's rig and each of `sets` of its baked wields (all of `WIELD_SETS` unless given) into the built tree `out`, whose models
 * `manifest` lists, for a game to play: the rig a clip's frames turn, with each part's site on it, and each set's clips
 * by name. Refuses a set whose frames show any `wieldProblems`. Returns the files written, under their packs, and the
 * manifest's motions entries for them. `cache`, `prune` and `bake` are `wieldResults`'.
 * @param {string} out
 * @param {Parameters<typeof treeFiles>[1]} manifest
 * @param {{ root?: string; sets?: WieldSets; cache?: string | undefined; prune?: boolean; bake?: string }} [options]
 */
export function exportWields(out, manifest, { root = repo, sets = WIELD_SETS, ...options } = {}) {
  const { rig, doll, meshOf, sets: read } = wieldModels(treeFiles(out, manifest), { root, sets });
  const { results: baked } = wieldResults(rig, read, meshOf, options);
  const problems = Object.values(baked).flatMap(({ problems }) => problems);
  if (problems.length > 0) throw new Error(`baked wields: ${problems.join('; ')}`);
  const posing = Object.fromEntries(Object.entries(rig).filter(([key]) => !AUTHORING.has(key)));
  const rigFile = { ...posing, doll: doll.sites };
  const files = new Map();
  for (const [name, { motions, doc }] of Object.entries(sets)) {
    files.set(outputPath(motions.pack, motions.rig), rigFile);
    files.set(outputPath(motions.pack, motions.path), {
      _doc: doc,
      rig: { id: rig.id, revision: rig.revision },
      clips: baked[name].clips,
    });
  }
  for (const [file, value] of files) {
    mkdirSync(dirname(join(out, file)), { recursive: true });
    writeFileSync(join(out, file), `${JSON.stringify(value)}\n`);
  }
  return { files: [...files.keys()], motions: Object.values(sets).map((set) => set.motions) };
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { built: { type: 'string', default: join(repo, 'built') } } });
  const { rig, sets } = readWieldTree(resolve(values.built));
  const poses = Object.assign(
    {},
    ...Object.values(sets).map(({ wields, weapons }) => wieldPoses(rig, wields, weapons)),
  );
  for (const [name, file] of Object.entries(poses))
    writeFileSync(join(repo, POSES, `${name}.json`), `${poseJson(file)}\n`);
  console.log(`${Object.keys(poses).length} wield poses -> ${POSES}`);
}
