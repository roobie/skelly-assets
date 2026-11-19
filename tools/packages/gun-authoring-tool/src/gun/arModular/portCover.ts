import type { PartDef, PartFamily, PortDef } from '@skelly/construct/assembly/schema.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, NEG_X, X, Y } from '../antiMateriel/common.ts';
import { type ArFrame, familyName, u } from './frame.ts';

/** The port the cover hangs from on the upper: its rod, along the ejection port's bottom edge at the cover's mid-depth. */
export const portCoverHinge = (frame: ArFrame): PortDef => {
  const { upper, portCover } = frame.table;
  const port = upper.ejectionPort;
  return {
    id: 'port-cover',
    mount: 'port-cover',
    gender: 'female',
    pos: [u(port.rearX), u(port.bottomY), u(upper.halfWidth) + u(portCover.thickness) / 2],
    normal: X,
    up: Y,
    required: true,
  };
};

/**
 * The ejection port's dust cover, closed over the port on the upper's right side. Its frame is its rod at the port's
 * rear, and it turns down and out about the rod until it meets the magazine well.
 */
export const arPortCover = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'port-cover'),
  params: {},
  build(): PartDef {
    const { upper, portCover } = frame.table;
    const port = upper.ejectionPort;
    const half = u(portCover.thickness) / 2;
    return {
      family: 'port-cover',
      solids: [box('cover', [0, 0, -half], [u(port.frontX) - u(port.rearX), u(port.topY) - u(port.bottomY), half])],
      ports: [
        { id: 'upper', mount: 'port-cover', gender: 'male', pos: [0, 0, 0], normal: NEG_X, up: Y, required: true },
      ],
      keepOuts: [],
      axes: [],
      tags: [VOXEL_DETAIL],
      features: [{ name: 'cover', size: 2 * half, disposition: { kind: 'detail' } }],
      motion: { stages: [{ kind: 'hinge', axis: { from: [0, 0, 0], to: X }, angle: portCover.openAngle.deg }] },
    };
  },
});
