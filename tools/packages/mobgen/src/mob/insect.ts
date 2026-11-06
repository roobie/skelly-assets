// The insect body plan: a low, broad, six-legged crawler (a giant cockroach) built deterministically from a genome's
// sampled params. Its own body plan rather than a variant of the dog because it has three leg pairs that splay out to the
// sides, a pair of long feelers and a bite, and walks in an alternating tripod, not a trot.
//
// Skeleton: thorax (root, the pronotum shield) > abdomen (the wing cases), head > mandible.L/R, antennaBase.L/R > antennaTip.L/R;
// per side a front, middle and hind leg of femur > tibia > tarsus, named femurF.L, tibiaM.R, tarsusH.L and so on. The front and
// middle legs hang from the thorax, the hind legs from the abdomen (a bone must touch its parent's voxels).
//
// Every dimension is a fraction of the `height` param (the top of the carapace above the ground) in INSECT_LAYOUT, and the walk,
// lunge and idle are tuned in INSECT_GAIT, INSECT_LUNGE and INSECT_IDLE, so a row of models/mobs.json reshapes the bug through
// params alone. The body faces -Z (conventions.ts).

import type { Body, Feature } from '../core/body.ts';
import type { Realized } from '../core/generate.ts';
import { type BodyPlanDef, registerBodyPlan, sampleParams } from '../core/generate.ts';
import {
  add,
  cross,
  IDENTITY_M,
  type Mat3,
  mulMM,
  normalize,
  rotAxis,
  rotX,
  rotY,
  rotZ,
  scale,
  type Vec3,
} from '../core/math.ts';
import type { Pose } from '../core/pose.ts';
import type { Rng } from '../core/random.ts';
import { type Genome, type Template, templateByName } from '../core/template.ts';
import { posedVoxelSurfaceBoundsForBones } from '../core/voxelBounds.ts';
import { heightHeadBudgets } from './budgets.ts';
import { resolveMaterials } from './materials.ts';
import { partFeatures } from './parts.ts';

const SIDES = ['L', 'R'] as const;
type Side = (typeof SIDES)[number];
const sideSign = (s: Side): number => (s === 'L' ? -1 : 1);

/** Params sampled in this fixed order (see core/generate.ts's sampleParams). `height` and `headScale` are what heightHeadBudgets scales by. */
const INSECT_PARAM_ORDER = [
  'height',
  'bodyLength',
  'girth',
  'headScale',
  'antennaLength',
  'legSpread',
  'legThickness',
  'mandibleOpen',
  'thoraxLength',
  'thoraxRaise',
  'abdomenSize',
  'abdomenDrop',
  'waist',
  'hindLegsOnThorax',
] as const;

type InsectParams = Readonly<Record<(typeof INSECT_PARAM_ORDER)[number], number>>;

/** The params past the cockroach's: how an ant-like body departs from it. Each defaults (insectTemplate.ts) to the cockroach's own value, so the rows that
 * leave them out are unchanged. `thoraxLength` scales the pronotum's length about its centre; `thoraxRaise` lifts the thorax's flesh, head, feelers, jaws and the
 * legs that hang from the thorax by that many `height`s; `abdomenSize` scales the wing cases' width and thickness and `abdomenDrop` lowers them; `waist` moves
 * the abdomen back by that many `height`s and joins it with a narrow stalk; `hindLegsOnThorax` (0 or 1) hangs the hind pair from the thorax's back instead of
 * the abdomen, at the back of the pronotum. */
export const INSECT_ANT_DEFAULTS = {
  thoraxLength: 1,
  thoraxRaise: 0,
  abdomenSize: 1,
  abdomenDrop: 0,
  waist: 0,
  hindLegsOnThorax: 0,
} as const;

/** The waist's stalk: its radius (times `height`) and how far it reaches into the thorax and the abdomen. */
const WAIST_STALK = { radius: 0.2, overlap: 0.15 } as const;

