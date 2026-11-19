import type { KeepOut, PartDef, PartFamily, PartFeature, PortDef } from '@skelly/construct/assembly/schema.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, choice, NEG_Y, X, Y } from '../antiMateriel/common.ts';
import { GUN_PLATFORMS } from '../platforms.ts';
import { RAIL_REAR_SIGHT_EYE_RELIEF_U } from '../railRearSight.ts';
import { type ArFrame, type ArFrameTable, chosen, familyName, u } from './frame.ts';
import { picatinnyRail } from './rail.ts';

/**
 * The sight-height standard of a sight standing at the height of the named upper top. A front sight base is made for
 * one of them, since the flat-top's rear sights stand taller than the carry handle's; a rail rear sight is a generic
 * attachment with no port to say so, so the flat-top's height is its height.
 */
export const sightHeightStandard = (top: string): string => `ar-${top}`;

/** How much taller than the carry handle's a front sight base of the named sight-height standard stands, in mm. */
export const sightHeightExtraMm = (standard: string): number => {
  const dimensions = GUN_PLATFORMS.standards.get('sight-height')?.get(standard)?.dimensions;
  if (dimensions === undefined) {
    throw new Error(`no sight-height standard ${standard}`);
  }
  return dimensions.baseExtraHeight?.mm ?? 0;
};

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
  const rail = picatinnyRail(railTable, u(upper.rail.rearX), 0, u(upper.topY), u(upper.rail.topY));
  return { solids: rail.solids, ports: [rail.port], axes: [], features: rail.features };
};

/**
 * The A2 carry handle forged on the receiver: the rear sight housing at its rear, with the aperture plate flipping
 * between two ears, the bar over the hand hole, and the front leg. Its aperture is the gun's rear sight.
 */
const carryHandle = (frame: ArFrame): UpperTop => {
  const { upper } = frame.table;
  const h = upper.carryHandle;
  const [rearX, baseY, topY, half] = [u(upper.rearX), u(upper.topY), u(h.topY), u(h.halfWidth)];
  const frontX = rearX + u(h.length);
  const sightFrontX = rearX + u(h.rearSightLength);
  const [apertureY, apertureHalf, slotHalf] = [u(h.apertureY), u(h.apertureHalfHeight), u(h.slotHalfWidth)];
  const apertureX = (rearX + sightFrontX) / 2;
  const apertureHalfThickness = u(h.apertureThickness) / 2;
  const earBottomY = apertureY - apertureHalf;
  // The plate round the hole the eye looks through: above, below, and either side of it.
  const hole = u(h.apertureRadius);
  const apertureFrame: [string, [number, number], [number, number]][] = [
    ['top', [apertureY + hole, apertureY + apertureHalf], [-slotHalf, slotHalf]],
    ['bottom', [earBottomY, apertureY - hole], [-slotHalf, slotHalf]],
    ['right', [apertureY - hole, apertureY + hole], [hole, slotHalf]],
    ['left', [apertureY - hole, apertureY + hole], [-slotHalf, -hole]],
  ];
  return {
    solids: [
      box('rear-sight-housing', [rearX, baseY, -half], [sightFrontX, earBottomY, half]),
      box('rear-sight-ear-right', [rearX, earBottomY, slotHalf], [sightFrontX, topY, half]),
      box('rear-sight-ear-left', [rearX, earBottomY, -half], [sightFrontX, topY, -slotHalf]),
      ...apertureFrame.map(([id, [bottom, top], [right, left]]) =>
        box(
          `rear-sight-aperture-${id}`,
          [apertureX - apertureHalfThickness, bottom, right],
          [apertureX + apertureHalfThickness, top, left],
          { display: { smooth: { seat: Y } } },
        ),
      ),
      box('handle-bar', [sightFrontX, topY - u(h.barDepth), -half], [frontX - u(h.frontLegLength), topY, half]),
      box('handle-front-leg', [frontX - u(h.frontLegLength), baseY, -half], [frontX, topY, half]),
    ],
    ports: [
      {
        id: 'sight-height',
        mount: 'sight-height',
        standard: sightHeightStandard('carry-handle'),
        gender: 'female',
        pos: [apertureX, apertureY, 0],
        normal: X,
        up: Y,
      },
    ],
    axes: [
      { kind: 'sight', origin: [apertureX, apertureY, 0], dir: X, referenceDistanceU: RAIL_REAR_SIGHT_EYE_RELIEF_U },
    ],
    features: [
      { name: 'rear-sight-ear', size: half - slotHalf, disposition: { kind: 'detail' } },
      { name: 'rear-sight-aperture', size: 2 * apertureHalfThickness, disposition: { kind: 'smooth' } },
    ],
  };
};

const UPPER_TOPS = { 'flat-top': flatTop, 'carry-handle': carryHandle } as const;

/** The tops an upper is made with, by name; a front sight base is made for the height of one of them. */
export const UPPER_TOP_NAMES: readonly string[] = Object.keys(UPPER_TOPS);

/**
 * The upper receiver, by its top: the body over the lower, the forward assist and brass deflector on the right, and the
 * ejection port between them, under a flat-top rail or a carry handle. Its frame is the gun's; the barrel and the
 * handguard's barrel nut meet it at its front face, on the bore.
 */
export const arUpper = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'upper'),
  params: { top: choice(...UPPER_TOP_NAMES) },
  build(params): PartDef {
    const { upper, lower } = frame.table;
    const halfWidth = u(upper.halfWidth);
    const topY = u(upper.topY);
    const partingY = u(lower.partingY);
    const top = chosen(UPPER_TOPS, params.top)(frame);
    const port = upper.ejectionPort;
    // A spent case leaves the port to the right; nothing may stand in its way.
    const ejection: KeepOut = {
      id: 'ejection',
      kind: 'ejection',
      box: boxFromMinMax(
        [u(port.rearX), u(port.bottomY), halfWidth],
        [u(port.frontX), u(port.topY), halfWidth + u(port.lane)],
      ),
    };
    return {
      family: 'receiver',
      solids: [
        box('receiver-body', [u(upper.rearX), partingY, -halfWidth], [0, topY, halfWidth]),
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
        ...top.ports,
      ],
      keepOuts: [ejection],
      axes: top.axes,
      tags: [VOXEL_DETAIL],
      features: [
        ...top.features,
        { name: 'brass-deflector', size: u(upper.brassDeflector.stand), disposition: { kind: 'detail' } },
      ],
    };
  },
});
