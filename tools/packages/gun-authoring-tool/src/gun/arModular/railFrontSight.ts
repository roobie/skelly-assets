import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { NEG_Y, X } from '../antiMateriel/common.ts';
import { RAIL_FRONT_SIGHT_REFERENCE_U, railFrontSightSolids } from '../railFrontSight.ts';
import { sightAxis } from '../sightAxis.ts';
import { TOO_SMALL_TO_VOXELIZE } from '../tooSmallToVoxelize.ts';
import { type ArFrame, familyName, u } from './frame.ts';

/**
 * The fixed post a free-float handguard carries on its top rail, its tip on the sight line the frame's rail rear sight
 * is made for, where the generic rail front sight stands on another frame's line. Its frame is the rail's top. It is
 * drawn smooth, since its post is thinner than a voxel.
 */
export const arRailFrontSight = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'rail-front-sight'),
  params: {},
  build(): PartDef {
    const { postAboveRail, clamp, postWidth } = frame.table.railFrontSight;
    const postU = u(postAboveRail);
    const shape = {
      base: { halfLengthU: u(clamp.length) / 2, heightU: u(clamp.height), halfWidthU: u(clamp.width) / 2 },
      post: { halfLengthU: u(postWidth) / 2, halfWidthU: u(postWidth) / 2 },
    };
    return {
      family: 'rail-front-sight',
      solids: railFrontSightSolids(shape, postU),
      ports: [{ id: 'base', mount: 'rail-top', gender: 'male', pos: [0, 0, 0], normal: NEG_Y, up: X, required: true }],
      keepOuts: [],
      axes: [sightAxis('front', { origin: [0, postU, 0], dir: X, referenceDistanceU: RAIL_FRONT_SIGHT_REFERENCE_U })],
      tags: TOO_SMALL_TO_VOXELIZE,
    };
  },
});
