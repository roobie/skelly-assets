import type { Resolved } from '@skelly/construct/assembly/schema.ts';
import { beforeAll, expect, it } from 'vitest';
import { FAMILIES } from '../src/gun/parts.ts';
import { POLYMER_SMG_PROPORTIONS } from '../src/gun/polymerSmgProportions.ts';
import { uToMm } from '../src/gun/units.ts';
import { breech, GRID_TOLERANCE_MM, muzzleTip, overallLengthMm, resolveDesign, worldXs } from './tracedSmgFixture.ts';

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

it('refuses to collapse the skeleton stock, whose fold has no pose yet', () => {
  expect(() => FAMILIES.stock!.build({ style: 'skeleton-folding', pose: 'collapsed' })).toThrow(/collapsed/);
});

it('refuses an optic rail on a traced section, which carries its own rails', () => {
  expect(() =>
    FAMILIES.receiver!.build({ action: 'auto', feed: 'box', bore: 'M', section: 'polymer-smg', rail: 'full' }),
  ).toThrow(/its own rails/);
});
