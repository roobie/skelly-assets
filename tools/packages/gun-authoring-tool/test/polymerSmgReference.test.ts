import { keepOutBetweenParts } from '@skelly/construct/assembly/rules.ts';
import type { Resolved } from '@skelly/construct/assembly/schema.ts';
import { applyPoint, invert, type Vec3 } from '@skelly/construct/foundation/math.ts';
import { localSolidBounds } from '@skelly/construct/shapes/geometry.ts';
import { beforeAll, expect, it } from 'vitest';
import { FAMILIES } from '../src/gun/parts.ts';
import { POLYMER_SMG_PROPORTIONS } from '../src/gun/polymerSmgProportions.ts';
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

it('exempts the receiver only from the stem’s path through it, not from the knob’s and hand’s', () => {
  const handle = owner(resolved, 'smg-handle');
  const shell = owner(resolved, 'receiver');
  const intruderIn = (keepOutId: string): Resolved => {
    const { box } = resolved.defs.get(handle)!.keepOuts.find(({ id }) => id === keepOutId)!;
    const centre = applyPoint(
      invert(resolved.placed.get(shell)!),
      applyPoint(resolved.placed.get(handle)!, box.center),
    );
    const receiverDef = resolved.defs.get(shell)!;
    const intruder = { id: 'intruder', kind: 'box' as const, box: { center: centre, half: [0.1, 0.1, 0.1] as Vec3 } };
    return {
      ...resolved,
      defs: new Map(resolved.defs).set(shell, { ...receiverDef, solids: [...receiverDef.solids, intruder] }),
    };
  };
  const failedKeepOuts = (r: Resolved) => keepOutBetweenParts(r, shell, handle).map(({ keepOut }) => keepOut?.id);
  expect(failedKeepOuts(resolved)).toEqual([]);
  expect(failedKeepOuts(intruderIn('smg-handle-stem-sweep'))).toEqual([]);
  expect(failedKeepOuts(intruderIn('smg-handle-sweep'))).toContain('smg-handle-sweep');
});

const reach = (bounds: readonly (readonly [Vec3, Vec3])[], axis: 1 | 2) => [
  Math.min(...bounds.map(([low]) => low[axis])),
  Math.max(...bounds.map(([, high]) => high[axis])),
];

it('runs the handguard on flush with the receiver top and bottom, narrower than it as far as the nose block', () => {
  const { receiver } = POLYMER_SMG_PROPORTIONS;
  // The body's walls, without the rails standing off them or the metal tube inside.
  const walls = resolved.defs
    .get('handguard')!
    .solids.filter(({ id }) =>
      ['top', 'bottom', 'left', 'right'].some((face) => id === face || id.startsWith(`${face}-`)),
    )
    .map(localSolidBounds);
  const block = resolved.defs
    .get('barrel')!
    .solids.filter(({ id }) => id === 'front-sight-block')
    .map(localSolidBounds);
  expect(reach(walls, 1)).toEqual([receiver.bottomU, receiver.topU]);
  const [, handguardHalfWidth] = reach(walls, 2);
  expect(handguardHalfWidth).toBeLessThan(receiver.halfWidthU);
  expect(reach(block, 2)).toEqual(reach(walls, 2));
});

it('refuses to collapse the skeleton stock, whose fold has no pose yet', () => {
  expect(() => FAMILIES.stock!.build({ style: 'skeleton-folding', pose: 'collapsed' })).toThrow(/collapsed/);
});

it('refuses an optic rail on a traced section, which carries its own rails', () => {
  expect(() =>
    FAMILIES.receiver!.build({ action: 'auto', feed: 'box', bore: 'M', section: 'polymer-smg', rail: 'full' }),
  ).toThrow(/its own rails/);
});
