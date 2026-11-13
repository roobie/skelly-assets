import { resolve } from 'node:path';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import { mirrorMotion, posePoint } from '@skelly/thing-core/motion';
import { expect, it } from 'vitest';
import { evaluateJsonnet } from '../../../jsonnet/index.mjs';
import { buildItem, itemMotion, loadCatalogue } from '../src/catalogue.ts';

const grain = 0.03125;
const reflect = ([x, y, z]: Vec3): Vec3 => [-x, y, z];
const expectClose = (actual: Vec3, expected: Vec3) => actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis]!, 9));

it('runs a plug door out then along at one pace, and its far twin as the reflection', () => {
  const [plugOut, along] = [0.05, 1];
  const items = JSON.parse(evaluateJsonnet(`
    local k = import 'models/vehicles/kit.libsonnet';
    local frame = import 'models/vehicles/frame.libsonnet';
    frame.rows([k.compound('plug_door', 20, [k.box('panel', 'paint', [-0.5, 0, 0.8], [0.5, 1, 0.85])], { paint: 'paint-silver' },
      motion=k.motion.slide('out', ${plugOut}) + k.motion.slide('rear', ${along})) + { title: 'Plug door' }])
  `, resolve(import.meta.dirname, '../../../..')));
  const loaded = loadCatalogue({ units: { metresPerUnit: 1, grid: 0.001, bevel: 0 }, facets: 12, defaultMaterial: 'paint-silver', items });
  const item = loaded.items[0]!;
  const motion = itemMotion(item, loaded, buildItem(item, loaded, { voxelGrain: grain }).report.resolved.placed, grain)!;
  const point: Vec3 = [-0.8, 0.5, 0];
  // Half the clock carries the door half its whole path: all of the plug-out and the rest along the rail.
  const poses: readonly (readonly [number, Vec3])[] = [
    [1, [-0.8 - plugOut, 0.5, -along]],
    [0.5, [-0.8 - plugOut, 0.5, -((plugOut + along) / 2 - plugOut)]],
  ];
  for (const [clock, expected] of poses) {
    expectClose(posePoint(motion, point, clock), expected);
    expectClose(posePoint(mirrorMotion(motion), reflect(point), clock), reflect(expected));
  }
});
