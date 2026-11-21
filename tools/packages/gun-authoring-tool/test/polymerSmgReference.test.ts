import type { Resolved } from '@skelly/construct/assembly/schema.ts';
import { IDENTITY } from '@skelly/construct/foundation/math.ts';
import { boxFromMinMax, localSolidBounds, penetrationWorld, worldSolid } from '@skelly/construct/shapes/geometry.ts';
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

it('refuses to collapse the skeleton stock, whose fold has no pose yet', () => {
  expect(() => FAMILIES.stock!.build({ style: 'skeleton-folding', pose: 'collapsed' })).toThrow(/collapsed/);
});

it('refuses an optic rail on a traced section, which carries its own rails', () => {
  expect(() =>
    FAMILIES.receiver!.build({ action: 'auto', feed: 'box', bore: 'M', section: 'polymer-smg', rail: 'full' }),
  ).toThrow(/its own rails/);
});
