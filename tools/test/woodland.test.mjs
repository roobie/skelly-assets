import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DoubleSide, Group, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { emptyFilter, matches } from '../../site/filter.mjs';
import { sourceReport } from '../check-sources.mjs';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { loadCatalogue } from '../packages/thing-authoring-tool/src/catalogue.ts';
import { exportItem } from '../packages/thing-authoring-tool/src/exports.ts';
import { grown } from '../packages/thing-authoring-tool/src/families/grown.ts';
import { manifestTaxonomy, readVocabulary } from '../taxonomy.mjs';
import { glbBounds } from './architecture-helpers.mjs';

const { rows, recipe, edge, lineup, settings } = JSON.parse(
  evaluateJsonnet(`{
  rows: import 'models/catalogue/sets/woodland.libsonnet',
  recipe: import 'models/recipes/skelly.nature.jsonnet',
  edge: import 'models/nature/woodland-edge.example.jsonnet',
  lineup: import 'models/nature/woodland-lineup.example.jsonnet',
  settings: import 'models/item-settings.libsonnet',
}`),
);
const byId = new Map(rows.map((row) => [row.id, row]));
const pieces = (id) => {
  const [{ family, params }] = byId.get(id).parts;
  return family === 'grown' ? grown(params) : JSON.parse(params.pieces);
};
const outputs = new Map();
const exported = (id) => {
  if (!outputs.has(id)) {
    const row = byId.get(id);
    const item = loadCatalogue({ ...settings, items: [row] }).items[0];
    outputs.set(
      id,
      exportItem(item, settings, { id, file: `assets/models/${id}.glb` }, { voxelGrain: row.voxelGrain }),
    );
  }
  return outputs.get(id);
};
const gltf = (bytes) => {
  const b = Buffer.from(bytes);
  return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)));
};
const inRange = (value, [lo, hi], message) =>
  assert.ok(value >= lo - 1e-5 && value <= hi + 1e-5, `${message}: ${value} outside ${lo}..${hi}`);

// Deliberate acceptance budgets, independent of the generators: width and full height including root/rock skirts. A
// grown model's budget is its habit's as the woodland thins it: thinning takes the overtaking laterals a spreading oak
// spreads by, and a shrub's clumps swell to the grain.
const sizes = {
  woodland_oak_spreading: [
    [5, 6.5],
    [7, 8],
  ],
  woodland_oak_upright: [
    [7, 8.5],
    [12, 13.5],
  ],
  woodland_birch: [
    [5, 6],
    [11, 12],
  ],
  woodland_scots_pine: [
    [3.8, 4.8],
    [9.3, 10.3],
  ],
  woodland_spruce: [
    [4.5, 5.6],
    [9.1, 10.1],
  ],
  woodland_hazel: [
    [2.6, 3.2],
    [1.9, 2.4],
  ],
  woodland_shrub_low: [
    [1.8, 2.5],
    [1.1, 1.5],
  ],
  woodland_pine: [
    [4, 4.6],
    [10.2, 10.7],
  ],
  woodland_oak_sapling: [
    [2, 2.7],
    [3, 3.4],
  ],
  woodland_pine_sapling: [
    [1.2, 1.5],
    [3.1, 3.4],
  ],
  woodland_snag: [
    [2.4, 3.3],
    [5.8, 6.1],
  ],
  woodland_stump_cut: [
    [2, 2.4],
    [0.65, 0.85],
  ],
  woodland_stump_hollow: [
    [2, 2.4],
    [0.8, 0.95],
  ],
  woodland_fallen_log: [
    [3.7, 4],
    [1, 1.2],
  ],
  woodland_fern: [
    [1.5, 1.8],
    [0.5, 0.6],
  ],
  woodland_grass: [
    [0.65, 0.85],
    [0.45, 0.55],
  ],
  woodland_boulder_broad: [
    [3.3, 3.6],
    [2.1, 2.3],
  ],
  woodland_boulder_upright: [
    [1.6, 1.8],
    [3, 3.3],
  ],
  woodland_boulder_low: [
    [2.6, 2.9],
    [1, 1.2],
  ],
};

