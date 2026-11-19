import type { KeepOut, PartDef, PartFamily, PartFeature, PortDef } from '@skelly/construct/assembly/schema.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { ClipPlane, Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, choice, NEG_Y, X, Y } from '../antiMateriel/common.ts';
import { RAIL_REAR_SIGHT_EYE_RELIEF_U } from '../railRearSight.ts';
import { sightAxis } from '../sightAxis.ts';
import { arActionLayout, carrierPorts, chargingHandlePorts } from './action.ts';
import { type ArFrame, type ArFrameTable, chosen, familyName, outlineU, u } from './frame.ts';
import { portCoverHinge } from './portCover.ts';
import { picatinnyRail } from './rail.ts';

/** A housing's traced side outline and how far it stands out of the receiver's side. */
type SideOutline = ArFrameTable['upper']['forwardAssist'];

/** A housing standing out of the right side of the receiver, whose side is `halfWidth` off the bore. */
const rightSideBoss = (id: string, outline: SideOutline, halfWidth: number): Solid =>
  box(
    id,
    [u(outline.rearX), u(outline.bottomY), halfWidth],
    [u(outline.frontX), u(outline.topY), halfWidth + u(outline.stand)],
  );

/** What a receiver top adds to the upper: its solids, the ports it offers, its sight and its thin features. */
interface UpperTop {
  readonly solids: readonly Solid[];
  readonly ports: readonly PortDef[];
  readonly axes: PartDef['axes'];
  readonly features: readonly PartFeature[];
}

/** The flat-top: a full-length top rail for optics and rail sights. */
const flatTop = (frame: ArFrame): UpperTop => {
  const { upper, rail: railTable } = frame.table;
  const rail = picatinnyRail(railTable, u(upper.rail.rearX), 0, u(upper.rail.topY), 'teeth-only');
  return { solids: rail.solids, ports: [rail.port], axes: [], features: rail.features };
};

/** A side outline of the handle extruded between two depths across the receiver. */
const handlePiece = (id: string, profile: readonly Vec2[], z: readonly [number, number], clip?: ClipPlane): Solid => ({
  id,
  kind: 'extruded-polygon',
  profile,
  z,
  ...(clip ? { clip: [clip], display: { bevel: false } } : {}),
});

/**
 * A handle piece that stands over the sight line, with the channel cut along its top that the eye looks down: whole
 * below the channel's floor, and above it a cheek either side of the channel. A piece wholly on one side of the floor
 * has nothing on the other, so that side's clip would be empty and is left out.
 */
const channelled = (
  id: string,
  profile: readonly Vec2[],
  floorY: number,
  channelHalf: number,
  half: number,
): Solid[] => {
  const ys = profile.map(([, y]) => y);
  return [
    ...(Math.min(...ys) < floorY ? [handlePiece(id, profile, [-half, half], { normal: Y, offset: floorY })] : []),
    ...(Math.max(...ys) > floorY
      ? [
          handlePiece(`${id}-right`, profile, [channelHalf, half], { normal: NEG_Y, offset: -floorY }),
          handlePiece(`${id}-left`, profile, [-half, -channelHalf], { normal: NEG_Y, offset: -floorY }),
        ]
      : []),
  ];
};

/**
 * The A2 carry handle forged on the receiver: its base on the receiver's top, the rear sight housing at its rear, with
 * the aperture plate flipping between two ears, the bar over the hand hole, and the front leg. Its aperture is the
 * gun's rear sight, and the eye looks from it down a channel in the handle's top, the channel as wide as the slot the
 * aperture flips in.
 */
const carryHandle = (frame: ArFrame): UpperTop => {
  const h = frame.table.upper.carryHandle;
  const half = u(h.halfWidth);
  const [apertureX, apertureY, apertureHalf, slotHalf] = [
    u(h.apertureX),
    u(h.apertureY),
    u(h.apertureHalfHeight),
    u(h.slotHalfWidth),
  ];
  const apertureHalfThickness = u(h.apertureThickness) / 2;
  const earBottomY = u(h.earBottomY);
  // The plate round the hole the eye looks through: above, below, and either side of it.
  const hole = u(h.apertureRadius);
  const channelFloorY = apertureY - hole;
  const apertureFrame: [string, [number, number], [number, number]][] = [
    ['top', [apertureY + hole, apertureY + apertureHalf], [-slotHalf, slotHalf]],
    ['bottom', [earBottomY, apertureY - hole], [-slotHalf, slotHalf]],
    ['right', [apertureY - hole, apertureY + hole], [hole, slotHalf]],
    ['left', [apertureY - hole, apertureY + hole], [-slotHalf, -hole]],
  ];
  return {
    solids: [
      handlePiece('handle-base', outlineU(h.base), [-half, half]),
      handlePiece('rear-sight-housing', outlineU(h.housing), [-half, half]),
      handlePiece('rear-sight-ear-right', outlineU(h.ears), [slotHalf, half]),
      handlePiece('rear-sight-ear-left', outlineU(h.ears), [-half, -slotHalf]),
      ...channelled('rear-sight-housing-front', outlineU(h.housingFront), channelFloorY, slotHalf, half),
      ...channelled('handle-bar', outlineU(h.bar), channelFloorY, slotHalf, half),
      handlePiece('handle-front-leg', outlineU(h.frontLeg), [-half, half]),
      ...apertureFrame.map(([id, [bottom, top], [right, left]]) =>
        box(
          `rear-sight-aperture-${id}`,
          [apertureX - apertureHalfThickness, bottom, right],
          [apertureX + apertureHalfThickness, top, left],
          { display: { smooth: { seat: Y } } },
        ),
      ),
    ],
    ports: [],
    axes: [
      sightAxis('rear', {
        origin: [apertureX, apertureY, 0],
        dir: X,
        referenceDistanceU: RAIL_REAR_SIGHT_EYE_RELIEF_U,
      }),
    ],
    features: [
      { name: 'rear-sight-ear', size: half - slotHalf, disposition: { kind: 'detail' } },
      { name: 'sight-channel-wall', size: half - slotHalf, disposition: { kind: 'detail' } },
      { name: 'handle-bar', size: u(h.barDepth), disposition: { kind: 'detail' } },
      { name: 'rear-sight-aperture', size: 2 * apertureHalfThickness, disposition: { kind: 'smooth' } },
    ],
  };
};

