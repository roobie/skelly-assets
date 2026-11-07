import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { exportRecipes } from '../build.mjs';
import { outputPath } from '../layout.mjs';
import { installJsonnetSources } from '../sources.mjs';

installJsonnetSources();
const { catalogue } = await import('../packages/thing-authoring-tool/src/catalogue.ts');
const gunRows = JSON.parse(readFileSync(join(import.meta.dirname, '../packages/gun-authoring-tool/exports/deadvox.json'), 'utf8'));

// A gun row that reads no file, so it exports from any root, and an item row of the thing catalogue.
const gunRow = () => structuredClone(gunRows.find((row) => row.kind === 'part'));
const itemRow = () => {
  const item = catalogue.items.find((entry) => entry.exportMass === 'inventory-atom');
  return { id: `${gunRow().id}_item`, kind: 'item', source: item.id, voxel: { grain: 0.01 }, options: { mass: item.exportMass } };
};

const withRoot = async (packId, rows, work) => {
  const root = mkdtempSync(join(tmpdir(), 'build-recipes-'));
  const out = mkdtempSync(join(tmpdir(), 'build-output-'));
  try {
    mkdirSync(join(root, 'models/recipes'), { recursive: true });
    for (const extension of ['jsonnet', 'json']) writeFileSync(join(root, 'models/recipes', `${packId}.${extension}`), JSON.stringify(rows));
    await work(root, out);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
};

test('one recipe file builds its gun and item rows into one pack, each in its tool layout', async () => {
  const packId = 'fixture.mixed';
  const gun = gunRow();
  const item = itemRow();
  await withRoot(packId, [gun, item], async (root, out) => {
    await exportRecipes({ root, out, tools: ['gun', 'thing'] });
    const base = join(out, outputPath(packId, '.keep'), '..');
    assert.equal(JSON.parse(readFileSync(join(base, 'gungen', `${gun.id}.model.json`), 'utf8')).id, gun.id);
    assert.ok(!existsSync(join(base, 'gungen/index.json')));
    assert.deepEqual(JSON.parse(readFileSync(join(base, 'things/index.json'), 'utf8')).map(({ id }) => id), [item.id]);
    for (const id of [gun.id, item.id]) assert.ok(existsSync(join(base, 'assets/models', `${id}.glb`)), id);
  });
});

test('the tools left out of a run write nothing', async () => {
  const packId = 'fixture.mixed';
  await withRoot(packId, [gunRow(), itemRow()], async (root, out) => {
    await exportRecipes({ root, out, tools: ['gun'] });
    assert.ok(existsSync(join(out, packId, 'gungen')));
    assert.ok(!existsSync(join(out, packId, 'things')));
  });
});

test('a row of a kind no tool owns fails before any output', async () => {
  await withRoot('fixture.unowned', [gunRow(), { ...itemRow(), kind: 'unowned_kind' }], async (root, out) => {
    await assert.rejects(exportRecipes({ root, out, tools: ['gun', 'thing'] }), /no tool owns/);
    assert.ok(!existsSync(join(out, 'fixture.unowned')));
  });
});

test('one id in both partitions of one pack fails before any output', async () => {
  const gun = gunRow();
  await withRoot('fixture.clash', [gun, { ...itemRow(), id: gun.id }], async (root, out) => {
    await assert.rejects(exportRecipes({ root, out, tools: ['gun', 'thing'] }), /two tools/);
    assert.ok(!existsSync(join(out, 'fixture.clash')));
  });
});