test('every woodland asset is registered once in the existing nature recipe, without replacing small props', () => {
  assert.equal(byId.size, rows.length);
  assert.deepEqual([...byId.keys()].sort(), Object.keys(sizes).sort());
  loadCatalogue({ ...settings, items: rows });
  for (const row of rows) {
    const selected = recipe.filter((r) => r.id === row.id);
    assert.equal(selected.length, 1, row.id);
    assert.equal(selected[0].source, row.id);
    assert.equal(selected[0].voxel.grain, row.voxelGrain);
    assert.equal(selected[0].taxonomy.category, 'nature');
    assert.ok(!row.building, 'natural scenery does not acquire building-kit semantics');
    const solids = pieces(row.id);
    assert.equal(new Set(solids.map((p) => p.id)).size, solids.length);
    for (const p of solids.filter((p) => p.kind === 'turned'))
      assert.equal(p.sides % 4, 0, 'supported revolve facet count');
  }
  for (const id of ['log', 'large_rock', 'field_stone']) assert.equal(recipe.filter((r) => r.id === id).length, 1);
  const { problems, unlisted } = sourceReport(
    rows.map(({ id, title, taxonomy }) => ({ id, title, taxonomy, pack: 'skelly.nature' })),
    readVocabulary(),
  );
  assert.deepEqual(problems, []);
  assert.deepEqual(unlisted, [], 'every woodland keyword is curated');
});

// The words a player types for each kind of woodland model, and the models each must find: no title names a tree, so
// only the keywords the manifest carries make a tree findable by the word.
const searches = {
  tree: [
    'woodland_birch',
    'woodland_oak_sapling',
    'woodland_oak_spreading',
    'woodland_oak_upright',
    'woodland_pine',
    'woodland_pine_sapling',
    'woodland_scots_pine',
    'woodland_snag',
    'woodland_spruce',
  ],
  shrub: ['woodland_hazel', 'woodland_shrub_low'],
  deadwood: ['woodland_fallen_log', 'woodland_snag', 'woodland_stump_cut', 'woodland_stump_hollow'],
};

test('a showcase search finds every woodland tree, sapling, shrub and piece of deadwood by its everyday word', () => {
  // Each recipe row as the showcase's models.json carries it (site/build.mjs): its taxonomy as the manifest writes it.
  const entries = recipe.map(({ id, title, taxonomy }) => ({
    id,
    title,
    tags: {},
    keywords: [],
    ...manifestTaxonomy(taxonomy),
  }));
  for (const [q, expected] of Object.entries(searches)) {
    const found = entries.filter((entry) => matches(entry, { ...emptyFilter(), q })).map(({ id }) => id);
    assert.deepEqual(found.filter((id) => byId.has(id)).sort(), expected, q);
  }
});

for (const { id, voxelGrain } of rows)
  test(`${id}: voxel and smooth exports retain ground contact, scale and materials`, () => {
    const output = exported(id);
    const bounds = [];
    for (const bytes of [output.glb, output.smoothGlb]) {
      const box = glbBounds(bytes);
      bounds.push(box);
      const [min, max] = box;
      // The voxel copy may round out to whole cells: up to a cell past each side, above the top and under the skirt.
      const cell = bytes === output.glb ? voxelGrain : 0;
      const [[least, most], [lowest, highest]] = sizes[id];
      inRange(max[0] - min[0], [least, most + 2 * cell], `${id} width`);
      inRange(max[1] - min[1], [lowest, highest + 2 * cell], `${id} height`);
      inRange(min[1], [-0.18 - cell, 0.001], `${id} base must contact, not float above, authored ground`);
      if (['woodland_fern', 'woodland_grass', 'woodland_fallen_log'].includes(id))
        inRange(min[1], [-1e-5, 1e-5], `${id} exact ground`);
      if (id.includes('boulder')) inRange(min[1], [-0.16001, -0.15999], `${id} buried skirt`);
      const materials = gltf(bytes).materials;
      assert.ok(materials.every((m) => m.alphaMode === undefined || m.alphaMode === 'OPAQUE'));
      assert.ok(materials.every((m) => m.pbrMetallicRoughness.metallicFactor === 0));
      const used = new Set(
        gltf(bytes).meshes.flatMap((m) => m.primitives.map((p) => materials[p.material].extras.materialId)),
      );
      if (pieces(id).some((p) => p.slot === 'leaf'))
        assert.ok(
          [...used].some((name) => /foliage-|grass-woodland/.test(name)),
          'foliage survives voxelization',
        );
      if (id === 'woodland_boulder_low') assert.ok(used.has('stone-grey') && used.has('moss-woodland'));
      // A shader tells a grown model's leaves from its wood by material alone, so every primitive is one or the other.
      const [{ family, finish }] = byId.get(id).parts;
      if (family === 'grown')
        assert.deepEqual([...used].sort(), [finish.bark, finish.leaf].sort(), `${id} bark and leaf`);
    }
    for (const side of [0, 1])
      for (const axis of [0, 1, 2])
        assert.ok(
          Math.abs(bounds[0][side][axis] - bounds[1][side][axis]) <= voxelGrain + 1e-5,
          `${id} variant footprint drift`,
        );
  });

