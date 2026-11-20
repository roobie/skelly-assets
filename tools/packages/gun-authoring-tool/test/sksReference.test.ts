import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Resolved } from '@skelly/construct/assembly/schema.ts';
import { applyPoint } from '@skelly/construct/foundation/math.ts';
import { obbPolyhedron, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import { expect, it } from 'vitest';
import { DESIGNS } from '../src/cli/content.ts';
import { GUN_ANCHORS } from '../src/gun/anchorData.ts';
import { loadGunDesign } from '../src/gun/designLoader.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { SKS_PROPORTIONS } from '../src/gun/sksProportions.ts';
import { sweepStops } from '../src/gun/stopSweep.ts';
import { mmToU } from '../src/gun/units.ts';

const load = (): Resolved => {
  const loaded = loadGunDesign(readFileSync(join(DESIGNS, 'sks-carbine.json'), 'utf8'));
  if (!loaded.ok) {
    throw new Error(JSON.stringify(loaded.error));
  }
  return resolve(loaded.design.assembly, gunDomain);
};

const xs = (resolved: Resolved, id: string): number[] =>
  resolved.defs
    .get(id)!
    .solids.flatMap((solid) => {
      const shape = worldSolid(resolved.placed.get(id)!, solid);
      return [...('vertices' in shape ? shape : obbPolyhedron(shape)).vertices];
    })
    .map(([x]) => x);

it('registers the receiver on its front face and the bore on the x axis', () => {
  const resolved = load();
  const receiver = xs(resolved, 'receiver');
  expect(Math.max(...receiver)).toBeCloseTo(SKS_PROPORTIONS.receiver.x[1], 6);
  expect(Math.min(...receiver)).toBeCloseTo(SKS_PROPORTIONS.receiver.x[0], 6);

  const muzzle = GUN_ANCHORS['sks-barrel']!.anchors({}, resolved.defs.get('barrel')!).muzzle!;
  const tip = applyPoint(resolved.placed.get('barrel')!, muzzle.position);
  expect(tip[0]).toBeCloseTo(SKS_PROPORTIONS.barrel.muzzleX, 6);
  expect(tip[1]).toBeCloseTo(0, 6);
  expect(tip[2]).toBeCloseTo(0, 6);
});

it('spans the cited barrel from the breech to the muzzle', () => {
  const resolved = load();
  const barrel = xs(resolved, 'barrel');
  const { breechX, muzzleX } = SKS_PROPORTIONS.barrel;
  expect(Math.min(...barrel)).toBeCloseTo(breechX, 6);
  expect(Math.max(...barrel)).toBeCloseTo(muzzleX, 6);
  expect(Math.abs(muzzleX - breechX - mmToU(520))).toBeLessThanOrEqual(0.125);
});

it('spans the cited overall length from the butt plate heel to the muzzle', () => {
  const resolved = load();
  const all = [...resolved.defs.keys()].flatMap((id) => xs(resolved, id));
  expect(Math.max(...all) - Math.min(...all)).toBeCloseTo(
    SKS_PROPORTIONS.barrel.muzzleX - SKS_PROPORTIONS.stock.butt.heelX,
    6,
  );
  expect(Math.abs(Math.max(...all) - Math.min(...all) - mmToU(1021))).toBeLessThanOrEqual(0.125);
});

it('draws the carrier back through its stroke clear of the gun', () => {
  const resolved = load();
  expect(resolved.motions.has('bolt-carrier')).toBe(true);
  expect(sweepStops(resolved)).toEqual([]);
});
