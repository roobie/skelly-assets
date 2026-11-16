// The doll's locomotion baked into clips (models/poses/locomotion.libsonnet holds its numbers): a stand, an idle over it,
// walk loops and still poses, each frame a pose file compiled as the posing page compiles one. The walks are a gait
// rather than key frames, because a planted foot keeps pace with the ground only for the legs it was worked out on, and
// the doll's legs are measured off its built parts. The gait is arpg1's avatar gait as ahg3's FigureGait carries it,
// whose look its owner judged there; see docs/decisions/0021-doll-locomotion.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { clampJointAngles, sub } from '../site/kinematics.mjs';
import { compilePose } from '../site/poseFile.mjs';
import { dollRig, readRigContent } from './dollRig.mjs';
import { readDoll, readDressing } from './dress.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { r4, standing } from './keyFrames.mjs';
import { outputPath } from './layout.mjs';
import { DOLL_MOTIONS } from './wields.mjs';

const repo = resolve(import.meta.dirname, '..');
const DEG = Math.PI / 180;

export const readLocomotion = (root = repo) =>
  JSON.parse(evaluateJsonnet("import 'models/poses/locomotion.libsonnet'", root));

const boneOf = (rig, id) => rig.bones.find((bone) => bone.id === id);
const length = (v) => Math.hypot(...v);

/**
 * The leg `thigh` hangs with its knee bent `bendDeg`: `upright`, the thigh's flex that stands the ankle under the hip,
 * and `reach`, the hip to the ankle. A gait swings this hip-to-ankle line, so the knee's bend never moves the foot.
 */
export function legAt(rig, thigh, bendDeg) {
  const [shin] = rig.bones.filter((bone) => bone.parent === thigh);
  const [foot] = rig.bones.filter((bone) => bone.parent === shin.id);
  const upper = length(sub(shin.head, boneOf(rig, thigh).head));
  const lower = length(sub(foot.head, shin.head));
  const bend = bendDeg * DEG;
  return {
    upright: Math.atan2(lower * Math.sin(bend), upper + lower * Math.cos(bend)) / DEG,
    reach: Math.hypot(upper + lower * Math.cos(bend), lower * Math.sin(bend)),
  };
}

/** The ground a loop of `walk` covers, both feet: each foot, planted, sweeps back twice its leg's reach by the swing. */
export const strideMetres = (rig, gait, walk) =>
  4 * legAt(rig, gait.bones.legs[0], walk.bendDeg).reach * Math.sin(walk.swingDeg * DEG);

// The lean shared down `bones` in order, each taking what its flex allows of what is left.
function leanAngles(rig, bones, leanDeg) {
  const angles = {};
  let left = leanDeg;
  for (const id of bones) {
    const [taken] = clampJointAngles(boneOf(rig, id), [left, 0, 0]);
    angles[id] = [taken, 0, 0];
    left -= taken;
  }
  return angles;
}

/**
 * The rig's angles for `walk` at `phase` (radians through one loop): each leg planted through half the loop, its
 * hip-to-ankle line turning so the ankle runs back at a steady pace, then swinging forward with the knee lifting it
 * clear; each arm swinging against its leg, its elbow bending as it comes forward; the body leaning. The thighs are
 * turned in the world's terms, so a lean taken at the hips leaves the feet where they fall.
 */
export function gaitAngles(rig, gait, walk, phase) {
  const { legs, knees, arms, elbows, lean } = gait.bones;
  const angles = leanAngles(rig, lean, walk.leanDeg);
  const sway = Math.sin(walk.swingDeg * DEG);
  legs.forEach((thigh, side) => {
    const at = (phase + Math.PI * side) % (2 * Math.PI);
    const planted = at < Math.PI;
    // Where the ankle stands from forward (-1) to back (+1) of the hip: at a steady pace while planted.
    const back = planted ? (at * 2) / Math.PI - 1 : Math.cos(at - Math.PI);
    const tilt = angles[boneOf(rig, thigh).parent]?.[0] ?? 0;
    const { upright } = legAt(rig, thigh, walk.bendDeg);
    const forward = Math.cos(at) * walk.swingDeg * walk.armShare;
    angles[thigh] = [upright - Math.asin(back * sway) / DEG + tilt, 0, 0];
    angles[knees[side]] = [walk.bendDeg + (planted ? 0 : Math.sin(at - Math.PI) * walk.kneeDeg), 0, 0];
    angles[arms[side]] = [-forward, 0, 0];
    angles[elbows[side]] = [walk.elbowDeg + walk.elbowFollow * Math.max(0, -forward), 0, 0];
  });
  return angles;
}

