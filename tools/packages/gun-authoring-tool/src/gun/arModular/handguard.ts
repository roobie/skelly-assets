import type { PartDef, PartFamily, PortDef } from '@skelly/construct/assembly/schema.ts';
import { VOXEL_DETAIL } from '@skelly/thing-export/glb.ts';
import { box, choice, NEG_X, X, Y } from '../antiMateriel/common.ts';
import { type ArFrame, chosen, familyName, outlineU, u } from './frame.ts';
import { picatinnyRail } from './rail.ts';
import { boxSleeve } from './shapes.ts';

/** A handguard's four walls round the barrel from `fromX` to `toX`, `wall` thick inside its outer section. */
const handguardWalls = (fromX: number, toX: number, topY: number, bottomY: number, half: number, wall: number) => [
  box('top', [fromX, topY - wall, -half], [toX, topY, half]),
  box('bottom', [fromX, bottomY, -half], [toX, bottomY + wall, half]),
  box('right', [fromX, bottomY + wall, half - wall], [toX, topY - wall, half]),
  box('left', [fromX, bottomY + wall, -half], [toX, topY - wall, -half + wall]),
];

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
    const rail = picatinnyRail(frame.table.rail, 0, length, topY, u(H.railTopY));
    const skirtHalf = u(H.skirtHalfWidth);
    return {
      family: 'handguard',
      solids: [
        ...handguardWalls(0, length, topY, bottomY, half, wall),
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
        ...boxSleeve('delta-ring', 0, ringLength, bore, [-ringHalf, ringHalf], ringHalf),
        ...handguardWalls(ringLength, span, half, -half, half, wall),
        ...boxSleeve('cap', capRearX, span, bore, [-half + wall, half - wall], half - wall),
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
