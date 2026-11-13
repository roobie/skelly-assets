import { resolve } from 'node:path';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import { toModelFrame } from '@skelly/thing-core/frame';
import { posePoint } from '@skelly/thing-core/motion';
import { expect, it } from 'vitest';
import { evaluateJsonnet } from '../../../jsonnet/index.mjs';
import { buildItem, loadCatalogue } from '../src/catalogue.ts';
import { exportItem } from '../src/exports.ts';

it('hinges the boot lid on its drawn inboard pivots, lifting its tail', () => {
  const items = JSON.parse(evaluateJsonnet(`
    local body = import 'models/vehicles/car-body.libsonnet';
    local frame = import 'models/vehicles/frame.libsonnet';
    local spec = import 'models/vehicles/saloon.spec.libsonnet';
    frame.rows([row for row in body.rows('fixture', 'Fixture', spec) if row.id == 'fixture_boot_lid'])
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
  const { modelEntry } = exportItem(item, loaded, { id: item.id, file: 'assets/models/fixture.glb' }, voxel);
  const solids = built.report.resolved.defs.get('body')!.solids;
  const inModel = (id: string) => {
    const { min, max } = built.drawn.measure('body', solids.find((solid) => solid.id === id)!);
    const [a, b] = [toModelFrame(item.forward!, min as Vec3), toModelFrame(item.forward!, max as Vec3)];
    return { min: a.map((value, axis) => Math.min(value, b[axis]!)), max: a.map((value, axis) => Math.max(value, b[axis]!)) };
  };
  const skin = inModel('skin');
  const motion = modelEntry.motion!;
  expect(modelEntry.anchors?.['hinge_a']).toBeUndefined();
  expect(motion).toHaveLength(1);
  const hinge = motion[0]!;
  expect(hinge.kind).toBe('hinge');
  if (hinge.kind !== 'hinge') return;
  for (const [end, pivot] of [[hinge.axis.from, inModel('hinge_pivot_near')], [hinge.axis.to, inModel('hinge_pivot_far')]] as const) {
    end.forEach((value, axis) => {
      expect(value).toBeGreaterThanOrEqual(pivot.min[axis]!);
      expect(value).toBeLessThanOrEqual(pivot.max[axis]!);
    });
    expect(end[0]).toBeGreaterThan(skin.min[0]!);
    expect(end[0]).toBeLessThan(skin.max[0]!);
    expect(end[1]).toBeLessThan(skin.min[1]!);
  }
  const tail: Vec3 = [0, skin.max[1]!, skin.min[2]!];
  expect(posePoint(motion, tail, 0.1)[1]).toBeGreaterThan(tail[1]);
});
