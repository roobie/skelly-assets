import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { loadCatalogue } from '../packages/thing-authoring-tool/src/catalogue.ts';
import { exportItem } from '../packages/thing-authoring-tool/src/exports.ts';

const { spec, rows, settings, legacy } = JSON.parse(
  evaluateJsonnet(`
local s = import 'models/vehicles/city_car.spec.libsonnet';
local shape = import 'models/vehicles/car-shape.libsonnet';
{
  spec: s,
  rows: (import 'models/vehicles/frame.libsonnet').rows(import 'models/vehicles/city_car.libsonnet'),
  settings: import 'models/item-settings.libsonnet',
  legacy: shape(s + { continuousCabin: false }).across('glass', 'glass',
    [[s.cowl, s.waist], [s.cowl + 0.08, s.waist],
     [s.cowl + 0.08 - s.aLean, s.roof], [s.cowl - s.aLean, s.roof]], s.glassIn - 0.02),
}`),
);
const pieces = (id) => JSON.parse(rows.find((r) => r.id === id).parts[0].params.pieces);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

// Intersect a line parallel to z with the two clipping planes.
const spanAt = (p, x, y) =>
  p.clip.map(({ normal: n, offset }) => (offset - n[0] * x - n[1] * y) / n[2]).sort((a, b) => a - b);

test('city car windscreen and pillars are single continuous clipped prisms', () => {
  const glass = pieces('city_car_windscreen');
  assert.equal(glass.length, 1);
  assert.equal(glass[0].kind, 'prism');
  assert.equal(glass[0].clip.length, 2);
  const shell = pieces('city_car_shell');
  for (const name of ['a_pillar', 'b_pillar_head', 'c_pillar', 'd_pillar', 'quarter_light']) {
    const matching = shell.filter((p) => p.id === `${name}_near`);
    assert.equal(matching.length, 1, name);
    assert.equal(matching[0].clip.length, 2, name);
    assert.ok(!shell.some((p) => p.id.startsWith(`${name}_0`)), name);
  }
  assert.equal(pieces('city_car_front_door').filter((p) => p.id === 'glass').length, 1);
  assert.equal(pieces('city_car_tailgate').filter((p) => p.id === 'glass').length, 1);
});

test('glass tapers linearly from authored waist to roof without changing pane thickness', () => {
  const windscreen = pieces('city_car_windscreen')[0];
  const side = pieces('city_car_front_door').find((p) => p.id === 'glass');
  for (const t of [0, 0.13, 0.25, 0.51, 0.75, 1]) {
    const y = spec.waist + t * (spec.roof - spec.waist);
    const [left, right] = spanAt(windscreen, spec.cowl - t * spec.aLean, y);
    near(right, spec.glassIn - 0.02 - t * spec.tumble);
    near(left, -right);
    const [inner, outer] = spanAt(side, 0, y);
    near(outer, spec.skin + 0.01 - t * spec.tumble);
    near(outer - inner, 2 * 0.03125);
    for (const z of [left, right]) {
      assert.ok(windscreen.clip.every(({ normal, offset }) => dot(normal, [0, y, z]) <= offset + 1e-8));
    }
  }
});

test('other cars retain the legacy band construction until explicitly migrated', () => {
  assert.equal(legacy.length, 4);
  assert.ok(legacy.every((p) => !p.clip));
});

test('continuous cabin exports as both voxel and smooth production meshes', () => {
  const selected = rows.filter((r) =>
    ['city_car_windscreen', 'city_car_front_door', 'city_car_shell', 'city_car_tailgate'].includes(r.id),
  );
  const catalogue = loadCatalogue({ ...settings, items: selected });
  for (const item of catalogue.items) {
    const out = exportItem(
      item,
      settings,
      { id: item.id, file: `assets/models/${item.id}.glb` },
      { voxelGrain: 0.03125 },
    );
    assert.ok(out.glb.length > 0, item.id);
    assert.ok(out.smoothGlb.length > 0, item.id);
  }
});
