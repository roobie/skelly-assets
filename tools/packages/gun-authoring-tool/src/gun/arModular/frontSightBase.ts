import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import type { Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { box, choice, NEG_X, NEG_Y, X, Y } from '../antiMateriel/common.ts';
import { sightAxis } from '../sightAxis.ts';
import { TOO_SMALL_TO_VOXELIZE } from '../tooSmallToVoxelize.ts';
import { barrelJournalRadius, barrelJournalStandard } from './barrel.ts';
import { type ArFrame, type ArFrameTable, chosen, familyName, outlineU, u } from './frame.ts';
import { journalClamp } from './shapes.ts';

type SightBaseTable = ArFrameTable['frontSightBase'];

/** What a profile builds over the journal: its own solids, the station its sight is aimed at, and the ring's front. */
interface PostFrame {
  readonly solids: readonly Solid[];
  readonly postX: number;
  readonly ringFrontX: number;
}

/** The base's own measures every profile is placed by. */
interface Placement {
  readonly rearX: number;
  readonly ringTopY: number;
  readonly underY: number;
  readonly radius: number;
  readonly raise: number;
  readonly lugHalf: number;
  readonly earInner: number;
  readonly postTipY: number;
  readonly postHalf: number;
}

/**
 * The forged A2 triangle: a deck over the ring from the rear face to the front foot, the two struts across the frame's
 * width, and the crown over the window as two ears with the sight's notch between them. The ring wraps the barrel
 * forward to the front strut's foot, so the front is one face from the strut down past the barrel, its underside
 * standing for the bayonet lug. The post stands from the deck up through the window to the notch.
 */
const aFrame = (F: SightBaseTable, at: Placement): PostFrame => {
  const a = F['a-frame'];
  const lift = (outline: Parameters<typeof outlineU>[0]): Vec2[] =>
    outlineU(outline).map(([x, y]): Vec2 => [at.rearX + x, at.raise + y]);
  const deckY = u(a.deckY) + at.raise;
  const frontX = at.rearX + u(a.frontFootX);
  const postX = at.rearX + u(a.postX);
  const across: [number, number] = [-at.lugHalf, at.lugHalf];
  const piece = (id: string, profile: Vec2[], z: readonly [number, number]): Solid => ({
    id,
    kind: 'extruded-polygon',
    profile,
    z,
  });
  return {
    solids: [
      box('deck', [at.rearX, at.ringTopY, -at.lugHalf], [frontX, deckY, at.lugHalf]),
      piece('rear-strut', lift(a.rearStrut), across),
      piece('front-strut', lift(a.frontStrut), across),
      piece('ear-right', lift(a.crown), [at.earInner, at.lugHalf]),
      piece('ear-left', lift(a.crown), [-at.lugHalf, -at.earInner]),
      box('post', [postX - at.postHalf, deckY, -at.postHalf], [postX + at.postHalf, at.postTipY, at.postHalf]),
    ],
    postX,
    ringFrontX: frontX,
  };
};

/**
 * A straight sight block over the middle of the ring, the post standing on its deck between its ears, and the bayonet
 * lug under the barrel ahead of the ring.
 */
const sightBlock = (F: SightBaseTable, at: Placement): PostFrame => {
  const blockRearX = at.rearX + (u(F.sightBlock.ringLength) - u(F.sightBlock.length)) / 2;
  const blockFrontX = blockRearX + u(F.sightBlock.length);
  const deckY = u(F.sightBlock.deckAboveJournal) + at.raise;
  const postX = (blockRearX + blockFrontX) / 2;
  const ringFrontX = at.rearX + u(F.sightBlock.ringLength);
  return {
    solids: [
      box('block', [blockRearX, at.ringTopY, -at.lugHalf], [blockFrontX, deckY, at.lugHalf]),
      box('ear-right', [blockRearX, deckY, at.earInner], [blockFrontX, at.postTipY, at.lugHalf]),
      box('ear-left', [blockRearX, deckY, -at.lugHalf], [blockFrontX, at.postTipY, -at.earInner]),
      box('post', [postX - at.postHalf, deckY, -at.postHalf], [postX + at.postHalf, at.postTipY, at.postHalf]),
      box('bayonet-lug', [ringFrontX, at.underY, -at.lugHalf], [at.rearX + u(F.length), -2 * at.radius, at.lugHalf]),
    ],
    postX,
    ringFrontX,
  };
};

const PROFILES = { 'a-frame': aFrame, 'sight-block': sightBlock } as const;

/**
 * The front sight base, by the upper top whose rear sight it is made to meet and by the profile its sight stands on. It
 * clamps the barrel's journal over the gas port in place of a gas block, carries the front sight between its ears, and
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
    const postTipY = u(F.postTipY) + raise;
    const underY = -2 * radius - wall;
    const placement: Placement = {
      rearX,
      ringTopY: wall,
      underY,
      radius,
      raise,
      lugHalf,
      earInner: lugHalf - u(F.earThickness),
      postTipY,
      postHalf: u(F.postWidth) / 2,
    };
    const { solids, postX, ringFrontX } = chosen(PROFILES, params.profile)(F, placement);
    const loopRearX = (rearX + ringFrontX - u(F.slingLoopLength)) / 2;
    return {
      family: 'front-sight-base',
      solids: [
        ...journalClamp((side) => `ring-${side}`, rearX, ringFrontX, radius, wall, half),
        ...solids,
        box('sling-loop', [loopRearX, u(F.bottomY), -lugHalf], [loopRearX + u(F.slingLoopLength), underY, lugHalf]),
      ],
      ports: [
        {
          id: 'barrel',
          mount: 'gas-block',
          standard: barrelJournalStandard(frame),
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
