import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { box, choice, NEG_X, NEG_Y, X, Y } from '../antiMateriel/common.ts';
import { sightAxis } from '../sightAxis.ts';
import { TOO_SMALL_TO_VOXELIZE } from '../tooSmallToVoxelize.ts';
import { barrelJournalRadius, journalStandard } from './barrel.ts';
import { type ArFrame, chosen, familyName, u } from './frame.ts';
import { journalClamp } from './shapes.ts';

/**
 * The A2 front sight base, by the upper top whose rear sight it is made to meet. It clamps the barrel's journal over
 * the gas port in place of a gas block, carries the front post between its ears, and holds the front of a drop-in
 * handguard at its rear face. Its frame sits on top of the journal at the gas port. It is drawn smooth, since its ears
 * and post are thinner than a voxel.
 */
export const arFrontSightBase = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'front-sight-base'),
  params: { height: choice(...Object.keys(frame.table.frontSightBase.raise)) },
  build(params): PartDef {
    const F = frame.table.frontSightBase;
    const radius = barrelJournalRadius(frame);
    const raise = u(chosen(F.raise, params.height));
    const [wall, half, lugHalf] = [u(F.wall), u(F.halfWidth), u(F.lugHalfWidth)];
    const rearX = -u(F.rearOfPort);
    const ringFrontX = rearX + u(F.ringLength);
    const frontX = rearX + u(F.length);
    const towerRearX = rearX + (u(F.ringLength) - u(F.towerLength)) / 2;
    const towerFrontX = towerRearX + u(F.towerLength);
    const postX = (towerRearX + towerFrontX) / 2;
    const deckY = u(F.deckAboveJournal) + raise;
    const postTipY = u(F.postTipY) + raise;
    const underY = -2 * radius - wall;
    const postHalf = u(F.postWidth) / 2;
    const earInner = lugHalf - u(F.earThickness);
    return {
      family: 'front-sight-base',
      solids: [
        ...journalClamp((side) => `ring-${side}`, rearX, ringFrontX, radius, wall, half),
        box('bayonet-lug', [ringFrontX, underY, -lugHalf], [frontX, -2 * radius, lugHalf]),
        box('tower', [towerRearX, wall, -lugHalf], [towerFrontX, deckY, lugHalf]),
        box('ear-right', [towerRearX, deckY, earInner], [towerFrontX, postTipY, lugHalf]),
        box('ear-left', [towerRearX, deckY, -lugHalf], [towerFrontX, postTipY, -earInner]),
        box('post', [postX - postHalf, deckY, -postHalf], [postX + postHalf, postTipY, postHalf]),
        box('sling-loop', [towerRearX, u(F.bottomY), -lugHalf], [towerFrontX, underY, lugHalf]),
      ],
      ports: [
        {
          id: 'barrel',
          mount: 'gas-block',
          standard: journalStandard(frame.table.barrel.journal.choice),
          gender: 'male',
          pos: [0, 0, 0],
          normal: NEG_Y,
          up: X,
          required: true,
        },
        {
          id: 'handguard-cap',
          mount: 'handguard-cap',
          gender: 'female',
          pos: [rearX, -radius, 0],
          normal: NEG_X,
          up: Y,
        },
      ],
      keepOuts: [],
      axes: [sightAxis('front', { origin: [postX, postTipY, 0], dir: X, referenceDistanceU: 4 })],
      tags: TOO_SMALL_TO_VOXELIZE,
    };
  },
});
