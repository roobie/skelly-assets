import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { installJsonnetSources } from '../sources.mjs';

installJsonnetSources();
const { loadThingRecipe } = await import('../packages/thing-authoring-tool/src/exports.ts');
const { catalogue } = await import('../packages/thing-authoring-tool/src/catalogue.ts');
const { MATERIALS } = await import('../packages/thing-core/src/materials.ts');
const { exportCache } = await import('../packages/thing-export/src/cache.ts');
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

// Not the default, so an exporter that labels a surface with its fallback cannot pass.
const chosen = Object.keys(MATERIALS).find((id) => id !== catalogue.defaultMaterial);

test('every surface an item exports names the material its finish chose', () => {
  assert.deepEqual(MATERIALS, compiled);
  const model = withFixture({ surface: chosen }, (row) => glbJson(row.generate().glb));
  assert.ok(model.materials.length > 0, 'no resolved surfaces');
  for (const material of model.materials) assert.equal(material.extras?.materialId, chosen);
});

test('a fixture recipe with an undefined surface material fails appearance resolution', () => {
  withFixture({ surface: 'no-such-material' }, (row) => assert.throws(() => row.generate(), /Unknown palette material no-such-material/));
});

test('editing a material an item names misses that item in the export cache', () => {
  const folder = mkdtempSync(join(tmpdir(), 'export-cache-'));
  const colour = MATERIALS[chosen].colour;
  try {
    withFixture({ surface: chosen }, (row) => {
      let runs = 0;
      const counted = {
        ...row,
        generate: () => {
          runs += 1;
          return row.generate();
        },
      };
      const cache = exportCache(folder, 'code');
      cache.export(counted);
      MATERIALS[chosen].colour = colour.map((channel) => 1 - channel);
      cache.export(counted);
      assert.equal(runs, 2);
    });
  } finally {
    MATERIALS[chosen].colour = colour;
    rmSync(folder, { recursive: true, force: true });
  }
});