test('stone and moss occupy complementary regions with a lattice-aligned material boundary', () => {
  const [stone, moss] = pieces('woodland_boulder_low');
  assert.deepEqual(stone.clip.slice(0, -1), moss.clip.slice(0, -1));
  const a = stone.clip.at(-1),
    b = moss.clip.at(-1);
  assert.deepEqual(a.normal, [0, 1, 0]);
  assert.deepEqual(b.normal, [0, -1, 0]);
  assert.equal(a.offset, -b.offset);
  const cell = a.offset / byId.get('woodland_boulder_low').voxelGrain;
  assert.ok(Math.abs(cell - Math.round(cell)) < 1e-8, 'different materials must not share a half-cell');
});

test('fern leaflet roots meet the actual rising/falling stalk segments, not an approximate height curve', () => {
  const solids = pieces('woodland_fern');
  for (const leaf of solids.filter((p) => p.id.startsWith('leaflet-'))) {
    const i = Number(leaf.id.split('-')[1]);
    const a = (i * 2 * Math.PI) / 7;
    const [z, x] = leaf.profile.find(([z, x]) => Math.abs(x * Math.sin(a) - z * Math.cos(a)) < 1e-7);
    const root = [x, leaf.start, z];
    assert.ok(
      solids
        .filter((p) => p.id === `stalk-a-${i}` || p.id === `stalk-b-${i}`)
        .some((p) =>
          p.clip.every(({ normal, offset }) => normal.reduce((v, n, j) => v + n * root[j], 0) <= offset + 1e-8),
        ),
      `${leaf.id}: disconnected from its stalk`,
    );
  }
});

test('source compositions keep metre scale, ground-level origins, known ids and normalized yaw rotations', () => {
  assert.deepEqual([...new Set(lineup.sites.map((s) => s.model))].sort(), [...byId.keys()].sort(), 'lineup shows all');
  for (const example of [edge, lineup]) {
    assert.equal(new Set(example.sites.map((s) => s.site)).size, example.sites.length);
    for (const { model } of example.sites) assert.ok(byId.has(model), `${model} is a woodland model`);
    for (const site of example.sites) {
      assert.equal(site.at[1], 0);
      assert.ok(Math.abs(Math.hypot(...site.turn) - 1) < 1e-9);
      assert.equal(site.turn[0], 0);
      assert.equal(site.turn[2], 0);
      assert.ok(!site.scale, 'no per-instance scale hiding variation');
    }
  }
});

test('the hollow stump has an actual open cavity with a closed recessed bed in both exported variants', async () => {
  const output = exported('woodland_stump_hollow');
  for (const bytes of [output.glb, output.smoothGlb]) {
    const scene = (await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '')).scene;
    scene.updateMatrixWorld(true);
    const down = (x) =>
      new Raycaster(new Vector3(x, 2, 0), new Vector3(0, -1, 0), 0, 3).intersectObject(scene, true)[0]?.point.y;
    inRange(down(0), [0.1, 0.16], 'recessed cavity bed');
    inRange(down(0.35), [0.76, 0.84], 'uncapped open centre, intact rim');
  }
});

test('the woodland-edge composition leaves its sampled central corridor free of scenery below two metres', async () => {
  for (const variant of ['glb', 'smoothGlb']) {
    const templates = new Map();
    for (const { id } of rows) {
      const bytes = exported(id)[variant];
      const scene = (await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '')).scene;
      scene.traverse((n) => {
        if (n.isMesh) for (const m of [].concat(n.material)) m.side = DoubleSide;
      });
      templates.set(id, scene);
    }
    const assembly = new Group();
    for (const site of edge.sites) {
      const node = templates.get(site.model).clone(true);
      node.position.fromArray(site.at);
      node.quaternion.fromArray(site.turn);
      assembly.add(node);
    }
    assembly.updateMatrixWorld(true);
    for (const x of [-1.3, 0, 1.3])
      for (let z = -8; z <= 8; z += 0.5) {
        const ray = new Raycaster(new Vector3(x, 2, z), new Vector3(0, -1, 0), 0, 2);
        assert.equal(ray.intersectObject(assembly, true).length, 0, `${variant}: scenery at ${x}, ${z}`);
      }
  }
});
