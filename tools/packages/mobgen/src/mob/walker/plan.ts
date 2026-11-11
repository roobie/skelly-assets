// The walker body plan: an armoured box carried on two reverse-knee hydraulic legs, with a weapon pod on
// each flank. The rest pose is its guard stance, so validation judges the body it patrols in; every other
// stance is a clip on this rig (see motion.ts). Values a look change would tune live in
// `models/mobs/walker/walker.jsonnet`; proportions and joint ranges that the supports, the leg solver, the
// clips and the region contract depend on live here.
//
// Everything is plate, drum and ram: parts overlap their neighbours rather than meet them, so no rod or
// hose ever reads as detached, and each joint is a drum owned by the child bone, so a posed joint shows a
// turning drum rather than a gap.

import content from '../../../../../../models/mobs/walker/walker.json' with { type: 'json' };
import type { Body, BodyRegion, Bone, Feature, Material } from '../../core/body.ts';
import { registerBodyPlan, sampleParams } from '../../core/generate.ts';
import { frameAbout } from '../../core/joints.ts';
import { add, type Mat3, mulMV, rotX, rotY, rotZ, scale, sub, type Vec3 } from '../../core/math.ts';
import type { Shape } from '../../core/sdf.ts';
import { type Genome, registerTemplate, type Template } from '../../core/template.ts';
import { gridScaledBudgets } from '../budgets.ts';
import { resolveMaterials } from '../materials.ts';

export const WALKER_TEMPLATE = content as unknown as Template;

const PARAM_ORDER = [
  'scale',
  'girth',
  'pods',
  'stance',
  'armorHue',
  'armorSat',
  'armorLight',
  'frameLight',
  'hazardHue',
] as const;
type Params = Readonly<Record<(typeof PARAM_ORDER)[number], number>>;

const SIDES = [
  ['L', -1],
  ['R', 1],
] as const;

/** The leg's bones from the hip down; motion.ts solves them as one chain. */
export const LEG_BONES = ['thigh', 'shin', 'tarsus', 'foot'] as const;

/** Hit regions. The pods are what the walker fights with, so they are its arms; the sensor head is the
 * one aim point that blinds it. */
const WALKER_REGION_BONES: Readonly<Record<BodyRegion, readonly string[]>> = {
  head: ['head'],
  torso: ['hull'],
  leftArm: ['pod.L'],
  rightArm: ['pod.R'],
  leftLeg: LEG_BONES.map((bone) => `${bone}.L`),
  rightLeg: LEG_BONES.map((bone) => `${bone}.R`),
};

type Range = readonly [number, number];
/** Joint ranges in degrees, as [flex, abduct, twist]; positive flex is the joint's working direction (see
 * jointFrames). The legs swing only in the line of travel: a machine joint is a hinge. */
const JOINT_LIMITS: Readonly<Record<string, readonly [Range, Range, Range]>> = {
  hull: [
    [-12, 12],
    [-8, 8],
    [-10, 10],
  ],
  head: [
    [-15, 15],
    [-25, 25],
    [-6, 6],
  ],
  pod: [
    [-20, 30],
    [-12, 12],
    [-6, 6],
  ],
  thigh: [
    [-45, 60],
    [0, 0],
    [0, 0],
  ],
  shin: [
    [-30, 60],
    [0, 0],
    [0, 0],
  ],
  tarsus: [
    [-50, 60],
    [0, 0],
    [0, 0],
  ],
  foot: [
    [-40, 60],
    [0, 0],
    [0, 0],
  ],
};

/** Bones whose positive flex turns about the body's left axis. Every joint flexes about the body's right
 * axis, so each leg stays in the line of travel and one solver poses it (motion.ts); positive flex is each
 * joint's working direction: the hull, head and pods pitch their front up, the thigh swings forward, the
 * knee folds, the hock lifts the tarsus and the foot points its toes down. */
