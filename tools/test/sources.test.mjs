import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';

import { compilerCode, jsonnetFiles, refreshJsonnetTwins } from '../sources.mjs';

const root = resolve(import.meta.dirname, '../..');
const tracked = execFileSync('git', ['-C', root, 'ls-files', '-z', '*.json'], { encoding: 'utf8' })
  .split('\0').filter(Boolean);

const sources = jsonnetFiles();

test('package discovery finds Jsonnet sources', () => {
  assert.ok(sources.length > 0, `No Jsonnet sources discovered under ${join(root, 'tools/packages')}`);
});

for (const source of sources) {
  const twin = relative(root, source.replace(/\.jsonnet$/, '.json'));
  test(`${twin} is ignored and untracked`, () => {
    const ignored = spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '--quiet', '--', twin]);
    assert.equal(ignored.status, 0, `${twin} must be ignored: ${ignored.stderr}`);
    assert.ok(!tracked.includes(twin), `${twin} must not be tracked`);
  });
}

test('no tracked JSON has a Jsonnet twin', () => {
  assert.deepEqual(tracked.filter((path) => existsSync(join(root, path.replace(/\.json$/, '.jsonnet')))), []);
});

// A miniature repository: two twins over libraries, one over a row index, and the empty compile root the compiler runs
// in. The store sits under the root, as the default store does, and never enters a closure.
const withTwinFixture = async (check) => {
  const root = mkdtempSync(join(tmpdir(), 'sources-'));
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  try {
    mkdirSync(join(root, 'tools'));
    write('lib/value.libsonnet', '{ value: 1 }');
    write('lib/other.libsonnet', '{ other: 1 }');
    write('rows/a.libsonnet', "[{ id: 'a', value: 1 }]");
    write('rows/b.libsonnet', "[{ id: 'b' }]");
    write('rows/index.libsonnet', "{ a: import 'rows/a.libsonnet', b: import 'rows/b.libsonnet' }");
    write('source.jsonnet', "import 'lib/value.libsonnet'");
    write('other.jsonnet', "import 'lib/other.libsonnet'");
    write('pkg/nested.jsonnet', "import 'lib/value.libsonnet'");
    write('catalogue.jsonnet', "std.flattenArrays(std.objectValues(import 'rows/index.libsonnet'))");
    const sources = ['source', 'other', 'pkg/nested', 'catalogue'].map((name) => join(root, `${name}.jsonnet`));
    const store = join(root, '.build', 'store');
    const stamp = join(root, '.build', 'stamp');
    const refresh = (code = []) => refreshJsonnetTwins(sources, { root, stamp, store, code, rowIndexes: [join(root, 'rows/index.libsonnet')] });
    const twin = (name) => readFileSync(join(root, `${name}.json`), 'utf8');
    const value = (name) => JSON.parse(twin(name));
    const keep = (name) => writeFileSync(join(root, `${name}.json`), 'kept');
    // The stored entry, of `kind` rows or twins, whose value `matches`.
    const entry = (kind, matches) => readdirSync(join(store, kind)).map((name) => join(store, kind, name))
      .find((path) => matches(JSON.parse(readFileSync(path, 'utf8'))));
    await check({ root, write, sources, store, stamp, refresh, twin, value, keep, entry });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const fixtureTest = (name, check) => test(name, () => withTwinFixture(async (fixture) => {
  await fixture.refresh();
  await check(fixture);
}));

fixtureTest('unchanged inputs reuse the existing twins without recompiling', async ({ refresh, twin, keep }) => {
  keep('source');
  await refresh();
  assert.equal(twin('source'), 'kept');
});

fixtureTest('an edited library recompiles the twins that import it and no other', async ({ write, refresh, value, twin, keep }) => {
  keep('other');
  write('lib/value.libsonnet', '{ value: 2 }');
  await refresh();
  assert.deepEqual(value('source'), { value: 2 });
  assert.deepEqual(value('pkg/nested'), { value: 2 });
  assert.equal(twin('other'), 'kept');
});

fixtureTest('an edited row file recompiles its own fragment, which the twin reads', async ({ write, refresh, value, entry }) => {
  writeFileSync(entry('rows', ([row]) => row.id === 'b'), JSON.stringify([{ id: 'b', kept: true }]));
  write('rows/a.libsonnet', "[{ id: 'a', value: 2 }]");
  await refresh();
  assert.deepEqual(value('catalogue'), [{ id: 'a', value: 2 }, { id: 'b', kept: true }]);
});

fixtureTest('a new file that shadows an import recompiles its importer', async ({ write, refresh, value }) => {
  write('pkg/lib/value.libsonnet', '{ value: 3 }');
  await refresh();
  assert.deepEqual(value('pkg/nested'), { value: 3 });
});

fixtureTest('a fresh checkout takes the stored twins of the same inputs', async ({ root, stamp, refresh, twin, entry }) => {
  writeFileSync(entry('twins', (twin) => twin.value === 1), '"stored"');
  rmSync(join(root, 'source.json'));
  rmSync(stamp);
  await refresh();
  assert.equal(twin('source'), '"stored"');
});

fixtureTest('a store left by other inputs yields their twins never and keeps none of them', async ({ root, write, stamp, refresh, value, entry }) => {
  const old = entry('twins', (twin) => twin.value === 1);
  write('lib/value.libsonnet', '{ value: 2 }');
  rmSync(join(root, 'source.json'));
  rmSync(stamp);
  await refresh();
  assert.deepEqual(value('source'), { value: 2 });
  assert.ok(!existsSync(old), 'the stale entry is pruned');
});

fixtureTest('a changed compiler file recompiles the twins', async ({ root, refresh, value, keep }) => {
  const compiler = join(root, 'compile.mjs');
  writeFileSync(compiler, '// one compiler');
  await refresh([compiler]);
  keep('source');
  writeFileSync(compiler, '// another compiler');
  await refresh([compiler]);
  assert.deepEqual(value('source'), { value: 1 });
});

fixtureTest('an import of a text block fails rather than going untraced', async ({ write, refresh }) => {
  write('source.jsonnet', "import |||\n  lib/value.libsonnet\n|||");
  await assert.rejects(refresh(), /text block/);
});

test('the twin digest covers this module and the compiler driver', () => {
  const code = compilerCode().map((path) => relative(root, path));
  for (const driver of ['tools/sources.mjs', 'tools/jsonnet/index.mjs']) assert.ok(code.includes(driver), driver);
});
