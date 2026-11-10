// Usage: node tools/mobs.mjs [--out dir] [--cache dir | --no-cache] [mobId ...], or node tools/mobs.mjs --shard i/n
// [--cache dir] to only fill the cache with one shard of the mob rows. With no ids it builds every models/mobs.json row.
// Every row is baked as an actor pose: GLB, body and clips files live at their logical paths under the row's pack. The
// cache is tools/generation.mjs, DEFAULT_CACHE, unless --cache names another; mob entries are in its mob folder.
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { outputPath, readMobRows } from './layout.mjs';
import { cacheFolder, CACHE_OPTIONS, parseShard, shardUnits } from './generation.mjs';
import { installJsonnetSources } from './sources.mjs';

const here = import.meta.dirname;
const repo = resolve(here, '..');
await installJsonnetSources();
const { codeFingerprint, entryStore, pruneEntries } = await import('./packages/thing-export/src/cache.ts');
const src = (path) => `./packages/mobgen/src/${path}`;
const { generate, generateValid, realize, realizeLod } = await import(src('core/generate.ts'));
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
await import(src('mob/leaper/plan.ts'));

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

const bakeMob = (row) => {
  const template = deriveTemplate(consumableTemplate(row.template), row);
  const found = generateValid(template, row.seed, { maxAttempts: 1 });
  if (!found) {
    const issues = realize(generate(template, row.seed)).report.issues;
    throw new Error(`seed ${row.seed} does not make a valid ${row.template}: ${issues.map((issue) => JSON.stringify(issue)).join('; ')}`);
  }
  const realized = row.lod_divisor > 0 ? realizeLod(found, 0.5 / row.lod_divisor).realized : found.realized;
  return bakeActor(row, template, { ...found, realized });
};

// A mob's files are fixed by its resolved row and the code that bakes it: mobgen with the data it imports, and the
// actor modules here. Every module of this folder counts, since naming them one by one would miss a new one, and an
// edit to another costs only a rebake of the mobs.
const MOB_FILES = ['body', 'clips', 'glb'];
export const mobStore = (cache) => {
  const tools = readdirSync(here).filter((name) => name.endsWith('.mjs'));
  return entryStore(join(cache, 'mob'), codeFingerprint(here, ['package-lock.json', 'packages/mobgen/src', ...tools], ['packages/mobgen/src', '../models/mobs']));
};

// Bakes the row, or takes its files from the store, and writes each where its row field places it; returns the store
// entry when there is one.
export function exportMob(row, out, store) {
  const { files, ...entry } = store ? store.entry(MOB_FILES, row, () => bakeMob(row)) : { files: bakeMob(row) };
  for (const role of MOB_FILES) {
    const path = join(out, outputPath(row.pack, row[role]));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, files[role]);
  }
  return store ? entry : undefined;
}

const reportCache = (reused, total) => console.log(`mob cache: ${reused} mob(s) reused, ${total - reused} baked`);

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: 'string', default: join(repo, 'built') }, ...CACHE_OPTIONS, shard: { type: 'string' } },
  });
  const rows = readMobRows(repo);
  const cache = cacheFolder(values);
  const store = cache && mobStore(cache);
  if (values.shard !== undefined) {
    if (store === undefined || positionals.length > 0) throw new Error('--shard fills a cache and takes no ids');
    const shard = shardUnits(rows, parseShard(values.shard));
    reportCache(shard.filter((row) => store.entry(MOB_FILES, row, () => bakeMob(row)).reused).length, shard.length);
    return 0;
  }
  const wanted = positionals.length > 0 ? positionals : rows.map((row) => row.id);
  const unknown = wanted.filter((id) => !rows.some((row) => row.id === id));
  if (unknown.length > 0) {
    console.log(`not in models/mobs.json: ${unknown.join(' ')}`);
    return 1;
  }
  const out = resolve(values.out);
  mkdirSync(out, { recursive: true });
  let failed = false;
  const used = new Set();
  let reused = 0;
  for (const id of wanted) {
    try {
      const entry = exportMob(rows.find((row) => row.id === id), out, store);
      if (entry) used.add(entry.key);
      if (entry?.reused) reused += 1;
    } catch (error) {
      console.log(`EXPORT FAILED ${id}: ${error.message}`);
      failed = true;
    }
  }
  // Only a run over every row may prune, so the store keeps exactly what the next complete build reuses.
  if (store && positionals.length === 0 && !failed) pruneEntries(join(cache, 'mob'), used);
  reportCache(reused, wanted.length);
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = main();
