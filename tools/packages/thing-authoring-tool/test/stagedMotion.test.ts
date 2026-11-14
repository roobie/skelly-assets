import { resolve } from 'node:path';
import { applyPoint, dot, type Vec3 } from '@skelly/construct/foundation/math.ts';
import { isStowed, mirrorMotion, posePoint, TOWARD } from '@skelly/thing-core/motion';
import type { Motion } from '@skelly/thing-core/schema';
import { expect, it } from 'vitest';
import { evaluateJsonnet } from '../../../jsonnet/index.mjs';
import { buildItem, itemMotion, loadCatalogue } from '../src/catalogue.ts';

const grain = 0.03125;
const reflect = ([x, y, z]: Vec3): Vec3 => [-x, y, z];
const expectClose = (actual: Vec3, expected: Vec3) => actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis]!, 9));

// A one-part vehicle row of a panel on the near side, rearward of the vehicle origin, drawn and moved by the kit, with
// its motion and the box its voxels fill in the model frame. `reach` is how far the panel's outer face stands from the
// vehicle's centre plane, which the voxels need not meet.
const panel = (pins: string, motion: string, reach = 0.85) => {
  const items = JSON.parse(evaluateJsonnet(`
    local k = import 'models/vehicles/kit.libsonnet';
    local frame = import 'models/vehicles/frame.libsonnet';
    local pins = ${pins};
    frame.rows([k.compound('panel', 20, [k.box('panel', 'paint', [-1, 0, 0.8], [0, 1, ${reach}])] + pins, { paint: 'paint-silver' },
      motion=${motion}) + { title: 'Panel' }])
  `, resolve(import.meta.dirname, '../../../..')));
  const loaded = loadCatalogue({ units: { metresPerUnit: 1, grid: 0.001, bevel: 0 }, facets: 12, defaultMaterial: 'paint-silver', items });
  const item = loaded.items[0]!;
  const built = buildItem(item, loaded, { voxelGrain: grain });
  const { defs, placed } = built.report.resolved;
  const part = item.parts[0]!.id;
  const measures = defs.get(part)!.solids.map((solid) => built.drawn.measure(part, solid));
  const extreme = (pick: typeof Math.min, bound: 'min' | 'max'): Vec3 =>
    [0, 1, 2].map((axis) => pick(...measures.map((measure) => measure[bound][axis]!))) as unknown as Vec3;
  const drawn = { min: extreme(Math.min, 'min'), max: extreme(Math.max, 'max') };
  return { motion: itemMotion(item, loaded, built, grain)!, drawn, place: (point: Vec3) => applyPoint(placed.get(part)!, point) };
};
const panelMotion = (pins: string, motion: string): Motion => panel(pins, motion).motion;

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

// The box the voxels fill in the model frame, as a grid of points to carry through the motion.
const drawnPoints = ({ drawn, place }: ReturnType<typeof panel>): Vec3[] => {
  const steps = [0, 1, 2, 3, 4];
  return steps.flatMap((i) =>
    steps.flatMap((j) =>
      steps.map((k) => place([i, j, k].map((step, axis) => drawn.min[axis]! + (step / 4) * (drawn.max[axis]! - drawn.min[axis]!)) as unknown as Vec3)),
    ),
  );
};

it('hides nothing the voxels draw at rest, and nothing past their bounds once moved, on the near part and its far twin', () => {
  // An authored face between lattice planes, which the voxels draw past.
  const authored = 0.86;
  const near = panel('[]', "k.motion.slide('near', 0.4, stow=true)", authored);
  const drawn = drawnPoints(near);
  expect(Math.max(...drawn.map((point) => dot(point, TOWARD.near)))).toBeGreaterThan(authored);
  const twins = [
    { motion: near.motion, points: drawn, toward: TOWARD.near },
    { motion: mirrorMotion(near.motion), points: drawn.map(reflect), toward: TOWARD.far },
  ];
  for (const { motion, points, toward } of twins) {
    const edge = Math.max(...points.map((point) => dot(point, toward)));
    expect(points.filter((point) => isStowed(motion, point, 0))).toHaveLength(0);
    expect(points.filter((point) => isStowed(motion, point, 1)).length).toBeGreaterThan(0);
    for (const clock of [0.25, 0.5, 0.75, 1]) {
      points
        .filter((point) => !isStowed(motion, point, clock))
        .forEach((point) => expect(dot(posePoint(motion, point, clock), toward)).toBeLessThanOrEqual(edge + 1e-9));
    }
  }
});
