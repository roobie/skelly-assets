// The dragon body plan: a big winged biped reared up on digitigrade hind legs, built deterministically from a genome's sampled params. Hips and
// legs below, a belly-ribbed torso, a long S-curved neck chain to a horned head with a hinged jaw, clawed forelimbs, two membrane wings (an arm and a
// fan of finger spars and the membrane stretched between them) up behind, and a thick tail chain whose end rests on the ground. A mob row narrows the
// params to its sprite and brings its palette.
//
// The shape is the SHAPE table below, authored in metres for a dragon REF_HEIGHT tall (the crown of its head) facing -Z (conventions.ts) and scaled by
// the row's `height`; mobs.mjs turns the export to face +Z. Poses are rigid rotations about bone heads in rest-world axes, stacked down the chains
// (pose.ts); the walk is by distance: each hind foot is planted on the moving ground and the ankle placed by dog.ts's two-link solve.

import type { Body, Feature } from '../core/body.ts';
import type { Realized } from '../core/generate.ts';
import { type BodyPlanDef, registerBodyPlan, sampleParams } from '../core/generate.ts';
import { IDENTITY_M, lerp3, type Mat3, mulMM, rotX, rotY, rotZ, scale, sub, type Vec3 } from '../core/math.ts';
import type { Pose } from '../core/pose.ts';
import { type Genome, type Template, templateByName } from '../core/template.ts';
import { heightHeadBudgets } from './budgets.ts';
import { stanceLegAngles } from './dog.ts';
import { resolveMaterials } from './materials.ts';
import { partFeatures } from './parts.ts';

/** Params sampled in this fixed order (see core/generate.ts's sampleParams). */
const DRAGON_PARAM_ORDER = [
  'height', // m, ground to the crown of the head at rest
  'headScale', // the head's size relative to the reference head (1 = the SHAPE table's)
  'bulk', // girth of the body, the limbs and the tail (1 = the SHAPE table's)
  'wingSpan', // the wings' reach out from the shoulder (1 = the SHAPE table's)
  'hornLength', // the horns' length (1 = the SHAPE table's)
  'spots', // noise threshold of the dark mottling over `body` (0 none)
  'spark', // noise threshold of glowing flecks over `body` (0 none)
  'strideRatio', // the hind foot's travel over one stance as a fraction of the leg's full reach
  'liftRatio', // how high the swinging foot rises, as a fraction of the leg's full reach
  'bob', // m the body sinks on each footfall
  'sway', // degrees the tail's sway travels through in the walk
  'neckSway', // degrees the neck and head sway (yaw) in the walk
  'wingFlap', // degrees the wings beat in the walk
  'armSwing', // degrees the forelimbs swing against the hind legs in the walk
  'lean', // degrees the torso leans into the walk
] as const;

type DragonParams = Readonly<Record<(typeof DRAGON_PARAM_ORDER)[number], number>>;

const SIDES = ['L', 'R'] as const;
type Side = (typeof SIDES)[number];
const sideSign = (s: Side): number => (s === 'L' ? -1 : 1);

type P = readonly [number, number, number];

