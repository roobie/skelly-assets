import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { evaluateJsonnet } from '../../../jsonnet/index.mjs';
import { buildItem, loadCatalogue } from '../src/catalogue.ts';
import { exportItem } from '../src/exports.ts';

it('exports boot-lid anchors at the drawn inboard hinge pivots, not the skin corners', () => {
  const items = JSON.parse(evaluateJsonnet(`
    local body = import 'models/vehicles/car-body.libsonnet';
    local spec = import 'models/vehicles/saloon.spec.libsonnet';
    [row for row in body.rows('fixture', 'Fixture', spec) if row.id == 'fixture_boot_lid']
  `, resolve(import.meta.dirname, '../../../..')));
  const loaded = loadCatalogue({
    units: { metresPerUnit: 1, grid: 0.001, bevel: 0 },
    facets: 12,
    defaultMaterial: 'paint-silver',
    items,
  });
  expect(loaded.items).toHaveLength(1);
  const item = loaded.items[0]!;
  const voxel = { voxelGrain: 0.03125 };
  const built = buildItem(item, loaded, voxel);
  expect(built.report.issues).toEqual([]);
  const { modelEntry } = exportItem(item, loaded, { id: item.id, file: 'assets/models/fixture.glb' }, voxel);
  const solids = built.report.resolved.defs.get('body')!.solids;
  const skin = built.drawn.measure('body', solids.find(({ id }) => id === 'skin')!);
  const pivots = ['hinge_pivot_near', 'hinge_pivot_far'].map((id) => {
    const solid = solids.find((solid) => solid.id === id);
    expect(solid, id).toBeDefined();
    const { min, max } = built.drawn.measure('body', solid!);
    return min.map((value, axis) => (value + max[axis]!) / 2);
  });
  for (const [index, name] of ['hinge_a', 'hinge_b'].entries()) {
    const pivot = pivots[index]!;
    expect(modelEntry.anchors![name]).toEqual(pivot);
    expect(pivot[2]).toBeGreaterThan(skin.min[2]);
    expect(pivot[2]).toBeLessThan(skin.max[2]);
    expect(pivot[1]).toBeLessThan(skin.min[1]);
  }
  expect(pivots[0]![0]).toEqual(pivots[1]![0]);
  expect(pivots[0]![1]).toEqual(pivots[1]![1]);
  expect(pivots[0]![2]).toBeGreaterThan(pivots[1]![2]!);
});
