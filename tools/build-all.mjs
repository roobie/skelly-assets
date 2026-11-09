// Builds the complete produced tree, the roster and recipe exports with their manifest (build.mjs) and every mob
// (mobs.mjs), into one output folder. The determinism check and CI build through this one entry so both hold the
// same tree to the manifest.
// Usage: node tools/build-all.mjs [--out dir] [--cache dir | --no-cache]: built/ by default, from the builders' default
// cache unless --cache names another; with --no-cache every model is generated.
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { cacheFolder, CACHE_OPTIONS } from './generation.mjs';

const here = import.meta.dirname;
const repo = resolve(here, '..');

// `cache` is the folder both builders reuse unchanged models from, or undefined to generate every model.
export function buildAll(out, { cache }) {
  const options = cache === undefined ? ['--no-cache'] : ['--cache', resolve(cache)];
  for (const builder of ['build.mjs', 'mobs.mjs']) {
    execFileSync(process.execPath, [join(here, builder), '--out', resolve(out), ...options], { cwd: repo, stdio: 'inherit' });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: { out: { type: 'string', default: join(repo, 'built') }, ...CACHE_OPTIONS } });
  buildAll(values.out, { cache: cacheFolder(values) });
}
