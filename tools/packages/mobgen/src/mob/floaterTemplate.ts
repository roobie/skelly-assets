// The floater template: a legless hovering body (mob/floater.ts holds the plan and its poses); this module only names the template and its sampled
// ranges. It is the base of the floating rows of models/mobs.json (tools/mobs.mjs poses a `floater` body plan with floater.ts's own
// functions) and stays outside mob/templates.ts's TEMPLATES list, so Deadvox's enumerations never see it; the mob export opts in explicitly.
// A row narrows every param to its sprite; the values here are the flame figure's, the plan's plainest case.

import { registerTemplate, type Template } from '../core/template.ts';
// Imports for the side effect of registering the 'floater' body plan (mob/floater.ts's registerBodyPlan call).
import './floater.ts';

export const floaterTemplate: Template = {
  name: 'floater',
  materials: {
    body: { color: [1, 0.55, 0.1], emissive: 0.8 },
    hot: { color: [1, 0.92, 0.5], emissive: 1.2 },
    edge: { color: [0.85, 0.15, 0.05], emissive: 0.6 },
    eye: { color: [0.05, 0.02, 0.02], emissive: 0 },
    bone: { color: [1, 0.92, 0.5], emissive: 1.2 }, // the plan declares none, but the voxelizer wants exposed bone to have a material
  },
  description: 'A legless hovering body: a core with an optional head, arms, a tapering tail chain and ragged tongues.',
  bodyPlan: 'floater',
  voxelSize: 0.5 / 12,
  bodyMassKg: 20,
  params: {
    height: { min: 1.4, max: 1.6 },
    headScale: 0.045,
    hover: 0.3,
    coreWidth: 0.07,
    coreHeight: 0.1,
    coreDepth: 0.05,
    tailLength: 0.55,
    tailSegments: 7,
    tailRadius: 0.05,
    tailTipRadius: 0.02,
    armLength: 0.45,
    armRadius: 0.025,
    armDrop: 20,
    armBend: 25,
    tongueCount: 5,
    tongueLength: 0.1,
    tongueRadius: 0.025,
    tongueElevMin: 45,
    tongueElevMax: 85,
    speckle: 0.1,
    tailCurl: 80,
    sway: 9,
    flicker: 10,
    bob: 0.04,
    lean: 8,
    driftCycle: 2.2,
  },
  supportBones: 'ground-contacts',
  budgets: {
    totalVoxels: { min: 40, max: 3000 },
    totalTriangles: { min: 100, max: 12000 },
    groups: {},
  },
};
registerTemplate(floaterTemplate);
