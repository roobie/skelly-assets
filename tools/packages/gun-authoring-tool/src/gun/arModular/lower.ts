import type { KeepOut, PartDef, PartFamily, PortDef } from '@skelly/construct/assembly/schema.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, NEG_X, NEG_Y, X, Y } from '../antiMateriel/common.ts';
import { triggerBlade } from '../roundedTriggerGuard.ts';
import { TRIGGER_BLADE } from '../triggerGuards.ts';
import { AR15, u } from './frame.ts';

const L = AR15.lower;
const PARTING_Y = u(L.partingY);
const HALF_WIDTH = u(L.halfWidth);
const TOWER_REAR_X = u(L.towerRearX);
const BODY_REAR_X = u(L.bodyRearX);
const BODY_BOTTOM_Y = u(L.bodyBottomY);
const WELL = {
  frontX: u(L.well.frontX),
  innerFrontX: u(L.well.innerFrontX),
  rearX: u(L.well.rearX),
  innerRearX: u(L.well.innerRearX),
  frontBottomY: u(L.well.frontBottomY),
  rearBottomY: u(L.well.rearBottomY),
  innerHalfWidth: u(L.well.innerHalfWidth),
  outerHalfWidth: u(L.well.outerHalfWidth),
};
const GRIP_MOUNT = { x: u(L.gripMount.x), y: u(L.gripMount.y), bossRearX: u(L.gripMount.bossRearX) };

/** The buffer tower and the body behind the magazine well, under the upper's parting line. */
const frameSolids = (): Solid[] => {
  const towerHalf = u(L.towerTopY);
  const body: Vec2[] = [
    [BODY_REAR_X, u(L.towerBottomY)],
    [u(L.bodyChamferX), BODY_BOTTOM_Y],
    [WELL.rearX, BODY_BOTTOM_Y],
    [WELL.rearX, PARTING_Y],
    [BODY_REAR_X, PARTING_Y],
  ];
  return [
    box('tower', [TOWER_REAR_X, u(L.towerBottomY), -towerHalf], [BODY_REAR_X, towerHalf, towerHalf]),
    { id: 'body', kind: 'extruded-polygon', profile: body, z: [-HALF_WIDTH, HALF_WIDTH] },
    // The grip screws into this boss, level with the grip's top.
    box('grip-boss', [GRIP_MOUNT.bossRearX, GRIP_MOUNT.y, -HALF_WIDTH], [GRIP_MOUNT.x, BODY_BOTTOM_Y, HALF_WIDTH]),
  ];
};

/** The well's walls: its flared mouth falls from the rear wall to the front, as the forging's does. */
const wellSolids = (): Solid[] => {
  const side: Vec2[] = [
    [WELL.rearX, WELL.rearBottomY],
    [WELL.frontX, WELL.frontBottomY],
    [WELL.frontX, PARTING_Y],
    [WELL.rearX, PARTING_Y],
  ];
  const { innerHalfWidth: inner, outerHalfWidth: outer } = WELL;
  return [
    box('well-rear', [WELL.rearX, WELL.rearBottomY, -inner], [WELL.innerRearX, PARTING_Y, inner]),
    box('well-front', [WELL.innerFrontX, WELL.frontBottomY, -inner], [WELL.frontX, PARTING_Y, inner]),
    { id: 'well-right', kind: 'extruded-polygon', profile: side, z: [inner, outer] },
    { id: 'well-left', kind: 'extruded-polygon', profile: side, z: [-outer, -inner] },
  ];
};

/** The finger's room inside the guard, and the four bars around it in the shape `trigger-guard` (gun/rules.ts) measures. */
const triggerGuard = (): { readonly finger: KeepOut; readonly solids: Solid[] } => {
  const g = L.triggerGuard;
  const [rearX, frontX, bottomY, topY] = [u(g.rearX), u(g.frontX), u(g.bottomY), u(g.topY)];
  const [bar, clearance, half, fingerHalf] = [u(g.bar), u(g.fingerClearance), u(g.halfWidth), u(g.fingerHalfWidth)];
  const finger: KeepOut = {
    id: 'trigger-finger',
    kind: 'trigger-finger',
    box: boxFromMinMax(
      [rearX + bar + clearance, bottomY + bar, -fingerHalf],
      [frontX - bar - clearance, topY - bar, fingerHalf],
    ),
  };
  return {
    finger,
    solids: [
      box('trigger-guard-top', [rearX, topY - bar, -half], [frontX, topY, half]),
      box('trigger-guard-rear', [rearX, bottomY, -half], [rearX + bar, topY, half]),
      box('trigger-guard-front', [frontX - bar, bottomY, -half], [frontX, topY, half]),
      box('trigger-guard-bottom', [rearX, bottomY, -half], [frontX, bottomY + bar, half]),
      // The blade hangs from the guard's top bar, which closes the finger space from above.
      triggerBlade(finger.box, TRIGGER_BLADE, topY - bar),
    ],
  };
};

/**
 * The AR-15 lower receiver, the root every other module hangs from: the buffer tower the receiver extension threads
 * into, the magazine well, the trigger guard and the grip boss. Its frame is the gun's.
 */
export const ar15Lower: PartFamily = {
  name: 'ar15-lower',
  params: {},
  build(): PartDef {
    const guard = triggerGuard();
    const seat = { x: u(L.magazineSeat.x), y: u(L.magazineSeat.y) };
    const ports: PortDef[] = [
      { id: 'ar-upper', mount: 'ar-upper', gender: 'female', pos: [u(L.pivotPinX), PARTING_Y, 0], normal: Y, up: X },
      {
        id: 'receiver-extension',
        mount: 'receiver-extension',
        standard: 'ar-tube-thread',
        gender: 'female',
        pos: [TOWER_REAR_X, 0, 0],
        normal: NEG_X,
        up: Y,
      },
      { id: 'grip', mount: 'grip', gender: 'female', pos: [GRIP_MOUNT.x, GRIP_MOUNT.y, 0], normal: NEG_Y, up: X },
      {
        id: 'magazine',
        mount: 'magazine',
        gender: 'female',
        pos: [seat.x, seat.y, 0],
        normal: NEG_Y,
        up: X,
        required: true,
      },
    ];
    // The magazine slides down out of the well; nothing but the magazine may stand in its path.
    const magazinePath: KeepOut = {
      id: 'magazine-path',
      kind: 'magazine-path',
      box: boxFromMinMax(
        [WELL.innerRearX, WELL.rearBottomY, -WELL.innerHalfWidth],
        [WELL.innerFrontX, PARTING_Y, WELL.innerHalfWidth],
      ),
      allowPort: 'magazine',
    };
    return {
      family: 'lower',
      solids: [...frameSolids(), ...wellSolids(), ...guard.solids],
      ports,
      keepOuts: [guard.finger, magazinePath],
      axes: [],
      tags: [VOXEL_DETAIL],
      features: [
        { name: 'well-wall', size: u(L.well.wall), disposition: { kind: 'detail' } },
        { name: 'trigger-guard-bar', size: u(L.triggerGuard.bar), disposition: { kind: 'detail' } },
      ],
    };
  },
};
