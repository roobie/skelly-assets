import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Resolved } from '@skelly/construct/assembly/schema.ts';
import { applyPoint } from '@skelly/construct/foundation/math.ts';
import { obbPolyhedron, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import { beforeAll, expect, it } from 'vitest';
import { DESIGNS } from '../src/cli/content.ts';
import { GUN_ANCHORS } from '../src/gun/anchorData.ts';
import { loadGunDesign } from '../src/gun/designLoader.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { POLYMER_SMG_PROPORTIONS } from '../src/gun/polymerSmgProportions.ts';
import { stockReachU } from '../src/gun/tracedSmgProportions.ts';

let resolved: Resolved;

beforeAll(() => {
  const loaded = loadGunDesign(readFileSync(join(DESIGNS, 'polymer-smg.json'), 'utf8'));
  if (!loaded.ok) {
    throw new Error(JSON.stringify(loaded.error));
  }
  resolved = resolve(loaded.design.assembly, gunDomain);
});

const owner = (family: string): string => {
  const entry = [...resolved.defs].find(([, def]) => def.family === family);
  if (!entry) {
    throw new Error(`Fixture needs ${family}`);
  }
  return entry[0];
};

const worldXs = (family: string): number[] => {
  const id = owner(family);
  return resolved.defs
    .get(id)!
    .solids.flatMap((solid) => {
      const shape = worldSolid(resolved.placed.get(id)!, solid);
      return [...('vertices' in shape ? shape : obbPolyhedron(shape)).vertices];
    })
    .map(([x]) => x);
};

const muzzleTip = () => {
  const barrel = owner('barrel');
  const muzzle = GUN_ANCHORS.barrel!.anchors({}, resolved.defs.get(barrel)!).muzzle!;
  return applyPoint(resolved.placed.get(barrel)!, muzzle.position);
};

it('registers the receiver on its front face and the bore on the x axis', () => {
  const xs = worldXs('receiver');
  expect(Math.max(...xs)).toBeCloseTo(POLYMER_SMG_PROPORTIONS.receiver.frontX, 6);
  expect(Math.min(...xs)).toBeCloseTo(POLYMER_SMG_PROPORTIONS.receiver.rearX, 6);
  const tip = muzzleTip();
  expect(tip[1]).toBeCloseTo(0, 6);
  expect(tip[2]).toBeCloseTo(0, 6);
});

it('derives the threaded breech from the cited barrel span', () => {
  const { breechU, citedLengthU, tipU } = POLYMER_SMG_PROPORTIONS.barrel;
  expect(tipU.threaded - breechU).toBe(citedLengthU);
});

it('spans the breech and the threaded tip', () => {
  const barrel = owner('barrel');
  const transform = resolved.placed.get(barrel)!;
  const breech = applyPoint(transform, resolved.defs.get(barrel)!.ports.find(({ id }) => id === 'rear')!.pos);
  expect(breech[0]).toBeCloseTo(POLYMER_SMG_PROPORTIONS.barrel.breechU, 6);
  expect(muzzleTip()[0]).toBeCloseTo(POLYMER_SMG_PROPORTIONS.barrel.tipU.threaded, 6);
});

it('reaches the cited extended length from the muzzle tip to the butt plate', () => {
  const { overallLengthMm, lengthU } = POLYMER_SMG_PROPORTIONS.stock;
  const { rearX } = POLYMER_SMG_PROPORTIONS.receiver;
  expect(lengthU).toBe(stockReachU(overallLengthMm, POLYMER_SMG_PROPORTIONS.barrel.tipU.threaded, rearX));
  expect(Math.min(...worldXs('stock'))).toBeCloseTo(rearX - lengthU, 6);
});