/** Everything is metres only after multiplying by the `height` param; z is negative forward. */
export const INSECT_LAYOUT = {
  /** Centre height of the carapace slab, its half thickness and half width (times girth). */
  shellY: 0.74,
  shellHalfThickness: 0.27,
  shellHalfWidth: 1.15,
  /** Pronotum (thorax shield) and wing cases: centre z, half length (the wing cases times bodyLength). */
  pronotum: { z: -0.55, halfLength: 0.62, halfWidthRatio: 0.82 },
  wings: { z: 0.72, halfLength: 1.35 },
  /** Skeleton spans along z. */
  thorax: { headZ: -0.2, tailZ: -1.0 },
  abdomen: { headZ: -0.2, tailZ: 1.9 },
  head: { headZ: -1.0, tailZ: -1.62, headY: 0.68, tailY: 0.58, centreZ: -1.3, centreY: 0.62, radii: [0.46, 0.34, 0.46] as Vec3 },
  eye: { x: 0.33, y: 0.8, z: -1.45, radius: 0.17 },
  mandible: { hingeX: 0.14, hingeY: 0.46, hingeZ: -1.55, tipX: 0.08, tipY: 0.4, tipZ: -1.9, radius: 0.07 },
  /** Antenna: base on the head, the bend and the tip, offsets from the base (times antennaLength), radii. */
  antenna: { baseX: 0.17, baseY: 0.75, baseZ: -1.5, midOffset: [0.3, 1.0, -0.9] as Vec3, tipOffset: [0.7, 0.8, -1.3] as Vec3, ra: 0.07, rb: 0.05 },
  /** Legs: per pair the hip z and the knee and ankle offsets in z from it; x offsets are shared (times legSpread past the hip). */
  legs: {
    hipX: 0.8,
    hipY: 0.58,
    kneeX: 1.25,
    kneeY: 0.75,
    ankleX: 1.6,
    ankleY: 0.2,
    toeX: 1.7,
    toeDz: -0.12,
    toeRadius: 0.075,
    femurRadius: 0.1,
    tibiaRadius: 0.08,
    pairs: [
      { key: 'F', hipZ: -0.45, kneeDz: -0.4, ankleDz: -0.8, parent: 'thorax' },
      { key: 'M', hipZ: 0.15, kneeDz: -0.05, ankleDz: 0.05, parent: 'thorax' },
      { key: 'H', hipZ: 0.85, kneeDz: 0.35, ankleDz: 0.8, parent: 'abdomen' },
    ],
  },
} as const;

const LEG_PAIRS = INSECT_LAYOUT.legs.pairs;
const LEG_BONES = LEG_PAIRS.flatMap((pair) =>
  SIDES.map((side) => ({
    pair: pair.key,
    side,
    femur: `femur${pair.key}.${side}`,
    tibia: `tibia${pair.key}.${side}`,
    tarsus: `tarsus${pair.key}.${side}`,
    parent: pair.parent,
  })),
);
type LegBones = (typeof LEG_BONES)[number];

/** Support bones for the grounded rule: every foot. */
export const INSECT_FEET: readonly string[] = LEG_BONES.map((leg) => leg.tarsus);

interface InsectLayout {
  readonly h: number;
  readonly p: InsectParams;
  readonly bones: Body['bones'];
}

const v = (h: number, x: number, y: number, z: number): Vec3 => [x * h, y * h, z * h];

const hangsFromThorax = (leg: LegBones, p: InsectParams): boolean => leg.parent === 'thorax' || (leg.pair === 'H' && p.hindLegsOnThorax > 0);
const legParent = (leg: LegBones, p: InsectParams): string => (hangsFromThorax(leg, p) ? 'thorax' : leg.parent);
/** The pronotum's back end z (times `height`). */
const pronotumBack = (p: InsectParams): number => INSECT_LAYOUT.pronotum.z + INSECT_LAYOUT.pronotum.halfLength * p.thoraxLength;
/** A pair's hip z (times `height`): the hind pair follows the abdomen's length, or the thorax's back end when it hangs from there. */
const legHipZ = (pair: (typeof LEG_PAIRS)[number], p: InsectParams): number =>
  pair.key !== 'H' ? pair.hipZ : p.hindLegsOnThorax > 0 ? pronotumBack(p) - 0.15 : pair.hipZ * p.bodyLength;

