import { expect, it } from 'vitest';
import { COMPACT_SMG_PROPORTIONS } from '../src/gun/compactSmgProportions.ts';
import { uToMm } from '../src/gun/units.ts';
import { breech, GRID_TOLERANCE_MM, muzzleTip, overallLengthMm, resolveDesign, worldXs } from './tracedSmgFixture.ts';

const variants = [
  { file: 'compact-smg.json', muzzle: 'threaded' },
  { file: 'compact-smg-plain.json', muzzle: 'plain' },
] as const;

it.each(variants)('registers the receiver on its front face and the bore on the x axis: $muzzle', ({ file }) => {
  const resolved = resolveDesign(file);
  const xs = worldXs(resolved, 'receiver');
  expect(Math.max(...xs)).toBeCloseTo(COMPACT_SMG_PROPORTIONS.receiver.frontX, 6);
  expect(Math.min(...xs)).toBeCloseTo(COMPACT_SMG_PROPORTIONS.receiver.rearX, 6);
  const tip = muzzleTip(resolved);
  expect(tip[1]).toBeCloseTo(0, 6);
  expect(tip[2]).toBeCloseTo(0, 6);
});

it.each(variants)('spans the breech and tip for the muzzle variant: $muzzle', ({ file, muzzle }) => {
  const resolved = resolveDesign(file);
  expect(breech(resolved)[0]).toBeCloseTo(COMPACT_SMG_PROPORTIONS.barrel.breechU, 6);
  expect(muzzleTip(resolved)[0]).toBeCloseTo(COMPACT_SMG_PROPORTIONS.barrel.tipU[muzzle], 6);
});

it('builds the cited 225 mm barrel from the breech to the threaded tip', () => {
  const resolved = resolveDesign('compact-smg.json');
  expect(Math.abs(uToMm(muzzleTip(resolved)[0] - breech(resolved)[0]) - 225)).toBeLessThanOrEqual(GRID_TOLERANCE_MM);
});

it.each([
  { pose: 'extended', lengthMm: 700 },
  { pose: 'collapsed', lengthMm: 550 },
])('builds the cited $lengthMm mm $pose length from the muzzle tip to the butt pad', ({ pose, lengthMm }) => {
  const resolved = resolveDesign('compact-smg.json', { stock: { pose } });
  expect(Math.abs(overallLengthMm(resolved) - lengthMm)).toBeLessThanOrEqual(GRID_TOLERANCE_MM);
});
