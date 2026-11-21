import type { PartDef } from '@skelly/construct/assembly/schema.ts';
import type { Vec2 } from '@skelly/construct/shapes/solid.ts';
import type { GunPartFamily } from '../actionRoles.ts';
import { X, Y } from '../antiMateriel/common.ts';
import { muzzleBlastKeepOut } from '../muzzleBlast.ts';
import { octagonalPrism, octagonalProfile, octagonalSectionChamfered } from '../octagon.ts';
import { SKS_PROPORTIONS as P } from '../sksProportions.ts';
import { mountPort, sitePorts } from './joints.ts';
import { block } from './shapes.ts';

/** The exposed barrel from the breech to the muzzle, with the gas block and the front sight's base. */
export const sksBarrel: GunPartFamily = {
  name: 'sks-barrel',
  params: {},
  build(): PartDef {
    const { breechX, muzzleX, radiusU, gasBlock, sightBase } = P.barrel;
    return {
      family: 'barrel',
      solids: [
        octagonalPrism('barrel', radiusU, [breechX, muzzleX]),
        block('gas-block', gasBlock),
        block('front-sight-base', sightBase),
      ],
      ports: [
        mountPort('barrel'),
        ...sitePorts('barrel'),
        {
          id: 'muzzle',
          mount: 'plain-muzzle',
          standard: 'rifled',
          size: 'standard',
          gender: 'female',
          pos: [muzzleX, 0, 0],
          normal: X,
          up: Y,
        },
      ],
      keepOuts: [muzzleBlastKeepOut(muzzleX)],
      axes: [{ kind: 'bore', origin: [0, 0, 0], dir: X }],
    };
  },
};

/** The wooden cover over the gas tube, the band that holds its front, and the tube running on to the gas block. */
export const sksHandguard: GunPartFamily = {
  name: 'sks-handguard',
  params: {},
  build(): PartDef {
    const { cover, band, gasTube } = P.handguard;
    const tubeCentre: Vec2 = [gasTube.centreY, 0];
    return {
      family: 'handguard',
      solids: [
        {
          id: 'cover',
          kind: 'extruded-polygon',
          axis: 'x',
          profile: octagonalSectionChamfered(cover.y, [-cover.halfWidthU, cover.halfWidthU], cover.chamferU),
          z: cover.x,
          slot: 'furniture',
        },
        { ...block('band', band), slot: 'metal' },
        {
          id: 'gas-tube',
          kind: 'extruded-polygon',
          axis: 'x',
          profile: octagonalProfile(gasTube.radiusU, tubeCentre),
          z: gasTube.x,
          slot: 'metal',
        },
      ],
      ports: [mountPort('handguard')],
      keepOuts: [],
      axes: [],
    };
  },
};
