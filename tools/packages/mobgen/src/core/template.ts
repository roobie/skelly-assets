// Templates: a body plan plus sampling ranges, turned into a genome by
// generate.ts and into a body by a body-plan builder.
// Domain-agnostic: the core never hard-codes the humanoid's bones or params.

import type { MaterialDef } from './body.ts';
import type { Budgets } from './rules.ts';

/** A fixed value, a numeric range, or a set of choices to pick one from uniformly. */
export type ParamSpec =
  | number
  | { readonly min: number; readonly max: number }
  | { readonly choices: readonly number[] };

export type BodyPlan = string;
type SupportBones = readonly string[] | 'ground-contacts';

/** Consumer readiness. A `'comparison-only'` template is kept to be compared against others and must
 * never be spawned or exported; a missing status means ready. */
type TemplateStatus = 'ready' | 'comparison-only';

type Triple = readonly [number, number, number];

/** A shape of a PartSpec: positions in metres from the part's anchor on its bone (rest-world axes: x sideways, y up, -z forward). */
export type PartShape =
  | { readonly kind: 'ellipsoid'; readonly center: Triple; readonly radii: Triple }
  | { readonly kind: 'box'; readonly center: Triple; readonly half: Triple; readonly round?: number }
  | { readonly kind: 'capsule'; readonly a: Triple; readonly b: Triple; readonly ra: number; readonly rb: number };

/** A feature a mob row adds to a template's body (see mob/parts.ts): a shape on a bone, at the bone's `head`, `tail` or `mid` point.
 * `mirror` repeats it on the other side's bone (a `.L` bone for a `.R`) with x negated, so a pair is written once. */
export interface PartSpec {
  readonly bone: string;
  readonly at?: 'head' | 'tail' | 'mid';
  readonly op?: 'add' | 'paint' | 'carve';
  readonly material: string;
  readonly shape: PartShape;
  readonly mirror?: boolean;
  readonly blend?: number;
  readonly onto?: readonly string[];
}

export interface Template {
  readonly name: string;
  readonly description: string;
  readonly bodyPlan: BodyPlan;
  /** Retained upper-thigh fraction for a ground-crawling humanoid. */
  readonly legCut?: number;
  readonly voxelSize: number;
  /** Nominal total actor mass, used by template-aware part mass assignments. */
  readonly bodyMassKg: number;
  /** Optional mass fractions by part id; unspecified parts use voxel-volume share. */
  readonly massFractions?: Readonly<Record<string, number>>;
  readonly materials: Readonly<Record<string, MaterialDef>>;
  readonly materialHsl?: Readonly<Record<string, readonly [number | string, number | string, number | string]>>;
  readonly params: Readonly<Record<string, ParamSpec>>;
  readonly budgets: Budgets;
  /** The params the budgets' nominal sizes were measured at, when the template's own `params` are narrowed from another's (a mob row over its template):
   * budgets scale with how far a genome strays from these. Omitted means `params`. */
  readonly budgetParams?: Readonly<Record<string, ParamSpec>>;
  /** Features beyond the body plan's own, from a mob's row in models/mobs.json: a signature part on a bone, a patch of colour. */
  readonly parts?: readonly PartSpec[];
  /** Fixed support-bone ids, or the generated voxels' actual ground contacts. */
  readonly supportBones: SupportBones;
  /** The shared-rig attack clip this template's content selects (mob/attack.ts, ATTACK_CLIPS owns the
   * ids). Required for a template that attacks through the shared rig; resolving it refuses an absent
   * or unknown selection rather than falling back. */
  readonly attackClip?: string;
  /** Shared-rig hit reaction, resolved by mob/reactions.ts, flinchClipFor. */
  readonly flinchClip?: string;
  /** Readiness for consumers; see `TemplateStatus`. Omitted means ready. */
  readonly status?: TemplateStatus;
}

export interface Wound {
  readonly bone: string;
  /** 0..1 along the bone, head to tail. */
  readonly t: number;
  /** Degrees, around the bone. */
  readonly angle: number;
  readonly radius: number;
}

/** Plain JSON: the sole source of truth for one generated actor. */
export interface Genome {
  readonly template: string;
  readonly seed: number;
  readonly voxelSize: number;
  readonly params: Readonly<Record<string, number>>;
  readonly wounds: readonly Wound[];
}

// Templates register themselves here (mob/templates.ts, on import) so that
// build(genome) and realize(genome) can dispatch on genome.template alone,
// as plain JSON with no body-plan tag of its own.
const registry = new Map<string, Template>();

export const registerTemplate = (t: Template): void => {
  registry.set(t.name, t);
};

export const templateByName = (name: string): Template => {
  const t = registry.get(name);
  if (!t) {
    throw new Error(`unknown template "${name}" (has it been imported and registered?)`);
  }
  return t;
};

/** A template's readiness; an omitted status is ready. */
const templateStatus = (t: Template): TemplateStatus => t.status ?? 'ready';

/** Resolves a registered template for a path that hands a model to a consumer (the Deadvox spawn and
 * amalgam boundaries, and the `generate` export CLI), refusing a comparison-only one so a model kept
 * only for side-by-side checks cannot reach a player. */
export const consumableTemplate = (name: string): Template => {
  const t = templateByName(name);
  const status = templateStatus(t);
  if (status !== 'ready') {
    throw new Error(`template "${name}" is ${status} and must not be spawned or exported`);
  }
  return t;
};