export const REVERSED_FLEX: ReadonlySet<string> = new Set(['shin', 'foot']);
const jointFrames = (bones: readonly Bone[]): Bone[] =>
  bones.map((bone) => {
    const name = bone.id.split('.')[0]!;
    const limits = JOINT_LIMITS[name];
    if (!limits) {
      throw new Error(`walker bone "${bone.id}" has no joint range`);
    }
    const [flex, abduct, twist] = limits;
    const axis: Vec3 = REVERSED_FLEX.has(name) ? [-1, 0, 0] : [1, 0, 0];
    return { ...bone, frame: frameAbout(bone, axis), limits: { flex, abduct, twist } };
  });

/** Segments whose plating thickness decides the validation profile. */
const LIMB_BONES = SIDES.flatMap(([s]) => [`thigh.${s}`, `shin.${s}`, `tarsus.${s}`]);

interface Rig {
  readonly bones: Bone[];
  readonly features: Feature[];
}

const box = (center: Vec3, half: Vec3, rot?: Mat3): Shape & { kind: 'box' } => ({
  kind: 'box',
  center,
  half,
  round: 0.02,
  ...(rot ? { rot } : {}),
});
const capsule = (a: Vec3, b: Vec3, ra: number, rb = ra): Shape => ({ kind: 'capsule', a, b, ra, rb });
const ellipsoid = (center: Vec3, radii: Vec3): Shape => ({ kind: 'ellipsoid', center, radii });

/** Plates meet hard; a tiny blend keeps overlapping parts one surface without rounding their edges. */
const HARD = 0.005;
const part = (rig: Rig, bone: string, shape: Shape, material: Material): void => {
  rig.features.push({ bone, op: 'add', shape, material, blend: HARD });
};
const paint = (rig: Rig, bone: string, shape: Shape, material: Material, onto: readonly Material[]): void => {
  rig.features.push({ bone, op: 'paint', shape, material, onto });
};

/** A plate running from `a` to `b` in the sagittal plane, `half` wide and deep, overrunning both ends. */
const slab = (a: Vec3, b: Vec3, [halfWidth, halfDepth]: readonly [number, number], overrun: number): Shape => {
  const along = sub(b, a);
  const span = Math.hypot(along[1], along[2]);
  const pitch = (Math.atan2(along[2], along[1]) * 180) / Math.PI;
  return box(scale(add(a, b), 0.5), [halfWidth, span / 2 + overrun, halfDepth], rotX(pitch));
};

/** A joint drum: a short cylinder across the leg, its axis the joint's hinge. */
const drum = (at: Vec3, radius: number, halfWidth: number): Shape =>
  capsule(add(at, [-halfWidth + radius * 0.5, 0, 0]), add(at, [halfWidth - radius * 0.5, 0, 0]), radius);

/** A hydraulic ram along a segment, set into the plate on the side `offset` points to: a thick charcoal
 * cylinder over the upper part and a bright piston over the rest, both sunk into the plate so neither can
 * read as a loose rod. */
const ram = (rig: Rig, bone: string, a: Vec3, b: Vec3, offset: Vec3, radius: number): void => {
  const along = sub(b, a);
  const split = add(add(a, scale(along, 0.58)), offset);
  part(rig, bone, capsule(add(add(a, scale(along, 0.1)), offset), split, radius), 'frame');
  part(rig, bone, capsule(split, add(add(a, scale(along, 0.92)), offset), radius * 0.62), 'piston');
};

const AXES = { x: 0, y: 1, z: 2 } as const;

/** Warning stripes at 45° across a yellow band, painted onto `onto` inside `region` on a face whose normal
 * is the `facing` axis. Each stripe is a slab turned 45° about that axis, so the stripes run diagonally
 * across whichever face it is. */