const buildBones = (p: InsectParams): Body['bones'] => {
  const L = INSECT_LAYOUT;
  const h = p.height;
  const bl = p.bodyLength;
  const up = p.thoraxRaise;
  const bones: Body['bones'][number][] = [
    { id: 'thorax', parent: null, head: v(h, 0, L.shellY, L.thorax.headZ), tail: v(h, 0, L.shellY, L.thorax.tailZ) },
    { id: 'abdomen', parent: 'thorax', head: v(h, 0, L.shellY, L.abdomen.headZ), tail: v(h, 0, L.shellY, L.abdomen.tailZ * bl + p.waist) },
    { id: 'head', parent: 'thorax', head: v(h, 0, L.head.headY + up, L.head.headZ), tail: v(h, 0, L.head.tailY + up, L.head.tailZ) },
  ];
  for (const side of SIDES) {
    const sign = sideSign(side);
    const m = L.mandible;
    bones.push({
      id: `mandible.${side}`,
      parent: 'head',
      head: v(h, sign * m.hingeX, m.hingeY + up, m.hingeZ),
      tail: v(h, sign * m.tipX, m.tipY + up, m.tipZ),
    });
    const a = L.antenna;
    const base = v(h, sign * a.baseX, a.baseY + up, a.baseZ);
    const mid = add(base, v(h * p.antennaLength, sign * a.midOffset[0], a.midOffset[1], a.midOffset[2]));
    const tip = add(mid, v(h * p.antennaLength, sign * a.tipOffset[0], a.tipOffset[1], a.tipOffset[2]));
    bones.push(
      { id: `antennaBase.${side}`, parent: 'head', head: base, tail: mid },
      { id: `antennaTip.${side}`, parent: `antennaBase.${side}`, head: mid, tail: tip },
    );
  }
  for (const leg of LEG_BONES) {
    const pair = LEG_PAIRS.find((q) => q.key === leg.pair)!;
    const sign = sideSign(leg.side);
    const g = L.legs;
    const spread = p.legSpread;
    const out = (x: number): number => g.hipX + (x - g.hipX) * spread;
    const lift = hangsFromThorax(leg, p) ? up : 0;
    const hipZ = legHipZ(pair, p);
    const hip = v(h, sign * g.hipX, g.hipY + lift, hipZ);
    const knee = v(h, sign * out(g.kneeX), g.kneeY + lift, hipZ + pair.kneeDz);
    const ankle = v(h, sign * out(g.ankleX), g.ankleY, hipZ + pair.ankleDz);
    const toe = v(h, sign * out(g.toeX), g.toeRadius, hipZ + pair.ankleDz + g.toeDz);
    bones.push(
      { id: leg.femur, parent: legParent(leg, p), head: hip, tail: knee },
      { id: leg.tibia, parent: leg.femur, head: knee, tail: ankle },
      { id: leg.tarsus, parent: leg.tibia, head: ankle, tail: toe },
    );
  }
  return bones;
};

const boneById = (bones: Body['bones'], id: string): Body['bones'][number] => {
  const bone = bones.find((candidate) => candidate.id === id);
  if (!bone) {
    throw new Error(`insect: unknown bone "${id}"`);
  }
  return bone;
};

// ---- Flesh ----

const ellipsoid = (bone: string, center: Vec3, radii: Vec3, material: string, blend?: number): Feature => ({
  bone,
  op: 'add',
  shape: { kind: 'ellipsoid', center, radii },
  material,
  ...(blend !== undefined ? { blend } : {}),
});

const capsule = (bone: string, a: Vec3, b: Vec3, ra: number, rb: number, material: string): Feature => ({
  bone,
  op: 'add',
  shape: { kind: 'capsule', a, b, ra, rb },
  material,
});

