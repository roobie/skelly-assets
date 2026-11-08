// Usage: node tools/mobs.mjs [--out dir] [mobId ...]. With no ids it builds every models/mobs.json row.
// Every row is baked as an actor pose: GLB, body and clips files live at their logical paths under the row's pack.
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { readMobRows } from './layout.mjs';
import { installJsonnetSources } from './sources.mjs';

const here = import.meta.dirname;
const repo = resolve(here, '..');
installJsonnetSources();
const src = (path) => `./packages/mobgen/src/${path}`;
const { generate, generateValid, realize } = await import(src('core/generate.ts'));
const { bakeActor } = await import('./actorBake.mjs');
const { consumableTemplate, registerTemplate } = await import(src('core/template.ts'));
await import(src('mob/templates.ts'));
await import(src('mob/acidTemplate.ts'));
await import(src('mob/fusedMassTemplate.ts'));
await import(src('mob/quadrupedTemplate.ts'));
await import(src('mob/insectTemplate.ts'));
await import(src('mob/floaterTemplate.ts'));
await import(src('mob/dragonTemplate.ts'));
await import(src('mob/skeletonTemplate.ts'));

const hex = (colour) => (typeof colour === 'string' ? [1, 3, 5].map((index) => parseInt(colour.slice(index, index + 2), 16) / 255) : colour);

// The row's template with its narrowed parameters, palette, parts and validity budgets, registered per row.
function deriveTemplate(base, row) {
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

export function exportMob(row, out) {
  const template = deriveTemplate(consumableTemplate(row.template), row);
  const found = generateValid(template, row.seed, { maxAttempts: 1 });
  if (!found) {
    const issues = realize(generate(template, row.seed)).report.issues;
    throw new Error(`seed ${row.seed} does not make a valid ${row.template}: ${issues.map((issue) => JSON.stringify(issue)).join('; ')}`);
  }
  return bakeActor(row, template, found, out);
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: 'string', default: join(repo, 'built') } },
  });
  const rows = readMobRows(repo);
  const wanted = positionals.length > 0 ? positionals : rows.map((row) => row.id);
  const unknown = wanted.filter((id) => !rows.some((row) => row.id === id));
  if (unknown.length > 0) {
    console.log(`not in models/mobs.json: ${unknown.join(' ')}`);
    return 1;
  }
  const out = resolve(values.out);
  mkdirSync(out, { recursive: true });
  let failed = false;
  for (const id of wanted) {
    try {
      exportMob(rows.find((row) => row.id === id), out);
    } catch (error) {
      console.log(`EXPORT FAILED ${id}: ${error.message}`);
      failed = true;
    }
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = main();
