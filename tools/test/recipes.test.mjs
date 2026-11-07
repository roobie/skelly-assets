import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { readRecipes } from '../recipes.mjs';
import { outputPath } from '../layout.mjs';

test('recipe discovery uses source files and keeps pack ownership', () => {
  const root = mkdtempSync(join(tmpdir(), 'recipes-'));
  try {
    const directory = join(root, 'models/recipes');
    mkdirSync(directory, { recursive: true });
    for (const pack of ['fixture.z', 'fixture.a']) {
      writeFileSync(join(directory, `${pack}.jsonnet`), '[]');
      writeFileSync(join(directory, `${pack}.json`), JSON.stringify([{ id: pack }]));
    }
    writeFileSync(join(directory, 'stale.json'), '[]');
    assert.deepEqual(readRecipes(root), ['fixture.a', 'fixture.z'].map(packId => ({ packId, value: [{ id: packId }] })));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('logical output paths remain within one pack', () => {
  assert.equal(outputPath('fixture.pack', 'assets/models/fixture.glb'), 'fixture.pack/assets/models/fixture.glb');
  for (const pack of ['../foreign', '', '/absolute']) assert.throws(() => outputPath(pack, 'things/index.json'));
  for (const file of ['../foreign', '/absolute', 'things/../../foreign', 'things\\foreign']) assert.throws(() => outputPath('fixture.pack', file));
});
