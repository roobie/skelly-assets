// Pose files, as an author writes them, and clip frames, as a clip stores them, over a rig from tools/dollRig.mjs.
// Loaded as is by the browser and by Node, like site/kinematics.mjs, so the page, the pose sheet and the tests compile
// a pose one way.
//
// A pose file:
//   { rig: { id, revision }, angles: { <bone>: [flex, twist, abduct] }, reach: { <bone>: { target, pole? } },
//     level: [<bone>], root?: [x, y, z], ground?: true }
// Angles are degrees held to each bone's limits. `level` bones keep their rest orientation. `ground` lifts the root so
// the figure, as its angles and levelled bones hold it, stands on y = 0. A reach entry names a reach bone of the rig
// and places its joint at `target`, a point in the world the figure stands in, by two-bone IK, bending toward `pole` or
// the rig's own; the levelled bones are levelled again after it. Grounding before the reach lets a target be read off
// the standing figure, as the page shows it, and lets a foot reach a point on the ground. Why a file names its rig is in
// models/poses/rig.libsonnet.
//
// Hands come as shorthand, `hands: { <hand bone>: "fist" | { preset?, curl, spread, thumb } }`, a preset of the rig or
// its own shares, which site/fingers.mjs turns into digit angles before `angles` of single digit bones are read, so a
// file can curl a hand and then open one finger. A held item,
// `hold: { <hand bone>: { model, at?, turn?, pole?, socket, grip?, pinch?, close? } }`, is placed after the reach: the
// palm is set on the item's socket, the digits `pinch` names set their pads on its points, and the others then closed
// on the item by contact, so the grip is read off the item, not drawn by hand.
// A held item's moving parts, `moved: { <model>: { <part>: share } }`, stand that share of the way from rest to the far
// end of their motion (the part's `motion` extras, from tools/packages/thing-export/src/glb.ts) before the hand closes,
// so a hand on a retracted charging handle closes on it where it is; the page moves them, since only it has the meshes.
import { applyPoint, boneTransforms, clampJointAngles, jointAngles, jointRotation, levelBone, mat3ToQuat, mulMM, quatToMat3, solveTwoBone, IDENTITY_M } from './kinematics.mjs';
import { closeHand, handAngles, handIssues, heldSolid, holdIssues, holdItem, pinchItem } from './fingers.mjs';