/** The shape of the body, in metres for a dragon REF_HEIGHT tall. Points on the right side (x >= 0) are mirrored to the left. */
const REF_HEIGHT = 3.5;
const SHAPE = {
  hip: [0.4, 1.32, 0.3] as P, // the hind leg's hip
  knee: [0.46, 0.88, -0.08] as P,
  hock: [0.44, 0.5, 0.42] as P, // the ankle, behind the knee: the leg is digitigrade
  ball: [0.44, 0.105, 0.12] as P, // the ball of the foot, on the ground
  toe: [0.44, 0.075, -0.4] as P,
  thighRadii: [0.26, 0.17] as const,
  shinRadii: [0.16, 0.11] as const,
  footRadii: [0.1, 0.09, 0.07] as const, // hock, ball, toe
  clawLength: 0.14,
  clawRadius: 0.04,
  footBlend: 0.2, // the foot's smooth-min blend as a fraction of the body's, so it does not swell below the ground
  pelvis: { head: [0, 1.3, 0.3] as P, tail: [0, 1.6, 0.12] as P, center: [0, 1.48, 0.22] as P, radii: [0.42, 0.4, 0.46] as P },
  spine: { tail: [0, 2.05, -0.02] as P, center: [0, 1.85, 0.08] as P, radii: [0.46, 0.42, 0.46] as P },
  chest: { tail: [0, 2.5, -0.14] as P, center: [0, 2.2, -0.06] as P, radii: [0.52, 0.52, 0.48] as P },
  /** Neck joints from the chest to the base of the head, and the radius at each: rises, leans back, then sweeps forward. */
  neck: [
    { at: [0, 2.45, -0.12] as P, r: 0.26 },
    { at: [0, 2.85, -0.02] as P, r: 0.22 },
    { at: [0, 3.2, -0.22] as P, r: 0.19 },
    { at: [0, 3.4, -0.55] as P, r: 0.17 },
    { at: [0, 3.4, -0.85] as P, r: 0.15 },
  ],
  head: {
    snoutTail: [0, 3.22, -1.45] as P,
    skull: { center: [0, 3.4, -0.97] as P, radii: [0.2, 0.19, 0.28] as P },
    snout: { a: [0, 3.36, -1.15] as P, b: [0, 3.2, -1.45] as P, radii: [0.12, 0.085] as const },
    jaw: { hinge: [0, 3.27, -1.0] as P, tip: [0, 3.1, -1.42] as P, radii: [0.09, 0.06] as const },
    horns: [
      { from: [0.14, 3.52, -0.8] as P, to: [0.3, 3.64, -0.4] as P, radii: [0.055, 0.026] as const },
      { from: [0.19, 3.3, -0.8] as P, to: [0.34, 3.26, -0.56] as P, radii: [0.04, 0.024] as const },
    ],
    eye: { at: [0.16, 3.44, -1.07] as P, radii: [0.05, 0.035, 0.06] as P },
  },
  shoulder: [0.55, 2.35, -0.08] as P,
  elbow: [0.62, 1.9, -0.28] as P,
  wrist: [0.52, 1.62, -0.75] as P,
  handTip: [0.5, 1.42, -1.0] as P,
  armRadii: [0.14, 0.11, 0.1] as const, // shoulder, elbow, wrist
  palm: [0.1, 0.1, 0.12] as P,
  talons: [-0.07, 0, 0.07] as readonly number[], // x offsets of the fingers' talons from the hand's line
  talonSpread: 1.6, // a talon's tip sits this many times further off the hand's line than its root
  talonReach: [0.0, -0.22, -0.34] as P, // from the wrist to a talon's tip (x is the finger's offset)
  talonRadii: [0.05, 0.03] as const,
  /** A wing: the shoulder, the wrist, the finger tips (the last one is the membrane's anchor on the body's flank) and the membrane's thickness. */
  wing: {
    shoulder: [0.3, 2.45, 0.22] as P,
    wrist: [0.95, 3.45, 0.4] as P,
    tips: [[1.55, 3.85, 0.5], [1.75, 3.35, 0.6], [1.45, 2.75, 0.6], [0.35, 2.3, 0.36]] as readonly P[],
    fanBone: 1, // the finger tip that ends the fan's bone
    armRadii: [0.09, 0.06] as const,
    sparRadii: [0.045, 0.03] as const,
    membrane: 0.045, // half thickness of the membrane
    arcSpacing: 1.6, // spacing of the membrane's arcs, as a multiple of its half thickness
  },
  /** The tail's joints from the hips back and down, and the radius at each. The end rests on the ground. */
  tail: [
    { at: [0, 1.45, 0.38] as P, r: 0.3 },
    { at: [0, 1.38, 0.85] as P, r: 0.26 },
    { at: [0, 1.18, 1.35] as P, r: 0.22 },
    { at: [0, 0.92, 1.85] as P, r: 0.18 },
    { at: [0, 0.66, 2.3] as P, r: 0.15 },
    { at: [0, 0.42, 2.7] as P, r: 0.12 },
    { at: [0, 0.22, 3.05] as P, r: 0.09 },
    { at: [0, 0.09, 3.4] as P, r: 0.07 },
  ],
  /** The ribbed belly down the front: from the throat to the hips, with the stripe's half width at each height. */
  belly: {
    top: 3.15,
    bottom: 1.4,
    ribSpacing: 0.18,
    ribHalf: 0.095, // half thickness of a rib along the body
    depth: 0.2, // how deep into the body the stripe paints
    width: [[3.15, 0.1], [2.7, 0.16], [2.2, 0.24], [1.7, 0.2], [1.4, 0.15]] as readonly (readonly [number, number])[],
  },
  blend: 0.03, // smooth-min radius of the body's parts, as a fraction of the height
  speckleScale: 0.14, // m per noise cell of the spots and flecks
  sparkScale: 0.1,
} as const;

