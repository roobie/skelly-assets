import type { PartDef } from '@skelly/construct/assembly/schema.ts';
import type { GunAnchorDeclarations, GunPartAnchors } from '../anchors.ts';
import {
  ejectionAnchor,
  findSolid,
  frameAt,
  gripHold,
  magwellAnchor,
  muzzlePortAnchor,
  rearFaceButt,
  tubeUndersideSupport,
  X,
  Y,
} from '../partAnchors.ts';
import { type ArFrame, familyName } from './frame.ts';

/** The middle of the charging handle's latch at its rear face, where the fingers take the T to draw it. */
const chargingHandleAnchor = (_params: Readonly<Record<string, string>>, part: PartDef): GunPartAnchors => {
  const latch = findSolid(part, 'charging-handle');
  if (latch?.kind !== 'box') {
    return {};
  }
  const { center, half } = latch.box;
  return { charging_handle: frameAt([center[0] - half[0], center[1], center[2]]) };
};

/** Where the hands, shoulder, muzzle, magazine and spent cases meet a frame's modular AR, by family. */
export const arModularAnchors = (frame: ArFrame): GunAnchorDeclarations => ({
  [familyName(frame, 'grip')]: { holdRank: 'grip', anchors: gripHold(['body'], () => ({ forward: X, up: Y })) },
  [familyName(frame, 'lower')]: { anchors: magwellAnchor },
  [familyName(frame, 'upper')]: { anchors: ejectionAnchor },
  [familyName(frame, 'charging-handle')]: { anchors: chargingHandleAnchor },
  [familyName(frame, 'barrel')]: { anchors: muzzlePortAnchor },
  [familyName(frame, 'flash-hider')]: { anchors: muzzlePortAnchor },
  [familyName(frame, 'handguard')]: { anchors: (_params, part) => tubeUndersideSupport(part, 'tube', 0.6) },
  [familyName(frame, 'handguard-drop-in')]: {
    anchors: (_params, part) => tubeUndersideSupport(part, 'shell', 0.6),
  },
  [familyName(frame, 'stock')]: { anchors: (_params, part) => rearFaceButt(part) },
});