const KEYS = new Set(['rig', 'angles', 'reach', 'level', 'root', 'ground', 'hands', 'hold', 'moved']);
const REACH_KEYS = new Set(['target', 'pole']);
const isVector = (v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Every way a pose file does not fit the rig, as messages; an empty list means it compiles. */
export function poseIssues(rig, file) {
  if (!isObject(file)) return ['a pose file is a JSON object'];
  const issues = [];
  const bones = new Map(rig.bones.map((bone) => [bone.id, bone]));
  for (const key of Object.keys(file)) if (!KEYS.has(key)) issues.push(`unknown key ${key}`);
  if (file.rig?.id !== rig.id || file.rig?.revision !== rig.revision) {
    issues.push(`written for rig ${JSON.stringify(file.rig)}, not ${JSON.stringify({ id: rig.id, revision: rig.revision })}`);
  }
  const bonesOf = (key, value, check) => {
    if (value === undefined) return;
    if (!isObject(value)) return issues.push(`${key} maps bone ids to entries`);
    for (const [id, entry] of Object.entries(value)) {
      if (!bones.has(id)) issues.push(`${key}: the rig has no bone ${id}`);
      else check(id, entry, bones.get(id));
    }
  };
  bonesOf('angles', file.angles, (id, angles) => {
    if (!isVector(angles)) issues.push(`angles.${id} is three finite degrees [flex, twist, abduct]`);
  });
  bonesOf('reach', file.reach, (id, goal, bone) => {
    if (!bone.reach) issues.push(`reach.${id}: ${id} is not a reach bone`);
    if (!isObject(goal)) return issues.push(`reach.${id} is { target, pole? }`);
    for (const key of Object.keys(goal)) if (!REACH_KEYS.has(key)) issues.push(`reach.${id}: unknown key ${key}`);
    if (!isVector(goal.target)) issues.push(`reach.${id}.target is a finite point [x, y, z]`);
    if (goal.pole !== undefined && !isVector(goal.pole)) issues.push(`reach.${id}.pole is a finite direction [x, y, z]`);
  });
  bonesOf('hands', file.hands, (id, hand) => issues.push(...handIssues(rig, id, hand)));
  bonesOf('hold', file.hold, (id, hold) => issues.push(...holdIssues(rig, id, hold)));
  if (file.moved !== undefined) {
    if (!isObject(file.moved)) issues.push('moved maps held models to their moved parts');
    else for (const [model, parts] of Object.entries(file.moved)) {
      if (!Object.values(file.hold ?? {}).some((hold) => hold?.model === model)) issues.push(`moved.${model}: no hand holds ${model}`);
      if (!isObject(parts)) issues.push(`moved.${model} maps part names to shares 0..1`);
      else for (const [part, share] of Object.entries(parts)) if (!(Number.isFinite(share) && share >= 0 && share <= 1)) issues.push(`moved.${model}.${part} is a share 0..1`);
    }
  }
  if (file.level !== undefined) {
    if (!Array.isArray(file.level)) issues.push('level lists bone ids');
    else for (const id of file.level) if (!bones.has(id)) issues.push(`level: the rig has no bone ${id}`);
  }
  if (file.root !== undefined && !isVector(file.root)) issues.push('root is a finite translation [x, y, z]');
  if (file.ground !== undefined && typeof file.ground !== 'boolean') issues.push('ground is true or false');
  return issues;
}

const isQuaternion = (q) => Array.isArray(q) && q.length === 4 && q.every(Number.isFinite) && Math.abs(Math.hypot(...q) - 1) < 1e-3;

/** Every way a pose clip does not fit the rig, as messages: its frames name rig bones with unit quaternions. */
export function clipIssues(rig, clip) {
  if (!isObject(clip) || clip.kind !== 'pose' || !Array.isArray(clip.frames) || clip.frames.length === 0) return ['a clip is { kind: "pose", frames: [...] } with one frame or more'];
  const bones = new Set(rig.bones.map((bone) => bone.id));
  return clip.frames.flatMap((frame, i) => {
    if (!isObject(frame) || !isVector(frame.root) || !isObject(frame.rotations)) return [`frame ${i} is { root: [x, y, z], rotations }`];
    return Object.entries(frame.rotations).flatMap(([id, q]) => [
      ...(bones.has(id) ? [] : [`frame ${i}: the rig has no bone ${id}`]),
      ...(isQuaternion(q) ? [] : [`frame ${i}: ${id} is no unit quaternion [x, y, z, w]`]),
    ]);
  });
}

// The corners of each bone's bound part box, posed: what stands on the ground and what a camera frames.
export const posedCorners = (rig, pose) => {
  const transforms = boneTransforms(rig.bones, pose);
  return rig.bones.flatMap((bone) => {
    const { min, max } = bone.bind.box;
    const t = transforms.get(bone.id);
    return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => applyPoint(t, [0, 1, 2].map((a) => ((i >> a) & 1 ? max[a] : min[a]))));
  });
};

// The root lift that stands the lowest posed corner on y = 0.
export const groundLift = (rig, pose) => -Math.min(...posedCorners(rig, pose).map((p) => p[1]));

/**
 * A pose file into a clip frame. Refuses a file with issues (`poseIssues`), naming them all. Returns the frame with the
 * limits that held, the reach distances left and, per holding hand, how its grip closed and how near its pinch came,
 * so a caller or a test sees what the file asked that the rig refused; `held` carries each held item's model and world
 * transform `{ r, t }` for the caller to draw it. A file with a `hold` needs `meshOf(model)`, the item's closed triangle mesh in its own frame.
 */
