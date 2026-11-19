import { motionTransform } from '@skelly/construct/assembly/motion.ts';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import { TOLERANCE } from '@skelly/construct/foundation/conventions.ts';
import { applyPoint } from '@skelly/construct/foundation/math.ts';
import { distanceWorld, localSolidBounds, penetrationWorld, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import { stopClock } from '@skelly/motion/motion';
import { describe, expect, it } from 'vitest';
import { gunDomain } from '../src/gun/domain.ts';
import { EXTENDED_STOP, FAL_FOLDING_STOCK, FOLDED_STOP, parseFalFoldingStock } from '../src/gun/falFoldingStock.ts';
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

  it('stands extended flush against the receiver without entering it', () => {
    const world = (part: string) =>
      folding.defs.get(part)!.solids.map((solid) => worldSolid(folding.placed.get(part)!, solid));
    const pairs = world('stock').flatMap((stock) => world('receiver').map((receiver) => [stock, receiver] as const));
    expect(Math.min(...pairs.map(([stock, receiver]) => distanceWorld(stock, receiver)))).toBeLessThanOrEqual(
      TOLERANCE.contact,
    );
    expect(Math.max(...pairs.map(([stock, receiver]) => penetrationWorld(stock, receiver)))).toBeLessThanOrEqual(
      TOLERANCE.contact,
    );
  });

  it('turns the butt about the pin to the far side of it, forward of the rear face', () => {
    const extended = buttAt(EXTENDED_STOP);
    const folded = buttAt(FOLDED_STOP);
    expect(folded[0]).toBeCloseTo(2 * rearFace - extended[0], 9);
    expect(folded[2]).toBeCloseTo(2 * FAL_FOLDING_STOCK.hingeZU - extended[2], 9);
    expect(folded[1]).toBeCloseTo(extended[1], 9);
  });

  it('refuses a measure whose range does not rise', () => {
    expect(() => parseFalFoldingStock(FAL_FOLDING_STOCK)).not.toThrow();
    const { block } = FAL_FOLDING_STOCK;
    expect(() =>
      parseFalFoldingStock({ ...FAL_FOLDING_STOCK, block: { ...block, yU: [block.yU[1], block.yU[0]] } }),
    ).toThrow(/rise/);
    expect(() => parseFalFoldingStock({ ...FAL_FOLDING_STOCK, block: { ...block, yU: [1, 1] } })).toThrow(/rise/);
  });

  it('clears the rest of the rifle and its keep-outs at both stops and on the way between them', () => {
    expect(sweepStops(folding)).toEqual([]);
  });
});
