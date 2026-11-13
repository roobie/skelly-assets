import { resolve } from 'node:path';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import { mirrorMotion, posePoint } from '@skelly/thing-core/motion';
import type { Motion } from '@skelly/thing-core/schema';
import { expect, it } from 'vitest';
import { evaluateJsonnet } from '../../../jsonnet/index.mjs';
import { buildItem, itemMotion, loadCatalogue } from '../src/catalogue.ts';

const grain = 0.03125;
const reflect = ([x, y, z]: Vec3): Vec3 => [-x, y, z];
const expectClose = (actual: Vec3, expected: Vec3) => actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis]!, 9));

// A one-part vehicle row of a 1 m panel on the near side, rearward of the vehicle origin, drawn and moved by the kit.
const panelMotion = (pins: string, motion: string): Motion => {
  const items = JSON.parse(evaluateJsonnet(`
    local k = import 'models/vehicles/kit.libsonnet';
    local frame = import 'models/vehicles/frame.libsonnet';
    local pins = ${pins};
    frame.rows([k.compound('panel', 20, [k.box('panel', 'paint', [-1, 0, 0.8], [0, 1, 0.85])] + pins, { paint: 'paint-silver' },
      motion=${motion}) + { title: 'Panel' }])
  `, resolve(import.meta.dirname, '../../../..')));
  const loaded = loadCatalogue({ units: { metresPerUnit: 1, grid: 0.001, bevel: 0 }, facets: 12, defaultMaterial: 'paint-silver', items });
  const item = loaded.items[0]!;
  return itemMotion(item, loaded, buildItem(item, loaded, { voxelGrain: grain }).report.resolved.placed, grain)!;
};

// Each pose is checked on the near part and, reflected, on its far twin.
const expectPoses = (motion: Motion, point: Vec3, poses: readonly (readonly [number, Vec3])[]) => {
  for (const [clock, expected] of poses) {
    expectClose(posePoint(motion, point, clock), expected);
    expectClose(posePoint(mirrorMotion(motion), reflect(point), clock), reflect(expected));
  }
};

it('runs a plug door out then along at one pace, and its far twin as the reflection', () => {
  const [plugOut, along] = [0.05, 1];
  const motion = panelMotion('[]', `k.motion.slide('near', ${plugOut}) + k.motion.slide('rear', ${along})`);
  // Half the clock carries the door half its whole path: all of the plug-out and the rest along the rail.
  expectPoses(motion, [-0.8, 0.5, 0], [
    [1, [-0.8 - plugOut, 0.5, -along]],
    [0.5, [-0.8 - plugOut, 0.5, -((plugOut + along) / 2 - plugOut)]],
  ]);
});

it('slides a hinged panel in its rest frame and swings the slid panel about the hinge', () => {
  // Pins on an upright line at the panel's fore edge, which in the model frame runs through x = -0.85, z = 0.
  const motion = panelMotion("k.hingePins('hinge', 'y', [0, 0.2, 0.85], [0, 0.8, 0.85])", "k.motion.hinge(pins, 'near', 90) + k.motion.slide('rear', 0.5)");
  // The panel's rear corner slides 0.5 m rearward to 1.5 m behind the hinge, and the quarter turn swings that toward near.
  expectPoses(motion, [-0.85, 0.5, -1], [[1, [-0.85 - 1.5, 0.5, 0]]]);
});
