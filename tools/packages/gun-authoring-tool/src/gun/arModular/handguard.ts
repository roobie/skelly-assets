import type { PartDef, PartFamily, PortDef } from '@skelly/construct/assembly/schema.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { choice, NEG_X, X, Y } from '../antiMateriel/common.ts';
import { CHAMFER_WALL_INSET, octagonalProfile, octagonalSectionChamfered, octagonalTubeWalls } from '../octagon.ts';
import { type ArFrame, chosen, familyName, outlineU, u } from './frame.ts';
import { picatinnyRail } from './rail.ts';

/** Every handguard hangs from the barrel nut at the upper's front face. */
const barrelNutPort: PortDef = {
  id: 'barrel-nut',
  mount: 'barrel-nut',
  gender: 'female',
  pos: [0, 0, 0],
  normal: NEG_X,
  up: Y,
  required: true,
};

/**
 * A free-float handguard, by its length: a tube around the barrel and gas block that touches neither, with a full-length
 * top rail. It owns the barrel nut that threads onto the upper, and the nut's skirt shows under its rear.
 */
export const arHandguard = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'handguard'),
  params: { length: choice(...Object.keys(frame.table.handguard.lengths)) },
  build(params): PartDef {
    const H = frame.table.handguard;
    const length = u(chosen(H.lengths, params.length));
    const [wall, half, topY, bottomY] = [u(H.wall), u(H.halfWidth), u(H.outerTopY), u(H.bottomY)];
    const chamfer = u(H.chamfer);
    const rail = picatinnyRail(frame.table.rail, 0, length, u(H.railTopY), { spineBaseY: topY });
    const skirtHalf = u(H.skirtHalfWidth);
    const outer = octagonalSectionChamfered([bottomY, topY], [-half, half], chamfer);
    const inner = octagonalSectionChamfered(
      [bottomY + wall, topY - wall],
      [-half + wall, half - wall],
      chamfer - wall * CHAMFER_WALL_INSET,
    );
    return {
      family: 'handguard',
      solids: [
        ...octagonalTubeWalls('tube', outer, inner, [0, length]),
        { id: 'barrel-nut-skirt', kind: 'extruded-polygon', profile: outlineU(H.skirt), z: [-skirtHalf, skirtHalf] },
        ...rail.solids,
      ],
      ports: [barrelNutPort, rail.port],
      keepOuts: [],
      axes: [],
      tags: [VOXEL_DETAIL],
      features: [...rail.features, { name: 'tube-wall', size: wall, disposition: { kind: 'detail' } }],
    };
  },
});

/**
 * A drop-in handguard, by the gas system it is made for: the delta ring on the barrel nut holds its rear, and the front
 * sight base's cap holds its front, so it spans exactly from the upper to the base's rear face over that gas port.
 */
export const arDropInHandguard = (frame: ArFrame): PartFamily => ({
  name: familyName(frame, 'handguard-drop-in'),
  params: { gas: choice(...Object.keys(frame.table.barrel.gasPorts)) },
  build(params): PartDef {
    const { barrel, frontSightBase, dropInHandguard: D } = frame.table;
    const span = u(chosen(barrel.gasPorts, params.gas)) - u(barrel.breechSetback) - u(frontSightBase.rearOfPort);
    const [half, wall, bore] = [u(D.halfWidth), u(D.wall), u(D.boreRadius)];
    const ringLength = u(D.deltaRing.length);
    const ringHalf = u(D.deltaRing.halfWidth);
    const capRearX = span - u(D.capThickness);
    return {
      family: 'handguard',
      solids: [
        ...octagonalTubeWalls('delta-ring', octagonalProfile(ringHalf), octagonalProfile(bore), [0, ringLength]),
        ...octagonalTubeWalls('shell', octagonalProfile(half), octagonalProfile(half - wall), [ringLength, span]),
        ...octagonalTubeWalls('cap', octagonalProfile(half - wall), octagonalProfile(bore), [capRearX, span]),
      ],
      ports: [
        barrelNutPort,
        { id: 'handguard-cap', mount: 'handguard-cap', gender: 'male', pos: [span, 0, 0], normal: X, up: Y },
      ],
      keepOuts: [],
      axes: [],
      tags: [VOXEL_DETAIL],
      features: [
        { name: 'shell-wall', size: wall, disposition: { kind: 'detail' } },
        { name: 'cap', size: span - capRearX, disposition: { kind: 'detail' } },
      ],
    };
  },
});