/** The membrane's pieces, root outward, as `n` arcs between adjacent finger spars. */
const fingerArcs = (wrist: Vec3, a: Vec3, b: Vec3, spacing: number): readonly (readonly [Vec3, Vec3])[] => {
  const reach = Math.max(Math.hypot(...sub(a, wrist)), Math.hypot(...sub(b, wrist)));
  const n = Math.max(2, Math.ceil(reach / spacing));
  const arcs: [Vec3, Vec3][] = [];
  for (let k = 1; k <= n; k++) arcs.push([lerp3(wrist, a, k / n), lerp3(wrist, b, k / n)]);
  return arcs;
};

interface DragonLayout {
  readonly p: DragonParams;
  readonly s: number; // metres per reference metre
  readonly r: number; // girth factor, s * bulk
  readonly at: (v: P) => Vec3;
  readonly mir: (v: P, side: Side) => Vec3;
  readonly bones: Body['bones'];
}

const wingPoint = (l: DragonLayout, v: P, side: Side): Vec3 => {
  const base = SHAPE.wing.shoulder;
  const reach: P = [base[0] + (v[0] - base[0]) * l.p.wingSpan, v[1], v[2]];
  return l.mir(reach, side);
};

const dragonLayout = (p: DragonParams): DragonLayout => {
  const s = p.height / REF_HEIGHT;
  const at = (v: P): Vec3 => scale(v as Vec3, s);
  const mir = (v: P, side: Side): Vec3 => at([sideSign(side) * v[0], v[1], v[2]]);
  const bones: Body['bones'][number][] = [];
  const bone = (id: string, parent: string | null, head: Vec3, tail: Vec3) => bones.push({ id, parent, head, tail });
  bone('pelvis', null, at(SHAPE.pelvis.head), at(SHAPE.pelvis.tail));
  bone('spine', 'pelvis', at(SHAPE.pelvis.tail), at(SHAPE.spine.tail));
  bone('chest', 'spine', at(SHAPE.spine.tail), at(SHAPE.chest.tail));
  SHAPE.neck.slice(0, -1).forEach((j, i) => bone(`neck.${i}`, i === 0 ? 'chest' : `neck.${i - 1}`, at(j.at), at(SHAPE.neck[i + 1]!.at)));
  bone('head', `neck.${SHAPE.neck.length - 2}`, at(SHAPE.neck.at(-1)!.at), at(SHAPE.head.snoutTail));
  bone('jaw', 'head', at(SHAPE.head.jaw.hinge), at(SHAPE.head.jaw.tip));
  SHAPE.tail.slice(0, -1).forEach((j, i) => bone(`tail.${i}`, i === 0 ? 'pelvis' : `tail.${i - 1}`, at(j.at), at(SHAPE.tail[i + 1]!.at)));
  const layout: DragonLayout = { p, s, r: s * p.bulk, at, mir, bones };
  for (const side of SIDES) {
    bone(`thigh.${side}`, 'pelvis', mir(SHAPE.hip, side), mir(SHAPE.knee, side));
    bone(`shin.${side}`, `thigh.${side}`, mir(SHAPE.knee, side), mir(SHAPE.hock, side));
    bone(`foot.${side}`, `shin.${side}`, mir(SHAPE.hock, side), mir(SHAPE.toe, side));
    bone(`arm.${side}`, 'chest', mir(SHAPE.shoulder, side), mir(SHAPE.elbow, side));
    bone(`forearm.${side}`, `arm.${side}`, mir(SHAPE.elbow, side), mir(SHAPE.wrist, side));
    bone(`hand.${side}`, `forearm.${side}`, mir(SHAPE.wrist, side), mir(SHAPE.handTip, side));
    bone(`wingArm.${side}`, 'chest', wingPoint(layout, SHAPE.wing.shoulder, side), wingPoint(layout, SHAPE.wing.wrist, side));
    bone(`wingFan.${side}`, `wingArm.${side}`, wingPoint(layout, SHAPE.wing.wrist, side), wingPoint(layout, SHAPE.wing.tips[SHAPE.wing.fanBone]!, side));
  }
  return layout;
};

const capsule = (bone: string, a: Vec3, b: Vec3, ra: number, rb: number, material: string, blend: number): Feature => ({
  bone,
  op: 'add',
  shape: { kind: 'capsule', a, b, ra, rb },
  material,
  blend,
});

const ellipsoid = (bone: string, center: Vec3, radii: Vec3, material: string, blend: number): Feature => ({
  bone,
  op: 'add',
  shape: { kind: 'ellipsoid', center, radii },
  material,
  blend,
});

