// @ts-check
// Builds the complete produced tree, the roster and recipe exports with their manifest (build.mjs), every mob
// (mobs.mjs) and every sound (sounds.mjs), into one output folder. The determinism check and CI build through this one entry so both hold the
// same tree to the manifest.
// Usage: node tools/build-all.mjs [--out dir] [--cache dir | --no-cache]: built/ by default, from the builders' default
// cache unless --cache names another; with --no-cache every model is generated.
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { CACHE_OPTIONS, cacheFolder } from './generation.mjs';

const here = import.meta.dirname;
const repo = resolve(here, '..');

// `cache` is the folder both builders reuse unchanged models from, or undefined to generate every model.
/**
 * @param {string} out
 * @param {{ cache: string | undefined }} options
 */
export function buildAll(out, { cache }) {
  const options = cache === undefined ? ['--no-cache'] : ['--cache', resolve(cache)];
  // Sounds bake in seconds, so they have no cache to choose.
  for (const [builder, args] of /** @type {const} */ ([
    ['build.mjs', options],
    ['mobs.mjs', options],
    ['sounds.mjs', []],
  ])) {
    execFileSync(process.execPath, [join(here, builder), '--out', resolve(out), ...args], {
      cwd: repo,
      stdio: 'inherit',
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({
    options: { out: { type: 'string', default: join(repo, 'built') }, ...CACHE_OPTIONS },
  });
  buildAll(values.out, { cache: cacheFolder(values) });
}
