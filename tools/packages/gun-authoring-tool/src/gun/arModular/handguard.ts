import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, choice, NEG_X, Y } from '../antiMateriel/common.ts';
import { AR15, outlineU, u } from './frame.ts';
import { picatinnyRail } from './rail.ts';

const H = AR15.handguard;

/**
 * A free-float handguard, by its length: a tube around the barrel and gas block that touches neither, with a full-length
 * top rail. It owns the barrel nut that threads onto the upper, and the nut's skirt shows under its rear.
 */
export const ar15Handguard: PartFamily = {
  name: 'ar15-handguard',
  params: { length: choice(...Object.keys(H.lengths)) },
  build(params): PartDef {
    const length = u(H.lengths[params.length as keyof typeof H.lengths]);
    const [wall, half, topY, bottomY] = [u(H.wall), u(H.halfWidth), u(H.outerTopY), u(H.bottomY)];
    const rail = picatinnyRail(0, length, topY, u(H.railTopY));
    const skirtHalf = u(H.skirtHalfWidth);
    return {
      family: 'handguard',
      solids: [
        box('top', [0, topY - wall, -half], [length, topY, half]),
        box('bottom', [0, bottomY, -half], [length, bottomY + wall, half]),
        box('right', [0, bottomY + wall, half - wall], [length, topY - wall, half]),
        box('left', [0, bottomY + wall, -half], [length, topY - wall, -half + wall]),
        { id: 'barrel-nut-skirt', kind: 'extruded-polygon', profile: outlineU(H.skirt), z: [-skirtHalf, skirtHalf] },
        ...rail.solids,
      ],
      ports: [
        {
          id: 'barrel-nut',
          mount: 'barrel-nut',
          gender: 'female',
          pos: [0, 0, 0],
          normal: NEG_X,
          up: Y,
          required: true,
        },
        rail.port,
      ],
      keepOuts: [],
      axes: [],
      tags: [VOXEL_DETAIL],
      features: [...rail.features, { name: 'tube-wall', size: wall, disposition: { kind: 'detail' } }],
    };
  },
};
