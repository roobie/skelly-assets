import type { ExtrudedPolygonSolid, RevolvedSolid } from '@skelly/construct/shapes/solid.ts';
import type { Cartridge, MetallicCartridge } from '../ammo/cartridge.ts';
import { roundProfiles } from '../ammo/roundProfile.ts';
import { revolvedRound } from './revolvedRound.ts';
import { shotshellGeometry } from './shotshellGeometry.ts';

export interface CartridgeSolids {
  readonly round: readonly (RevolvedSolid | ExtrudedPolygonSolid)[];
  readonly case: readonly (RevolvedSolid | ExtrudedPolygonSolid)[];
}

const metallicSolids = (cartridge: MetallicCartridge): CartridgeSolids => {
  const profiles = roundProfiles(cartridge);
  return {
    round: [
      revolvedRound('case', profiles.loadedCase, 'case'),
      revolvedRound('primer', profiles.primer, 'primer'),
      revolvedRound('bullet', profiles.bullet, 'bullet'),
    ],
    case: [revolvedRound('case', profiles.firedCase, 'case'), revolvedRound('primer', profiles.primer, 'primer')],
  };
};

/** The loaded-round and fired-case solids, in millimetres, that the viewer and the GLB exporter both draw. */
export const cartridgeSolids = (cartridge: Cartridge): CartridgeSolids =>
  cartridge.kind === 'shotshell' ? shotshellGeometry(cartridge) : metallicSolids(cartridge);
