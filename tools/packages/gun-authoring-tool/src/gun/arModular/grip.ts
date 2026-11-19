import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { X, Y } from '../antiMateriel/common.ts';
import { FIRING_GRIP } from '../firingGrip.ts';
import { type ArFrame, familyName, outlineU, u } from './frame.ts';

/**
 * The A2 pistol grip by its side outline. Its frame is the front of its top, which closes the trigger guard's rear and
 * screws up into the lower's grip boss.
 */
export const arGrip = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'grip'),
  params: {},
  build(): PartDef {
    const { grip } = frame.table;
    const half = u(grip.halfWidth);
    return {
      family: 'grip',
      solids: [{ id: 'body', kind: 'extruded-polygon', profile: outlineU(grip.outline), z: [-half, half] }],
      ports: [{ id: 'top', mount: 'grip', gender: 'male', pos: [0, 0, 0], normal: Y, up: X, required: true }],
      keepOuts: [],
      axes: [],
      tags: [FIRING_GRIP],
    };
  },
});
