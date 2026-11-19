import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, choice, NEG_X, NEG_Y, X, Y } from '../antiMateriel/common.ts';
import { type ArFrame, chosen, familyName, u } from './frame.ts';
import { roundBar } from './shapes.ts';

/**
 * The barrel, by its length and gas system. Only the part ahead of the upper is built: the chamber and barrel
 * extension sit inside the upper, so they never show. Lengths and the gas port are measured from the bolt face, which
 * lies the breech setback behind the upper's front face.
 */
export const arBarrel = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'barrel'),
  params: { length: choice(...Object.keys(frame.table.barrel.lengths)) },
  build(params): PartDef {
    const { barrel, gasBlock } = frame.table;
    const choiceOf = chosen(barrel.lengths, params.length);
    const setback = u(barrel.breechSetback);
    const muzzleX = u(choiceOf.length) - setback;
    return {
      family: 'barrel',
      solids: [roundBar('barrel', 0, muzzleX, u(barrel.radius))],
      ports: [
        { id: 'rear', mount: 'barrel', gender: 'male', pos: [0, 0, 0], normal: NEG_X, up: Y, required: true },
        {
          id: 'gas-block',
          mount: 'gas-block',
          standard: 'ar-journal-750',
          gender: 'female',
          pos: [u(choiceOf.gasPort) - setback, u(gasBlock.journalRadius), 0],
          normal: Y,
          up: X,
        },
        { id: 'muzzle', mount: 'muzzle', standard: 'rifled', gender: 'female', pos: [muzzleX, 0, 0], normal: X, up: Y },
      ],
      keepOuts: [],
      axes: [{ kind: 'bore', origin: [0, 0, 0], dir: X }],
    };
  },
});

/** A low-profile gas block clamped on the barrel's journal over the gas port; its frame sits on top of the journal. */
export const arGasBlock = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'gas-block'),
  params: {},
  build(): PartDef {
    const { gasBlock } = frame.table;
    const radius = u(gasBlock.journalRadius);
    const wall = u(gasBlock.wall);
    const half = u(gasBlock.length) / 2;
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
      tags: [VOXEL_DETAIL],
      features: [{ name: 'wall', size: wall, disposition: { kind: 'detail' } }],
    };
  },
});

/** The A2 birdcage flash hider, threaded on the muzzle; the gun's muzzle moves to its front. */
export const arFlashHider = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'flash-hider'),
  params: {},
  build(): PartDef {
    const { flashHider } = frame.table;
    const length = u(flashHider.length);
    return {
      family: 'muzzle-device',
      solids: [roundBar('body', 0, length, u(flashHider.radius))],
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
});
