import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import type { Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { box, choice, NEG_X, NEG_Y, X, Y } from '../antiMateriel/common.ts';
import { sightAxis } from '../sightAxis.ts';
import { TOO_SMALL_TO_VOXELIZE } from '../tooSmallToVoxelize.ts';
import { barrelJournalRadius, journalStandard } from './barrel.ts';
import { type ArFrame, type ArFrameTable, chosen, familyName, outlineU, u } from './frame.ts';
import { journalClamp } from './shapes.ts';

type SightBaseTable = ArFrameTable['frontSightBase'];

/** Where a profile stands the post over the ring: the deck it stands on, at the station it stands at. */
interface PostFrame {
  readonly solids: readonly Solid[];
  readonly deckY: number;
  readonly postX: number;
}

/** The base's own measures every profile is placed by. */
interface Placement {
  readonly rearX: number;
  readonly ringTopY: number;
  readonly raise: number;
  readonly lugHalf: number;
  readonly earInner: number;
  readonly postTipY: number;
}

/**
 * The forged A2 triangle: a deck over the ring from the rear face to the front foot, the two struts and the rear
 * strut's foot across the frame's width, and the crown over the window as two ears with the post's slot between them.
 */
const aFrame = (F: SightBaseTable, at: Placement): PostFrame => {
  const a = F['a-frame'];
  const lift = (outline: Parameters<typeof outlineU>[0]): Vec2[] =>
    outlineU(outline).map(([x, y]): Vec2 => [at.rearX + x, at.raise + y]);
  const deckY = u(a.deckY) + at.raise;
  const across: [number, number] = [-at.lugHalf, at.lugHalf];
  const piece = (id: string, profile: Vec2[], z: readonly [number, number]): Solid => ({
    id,
    kind: 'extruded-polygon',
    profile,
    z,
  });
  return {
    solids: [
      box('deck', [at.rearX, at.ringTopY, -at.lugHalf], [at.rearX + u(a.frontFootX), deckY, at.lugHalf]),
      piece('rear-strut', lift(a.rearStrut), across),
      piece('rear-foot', lift(a.rearFoot), across),
      piece('front-strut', lift(a.frontStrut), across),
      piece('ear-right', lift(a.crown), [at.earInner, at.lugHalf]),
      piece('ear-left', lift(a.crown), [-at.lugHalf, -at.earInner]),
    ],
    deckY,
    postX: at.rearX + u(a.postX),
  };
};

/** A straight sight block over the middle of the ring, its ears standing on its deck. */
const sightBlock = (F: SightBaseTable, at: Placement): PostFrame => {
  const blockRearX = at.rearX + (u(F.ringLength) - u(F.sightBlock.length)) / 2;
  const blockFrontX = blockRearX + u(F.sightBlock.length);
  const deckY = u(F.sightBlock.deckAboveJournal) + at.raise;
  return {
    solids: [
      box('block', [blockRearX, at.ringTopY, -at.lugHalf], [blockFrontX, deckY, at.lugHalf]),
      box('ear-right', [blockRearX, deckY, at.earInner], [blockFrontX, at.postTipY, at.lugHalf]),
      box('ear-left', [blockRearX, deckY, -at.lugHalf], [blockFrontX, at.postTipY, -at.earInner]),
    ],
    deckY,
    postX: (blockRearX + blockFrontX) / 2,
  };
};

const PROFILES = { 'a-frame': aFrame, 'sight-block': sightBlock } as const;

/**
 * The front sight base, by the upper top whose rear sight it is made to meet and by the profile its post stands on. It
 * clamps the barrel's journal over the gas port in place of a gas block, carries the front post between its ears, and
 * holds the front of a drop-in handguard at its rear face. Its frame sits on top of the journal at the gas port. It is
 * drawn smooth, since its ears and post are thinner than a voxel.
 */
export const arFrontSightBase = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'front-sight-base'),
  params: {
    height: choice(...Object.keys(frame.table.frontSightBase.raise)),
    profile: choice(...Object.keys(PROFILES)),
  },
  build(params): PartDef {
    const F = frame.table.frontSightBase;
    const radius = barrelJournalRadius(frame);
    const raise = u(chosen(F.raise, params.height));
    const [wall, half, lugHalf] = [u(F.wall), u(F.halfWidth), u(F.lugHalfWidth)];
    const rearX = -u(F.rearOfPort);
    const ringFrontX = rearX + u(F.ringLength);
    const frontX = rearX + u(F.length);
    const postTipY = u(F.postTipY) + raise;
    const underY = -2 * radius - wall;
    const postHalf = u(F.postWidth) / 2;
    const placement: Placement = {
      rearX,
      ringTopY: wall,
      raise,
      lugHalf,
      earInner: lugHalf - u(F.earThickness),
      postTipY,
    };
    const { solids, deckY, postX } = chosen(PROFILES, params.profile)(F, placement);
    const loopRearX = (rearX + ringFrontX - u(F.slingLoopLength)) / 2;
    return {
      family: 'front-sight-base',
      solids: [
        ...journalClamp((side) => `ring-${side}`, rearX, ringFrontX, radius, wall, half),
        box('bayonet-lug', [ringFrontX, underY, -lugHalf], [frontX, -2 * radius, lugHalf]),
        ...solids,
        box('post', [postX - postHalf, deckY, -postHalf], [postX + postHalf, postTipY, postHalf]),
        box('sling-loop', [loopRearX, u(F.bottomY), -lugHalf], [loopRearX + u(F.slingLoopLength), underY, lugHalf]),
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
