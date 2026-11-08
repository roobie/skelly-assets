import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { packRelease } from '../pack-release.mjs';

test('release archives depend only on the tree\'s names and bytes, not its file times or modes', () => {
  const root = mkdtempSync(join(tmpdir(), 'pack-release-'));
  try {
    const tree = join(root, 'tree');
    mkdirSync(join(tree, 'fixture.a/assets'), { recursive: true });
    writeFileSync(join(tree, 'fixture.a/assets/one.glb'), 'one');
    writeFileSync(join(tree, 'fixture.a/two.json'), '{}');
    writeFileSync(join(tree, 'manifest.json'), '{}');
    const [first] = packRelease(tree, join(root, 'first'));
    utimesSync(join(tree, 'fixture.a/assets/one.glb'), 1, 1);
    chmodSync(join(tree, 'fixture.a/two.json'), 0o600);
    packRelease(tree, join(root, 'second'));
    const archive = (out) => readFileSync(join(root, out, `${first}.tar.gz`));
    assert.ok(archive('first').equals(archive('second')));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a flat file other than the manifest is refused, not left out of the release', () => {
  const root = mkdtempSync(join(tmpdir(), 'pack-release-'));
  try {
    writeFileSync(join(root, 'manifest.json'), '{}');
    writeFileSync(join(root, 'flat.glb'), 'x');
    assert.throws(() => packRelease(root, join(root, 'out')), /flat\.glb/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
