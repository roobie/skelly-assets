import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { box, choice, NEG_X, NEG_Y, X, Y } from '../antiMateriel/common.ts';
import { AR15, u } from './frame.ts';
import { roundBar } from './shapes.ts';

/**
 * The AR-15 barrel, by its length and gas system. Only the part ahead of the upper is built: the chamber and barrel
 * extension sit inside the upper, so they never show. Lengths and the gas port are measured from the bolt face, which
 * lies the breech setback behind the upper's front face.
 */
export const ar15Barrel: PartFamily = {
  name: 'ar15-barrel',
  params: { length: choice(...Object.keys(AR15.barrel.lengths)) },
  build(params): PartDef {
    const choiceOf = AR15.barrel.lengths[params.length as keyof typeof AR15.barrel.lengths];
    const setback = u(AR15.barrel.breechSetback);
    const muzzleX = u(choiceOf.length) - setback;
    const journalRadius = u(AR15.gasBlock.journalRadius);
    return {
      family: 'barrel',
      solids: [roundBar('barrel', 0, muzzleX, u(AR15.barrel.radius))],
      ports: [
        { id: 'rear', mount: 'barrel', gender: 'male', pos: [0, 0, 0], normal: NEG_X, up: Y, required: true },
        {
          id: 'gas-block',
          mount: 'gas-block',
          standard: 'ar-journal-750',
          gender: 'female',
          pos: [u(choiceOf.gasPort) - setback, journalRadius, 0],
          normal: Y,
          up: X,
        },
        { id: 'muzzle', mount: 'muzzle', standard: 'rifled', gender: 'female', pos: [muzzleX, 0, 0], normal: X, up: Y },
      ],
      keepOuts: [],
      axes: [{ kind: 'bore', origin: [0, 0, 0], dir: X }],
    };
  },
};

/** A low-profile gas block clamped on the barrel's journal over the gas port; its frame sits on top of the journal. */
export const ar15GasBlock: PartFamily = {
  name: 'ar15-gas-block',
  params: {},
  build(): PartDef {
    const radius = u(AR15.gasBlock.journalRadius);
    const wall = u(AR15.gasBlock.wall);
    const half = u(AR15.gasBlock.length) / 2;
    const outer = radius + wall;
    return {
      family: 'gas-block',
      solids: [
        box('top', [-half, 0, -outer], [half, wall, outer]),
        box('right', [-half, -2 * radius, radius], [half, 0, outer]),
        box('left', [-half, -2 * radius, -outer], [half, 0, -radius]),
        box('under', [-half, -2 * radius - wall, -outer], [half, -2 * radius, outer]),
      ],
      ports: [
        {
          id: 'barrel',
          mount: 'gas-block',
          standard: 'ar-journal-750',
          gender: 'male',
          pos: [0, 0, 0],
          normal: NEG_Y,
          up: X,
          required: true,
        },
      ],
      keepOuts: [],
      axes: [],
    };
  },
};

/** The A2 birdcage flash hider, threaded on the muzzle; the gun's muzzle moves to its front. */
export const ar15FlashHider: PartFamily = {
  name: 'ar15-flash-hider',
  params: {},
  build(): PartDef {
    const length = u(AR15.flashHider.length);
    return {
      family: 'muzzle-device',
      solids: [roundBar('body', 0, length, u(AR15.flashHider.radius))],
      ports: [
        {
          id: 'base',
          mount: 'muzzle',
          standard: 'rifled',
          gender: 'male',
          pos: [0, 0, 0],
          normal: NEG_X,
          up: Y,
          required: true,
        },
        { id: 'muzzle', mount: 'muzzle', standard: 'rifled', gender: 'female', pos: [length, 0, 0], normal: X, up: Y },
      ],
      keepOuts: [],
      axes: [{ kind: 'bore', origin: [0, 0, 0], dir: X }],
    };
  },
};