export function compilePose(rig, file, { meshOf } = {}) {
  const issues = poseIssues(rig, file);
  if (issues.length > 0) throw new Error(`pose does not fit rig ${rig.id}: ${issues.join('; ')}`);
  const report = { clamped: [], residuals: {}, grips: {} };
  const rotations = {};
  const asked = Object.assign({}, ...Object.entries(file.hands ?? {}).map(([id, hand]) => handAngles(rig, id, hand)), file.angles ?? {});
  for (const bone of rig.bones) {
    const angles = asked[bone.id];
    if (!angles) continue;
    const held = clampJointAngles(bone, angles);
    if (held.some((a, i) => a !== angles[i])) report.clamped.push({ bone: bone.id, asked: angles, held });
    rotations[bone.id] = jointRotation(bone, held);
  }
  const level = (pose, clamped) => (file.level ?? []).reduce((held, id) => levelBone(rig, held, id, clamped), pose);
  let pose = level({ root: file.root ?? [0, 0, 0], rotations }, []);
  if (file.ground) pose = { ...pose, root: [pose.root[0], pose.root[1] + groundLift(rig, pose), pose.root[2]] };
  // Parents first, so a reach on a leg is solved before a reach hanging from it would read its result.
  for (const bone of rig.bones) {
    const goal = file.reach?.[bone.id];
    if (!goal) continue;
    ({ pose, residual: report.residuals[bone.id] } = solveTwoBone(rig, pose, bone.reach.chain, goal.target, goal.pole ?? bone.reach.pole, report.clamped));
  }
  const held = {};
  for (const [id, hold] of Object.entries(file.hold ?? {})) {
    if (!meshOf) throw new Error(`hold.${id}: compiling a hold needs the held item's mesh`);
    let item;
    ({ pose, item, residual: report.residuals[id] } = holdItem(rig, pose, id, hold, report.clamped));
    let pinched = {};
    if (hold.pinch) ({ pose, pinched } = pinchItem(rig, pose, id, hold.pinch, item));
    let closed = {};
    if (hold.close !== false) ({ pose, closed } = closeHand(rig, pose, id, heldSolid(meshOf(hold.model), item), { keep: Object.keys(pinched) }));
    if (hold.close !== false || hold.pinch) report.grips[id] = { ...closed, ...pinched };
    held[id] = { model: hold.model, ...item };
  }
  return { frame: encodeFrame(level(pose, report.clamped)), report, held };
}

// A pose of matrices as a clip frame of quaternions; decodeFrame (site/clipFrames.mjs) reads one back.
export const encodeFrame = (pose) => ({ root: [...pose.root], rotations: Object.fromEntries(Object.entries(pose.rotations).map(([id, r]) => [id, mat3ToQuat(r)])) });

// A frame's angles per bone, as the page's sliders hold them.
export const frameAngles = (rig, frame) => Object.fromEntries(rig.bones.filter((bone) => frame.rotations[bone.id]).map((bone) => [bone.id, jointAngles(bone, quatToMat3(frame.rotations[bone.id]))]));

// A clip frame of this rig as a pose file that compiles back to it, within the limits it already keeps.
export const poseFileOf = (rig, frame) => ({ rig: { id: rig.id, revision: rig.revision }, root: [...frame.root], angles: frameAngles(rig, frame) });

/**
 * A frame of the rig's clip actor (models/mobs.json, the rig's `clips`) as a frame of the rig. Rotations are in rest
 * world axes, so a bone of both reads its own; a bone that `absorbs` mob bones takes their rotations after its own, as
 * the mob composes them parent to child, and the mob's bones the doll lacks, such as a jaw, are dropped. The doll's
 * part is rigid, so it keeps the combined turn about its own pivot, not the small offset between the mob's pivots.
 * The actor's root moves it from standing at rest, so the doll's is lifted by what stands the doll at rest.
 */
export function rigFrame(rig, actorFrame) {
  const stand = groundLift(rig, { root: [0, 0, 0], rotations: {} });
  const rotations = {};
  for (const bone of rig.bones) {
    const own = [bone.id, ...(bone.absorbs ?? [])].filter((id) => actorFrame.rotations[id]);
    if (own.length === 0) continue;
    rotations[bone.id] = mat3ToQuat(own.map((id) => quatToMat3(actorFrame.rotations[id])).reduce(mulMM, IDENTITY_M));
  }
  return { root: [actorFrame.root[0], actorFrame.root[1] + stand, actorFrame.root[2]], rotations };
}
