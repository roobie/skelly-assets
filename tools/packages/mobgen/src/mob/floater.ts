// The floater body plan: a legless body that hovers, built deterministically from a genome's sampled params. One plan covers
// a flame figure (head, thin arms, a long tail tapering to the ground) and a rigid orb (a core and a ring of spikes): the
// bones that exist follow the params (`headScale` 0 has no head, `armLength` 0 no arms, `tailSegments` 0 no tail,
// `tongueCount` 0 no tongues), and a mob row narrows them to its sprite.
//
// The rest pose touches the ground (the validity rules want a grounded body); every pose then lifts the whole body by the
// `hover` param, so the model floats in its clips. The tail's curl, the sway, the flicker of the tongues and the cast are
// all poses: rigid rotations about bone heads, in the parent's frame, stacked down the tail chain. Everything is
// authored in the body's own frame facing -Z (conventions.ts); mobs.mjs turns the export to face +Z.

import type { Body, Feature } from '../core/body.ts';
import type { Realized } from '../core/generate.ts';
import { type BodyPlanDef, registerBodyPlan, sampleParams } from '../core/generate.ts';
import { add, IDENTITY_M, type Mat3, mulMM, rotX, rotY, rotZ, scale, type Vec3 } from '../core/math.ts';
import type { Pose } from '../core/pose.ts';
import { type Genome, type Template, templateByName } from '../core/template.ts';
import { heightHeadBudgets } from './budgets.ts';
import { resolveMaterials } from './materials.ts';
import { partFeatures } from './parts.ts';

/** Params sampled in this fixed order (see core/generate.ts's sampleParams). Lengths are fractions of `height` unless said. */
const FLOATER_PARAM_ORDER = [
  'height', // m, ground to the top of the head or the tongues' tips at rest
  'headScale', // head radius as a fraction of height; 0 has no head
  'hover', // m the whole body is lifted in every clip
  'coreWidth', // core half-extents: x, y (so the core is 2 * coreHeight tall) and z
  'coreHeight',
  'coreDepth',
  'tailLength', // fraction of height from the ground to the core's underside; 0 has no tail
  'tailSegments', // bones in the tail chain
  'tailRadius', // radius where the tail leaves the core
  'tailTipRadius',
  'armLength', // fraction of height, shoulder to hand; 0 has no arms
  'armRadius',
  'armDrop', // degrees below horizontal the upper arm hangs; the forearm hangs a further armBend
  'armBend',
  'tongueCount', // spikes round the head (or the core, with no head)
  'tongueLength',
  'tongueRadius',
  'tongueElevMin', // degrees above horizontal the spikes fan between
  'tongueElevMax',
  'speckle', // noise threshold of the hot patches painted over the body (0 none)
  'tailCurl', // degrees the idle tail curls through its whole length
  'sway', // degrees of the tail's travelling sway in the walk
  'flicker', // degrees the tongues jitter in the walk, and a fraction of it at rest
  'bob', // m the body bobs in the walk
  'lean', // degrees the body leans into the walk
  'driftCycle', // m of travel for one cycle of the walk
] as const;

type FloaterParams = Readonly<Record<(typeof FLOATER_PARAM_ORDER)[number], number>>;

const SIDES = ['L', 'R'] as const;
type Side = (typeof SIDES)[number];
const sideSign = (s: Side): number => (s === 'L' ? -1 : 1);

/** Layout constants of the body's shape that are not a row's business. */
const SHAPE = {
  headCenterInCore: 0.8, // how far up the core's top the head's centre sits, as a fraction of the head radius lowered
  waistWidth: 0.55, // the core's lower taper, as a fraction of its half-width
  shoulderWidth: 0.8, // the shoulder's x, as a fraction of the core half-width
  shoulderBelowTop: 0.28, // as a fraction of the core's half-height
  armTipTaper: 0.6,
  tongueRootInset: 0.55, // where a tongue starts, as a fraction of the radius it leaves from
  tongueTipRadius: 0.3, // fraction of its root radius
  tongueGroundClearance: 0.01, // m a tongue tip keeps above the ground
  azimuthStepDeg: 137.50776, // the golden angle: tongues spread round without lining up
  eyeRadius: 0.3, // fraction of the head radius
  eyeSpread: 0.42,
  eyeHeight: 0.15,
  eyeDepth: 0.85,
  eyeSquash: 0.55, // the eye's height over its width: a slit
  speckleScale: 0.09, // m per noise cell of the hot patches
  hotFrontShare: 0.7, // the front hot streak's size as a fraction of the core's
  blend: 0.03, // smooth-min radius of the body's parts, as a fraction of the height
} as const;

