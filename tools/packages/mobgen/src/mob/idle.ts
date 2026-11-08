// Idle stances: the "A pose" (walkPose's own speed<=0 rotations: {} bind pose) never appears — a standing
// actor always shows one of these instead, plus a slow procedural motion on top (breathing, weight shift,
// a little restless reach). Authored the same way attack.ts authors clips: per-bone degrees, upright bones
// +x tips back, upperArm's x is the *net* angle from vertical (attack.ts's own upperArmLocalFromNet).
//
// Two layers, both pure functions of (actor, stance[, time]):
//   idleBasePose(actor, stance)        — static: genome-scaled stance + feet apart and staggered, weight on one leg (pelvis rolled, shifted), via 2-bone IK, re-grounded.
//                                         Cacheable per (variant, stance) — doesn't depend on time.
//   applyIdleMotion(base, stance, ...) — the time-varying top layer (breathing/sway/head/claw), composed
//                                         onto a (possibly cached) base. Cheap: no IK, no re-grounding —
//                                         see its own comment on why it never touches the legs.
//   idlePose(actor, stance, time)      — the two composed, for a caller that doesn't need to cache the base.

import type { Bone } from '../core/body.ts';
import {
  add,
  clamp,
  IDENTITY_M,
  type Mat3,
  mulMM,
  mulMV,
  rotX,
  rotY,
  rotZ,
  sub,
  transpose,
  type Vec3,
} from '../core/math.ts';
import type { Pose } from '../core/pose.ts';
import { eulerToMat3, scaleForGenome, upperArmLocalFromNet } from './attack.ts';
import {
  GROUND_SMOOTHING,
  groundOffset,
  type LegGeometry,
  legGeometryFor,
  restAngleDeg,
  type Side,
  solveTwoBone,
  type WalkActor,
} from './gait.ts';
import type { HumanoidParams } from './humanoid.ts';

export type IdleStance = 'slack' | 'aggravated';

interface StanceData {
  /** Plain (scaleForGenome-scaled) per-bone degrees — everything except the arms, which need the
   * net-angle-from-vertical treatment (see upperArmNetXDegFor). */
  readonly rotations: Partial<Record<string, readonly [number, number, number]>>;
  /** rotZ magnitude for the upper arms — mirrored by side (positive = inward, toward the centreline). */
  readonly upperArmZDeg: number;
  /** Additional hip-to-ankle shortening (metres, before the genome's own kneeBend scaling) — see
   * solveIdleLeg. */
  readonly crouchM: number;
  /** The rest stance of the legs, all as fractions of the leg's own length so one set of numbers suits every
   * humanoid mob (a gorehorn's long legs and a bogling's short ones alike). */
  readonly legs: LegStance;
}

interface LegStance {
  /** How far each foot sits outside its own hip, beyond straight under it. */
  readonly spread: number;
  /** One foot this far forward of the standing rest, the other as far back. */
  readonly stagger: number;
  /** The pelvis moves sideways this far, over the loaded (weight-bearing) foot. */
  readonly loadShift: number;
  /** The pelvis rolls this far (degrees), the unloaded hip dropping: that knee bends more, the loaded one less. */
  readonly pelvisTiltDeg: number;
  /** The share of the pelvis tilt the spine takes back out, so the shoulders stay nearer level. */
  readonly spineCounter: number;
}

// How much extra the aggravated stance's arms reach beyond the chase walk's own steady arm height, so a
// chasing zombie that stops (or gets blended down toward idle at low speed — see gait.ts's walkPose) reads
// as "still reaching," not a sudden extra lift.
const AGGRAVATED_REACH_EXTRA_DEG = 6;

