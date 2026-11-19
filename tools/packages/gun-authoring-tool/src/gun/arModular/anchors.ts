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
import { type ArFrame, familyName } from './frame.ts';

/** Where the hands, shoulder, muzzle, magazine and spent cases meet a frame's modular AR, by family. */
export const arModularAnchors = (frame: ArFrame): GunAnchorDeclarations => ({
  [familyName(frame, 'grip')]: { holdRank: 'grip', anchors: gripHold(['body'], () => ({ forward: X, up: Y })) },
  [familyName(frame, 'lower')]: { anchors: magwellAnchor },
  [familyName(frame, 'upper')]: { anchors: ejectionAnchor },
  [familyName(frame, 'barrel')]: { anchors: muzzlePortAnchor },
  [familyName(frame, 'flash-hider')]: { anchors: muzzlePortAnchor },
  [familyName(frame, 'handguard')]: { anchors: (_params, part) => undersideSupport(part, 0.6) },
  [familyName(frame, 'handguard-drop-in')]: { anchors: (_params, part) => undersideSupport(part, 0.6) },
  [familyName(frame, 'stock')]: { anchors: (_params, part) => rearFaceButt(part) },
});
