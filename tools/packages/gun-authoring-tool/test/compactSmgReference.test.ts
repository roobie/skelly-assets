import { TOLERANCE } from '@skelly/construct/foundation/conventions.ts';
import { boundsOfPoints, distanceWorld, obbPolyhedron, worldSolid } from '@skelly/construct/shapes/geometry.ts';
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
  const { name, clamp } = COMPACT_SMG_PROPORTIONS.rearSight;
  const resolved = resolveDesign('compact-smg.json');
  const receiverId = owner(resolved, 'receiver');
  const solids = new Map(resolved.defs.get(receiverId)!.solids.map((solid) => [solid.id, solid]));
  const placed = (id: string) => {
    const solid = solids.get(id);
    if (!solid) {
      throw new Error(`the sight needs its ${id}`);
    }
    return worldSolid(resolved.placed.get(receiverId)!, solid);
  };
  const bounds = (id: string) => {
    const world = placed(id);
    return boundsOfPoints(('vertices' in world ? world : obbPolyhedron(world)).vertices);
  };
  // A solid's z span on one side of the bore, measured outward from it: its inner face, then its outer face.
  const outward = (id: string, sign: number): readonly [number, number] => {
    const [low, high] = bounds(id);
    return sign > 0 ? [low[2], high[2]] : [-high[2], -low[2]];
  };
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
  expect(bounds(`rear-sight-${name}-left`)[0][1]).toBeCloseTo(bounds('rear-sight-clamp-plate')[1][1], 9);
  // The aperture is the gap between the drum's two pierced halves.
  const [apertureHalf] = outward(`rear-sight-${name}-right`, 1);
  for (const [side, sign] of [
    ['left', -1],
    ['right', 1],
  ] as const) {
    const [, drumSide] = outward(`rear-sight-${name}-${side}`, sign);
    const ear = `rear-sight-${name}-ear-${side}`;
    const stub = `rear-sight-axle-${side}`;
    const [earInner, earOuter] = outward(ear, sign);
    const [stubInner, stubOuter] = outward(stub, sign);
    expect(earInner).toBeCloseTo(drumSide, 9);
    expect(distanceWorld(placed(ear), placed(`rear-sight-${name}-${side}`))).toBeLessThan(TOLERANCE.contact);
    // The export's sight-line check skips revolved solids, so this is what keeps the axle out of the aperture.
    expect(stubInner).toBeGreaterThanOrEqual(apertureHalf);
    expect(stubInner).toBeCloseTo(drumSide, 9);
    expect(stubOuter).toBeGreaterThan(earOuter);
    expect(distanceWorld(placed(stub), placed(ear))).toBeLessThan(TOLERANCE.contact);
  }
});

it.each([
  { pose: 'extended', lengthMm: 700 },
  { pose: 'collapsed', lengthMm: 550 },
])('builds the cited $lengthMm mm $pose length from the muzzle tip to the butt pad', ({ pose, lengthMm }) => {
  const resolved = resolveDesign('compact-smg.json', { stock: { pose } });
  expect(Math.abs(overallLengthMm(resolved) - lengthMm)).toBeLessThanOrEqual(GRID_TOLERANCE_MM);
});
