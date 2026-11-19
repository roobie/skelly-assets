import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { choice, NEG_X, NEG_Y, X, Y } from '../antiMateriel/common.ts';
import { type ArFrame, chosen, familyName, pick, u } from './frame.ts';
import { journalClamp, roundBar } from './shapes.ts';

/** The gas-block standard of a journal, by the name the frame table gives it. */
const journalStandard = (journal: string): string => `ar-journal-${journal}`;

/** The journal every barrel of the frame is turned to under its gas block, by name. */
const barrelJournal = (frame: ArFrame): string => frame.table.barrel.journal.choice;

/** The gas-block standard of the journal every barrel of the frame is turned to. */
export const barrelJournalStandard = (frame: ArFrame): string => journalStandard(barrelJournal(frame));

/** The radius of the named journal of the frame. */
const journalRadiusOf = (frame: ArFrame, journal: string): number =>
  u(chosen(frame.table.gasBlock.journals, journal)) / 2;

/** The radius of the journal every barrel of the frame is turned to under its gas block. */
export const barrelJournalRadius = (frame: ArFrame): number => u(pick(frame, frame.table.barrel.journal)) / 2;

/** The gas system, by name, that a barrel of the named length is drilled for. */
export const barrelGas = (frame: ArFrame, length: string): string =>
  chosen(frame.table.barrel.lengths, length).gas.choice;

/**
 * The barrel, by its length and gas system. Only the part ahead of the upper is built: the chamber and barrel
 * extension sit inside the upper, so they never show. Lengths and the gas port are measured from the bolt face, which
 * lies the breech setback behind the upper's front face.
 */
export const arBarrel = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'barrel'),
  params: { length: choice(...Object.keys(frame.table.barrel.lengths)) },
  build(params): PartDef {
    const { barrel } = frame.table;
    const length = chosen(barrel.lengths, params.length);
    const setback = u(barrel.breechSetback);
    const muzzleX = u(length.length) - setback;
    const gasPortX = u(pick(frame, length.gas)) - setback;
    return {
      family: 'barrel',
      solids: [roundBar('barrel', 0, muzzleX, u(barrel.radius))],
      ports: [
        { id: 'rear', mount: 'barrel', gender: 'male', pos: [0, 0, 0], normal: NEG_X, up: Y, required: true },
        {
          id: 'gas-block',
          mount: 'gas-block',
          standard: barrelJournalStandard(frame),
          gender: 'female',
          pos: [gasPortX, barrelJournalRadius(frame), 0],
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

/**
 * A low-profile gas block clamped on a journal over the gas port, by the journal it is bored for; its frame sits on top
 * of the journal.
 */
export const arGasBlock = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'gas-block'),
  params: {
    journal: { values: Object.keys(frame.table.gasBlock.journals), default: barrelJournal(frame) },
  },
  build: (params) => gasBlockDef(frame, params.journal!),
});

const gasBlockDef = (frame: ArFrame, journal: string): PartDef => {
  const { gasBlock } = frame.table;
  const radius = journalRadiusOf(frame, journal);
  const wall = u(gasBlock.wall);
  const half = u(gasBlock.length) / 2;
  return {
    family: 'gas-block',
    solids: journalClamp((side) => side, -half, half, radius, wall, radius + wall),
    ports: [
      {
        id: 'barrel',
        mount: 'gas-block',
        standard: journalStandard(journal),
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
};

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