/** The most forward z of the torso and neck at height `y` (reference metres): where the belly's stripe lies. */
const frontZ = (y: number, bulk: number): number => {
  let front = Number.POSITIVE_INFINITY;
  for (const e of [SHAPE.pelvis, SHAPE.spine, SHAPE.chest]) {
    const u = (y - e.center[1]) / (e.radii[1] * bulk);
    if (Math.abs(u) < 1) front = Math.min(front, e.center[2] - e.radii[2] * bulk * Math.sqrt(1 - u * u));
  }
  for (let i = 0; i + 1 < SHAPE.neck.length; i++) {
    const a = SHAPE.neck[i]!;
    const b = SHAPE.neck[i + 1]!;
    const t = (y - a.at[1]) / (b.at[1] - a.at[1]);
    if (t >= 0 && t <= 1) front = Math.min(front, a.at[2] + (b.at[2] - a.at[2]) * t - (a.r + (b.r - a.r) * t) * bulk);
  }
  return front;
};

const interpolate = (table: readonly (readonly [number, number])[], y: number): number => {
  for (let i = 0; i + 1 < table.length; i++) {
    const [y0, w0] = table[i]!;
    const [y1, w1] = table[i + 1]!;
    if (y <= y0 && y >= y1) return w0 + ((w1 - w0) * (y0 - y)) / (y0 - y1);
  }
  return table.at(-1)![1];
};

const buildFlesh = (l: DragonLayout): Feature[] => {
  const { s, r, at, mir, p } = l;
  const blend = SHAPE.blend * p.height;
  const f: Feature[] = [];
  const big = (v: P): Vec3 => [v[0] * r, v[1] * r, v[2] * r];
  // torso
  for (const [bone, e] of [['pelvis', SHAPE.pelvis], ['spine', SHAPE.spine], ['chest', SHAPE.chest]] as const) {
    f.push(ellipsoid(bone, at(e.center), big(e.radii), 'body', blend));
  }
  // neck
  SHAPE.neck.slice(0, -1).forEach((j, i) => {
    const k = SHAPE.neck[i + 1]!;
    f.push(capsule(`neck.${i}`, at(j.at), at(k.at), j.r * r, k.r * r, 'body', blend));
  });
  // head
  const hs = p.headScale;
  const headAt = (v: P): Vec3 => {
    const o = SHAPE.neck.at(-1)!.at;
    return at([o[0] + (v[0] - o[0]) * hs, o[1] + (v[1] - o[1]) * hs, o[2] + (v[2] - o[2]) * hs]);
  };
  const H = SHAPE.head;
  f.push(ellipsoid('head', headAt(H.skull.center), scale(H.skull.radii as Vec3, s * hs), 'body', blend));
  f.push(capsule('head', headAt(H.snout.a), headAt(H.snout.b), H.snout.radii[0] * s * hs, H.snout.radii[1] * s * hs, 'body', blend));
  f.push(capsule('jaw', headAt(H.jaw.hinge), headAt(H.jaw.tip), H.jaw.radii[0] * s * hs, H.jaw.radii[1] * s * hs, 'body', blend));
  for (const side of SIDES) {
    const sx = sideSign(side);
    for (const h of H.horns) {
      const from = headAt([h.from[0] * sx, h.from[1], h.from[2]]);
      const dir = sub(headAt([h.to[0] * sx, h.to[1], h.to[2]]), from);
      f.push(capsule('head', from, [from[0] + dir[0] * p.hornLength, from[1] + dir[1] * p.hornLength, from[2] + dir[2] * p.hornLength], h.radii[0] * s * hs, h.radii[1] * s * hs, 'horn', blend * 0.5));
    }
    f.push({
      bone: 'head',
      op: 'paint',
      shape: { kind: 'ellipsoid', center: headAt([H.eye.at[0] * sx, H.eye.at[1], H.eye.at[2]]), radii: scale(H.eye.radii as Vec3, s * hs) },
      material: 'eye',
    });
  }
  // hind legs and feet
  for (const side of SIDES) {
    f.push(capsule(`thigh.${side}`, mir(SHAPE.hip, side), mir(SHAPE.knee, side), SHAPE.thighRadii[0] * r, SHAPE.thighRadii[1] * r, 'body', blend));
    f.push(capsule(`shin.${side}`, mir(SHAPE.knee, side), mir(SHAPE.hock, side), SHAPE.shinRadii[0] * r, SHAPE.shinRadii[1] * r, 'body', blend));
    f.push(capsule(`foot.${side}`, mir(SHAPE.hock, side), mir(SHAPE.ball, side), SHAPE.footRadii[0] * r, SHAPE.footRadii[1] * r, 'body', blend * SHAPE.footBlend));
    f.push(capsule(`foot.${side}`, mir(SHAPE.ball, side), mir(SHAPE.toe, side), SHAPE.footRadii[1] * r, SHAPE.footRadii[2] * r, 'body', blend * SHAPE.footBlend));
    const toe = mir(SHAPE.toe, side);
    for (const dx of SHAPE.talons) {
      const root: Vec3 = [toe[0] + dx * r, toe[1], toe[2]];
      f.push(capsule(`foot.${side}`, root, [root[0], root[1] - 0.02 * s, root[2] - SHAPE.clawLength * s], SHAPE.clawRadius * s, SHAPE.clawRadius * s * 0.6, 'horn', blend * SHAPE.footBlend));
    }
  }
  // forelimbs
  for (const side of SIDES) {
    const a = SHAPE.armRadii;
    f.push(capsule(`arm.${side}`, mir(SHAPE.shoulder, side), mir(SHAPE.elbow, side), a[0] * r, a[1] * r, 'body', blend));
    f.push(capsule(`forearm.${side}`, mir(SHAPE.elbow, side), mir(SHAPE.wrist, side), a[1] * r, a[2] * r, 'body', blend));
    const wrist = mir(SHAPE.wrist, side);
    f.push(ellipsoid(`hand.${side}`, lerp3(mir(SHAPE.wrist, side), mir(SHAPE.handTip, side), 0.5), big(SHAPE.palm), 'body', blend));
    for (const dx of SHAPE.talons) {
      const tip: Vec3 = [wrist[0] + dx * r * SHAPE.talonSpread, wrist[1] + SHAPE.talonReach[1] * s, wrist[2] + SHAPE.talonReach[2] * s];
      f.push(capsule(`hand.${side}`, [wrist[0] + dx * r, wrist[1], wrist[2]], tip, SHAPE.talonRadii[0] * s, SHAPE.talonRadii[1] * s, 'horn', blend * 0.5));
    }
  }
  // wings
  const W = SHAPE.wing;
  for (const side of SIDES) {
    const shoulder = wingPoint(l, W.shoulder, side);
    const wrist = wingPoint(l, W.wrist, side);
    f.push(capsule(`wingArm.${side}`, shoulder, wrist, W.armRadii[0] * r, W.armRadii[1] * r, 'wingBone', blend));
    const tips = W.tips.map((t) => wingPoint(l, t, side));
    tips.forEach((tip, i) => {
      if (i < tips.length - 1) f.push(capsule(`wingFan.${side}`, wrist, tip, W.sparRadii[0] * r, W.sparRadii[1] * r, 'wingBone', blend * 0.5));
    });
    const half = W.membrane * s;
    for (let i = 0; i + 1 < tips.length; i++) {
      for (const [a, b] of fingerArcs(wrist, tips[i]!, tips[i + 1]!, half * W.arcSpacing)) {
        f.push(capsule(`wingFan.${side}`, a, b, half, half, 'wing', 0));
      }
    }
  }
  // tail
  SHAPE.tail.slice(0, -1).forEach((j, i) => {
    const k = SHAPE.tail[i + 1]!;
    f.push(capsule(`tail.${i}`, at(j.at), at(k.at), j.r * r, k.r * r, 'body', blend));
  });
  return f;
};

