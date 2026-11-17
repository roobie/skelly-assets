import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { exportPool, exportRecipes } from '../build.mjs';
import { exportBuildingKits, readBuildingKits } from '../buildingKits.mjs';
import { buildManifest, manifestJson, treeDifferences } from '../manifest.mjs';
import { itemBuilding, loadCatalogue } from '../packages/thing-authoring-tool/src/catalogue.ts';
import { readBuilding, readBuildingKit } from '../packages/thing-core/src/building.ts';
import { readRecipes } from '../recipes.mjs';
import { installJsonnetSources } from '../sources.mjs';
import { close, glbBounds } from './architecture-helpers.mjs';

await installJsonnetSources();
const { catalogue } = await import('../packages/thing-authoring-tool/src/content.ts');
const pack = 'skelly.structures';
const definitions = readBuildingKits();
const items = catalogue.items.filter(({ building }) => building !== undefined);
const itemById = new Map(items.map((item) => [item.id, item]));
const recipe = readRecipes()
  .find(({ packId }) => packId === pack)
  .value.filter(({ source }) => itemById.has(source));
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const filesUnder = (directory) =>
  readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)))
    .sort();
const credit = () => ({ author: 'Fixture Author', licence: 'fixture' });
const yaw = (degrees) => new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (degrees * Math.PI) / 180).toArray();
const transform = (site, point) =>
  new Vector3(...point)
    .applyQuaternion(new Quaternion(...site.turn))
    .add(new Vector3(...site.at))
    .toArray();
const compose = (parent, child) => ({
  at: transform(parent, child.at),
  turn: new Quaternion(...parent.turn).multiply(new Quaternion(...child.turn)).toArray(),
});
const distance = (a, b) => Math.hypot(...a.map((v, axis) => v - b[axis]));
const profile = (building) => `${building.kit.id}@${building.kit.revision}/${building.layout.join}`;

// A small reference consumer, not a universal solver. Every semantic decision comes from shipped metadata.
const corner = (wall, node, parent) => {
  assert.equal(wall.layout.kind, 'wall-infill');
  assert.equal(node.layout.kind, 'shared-node');
  assert.equal(profile(wall), profile(node), 'incompatible node profile');
  const walls = [yaw(0), yaw(90)].map((turn) =>
    compose(parent, {
      at: new Vector3(...wall.layout.nodes[0])
        .applyQuaternion(new Quaternion(...turn))
        .negate()
        .toArray(),
      turn,
    }),
  );
  const requirements = walls.flatMap((site) => wall.layout.nodes.map((at) => transform(site, at)));
  const unique = requirements.filter((at, i) => requirements.findIndex((other) => distance(at, other) < 1e-6) === i);
  const nodes = unique.map((at) => ({
    at: new Vector3(...at)
      .sub(new Vector3(...node.layout.at).applyQuaternion(new Quaternion(...parent.turn)))
      .toArray(),
    turn: parent.turn,
  }));
  const check = (providers) => {
    for (const at of requirements) {
      assert.equal(
        providers.filter((site) => distance(transform(site, node.layout.at), at) < 1e-6).length,
        1,
        'one provider per shared node',
      );
    }
  };
  check(nodes);
  assert.equal(requirements.length, 4);
  assert.equal(nodes.length, 3, 'the corner shares one post/pier');
  assert.throws(() => check([...nodes, nodes[0]]), /one provider/);
  return { walls, nodes };
};

