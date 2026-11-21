import type { PartDef } from '@skelly/construct/assembly/schema.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { GunPartFamily } from '../actionRoles.ts';
import { choice } from '../antiMateriel/common.ts';
import { roundedTriggerGuardSolids, TRIGGER_BLADE_ID } from '../roundedTriggerGuard.ts';
import { SKS_PROPORTIONS as P } from '../sksProportions.ts';
import { mountPort } from './joints.ts';
import { block } from './shapes.ts';

/**
 * The trigger group let into the stock's belly under the receiver: its housing, the rounded guard and trigger, and the
 * fixed ten-round magazine ahead of the guard, loaded from above through the open action.
 */
export const sksLower: GunPartFamily = {
  name: 'sks-lower',
  params: { integral: choice('yes') },
  build(): PartDef {
    const { housing, finger, guard, trigger, triggerHalfWidthU, magazine, magazineHalfWidthU } = P.lower;
    const fingerBox = boxFromMinMax(
      [finger.x[0], finger.y[0], -finger.halfWidthU],
      [finger.x[1], finger.y[1], finger.halfWidthU],
    );
    const reach = guard.wallU + guard.clearanceU;
    return {
      family: 'lower',
      solids: [
        block('housing', housing),
        ...roundedTriggerGuardSolids(fingerBox, {
          x: [finger.x[0] - reach, finger.x[1] + reach],
          y: [finger.y[0] - guard.wallU, finger.y[1] + guard.wallU],
          innerX: [finger.x[0] - guard.clearanceU, finger.x[1] + guard.clearanceU],
          z: [-guard.halfWidthU, guard.halfWidthU],
          corner: guard.cornerU,
        }),
        {
          id: TRIGGER_BLADE_ID,
          kind: 'extruded-polygon',
          profile: trigger,
          z: [-triggerHalfWidthU, triggerHalfWidthU],
        },
        { id: 'magazine', kind: 'extruded-polygon', profile: magazine, z: [-magazineHalfWidthU, magazineHalfWidthU] },
      ],
      ports: [mountPort('lower')],
      keepOuts: [{ id: 'trigger-finger', kind: 'trigger-finger', box: fingerBox }],
      axes: [],
    };
  },
};
