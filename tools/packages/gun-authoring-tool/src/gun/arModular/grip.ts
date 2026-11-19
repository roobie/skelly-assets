import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { X, Y } from '../antiMateriel/common.ts';
import { FIRING_GRIP } from '../firingGrip.ts';
import { AR15, outlineU, u } from './frame.ts';

/**
 * The A2 pistol grip by its traced side outline. Its frame is the front of its top, which closes the trigger guard's
 * rear and screws up into the lower's grip boss.
 */
export const ar15Grip: PartFamily = {
  name: 'ar15-grip',
  params: {},
  build(): PartDef {
    const half = u(AR15.grip.halfWidth);
    return {
      family: 'grip',
      solids: [{ id: 'body', kind: 'extruded-polygon', profile: outlineU(AR15.grip.outline), z: [-half, half] }],
      ports: [{ id: 'top', mount: 'grip', gender: 'male', pos: [0, 0, 0], normal: Y, up: X, required: true }],
      keepOuts: [],
      axes: [],
      tags: [FIRING_GRIP],
    };
  },
};
