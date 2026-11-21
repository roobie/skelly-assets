// The critter body plan: a low, long-bodied quadruped (a rat, a lizard) with a segmented tail, built deterministically from a genome's sampled
// params. It is its own plan rather than a dog row because the dog's proportions are fixed fractions of its withers height: no row could
// stretch its body, shorten its legs, sprawl them or give it a tail that drags and sways. Its legs and torso carry the dog's bone names, so
// it stands, walks and pounces with dog.ts's four-leg rig; this module adds what the long body needs on top (the tail's sway, a reach in
// proportion to its size).

import type { Body, Feature } from '../core/body.ts';
import type { Realized } from '../core/generate.ts';
import { type BodyPlanDef, registerBodyPlan, sampleParams } from '../core/generate.ts';
import { add, IDENTITY_M, lerp3, type Mat3, mulMM, rotX, rotY, type Vec3 } from '../core/math.ts';
import type { Pose } from '../core/pose.ts';
import { type Genome, type Template, templateByName } from '../core/template.ts';
import { heightHeadBudgets } from './budgets.ts';
import { DOG_POUNCE, dogAttackPose, dogGaitPose, dogIdlePose, dogStrideLength, type DogStance } from './dog.ts';
import { resolveMaterials } from './materials.ts';
import { partFeatures } from './parts.ts';

const SIDES = ['L', 'R'] as const;
type Side = (typeof SIDES)[number];
const sideSign = (s: Side): number => (s === 'L' ? -1 : 1);

/** Params sampled in this fixed order (see core/generate.ts's sampleParams). Lengths are fractions of `height` unless said. */
const CRITTER_PARAM_ORDER = [
  'height', // m, the shoulder height: the ground to the top of the fore legs
  'bodyLength', // hip joint to shoulder joint
  'girth', // the torso's radius
  'arch', // how far the back humps up over the middle of the torso
  'legSplay', // how far the knees and paws stand out sideways from the shoulders and hips: 0 under the body, 1 a lizard's sprawl
  'headScale',
  'snoutLength', // the head's length beyond the skull, a factor on the plan's own
  'earSize', // round ears on the skull; 0 has none
  'tailLength',
  'tailGirth', // the tail's root radius as a share of the torso's
  'headTilt', // degrees the head hangs (negative) or lifts at rest, as the dog's
  'jawOpen', // 0..1, as the dog's
  'limp', // 0..1, as the dog's: one diagonal steps short
  'skinHue',
  'skinSat',
  'skinLight',
] as const;

type CritterParams = Readonly<Record<(typeof CRITTER_PARAM_ORDER)[number], number>>;

/** The tail's bones, root to tip; enough joints that the sway reads as a wave. */
export const CRITTER_TAIL = ['tail', 'tail2', 'tail3', 'tail4'] as const;

/** The legs, as the dog names them (so dog.ts's rig poses them). */
const LEGS = [
  { upper: 'foreUpper', lower: 'foreLower', paw: 'forePaw', front: true },
  { upper: 'hindUpper', lower: 'hindLower', paw: 'hindPaw', front: false },
] as const;

/** Leg joint heights and fore-aft offsets from the shoulder or hip, as fractions of `height`; the knee and ankle bend the dog's way, so the rig's
 * two-link solve picks the same branch. At a legSplay of 1 the knee rises to `sprawlKnee` and the knee and paw stand `out` sideways: a
 * lizard's upper leg reaches out level from the body and the lower leg drops from there, so a sprawl is wide rather than a dog on stilts. */
const LEG_SHAPE = {
  fore: { knee: [0.5, -0.04], ankle: [0.12, -0.08], toe: [0.04, -0.24], sprawlKnee: 0.75, out: [0.7, 0.8] },
  hind: { knee: [0.55, 0.12], ankle: [0.14, 0.04], toe: [0.04, -0.2], sprawlKnee: 0.75, out: [0.7, 0.8] },
} as const;

interface LegJoints {
  readonly upper: Vec3;
  readonly knee: Vec3;
  readonly ankle: Vec3;
  readonly toe: Vec3;
}

interface CritterLayout {
  readonly h: number;
  readonly radius: number;
  readonly hips: Vec3;
  readonly back: Vec3;
  readonly chest: Vec3;
  readonly neckTop: Vec3;
  readonly snout: Vec3;
  readonly jawHinge: Vec3;
  readonly jawTip: Vec3;
  readonly tail: readonly Vec3[];
  readonly legs: Readonly<Record<string, LegJoints>>;
}

