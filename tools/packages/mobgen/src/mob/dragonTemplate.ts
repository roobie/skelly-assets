// The dragon template: a winged biped reared on its hind legs (mob/dragon.ts holds the plan and its poses); this module only names the template, its
// palette and sampled ranges. It is the base of the dragon rows of models/mobs.json (tools/mobs.mjs poses a `dragon` body plan with dragon.ts's own
// functions) and stays outside mob/templates.ts's TEMPLATES list, so Deadvox's enumerations never see it; the mob export opts in explicitly.
// A row narrows every param to its sprite and brings its palette; the values here are the plan's plainest case.

import { registerTemplate, type Template } from '../core/template.ts';
// Imports for the side effect of registering the 'dragon' body plan (mob/dragon.ts's registerBodyPlan call).
import './dragon.ts';

export const dragonTemplate: Template = {
  name: 'dragon',
  materials: {
    body: { color: [0.2, 0.3, 0.8], emissive: 0 },
    spot: { color: [0.1, 0.15, 0.5], emissive: 0 }, // dark mottling over the body
    spark: { color: [0.5, 0.8, 1], emissive: 1.2 }, // glowing flecks
    belly: { color: [0.9, 0.65, 0.1], emissive: 0 },
    rib: { color: [0.7, 0.45, 0.05], emissive: 0 }, // the darker rib between belly plates
    wing: { color: [0.8, 0.72, 0.4], emissive: 0 }, // the membrane
    wingBone: { color: [0.15, 0.2, 0.6], emissive: 0 }, // the wing's arm and finger spars
    horn: { color: [0.92, 0.9, 0.78], emissive: 0 }, // horns and talons
    eye: { color: [1, 0.9, 0.2], emissive: 1.4 },
    bone: { color: [0.92, 0.9, 0.78], emissive: 0 }, // the plan declares none, but the voxelizer wants exposed bone to have a material
  },
  description: 'A winged biped dragon reared on digitigrade hind legs: a long S-curved neck, a horned head with a hinged jaw, clawed forelimbs, membrane wings and a thick tail.',
  bodyPlan: 'dragon',
  voxelSize: 0.5 / 12,
  bodyMassKg: 900,
  params: {
    height: 3.5,
    headScale: 1,
    bulk: 1,
    wingSpan: 1,
    hornLength: 1,
    spots: 0,
    spark: 0,
    strideRatio: 0.6,
    liftRatio: 0.12,
    bob: 0.05,
    sway: 7,
    neckSway: 4,
    wingFlap: 8,
    armSwing: 8,
    lean: 3,
  },
  supportBones: 'ground-contacts',
  budgets: {
    totalVoxels: { min: 40, max: 200000 },
    totalTriangles: { min: 100, max: 60000 },
    groups: {},
  },
};
registerTemplate(dragonTemplate);