/** The tail's colour bands from its root: the material up to a fraction of its length (a flame is hot at the heart, red at the end). */
const TAIL_BANDS: readonly { readonly upTo: number; readonly material: string }[] = [
  { upTo: 0.3, material: 'hot' },
  { upTo: 0.7, material: 'body' },
  { upTo: 1, material: 'edge' },
];
/** The arms' bands, shoulder to hand. */
const ARM_BANDS: readonly { readonly upTo: number; readonly material: string }[] = [
  { upTo: 0.5, material: 'body' },
  { upTo: 1, material: 'edge' },
];
const bandMaterial = (bands: readonly { readonly upTo: number; readonly material: string }[], u: number): string =>
  (bands.find((b) => u <= b.upTo) ?? bands.at(-1)!).material;

interface FloaterLayout {
  readonly p: FloaterParams;
  readonly h: number;
  readonly coreBottom: Vec3;
  readonly coreTop: Vec3;
  readonly coreCenter: Vec3;
  readonly headCenter: Vec3 | null;
  readonly headRadius: number;
  readonly crown: Vec3 | null;
  readonly tailPoints: readonly Vec3[]; // segments + 1 points from the core's underside to the ground
  readonly arms: Readonly<Record<Side, readonly [Vec3, Vec3, Vec3] | null>>; // shoulder, elbow, hand
  readonly tongues: readonly { readonly from: Vec3; readonly to: Vec3; readonly parent: string }[];
}

const floaterLayout = (p: FloaterParams): FloaterLayout => {
  const h = p.height;
  const coreHalf = p.coreHeight * h;
  const coreBottomY = p.tailLength * h;
  const coreCy = coreBottomY + coreHalf;
  const coreBottom: Vec3 = [0, coreBottomY, 0];
  const coreTop: Vec3 = [0, coreBottomY + 2 * coreHalf, 0];
  const coreCenter: Vec3 = [0, coreCy, 0];
  const headRadius = p.headScale * h;
  const hasHead = headRadius > 0;
  const headCenter: Vec3 | null = hasHead ? [0, coreTop[1] + SHAPE.headCenterInCore * headRadius, 0] : null;
  const crown: Vec3 | null = headCenter ? [0, headCenter[1] + headRadius, 0] : null;

  const segments = Math.round(p.tailSegments);
  const tailPoints: Vec3[] = [];
  // the chain ends one tip radius above the ground, so the rounded end rests on it rather than dipping through
  const tipY = p.tailTipRadius * h;
  for (let i = 0; i <= segments && p.tailLength > 0; i++) tailPoints.push([0, tipY + (coreBottomY - tipY) * (1 - i / segments), 0]);

  const arms: Record<Side, readonly [Vec3, Vec3, Vec3] | null> = { L: null, R: null };
  if (p.armLength > 0) {
    const half = (p.armLength * h) / 2;
    const drop = (p.armDrop * Math.PI) / 180;
    const fore = ((p.armDrop + p.armBend) * Math.PI) / 180;
    for (const side of SIDES) {
      const shoulder: Vec3 = [sideSign(side) * SHAPE.shoulderWidth * p.coreWidth * h, coreTop[1] - SHAPE.shoulderBelowTop * coreHalf, 0];
      const elbow = add(shoulder, [sideSign(side) * half * Math.cos(drop), -half * Math.sin(drop), 0]);
      const hand = add(elbow, [sideSign(side) * half * Math.cos(fore), -half * Math.sin(fore), 0]);
      arms[side] = [shoulder, elbow, hand];
    }
  }

  const tongues: { from: Vec3; to: Vec3; parent: string }[] = [];
  const origin = headCenter ?? coreCenter;
  const reach = hasHead ? headRadius : Math.max(p.coreWidth, p.coreHeight, p.coreDepth) * h;
  const count = Math.round(p.tongueCount);
  for (let i = 0; i < count; i++) {
    const elev = ((p.tongueElevMin + ((p.tongueElevMax - p.tongueElevMin) * (i + 0.5)) / count) * Math.PI) / 180;
    const azim = (i * SHAPE.azimuthStepDeg * Math.PI) / 180;
    const dir: Vec3 = [Math.cos(elev) * Math.sin(azim), Math.sin(elev), -Math.cos(elev) * Math.cos(azim)];
    const length = reach + p.tongueLength * h;
    // a tip below the ground would break the grounded body: shorten the tongue to stop above it
    const lowest = dir[1] < 0 ? Math.min(1, (origin[1] - SHAPE.tongueGroundClearance) / (length * -dir[1])) : 1;
    tongues.push({
      from: add(origin, scale(dir, SHAPE.tongueRootInset * reach)),
      to: add(origin, scale(dir, length * lowest)),
      parent: hasHead ? 'head' : 'core',
    });
  }
  return { p, h, coreBottom, coreTop, coreCenter, headCenter, headRadius, crown, tailPoints, arms, tongues };
};

