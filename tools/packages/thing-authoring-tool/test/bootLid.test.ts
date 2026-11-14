import { resolve } from 'node:path';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import { toModelFrame } from '@skelly/thing-core/frame';
import { posePoint } from '@skelly/thing-core/motion';
import { expect, it } from 'vitest';
import { evaluateJsonnet } from '../../../jsonnet/index.mjs';
import { buildItem, loadCatalogue } from '../src/catalogue.ts';
import { exportItem } from '../src/exports.ts';

it('hinges the boot lid on its top front edge, so it lifts its tail and never swings ahead of the hinge line', () => {
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
  for (const [end, pin] of [[hinge.axis.from, inModel('hinge_a')], [hinge.axis.to, inModel('hinge_b')]] as const) {
    end.forEach((value, axis) => {
      expect(value).toBeGreaterThanOrEqual(pin.min[axis]!);
      expect(value).toBeLessThanOrEqual(pin.max[axis]!);
    });
    expect(end[1]).toBeCloseTo(skin.max[1]!, 3);
  }
  // The lid's length runs along the level axis the hinge does not.
  const along = Math.abs(hinge.axis.to[0] - hinge.axis.from[0]) > Math.abs(hinge.axis.to[2] - hinge.axis.from[2]) ? 2 : 0;
  const hingeAt = hinge.axis.from[along];
  const [toMin, toMax] = [Math.abs(hingeAt - skin.min[along]!), Math.abs(hingeAt - skin.max[along]!)];
  expect(Math.min(toMin, toMax)).toBeLessThan(0.001);
  const ahead = toMin < toMax ? -1 : 1;
  const pick = (bits: number, axis: number) => ((bits >> axis) & 1 ? skin.max : skin.min)[axis]!;
  const corners: Vec3[] = [0, 1, 2, 3, 4, 5, 6, 7].map((bits) => [pick(bits, 0), pick(bits, 1), pick(bits, 2)]);
  for (const t of [0.25, 0.5, 0.75, 1]) {
    for (const corner of corners) expect((posePoint(motion, corner, t)[along] - hingeAt) * ahead).toBeLessThan(0.001);
  }
  const tail: Vec3 = [0, skin.max[1]!, skin.min[2]!];
  expect(posePoint(motion, tail, 0.1)[1]).toBeGreaterThan(tail[1]);
});
