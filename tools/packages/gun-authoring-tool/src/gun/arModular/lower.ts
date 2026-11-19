import type { KeepOut, PartDef, PartFamily, PortDef } from '@skelly/construct/assembly/schema.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, NEG_X, NEG_Y, X, Y } from '../antiMateriel/common.ts';
import { triggerBlade } from '../roundedTriggerGuard.ts';
import { TRIGGER_BLADE } from '../triggerGuards.ts';
import { type ArFrame, type ArFrameTable, familyName, u } from './frame.ts';

type LowerTable = ArFrameTable['lower'];

/** The lower's outline in u: where its body, well and grip boss stand. */
const lowerLayout = (L: LowerTable) => ({
  partingY: u(L.partingY),
  halfWidth: u(L.halfWidth),
  towerRearX: u(L.towerRearX),
  bodyRearX: u(L.bodyRearX),
  bodyBottomY: u(L.bodyBottomY),
  well: {
    frontX: u(L.well.frontX),
    innerFrontX: u(L.well.innerFrontX),
    rearX: u(L.well.rearX),
    innerRearX: u(L.well.innerRearX),
    frontBottomY: u(L.well.frontBottomY),
    rearBottomY: u(L.well.rearBottomY),
    innerHalfWidth: u(L.well.innerHalfWidth),
    outerHalfWidth: u(L.well.outerHalfWidth),
  },
  gripMount: { x: u(L.gripMount.x), y: u(L.gripMount.y), bossRearX: u(L.gripMount.bossRearX) },
});
type LowerLayout = ReturnType<typeof lowerLayout>;

/** The buffer tower and the body behind the magazine well, under the upper's parting line. */
const frameSolids = (L: LowerTable, at: LowerLayout): Solid[] => {
  const towerHalf = u(L.towerHalfWidth);
  const body: Vec2[] = [
    [at.bodyRearX, u(L.towerBottomY)],
    [u(L.bodyChamferX), at.bodyBottomY],
    [at.well.rearX, at.bodyBottomY],
    [at.well.rearX, at.partingY],
    [at.bodyRearX, at.partingY],
  ];
  const grip = at.gripMount;
  return [
    box('tower', [at.towerRearX, u(L.towerBottomY), -towerHalf], [at.bodyRearX, u(L.towerTopY), towerHalf]),
    { id: 'body', kind: 'extruded-polygon', profile: body, z: [-at.halfWidth, at.halfWidth] },
    // The grip screws into this boss, level with the grip's top.
    box('grip-boss', [grip.bossRearX, grip.y, -at.halfWidth], [grip.x, at.bodyBottomY, at.halfWidth]),
  ];
};

/** The well's walls: its flared mouth falls from the rear wall to the front, as the forging's does. */
const wellSolids = (at: LowerLayout): Solid[] => {
  const { well, partingY } = at;
  const side: Vec2[] = [
    [well.rearX, well.rearBottomY],
    [well.frontX, well.frontBottomY],
    [well.frontX, partingY],
    [well.rearX, partingY],
  ];
  const { innerHalfWidth: inner, outerHalfWidth: outer } = well;
  return [
    box('well-rear', [well.rearX, well.rearBottomY, -inner], [well.innerRearX, partingY, inner]),
    box('well-front', [well.innerFrontX, well.frontBottomY, -inner], [well.frontX, partingY, inner]),
    { id: 'well-right', kind: 'extruded-polygon', profile: side, z: [inner, outer] },
    { id: 'well-left', kind: 'extruded-polygon', profile: side, z: [-outer, -inner] },
  ];
};

/** The finger's room inside the guard, and the four bars around it in the shape `trigger-guard` (gun/rules.ts) measures. */
const triggerGuard = (g: LowerTable['triggerGuard']): { readonly finger: KeepOut; readonly solids: Solid[] } => {
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
 * The lower receiver, the root every other module hangs from: the buffer tower the receiver extension threads into,
 * the magazine well, the trigger guard and the grip boss. Its frame is the gun's.
 */
export const arLower = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'lower'),
  params: {},
  build(): PartDef {
    const L = frame.table.lower;
    const at = lowerLayout(L);
    const guard = triggerGuard(L.triggerGuard);
    const seat = { x: u(L.magazineSeat.x), y: u(L.magazineSeat.y) };
    const ports: PortDef[] = [
      { id: 'ar-upper', mount: 'ar-upper', gender: 'female', pos: [u(L.pivotPinX), at.partingY, 0], normal: Y, up: X },
      {
        id: 'receiver-extension',
        mount: 'receiver-extension',
        standard: 'ar-tube-thread',
        gender: 'female',
        pos: [at.towerRearX, 0, 0],
        normal: NEG_X,
        up: Y,
      },
      {
        id: 'grip',
        mount: 'grip',
        gender: 'female',
        pos: [at.gripMount.x, at.gripMount.y, 0],
        normal: NEG_Y,
        up: X,
      },
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
        [at.well.innerRearX, at.well.rearBottomY, -at.well.innerHalfWidth],
        [at.well.innerFrontX, at.partingY, at.well.innerHalfWidth],
      ),
      allowPort: 'magazine',
    };
    return {
      family: 'lower',
      solids: [...frameSolids(L, at), ...wellSolids(at), ...guard.solids],
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
});
