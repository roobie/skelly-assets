// @ts-check
// A mob row's mobgen template, shared by the bake (tools/mobs.mjs) and by every reader of the bones a row builds
// (tools/severedParts.mjs), so the bones a manifest lists are the bones the bake cuts.
/** @import { MobRow } from './layout.mjs' */
/** @import { MaterialDef } from './packages/mobgen/src/core/body.ts' */
/** @import { Template } from './packages/mobgen/src/core/template.ts' */
import { installJsonnetSources } from './sources.mjs';

await installJsonnetSources();
// Literal specifiers, so static analysis such as knip sees which templates a mob row can name.
const { consumableTemplate, registerTemplate } = await import('./packages/mobgen/src/core/template.ts');
await import('./packages/mobgen/src/mob/templates.ts');
await import('./packages/mobgen/src/mob/acidTemplate.ts');
await import('./packages/mobgen/src/mob/fusedMassTemplate.ts');
await import('./packages/mobgen/src/mob/quadrupedTemplate.ts');
await import('./packages/mobgen/src/mob/critterTemplate.ts');
await import('./packages/mobgen/src/mob/insectTemplate.ts');
await import('./packages/mobgen/src/mob/floaterTemplate.ts');
await import('./packages/mobgen/src/mob/dragonTemplate.ts');
await import('./packages/mobgen/src/mob/skeletonTemplate.ts');
await import('./packages/mobgen/src/mob/leaper/plan.ts');
await import('./packages/mobgen/src/mob/walker/plan.ts');

/**
 * @param {string} colour
 * @param {number} index
 */
const channel = (colour, index) => parseInt(colour.slice(index, index + 2), 16) / 255;
/**
 * @param {string | MaterialDef['color']} colour
 * @returns {MaterialDef['color']}
 */
const hex = (colour) =>
  typeof colour === 'string' ? [channel(colour, 1), channel(colour, 3), channel(colour, 5)] : colour;

// The row's template with its narrowed parameters, palette, parts and validity budgets, registered per row.
/**
 * @param {MobRow} row
 * @returns {Template}
 */
export function templateFor(row) {
  const base = consumableTemplate(row.template);
  /** @type {Record<string, MaterialDef>} */
  const materials = { ...base.materials };
  for (const [name, material] of Object.entries(row.materials ?? {}))
    materials[name] = { emissive: 0, ...material, color: hex(material.color) };
  const materialHsl = Object.fromEntries(
    Object.entries(base.materialHsl ?? {}).filter(([name]) => !(name in (row.materials ?? {}))),
  );
  const own = { ...base.budgets, ...row.budgets };
  const room = row.budget_headroom ?? 1;
  /**
   * @template {Template['budgets']['totalVoxels']} Range
   * @param {Range} range
   * @returns {Range}
   */
  const widen = (range) => ({ ...range, max: Math.ceil(range.max * room) });
  const budgets = {
    ...own,
    totalVoxels: widen(own.totalVoxels),
    groups: Object.fromEntries(Object.entries(own.groups).map(([name, range]) => [name, widen(range)])),
  };
  const attackClip = row.attack_clip ?? base.attackClip;
  const derived = {
    ...base,
    budgets,
    name: `mob:${row.id}`,
    ...(attackClip === undefined ? {} : { attackClip }),
    materials,
    materialHsl,
    params: { ...base.params, ...row.params },
    budgetParams: base.budgetParams ?? base.params,
    parts: row.parts ?? [],
  };
  registerTemplate(derived);
  return derived;
}
