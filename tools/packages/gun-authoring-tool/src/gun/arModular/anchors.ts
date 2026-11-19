import type { GunAnchorDeclarations } from '../anchors.ts';
import {
  ejectionAnchor,
  gripHold,
  magwellAnchor,
  muzzlePortAnchor,
  rearFaceButt,
  undersideSupport,
  X,
  Y,
} from '../partAnchors.ts';
import { ar15Barrel, ar15FlashHider } from './barrel.ts';
import { ar15Grip } from './grip.ts';
import { ar15Handguard } from './handguard.ts';
import { ar15Lower } from './lower.ts';
import { ar15Stock } from './stock.ts';
import { ar15Upper } from './upper.ts';

/** Where the hands, shoulder, muzzle, magazine and spent cases meet the modular AR, by family. */
export const AR_MODULAR_ANCHORS: GunAnchorDeclarations = {
  [ar15Grip.name]: { holdRank: 'grip', anchors: gripHold(['body'], () => ({ forward: X, up: Y })) },
  [ar15Lower.name]: { anchors: magwellAnchor },
  [ar15Upper.name]: { anchors: ejectionAnchor },
  [ar15Barrel.name]: { anchors: muzzlePortAnchor },
  [ar15FlashHider.name]: { anchors: muzzlePortAnchor },
  [ar15Handguard.name]: { anchors: (_params, part) => undersideSupport(part, 0.6) },
  [ar15Stock.name]: { anchors: (_params, part) => rearFaceButt(part) },
};
