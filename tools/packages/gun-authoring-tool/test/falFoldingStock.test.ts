import { motionTransform } from '@skelly/construct/assembly/motion.ts';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import { applyPoint } from '@skelly/construct/foundation/math.ts';
import { stopClock } from '@skelly/motion/motion';
import { describe, expect, it } from 'vitest';
import { gunDomain } from '../src/gun/domain.ts';
import { FOLDED_STOP, falFoldingStockSolids } from '../src/gun/falFoldingStock.ts';
import { sweepStops } from '../src/gun/stopSweep.ts';
import { loadFixture } from './helpers.ts';

const rifle = loadFixture('archetype-battle-rifle');
const folding = resolve(
  { ...rifle, parts: { ...rifle.parts, stock: { family: 'stock', params: { length: 'M', style: 'fal-folding' } } } },
  gunDomain,
);
const motion = folding.motions.get('stock')!;
// The stock's rear tip, the buttplate's centre, at a stop.
const buttAt = (name: string) =>
  applyPoint(motionTransform(folding.placed.get('stock')!, motion, stopClock(motion, name)), [-16.5, 0, 0]);

describe('the FAL folding stock', () => {
  it('is a hinge with an open stop at rest and a folded stop', () => {
    expect(motion.stages.map(({ kind }) => kind)).toEqual(['hinge']);
    expect(motion.stops.map(({ name }) => name)).toEqual(['open', FOLDED_STOP]);
    expect(folding.defs.get('stock')!.solids).toEqual(falFoldingStockSolids(16));
  });

  it('folds the butt from behind the receiver to its right side, forward of the rear face', () => {
    const receiverRear = folding.placed.get('receiver')!.t[0] - 16;
    const open = buttAt('open');
    const folded = buttAt(FOLDED_STOP);
    expect(open[0]).toBeLessThan(receiverRear);
    expect(folded[0]).toBeGreaterThan(receiverRear);
    expect(folded[2]).toBeGreaterThan(2);
  });

  it('clears the rest of the rifle at both stops and on the way between them', () => {
    expect(sweepStops(folding)).toEqual([]);
  });
});
