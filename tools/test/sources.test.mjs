import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { test } from 'node:test';

import { jsonnetFiles, refreshJsonnetTwins } from '../sources.mjs';

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

const withTwinFixture = (check) => {
  const root = mkdtempSync(join(tmpdir(), 'sources-'));
  try {
    mkdirSync(join(root, 'lib'));
    writeFileSync(join(root, 'lib', 'value.libsonnet'), '{ value: 1 }');
    writeFileSync(join(root, 'source.jsonnet'), "import 'lib/value.libsonnet'");
    const source = join(root, 'source.jsonnet');
    const refresh = () => refreshJsonnetTwins([source], { root, stamp: join(root, '.build', 'stamp') });
    const twin = () => readFileSync(join(root, 'source.json'), 'utf8');
    refresh();
    check({ root, refresh, twin });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test('unchanged inputs reuse the existing twins without recompiling', () => {
  withTwinFixture(({ root, refresh, twin }) => {
    writeFileSync(join(root, 'source.json'), 'kept');
    refresh();
    assert.equal(twin(), 'kept');
  });
});

test('a changed imported library recompiles the twin', () => {
  withTwinFixture(({ root, refresh, twin }) => {
    writeFileSync(join(root, 'lib', 'value.libsonnet'), '{ value: 2 }');
    refresh();
    assert.deepEqual(JSON.parse(twin()), { value: 2 });
  });
});

// The store lives outside the inputs' root, as CI's does, so storing never changes the digest.
const withStore = (check) => withTwinFixture((fixture) => {
  const store = mkdtempSync(join(tmpdir(), 'sources-store-'));
  try {
    check({ ...fixture, store });
  } finally {
    rmSync(store, { recursive: true, force: true });
  }
});

test('a fresh checkout takes the twins of a stored compile of the same inputs', () => {
  withStore(({ root, twin, store }) => {
    const refresh = (stamp) => refreshJsonnetTwins([join(root, 'source.jsonnet')], { root, stamp: join(root, stamp), store });
    refresh('compiled');
    const [digest] = readdirSync(store);
    writeFileSync(join(store, digest, 'source.json'), 'stored');
    rmSync(join(root, 'source.json'));
    refresh('fresh');
    assert.equal(twin(), 'stored');
  });
});

test('a store holding the twins of other inputs is not used', () => {
  withStore(({ root, twin, store }) => {
    const refresh = () => refreshJsonnetTwins([join(root, 'source.jsonnet')], { root, stamp: join(root, 'stamp'), store });
    refresh();
    writeFileSync(join(root, 'lib', 'value.libsonnet'), '{ value: 2 }');
    refresh();
    assert.deepEqual(JSON.parse(twin()), { value: 2 });
  });
});
