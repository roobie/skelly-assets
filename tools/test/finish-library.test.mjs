import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { buildManifest } from '../manifest.mjs';
import { readPlacements } from '../placements.mjs';
import { installJsonnetSources } from '../sources.mjs';

await installJsonnetSources();
const { finishLibrary, loadThingRecipe } = await import('../packages/thing-authoring-tool/src/exports.ts');
const { catalogue } = await import('../packages/thing-authoring-tool/src/content.ts');

const repo = resolve(import.meta.dirname, '../..');
const shipped = buildManifest({ models: [], files: [], credit: () => ({}), finishes: finishLibrary(catalogue) }).finishes;
const named = [...new Set(Object.values(readPlacements(repo)).flatMap(({ sites }) => sites.flatMap(({ finish }) => finish ?? [])))];

const glbJson = (bytes) => {
  const buffer = Buffer.from(bytes);
  return JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
};

// One fixture surface that takes paint, finished in the given finish, exported as a catalogue part is.
const paintedMaterials = (finish) => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/unknown-material.json', import.meta.url)));
  const item = { ...fixture.item, parts: fixture.item.parts.map((part) => ({ ...part, finish: { surface: finish }, paintable: ['surface'] })) };
  const [row] = loadThingRecipe(fixture.recipe, { ...catalogue, items: [item] });
  return glbJson(row.generate().glb).materials.filter(({ extras }) => extras?.paintable);
};

test('every finish a vehicle site names is in the shipped finish library', () => {
  assert.ok(named.length > 0, 'no site names a finish');
  assert.deepEqual(named.filter((finish) => !Object.hasOwn(shipped, finish)), []);
});

// A consumer puts the shipped entry in place of a paintable material, so it must be what an export in that finish
// writes; the default material is skipped, so an exporter falling back to it cannot pass.
test('a shipped finish is the material an export painted in it carries', () => {
  const finish = named.find((id) => id !== catalogue.defaultMaterial);
  const materials = paintedMaterials(finish);
  assert.ok(materials.length > 0, 'the fixture exports no paintable material');
  for (const material of materials) assert.deepEqual(material, shipped[finish]);
});
