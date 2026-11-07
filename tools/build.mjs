// Builds the repo's models from their sources in models/ into GLB files.
// Usage: node tools/build.mjs [--out dir] [rowId ...]
// With no row ids it builds every id of the roster, models/export.json; with ids it builds those rows, any row in
// the sources. A roster id is written into --out (by default built/, where games load them) at its pack's path,
// tools/layout.mjs, rosterFile; an id outside the roster is written flat, for comparison builds into a scratch
// folder. Needs node (26 or later, which runs the TypeScript directly) and `npm ci` in tools.
// Adapted from skelly's tools/model-look.mjs (see README.md beside this file).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { readRoster } from './layout.mjs';
import { installJsonnetSources } from './sources.mjs';

const here = import.meta.dirname;
const repo = resolve(here, '..');
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: 'string', default: join(repo, 'built') } },
});
const roster = new Map(readRoster().map((row) => [row.id, row.file]));
const ids = positionals.length > 0 ? positionals : [...roster.keys()];
const out = resolve(values.out);
mkdirSync(out, { recursive: true });

installJsonnetSources();

let failed = false;
try {
  const { loadThingRecipe } = await import('./packages/thing-authoring-tool/src/exports.ts');
  const recipe = loadThingRecipe(JSON.parse(readFileSync(join(here, 'packages/thing-authoring-tool/exports/deadvox.json'), 'utf8')));
  const missing = ids.filter((id) => !recipe.some((row) => row.id === id));
  if (missing.length > 0) {
    console.log(`not in the model sources: ${missing.join(' ')}`);
    failed = true;
  }
  for (const { id, generate } of recipe.filter((row) => ids.includes(row.id))) {
    try {
      const file = roster.get(id) ?? `${id}.glb`;
      mkdirSync(dirname(join(out, file)), { recursive: true });
      writeFileSync(join(out, file), generate().glb);
      console.log(`built ${file}`);
    } catch (error) {
      console.log(`EXPORT FAILED ${id}: ${error.message}`);
      failed = true;
    }
  }
} catch (error) {
  // A row error arrives as a long issue dump; one line per issue with its path is what an author needs.
  if (!error.issues) {
    throw error;
  }
  for (const issue of error.issues) {
    console.log(`ROW ERROR ${(issue.path ?? []).map((p) => p.key).join('.')}: ${issue.message} (${JSON.stringify(issue.input)})`);
  }
  failed = true;
}
process.exit(failed ? 1 : 0);