/** Paints over the flesh: the ribbed belly down the front, the dark mottling and the glowing flecks. */
const buildMarkings = (l: DragonLayout): Feature[] => {
  const { s, r, at, p } = l;
  const B = SHAPE.belly;
  const f: Feature[] = [];
  const count = Math.floor((B.top - B.bottom) / B.ribSpacing);
  for (let i = 0; i <= count; i++) {
    const y = B.top - i * B.ribSpacing;
    f.push({
      bone: 'chest',
      op: 'paint',
      shape: {
        kind: 'ellipsoid',
        center: at([0, y, frontZ(y, p.bulk) + 0.02]),
        radii: [interpolate(B.width, y) * r, B.ribHalf * s, B.depth * s],
      },
      material: i % 2 === 0 ? 'belly' : 'rib',
      onto: ['body'],
    });
  }
  const everything = { kind: 'box', center: [0, p.height / 2, 0], half: [p.height, p.height, p.height], round: 0 } as const;
  if (p.spots > 0) {
    f.push({ bone: 'chest', op: 'paint', shape: everything, material: 'spot', onto: ['body'], noise: { scale: SHAPE.speckleScale * s, threshold: p.spots } });
  }
  if (p.spark > 0) {
    f.push({ bone: 'chest', op: 'paint', shape: everything, material: 'spark', onto: ['body', 'spot'], noise: { scale: SHAPE.sparkScale * s, threshold: p.spark } });
  }
  return f;
};

const buildDragon = (genome: Genome): Body => {
  const p = genome.params as DragonParams;
  const layout = dragonLayout(p);
  const template = templateByName(genome.template);
  const features = [...buildFlesh(layout), ...buildMarkings(layout), ...partFeatures(template.parts ?? [], layout.bones)];
  return { bones: layout.bones, features, materials: resolveMaterials(template, p) };
};

