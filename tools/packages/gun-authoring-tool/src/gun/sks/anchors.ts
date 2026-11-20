import type { PartDef } from '@skelly/construct/assembly/schema.ts';
import { localSolidBounds } from '@skelly/construct/shapes/geometry.ts';
import type { GunAnchorDeclarations, GunPartAnchors } from '../anchors.ts';
import { ejectionAnchor, findSolid, frameAt, muzzlePortAnchor, stockAnchors } from '../partAnchors.ts';
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

/**
 * Any stock's butt and hold, and the support hand under the fore-end, since the SKS's stock is its fore-end too. The
 * hand cups the belly midway between the magazine and the folded blade's tip, so it closes on neither.
 */
const sksStockAnchors = (params: Readonly<Record<string, string>>, part: PartDef): GunPartAnchors => {
  const magazineFront = Math.max(...P.lower.magazine.map(([x]) => x));
  const bladeTip = Math.min(...P.bayonet.blade.map(([x]) => x));
  const supportX = (magazineFront + bladeTip) / 2;
  return { ...stockAnchors(params, part), support: frameAt([supportX, tracedLine(P.stock.bottom)(supportX), 0]) };
};

/** Where the hands, shoulder, muzzle and spent cases meet the SKS, by family. */
export const SKS_ANCHORS: GunAnchorDeclarations = {
  'sks-receiver': { anchors: ejectionAnchor },
  'sks-bolt-carrier': { anchors: knobAnchor },
  'sks-barrel': { anchors: muzzlePortAnchor },
  'sks-stock': { holdRank: 'firing-grip-stock', anchors: sksStockAnchors },
};