const UPPER_TOPS = { 'flat-top': flatTop, 'carry-handle': carryHandle } as const;

/**
 * The receiver's body as a shell round the action: the carrier's bore from the rear face to the bolt face, cut through
 * the right wall at the ejection port, and over it the charging handle's channel, open at the rear face. Ahead of the
 * bolt face the body is whole to the front face, where the barrel's extension sits.
 */
const receiverShell = (frame: ArFrame): Solid[] => {
  const { upper, lower } = frame.table;
  const { boreHalf: c, carrier, channel } = arActionLayout(frame);
  const [rearX, frontX, half, topY, partingY] = [
    carrier.rearX,
    carrier.boltFaceX,
    u(upper.halfWidth),
    u(upper.topY),
    u(lower.partingY),
  ];
  const port = upper.ejectionPort;
  const [portRearX, portFrontX, portBottomY, portTopY] = [u(port.rearX), u(port.frontX), u(port.bottomY), u(port.topY)];
  const [channelBottomY, channelTopY] = channel.y;
  // The traced port may run on past the bolt face, where the front of the receiver closes it.
  const aheadOfPort = portFrontX < frontX;
  return [
    box('receiver-front', [frontX, partingY, -half], [0, topY, half]),
    box('receiver-floor', [rearX, partingY, -half], [frontX, -c, c]),
    box('receiver-floor-right-rear', [rearX, partingY, c], [portRearX, -c, half]),
    ...(aheadOfPort ? [box('receiver-floor-right-front', [portFrontX, partingY, c], [frontX, -c, half])] : []),
    box('receiver-under-port', [portRearX, partingY, c], [Math.min(portFrontX, frontX), portBottomY, half]),
    box('receiver-left', [rearX, -c, -half], [frontX, c, -c]),
    box('receiver-right-rear', [rearX, -c, c], [portRearX, c, half]),
    ...(aheadOfPort ? [box('receiver-right-front', [portFrontX, -c, c], [frontX, c, half])] : []),
    box('receiver-over-port', [portRearX, portTopY, c], [Math.min(portFrontX, frontX), c, half]),
    box('receiver-web', [rearX, c, -half], [frontX, channelBottomY, half]),
    box('receiver-channel-left', [rearX, channelBottomY, -half], [channel.frontX, channelTopY, -channel.half]),
    box('receiver-channel-right', [rearX, channelBottomY, channel.half], [channel.frontX, channelTopY, half]),
    box('receiver-channel-front', [channel.frontX, channelBottomY, -half], [frontX, channelTopY, half]),
    box('receiver-roof', [rearX, channelTopY, -half], [frontX, topY, half]),
  ];
};

/**
 * The upper receiver, by its top: the body over the lower, the forward assist and brass deflector on the right, and the
 * ejection port between them, under a flat-top rail or a carry handle. Its frame is the gun's; the barrel and the
 * handguard's barrel nut meet it at its front face, on the bore. The bolt carrier, the charging handle and the port's
 * cover hang in it.
 */
export const arUpper = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'upper'),
  params: { top: choice(...Object.keys(UPPER_TOPS)) },
  build(params): PartDef {
    const { upper, lower } = frame.table;
    const halfWidth = u(upper.halfWidth);
    const partingY = u(lower.partingY);
    const top = chosen(UPPER_TOPS, params.top)(frame);
    const port = upper.ejectionPort;
    // A spent case leaves the port to the right; nothing but the cover, which opens out of its way, may stand there.
    const coverHinge = portCoverHinge(frame);
    const ejection: KeepOut = {
      id: 'ejection',
      kind: 'ejection',
      box: boxFromMinMax(
        [u(port.rearX), u(port.bottomY), halfWidth],
        [u(port.frontX), u(port.topY), halfWidth + u(port.lane)],
      ),
      allowPort: coverHinge.id,
    };
    const action = arActionLayout(frame);
    return {
      family: 'receiver',
      solids: [
        ...receiverShell(frame),
        ...top.solids,
        rightSideBoss('forward-assist', upper.forwardAssist, halfWidth),
        rightSideBoss('brass-deflector', upper.brassDeflector, halfWidth),
      ],
      ports: [
        {
          id: 'ar-upper',
          mount: 'ar-upper',
          gender: 'male',
          pos: [u(lower.pivotPinX), partingY, 0],
          normal: NEG_Y,
          up: X,
          required: true,
        },
        { id: 'barrel', mount: 'barrel', gender: 'female', pos: [0, 0, 0], normal: X, up: Y },
        { id: 'barrel-nut', mount: 'barrel-nut', gender: 'male', pos: [0, 0, 0], normal: X, up: Y },
        carrierPorts(action).upper,
        chargingHandlePorts(action).upper,
        coverHinge,
        ...top.ports,
      ],
      keepOuts: [ejection],
      axes: top.axes,
      tags: [VOXEL_DETAIL],
      features: [
        ...top.features,
        { name: 'receiver-wall', size: u(upper.wall), disposition: { kind: 'detail' } },
        { name: 'brass-deflector', size: u(upper.brassDeflector.stand), disposition: { kind: 'detail' } },
      ],
    };
  },
});
