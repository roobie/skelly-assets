import { expect, it } from 'vitest';
import { COMPACT_SMG_PROPORTIONS } from '../src/gun/compactSmgProportions.ts';
import { RECEIVER_SECTION } from '../src/gun/parts.ts';
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

const { outline, faces } = RECEIVER_SECTION['compact-smg'];

/** The receiver section's half-width at height `y`, where a horizontal line crosses its convex outline. */
const halfWidthAt = (y: number) =>
  Math.max(
    ...outline.flatMap(([y0, z0], index) => {
      const [y1, z1] = outline[(index + 1) % outline.length]!;
      if (y < Math.min(y0, y1) || y > Math.max(y0, y1) || y0 === y1) {
        return y0 === y && y1 === y ? [Math.abs(z0), Math.abs(z1)] : [];
      }
      return [Math.abs(z0 + ((y - y0) / (y1 - y0)) * (z1 - z0))];
    }),
  );

it('narrows the receiver from straight sides to its top flat, the share of its width the table gives', () => {
  const { topU, halfWidthU, taper } = COMPACT_SMG_PROPORTIONS.receiver;
  expect(halfWidthAt(0)).toBeCloseTo(halfWidthU, 9);
  expect(halfWidthAt(taper.fromY)).toBeCloseTo(halfWidthU, 9);
  expect(halfWidthAt((taper.fromY + topU) / 2)).toBeLessThan(halfWidthU);
  expect(halfWidthAt(topU)).toBeCloseTo(halfWidthU * taper.topWidthShare, 9);
  expect(faces.top.halfWidth).toBeCloseTo(halfWidthU * taper.topWidthShare, 9);
});

it('clamps the drum sight over the receiver top, the drum standing on the plate between its ears', () => {
  const { topU } = COMPACT_SMG_PROPORTIONS.receiver;
  const { name, profile, halfWidthU, aperture, clamp, ears, axle } = COMPACT_SMG_PROPORTIONS.rearSight;
  const resolved = resolveDesign('compact-smg.json');
  const solids = new Map(resolved.defs.get(owner(resolved, 'receiver'))!.solids.map((solid) => [solid.id, solid]));
  // Each jaw's inner face lies along the receiver's shoulder, from the top flat's edge down to the jaw's foot.
  for (const side of ['left', 'right']) {
    const jaw = solids.get(`rear-sight-clamp-${side}`);
    if (jaw?.kind !== 'extruded-polygon') {
      throw new Error(`the clamp needs its ${side} jaw`);
    }
    const inner = jaw.profile.map(([y, z]) => Math.abs(z) - halfWidthAt(y));
    expect(inner.filter((gap) => Math.abs(gap) < 1e-9)).toHaveLength(2);
    expect(Math.min(...inner)).toBeGreaterThan(-1e-9);
    expect(Math.min(...jaw.profile.map(([y]) => y))).toBe(clamp.jawToY);
  }
  expect(Math.min(...profile.map(([, y]) => y))).toBeCloseTo(topU + clamp.plateU, 9);
  expect(ears.z[0]).toBe(halfWidthU);
  expect(ears.z[1]).toBeLessThan(axle.halfLengthU);
  expect([aperture.eyeX, aperture.centreY]).toEqual(axle.centre);
  expect(solids.has(`rear-sight-${name}-ear-left`) && solids.has(`rear-sight-${name}-ear-right`)).toBe(true);
});

it.each([
  { pose: 'extended', lengthMm: 700 },
  { pose: 'collapsed', lengthMm: 550 },
])('builds the cited $lengthMm mm $pose length from the muzzle tip to the butt pad', ({ pose, lengthMm }) => {
  const resolved = resolveDesign('compact-smg.json', { stock: { pose } });
  expect(Math.abs(overallLengthMm(resolved) - lengthMm)).toBeLessThanOrEqual(GRID_TOLERANCE_MM);
});