const buildBones = (l: FloaterLayout): Body['bones'] => {
  const bones: Body['bones'][number][] = [{ id: 'core', parent: null, head: l.coreBottom, tail: l.coreTop }];
  if (l.headCenter && l.crown) bones.push({ id: 'head', parent: 'core', head: l.coreTop, tail: l.crown });
  for (let i = 0; i + 1 < l.tailPoints.length; i++) {
    bones.push({ id: `tail.${i}`, parent: i === 0 ? 'core' : `tail.${i - 1}`, head: l.tailPoints[i]!, tail: l.tailPoints[i + 1]! });
  }
  for (const side of SIDES) {
    const arm = l.arms[side];
    if (!arm) continue;
    bones.push({ id: `arm.${side}`, parent: 'core', head: arm[0], tail: arm[1] });
    bones.push({ id: `forearm.${side}`, parent: `arm.${side}`, head: arm[1], tail: arm[2] });
  }
  l.tongues.forEach((t, i) => bones.push({ id: `tongue.${i}`, parent: t.parent, head: t.from, tail: t.to }));
  return bones;
};

const capsule = (bone: string, a: Vec3, b: Vec3, ra: number, rb: number, material: string, blend: number): Feature => ({
  bone,
  op: 'add',
  shape: { kind: 'capsule', a, b, ra, rb },
  material,
  blend,
});

