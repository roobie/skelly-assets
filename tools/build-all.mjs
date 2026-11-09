// Builds the complete produced tree, the roster and recipe exports with their manifest (build.mjs) and every mob
// (mobs.mjs), into one output folder. The determinism check and CI build through this one entry so both hold the
// same tree to the manifest.
// Usage: node tools/build-all.mjs [--out dir] [--cache dir]: built/ by default, and with no cache every model is generated.
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const here = import.meta.dirname;
const repo = resolve(here, '..');

export function buildAll(out, { cache } = {}) {
  const run = (builder, ...options) =>
    execFileSync(process.execPath, [join(here, builder), '--out', resolve(out), ...options], { cwd: repo, stdio: 'inherit' });
  run('build.mjs', ...(cache ? ['--cache', resolve(cache)] : []));
  // Mobs are few and quick to bake, so they are not cached.
  run('mobs.mjs');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: { out: { type: 'string', default: join(repo, 'built') }, cache: { type: 'string' } } });
  buildAll(values.out, { cache: values.cache });
}