registerBodyPlan('dragon', {
  sample: (rng, template: Template) => ({ params: sampleParams(rng, template.params, DRAGON_PARAM_ORDER), wounds: [] }),
  build: (genome) => buildDragon(genome),
  paramOrder: DRAGON_PARAM_ORDER,
  woundBones: [],
  budgets: heightHeadBudgets,
  limbBones: SIDES.flatMap((side) => ['thigh', 'shin', 'arm', 'forearm'].map((segment) => `${segment}.${side}`)),
} satisfies BodyPlanDef);

// ---- Poses ----

/** How the clips move, as data. Harmonics are of a cycle (integers, so a loop closes); angles in degrees, lengths in metres. */
export const DRAGON_MOTION = {
  stanceShare: 0.58, // the share of a cycle each hind foot spends planted
  tailLagRad: 0.5, // phase lag of each tail segment behind the one above it
  neckLagRad: 0.6, // phase lag of each neck segment's sway behind the one below it
  tailLiftShare: 0.3, // the tail's lift in the walk as a fraction of its sway
  bobHarmonic: 2,
  flapHarmonic: 2,
  flapFanShare: 1.4, // the fan's beat as a multiple of the arm's, lagging by flapLagRad
  flapLagRad: 0.9,
  armPitchHarmonic: 1,
  shiftShare: 0.02, // the body's weight shift over the planted foot, as a fraction of the height
  rollDeg: 3, // the torso's roll with the weight shift
  neckNodDeg: 4,
  restWingFold: 18, // degrees the wings stand folded in at rest
  restFanFold: 10,
  restNeckDeg: -4,
  restTail: [3, 14] as const, // the tail's lift (clear of the ground) and curl at rest, degrees
  restArmDeg: -8,
  restForearmDeg: -20,
  restJawDeg: -6,
} as const;

/** The channels of a pose, degrees unless noted. Absent is 0. */
export type DragonChannels = Readonly<Partial<Record<
  | 'rise' // m
  | 'shift' // m, sideways
  | 'lunge' // m, forward is negative z
  | 'spineX' | 'chestX' | 'neckX' | 'headX' | 'jawX' | 'neckY' | 'headY' | 'rollZ'
  | 'armX' | 'armZ' | 'forearmX' | 'handX'
  | 'wingZ' | 'fanZ'
  | 'tailX' | 'tailY',
  number
>>>;

/** The sway travelling down the neck and the tail: degrees amplitude and the phase in radians. */
interface Wave {
  readonly amp: number;
  readonly phase: number;
}

interface DragonMotion {
  readonly ch: DragonChannels;
  readonly tailWave?: Wave;
  readonly neckWave?: Wave;
  readonly legs?: Readonly<Record<Side, { readonly swing: number; readonly fold: number }>>;
  /** Per-side arm swing in degrees (about x), added to `armX`; the attacking arm swipes harder. */
  readonly armBias?: Readonly<Record<Side, number>>;
}

const neckSegments = (realized: Realized): number => realized.body.bones.filter((b) => b.id.startsWith('neck.')).length;
const tailSegments = (realized: Realized): number => realized.body.bones.filter((b) => b.id.startsWith('tail.')).length;

const matOf = (v: Vec3 | undefined, mirror: number): Mat3 =>
  v ? mulMM(rotZ(v[2] * mirror), mulMM(rotY(v[1] * mirror), rotX(v[0]))) : IDENTITY_M;