const buildFlesh = (l: FloaterLayout): Feature[] => {
  const { p, h } = l;
  const blend = SHAPE.blend * h;
  const half = p.coreHeight * h;
  const radii: Vec3 = [p.coreWidth * h, half, p.coreDepth * h];
  const features: Feature[] = [
    { bone: 'core', op: 'add', shape: { kind: 'ellipsoid', center: l.coreCenter, radii }, material: 'body', blend },
  ];
  if (p.tailLength > 0) {
    // the underside narrows into the tail
    features.push(capsule('core', l.coreBottom, l.coreCenter, SHAPE.waistWidth * radii[0], radii[0], 'body', blend));
  }
  if (l.headCenter) {
    const r = l.headRadius;
    features.push({ bone: 'head', op: 'add', shape: { kind: 'ellipsoid', center: l.headCenter, radii: [r, r * 1.05, r] }, material: 'body', blend });
    // two dark slits for eyes
    for (const side of SIDES) {
      features.push({
        bone: 'head',
        op: 'paint',
        shape: {
          kind: 'ellipsoid',
          center: [sideSign(side) * SHAPE.eyeSpread * r, l.headCenter[1] + SHAPE.eyeHeight * r, -SHAPE.eyeDepth * r],
          radii: [SHAPE.eyeRadius * r, SHAPE.eyeRadius * r * SHAPE.eyeSquash, SHAPE.eyeRadius * r],
        },
        material: 'eye',
      });
    }
  }
  const segments = l.tailPoints.length - 1;
  for (let i = 0; i < segments; i++) {
    const u0 = i / segments;
    const u1 = (i + 1) / segments;
    const r = (u: number) => p.tailRadius * h + (p.tailTipRadius * h - p.tailRadius * h) * u;
    features.push(capsule(`tail.${i}`, l.tailPoints[i]!, l.tailPoints[i + 1]!, r(u0), r(u1), bandMaterial(TAIL_BANDS, (u0 + u1) / 2), blend));
  }
  for (const side of SIDES) {
    const arm = l.arms[side];
    if (!arm) continue;
    const r = p.armRadius * h;
    features.push(capsule(`arm.${side}`, arm[0], arm[1], r, r * (1 + SHAPE.armTipTaper) / 2, bandMaterial(ARM_BANDS, 0.25), blend));
    features.push(capsule(`forearm.${side}`, arm[1], arm[2], r * (1 + SHAPE.armTipTaper) / 2, r * SHAPE.armTipTaper, bandMaterial(ARM_BANDS, 0.75), blend));
  }
  const rt = p.tongueRadius * h;
  l.tongues.forEach((t, i) => features.push(capsule(`tongue.${i}`, t.from, t.to, rt, rt * SHAPE.tongueTipRadius, 'edge', blend * 0.5)));
  return features;
};

/** The hot patches: a streak down the front of the core, and noise-gated speckles over everything painted `body`. */
const buildHeat = (l: FloaterLayout): Feature[] => {
  const { p, h } = l;
  const features: Feature[] = [];
  const front: Vec3 = [0, l.coreCenter[1], -p.coreDepth * h * 0.5];
  features.push({
    bone: 'core',
    op: 'paint',
    shape: { kind: 'ellipsoid', center: front, radii: [p.coreWidth * h * SHAPE.hotFrontShare * 0.6, p.coreHeight * h * SHAPE.hotFrontShare * 1.2, p.coreDepth * h * SHAPE.hotFrontShare] },
    material: 'hot',
    onto: ['body'],
  });
  if (p.speckle > 0) {
    features.push({
      bone: 'core',
      op: 'paint',
      shape: { kind: 'box', center: [0, h / 2, 0], half: [h, h, h], round: 0 },
      material: 'hot',
      onto: ['body'],
      noise: { scale: SHAPE.speckleScale, threshold: p.speckle },
    });
    features.push({
      bone: 'core',
      op: 'paint',
      shape: { kind: 'box', center: [0, h / 2, 0], half: [h, h, h], round: 0 },
      material: 'edge',
      onto: ['body'],
      noise: { scale: SHAPE.speckleScale * 1.7, threshold: p.speckle * 0.8 },
    });
  }
  return features;
};

const buildFloater = (genome: Genome): Body => {
  const p = genome.params as FloaterParams;
  const layout = floaterLayout(p);
  const bones = buildBones(layout);
  const template = templateByName(genome.template);
  const features = [...buildFlesh(layout), ...buildHeat(layout), ...partFeatures(template.parts ?? [], bones)];
  return { bones, features, materials: resolveMaterials(template, p) };
};

registerBodyPlan('floater', {
  sample: (rng, template: Template) => ({ params: sampleParams(rng, template.params, FLOATER_PARAM_ORDER), wounds: [] }),
  build: (genome) => buildFloater(genome),
  paramOrder: FLOATER_PARAM_ORDER,
  woundBones: [],
  budgets: heightHeadBudgets,
  limbBones: [],
});

// ---- Poses ----