const STANCES: Readonly<Record<IdleStance, StanceData>> = {
  // Wander/idle: head drooped, shoulders slumped (chest/spine pitched forward), arms hanging slightly
  // forward and in, forearms a little bent, jaw slack.
  slack: {
    rotations: {
      spine: [-4, 0, 0],
      chest: [-6, 0, 0],
      neck: [-8, 0, 0],
      head: [-18, 0, 0],
      jaw: [16, 0, 0],
      'forearm.L': [18, 0, 0],
      'forearm.R': [18, 0, 0],
    },
    upperArmZDeg: 8,
    crouchM: 0.02,
    legs: { spread: 0.12, stagger: 0.07, loadShift: 0.05, pelvisTiltDeg: 4, spineCounter: 0.7 },
  },
  // Chase/attack rest: torso hunched forward but the head tips back up toward the target (a net "still
  // watching you" gaze despite the hunch), jaw open, arms raised forward — matching the chase walk's own
  // steady arm height (see upperArmNetXDegFor) so a walk-to-stand blend (gait.ts's walkPose) doesn't pop —
  // elbows bent, knees bent more than slack (a coiled, ready-to-lunge stance).
  aggravated: {
    rotations: {
      spine: [-8, 0, 0],
      chest: [-14, 0, 0],
      neck: [-3, 0, 0],
      head: [10, 0, 0],
      jaw: [32, 0, 0],
      'forearm.L': [28, 0, 0],
      'forearm.R': [28, 0, 0],
    },
    upperArmZDeg: -10, // outward, reaching toward the target rather than hugging the body
    crouchM: 0.05,
    legs: { spread: 0.16, stagger: 0.09, loadShift: 0.04, pelvisTiltDeg: 3, spineCounter: 0.7 },
  },
};

/** The upper arm's net angle from vertical (attack.ts's own convention) for `stance` — a fixed, modest
 * forward hang for slack; for aggravated, gait.ts's own walk arm-swing steady-state (see armRotations:
 * averaged over a full cycle, the oscillating swing term is 0 and only params.armRaise remains) plus a
 * little extra reach, so a chase-speed walk blending down to this stance doesn't visibly pop. */
const upperArmNetXDegFor = (stance: IdleStance, params: HumanoidParams): number =>
  stance === 'aggravated' ? params.armRaise + AGGRAVATED_REACH_EXTRA_DEG : 10;

/**
 * Poses one leg of the idle stance: the foot stays flat on the ground at its own target (sideways: `footDx`
 * off its hip; fore-aft: `zOffset` off the rest), the hip wherever the pelvis tilt and `rootX` put it.
 * The same solve as gait.ts's legAndFootRotations (hip abduction rotZ outside the sagittal two-bone bend rotX,
 * the pelvis roll cancelled at the thigh, the foot undoing the whole chain to stay level), for a standing foot
 * instead of a walking one, so a walk blended down into this stance interpolates between like things.
 */
interface IdleLegInput {
  readonly pelvisR: Mat3;
  readonly tiltDeg: number;
  readonly pivot: Vec3;
  readonly rootX: number;
  readonly footDx: number; // ankle's world x relative to its own hip's rest x
  readonly zOffset: number;
  readonly crouchM: number;
}

const solveIdleLeg = (
  byId: ReadonlyMap<string, Bone>,
  geom: LegGeometry,
  side: Side,
  input: IdleLegInput,
): { readonly thighR: Mat3; readonly shinR: Mat3; readonly footR: Mat3 } => {
  const thigh = byId.get(`thigh.${side}`)!;
  const shin = byId.get(`shin.${side}`)!;
  const hipShift = sub(add(input.pivot, mulMV(input.pelvisR, sub(thigh.head, input.pivot))), thigh.head);
  const worldY = shin.tail[1] + input.crouchM; // the root is lowered afterwards by groundOffset
  const vx = input.footDx - hipShift[0] - input.rootX;
  const vy = worldY - hipShift[1] - thigh.head[1];
  const nativeX = shin.tail[0] - thigh.head[0];
  const reach = geom.l1 + geom.l2 - 0.002;
  const yPrime = -Math.min(Math.sqrt(Math.max(vx * vx + vy * vy - nativeX * nativeX, 0)), reach);
  const abductionDeg = ((Math.atan2(vy, vx) - Math.atan2(yPrime, nativeX)) * 180) / Math.PI;
  const lz = shin.tail[2] + input.zOffset;
  const { a1, a2 } = solveTwoBone(thigh.head, [thigh.head[0], thigh.head[1] + yPrime, lz], geom.l1, geom.l2);
  const thighDelta = a1 - restAngleDeg(thigh);
  const shinDelta = a2 - restAngleDeg(shin) - thighDelta;
  const thighR = mulMM(rotZ(abductionDeg - input.tiltDeg), rotX(thighDelta));
  const shinR = rotX(shinDelta);
  const footR = transpose(mulMM(mulMM(input.pelvisR, thighR), shinR));
  return { thighR, shinR, footR };
};

