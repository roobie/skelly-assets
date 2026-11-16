// The critter template: a low, long-bodied quadruped with a segmented tail (a rat, a lizard). Body construction and
// its poses are `tools/packages/mobgen/src/mob/critter.ts`; this file holds only the values it reads. The ranges are
// a plain grey rat's, the plan's plainest case, which a mob row narrows.
local material(color, emissive=0) = { color: color, emissive: emissive };
local tail = ['tail', 'tail2', 'tail3', 'tail4'];

{
  name: 'critter',
  description: 'Low, long-bodied quadruped (a rat, a lizard): short or sprawling legs, a segmented tail that sways, a diagonal scurry and a pounce.',
  bodyPlan: 'critter',
  // Fine enough for a rat-sized row's eyes and teeth; a bigger row coarsens it with its lod_divisor.
  voxelSize: 0.5 / 32,
  bodyMassKg: 2,
  materials: {
    skin: material([0, 0, 0]),  // from the skin hue params
    bruise: material([0.3, 0.27, 0.27]),
    belly: material([0.55, 0.5, 0.46]),
    ear: material([0.7, 0.5, 0.5]),
    nose: material([0.75, 0.45, 0.45]),
    tail: material([0.7, 0.52, 0.5]),
    paw: material([0.7, 0.52, 0.5]),
    eye: material([0.05, 0.03, 0.03]),
    mouth: material([0.22, 0.05, 0.06]),
    bone: material([0.85, 0.82, 0.72]),
  },
  materialHsl: { skin: ['skinHue', 'skinSat', 'skinLight'] },
  params: {
    height: { min: 0.14, max: 0.16 },
    bodyLength: { min: 1.6, max: 1.8 },
    girth: { min: 1, max: 1.1 },
    arch: { min: 0.15, max: 0.25 },
    legSplay: { min: 0.1, max: 0.2 },
    headScale: { min: 0.95, max: 1.05 },
    snoutLength: { min: 0.95, max: 1.05 },
    earSize: { min: 0.9, max: 1.1 },
    tailLength: { min: 2.2, max: 2.6 },
    tailGirth: { min: 0.3, max: 0.35 },
    headTilt: { choices: [-8, -4, 0] },
    jawOpen: { choices: [0, 0, 0.3] },
    limp: { min: 0, max: 0.2 },
    skinHue: { min: 20, max: 40 },
    skinSat: { min: 0.05, max: 0.15 },
    skinLight: { min: 0.3, max: 0.4 },
  },
  supportBones: ['forePaw.L', 'forePaw.R', 'hindPaw.L', 'hindPaw.R'],
  budgets: {
    totalVoxels: { min: 200, max: 6000 },
    totalTriangles: { min: 300, max: 12000 },
    groups: {
      head: { bones: ['head', 'jaw'], min: 20, max: 1200 },
      tail: { bones: tail, min: 4, max: 800 },
    },
  },
  motion: {
    tail: tail,
    // The tail's side-to-side wave in degrees at each joint, and how far it runs behind from one joint to the next in
    // radians, so it reads as a wave rather than a stiff swing. A walking critter swings it once a stride and lifts it
    // a little, so it never props the body; standing, it barely stirs.
    tailSway: { walkDeg: 9, idleDeg: 3, lagRad: 0.9, walkLiftDeg: 4 },
    // The withers height the shared pounce was authored for (the dog's), so a critter springs a distance in
    // proportion to its own size rather than a dog's.
    pounceShoulderMetres: 0.61,
    // The death: the legs buckle, the body rolls onto its side and the legs draw in, the head drops and the jaw
    // gapes. A four-legged body falls sideways, not onto its face, so the fall is keyed by the side it lands on; the
    // keys are written for a fall onto the left side, and the right is their mirror. Each key's rotations are degrees
    // about X on top of the idle pose (positive swings a leg forward and lifts the nose), its roll the degrees the
    // whole body has turned towards that side.
    death: {
      durationRealSeconds: 0.8,
      keys: [
        { t: 0, roll: 0, rotations: {} },
        {
          t: 0.25,
          roll: 18,
          rotations: { neck: -8, head: -10, jaw: -10, 'foreUpper.L': 12, 'foreUpper.R': 12, 'foreLower.L': -18, 'foreLower.R': -18, 'hindUpper.L': -10, 'hindUpper.R': -10, 'hindLower.L': 16, 'hindLower.R': 16 },
        },
        {
          t: 0.6,
          roll: 92,
          rotations: { neck: -14, head: -18, jaw: -24, 'foreUpper.L': 26, 'foreUpper.R': 20, 'foreLower.L': -34, 'foreLower.R': -28, 'hindUpper.L': -22, 'hindUpper.R': -16, 'hindLower.L': 32, 'hindLower.R': 26, tail: -6 },
        },
        {
          t: 0.8,
          roll: 88,
          rotations: { neck: -12, head: -16, jaw: -22, 'foreUpper.L': 24, 'foreUpper.R': 18, 'foreLower.L': -30, 'foreLower.R': -24, 'hindUpper.L': -20, 'hindUpper.R': -14, 'hindLower.L': 30, 'hindLower.R': 24, tail: -4 },
        },
      ],
    },
  },
}
