import { motionTransform } from '@skelly/construct/assembly/motion.ts';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import { applyPoint } from '@skelly/construct/foundation/math.ts';
import { localSolidBounds } from '@skelly/construct/shapes/geometry.ts';
import { stopClock } from '@skelly/motion/motion';
import { describe, expect, it } from 'vitest';
import { gunDomain } from '../src/gun/domain.ts';
import { EXTENDED_STOP, FAL_FOLDING_STOCK, FOLDED_STOP } from '../src/gun/falFoldingStock.ts';
import { sweepStops } from '../src/gun/stopSweep.ts';
import { loadFixture } from './helpers.ts';

const rifle = loadFixture('archetype-battle-rifle');
const folding = resolve(
  { ...rifle, parts: { ...rifle.parts, stock: { family: 'stock', params: { length: 'M', style: 'fal-folding' } } } },
  gunDomain,
);
const motion = folding.motions.get('stock')!;
const solids = folding.defs.get('stock')!.solids;
// The stock is placed with its origin on the receiver's rear face.
const rearFace = folding.placed.get('stock')!.t[0];
const buttplate = solids.find(({ id }) => id === 'buttplate')!;
const [buttMin, buttMax] = localSolidBounds(buttplate);
const buttCentre = buttMin.map((low, axis) => (low + buttMax[axis]!) / 2) as [number, number, number];
const buttAt = (stop: string) =>
  applyPoint(motionTransform(folding.placed.get('stock')!, motion, stopClock(motion, stop)), buttCentre);

describe('the FAL folding stock', () => {
  it('is a hinge that stands extended at rest and folds', () => {
    expect(motion.stages.map(({ kind }) => kind)).toEqual(['hinge']);
    expect(motion.stops.map(({ name }) => name)).toEqual([EXTENDED_STOP, FOLDED_STOP]);
  });

  it('sits flush against the receiver rear face', () => {
    const reach = solids.map((solid) => localSolidBounds(solid)[1][0]);
    expect(Math.max(...reach)).toBe(0);
    expect(folding.placed.get('stock')!.t[0]).toBe(rearFace);
  });

  it('turns the butt about the pin to the far side of it, forward of the rear face', () => {
    const extended = buttAt(EXTENDED_STOP);
    const folded = buttAt(FOLDED_STOP);
    expect(folded[0]).toBeCloseTo(2 * rearFace - extended[0], 9);
    expect(folded[2]).toBeCloseTo(2 * FAL_FOLDING_STOCK.hingeZU - extended[2], 9);
    expect(folded[1]).toBeCloseTo(extended[1], 9);
  });

  it('clears the rest of the rifle and its keep-outs at both stops and on the way between them', () => {
    expect(sweepStops(folding)).toEqual([]);
  });
});