/** One instant of the body's motion: degrees about each axis, mirrored on the left (y and z flip), metres of rise. */
export interface FloaterMotion {
  readonly core?: Vec3;
  readonly head?: Vec3;
  readonly arm?: Vec3;
  readonly forearm?: Vec3;
  /** Extra degrees about x and z spread along the tail's whole length (each segment takes its share). */
  readonly tail?: readonly [number, number];
  /** The tail's travelling sway: degrees amplitude, phase in radians; each segment lags by TAIL_LAG. */
  readonly sway?: { readonly amp: number; readonly phase: number };
  /** The tongues' jitter: degrees amplitude, phase in radians. */
  readonly flicker?: { readonly amp: number; readonly phase: number };
  readonly rise?: number;
  readonly lunge?: number;
}

/** How the clips move, as data: harmonics of a cycle (integers, so a loop closes) and per-segment phase lags. */
export const FLOATER_MOTION = {
  tailLagRad: 0.55, // phase lag of each tail segment behind the one above it
  tailLiftShare: 0.35, // the x-sway as a fraction of the z-sway, so the tail wags in an ellipse
  bobHarmonic: 2,
  flickerHarmonic: 3,
  flickerRatePerTongue: 2.399963, // phase step between tongues (radians)
  flickerAxisShare: 0.7, // the second axis of a tongue's jitter, as a fraction of the first
  armFlapHarmonic: 1,
  armFlapDeg: 10, // degrees the arms drift up and down in the walk
  headNodDeg: 4,
  restFlickerShare: 0.25, // the flicker at rest, as a fraction of the walk's
} as const;

const matOf = (v: Vec3 | undefined, mirror: number): Mat3 =>
  v ? mulMM(rotZ(v[2] * mirror), mulMM(rotY(v[1] * mirror), rotX(v[0]))) : IDENTITY_M;

/** The pose of a motion over the rest body, lifted by `hover`. */
export const floaterPose = (realized: Realized, p: FloaterParams, m: FloaterMotion = {}): Pose => {
  const rotations: Record<string, Mat3> = {};
  const segments = Math.round(p.tailSegments);
  const flicker = m.flicker;
  for (const bone of realized.body.bones) {
    const id = bone.id;
    const [kind, tag] = id.split('.');
    if (kind === 'core') rotations[id] = matOf(m.core, 1);
    else if (kind === 'head') rotations[id] = matOf(m.head, 1);
    else if (kind === 'arm') rotations[id] = matOf(m.arm, sideSign(tag as Side));
    else if (kind === 'forearm') rotations[id] = matOf(m.forearm, sideSign(tag as Side));
    else if (kind === 'tail') {
      const i = Number(tag);
      const lag = m.sway ? m.sway.amp * Math.sin(m.sway.phase - i * FLOATER_MOTION.tailLagRad) : 0;
      const x = (m.tail?.[0] ?? 0) / segments + lag * FLOATER_MOTION.tailLiftShare * Math.cos(m.sway?.phase ?? 0);
      const z = (m.tail?.[1] ?? 0) / segments + lag;
      rotations[id] = mulMM(rotZ(z), rotX(x));
    } else if (kind === 'tongue' && flicker) {
      const i = Number(tag);
      const ph = flicker.phase + i * FLOATER_MOTION.flickerRatePerTongue;
      rotations[id] = mulMM(rotX(flicker.amp * Math.sin(ph)), rotZ(flicker.amp * FLOATER_MOTION.flickerAxisShare * Math.cos(ph * 1.3)));
    }
  }
  return { root: [0, p.hover + (m.rise ?? 0), m.lunge ?? 0], rotations };
};

/** The hovering rest: the tail curled, the tongues a little restless. */
export const floaterIdleMotion = (p: FloaterParams): FloaterMotion => ({
  tail: [0, p.tailCurl],
  flicker: { amp: p.flicker * FLOATER_MOTION.restFlickerShare, phase: 0 },
});

export const floaterIdlePose = (realized: Realized, p: FloaterParams): Pose => floaterPose(realized, p, floaterIdleMotion(p));

