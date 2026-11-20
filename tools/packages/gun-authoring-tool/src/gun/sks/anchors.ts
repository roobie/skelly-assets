import type { PartDef } from '@skelly/construct/assembly/schema.ts';
import { localSolidBounds } from '@skelly/construct/shapes/geometry.ts';
import type { GunAnchorDeclarations, GunPartAnchors } from '../anchors.ts';
import { ejectionAnchor, findSolid, frameAt, muzzlePortAnchor, rearFaceButt } from '../partAnchors.ts';
import { SKS_PROPORTIONS as P } from '../sksProportions.ts';
import { tracedLine } from '../stockWood.ts';
import { SKS_KNOB_ID } from './action.ts';

/** The knob's rear face at its middle, where the fingers take it to draw the carrier back. */
const knobAnchor = (_params: Readonly<Record<string, string>>, part: PartDef): GunPartAnchors => {
  const knob = findSolid(part, SKS_KNOB_ID);
  if (knob === undefined) {
    return {};
  }
  const [min, max] = localSolidBounds(knob);
  return { charging_handle: frameAt([min[0], (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]) };
};

/** The shoulder on the butt plate, the firing hand on the wrist and the support hand under the fore-end. */
const stockAnchors = (_params: Readonly<Record<string, string>>, part: PartDef): GunPartAnchors => {
  const palm = part.axes.find((axis) => axis.kind === 'firing-grip');
  const { supportX, bottom } = P.stock;
  return {
    ...rearFaceButt(part),
    ...(palm ? { hold: frameAt(palm.origin) } : {}),
    support: frameAt([supportX, tracedLine(bottom)(supportX), 0]),
  };
};

/** Where the hands, shoulder, muzzle and spent cases meet the SKS, by family. */
export const SKS_ANCHORS: GunAnchorDeclarations = {
  'sks-receiver': { anchors: ejectionAnchor },
  'sks-bolt-carrier': { anchors: knobAnchor },
  'sks-barrel': { anchors: muzzlePortAnchor },
  'sks-stock': { holdRank: 'firing-grip-stock', anchors: stockAnchors },
};