const critterLayout = (p: CritterParams): CritterLayout => {
  const h = p.height;
  const radius = 0.3 * h * p.girth;
  const half = (p.bodyLength * h) / 2;
  const hips: Vec3 = [0, 0.95 * h, half];
  const back: Vec3 = [0, (0.98 + p.arch) * h, 0];
  const chest: Vec3 = [0, 0.92 * h, -half];
  // The head hangs forward of the shoulders, low, its snout pointing down-forward: an animal nosing the ground.
  const neckTop: Vec3 = [0, 0.98 * h, -half - 0.22 * h];
  const headLength = 0.55 * h * p.headScale * p.snoutLength;
  const snout: Vec3 = add(neckTop, [0, -0.22 * headLength, -headLength]);
  const jawHinge: Vec3 = add(neckTop, [0, -0.12 * h * p.headScale, -0.1 * headLength]);
  const jawTip: Vec3 = add(snout, [0, -0.06 * h * p.headScale, 0.08 * headLength]);
  // The tail falls from the rump to a little above the ground in its first third and trails from there, clear of it so only the paws bear the body.
  const tailRoot: Vec3 = [0, 0.85 * h, half + 0.6 * radius];
  const tipY = 0.25 * h;
  const tail = Array.from({ length: CRITTER_TAIL.length + 1 }, (_, k): Vec3 => {
    const t = k / CRITTER_TAIL.length;
    return [0, tipY + (tailRoot[1] - tipY) * (1 - t) ** 3, tailRoot[2] + t * p.tailLength * h];
  });
  const legs: Record<string, LegJoints> = {};
  for (const leg of LEGS) {
    const shape = leg.front ? LEG_SHAPE.fore : LEG_SHAPE.hind;
    const root = leg.front ? chest : hips;
    for (const side of SIDES) {
      const s = sideSign(side);
      const x0 = s * 0.6 * radius;
      const outKnee = s * p.legSplay * shape.out[0] * h;
      const outPaw = s * p.legSplay * shape.out[1] * h;
      legs[`${leg.upper}.${side}`] = {
        upper: [x0, root[1] - 0.05 * h, root[2]],
        knee: [x0 + outKnee, (shape.knee[0] + (shape.sprawlKnee - shape.knee[0]) * p.legSplay) * h, root[2] + shape.knee[1] * h],
        ankle: [x0 + outPaw, shape.ankle[0] * h, root[2] + shape.ankle[1] * h],
        toe: [x0 + outPaw, shape.toe[0] * h, root[2] + shape.toe[1] * h],
      };
    }
  }
  return { h, radius, hips, back, chest, neckTop, snout, jawHinge, jawTip, tail, legs };
};

const buildBones = (l: CritterLayout): Body['bones'] => {
  const bones: Body['bones'][number][] = [
    { id: 'pelvis', parent: null, head: l.hips, tail: l.back },
    { id: 'spine', parent: 'pelvis', head: l.back, tail: l.chest },
    { id: 'neck', parent: 'spine', head: l.chest, tail: l.neckTop },
    { id: 'head', parent: 'neck', head: l.neckTop, tail: l.snout },
    { id: 'jaw', parent: 'head', head: l.jawHinge, tail: l.jawTip },
  ];
  CRITTER_TAIL.forEach((id, k) => bones.push({ id, parent: k === 0 ? 'pelvis' : CRITTER_TAIL[k - 1]!, head: l.tail[k]!, tail: l.tail[k + 1]! }));
  for (const leg of LEGS) {
    for (const side of SIDES) {
      const j = l.legs[`${leg.upper}.${side}`]!;
      const upper = `${leg.upper}.${side}`;
      const lower = `${leg.lower}.${side}`;
      bones.push(
        { id: upper, parent: leg.front ? 'spine' : 'pelvis', head: j.upper, tail: j.knee },
        { id: lower, parent: upper, head: j.knee, tail: j.ankle },
        { id: `${leg.paw}.${side}`, parent: lower, head: j.ankle, tail: j.toe },
      );
    }
  }
  return bones;
};

// ---- Flesh ----

const ellipsoid = (bone: string, center: Vec3, radii: Vec3, material = 'skin'): Feature => ({
  bone,
  op: 'add',
  shape: { kind: 'ellipsoid', center, radii },
  material,
});

const capsule = (bone: string, a: Vec3, b: Vec3, ra: number, rb: number, material = 'skin'): Feature => ({
  bone,
  op: 'add',
  shape: { kind: 'capsule', a, b, ra, rb },
  material,
});

