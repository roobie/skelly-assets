// Usage: node tools/mobs.mjs [--out dir] [--cache dir | --no-cache] [mobId ...], or node tools/mobs.mjs --shard i/n
// [--cache dir] to only fill the cache with one shard of the mob rows. With no ids it builds every models/mobs.json row.
// Every row is baked as an actor pose: GLB, body, clips and genome files live at their logical paths under the row's pack. A
// type's severed-part source row also bakes its parts (tools/severedParts.mjs). The cache is tools/generation.mjs, DEFAULT_CACHE, unless --cache names another; mob entries are in its mob folder.
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { outputPath, readMobRows } from './layout.mjs';
import { cacheFolder, CACHE_OPTIONS, parseShard, shardUnits } from './generation.mjs';
import { readSeveredParts } from './severedParts.mjs';

const here = import.meta.dirname;
const repo = resolve(here, '..');
const { templateFor } = await import('./mobTemplates.mjs');
const { codeFingerprint, entryStore, pruneEntries } = await import('./packages/thing-export/src/cache.ts');
const { generate, generateValid, realize, realizeLod } = await import('./packages/mobgen/src/core/generate.ts');
const { bakeActor } = await import('./actorBake.mjs');
const { bakeSeveredParts } = await import('./severedPartBake.mjs');

// The row's files by role; a row that is its type's severed-part source (tools/severedParts.mjs) also bakes the parts.
const bakeMob = (row, severed) => {
  const template = templateFor(row);
  const found = generateValid(template, row.seed, { maxAttempts: 1 });
  if (!found) {
    const issues = realize(generate(template, row.seed)).report.issues;
    throw new Error(`seed ${row.seed} does not make a valid ${row.template}: ${issues.map((issue) => JSON.stringify(issue)).join('; ')}`);
  }
  // A coarser row bakes the genome it realized, so its recorded genome names the voxel size its figure was built at.
  const { genome, realized } = row.lod_divisor > 0 ? realizeLod(found, 0.5 / row.lod_divisor) : found;
  const actor = bakeActor(row, template, { ...found, genome, realized });
  if (severed === undefined) return actor;
  const { map, ...parts } = bakeSeveredParts(severed, template, realized);
  return { ...actor, severed: map, ...Object.fromEntries(Object.entries(parts).map(([id, glb]) => [partRole(id), glb])) };
};

// A mob's files are fixed by its resolved row and the code that bakes it: mobgen with the data it imports, and the
// actor modules here. Every module of this folder counts, since naming them one by one would miss a new one, and an
// edit to another costs only a rebake of the mobs.
const MOB_FILES = ['body', 'clips', 'genome', 'glb'];
const partRole = (id) => `severed.${id}`;
// Each role with the path its file is written to.
const mobFiles = (row, severed) => [
  ...MOB_FILES.map((role) => [role, outputPath(row.pack, row[role])]),
  ...(severed === undefined ? [] : [
    ['severed', outputPath(severed.pack, severed.map)],
    ...severed.parts.map((part) => [partRole(part.id), outputPath(severed.pack, part.path)]),
  ]),
];
const mobInputs = (row, severed) => ({ row, severed: severed && { pack: severed.pack, map: severed.map, parts: severed.parts.map(({ bone, id, path }) => ({ bone, id, path })) } });
export const mobStore = (cache) => {
  const tools = readdirSync(here).filter((name) => name.endsWith('.mjs'));
  return entryStore(join(cache, 'mob'), codeFingerprint(here, ['package-lock.json', 'packages/mobgen/src', ...tools], ['packages/mobgen/src', '../models/mobs']));
};

const storedMob = (store, row, severed) => store.entry(mobFiles(row, severed).map(([role]) => role), mobInputs(row, severed), () => bakeMob(row, severed));

// Bakes the row, or takes its files from the store, and writes each where its row field, or its severed-part plan,
// places it; returns the store entry when there is one.
export function exportMob(row, out, store, severed) {
  const { files, ...entry } = store ? storedMob(store, row, severed) : { files: bakeMob(row, severed) };
  for (const [role, file] of mobFiles(row, severed)) {
    const path = join(out, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, files[role]);
  }
  return store ? entry : undefined;
}

const reportCache = (reused, total) => console.log(`mob cache: ${reused} mob(s) reused, ${total - reused} baked`);

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: 'string', default: join(repo, 'built') }, ...CACHE_OPTIONS, shard: { type: 'string' } },
  });
  const rows = readMobRows(repo);
  const plans = new Map((await readSeveredParts(repo)).map((plan) => [plan.source.id, plan]));
  const cache = cacheFolder(values);
  const store = cache && mobStore(cache);
  if (values.shard !== undefined) {
    if (store === undefined || positionals.length > 0) throw new Error('--shard fills a cache and takes no ids');
    const shard = shardUnits(rows, parseShard(values.shard));
    reportCache(shard.filter((row) => storedMob(store, row, plans.get(row.id)).reused).length, shard.length);
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
      const entry = exportMob(rows.find((row) => row.id === id), out, store, plans.get(id));
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

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = await main();
