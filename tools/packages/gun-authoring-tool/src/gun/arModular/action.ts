import type { PartDef, PortDef } from '@skelly/construct/assembly/schema.ts';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { ACTION_CARRIER_ROLES, ACTION_PART_ROLES, type GunPartFamily } from '../actionRoles.ts';
import { box, NEG_X, X, Y } from '../antiMateriel/common.ts';
import { octagonalPrism } from '../octagon.ts';
import { type ArFrame, familyName, u } from './frame.ts';

/** A span along one axis, low end first. */
type Span = readonly [number, number];

/**
 * Where the action stands in the upper at rest, in u in the gun frame: the bore the carrier slides in, and above it the
 * channel the charging handle's shaft slides in, which the upper is built hollow round.
 */
export interface ArActionLayout {
  /** How far the carrier's bore reaches from the bore line to each of its walls. */
  readonly boreHalf: number;
  readonly carrier: {
    readonly rearX: number;
    readonly frontX: number;
    readonly radius: number;
    /** The bolt's face, on the barrel's breech; the carrier's frame. */
    readonly boltFaceX: number;
  };
  readonly shaft: { readonly frontX: number; readonly y: Span; readonly half: number };
  readonly channel: { readonly frontX: number; readonly y: Span; readonly half: number };
}

export const arActionLayout = (frame: ArFrame): ArActionLayout => {
  const { upper, barrel, boltCarrier, chargingHandle } = frame.table;
  const boreHalf = u(upper.halfWidth) - u(upper.wall);
  const rearX = u(upper.rearX);
  const frontX = rearX + u(boltCarrier.keyLength) + u(boltCarrier.keyRoom);
  const boltFaceX = -u(barrel.breechSetback);
  if (frontX >= boltFaceX) {
    throw new Error(`${frame.name}: the carrier's front stands at or past the bolt face, so the bolt has no head`);
  }
  // The handle's shaft reaches forward to the rear of the carrier's gas key, which it draws back by.
  const shaftFrontX = rearX + u(boltCarrier.keyRoom);
  const { shaft } = chargingHandle;
  const shaftY: Span = [u(shaft.bottomY), u(shaft.bottomY) + u(shaft.depth)];
  const play = u(shaft.clearance);
  return {
    boreHalf,
    carrier: { rearX, frontX, radius: boreHalf - u(boltCarrier.clearance), boltFaceX },
    shaft: { frontX: shaftFrontX, y: shaftY, half: u(shaft.halfWidth) },
    channel: { frontX: shaftFrontX + play, y: [shaftY[0] - play, shaftY[1] + play], half: u(shaft.halfWidth) + play },
  };
};

/** The upper's port an action part mounts at, and the part's own: the part sits in the gun frame's orientation. */
const actionPorts = (id: string, mount: string, pos: Vec3): { readonly upper: PortDef; readonly part: PortDef } => ({
  upper: { id, mount, gender: 'female', pos, normal: X, up: Y, required: true },
  part: { id: 'mount', mount, gender: 'male', pos: [0, 0, 0], normal: NEG_X, up: Y, required: true },
});

/** Where the carrier mounts in the upper: at the bolt face. */
export const carrierPorts = (layout: ArActionLayout) =>
  actionPorts('bolt-carrier', 'bolt-carrier', [layout.carrier.boltFaceX, 0, 0]);

/** Where the charging handle mounts in the upper: at the upper's rear face on the bore. */
export const chargingHandlePorts = (layout: ArActionLayout) =>
  actionPorts('charging-handle', 'ar-charging-handle', [layout.carrier.rearX, 0, 0]);

/**
 * The bolt carrier group in battery: the carrier from the upper's rear face to its front, and the locked bolt's head
 * standing out of it to the bolt face. Its frame is the bolt face, and it runs back through its stroke into the buffer
 * tube.
 */
export const arBoltCarrier = (frame: ArFrame): GunPartFamily => ({
  name: familyName(frame, 'bolt-carrier'),
  params: {},
  cyclicRpm: () => frame.table.boltCarrier.cyclicRate.rpm,
  build(): PartDef {
    const layout = arActionLayout(frame);
    const { rearX, frontX, radius, boltFaceX } = layout.carrier;
    const at = (x: number): number => x - boltFaceX;
    return {
      family: 'bolt-carrier',
      solids: [
        octagonalPrism('carrier', radius, [at(rearX), at(frontX)]),
        octagonalPrism('bolt-head', u(frame.table.boltCarrier.boltRadius), [at(frontX), 0]),
      ],
      ports: [carrierPorts(layout).part],
      keepOuts: [],
      axes: [],
      tags: [ACTION_CARRIER_ROLES.ar, VOXEL_DETAIL],
      features: [{ name: 'bolt-head', size: boltFaceX - frontX, disposition: { kind: 'detail' } }],
      motion: { stages: [{ kind: 'slide', direction: NEG_X, travel: u(frame.table.boltCarrier.stroke) }] },
    };
  },
});

/**
 * The charging handle at rest: its latch across the upper's rear face and its shaft forward along the channel under
 * the rail. Its frame is the upper's rear face on the bore. It is drawn back through the carrier's stroke, so behind
 * each piece the path it is drawn back along is kept clear, under the piece's own name.
 */
export const arChargingHandle = (frame: ArFrame): GunPartFamily => ({
  name: familyName(frame, 'charging-handle'),
  params: {},
  build(): PartDef {
    const layout = arActionLayout(frame);
    const { chargingHandle: handle, boltCarrier } = frame.table;
    const rearX = layout.carrier.rearX;
    const latch = {
      x: [u(handle.rearX) - rearX, 0],
      y: [u(handle.bottomY), u(handle.topY)],
      half: u(handle.halfWidth),
    } as const;
    const { shaft: shaftLayout } = layout;
    const shaft = { x: [0, shaftLayout.frontX - rearX], y: shaftLayout.y, half: shaftLayout.half } as const;
    const stroke = u(boltCarrier.stroke);
    const pieces = { 'charging-handle': latch, shaft };
    return {
      family: 'ar-charging-handle',
      solids: Object.entries(pieces).map(([id, { x, y, half }]) => box(id, [x[0], y[0], -half], [x[1], y[1], half])),
      ports: [chargingHandlePorts(layout).part],
      keepOuts: Object.entries(pieces).map(([id, { x, y, half }]) => ({
        id,
        kind: 'clearance',
        box: boxFromMinMax([x[0] - stroke, y[0], -half], [x[0], y[1], half]),
      })),
      axes: [],
      tags: [ACTION_PART_ROLES.handle, VOXEL_DETAIL],
      features: [{ name: 'shaft', size: 2 * shaft.half, disposition: { kind: 'detail' } }],
      motion: { stages: [{ kind: 'slide', direction: NEG_X, travel: stroke }] },
    };
  },
});