const SIDES: readonly Side[] = ['L', 'R'];

/** The static half of an idle stance: genome-scaled torso/head/jaw/arms, a spread, staggered, weight-shifted leg stance via solveIdleLeg (feet
 * planted, re-grounded exactly as walkPose re-grounds its own pose). No time argument — cacheable per
 * (variant, stance) by a caller that poses many actors sharing one body (e.g. deadvox's crowd renderer). */
export const idleBasePose = (actor: WalkActor, stance: IdleStance): Pose => {
  const { bones, extents, params } = actor;
  const data = STANCES[stance];
  const torsoPitchX =
    scaleForGenome('spine', data.rotations.spine?.[0] ?? 0, params) +
    scaleForGenome('chest', data.rotations.chest?.[0] ?? 0, params);

  const rotations: Record<string, Mat3> = {};
  for (const [boneId, xyz] of Object.entries(data.rotations)) {
    const [x, y, z] = xyz!;
    rotations[boneId] = eulerToMat3([scaleForGenome(boneId, x, params), y, z]);
  }
  const netX = upperArmNetXDegFor(stance, params);
  for (const side of SIDES) {
    const signZ = side === 'L' ? 1 : -1;
    rotations[`upperArm.${side}`] = eulerToMat3([
      upperArmLocalFromNet(netX, torsoPitchX, params),
      0,
      signZ * data.upperArmZDeg,
    ]);
  }

  const byId = new Map(bones.map((b) => [b.id, b] as const));
  const kneeBendScale = 0.5 + clamp(params.kneeBend / 15, 0, 1); // a little genome flavour, never to 0
  const pelvis = byId.get('pelvis')!;
  const stand = data.legs;
  const geoms = { L: legGeometryFor(bones, extents, 'L'), R: legGeometryFor(bones, extents, 'R') };
  const legLen = (geoms.L.legLen + geoms.R.legLen) / 2;
  // One leg carries the weight (which one: the actor's own seed), the other foot is the forward one.
  const loaded: Side = Math.floor(actor.seed) % 2 === 0 ? 'L' : 'R';
  const outward = (side: Side): number => Math.sign(byId.get(`thigh.${side}`)!.head[0]) || (side === 'L' ? -1 : 1);
  const loadedSign = outward(loaded);
  // Pelvis roll raising the loaded hip (rotZ lifts +x), the spine taking part of it back out.
  const tiltDeg = loadedSign * stand.pelvisTiltDeg;
  const pelvisR = rotZ(tiltDeg);
  rotations.pelvis = pelvisR;
  rotations.spine = mulMM(rotZ(-tiltDeg * stand.spineCounter), rotations.spine ?? IDENTITY_M);
  const rootX = loadedSign * stand.loadShift * legLen;
  for (const side of SIDES) {
    const { thighR, shinR, footR } = solveIdleLeg(byId, geoms[side], side, {
      pelvisR,
      tiltDeg,
      pivot: pelvis.head,
      rootX,
      footDx: outward(side) * stand.spread * legLen,
      zOffset: (side === loaded ? -1 : 1) * stand.stagger * legLen,
      crouchM: data.crouchM * kneeBendScale,
    });
    rotations[`thigh.${side}`] = thighR;
    rotations[`shin.${side}`] = shinR;
    rotations[`foot.${side}`] = footR;
  }

  const root: Vec3 = [rootX, groundOffset(bones, extents, rotations, GROUND_SMOOTHING), 0];
  return { root, rotations };
};

// Slow, small-amplitude procedural motion — periods in seconds, amplitudes in degrees. Never touches the
// legs (thigh/shin/foot): those are fixed by idleBasePose's own IK, so a standing actor's feet never slide
// no matter how long it's been idling (the "weight shift" reads through the chest/spine lean instead of
// the pelvis, exactly so it doesn't drag the legs — rotating the pelvis would move every leg bone with it).
const BREATH_RATE = (2 * Math.PI) / 3.5;
const BREATH_AMPLITUDE_DEG = 2;
const SWAY_RATE = (2 * Math.PI) / 5;
const SWAY_AMPLITUDE_DEG = 2.5;
const HEAD_RATE = (2 * Math.PI) / 6;
const HEAD_AMPLITUDE_DEG = 4;
const CLAW_RATE = (2 * Math.PI) / 1.2;
const CLAW_AMPLITUDE_DEG = 10;