const buildFlesh = (layout: InsectLayout): Feature[] => {
  const L = INSECT_LAYOUT;
  const { h, p, bones } = layout;
  const g = p.girth;
  const bl = p.bodyLength;
  const hs = p.headScale;
  const half = L.shellHalfWidth * g;
  const features: Feature[] = [
    ellipsoid('thorax', v(h, 0, L.shellY + p.thoraxRaise, L.pronotum.z), v(h, half * L.pronotum.halfWidthRatio, L.shellHalfThickness, L.pronotum.halfLength * p.thoraxLength), 'shell'),
    ellipsoid('abdomen', v(h, 0, L.shellY + 0.02 - p.abdomenDrop, L.wings.z * bl + p.waist), v(h, half * p.abdomenSize, L.shellHalfThickness * p.abdomenSize, L.wings.halfLength * bl), 'shell'),
    ellipsoid('head', v(h, 0, L.head.centreY + p.thoraxRaise, L.head.centreZ), v(h, L.head.radii[0] * hs, L.head.radii[1] * hs, L.head.radii[2] * hs), 'head'),
  ];
  if (p.waist > 0) {
    // The stalk between the thorax's back and the abdomen's front, so the abdomen hangs from a narrow waist.
    const S = WAIST_STALK;
    const front = L.wings.z * bl + p.waist - L.wings.halfLength * bl;
    features.push(capsule('abdomen', v(h, 0, L.shellY + p.thoraxRaise, pronotumBack(p) - S.overlap), v(h, 0, L.shellY - p.abdomenDrop, front + S.overlap), S.radius * h, S.radius * h, 'dark'));
  }
  for (const side of SIDES) {
    const sign = sideSign(side);
    const m = L.mandible;
    const hinge = boneById(bones, `mandible.${side}`);
    features.push(capsule(hinge.id, hinge.head, hinge.tail, m.radius * h, m.radius * 0.5 * h, 'head'));
    const base = boneById(bones, `antennaBase.${side}`);
    const tip = boneById(bones, `antennaTip.${side}`);
    features.push(
      capsule(base.id, base.head, base.tail, L.antenna.ra * h, L.antenna.rb * h * 1.2, 'antenna'),
      capsule(tip.id, tip.head, tip.tail, L.antenna.rb * h * 1.2, L.antenna.rb * h * 0.8, 'antenna'),
    );
    // Eyes: a bright bead on each side of the head's front.
    features.push({
      bone: 'head',
      op: 'paint',
      shape: { kind: 'ellipsoid', center: v(h, sign * L.eye.x * hs, L.eye.y + p.thoraxRaise, L.eye.z), radii: [L.eye.radius * h * hs, L.eye.radius * h * hs, L.eye.radius * h * hs] },
      material: 'eye',
    });
  }
  for (const leg of LEG_BONES) {
    const femur = boneById(bones, leg.femur);
    const tibia = boneById(bones, leg.tibia);
    const tarsus = boneById(bones, leg.tarsus);
    const t = p.legThickness;
    const lg = L.legs;
    features.push(
      capsule(leg.femur, femur.head, femur.tail, lg.femurRadius * h * t, lg.femurRadius * h * t * 0.85, 'leg'),
      capsule(leg.tibia, tibia.head, tibia.tail, lg.tibiaRadius * h * t, lg.tibiaRadius * h * t * 0.8, 'leg'),
      capsule(leg.tarsus, tarsus.head, tarsus.tail, lg.tibiaRadius * h * t * 0.8, lg.toeRadius * h, 'leg'),
    );
  }
  return features;
};

/** Colour over the carapace: a lighter sheen on top and the seam where the wing cases meet. */
const buildMarkings = (layout: InsectLayout): Feature[] => {
  const L = INSECT_LAYOUT;
  const { h, p } = layout;
  const half = L.shellHalfWidth * p.girth;
  const topY = L.shellY + L.shellHalfThickness;
  const abdomenTopY = L.shellY + L.shellHalfThickness * p.abdomenSize - p.abdomenDrop;
  const wingsZ = L.wings.z * p.bodyLength + p.waist;
  return [
    {
      bone: 'abdomen',
      op: 'paint',
      shape: { kind: 'ellipsoid', center: v(h, 0, abdomenTopY + 0.12, wingsZ), radii: v(h, half * p.abdomenSize * 0.62, 0.3, L.wings.halfLength * p.bodyLength * 0.75) },
      material: 'sheen',
      onto: ['shell'],
    },
    {
      bone: 'abdomen',
      op: 'paint',
      shape: { kind: 'box', center: v(h, 0, abdomenTopY, wingsZ), half: v(h, 0.045, 0.3, L.wings.halfLength * p.bodyLength), round: 0 },
      material: 'dark',
      onto: ['shell', 'sheen'],
    },
    {
      bone: 'thorax',
      op: 'paint',
      shape: { kind: 'ellipsoid', center: v(h, 0, topY + p.thoraxRaise + 0.1, L.pronotum.z), radii: v(h, half * 0.5, 0.28, L.pronotum.halfLength * p.thoraxLength * 0.7) },
      material: 'sheen',
      onto: ['shell'],
    },
  ];
};

