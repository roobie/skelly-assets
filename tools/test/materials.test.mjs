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

test('every material a recipe resolves is defined', () => {
  const ids = JSON.parse(readFileSync(new URL('../../models/export.json', import.meta.url))).ids;
  const recipe = loadThingRecipe(JSON.parse(readFileSync(new URL('../packages/thing-authoring-tool/exports/deadvox.json', import.meta.url))));
  assert.ok(ids.length > 0);
  assert.deepEqual(MATERIALS, compiled);
  for (const id of ids) {
    const row = recipe.find(row => row.id === id);
    assert.ok(row, `missing recipe ${id}`);
    // Generation exercises the exporter's actual appearance lookup, not a string scan of recipes.
    const model = glbJson(row.generate().glb);
    assert.ok(model.materials.length > 0, `${id}: no resolved surfaces`);
    for (const material of model.materials) {
      const selected = material.extras?.materialId;
      assert.ok(selected, `${id}: surface without a material id`);
      assert.ok(Object.hasOwn(compiled, selected), `${id}: unknown material ${selected}`);
      assert.deepEqual(surfaceOf(MATERIALS[selected].finish), surfaceOf(compiled[selected].finish));
    }
  }
});

test('a fixture recipe with an undefined surface material fails appearance resolution', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/unknown-material.json', import.meta.url)));
  // Bypass catalogue admission deliberately: even an unvalidated caller must not get a fallback surface.
  catalogue.items.push(fixture.item);
  try {
    const [row] = loadThingRecipe(fixture.recipe);
    assert.throws(() => row.generate(), /Unknown palette material no-such-material/);
  } finally {
    catalogue.items.pop();
  }
});
