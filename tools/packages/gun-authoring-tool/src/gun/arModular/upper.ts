import type { KeepOut, PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, NEG_Y, X, Y } from '../antiMateriel/common.ts';
import { type ArFrame, type ArFrameTable, familyName, u } from './frame.ts';
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

/**
 * The flat-top upper receiver: the body over the lower, its top rail, the forward assist and brass deflector on the
 * right, and the ejection port between them. Its frame is the gun's; the barrel and the handguard's barrel nut meet it
 * at its front face, on the bore.
 */
export const arUpper = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'upper'),
  params: {},
  build(): PartDef {
    const { upper, lower, rail: railTable } = frame.table;
    const halfWidth = u(upper.halfWidth);
    const topY = u(upper.topY);
    const partingY = u(lower.partingY);
    const rail = picatinnyRail(railTable, u(upper.rail.rearX), 0, topY, u(upper.rail.topY));
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
        ...rail.solids,
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
        rail.port,
      ],
      keepOuts: [ejection],
      axes: [],
      tags: [VOXEL_DETAIL],
      features: [
        ...rail.features,
        { name: 'brass-deflector', size: u(upper.brassDeflector.stand), disposition: { kind: 'detail' } },
      ],
    };
  },
});