const buildInsect = (genome: Genome): Body => {
  const p = genome.params as InsectParams;
  const bones = buildBones(p);
  const layout: InsectLayout = { h: p.height, p, bones };
  const template = templateByName(genome.template);
  const features = [
    ...buildFlesh(layout),
    ...buildMarkings(layout),
    ...partFeatures(template.parts ?? [], bones), // a mob row's signature parts (models/mobs.json), after the body so they paint over it
  ];
  return { bones, features, materials: resolveMaterials(template, p) };
};

/** An insect has no wounds: the dismemberment and wound sampling of the humanoids is not part of this plan. */
const sampleInsect: BodyPlanDef['sample'] = (rng: Rng, template: Template) => ({
  params: sampleParams(rng, template.params, INSECT_PARAM_ORDER),
  wounds: [],
});

registerBodyPlan('insect', {
  sample: sampleInsect,
  build: (genome) => buildInsect(genome),
  paramOrder: INSECT_PARAM_ORDER,
  woundBones: [],
  budgets: heightHeadBudgets,
  limbBones: LEG_BONES.flatMap((leg) => [leg.femur, leg.tibia]),
});

// ---- Pose, gait, attack and idle ----

/** The walk: the amplitude of a foot's fore-aft sweep and how high a swinging foot lifts, in `height`s, and the body's small waddle (degrees). */
export const INSECT_GAIT = {
  sweepPerHeight: 0.85,
  liftPerHeight: 0.35,
  rollDeg: 2,
  pitchDeg: 1.5,
  antennaSwayDeg: 9,
  antennaTipSwayDeg: 14,
  mandibleChatterDeg: 5,
} as const;

/** The idle: how far a feeler flicks (degrees about the vertical, and the rise) and how far the jaws part. */
export const INSECT_IDLE = { antennaYawDeg: 14, antennaTipYawDeg: 22, antennaRiseDeg: 5, mandibleDeg: 6 } as const;

/** Tripods, the legs that step together: front-left, middle-right and hind-left, then the other three. */
const TRIPOD_A: readonly string[] = ['F.L', 'M.R', 'H.L'];
const tripodOf = (leg: LegBones): 0 | 1 => (TRIPOD_A.includes(`${leg.pair}.${leg.side}`) ? 0 : 1);

const smoothstep = (x: number): number => x * x * (3 - 2 * x);
const wrapPi = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Sets root.y so the lowest voxel surface of the posed body sits on the ground (y = 0). */
const groundInsectPose = (realized: Realized, pose: Pose, hop = 0): Pose => {
  const probe: Pose = { root: [pose.root[0], 0, pose.root[2]], rotations: pose.rotations };
  const surfaces = posedVoxelSurfaceBoundsForBones(
    realized,
    probe,
    realized.body.bones.map((bone) => bone.id),
  );
  return { ...pose, root: [pose.root[0], -Math.min(...surfaces.values()) + hop, pose.root[2]] };
};

const rotationsOf = (base: Pose): Record<string, Mat3> => ({ ...base.rotations });
const addRotation = (rotations: Record<string, Mat3>, bone: string, delta: Mat3): void => {
  rotations[bone] = mulMM(rotations[bone] ?? IDENTITY_M, delta);
};

/** The rest stance: all six feet down, the feelers forward and up, the jaws a little apart. */
export const insectPose = (realized: Realized, stance: { readonly mandibleOpen?: number } = {}): Pose => {
  const rotations: Record<string, Mat3> = {};
  const open = stance.mandibleOpen ?? 0;
  addRotation(rotations, 'mandible.L', rotY(open));
  addRotation(rotations, 'mandible.R', rotY(-open));
  return groundInsectPose(realized, { root: [0, 0, 0], rotations });
};

/** A leg's yaw (degrees, about the vertical through its hip) that puts its toe at `offset` metres along z from where it rests; the foot stays on the ground
 * and swings in an arc, exactly planted in z. `lift` metres raises the foot by tilting the whole leg about its hip. */
