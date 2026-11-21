// The critter template: a low, long-bodied quadruped with a segmented tail. Its body plan and poses live in mob/critter.ts; this module only
// names the template, its palette and its sampled ranges. The ranges here are a plain grey rat's, the plan's plainest case; a row (a
// mutant rat, a sprawling lizard) narrows them.
//
// It is the base of the critter rows of models/mobs.json (tools/mobs.mjs poses a `critter` body plan with critter.ts's own functions). Like
// the dog it stays outside mob/templates.ts's TEMPLATES list, so Deadvox's enumerations never see it; the mob export opts in.

import { registerTemplate, type Template } from '../core/template.ts';
// Importing critter.ts registers the 'critter' body plan (its registerBodyPlan call).
import { CRITTER_TAIL } from './critter.ts';

const material = (color: readonly [number, number, number], emissive = 0) => ({ color, emissive }) as const;

export const critterTemplate: Template = {
  name: 'critter',
  materials: {
    skin: material([0, 0, 0]), // from the skin hue params
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
  description: 'Low, long-bodied quadruped (a rat, a lizard): short or sprawling legs, a segmented tail that sways, a diagonal scurry and a pounce.',
  bodyPlan: 'critter',
  voxelSize: 0.5 / 32, // fine enough for a rat-sized row's eyes and teeth; a bigger row coarsens it with its lod_divisor
  bodyMassKg: 2,
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
    groups: { head: { bones: ['head', 'jaw'], min: 20, max: 1200 }, tail: { bones: [...CRITTER_TAIL], min: 4, max: 800 } },
  },
};
registerTemplate(critterTemplate);
