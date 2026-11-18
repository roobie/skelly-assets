import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { loadCatalogue } from '../packages/thing-authoring-tool/src/catalogue.ts';
import { exportItem } from '../packages/thing-authoring-tool/src/exports.ts';
import { bounds, close, contains, glbBounds, placed } from './architecture-helpers.mjs';

const { spec, rows, cottage, settings, recipe } = JSON.parse(
  evaluateJsonnet(`{
  spec: import 'models/architecture/timber.spec.libsonnet',
  rows: import 'models/catalogue/sets/medieval-timber.libsonnet',
  cottage: import 'models/architecture/timber-cottage.example.jsonnet',
  settings: import 'models/item-settings.libsonnet',
  recipe: import 'models/recipes/skelly.structures.jsonnet',
}`),
);
const byId = new Map(rows.map((row) => [row.id, row]));
const pieces = (id) => JSON.parse(byId.get(id).parts[0].params.pieces);

test('the ten timber kit modules are selected once by the production structures recipe', () => {
  assert.equal(rows.length, 10);
  assert.equal(byId.size, rows.length);
  loadCatalogue({ ...settings, items: rows });
  for (const row of rows) {
    const selected = recipe.filter(({ id }) => id === row.id);
    assert.equal(selected.length, 1, row.id);
    assert.equal(selected[0].source, row.id);
    assert.equal(selected[0].taxonomy.category, 'structures');
    assert.ok(selected[0].taxonomy.tags.setting.includes('medieval'));
    assert.ok(row.title);
  }
});

test('all infill variants stop at the separate posts and have the same storey datum', () => {
  const half = (spec.bay - spec.timber) / 2;
  for (const id of [
    'medieval_timber_wall',
    'medieval_timber_braced_wall',
    'medieval_timber_doorway',
    'medieval_timber_window',
  ]) {
    const [min, max] = bounds(pieces(id));
    close(min[0], -half, id);
    close(max[0], half, id);
    close(min[1], 0, id);
    close(max[1], spec.storey, id);
    close(max[0], spec.bay / 2 - spec.timber / 2, `${id} meets next post`);
  }
  const [min, max] = bounds(pieces('medieval_timber_post'));
  close(min[0], -spec.timber / 2, 'post min');
  close(max[0], spec.timber / 2, 'post max');
});

test('doorway and unglazed window have genuine through-openings and a separately fitting door', () => {
  for (const [id, x0, x1, y0, y1] of [
    ['medieval_timber_doorway', -spec.door.halfWidth, spec.door.halfWidth, 0, spec.door.height],
    ['medieval_timber_window', -spec.window.halfWidth, spec.window.halfWidth, spec.window.bottom, spec.window.top],
  ]) {
    for (const fx of [0.01, 0.5, 0.99])
      for (const fy of [0.01, 0.5, 0.99])
        for (const z of [-0.12, 0, 0.12]) {
          const point = [x0 + fx * (x1 - x0), y0 + fy * (y1 - y0), z];
          assert.ok(!pieces(id).some((p) => contains(p, point)), `${id}: blocked at ${point}`);
        }
  }
  const [min, max] = bounds(pieces('medieval_plank_door'));
  assert.ok(min[0] > -spec.door.halfWidth && max[0] < spec.door.halfWidth);
  assert.ok(min[1] > 0 && max[1] < spec.door.height);
});

test('the cottage example closes every wall end with a post and tiles its finished floor', () => {
  const sites = cottage.sites;
  assert.equal(new Set(sites.map(({ site }) => site)).size, sites.length);
  for (const site of sites) assert.ok(byId.has(site.model), site.model);
  const posts = sites.filter(({ model }) => model === 'medieval_timber_post');
  const walls = sites.filter(({ model }) => /medieval_timber_(wall|braced_wall|window|doorway)$/.test(model));
  assert.equal(walls.length, 10);
  for (const site of walls)
    for (const end of [-1, 1]) {
      const point = placed(site, [(end * (spec.bay - spec.timber)) / 2, spec.storey / 2, 0]);
      assert.ok(
        posts.some((post) =>
          point.every((v, axis) => axis === 1 || Math.abs(v - post.at[axis]) <= spec.timber / 2 + 1e-9),
        ),
        `${site.site}: unclosed end ${point}`,
      );
    }
  const floors = sites.filter(({ model }) => model === 'medieval_timber_floor');
  assert.equal(floors.length, 6);
  for (const x of [-1, 1])
    for (const z of [-2, 0, 2]) {
      assert.equal(floors.filter(({ at }) => at[0] === x && at[1] === 0 && at[2] === z).length, 1);
    }
  const roofs = sites.filter(({ model }) => model === 'medieval_tile_roof_4m');
  assert.deepEqual(
    roofs.map(({ at }) => at),
    [
      [0, spec.storey, -2],
      [0, spec.storey, 0],
      [0, spec.storey, 2],
    ],
  );
  const [min, max] = bounds(pieces('medieval_tile_roof_4m'));
  close(min[2], -spec.bay / 2, 'roof repeat start');
  close(max[2], spec.bay / 2, 'roof repeat end');
  assert.ok(max[0] > spec.roofHalfSpan + spec.timber / 2, 'roof covers exterior post faces');
  const [vergeMin, vergeMax] = bounds(pieces('medieval_tile_verge_4m'));
  close(vergeMin[2], 0, 'verge seats at the end of the roof');
  close(vergeMax[2], spec.verge, 'verge overhang');
});

test('the gable stays under the roof surface, including its tie ends at the eaves', () => {
  for (const piece of pieces('medieval_timber_gable_4m')) {
    const points =
      piece.kind === 'box'
        ? [piece.min[0], piece.max[0]].flatMap((x) => [piece.min[1], piece.max[1]].map((y) => [x, y]))
        : piece.profile;
    for (const [x, y] of points) {
      const roofTop = spec.roofRise * (1 - Math.abs(x) / spec.roofHalfSpan) + spec.roofThickness;
      assert.ok(y <= roofTop - spec.grain + 1e-9, `${piece.id} breaks through roof at ${x}, ${y}`);
    }
  }
});

// Building pieces depend on preserved datums. Checking only source lengths missed a coarse grain widening posts.
for (const { id } of rows) {
  test(`${id} retains its placement bounds in voxel and smooth production exports`, () => {
    const item = loadCatalogue({ ...settings, items: [byId.get(id)] }).items[0];
    const exported = exportItem(item, settings, { id, file: `assets/models/${id}.glb` }, { voxelGrain: spec.grain });
    const expected = bounds(pieces(id));
    for (const bytes of [exported.glb, exported.smoothGlb]) {
      const actual = glbBounds(bytes);
      for (const side of [0, 1])
        for (const axis of [0, 1, 2])
          close(actual[side][axis], expected[side][axis], `${id} side ${side} axis ${axis}`);
    }
  });
}
