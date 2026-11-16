// A mob row's mobgen template, shared by the bake (tools/mobs.mjs) and by every reader of the bones a row builds
// (tools/severedParts.mjs), so the bones a manifest lists are the bones the bake cuts.
import { installJsonnetSources } from './sources.mjs';

await installJsonnetSources();
const src = (path) => `./packages/mobgen/src/${path}`;
const { consumableTemplate, registerTemplate } = await import(src('core/template.ts'));
await import(src('mob/templates.ts'));
await import(src('mob/acidTemplate.ts'));
await import(src('mob/fusedMassTemplate.ts'));
await import(src('mob/quadrupedTemplate.ts'));
await import(src('mob/insectTemplate.ts'));
await import(src('mob/floaterTemplate.ts'));
await import(src('mob/dragonTemplate.ts'));
await import(src('mob/skeletonTemplate.ts'));
await import(src('mob/leaper/plan.ts'));
await import(src('mob/walker/plan.ts'));

const hex = (colour) => (typeof colour === 'string' ? [1, 3, 5].map((index) => parseInt(colour.slice(index, index + 2), 16) / 255) : colour);

// The row's template with its narrowed parameters, palette, parts and validity budgets, registered per row.
export function templateFor(row) {
  const base = consumableTemplate(row.template);
  const materials = { ...base.materials };
  for (const [name, material] of Object.entries(row.materials ?? {})) materials[name] = { emissive: 0, ...material, color: hex(material.color) };
  const materialHsl = Object.fromEntries(Object.entries(base.materialHsl ?? {}).filter(([name]) => !(name in (row.materials ?? {}))));
  const own = { ...base.budgets, ...row.budgets };
  const room = row.budget_headroom ?? 1;
  const widen = (range) => ({ ...range, max: Math.ceil(range.max * room) });
  const budgets = { ...own, totalVoxels: widen(own.totalVoxels), groups: Object.fromEntries(Object.entries(own.groups).map(([name, range]) => [name, widen(range)])) };
  const derived = { ...base, budgets, name: `mob:${row.id}`, attackClip: row.attack_clip ?? base.attackClip, materials, materialHsl, params: { ...base.params, ...row.params }, budgetParams: base.budgetParams ?? base.params, parts: row.parts ?? [] };
  registerTemplate(derived);
  return derived;
}