/** The drift at `progress` (0..1 of one cycle): the tail's sway travelling down, the body bobbing and leaning, the arms trailing, the tongues flickering. */
export const floaterDriftPose = (realized: Realized, p: FloaterParams, progress: number): Pose => {
  const phase = 2 * Math.PI * progress;
  const base = floaterIdleMotion(p);
  const flap = FLOATER_MOTION.armFlapDeg * Math.sin(phase * FLOATER_MOTION.armFlapHarmonic);
  return floaterPose(realized, p, {
    ...base,
    core: [-p.lean, 0, 0],
    head: [FLOATER_MOTION.headNodDeg * Math.sin(phase * FLOATER_MOTION.bobHarmonic), 0, 0],
    arm: [0, p.lean, flap],
    sway: { amp: p.sway, phase },
    flicker: { amp: p.flicker, phase: phase * FLOATER_MOTION.flickerHarmonic },
    rise: p.bob * Math.sin(phase * FLOATER_MOTION.bobHarmonic),
  });
};

/** One key of the cast: time in seconds and the motion at it. */
interface CastKey {
  readonly t: number;
  readonly motion: FloaterMotion;
}

/** A cast: gather back (lean away, arms drawn up and back, the tongues flaring), thrust forward at `hitTime` (lean in, arms flung forward, a lunge), then settle. */
export const FLOATER_CAST = {
  name: 'cast',
  duration: 0.9,
  hitTime: 0.45,
  keys: [
    { t: 0, motion: {} },
    {
      t: 0.3,
      motion: { core: [14, 0, 0], head: [10, 0, 0], arm: [-20, -35, 40], forearm: [-30, -20, 20], tail: [12, 40], flicker: { amp: 22, phase: 0 }, rise: 0.06, lunge: 0.08 },
    },
    {
      t: 0.45,
      motion: { core: [-24, 0, 0], head: [-16, 0, 0], arm: [-10, 70, -25], forearm: [0, 25, -10], tail: [-10, -55], flicker: { amp: 38, phase: 2 }, rise: 0.02, lunge: -0.22 },
    },
    {
      t: 0.6,
      motion: { core: [-14, 0, 0], head: [-8, 0, 0], arm: [-6, 55, -15], forearm: [0, 15, -6], tail: [0, -20], flicker: { amp: 26, phase: 4 }, lunge: -0.16 },
    },
    { t: 0.9, motion: {} },
  ] as readonly CastKey[],
} as const;

const mixVec = (a: Vec3 | undefined, b: Vec3 | undefined, u: number): Vec3 | undefined =>
  a || b ? [0, 1, 2].map((k) => (a?.[k] ?? 0) + ((b?.[k] ?? 0) - (a?.[k] ?? 0)) * u) as unknown as Vec3 : undefined;

const smooth = (x: number): number => x * x * (3 - 2 * x);

/** The cast at `time` over the idle, eased between its keys. */
export const floaterCastPose = (realized: Realized, p: FloaterParams, time: number): Pose => {
  const { keys, duration } = FLOATER_CAST;
  const t = Math.max(0, Math.min(duration, time));
  let hi = keys.findIndex((k) => k.t >= t);
  if (hi < 0) hi = keys.length - 1;
  const lo = Math.max(0, hi - 1);
  const span = keys[hi]!.t - keys[lo]!.t;
  const u = span > 0 ? smooth((t - keys[lo]!.t) / span) : 1;
  const a = keys[lo]!.motion;
  const b = keys[hi]!.motion;
  const num = (x: number | undefined, y: number | undefined): number => (x ?? 0) + ((y ?? 0) - (x ?? 0)) * u;
  const idle = floaterIdleMotion(p);
  const tail = [num(a.tail?.[0], b.tail?.[0]) + (idle.tail?.[0] ?? 0), num(a.tail?.[1], b.tail?.[1]) + (idle.tail?.[1] ?? 0)] as const;
  const amp = num(a.flicker?.amp, b.flicker?.amp) + idle.flicker!.amp;
  return floaterPose(realized, p, {
    core: mixVec(a.core, b.core, u),
    head: mixVec(a.head, b.head, u),
    arm: mixVec(a.arm, b.arm, u),
    forearm: mixVec(a.forearm, b.forearm, u),
    tail,
    flicker: { amp, phase: num(a.flicker?.phase, b.flicker?.phase) },
    rise: num(a.rise, b.rise),
    lunge: num(a.lunge, b.lunge),
  });
};