const paint = (bone: string, center: Vec3, radii: Vec3, material: string, onto: readonly string[] = ['skin']): Feature => ({
  bone,
  op: 'paint',
  shape: { kind: 'ellipsoid', center, radii },
  material,
  onto,
});

const buildTorso = (l: CritterLayout): Feature[] => {
  const r = l.radius;
  // The haunch is the widest part, the chest narrower: the pear of a rodent or a lizard seen from above.
  return [
    ellipsoid('pelvis', lerp3(l.hips, l.back, 0.35), [1.05 * r, r, 1.1 * r]),
    capsule('pelvis', l.hips, l.back, 0.95 * r, 0.9 * r),
    ellipsoid('spine', lerp3(l.back, l.chest, 0.55), [0.88 * r, 0.85 * r, r]),
    capsule('spine', l.back, l.chest, 0.88 * r, 0.75 * r),
    capsule('neck', l.chest, l.neckTop, 0.7 * r, 0.5 * r),
    // The belly, a shade lighter under the body.
    paint('spine', [0, l.chest[1] - r, 0], [1.4 * r, 0.55 * r, 2 * Math.abs(l.chest[2]) + r], 'belly'),
  ];
};

const buildHead = (l: CritterLayout, p: CritterParams): Feature[] => {
  const h = l.h;
  const hs = h * p.headScale;
  const skull = lerp3(l.neckTop, l.snout, 0.2);
  const features: Feature[] = [
    ellipsoid('head', skull, [0.2 * hs, 0.18 * hs, 0.22 * hs]),
    capsule('head', skull, l.snout, 0.16 * hs, 0.06 * hs),
    capsule('jaw', l.jawHinge, l.jawTip, 0.1 * hs, 0.045 * hs),
    paint('head', l.snout, [0.1 * hs, 0.1 * hs, 0.08 * hs], 'nose'),
    // The jaw's core, so an open mouth's carve shows a dark gullet while the closed jaw's surface stays hide.
    { bone: 'jaw', op: 'paint', shape: { kind: 'capsule', a: l.jawHinge, b: l.jawTip, ra: 0.07 * hs, rb: 0.03 * hs }, material: 'mouth', onto: ['skin'] },
  ];
  for (const side of SIDES) {
    const s = sideSign(side);
    features.push(paint('head', add(skull, [s * 0.15 * hs, 0.05 * hs, -0.12 * hs]), [0.1 * hs, 0.1 * hs, 0.08 * hs], 'eye'));
    if (p.earSize > 0) {
      const e = p.earSize * hs;
      features.push(ellipsoid('head', add(skull, [s * 0.15 * hs, 0.17 * hs + 0.08 * e, 0.06 * hs]), [0.11 * e, 0.1 * e, 0.03 * e], 'ear'));
    }
  }
  if (p.jawOpen > 0.02) {
    features.push({
      bone: 'jaw',
      op: 'carve',
      shape: { kind: 'capsule', a: add(l.jawHinge, [0, 0.06 * hs, 0]), b: add(l.jawTip, [0, 0.03 * hs, 0]), ra: 0.06 * hs, rb: 0.03 * hs },
      material: 'skin',
    });
  }
  return features;
};

const buildTail = (l: CritterLayout, p: CritterParams): Feature[] => {
  const root = p.tailGirth * l.radius;
  const tip = Math.max(0.012, 0.15 * root);
  const n = CRITTER_TAIL.length;
  const radiusAt = (k: number): number => root + (tip - root) * (k / n);
  return CRITTER_TAIL.map((id, k) => capsule(id, l.tail[k]!, l.tail[k + 1]!, radiusAt(k), radiusAt(k + 1), 'tail'));
};

const buildLegs = (l: CritterLayout): Feature[] => {
  const h = l.h;
  const features: Feature[] = [];
  for (const leg of LEGS) {
    // The hind leg's thigh is thick, so the haunch reads; the fore leg is slight.
    const thigh = (leg.front ? 0.16 : 0.24) * h;
    for (const side of SIDES) {
      const j = l.legs[`${leg.upper}.${side}`]!;
      const upper = `${leg.upper}.${side}`;
      const lower = `${leg.lower}.${side}`;
      const paw = `${leg.paw}.${side}`;
      const sole = 0.07 * h;
      features.push(
        capsule(upper, j.upper, j.knee, thigh, 0.09 * h),
        capsule(lower, j.knee, j.ankle, 0.08 * h, 0.06 * h),
        // A flat-bottomed foot from heel to toe, so the sole, not the ankle joint, bears the ground contact.
        {
          bone: paw,
          op: 'add',
          shape: { kind: 'box', center: [j.ankle[0], sole / 2 + 0.005 * h, (j.ankle[2] + j.toe[2]) / 2], half: [0.07 * h, sole / 2, Math.abs(j.ankle[2] - j.toe[2]) / 2 + 0.03 * h], round: 0.02 * h },
          material: 'paw',
        },
        capsule(paw, j.ankle, [j.ankle[0], sole, j.ankle[2]], 0.06 * h, 0.06 * h, 'paw'),
      );
    }
  }
  return features;
};

