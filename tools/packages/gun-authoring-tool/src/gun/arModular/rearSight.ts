import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { NEG_Y, X } from '../antiMateriel/common.ts';
import { RAIL_REAR_SIGHT_EYE_RELIEF_U, railRearSightSolids } from '../railRearSight.ts';
import { sightAxis } from '../sightAxis.ts';
import { TOO_SMALL_TO_VOXELIZE } from '../tooSmallToVoxelize.ts';
import { type ArFrame, familyName, u } from './frame.ts';

/**
 * The fixed rear sight a flat-top carries on its top rail, its aperture on the sight line the flat-top front sight base
 * is made for, where the generic rail rear sight stands on another frame's line. Its frame is the rail's top. It is
 * drawn smooth, since its aperture ring is thinner than a voxel.
 */
export const arRearSight = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'rear-sight'),
  params: {},
  build(): PartDef {
    const apertureU = u(frame.table.rearSight.apertureAboveRail);
    return {
      family: 'rear-sight',
      solids: railRearSightSolids(apertureU),
      ports: [{ id: 'base', mount: 'rail-top', gender: 'male', pos: [0, 0, 0], normal: NEG_Y, up: X, required: true }],
      keepOuts: [],
      axes: [
        sightAxis('rear', { origin: [0, apertureU, 0], dir: X, referenceDistanceU: RAIL_REAR_SIGHT_EYE_RELIEF_U }),
      ],
      tags: TOO_SMALL_TO_VOXELIZE,
    };
  },
});
