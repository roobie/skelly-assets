import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { exportPool, exportRecipes, fillCacheShard } from '../build.mjs';
import { treeMismatches } from '../check-built.mjs';
import { compileJsonnetFile } from '../jsonnet/index.mjs';
import { outputPath } from '../layout.mjs';
import { readRecipes } from '../recipes.mjs';
import { installJsonnetSources } from '../sources.mjs';

await installJsonnetSources();
const { catalogue } = await import('../packages/thing-authoring-tool/src/content.ts');
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

const filesUnder = (directory) => readdirSync(directory, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile()).map((entry) => relative(directory, join(entry.parentPath, entry.name))).sort();

// The names of a GLB's part nodes: the nodes that carry a part in their extras.
const glbPartNodes = (bytes) => {
  const length = bytes.readUInt32LE(12);
  const { nodes } = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  return nodes.filter((node) => node.extras?.part !== undefined).map((node) => node.name).sort();
};

test('the driver reports every file it wrote, and each model with the part nodes its GLB carries', async () => {
  const packId = 'fixture.mixed';
  await withRoot(packId, [gunRow(), itemRow()], async (root, out) => {
    const { models, files } = await exportRecipes({ root, out, tools: ['gun', 'thing'] });
    assert.deepEqual([...files].sort(), filesUnder(out));
    assert.ok(models.length > 0);
    for (const model of models) {
      assert.equal(model.pack, packId);
      assert.ok(files.includes(outputPath(model.pack, model.path)), `${model.id} names a file the driver did not write`);
      assert.ok(model.nodes.length > 0, `${model.id} has no part node`);
      assert.deepEqual([...model.nodes].sort(), glbPartNodes(readFileSync(join(out, model.pack, model.path))));
    }
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

test('an id build writes only the requested row, at its pack path, and no pack index', async () => {
  const packId = 'fixture.mixed';
  const item = itemRow();
  await withRoot(packId, [gunRow(), item], async (root, out) => {
    await exportRecipes({ root, out, tools: ['gun', 'thing'], ids: new Set([item.id]) });
    const expected = [`things/${item.id}.model.json`, `assets/models/${item.id}.glb`].map((file) => outputPath(packId, file));
    assert.deepEqual(filesUnder(out), expected.sort());
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

// A catalogue row becomes a model only through the recipe of the pack models/catalogue/packs.libsonnet assigns it, and
// a recipe that leaves out its catalogue rows fails nothing else.
test('every catalogue row is exported by its assigned pack', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'catalogue-packs-'));
  try {
    const source = join(scratch, 'packs.jsonnet');
    writeFileSync(source, "(import 'models/catalogue/packs.libsonnet').packs\n");
    const exported = new Set(readRecipes().flatMap(({ packId, value }) => value.map((row) => `${packId} ${row.source}`)));
    for (const [id, packId] of Object.entries(JSON.parse(compileJsonnetFile(source)))) {
      assert.ok(exported.has(`${packId} ${id}`), `${packId} does not export catalogue row ${id}`);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

const cacheEntries = (cache) => (existsSync(cache) ? filesUnder(cache).length : 0);

// CI generates a clean build in shards and then builds the tree from their merged caches: a row no shard generated
// would be generated by that last build instead, and the tree must be the one an uncached build writes.
test('a tree built from its shards\' caches is generated by the shards and equals an uncached build', async () => {
  const items = catalogue.items.filter((entry) => entry.exportMass === 'inventory-atom').slice(0, 3);
  const rows = items.map((item) => ({ id: `${item.id}_shard`, kind: 'item', source: item.id, voxel: { grain: 0.01 }, options: { mass: item.exportMass } }));
  await withRoot('fixture.shards', rows, async (root, out) => {
    writeFileSync(join(root, 'models/export.json'), '{}');
    const cache = join(out, '.cache');
    const filled = [];
    for (const index of [1, 2]) {
      await fillCacheShard({ root, shard: { index, count: 2 }, cache });
      filled.push(cacheEntries(cache));
    }
    assert.ok(filled[0] > 0 && filled[1] > filled[0], `each shard generates a share: ${filled}`);
    const pool = exportPool(cache);
    try {
      await exportRecipes({ root, out: join(out, 'cached'), tools: ['gun', 'thing'], pool });
    } finally {
      await pool.close();
    }
    assert.equal(cacheEntries(cache), filled[1]);
    await exportRecipes({ root, out: join(out, 'uncached'), tools: ['gun', 'thing'] });
    assert.deepEqual(treeMismatches(join(out, 'uncached'), join(out, 'cached')), []);
  });
});