const hazardBand = (
  rig: Rig,
  bone: string,
  region: Shape & { kind: 'box' },
  onto: Material,
  pitch: number,
  facingAxis: keyof typeof AXES,
): void => {
  paint(rig, bone, region, 'hazard', [onto]);
  const reach = Math.max(...region.half);
  const facing = AXES[facingAxis];
  // Stripes step along the band's long axis on the face, which is z on a side face and x otherwise.
  const along = facing === 0 ? 2 : 0;
  const turn = [rotX, rotY, rotZ][facing]!(45);
  for (let step = -reach * 1.6; step <= reach * 1.6; step += pitch) {
    const center = region.center.map((value, axis) => (axis === along ? value + step : value)) as unknown as Vec3;
    const half = [0, 1, 2].map((axis) => (axis === along ? pitch / 4 : reach * 2)) as unknown as Vec3;
    paint(rig, bone, box(center, half, turn), 'frame', ['hazard']);
  }
};

const buildWalker = (genome: Genome, template: Template): Body => {
  const p = genome.params as Params;
  const s = p.scale;
  const at = (x: number, y: number, z: number): Vec3 => [x * s, y * s, z * s];
  const r = (value: number): number => value * s;
  const rig: Rig = { bones: [], features: [] };

  // The hull: a flat-topped armoured box with a sloped chin, hip housings under each side and a power pack
  // behind. Never severs: it is the body.
  rig.bones.push({ id: 'hull', parent: null, head: at(0, 2.45, 0.2), tail: at(0, 2.45, -0.8), disposition: 'fixed' });
  part(rig, 'hull', box(at(0, 2.62, 0), [r(0.8), r(0.46), r(0.98)]), 'armor');
  part(rig, 'hull', box(at(0, 3.1, -0.04), [r(0.84), r(0.05), r(1.02)]), 'armor');
  part(rig, 'hull', box(at(0, 2.3, -0.82), [r(0.72), r(0.2), r(0.3)], rotX(-38)), 'armor');
  part(rig, 'hull', box(at(0, 2.72, 1.04), [r(0.62), r(0.3), r(0.16)]), 'frame');
  // A hatch on the roof and a seam line round the box break the big plate into panels, so it reads as
  // built armour at a distance rather than a block.
  // A top-down camera sees mostly roof, so the roof carries the most detail: a dark inset deck, a raised
  // hatch on it and a vent grille behind.
  paint(rig, 'hull', box(at(0, 3.16, 0.04), [r(0.66), r(0.04), r(0.84)]), 'frame', ['armor']);
  part(rig, 'hull', box(at(0, 3.2, -0.3), [r(0.36), r(0.06), r(0.34)]), 'armor');
  for (const z of [0.36, 0.5, 0.64]) {
    part(rig, 'hull', box(at(0, 3.17, z), [r(0.46), r(0.04), r(0.035)]), 'armor');
  }
  paint(rig, 'hull', box(at(0, 2.84, 0), [r(0.9), r(0.025), r(1.1)]), 'frame', ['armor']);
  for (const [, x] of SIDES) {
    part(rig, 'hull', box(at(0.64 * x * p.stance, 2.1, 0.14), [r(0.28), r(0.22), r(0.38)]), 'frame');
    // A shoulder rail where the pod yoke turns.
    part(rig, 'hull', box(at(0.82 * x, 2.66, -0.14), [r(0.05), r(0.22), r(0.28)]), 'frame');
    // Warning stripes along the lower flank, behind the pod, as on the drivable walker.
    hazardBand(rig, 'hull', box(at(0.8 * x, 2.3, 0.5), [r(0.03), r(0.12), r(0.42)]), 'armor', r(0.28), 'x');
  }
  hazardBand(rig, 'hull', box(at(0, 2.26, -1.02), [r(0.74), r(0.13), r(0.2)]), 'armor', r(0.3), 'z');
  hazardBand(rig, 'hull', box(at(0, 2.3, 0.98), [r(0.76), r(0.09), r(0.04)]), 'armor', r(0.28), 'z');

  // The sensor head: a charcoal block set into the front of the box carrying the slit window and its
  // lenses. It severs, as the one shot that blinds the walker.
  rig.bones.push({ id: 'head', parent: 'hull', head: at(0, 2.74, -0.92), tail: at(0, 2.74, -1.3), disposition: 'sever' });
  part(rig, 'head', box(at(0, 2.74, -1.06), [r(0.66), r(0.22), r(0.16)]), 'frame');
  part(rig, 'head', box(at(0, 2.95, -1.1), [r(0.7), r(0.05), r(0.14)]), 'armor');
  paint(rig, 'head', box(at(0, 2.76, -1.2), [r(0.56), r(0.075), r(0.06)]), 'window', ['frame']);
  for (const x of [-0.4, -0.2, 0, 0.2, 0.4]) {
    part(rig, 'head', ellipsoid(at(x, 2.76, -1.205), [r(0.055), r(0.055), r(0.03)]), x === 0 ? 'core' : 'sensor');
  }

  for (const [side, x] of SIDES) {
    buildPod(rig, side, x, { at, r, p });
    buildLeg(rig, side, x, { at, r, p });
  }
  return {
    bones: jointFrames(rig.bones),
    features: rig.features,
    materials: resolveMaterials(template, genome.params),
  };
};

