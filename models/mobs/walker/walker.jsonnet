// The security walker's template: sampling ranges, look, mass, supports and budgets. Body construction is
// `tools/packages/mobgen/src/mob/walker/plan.ts`, `buildWalker`; this file holds only the values it reads.
local range(min, max) = { min: min, max: max };

// Every colour is HSL so look tuning stays here; resolveMaterials replaces each placeholder colour. The
// palette matches the drivable security walker's finishes, so the mob and the vehicle read as one line.
local hsl = {
  // Slate armour plate: the box, the pods and the leg plating.
  armor: ['armorHue', 'armorSat', 'armorLight'],
  // Charcoal structure: joint drums, the sensor housing, the gun housings and the foot plates.
  frame: ['armorHue', 0.06, 'frameLight'],
  // Warning yellow under the graphite stripes, so the front reads as a machine that should not be approached.
  hazard: ['hazardHue', 0.92, 0.56],
  // Bright steel for the exposed ram pistons, the one place the eye reads moving hydraulics.
  piston: [205, 0.06, 0.64],
  // The sensor slit's dark glass.
  window: [195, 0.35, 0.07],
  // Sensor lenses behind the slit.
  sensor: [178, 0.75, 0.55],
  // The centre lens: the lock-on telegraph, charged so the host can brighten it as the pods spin up.
  core: [36, 0.95, 0.55],
  // Pod tube mouths.
  bore: [0, 0, 0.04],
  // Gun muzzles, charged so the shots flash.
  muzzle: [28, 0.9, 0.55],
  // Dark steel claws and spur.
  claw: [30, 0.08, 0.2],
  // Exposed internals where a part is torn off: copper wiring and conduit.
  bone: [24, 0.45, 0.33],
};
local emission = { sensor: 0.9, core: 1.2, muzzle: 0.25 };
local charged = { core: true, muzzle: true };

{
  name: 'security-walker',
  description: 'Armoured reverse-knee guard walker: stomps on two hydraulic legs and fires from twin flank pods.',
  bodyPlan: 'walker',
  voxelSize: 0.5 / 8,
  bodyMassKg: 4200,
  supportBones: ['foot.L', 'foot.R'],
  params: {
    scale: range(0.96, 1.04),
    girth: range(0.95, 1.08),
    pods: range(0.92, 1.1),
    stance: range(0.96, 1.05),
    armorHue: range(204, 222),
    armorSat: range(0.12, 0.18),
    armorLight: range(0.29, 0.34),
    frameLight: range(0.13, 0.17),
    hazardHue: range(44, 50),
  },
  materials: {
    [name]: { color: [0, 0, 0], emissive: std.get(emission, name, 0) }
            + (if std.objectHas(charged, name) then { charged: charged[name] } else {})
    for name in std.objectFields(hsl)
  },
  materialHsl: hsl,
  // At the template voxel size; `tools/packages/mobgen/src/mob/budgets.ts`, `gridScaledBudgets`, scales them to
  // other grids. Totals catch a build that lost or doubled a part. The groups guard the read: the legs keep a
  // share fit to carry the box, or it reads as a box on stilts, and the pods stay a minor share, or the
  // walker reads as a gun platform rather than a body.
  budgets: {
    totalVoxels: range(16000, 42000),
    totalTriangles: range(11000, 27000),
    groups: {
      legs: { bones: ['thigh.*', 'shin.*', 'tarsus.*', 'foot.*'], min: 3000, max: 16000, minFraction: 0.2 },
      pods: { bones: ['pod.*'], min: 1500, max: 7000, maxFraction: 0.25 },
    },
  },
}
