import type { PartDef, PartFamily, PortDef } from '@skelly/construct/assembly/schema.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, NEG_X, X, Y } from '../antiMateriel/common.ts';
import { type ArFrame, familyName, u } from './frame.ts';

/** How far the cover's outer face stands off the upper's side when closed: its real thickness. */
export const portCoverFaceZ = (frame: ArFrame): number =>
  u(frame.table.upper.halfWidth) + u(frame.table.portCover.thickness);

/** The port the cover hangs from on the upper: its rod, under the ejection port's bottom edge and outboard of the cover. */
export const portCoverHinge = (frame: ArFrame): PortDef => {
  const { upper, portCover } = frame.table;
  const port = upper.ejectionPort;
  return {
    id: 'port-cover',
    mount: 'port-cover',
    gender: 'female',
    pos: [u(port.rearX), u(port.bottomY) - u(portCover.rodDrop), portCoverFaceZ(frame) + u(portCover.rodStandoff)],
    normal: X,
    up: Y,
    required: true,
  };
};

/**
 * The ejection port's dust cover, closed over the port on the upper's right side. Its frame is its rod at the port's
 * rear; it fills the port from its outer face inward, and turns out and down about the rod until its outer face rests
 * on the magazine well.
 */
export const arPortCover = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'port-cover'),
  params: {},
  build(): PartDef {
    const { portCover } = frame.table;
    const [drop, standoff] = [u(portCover.rodDrop), u(portCover.rodStandoff)];
    return {
      family: 'port-cover',
      solids: [
        box(
          'cover',
          [0, drop, -standoff - u(portCover.drawnThickness)],
          [u(portCover.length), drop + u(portCover.height), -standoff],
        ),
      ],
      ports: [
        { id: 'upper', mount: 'port-cover', gender: 'male', pos: [0, 0, 0], normal: NEG_X, up: Y, required: true },
      ],
      keepOuts: [],
      axes: [],
      tags: [VOXEL_DETAIL],
      features: [
        {
          name: 'cover',
          size: u(portCover.thickness),
          disposition: {
            kind: 'exaggerated',
            reason: 'drawn two detail voxels thick, inward of its outer face, so it reads as a lid that moves',
          },
        },
      ],
      motion: { stages: [{ kind: 'hinge', axis: { from: [0, 0, 0], to: X }, angle: portCover.openAngle.deg }] },
    };
  },
});
