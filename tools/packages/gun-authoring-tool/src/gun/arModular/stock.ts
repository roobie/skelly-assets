import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, NEG_X, X, Y } from '../antiMateriel/common.ts';
import { AR15, outlineU, u } from './frame.ts';
import { roundBar } from './shapes.ts';

/**
 * The carbine receiver extension: the buffer tube threaded into the lower's tower and locked by its castle nut. Its
 * frame is the tower's rear face, and it runs back from there on the bore line.
 */
export const ar15ReceiverExtension: PartFamily = {
  name: 'ar15-receiver-extension',
  params: {},
  build(): PartDef {
    const tube = AR15.receiverExtension;
    const length = u(tube.length);
    return {
      family: 'receiver-extension',
      solids: [
        roundBar('tube', -length, 0, u(tube.radius)),
        roundBar('castle-nut', -u(tube.castleNut.length), 0, u(tube.castleNut.radius)),
      ],
      ports: [
        {
          id: 'lower',
          mount: 'receiver-extension',
          standard: 'ar-tube-thread',
          gender: 'male',
          pos: [0, 0, 0],
          normal: X,
          up: Y,
          required: true,
        },
        {
          id: 'stock',
          mount: 'stock',
          standard: 'ar-tube-carbine',
          gender: 'female',
          pos: [-length, 0, 0],
          normal: NEG_X,
          up: Y,
        },
      ],
      keepOuts: [],
      axes: [],
    };
  },
};

/**
 * The collapsible carbine stock at its traced position on the tube. Its frame is the tube's end: the body's rear block
 * closes behind it, four walls wrap the tube ahead of it with a sliding fit, and the toe hangs under both.
 */
export const ar15Stock: PartFamily = {
  name: 'ar15-stock',
  params: {},
  build(): PartDef {
    const s = AR15.stock;
    const [frontX, rearX, topY, bottomY, half] = [u(s.frontX), u(s.rearX), u(s.topY), u(s.bottomY), u(s.halfWidth)];
    const bore = u(AR15.receiverExtension.radius) + u(s.tubeClearance);
    const toeHalf = u(s.toeHalfWidth);
    return {
      family: 'stock',
      solids: [
        box('butt', [rearX, bottomY, -half], [0, topY, half]),
        box('sleeve-top', [0, bore, -half], [frontX, topY, half]),
        box('sleeve-bottom', [0, bottomY, -half], [frontX, -bore, half]),
        box('sleeve-right', [0, -bore, bore], [frontX, bore, half]),
        box('sleeve-left', [0, -bore, -half], [frontX, bore, -bore]),
        { id: 'toe', kind: 'extruded-polygon', profile: outlineU(s.toe), z: [-toeHalf, toeHalf] },
      ],
      ports: [
        {
          id: 'front',
          mount: 'stock',
          standard: 'ar-tube-carbine',
          gender: 'male',
          pos: [0, 0, 0],
          normal: X,
          up: Y,
          required: true,
        },
      ],
      keepOuts: [],
      axes: [],
      tags: [VOXEL_DETAIL],
      features: [
        {
          name: 'sleeve-wall',
          size: Math.min(topY - bore, half - bore, -bore - bottomY),
          disposition: { kind: 'detail' },
        },
      ],
    };
  },
};
