import type { Resolved } from '@skelly/construct/assembly/schema.ts';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import { IDENTITY } from '@skelly/construct/foundation/math.ts';
import { boxFromMinMax, localSolidBounds, penetrationWorld, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import type { Vec2 } from '@skelly/construct/shapes/solid.ts';
import { beforeAll, expect, it } from 'vitest';
import { FAMILIES } from '../src/gun/parts.ts';
import { POLYMER_SMG_PROPORTIONS } from '../src/gun/polymerSmgProportions.ts';
import { leaningFrame } from '../src/gun/tracedSmgProportions.ts';
import { uToMm } from '../src/gun/units.ts';
import {
  breech,
  GRID_TOLERANCE_MM,
  muzzleTip,
  overallLengthMm,
  owner,
  resolveDesign,
  worldXs,
} from './tracedSmgFixture.ts';

let resolved: Resolved;

beforeAll(() => {
  resolved = resolveDesign('polymer-smg.json');
});

it('registers the receiver on its front face and the bore on the x axis', () => {
  const xs = worldXs(resolved, 'receiver');
  expect(Math.max(...xs)).toBeCloseTo(POLYMER_SMG_PROPORTIONS.receiver.frontX, 6);
  expect(Math.min(...xs)).toBeCloseTo(POLYMER_SMG_PROPORTIONS.receiver.rearX, 6);
  const tip = muzzleTip(resolved);
  expect(tip[1]).toBeCloseTo(0, 6);
  expect(tip[2]).toBeCloseTo(0, 6);
});

it('builds the cited 200 mm barrel from the breech to the threaded tip', () => {
  expect(Math.abs(uToMm(muzzleTip(resolved)[0] - breech(resolved)[0]) - 200)).toBeLessThanOrEqual(GRID_TOLERANCE_MM);
});

it('builds the cited 690 mm extended length from the muzzle tip to the butt plate', () => {
  expect(Math.abs(overallLengthMm(resolved) - 690)).toBeLessThanOrEqual(GRID_TOLERANCE_MM);
});

/** A gap that clears the magazine without leaving it loose. */
const expectSnugClearance = (gap: number) => {
  expect(gap).toBeGreaterThan(0);
  expect(gap).toBeLessThanOrEqual(0.25);
};

it('hugs the leaning magazine body inside the well opening, front, rear and sides', () => {
  const { magazine, lower } = POLYMER_SMG_PROPORTIONS;
  const { opening, leanDegrees } = lower.magwell;
  const across = magazine.pieces[0]!.map(leaningFrame(magazine.port, leanDegrees).across);
  expectSnugClearance(Math.min(...across) - opening.x[0]);
  expectSnugClearance(opening.x[1] - Math.max(...across));
  expectSnugClearance(opening.halfWidthU - magazine.halfWidthU);
});

/** The unit direction of each edge of a part's traced prism, wound counter-clockwise. */
const edgeDirections = (part: string, solidId: string): Vec2[] => {
  const solid = resolved.defs.get(part)!.solids.find(({ id }) => id === solidId)!;
  if (solid.kind !== 'extruded-polygon') {
    throw new Error(`${part}'s ${solidId} is a traced prism.`);
  }
  return solid.profile.map(([x0, y0], index) => {
    const [x1, y1] = solid.profile[(index + 1) % solid.profile.length]!;
    const length = Math.hypot(x1 - x0, y1 - y0);
    return [(x1 - x0) / length, (y1 - y0) / length];
  });
};
/** The direction of a traced prism's bottom face: wound counter-clockwise, it is the edge running most forward. */
const bottomFace = (part: string, solidId: string): Vec2 =>
  edgeDirections(part, solidId).reduce((best, edge) => (edge[0] > best[0] ? edge : best));
const cross = ([ax, ay]: Vec2, [bx, by]: Vec2): number => ax * by - ay * bx;

it('builds the magazine as a box square at every corner, its floorplate square to its sides', () => {
  const body = edgeDirections('magazine', 'body-1');
  const plate = edgeDirections('magazine', 'body-2');
  for (const [index, edge] of body.entries()) {
    const next = body[(index + 1) % body.length]!;
    expect(Math.abs(edge[0] * next[0] + edge[1] * next[1])).toBeLessThan(1e-9);
  }
  for (const edge of plate) {
    expect(Math.min(Math.abs(cross(edge, body[0]!)), Math.abs(cross(edge, body[1]!)))).toBeLessThan(1e-9);
  }
});

it('cuts the well mouth parallel to the magazine floorplate', () => {
  const floorplate = bottomFace('magazine', 'body-2');
  expect(Math.abs(cross(bottomFace('lower', 'well-rear'), floorplate))).toBeLessThan(1e-9);
  expect(Math.abs(cross(bottomFace('lower', 'well-front'), floorplate))).toBeLessThan(1e-9);
});

it('keeps the magazine path an exact leaning prism, not a box', () => {
  const path = resolved.defs.get('lower')!.keepOuts.find(({ id }) => id === 'magazine-path')!;
  if (!(path.profile && path.z)) {
    throw new Error('The magazine path keeps its exact profile.');
  }
  const [min, max] = localSolidBounds({ id: path.id, kind: 'extruded-polygon', profile: path.profile, z: path.z });
  const box = boxFromMinMax(min, max);
  expect(path.box.center).toEqual(box.center);
  expect(path.box.half).toEqual(box.half);
});

it('opens the receiver floor over the well opening from rear to front where the well meets it', () => {
  const { magazine, lower, receiver } = POLYMER_SMG_PROPORTIONS;
  const { opening, leanDegrees } = lower.magwell;
  const { atLevel } = leaningFrame(magazine.port, leanDegrees);
  // A sliver of the opening's middle just inside the floor, in the gun frame; the section sets the cut's width.
  const sliverU = 0.01;
  const [floorY, sliverTopY] = [receiver.bottomU, receiver.bottomU + sliverU];
  const sliver = worldSolid(IDENTITY, {
    id: 'opening-sliver',
    kind: 'extruded-polygon',
    profile: [
      atLevel(opening.x[0], sliverTopY),
      atLevel(opening.x[0], floorY),
      atLevel(opening.x[1], floorY),
      atLevel(opening.x[1], sliverTopY),
    ],
    z: [-sliverU, sliverU],
  });
  const shell = owner(resolved, 'receiver');
  for (const solid of resolved.defs.get(shell)!.solids) {
    expect(penetrationWorld(worldSolid(resolved.placed.get(shell)!, solid), sliver), solid.id).toBeLessThan(1e-9);
  }
});

const reach = (bounds: readonly (readonly [Vec3, Vec3])[], axis: 1 | 2) => [
  Math.min(...bounds.map(([low]) => low[axis])),
  Math.max(...bounds.map(([, high]) => high[axis])),
];

it('runs the handguard on flush with the receiver top and bottom, narrower than it as far as the nose block', () => {
  const { receiver } = POLYMER_SMG_PROPORTIONS;
  // The body's walls, without the rails standing off them or the metal tube inside.
  const walls = resolved.defs
    .get('handguard')!
    .solids.filter(({ id }) =>
      ['top', 'bottom', 'left', 'right'].some((face) => id === face || id.startsWith(`${face}-`)),
    )
    .map(localSolidBounds);
  const block = resolved.defs
    .get('barrel')!
    .solids.filter(({ id }) => id === 'front-sight-block')
    .map(localSolidBounds);
  expect(reach(walls, 1)).toEqual([receiver.bottomU, receiver.topU]);
  const [, handguardHalfWidth] = reach(walls, 2);
  expect(handguardHalfWidth).toBeLessThan(receiver.halfWidthU);
  expect(reach(block, 2)).toEqual(reach(walls, 2));
});

it('refuses to collapse the skeleton stock, whose fold has no pose yet', () => {
  expect(() => FAMILIES.stock!.build({ style: 'skeleton-folding', pose: 'collapsed' })).toThrow(/collapsed/);
});

it('refuses an optic rail on a traced section, which carries its own rails', () => {
  expect(() =>
    FAMILIES.receiver!.build({ action: 'auto', feed: 'box', bore: 'M', section: 'polymer-smg', rail: 'full' }),
  ).toThrow(/its own rails/);
});
