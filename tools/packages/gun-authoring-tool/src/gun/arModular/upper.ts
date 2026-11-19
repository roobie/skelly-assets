import type { KeepOut, PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, NEG_Y, X, Y } from '../antiMateriel/common.ts';
import { AR15, u } from './frame.ts';
import { picatinnyRail } from './rail.ts';

const U = AR15.upper;
const HALF_WIDTH = u(U.halfWidth);
const TOP_Y = u(U.topY);

type Mm = { readonly mm: number };
interface SideOutline {
  readonly rearX: Mm;
  readonly frontX: Mm;
  readonly bottomY: Mm;
  readonly topY: Mm;
  readonly stand: Mm;
}

/** A housing standing out of the right side of the receiver, by its traced side outline. */
const rightSideBoss = (id: string, outline: SideOutline): Solid =>
  box(
    id,
    [u(outline.rearX), u(outline.bottomY), HALF_WIDTH],
    [u(outline.frontX), u(outline.topY), HALF_WIDTH + u(outline.stand)],
  );

/**
 * The flat-top AR-15 upper receiver: the body over the lower, its top rail, the forward assist and brass deflector on
 * the right, and the ejection port between them. Its frame is the gun's; the barrel and the handguard's barrel nut
 * meet it at its front face, on the bore.
 */
export const ar15Upper: PartFamily = {
  name: 'ar15-upper',
  params: {},
  build(): PartDef {
    const partingY = u(AR15.lower.partingY);
    const body: Vec2[] = [
      [u(U.rearX), partingY],
      [0, partingY],
      [0, TOP_Y],
      [u(U.shoulderX), TOP_Y],
    ];
    const rail = picatinnyRail(u(U.rail.rearX), 0, TOP_Y, u(U.rail.topY));
    const port = U.ejectionPort;
    // A spent case leaves the port to the right; nothing may stand in its way.
    const ejection: KeepOut = {
      id: 'ejection',
      kind: 'ejection',
      box: boxFromMinMax(
        [u(port.rearX), u(port.bottomY), HALF_WIDTH],
        [u(port.frontX), u(port.topY), HALF_WIDTH + u(port.lane)],
      ),
    };
    return {
      family: 'receiver',
      solids: [
        { id: 'receiver-body', kind: 'extruded-polygon', profile: body, z: [-HALF_WIDTH, HALF_WIDTH] },
        ...rail.solids,
        rightSideBoss('forward-assist', U.forwardAssist),
        rightSideBoss('brass-deflector', U.brassDeflector),
      ],
      ports: [
        {
          id: 'ar-upper',
          mount: 'ar-upper',
          gender: 'male',
          pos: [u(AR15.lower.pivotPinX), partingY, 0],
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
        { name: 'brass-deflector', size: u(U.brassDeflector.stand), disposition: { kind: 'detail' } },
      ],
    };
  },
};
