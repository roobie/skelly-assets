import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
