import type { PartDef } from '@skelly/construct/assembly/schema.ts';
import { boxFromMinMax, localSolidBounds } from '@skelly/construct/shapes/geometry.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { ACTION_CARRIER_ROLES, type GunPartFamily } from '../actionRoles.ts';
import { box, choice, NEG_X } from '../antiMateriel/common.ts';
import { HAND_CLEARANCE_U } from '../handClearance.ts';
import { octagonalProfile, octagonalSectionChamfered } from '../octagon.ts';
import { buildReceiverSection, subtractAxialPockets } from '../receiverSection.ts';
import { SKS_PROPORTIONS as P } from '../sksProportions.ts';
import { mountPort, sitePorts } from './joints.ts';

const { receiver: R, carrier: C } = P;

/** The knob's id: the action rules know a charging handle by it. */
export const SKS_KNOB_ID = 'charging-handle';

/**
 * The receiver: a closed box under the top cover at the rear, open ahead of it over the carrier and down the right wall
 * the knob runs along. The barrel's breech stands inside its front wall.
 */
export const sksReceiver: GunPartFamily = {
  name: 'sks-receiver',
  // Stripper clips load the magazine from above, through the open action.
  params: { feed: choice('top') },
  build(): PartDef {
    const front = R.x[1];
    const bore = P.barrel.radiusU;
    const shell = buildReceiverSection({
      id: 'receiver',
      outline: octagonalSectionChamfered(R.y, [-R.halfWidthU, R.halfWidthU], R.chamferU),
      x: R.x,
      wall: R.wallU,
      cavity: { y: R.cavity.y, z: [-R.cavity.halfWidthU, R.cavity.halfWidthU] },
      internalPockets: [{ x: [front - 2 * R.wallU, front + R.wallU], y: [-bore, bore], z: [-bore, bore] }],
    });
    return {
      family: 'receiver',
      solids: shell.flatMap((solid) => subtractAxialPockets(solid, [R.window])),
      ports: sitePorts('receiver'),
      // Spent cases leave through the window off the right wall; the carrier and its knob run through it by design.
      keepOuts: [
        {
          id: 'ejection',
          kind: 'ejection',
          box: boxFromMinMax(
            [R.ejection.x[0], R.ejection.y[0], R.halfWidthU],
            [R.ejection.x[1], R.ejection.y[1], R.halfWidthU + R.ejection.reachU],
          ),
          allowPort: 'bolt-carrier',
        },
      ],
      axes: [],
    };
  },
};

/**
 * The bolt carrier in battery, its knob standing off its right side. It runs back through its stroke under the top
 * cover, so the path behind the knob, with room for the fingers around it, is kept clear under the knob's own name.
 */
export const sksBoltCarrier: GunPartFamily = {
  name: 'sks-bolt-carrier',
  params: {},
  build(): PartDef {
    const knob: Solid = {
      id: SKS_KNOB_ID,
      kind: 'extruded-polygon',
      profile: octagonalProfile(C.knob.radiusU, C.knob.centre),
      z: C.knob.z,
    };
    const [min, max] = localSolidBounds(knob);
    return {
      family: 'bolt-carrier',
      solids: [box('carrier', [C.x[0], C.y[0], -C.halfWidthU], [C.x[1], C.y[1], C.halfWidthU]), knob],
      ports: [mountPort('bolt-carrier')],
      keepOuts: [
        {
          id: SKS_KNOB_ID,
          kind: 'clearance',
          box: boxFromMinMax(
            [min[0] - C.travelU - HAND_CLEARANCE_U, min[1] - HAND_CLEARANCE_U, min[2]],
            [min[0], max[1] + HAND_CLEARANCE_U, max[2] + HAND_CLEARANCE_U],
          ),
        },
      ],
      axes: [],
      tags: [ACTION_CARRIER_ROLES.sks, VOXEL_DETAIL],
      motion: { stages: [{ kind: 'slide', direction: NEG_X, travel: C.travelU }] },
    };
  },
};
