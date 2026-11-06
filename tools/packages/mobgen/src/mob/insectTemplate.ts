// The insect template: a giant cockroach-like crawler. Its body plan and poses (walk, lunge, idle) live in mob/insect.ts; this module only names
// the template, its palette and its sampled ranges.
//
// It is the base of the insect rows of models/mobs.json (tools/mobs.mjs poses an `insect` body plan with insect.ts's own functions), so it is
// ready for consumers. Like the dog it stays outside mob/templates.ts's TEMPLATES list, so Deadvox's enumerations never see it; the mob export opts in.

import { registerTemplate, type Template } from '../core/template.ts';
// Importing insect.ts registers the 'insect' body plan (its registerBodyPlan call).
import { INSECT_ANT_DEFAULTS, INSECT_FEET } from './insect.ts';

const material = (color: readonly [number, number, number], emissive = 0) => ({ color, emissive }) as const;

export const insectTemplate: Template = {
  name: 'insect',
  materials: {
    shell: material([0.86, 0.5, 0.05]),
    sheen: material([1, 0.75, 0.2]),
    dark: material([0.3, 0.14, 0.02]),
    head: material([0.36, 0.16, 0.04]),
    eye: material([1, 0.04, 0.03], 0.8),
    antenna: material([1, 0.62, 0.05]),
    leg: material([0.28, 0.13, 0.03]),
    bone: material([0.28, 0.13, 0.03]), // the voxelizer's name for skeleton showing through the flesh: where a thin limb has none, it reads as leg
  },
  description: 'Low, broad, six-legged crawler: a glossy oval carapace, long feelers, an alternating-tripod scuttle and a lunging bite.',
  bodyPlan: 'insect',
  voxelSize: 0.5 / 14,
  bodyMassKg: 1.5,
  params: {
    height: { min: 0.16, max: 0.19 },
    bodyLength: { min: 0.95, max: 1.1 },
    girth: { min: 0.95, max: 1.1 },
    headScale: { min: 0.95, max: 1.1 },
    antennaLength: { min: 0.9, max: 1.1 },
    legSpread: { min: 0.9, max: 1.1 },
    legThickness: { min: 0.95, max: 1.1 },
    mandibleOpen: { choices: [0, 4, 8] },
    ...INSECT_ANT_DEFAULTS, // the ant-like departures (insect.ts), off here
  },
  supportBones: INSECT_FEET,
  budgets: {
    totalVoxels: { min: 150, max: 4000 },
    totalTriangles: { min: 300, max: 9000 },
    groups: { head: { bones: ['head', 'mandible.*'], min: 8, max: 400 } },
  },
};
registerTemplate(insectTemplate);