/** Sickly mottling over the hide. */
const buildMottle = (l: CritterLayout): Feature => ({
  bone: 'spine',
  op: 'paint',
  shape: { kind: 'box', center: [0, l.h, 0], half: [2 * l.h, l.h, 4 * l.h], round: 0 },
  material: 'bruise',
  onto: ['skin'],
  noise: { scale: 0.05 * l.h / 0.2, threshold: 0.1 },
});

const buildCritter = (genome: Genome): Body => {
  const p = genome.params as CritterParams;
  const layout = critterLayout(p);
  const bones = buildBones(layout);
  const template = templateByName(genome.template);
  const features = [
    ...buildTorso(layout),
    ...buildHead(layout, p),
    ...buildTail(layout, p),
    ...buildLegs(layout),
    buildMottle(layout),
    ...partFeatures(template.parts ?? [], bones), // a mob row's signature parts (models/mobs.json), after the body so they paint over it
  ];
  return { bones, features, materials: resolveMaterials(template, p) };
};

registerBodyPlan('critter', {
  sample: (rng, template: Template) => ({ params: sampleParams(rng, template.params, CRITTER_PARAM_ORDER), wounds: [] }),
  build: (genome) => buildCritter(genome),
  paramOrder: CRITTER_PARAM_ORDER,
  woundBones: [],
  budgets: heightHeadBudgets,
  limbBones: SIDES.flatMap((side) => ['foreUpper', 'foreLower', 'hindUpper', 'hindLower'].map((segment) => `${segment}.${side}`)),
});

// ---- Poses: the dog's four-leg rig, with the tail's sway and a size-true pounce ----

/** The tail's side-to-side wave: degrees at each joint (rotY), and how far the wave runs behind from one joint to the next (radians). A walking
 * critter swings it once a stride; standing, it barely stirs. */
const TAIL_SWAY = { walkDeg: 9, idleDeg: 3, lag: 0.9 } as const;

/** The withers height dog.ts's pounce keys were authored for (dogTemplate's mid height): a critter's pounce reaches in proportion to its own. */
const DOG_SHOULDER = 0.61;

export const critterStance = (p: Readonly<Record<string, number>>): DogStance => ({ limp: p.limp, headTilt: p.headTilt, jawOpen: p.jawOpen });

const withTailWave = (pose: Pose, phase: number, amplitudeDeg: number): Pose => {
  const rotations: Record<string, Mat3> = { ...pose.rotations };
  CRITTER_TAIL.forEach((id, k) => {
    rotations[id] = mulMM(rotations[id] ?? IDENTITY_M, rotY(amplitudeDeg * Math.sin(phase - k * TAIL_SWAY.lag)));
  });
  return { ...pose, rotations };
};

const shoulderHeight = (realized: Realized): number => realized.body.bones.find((b) => b.id === 'foreUpper.L')!.head[1];

export const critterIdlePose = (realized: Realized, stance: DogStance): Pose =>
  withTailWave(dogIdlePose(realized, stance), Math.PI / 2, TAIL_SWAY.idleDeg);

export const critterStrideLength = (realized: Realized, stance: DogStance): number => dogStrideLength(realized, stance);

/** The dog's diagonal trot, the tail swinging once a stride and lifting a little off the ground so it never props the body. */
export const critterGaitPose = (realized: Realized, distance: number, speed: number, stance: DogStance): Pose => {
  const phase = (2 * Math.PI * distance) / critterStrideLength(realized, stance);
  const pose = dogGaitPose(realized, distance, speed, stance);
  return withTailWave({ ...pose, rotations: { ...pose.rotations, tail: mulMM(pose.rotations.tail ?? IDENTITY_M, rotX(-4)) } }, phase, TAIL_SWAY.walkDeg);
};

export const CRITTER_POUNCE = DOG_POUNCE;

export const critterAttackPose = (realized: Realized, base: Pose, time: number): Pose =>
  dogAttackPose(realized, base, time, { reach: shoulderHeight(realized) / DOG_SHOULDER });
