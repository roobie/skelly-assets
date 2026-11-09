import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { installJsonnetSources } from '../sources.mjs';

installJsonnetSources();
const { loadThingRecipe } = await import('../packages/thing-authoring-tool/src/exports.ts');
const { catalogue } = await import('../packages/thing-authoring-tool/src/catalogue.ts');
const { MATERIALS, surfaceOf } = await import('../packages/thing-core/src/materials.ts');
const compiled = JSON.parse(readFileSync(new URL('../packages/thing-core/src/materials.json', import.meta.url)));

const glbJson = (bytes) => {
  const buffer = Buffer.from(bytes);
  return JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
};

// Generation refuses an undefined material (below), so the build itself holds every model's materials; one fixture
// item shows the exporter names each surface's material, without regenerating the catalogue.
const withFixture = (finish, work) => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/unknown-material.json', import.meta.url)));
  const item = { ...fixture.item, parts: fixture.item.parts.map((part) => ({ ...part, finish })) };
  // Bypass catalogue admission deliberately: even an unvalidated caller must not get a fallback surface.
  catalogue.items.push(item);
  try {
    const [row] = loadThingRecipe(fixture.recipe);
    return work(row);
  } finally {
    catalogue.items.pop();
  }
};

test('every surface an item exports names its material, and the material is defined', () => {
  assert.deepEqual(MATERIALS, compiled);
  const model = withFixture({ surface: catalogue.defaultMaterial }, (row) => glbJson(row.generate().glb));
  assert.ok(model.materials.length > 0, 'no resolved surfaces');
  for (const material of model.materials) {
    const selected = material.extras?.materialId;
    assert.ok(selected, 'a surface without a material id');
    assert.ok(Object.hasOwn(compiled, selected), `unknown material ${selected}`);
    assert.deepEqual(surfaceOf(MATERIALS[selected].finish), surfaceOf(compiled[selected].finish));
  }
});

test('a fixture recipe with an undefined surface material fails appearance resolution', () => {
  withFixture({ surface: 'no-such-material' }, (row) => assert.throws(() => row.generate(), /Unknown palette material no-such-material/));
});
