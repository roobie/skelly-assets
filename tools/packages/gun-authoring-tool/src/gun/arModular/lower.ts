import type { KeepOut, PartDef, PartFamily, PortDef } from '@skelly/construct/assembly/schema.ts';
import { boxFromMinMax, validateExtrudedPolygon } from '@skelly/construct/shapes/geometry.ts';
import type { Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, NEG_X, NEG_Y, X, Y } from '../antiMateriel/common.ts';
import { TRIGGER_BLADE_ID } from '../roundedTriggerGuard.ts';
import { type ArFrame, type ArFrameTable, familyName, outlineU, u } from './frame.ts';

type LowerTable = ArFrameTable['lower'];

/** The lower's outline in u: where its body, well and grip boss stand. */
const lowerLayout = (L: LowerTable) => ({
  partingY: u(L.partingY),
  halfWidth: u(L.halfWidth),
  towerRearX: u(L.towerRearX),
  towerFrontX: u(L.towerFrontX),
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

/**
 * The buffer tower and the body behind the magazine well, under the upper's parting line. Over the trigger guard the
 * body's floor is the guard's top bar, so the opening reaches up to the body's traced lower edge as the forging's does;
 * the sides come down past the bar.
 */
const frameSolids = (L: LowerTable, at: LowerLayout): Solid[] => {
  const towerHalf = u(L.towerHalfWidth);
  const [guardRearX, guardHalf, bar] = [u(L.triggerGuard.rearX), u(L.triggerGuard.halfWidth), u(L.triggerGuard.bar)];
  const { bodyBottomY, halfWidth } = at;
  const body: Vec2[] = [
    [at.bodyRearX, u(L.towerBottomY)],
    [u(L.bodyChamferX), bodyBottomY],
    [guardRearX, bodyBottomY],
    [guardRearX, at.partingY],
    [at.bodyRearX, at.partingY],
  ];
  const grip = at.gripMount;
  const floorY = bodyBottomY + bar;
  return [
    box('tower', [at.towerRearX, u(L.towerBottomY), -towerHalf], [at.towerFrontX, u(L.towerTopY), towerHalf]),
    { id: 'body', kind: 'extruded-polygon', profile: body, z: [-halfWidth, halfWidth] },
    box('body-over-guard', [guardRearX, floorY, -halfWidth], [at.well.rearX, at.partingY, halfWidth]),
    box('body-over-guard-right', [guardRearX, bodyBottomY, guardHalf], [at.well.rearX, floorY, halfWidth]),
    box('body-over-guard-left', [guardRearX, bodyBottomY, -halfWidth], [at.well.rearX, floorY, -guardHalf]),
    // The grip screws into this boss, level with the grip's top.
    box('grip-boss', [grip.bossRearX, grip.y, -halfWidth], [grip.x, bodyBottomY, halfWidth]),
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

/**
 * The finger's room inside the guard, and the four bars around it in the shape `trigger-guard` (gun/rules.ts) measures.
 * The opening's top is the table's `topY`; the top bar stands above it, in the body's floor.
 */
const triggerGuard = (g: LowerTable['triggerGuard']): { readonly finger: KeepOut; readonly solids: Solid[] } => {
  const [rearX, frontX, bottomY, topY] = [u(g.rearX), u(g.frontX), u(g.bottomY), u(g.topY)];
  const [bar, clearance, half, fingerHalf] = [u(g.bar), u(g.fingerClearance), u(g.halfWidth), u(g.fingerHalfWidth)];
  const finger: KeepOut = {
    id: 'trigger-finger',
    kind: 'trigger-finger',
    box: boxFromMinMax(
      [rearX + bar + clearance, bottomY + bar, -fingerHalf],
      [frontX - bar - clearance, topY, fingerHalf],
    ),
  };
  return {
    finger,
    solids: [
      box('trigger-guard-top', [rearX, topY, -half], [frontX, topY + bar, half]),
      box('trigger-guard-rear', [rearX, bottomY, -half], [rearX + bar, topY + bar, half]),
      box('trigger-guard-front', [frontX - bar, bottomY, -half], [frontX, topY + bar, half]),
      box('trigger-guard-bottom', [rearX, bottomY, -half], [frontX, bottomY + bar, half]),
    ],
  };
};

/**
 * The trigger blade swept along its midline from where it leaves the receiver to its tip, one convex segment per stretch
 * of the midline, so the curve the finger pulls on keeps its bow. It is a smooth piece of the voxelized lower, since
 * the eye reads a trigger by its outline, and its first segment stands on the guard's top bar. The segments are drawn
 * as one mesh, so their joints show no seam.
 */
const triggerBlade = (t: LowerTable['trigger']): Solid[] => {
  const midline = outlineU(t.midline);
  const halfThickness = u(t.thickness) / 2;
  const half = u(t.halfWidth);
  const unit = ([x, y]: Vec2): Vec2 => [x / Math.hypot(x, y), y / Math.hypot(x, y)];
  // The normal on the right of each stretch, walking from the receiver to the tip.
  const stretchRights = midline.slice(1).map(([x, y], i) => unit([y - midline[i]![1], midline[i]![0] - x]));
  // At each joint the side lines of the two stretches meet, so the blade stays as thick through its bends; it leaves
  // the receiver level, flush under the guard's top bar.
  const sides = midline.map(([x, y], i) => {
    const before = stretchRights[Math.max(i - 1, 0)]!;
    const after = stretchRights[Math.min(i, stretchRights.length - 1)]!;
    const joint: Vec2 = i === 0 ? [Math.sign(after[0]), 0] : unit([before[0] + after[0], before[1] + after[1]]);
    const reach = halfThickness / (joint[0] * after[0] + joint[1] * after[1]);
    return {
      right: [x + joint[0] * reach, y + joint[1] * reach] as Vec2,
      left: [x - joint[0] * reach, y - joint[1] * reach] as Vec2,
    };
  });
  return sides.slice(1).map((end, i): Solid => {
    const start = sides[i]!;
    const profile: Vec2[] = [start.right, end.right, end.left, start.left];
    const error = validateExtrudedPolygon(profile, [-half, half]);
    if (error) {
      throw new Error(`Trigger blade segment ${i}: ${error}`);
    }
    return {
      id: `${TRIGGER_BLADE_ID}-${i}`,
      kind: 'extruded-polygon',
      profile,
      z: [-half, half],
      display: { mergeGroup: TRIGGER_BLADE_ID, smooth: i === 0 ? { seat: Y } : {} },
    };
  });
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
      solids: [...frameSolids(L, at), ...wellSolids(at), ...guard.solids, ...triggerBlade(L.trigger)],
      ports,
      keepOuts: [guard.finger, magazinePath],
      axes: [],
      tags: [VOXEL_DETAIL],
      features: [
        { name: 'well-wall', size: u(L.well.wall), disposition: { kind: 'detail' } },
        { name: 'trigger-guard-bar', size: u(L.triggerGuard.bar), disposition: { kind: 'detail' } },
        { name: 'trigger-blade', size: u(L.trigger.thickness), disposition: { kind: 'smooth' } },
      ],
    };
  },
});
