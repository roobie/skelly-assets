import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { BUILD_ROOT } from '../buildDir.mjs';

const generation = pathToFileURL(join(import.meta.dirname, '..', 'generation.mjs')).href;

// The cache folder a builder's command line chooses, read in a fresh process since the default is fixed at import.
const chosenCache = (args, environment) => {
  const env = { ...process.env };
  delete env.SKELLY_EXPORT_CACHE;
  const script = `
    const { parseArgs } = await import('node:util');
    const { CACHE_OPTIONS, cacheFolder } = await import(${JSON.stringify(generation)});
    const { values } = parseArgs({ args: ${JSON.stringify(args)}, options: CACHE_OPTIONS });
    console.log(JSON.stringify(cacheFolder(values) ?? null));
  `;
  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...env, ...environment },
      encoding: 'utf8',
    }),
  );
};

test('the export cache is under the build root unless SKELLY_EXPORT_CACHE names another', () => {
  assert.equal(chosenCache([], {}), join(BUILD_ROOT, 'exports'));
  assert.equal(chosenCache([], { SKELLY_EXPORT_CACHE: '/srv/shared/exports' }), '/srv/shared/exports');
});

test('--cache and --no-cache win over SKELLY_EXPORT_CACHE', () => {
  const environment = { SKELLY_EXPORT_CACHE: '/srv/shared/exports' };
  assert.equal(chosenCache(['--cache', 'mine'], environment), resolve('mine'));
  assert.equal(chosenCache(['--no-cache'], environment), null);
});
