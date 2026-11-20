import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Resolved } from '@skelly/construct/assembly/schema.ts';
import { GRID } from '@skelly/construct/foundation/conventions.ts';
import { applyPoint, type Vec3 } from '@skelly/construct/foundation/math.ts';
import { obbPolyhedron, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import { beforeAll, expect, it } from 'vitest';
import trace from '../../../../models/guns/references/sks-profile.trace.json' with { type: 'json' };
import { DESIGNS } from '../src/cli/content.ts';
import { GUN_ANCHORS } from '../src/gun/anchorData.ts';
import { loadGunDesign } from '../src/gun/designLoader.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { SKS_PROPORTIONS } from '../src/gun/sksProportions.ts';
import { sweepStops } from '../src/gun/stopSweep.ts';
import { uToMm } from '../src/gun/units.ts';

/** A traced estimate sits on the gun grid, so it may miss its published figure by half a grid step. */
const GRID_TOLERANCE_MM = uToMm(GRID / 2);

let resolved: Resolved;

beforeAll(() => {
  const loaded = loadGunDesign(readFileSync(join(DESIGNS, 'sks-carbine.json'), 'utf8'));
  if (!loaded.ok) {
    throw new Error(JSON.stringify(loaded.error));
  }
  resolved = resolve(loaded.design.assembly, gunDomain);
});

const worldXs = (part: string): number[] =>
  resolved.defs
    .get(part)!
    .solids.flatMap((solid) => {
      const shape = worldSolid(resolved.placed.get(part)!, solid);
      return [...('vertices' in shape ? shape : obbPolyhedron(shape)).vertices];
    })
    .map(([x]) => x);

const muzzleTip = (): Vec3 => {
  const muzzle = GUN_ANCHORS['sks-barrel']!.anchors({}, resolved.defs.get('barrel')!).muzzle!;
  return applyPoint(resolved.placed.get('barrel')!, muzzle.position);
};

it('registers the receiver on its front face and the bore on the x axis', () => {
  const receiver = worldXs('receiver');
  expect(Math.max(...receiver)).toBeCloseTo(SKS_PROPORTIONS.receiver.x[1], 6);
  expect(Math.min(...receiver)).toBeCloseTo(SKS_PROPORTIONS.receiver.x[0], 6);
  const tip = muzzleTip();
  expect(tip[1]).toBeCloseTo(0, 6);
  expect(tip[2]).toBeCloseTo(0, 6);
});

it('builds the cited barrel from its breech to the muzzle tip', () => {
  const length = uToMm(muzzleTip()[0] - Math.min(...worldXs('barrel')));
  expect(Math.abs(length - trace.values.barrelLengthMm.value)).toBeLessThanOrEqual(GRID_TOLERANCE_MM);
});

it('builds the cited overall length from the muzzle tip to the butt plate', () => {
  const length = uToMm(muzzleTip()[0] - Math.min(...worldXs('stock')));
  expect(Math.abs(length - trace.values.overallLengthMm.value)).toBeLessThanOrEqual(GRID_TOLERANCE_MM);
});

it('draws the carrier back through its stroke clear of the gun', () => {
  expect(resolved.motions.has('bolt-carrier')).toBe(true);
  expect(sweepStops(resolved)).toEqual([]);
});