/** A pose from a motion over the rest body. */
const dragonPose = (realized: Realized, p: DragonParams, m: DragonMotion): Pose => {
  const c = m.ch;
  const rotations: Record<string, Mat3> = {};
  const nn = neckSegments(realized);
  const tn = tailSegments(realized);
  const set = (id: string, mat: Mat3) => {
    rotations[id] = mat;
  };
  set('spine', matOf([c.spineX ?? 0, 0, c.rollZ ?? 0], 1));
  set('chest', matOf([c.chestX ?? 0, 0, 0], 1));
  for (let i = 0; i < nn; i++) {
    const lag = m.neckWave ? m.neckWave.amp * Math.sin(m.neckWave.phase - (nn - i) * DRAGON_MOTION.neckLagRad) : 0;
    set(`neck.${i}`, matOf([(c.neckX ?? 0) / nn, (c.neckY ?? 0) / nn + lag, 0], 1));
  }
  set('head', matOf([c.headX ?? 0, (c.headY ?? 0) + (m.neckWave ? m.neckWave.amp * 0.5 * Math.sin(m.neckWave.phase) : 0), 0], 1));
  set('jaw', matOf([c.jawX ?? 0, 0, 0], 1));
  for (let i = 0; i < tn; i++) {
    const lag = m.tailWave ? m.tailWave.amp * Math.sin(m.tailWave.phase - i * DRAGON_MOTION.tailLagRad) : 0;
    const lift = (c.tailX ?? 0) / tn + (m.tailWave ? lag * DRAGON_MOTION.tailLiftShare * Math.cos(m.tailWave.phase) : 0);
    set(`tail.${i}`, matOf([lift, (c.tailY ?? 0) / tn + lag, 0], 1));
  }
  for (const side of SIDES) {
    const sg = sideSign(side);
    set(`arm.${side}`, matOf([(c.armX ?? 0) + (m.armBias?.[side] ?? 0), 0, (c.armZ ?? 0) * sg], 1));
    set(`forearm.${side}`, matOf([c.forearmX ?? 0, 0, 0], 1));
    set(`hand.${side}`, matOf([c.handX ?? 0, 0, 0], 1));
    set(`wingArm.${side}`, matOf([0, 0, (c.wingZ ?? 0) * sg], 1));
    set(`wingFan.${side}`, matOf([0, 0, (c.fanZ ?? 0) * sg], 1));
    const leg = m.legs?.[side];
    if (leg) {
      set(`thigh.${side}`, rotX(leg.swing));
      set(`shin.${side}`, rotX(leg.fold));
      set(`foot.${side}`, rotX(-(leg.swing + leg.fold)));
    }
  }
  return { root: [c.shift ?? 0, c.rise ?? 0, c.lunge ?? 0], rotations };
};

/** The rest channels every clip starts from: wings folded up, arms hanging a little forward, the tail clear of the ground. */
const restChannels = (): Record<string, number> => ({
  wingZ: DRAGON_MOTION.restWingFold,
  fanZ: DRAGON_MOTION.restFanFold,
  neckX: DRAGON_MOTION.restNeckDeg,
  tailX: DRAGON_MOTION.restTail[0],
  tailY: DRAGON_MOTION.restTail[1],
  armX: DRAGON_MOTION.restArmDeg,
  forearmX: DRAGON_MOTION.restForearmDeg,
  jawX: DRAGON_MOTION.restJawDeg,
});

/** The idle: the reared stance, wings folded in, the tail curled to one side. */
export const dragonIdlePose = (realized: Realized, p: DragonParams): Pose => dragonPose(realized, p, { ch: restChannels() });

/** The hip-to-hock segments of the left leg in the (y, z) plane: the thigh and the shin. */
const legSegments = (realized: Realized) => {
  const get = (id: string) => realized.body.bones.find((b) => b.id === id)!;
  const thigh = get('thigh.L');
  const shin = get('shin.L');
  return {
    u: [thigh.tail[1] - thigh.head[1], thigh.tail[2] - thigh.head[2]] as const,
    v: [shin.tail[1] - shin.head[1], shin.tail[2] - shin.head[2]] as const,
  };
};

/** Metres of ground one cycle (both hind feet stepping once) covers. */
export const dragonStrideLength = (realized: Realized, p: DragonParams): number => {
  const { u, v } = legSegments(realized);
  const reach = Math.hypot(...u) + Math.hypot(...v);
  return (p.strideRatio * reach) / DRAGON_MOTION.stanceShare;
};

const smooth = (x: number): number => x * x * (3 - 2 * x);

/** The stomp at `progress` (0..1 of one cycle): each hind foot planted on the moving ground, then swung forward and set down heavily, the body sinking
 * on each footfall with the weight shifting over the planted foot, the tail sweeping in a wave, the neck swaying behind it, the wings beating and the
 * forelimbs swinging against the legs. */