const legSwing = (realized: Realized, leg: LegBones, offset: number, lift: number): Mat3 => {
  const hip = boneById(realized.body.bones, leg.femur).head;
  const toe = boneById(realized.body.bones, leg.tarsus).tail;
  const x = toe[0] - hip[0];
  const z = toe[2] - hip[2];
  const r = Math.hypot(x, z);
  const theta = Math.atan2(x, z);
  const wanted = Math.max(-1, Math.min(1, (z + offset) / r));
  const phase = x >= 0 ? Math.acos(wanted) : -Math.acos(wanted);
  const yaw = (wrapPi(phase - theta) * 180) / Math.PI;
  const along: Vec3 = normalize([x, 0, z]);
  const tilt = (Math.asin(Math.min(1, Math.max(-1, lift / r))) * 180) / Math.PI;
  return mulMM(rotY(yaw), rotAxis(cross(along, [0, 1, 0]), tilt));
};

/** Ground distance per full cycle (both tripods): each foot's stance sweeps twice its amplitude and takes half a cycle. */
export const insectStrideLength = (realized: Realized): number =>
  4 * INSECT_GAIT.sweepPerHeight * (boneById(realized.body.bones, 'thorax').head[1] / INSECT_LAYOUT.shellY);

/** An alternating-tripod walk driven by ground distance: one tripod plants and slides back while the other lifts and reaches forward, then they swap.
 * The feelers sway against each other and the body rocks a little with each step. */
export const insectGaitPose = (realized: Realized, distance: number, speed: number, stance: { readonly mandibleOpen?: number } = {}): Pose => {
  const base = insectPose(realized, stance);
  if (speed <= 0 || !Number.isFinite(distance)) {
    return base;
  }
  const G = INSECT_GAIT;
  const height = boneById(realized.body.bones, 'thorax').head[1] / INSECT_LAYOUT.shellY;
  const amp = G.sweepPerHeight * height;
  const cycle = insectStrideLength(realized);
  const phase = (((distance % cycle) + cycle) % cycle) / cycle;
  const rotations = rotationsOf(base);
  for (const leg of LEG_BONES) {
    const own = (phase + 0.5 * tripodOf(leg)) % 1;
    let offset: number;
    let lift = 0;
    if (own < 0.5) {
      offset = -amp + 2 * amp * (own / 0.5); // stance: the foot slides back under the advancing body
    } else {
      const q = (own - 0.5) / 0.5;
      offset = amp - 2 * amp * smoothstep(q); // swing: it reaches forward again
      lift = G.liftPerHeight * height * Math.sin(Math.PI * q);
    }
    rotations[leg.femur] = legSwing(realized, leg, offset, lift);
  }
  const wave = Math.sin(2 * Math.PI * 2 * phase);
  addRotation(rotations, 'thorax', mulMM(rotZ(G.rollDeg * Math.sin(2 * Math.PI * 2 * phase)), rotX(G.pitchDeg * Math.cos(2 * Math.PI * 2 * phase))));
  for (const side of SIDES) {
    const sign = sideSign(side);
    addRotation(rotations, `antennaBase.${side}`, rotY(sign * G.antennaSwayDeg * wave));
    addRotation(rotations, `antennaTip.${side}`, rotY(sign * G.antennaTipSwayDeg * Math.sin(2 * Math.PI * 2 * phase - 1.2)));
  }
  const chatter = G.mandibleChatterDeg * (0.5 + 0.5 * Math.sin(2 * Math.PI * 4 * phase));
  addRotation(rotations, 'mandible.L', rotY(chatter));
  addRotation(rotations, 'mandible.R', rotY(-chatter));
  return groundInsectPose(realized, { root: base.root, rotations });
};

/** The idle at `time` seconds: still on its feet, the feelers flicking one after the other and the jaws working. */
export const insectIdlePose = (realized: Realized, time = 0): Pose => {
  const I = INSECT_IDLE;
  const base = insectPose(realized);
  const rotations = rotationsOf(base);
  const flick = (t: number): number => Math.max(0, Math.sin(t)) ** 3;
  for (const side of SIDES) {
    const sign = sideSign(side);
    const own = time * 2.3 + (side === 'L' ? 0 : 2.1);
    addRotation(rotations, `antennaBase.${side}`, mulMM(rotY(sign * I.antennaYawDeg * flick(own)), rotX(I.antennaRiseDeg * flick(own))));
    addRotation(rotations, `antennaTip.${side}`, rotY(sign * I.antennaTipYawDeg * flick(own - 0.6)));
  }
  const jaw = I.mandibleDeg * (0.5 + 0.5 * Math.sin(time * 5));
  addRotation(rotations, 'mandible.L', rotY(jaw));
  addRotation(rotations, 'mandible.R', rotY(-jaw));
  return groundInsectPose(realized, { root: base.root, rotations });
};

