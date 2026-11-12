// Holds every model's taxonomy to the vocabulary (tools/taxonomy.mjs, taxonomyReport) and lists the models without a
// category, for authors and tagging agents. tools/build.mjs runs the same report before it builds anything.
// Usage: node tools/check-taxonomy.mjs [--json] [--pack <packId> ...]. It exits 1 when any problem remains in the
// selected packs; untagged models in packs the vocabulary lists as untagged, and keywords the vocabulary does not list
// yet, are reported, not failed.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { readMobRows, readRoster } from './layout.mjs';
import { readRecipes } from './recipes.mjs';
import { installJsonnetSources } from './sources.mjs';
import { readVocabulary, taxonomyReport } from './taxonomy.mjs';

const repo = resolve(import.meta.dirname, '..');
// The roster's rows: TAT's catalogue rows the roster selects, compiled by installJsonnetSources.
export const ROSTER_ROWS = 'tools/packages/thing-authoring-tool/exports/deadvox.json';

// Every model the production build writes, from its source row: { pack, id, taxonomy }. A recipe or roster row carries
// its taxonomy already resolved by Jsonnet; a mob row's is resolved over the sheet's defaults (layout.mjs, readMobRows).
export async function modelTaxonomies(root = repo) {
  await installJsonnetSources();
  const rosterRows = new Map(JSON.parse(readFileSync(join(root, ROSTER_ROWS), 'utf8')).map((row) => [row.id, row]));
  return [
    ...readRoster(root).map(({ packId, id }) => ({ pack: packId, id, taxonomy: rosterRows.get(id)?.taxonomy })),
    ...readRecipes(root).flatMap(({ packId, value }) => value.map((row) => ({ pack: packId, id: row.id, taxonomy: row.taxonomy }))),
    ...readMobRows(root).map(({ pack, id, taxonomy }) => ({ pack, id, taxonomy })),
  ];
}

const inPacks = (packs) => (entry) => packs.length === 0 || packs.includes(entry.pack);

function printReport({ untagged, unlisted, problems }) {
  const byPack = Map.groupBy(untagged, ({ pack }) => pack);
  console.log(`untagged: ${untagged.length} model(s) in ${byPack.size} pack(s)`);
  for (const [pack, models] of byPack) console.log(`  ${pack} (${models.length}): ${models.map(({ id }) => id).join(' ')}`);
  console.log(`unlisted keywords: ${unlisted.length}`);
  for (const { message } of unlisted) console.log(`  ${message}`);
  console.log(`problems: ${problems.length}`);
  for (const { message } of problems) console.log(`  ${message}`);
}

async function main() {
  const { values } = parseArgs({ options: { json: { type: 'boolean', default: false }, pack: { type: 'string', multiple: true, default: [] } } });
  const report = taxonomyReport(await modelTaxonomies(repo), readVocabulary(repo));
  const selected = Object.fromEntries(Object.entries(report).map(([key, entries]) => [key, entries.filter(inPacks(values.pack))]));
  if (values.json) console.log(JSON.stringify(selected, null, 2));
  else printReport(selected);
  return selected.problems.length > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = await main();