export const dragonStompPose = (realized: Realized, p: DragonParams, progress: number): Pose => {
  const M = DRAGON_MOTION;
  const phase = 2 * Math.PI * progress;
  const { u, v } = legSegments(realized);
  const reach = Math.hypot(...u) + Math.hypot(...v);
  const stride = p.strideRatio * reach;
  const rise = -p.bob * (0.5 - 0.5 * Math.cos(phase * M.bobHarmonic)) - p.bob * 0.5;
  const legs = {} as Record<Side, { swing: number; fold: number }>;
  for (const side of SIDES) {
    const q = (((progress + (side === 'L' ? 0 : 0.5)) % 1) + 1) % 1;
    const stance = q < M.stanceShare;
    const half = stride / 2;
    const offset = stance ? -half + (stride * q) / M.stanceShare : half - stride * smooth((q - M.stanceShare) / (1 - M.stanceShare));
    const lift = stance ? 0 : p.liftRatio * reach * Math.sin(Math.PI * ((q - M.stanceShare) / (1 - M.stanceShare)));
    const { swingDeg, foldDeg } = stanceLegAngles(u, v, u[0] + v[0] - rise + lift, u[1] + v[1] + offset);
    legs[side] = { swing: swingDeg, fold: foldDeg };
  }
  const beat = Math.sin(phase * M.flapHarmonic);
  const base = restChannels();
  const ch: DragonChannels = {
    ...base,
    rise,
    shift: p.height * M.shiftShare * Math.sin(phase),
    rollZ: M.rollDeg * Math.sin(phase),
    spineX: -p.lean * 0.5,
    chestX: -p.lean * 0.5,
    neckX: (base.neckX ?? 0) + p.lean,
    headX: M.neckNodDeg * Math.sin(phase * M.bobHarmonic),
    tailX: base.tailX,
    wingZ: (base.wingZ ?? 0) - p.wingFlap * beat,
    fanZ: (base.fanZ ?? 0) - p.wingFlap * M.flapFanShare * Math.sin(phase * M.flapHarmonic - M.flapLagRad),
    armX: (base.armX ?? 0) + p.armSwing * Math.sin(phase * M.armPitchHarmonic),
  };
  return dragonPose(realized, p, {
    ch,
    legs,
    tailWave: { amp: p.sway, phase },
    neckWave: { amp: p.neckSway, phase },
    armBias: { L: 0, R: -2 * p.armSwing * Math.sin(phase * M.armPitchHarmonic) },
  });
};

/** One key of the attack: time in seconds and the channels at it, over the idle's. */
interface AttackKey {
  readonly t: number;
  readonly ch: DragonChannels;
  /** Extra swing of the right forelimb about x (degrees): the claw swipe. */
  readonly swipe?: number;
}

/** A lunging bite with a claw swipe: rear back (spine and neck drawn up and back, jaw agape, wings raised), strike forward at `hitTime` (the body
 * pitching in, the neck driven down and out, the right claw raking), then recover. Poses are over the idle's. */
export const DRAGON_LUNGE = {
  name: 'lunge',
  duration: 1.0,
  hitTime: 0.5,
  keys: [
    { t: 0, ch: {} },
    {
      t: 0.3,
      ch: { spineX: 10, chestX: 8, neckX: 30, headX: 14, jawX: -42, wingZ: -22, fanZ: -18, armX: -20, forearmX: -25, tailX: 14, tailY: -20, rise: 0.04, lunge: 0.14 },
      swipe: -30,
    },
    {
      t: 0.5,
      ch: { spineX: -16, chestX: -14, neckX: -48, headX: -22, jawX: -50, neckY: 8, wingZ: -10, fanZ: -10, armX: 22, forearmX: -14, tailX: -10, tailY: 30, rise: -0.1, lunge: -0.5 },
      swipe: 44,
    },
    {
      t: 0.62,
      ch: { spineX: -14, chestX: -12, neckX: -42, headX: -16, jawX: 0, neckY: 6, wingZ: -8, fanZ: -8, armX: 18, forearmX: -12, tailX: -6, tailY: 20, rise: -0.08, lunge: -0.42 },
      swipe: 30,
    },
    { t: 1, ch: {} },
  ] as readonly AttackKey[],
} as const;

/** The lunge at `time` over the idle, eased between its keys. */
export const dragonAttackPose = (realized: Realized, p: DragonParams, time: number): Pose => {
  const { keys, duration } = DRAGON_LUNGE;
  const t = Math.max(0, Math.min(duration, time));
  let hi = keys.findIndex((k) => k.t >= t);
  if (hi < 0) hi = keys.length - 1;
  const lo = Math.max(0, hi - 1);
  const span = keys[hi]!.t - keys[lo]!.t;
  const u = span > 0 ? smooth((t - keys[lo]!.t) / span) : 1;
  const a = keys[lo]!;
  const b = keys[hi]!;
  const ch: Record<string, number> = restChannels();
  const names = new Set([...Object.keys(a.ch), ...Object.keys(b.ch)]);
  for (const name of names) {
    const x = (a.ch as Record<string, number>)[name] ?? 0;
    const y = (b.ch as Record<string, number>)[name] ?? 0;
    ch[name] = (ch[name] ?? 0) + x + (y - x) * u;
  }
  const swipe = (a.swipe ?? 0) + ((b.swipe ?? 0) - (a.swipe ?? 0)) * u;
  return dragonPose(realized, p, { ch, armBias: { L: 0, R: swipe } });
};
