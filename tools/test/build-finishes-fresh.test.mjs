import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

// A fresh process, so no module the test runner already loaded hides a read. It reports every module loaded as the
// build's own module graph is imported, which is all that happens before tools/build.mjs, main, refreshes the twins.
const importedModules = `
  import { registerHooks } from 'node:module';
  const loaded = [];
  registerHooks({ load: (url, context, next) => { loaded.push(url); return next(url, context); } });
  await import(${JSON.stringify(new URL('../build.mjs', import.meta.url).href)});
  console.log(JSON.stringify(loaded));
`;

// models/finishes.json is the compiled twin of models/finishes.jsonnet. A module that reads it while the build's
// modules are imported holds the colours of the previous build, so the manifest's finishes lag one build behind.
test('the build reads no compiled finishes until its Jsonnet twins are regenerated', () => {
  const loaded = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', importedModules], { encoding: 'utf8' }));
  assert.ok(loaded.some((url) => url.endsWith('/tools/build.mjs')), 'the build module did not load');
  assert.deepEqual(loaded.filter((url) => url.endsWith('/models/finishes.json')), []);
});