/**
 * A pose compiled for a clip: its frame, and the joints it asked past the rig's limits. A foot held level (`standing`)
 * stops where its ankle does, as the gait means it to, so only what the pose asked counts.
 */
function compiled(rig, file) {
  const { frame, report } = compilePose(rig, file);
  const levelled = (bone) => file.level?.includes(bone) && !file.angles[bone];
  return { frame, clamped: report.clamped.filter(({ bone }) => !levelled(bone)) };
}

const rounded = (angles) => Object.fromEntries(Object.entries(angles).map(([id, turn]) => [id, r4(turn)]));

/**
 * The clips of `gait` (readLocomotion) on `rig`, by name: `stand`, `idle` (the stand with the gait's sway, as an
 * actor's idle carries its motion), each walk a loop in place stating its stride, and each still pose. Returns them and,
 * by clip, what each frame asked past the rig's limits, for a caller that checks them.
 */
export function locomotionClips(rig, gait) {
  const clips = {},
    reports = {};
  const add = (name, clip, poses) => {
    clips[name] = { ...clip, frames: poses.map(({ frame }) => frame) };
    reports[name] = poses.map(({ clamped }) => clamped);
  };
  const { elbows } = gait.bones;
  const stand = compiled(rig, {
    ...standing(rig),
    angles: Object.fromEntries(elbows.map((id) => [id, [gait.stand.elbowDeg, 0, 0]])),
  });
  add('stand', { kind: 'pose', loop: false }, [stand]);
  clips.idle = { base: stand.frame, motion: gait.stand.motion };
  for (const [name, walk] of Object.entries(gait.walks)) {
    const poses = Array.from({ length: walk.frames }, (_, k) =>
      compiled(rig, {
        ...standing(rig),
        angles: rounded(gaitAngles(rig, gait, walk, (2 * Math.PI * k) / walk.frames)),
      }),
    );
    const loop = {
      kind: 'pose',
      loop: true,
      strideMetres: r4([strideMetres(rig, gait, walk)])[0],
      cycles: 1,
      speedMetresPerSecond: walk.speedMetresPerSecond,
    };
    add(name, loop, poses);
  }
  for (const [name, angles] of Object.entries(gait.poses))
    add(name, { kind: 'pose', loop: false }, [compiled(rig, { rig: standing(rig).rig, ground: true, angles })]);
  return { clips, reports };
}

/** What the reports of `locomotionClips` show wrong, one line each. A game plays the frames as they are, so none may stand. */
export const locomotionProblems = (reports) =>
  Object.entries(reports).flatMap(([clip, frames]) =>
    frames.flatMap((clamped, k) => clamped.map(({ bone }) => `${clip} frame ${k}: ${bone} asks past a limit`)),
  );

const MOTIONS = { id: 'doll_locomotion', ...DOLL_MOTIONS, path: 'motions/doll.locomotion.json' };
const CLIPS_DOC =
  "The doll's locomotion clips by name, posing the rig the manifest's motions entry names, as doll.melee.json's do: a frame turns each bone it names from its rest by a quaternion [x, y, z, w] and stands the doll barefoot on the ground, so a game adds the soleLift of what a figure wears to the root's height. stand: standing still; idle: the stand as base, with motion oscillators a game layers over it on Sim seconds (periodSimSeconds, amplitudeDeg about a bone's axis, a salt to offset each oscillator's phase by the figure's seed). sneak, walk, run, crouch_walk: loops in place, both feet once over the frames; a game advances a loop by the ground travelled over strideMetres, so the planted foot keeps pace with the ground, and speedMetresPerSecond is the pace each was drawn for. crouch, prone, downed, dead: poses held still.";

/**
 * Writes the doll's locomotion into the built tree `out`, whose models `manifest` lists, beside the rig exportWields
 * writes. Returns the file written, under its pack, and the manifest's motions entry for it.
 */
export function exportLocomotion(out, manifest, root = repo) {
  const dressing = readDressing(root);
  const rig = dollRig(readRigContent(root), readDoll(out, manifest, dressing), dressing);
  const { clips, reports } = locomotionClips(rig, readLocomotion(root));
  const problems = locomotionProblems(reports);
  if (problems.length > 0) throw new Error(`baked locomotion: ${problems.join('; ')}`);
  const file = outputPath(MOTIONS.pack, MOTIONS.path);
  mkdirSync(dirname(join(out, file)), { recursive: true });
  writeFileSync(
    join(out, file),
    `${JSON.stringify({ _doc: CLIPS_DOC, rig: { id: rig.id, revision: rig.revision }, clips })}\n`,
  );
  return { files: [file], motions: [MOTIONS] };
}