test('production building sidecars, kit discovery, geometry and cached rebuilds preserve the same contract', async () => {
  const root = mkdtempSync(join(tmpdir(), 'building-metadata-'));
  try {
    mkdirSync(join(root, 'models/recipes'), { recursive: true });
    for (const extension of ['jsonnet', 'json']) {
      writeFileSync(join(root, `models/recipes/${pack}.${extension}`), JSON.stringify(recipe));
      writeFileSync(
        join(root, `models/building-kits.${extension}`),
        JSON.stringify(definitions.map(({ pack, kit }) => ({ pack, kit }))),
      );
    }
    const run = async (directory) => {
      const out = join(root, directory);
      const pool = exportPool(join(root, 'cache'));
      let exported;
      try {
        exported = await exportRecipes({ root, out, tools: ['thing'], pool });
      } finally {
        await pool.close();
      }
      const kits = exportBuildingKits({ root, out, models: exported.models });
      const manifest = buildManifest({
        models: exported.models.map((model) => ({ ...model, title: itemById.get(model.id).title })),
        buildingKits: kits.buildingKits,
        files: [...exported.files, ...kits.files],
        credit,
      });
      writeFileSync(join(out, 'manifest.json'), manifestJson(manifest));
      assert.deepEqual(
        treeDifferences({
          files: filesUnder(out).map((file) => `built/${file}`),
          manifest,
          declared: new Set([pack, `${pack}.smooth`]),
        }),
        [],
      );
      return { out, manifest, usage: pool.usage() };
    };
    const cold = await run('cold');
    const warm = await run('warm');
    assert.deepEqual(cold.usage, { generated: items.length, reused: 0 });
    assert.deepEqual(warm.usage, { generated: 0, reused: items.length });
    assert.deepEqual(filesUnder(cold.out), filesUnder(warm.out));
    for (const path of filesUnder(cold.out)) {
      assert.deepEqual(readFileSync(join(cold.out, path)), readFileSync(join(warm.out, path)), path);
    }
    const entries = new Map();
    const kits = new Map(
      cold.manifest.buildingKits.map((entry) => [
        entry.id,
        readBuildingKit(json(join(cold.out, entry.pack, entry.path))),
      ]),
    );
    const index = json(join(cold.out, pack, 'things/index.json'));
    for (const model of cold.manifest.models) {
      assert.ok(model.building, model.id);
      assert.ok(model.smooth, model.id);
      const entry = json(join(cold.out, model.pack, model.building.path));
      const building = readBuilding(entry.building);
      assert.deepEqual(building, itemById.get(model.id).building, model.id);
      assert.deepEqual(building.kit, model.building.kit);
      assert.deepEqual(
        index.find(({ id }) => id === model.id),
        entry,
      );
      entries.set(model.id, building);
      const kit = kits.get(building.kit.id);
      const layout = building.layout;
      for (const { pack: filePack, path } of [model, model.smooth]) {
        const bytes = readFileSync(join(cold.out, filePack, path));
        const [min, max] = glbBounds(bytes);
        if (layout.kind === 'wall-infill' || layout.kind === 'shared-node') {
          const join = kit.joins[layout.join];
          const x =
            layout.kind === 'shared-node'
              ? [layout.at[0] - join.nodeWidth / 2, layout.at[0] + join.nodeWidth / 2]
              : [layout.nodes[0][0] + join.nodeWidth / 2, layout.nodes[1][0] - join.nodeWidth / 2];
          close(min[0], x[0], `${model.id} exported left join plane`);
          close(max[0], x[1], `${model.id} exported right join plane`);
          close(min[1], 0, `${model.id} exported base`);
          close(max[1], join.height, `${model.id} exported cap`);
          close(min[2], -join.depth / 2, `${model.id} exported rear`);
          close(max[2], join.depth / 2, `${model.id} exported exterior`);
        }
        if (layout.kind === 'surface') {
          for (const [axis, span] of [
            [0, layout.footprint.x],
            [1, [layout.bottom, layout.top]],
            [2, layout.footprint.z],
          ]) {
            close(min[axis], span[0], `${model.id} exported low plane`);
            close(max[axis], span[1], `${model.id} exported high plane`);
          }
        }
      }
    }
    for (const degrees of [0, 90, 180, 270]) {
      const parent = { at: [4, 3, -6], turn: yaw(degrees) };
      for (const [wall, node] of [
        ['medieval_timber_wall', 'medieval_timber_post'],
        ['medieval_stone_wall', 'medieval_stone_pier'],
      ]) {
        corner(entries.get(wall), entries.get(node), parent);
      }
      assert.throws(
        () => corner(entries.get('medieval_stone_wall'), entries.get('medieval_timber_post'), parent),
        /incompatible node/,
      );
    }
    // A cached model cannot silently lose a kit document or carry a missing/foreign join.
    const model = cold.manifest.models[0];
    assert.throws(
      () =>
        exportBuildingKits({
          root,
          out: cold.out,
          models: [{ ...model, building: { ...model.building, kit: { id: 'missing', revision: 1 } } }],
        }),
      /unknown building kit/,
    );
    const file = join(cold.out, model.pack, model.building.path);
    const entry = json(file);
    writeFileSync(file, JSON.stringify({ ...entry, building: undefined }));
    assert.throws(() => exportBuildingKits({ root, out: cold.out, models: [model] }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('building authoring rejects source conversions rather than silently moving datums', () => {
  const item = items[0];
  const { items: _items, ...settings } = catalogue;
  assert.deepEqual(itemBuilding(item, settings), item.building);
  assert.throws(() => itemBuilding({ ...item, forward: '+x' }, settings), /requires a metre/);
  assert.throws(
    () => itemBuilding(item, { ...settings, units: { ...settings.units, metresPerUnit: 0.01 } }),
    /requires a metre/,
  );
  assert.throws(() => loadCatalogue({ ...settings, items: [{ ...item, building: { ...item.building, typo: 1 } }] }));
});

test('manifest discovery refuses missing building sidecars and kit files', () => {
  const model = {
    id: 'wall',
    title: 'Wall',
    kind: 'item',
    pack,
    path: 'assets/models/wall.glb',
    building: { kit: { id: 'timber', revision: 1 }, path: 'things/wall.model.json' },
  };
  const kit = { id: 'timber', revision: 1, pack, path: 'building-kits/timber.v1.json' };
  const files = [`${pack}/${model.path}`, `${pack}/${model.building.path}`, `${pack}/${kit.path}`];
  const manifest = (overrides = {}) =>
    buildManifest({ models: [model], buildingKits: [kit], files, credit, ...overrides });
  assert.deepEqual(manifest().models[0].building, model.building);
  assert.throws(() => manifest({ files: files.slice(0, 1) }), /not a produced file/);
  assert.throws(() => manifest({ files: files.filter((path) => !path.endsWith('.model.json')) }), /sidecar/);
  assert.throws(() => manifest({ buildingKits: [] }), /unknown building kit/);
  assert.throws(() => manifest({ buildingKits: [kit, kit] }), /duplicate building kit/);
});
