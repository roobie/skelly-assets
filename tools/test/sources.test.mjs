import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { test } from 'node:test';

import { jsonnetFiles } from '../sources.mjs';

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