/** One key of the lunge: time in seconds; `pitch` raises the nose (degrees); `head` pitches the head (positive up); `jaws` is how far the mandibles part;
 * `reach` lifts the front legs (degrees about the hip); `feelers` sweeps them back (negative) or up; `advance` is the body's move forward in `height`s;
 * `hop` its lift off the ground in `height`s. */
interface LungeKey {
  readonly t: number;
  readonly pitch: number;
  readonly head: number;
  readonly jaws: number;
  readonly reach: number;
  readonly feelers: number;
  readonly advance: number;
  readonly hop: number;
}

/** A lunge and bite: it rears back on its hind legs with the jaws open and the front legs up, springs forward and drives its head down onto the target
 * (the blow lands at `hitTime`), snaps the jaws shut and scuttles back. */
export const INSECT_LUNGE = {
  name: 'lunge',
  duration: 0.6,
  hitTime: 0.3,
  keys: [
    { t: 0, pitch: 0, head: 0, jaws: 0, reach: 0, feelers: 0, advance: 0, hop: 0 },
    { t: 0.16, pitch: 16, head: 8, jaws: 42, reach: 38, feelers: 12, advance: 0.2, hop: 0 },
    { t: 0.3, pitch: -9, head: -22, jaws: 46, reach: -4, feelers: -26, advance: -1.6, hop: 0.35 },
    { t: 0.38, pitch: -6, head: -16, jaws: 2, reach: -8, feelers: -22, advance: -1.5, hop: 0.2 },
    { t: 0.6, pitch: 0, head: 0, jaws: 0, reach: 0, feelers: 0, advance: 0, hop: 0 },
  ] as readonly LungeKey[],
} as const;

const lungeNumber = (key: LungeKey, field: Exclude<keyof LungeKey, 't'>): number => key[field];

/** The lunge at `time` over `base` (the idle or walk pose), eased between its keys and re-grounded. */
export const insectAttackPose = (realized: Realized, base: Pose, time: number): Pose => {
  const { keys, duration } = INSECT_LUNGE;
  const t = Math.max(0, Math.min(duration, time));
  let hi = keys.findIndex((key) => key.t >= t);
  if (hi < 0) {
    hi = keys.length - 1;
  }
  const lo = Math.max(0, hi - 1);
  const span = keys[hi]!.t - keys[lo]!.t;
  const u = span > 0 ? smoothstep((t - keys[lo]!.t) / span) : 1;
  const at = (field: Exclude<keyof LungeKey, 't'>): number => {
    const a = lungeNumber(keys[lo]!, field);
    return a + (lungeNumber(keys[hi]!, field) - a) * u;
  };
  const height = boneById(realized.body.bones, 'thorax').head[1] / INSECT_LAYOUT.shellY;
  const rotations = rotationsOf(base);
  addRotation(rotations, 'thorax', rotX(at('pitch')));
  addRotation(rotations, 'head', rotX(at('head')));
  addRotation(rotations, 'mandible.L', rotY(at('jaws')));
  addRotation(rotations, 'mandible.R', rotY(-at('jaws')));
  for (const leg of LEG_BONES.filter((candidate) => candidate.pair === 'F')) {
    const hip = boneById(realized.body.bones, leg.femur).head;
    const toe = boneById(realized.body.bones, leg.tarsus).tail;
    const along: Vec3 = normalize([toe[0] - hip[0], 0, toe[2] - hip[2]]);
    addRotation(rotations, leg.femur, rotAxis(cross(along, [0, 1, 0]), at('reach')));
  }
  for (const side of SIDES) {
    addRotation(rotations, `antennaBase.${side}`, rotX(at('feelers')));
  }
  const advance = scale([0, 0, -1], at('advance') * height);
  return groundInsectPose(realized, { root: add(base.root, advance), rotations }, at('hop') * height);
};