/** Bake-facing oscillator data, in right-multiplication order (sway before breath). The live idle runs on the
 * saved Sim wander clock, so each period names that clock. */
export const idleMotion = (stance: IdleStance) => [
  { periodSimSeconds: 2 * Math.PI / SWAY_RATE, amplitudeDeg: SWAY_AMPLITUDE_DEG, salt: 2,
    bones: [{ bone: 'spine', axis: 'z', scale: 0.6 }, { bone: 'chest', axis: 'z', scale: 1 }] },
  { periodSimSeconds: 2 * Math.PI / BREATH_RATE, amplitudeDeg: BREATH_AMPLITUDE_DEG, salt: 1,
    bones: [{ bone: 'spine', axis: 'x', scale: 0.6 }, { bone: 'chest', axis: 'x', scale: 1 }] },
  { periodSimSeconds: 2 * Math.PI / HEAD_RATE, amplitudeDeg: HEAD_AMPLITUDE_DEG, salt: 3,
    bones: [{ bone: 'head', axis: 'y', scale: 1 }] },
  ...(stance === 'aggravated' ? [{ periodSimSeconds: 2 * Math.PI / CLAW_RATE, amplitudeDeg: CLAW_AMPLITUDE_DEG, salt: 4,
    bones: [{ bone: 'forearm.L', axis: 'x', scale: 1 }, { bone: 'forearm.R', axis: 'x', scale: -1 }] }] : []),
];

/** A cheap, deterministic 0..2π phase from `seed` and a `salt` (so different motions don't all line up) —
 * a shader-style hash-to-fraction, not a full RNG stream: this is cosmetic phase offsetting, not a
 * behaviourally-significant draw. */
const phaseFor = (seed: number, salt: number): number => {
  const h = Math.sin(seed * 12.9898 + salt * 78.233) * 43_758.5453;
  return (h - Math.floor(h)) * 2 * Math.PI;
};

/**
 * Layers slow procedural motion onto `base` (idleBasePose's output, or any pose — a caller blending walk
 * into idle at low speed could apply this to the already-blended result too): breathing (chest/spine),
 * a weight-shift sway (chest/spine rotZ), slow head motion, and — for `aggravated` — a restless
 * reach/claw on the forearms. `seed` phase-offsets everything so a crowd sharing one body doesn't breathe
 * in lockstep; deadvox passes each zombie's own id, not the shared variant's genome seed, for that reason.
 */
export const applyIdleMotion = (base: Pose, stance: IdleStance, time: number, seed: number): Pose => {
  const breathe = Math.sin(time * BREATH_RATE + phaseFor(seed, 1)) * BREATH_AMPLITUDE_DEG;
  const sway = Math.sin(time * SWAY_RATE + phaseFor(seed, 2)) * SWAY_AMPLITUDE_DEG;
  const headBob = Math.sin(time * HEAD_RATE + phaseFor(seed, 3)) * HEAD_AMPLITUDE_DEG;
  const baseR = (id: string): Mat3 => base.rotations[id] ?? IDENTITY_M;

  const rotations: Record<string, Mat3> = {
    ...base.rotations,
    spine: mulMM(baseR('spine'), mulMM(rotZ(sway * 0.6), rotX(breathe * 0.6))),
    chest: mulMM(baseR('chest'), mulMM(rotZ(sway), rotX(breathe))),
    head: mulMM(baseR('head'), rotY(headBob)),
  };

  if (stance === 'aggravated') {
    const claw = Math.sin(time * CLAW_RATE + phaseFor(seed, 4)) * CLAW_AMPLITUDE_DEG;
    for (const side of SIDES) {
      const sign = side === 'L' ? 1 : -1;
      rotations[`forearm.${side}`] = mulMM(baseR(`forearm.${side}`), rotX(claw * sign));
    }
  }

  return { root: base.root, rotations };
};

/** idleBasePose + applyIdleMotion, for a caller that doesn't need to cache the (time-independent) base
 * itself — the mobgen viewer/stress page/CLI bench all just want "the idle pose right now." */
export const idlePose = (actor: WalkActor, stance: IdleStance, time: number): Pose =>
  applyIdleMotion(idleBasePose(actor, stance), stance, time, actor.seed);
