import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { treeMismatches } from '../check-built.mjs';

const writeTree = (root, files) => {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
};

test('a further fresh tree must equal the first: a missing, an extra and a changed file are each reported', () => {
  const root = mkdtempSync(join(tmpdir(), 'check-built-'));
  try {
    const first = join(root, 'first');
    const other = join(root, 'other');
    writeTree(first, { 'manifest.json': '{}', 'fixture.a/kept.glb': 'same', 'fixture.a/lost.glb': 'x', 'fixture.b/drift.glb': 'abc' });
    writeTree(other, { 'manifest.json': '{}', 'fixture.a/kept.glb': 'same', 'fixture.b/drift.glb': 'abd', 'fixture.b/extra.glb': 'y' });
    assert.deepEqual(treeMismatches(first, first), []);
    const mismatches = treeMismatches(first, other);
    assert.equal(mismatches.length, 3, mismatches.join('\n'));
    for (const file of ['fixture.a/lost.glb', 'fixture.b/extra.glb', 'fixture.b/drift.glb']) {
      assert.ok(mismatches.some((line) => line.endsWith(`: ${file}`)), `${file} is not reported:\n${mismatches.join('\n')}`);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
