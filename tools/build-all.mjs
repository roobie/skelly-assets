// Builds the complete produced tree, the roster and recipe exports with their manifest (build.mjs) and every mob
// (mobs.mjs), into one output folder. The determinism check and CI build through this one entry so both hold the
// same tree to the manifest.
// Usage: node tools/build-all.mjs [--out dir] (by default built/).
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const here = import.meta.dirname;
const repo = resolve(here, '..');
const BUILDERS = ['build.mjs', 'mobs.mjs'];

export function buildAll(out) {
  for (const builder of BUILDERS) {
    execFileSync(process.execPath, [join(here, builder), '--out', resolve(out)], { cwd: repo, stdio: 'inherit' });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: { out: { type: 'string', default: join(repo, 'built') } } });
  buildAll(values.out);
}