interface Limb {
  readonly at: (x: number, y: number, z: number) => Vec3;
  readonly r: (value: number) => number;
  readonly p: Params;
}

/** A weapon pod on a yoke at the shoulder rail: a launcher box with four tube mouths, and a gun slung
 * under it whose housing runs the pod's length, so the barrel grows out of the pod rather than hanging. */
const buildPod = (rig: Rig, side: string, x: number, { at, r, p }: Limb): void => {
  const bone = `pod.${side}`;
  const k = p.pods;
  const out = 0.86 + 0.26 * k;
  rig.bones.push({ id: bone, parent: 'hull', head: at(0.86 * x, 2.66, -0.14), tail: at(out * x, 2.62, -1.1), disposition: 'sever' });
  part(rig, bone, box(at(0.92 * x, 2.66, -0.14), [r(0.1), r(0.17), r(0.2)]), 'frame');
  part(rig, bone, box(at(out * x, 2.64, -0.36), [r(0.23 * k), r(0.26 * k), r(0.6)]), 'armor');
  const front = -0.96;
  paint(rig, bone, box(at(out * x, 2.64, front + 0.05), [r(0.24 * k), r(0.27 * k), r(0.07)]), 'frame', ['armor']);
  for (const [dx, dy] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ] as const) {
    paint(rig, bone, box(at(out * x + 0.1 * k * dx, 2.64 + 0.11 * k * dy, front), [r(0.065), r(0.065), r(0.05)]), 'bore', ['frame']);
  }
  hazardBand(rig, bone, box(at((out + 0.23 * k) * x, 2.64, -0.72), [r(0.04), r(0.2 * k), r(0.18)]), 'armor', r(0.26), 'x');
  hazardBand(rig, bone, box(at(out * x, 2.64 + 0.26 * k, -0.82), [r(0.2 * k), r(0.04), r(0.1)]), 'armor', r(0.26), 'y');
  const gunY = 2.64 - 0.26 * k - 0.1;
  part(rig, bone, box(at(out * x, gunY, -0.5), [r(0.13), r(0.12), r(0.42)]), 'frame');
  part(rig, bone, capsule(at(out * x, gunY, -0.9), at(out * x, gunY, -1.32), r(0.085)), 'frame');
  part(rig, bone, box(at(out * x, gunY, -1.33), [r(0.11), r(0.11), r(0.06)]), 'frame');
  paint(rig, bone, box(at(out * x, gunY, -1.4), [r(0.12), r(0.12), r(0.03)]), 'muzzle', ['frame']);
};

/** A reverse-knee leg: the thigh drops forward from the hip housing to a forward knee, the shin runs back
 * to a high hock (the joint that reads as the backward knee), and the tarsus drops forward to a clawed
 * foot with a rear spur. Every segment is a plate with a ram set into it and a drum at its head. */
const buildLeg = (rig: Rig, side: string, x: number, { at, r, p }: Limb): void => {
  const g = p.girth;
  const lx = 0.66 * x * p.stance;
  const hip = at(lx, 2.06, 0.14);
  const knee = at(lx, 1.46, -0.44);
  const hock = at(lx, 0.74, 0.42);
  const ball = at(lx, 0.2, -0.02);
  const toe = at(lx, 0.1, -0.7);
  const [thigh, shin, tarsus, foot] = LEG_BONES.map((bone) => `${bone}.${side}`) as [string, string, string, string];
  rig.bones.push(
    { id: thigh, parent: 'hull', head: hip, tail: knee, disposition: 'sever' },
    { id: shin, parent: thigh, head: knee, tail: hock },
    { id: tarsus, parent: shin, head: hock, tail: ball },
    { id: foot, parent: tarsus, head: ball, tail: toe },
  );

  // The thigh carries the body, so it is the heaviest plate: an armoured cowl over the actuator on its outer
  // face makes it read as the muscle of the machine.
  part(rig, thigh, drum(hip, r(0.3 * g), r(0.3 * g)), 'frame');
  part(rig, thigh, slab(hip, knee, [r(0.26 * g), r(0.3 * g)], r(0.06)), 'armor');
  part(rig, thigh, slab(add(hip, at(0.3 * x * g, -0.05, 0.02)), add(knee, at(0.3 * x * g, 0.16, 0.12)), [r(0.07), r(0.27 * g)], 0), 'armor');
  ram(rig, thigh, hip, knee, at(0, 0.2, -0.2), r(0.12 * g));

  part(rig, shin, drum(knee, r(0.29 * g), r(0.29 * g)), 'frame');
  part(rig, shin, slab(knee, hock, [r(0.21 * g), r(0.24 * g)], r(0.02)), 'armor');
  ram(rig, shin, knee, hock, at(0, -0.18, -0.16), r(0.11 * g));
  hazardBand(rig, shin, box(add(knee, at(0, -0.12, -0.25 * g)), [r(0.2 * g), r(0.13), r(0.04)]), 'armor', r(0.22), 'z');

  part(rig, tarsus, drum(hock, r(0.26 * g), r(0.25 * g)), 'frame');
  part(rig, tarsus, slab(hock, ball, [r(0.17 * g), r(0.18 * g)], r(0.02)), 'armor');
  ram(rig, tarsus, hock, ball, at(0, 0.11, 0.15), r(0.09 * g));

  // The foot: a plate under the ankle drum, three splayed toes and a rear spur, each ending in a claw. The plate
  // and toes sit flat on the ground in the guard stance; the claws bite just ahead.
  part(rig, foot, drum(ball, r(0.18 * g), r(0.2 * g)), 'frame');
  part(rig, foot, box(add(ball, at(0, -0.11, -0.08)), [r(0.25 * g), r(0.09), r(0.3)]), 'frame');
  const toeRoot = add(ball, at(0, -0.1, -0.12));
  const pad = r(0.09);
  /** A digit from the toe root along `heading` (degrees of yaw, 0 forward), ending in a claw that bites down. */
  const digit = (heading: number, reach: number): void => {
    const ahead = (metres: number): Vec3 => add(toeRoot, at(...mulMV(rotY(heading), [0, 0, -metres])));
    const [tx, , tz] = ahead(reach);
    const [cx, , cz] = ahead(reach + 0.12);
    part(rig, foot, capsule(toeRoot, [tx, pad, tz], pad), 'armor');
    part(rig, foot, capsule([tx, r(0.08), tz], [cx, r(0.03), cz], r(0.07), r(0.035)), 'claw');
  };
  digit(-26, 0.5);
  digit(0, 0.6);
  digit(26, 0.5);
  digit(180, 0.42);
};

registerBodyPlan('walker', {
  sample: (rng, template) => ({ params: sampleParams(rng, template.params, PARAM_ORDER), wounds: [] }),
  build: buildWalker,
  paramOrder: PARAM_ORDER,
  woundBones: [],
  budgets: gridScaledBudgets,
  limbBones: LIMB_BONES,
  regionBones: WALKER_REGION_BONES,
});
registerTemplate(WALKER_TEMPLATE);
