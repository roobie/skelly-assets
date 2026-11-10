// A fixed aperture rear sight on a top rail, built from its content table. See
// `models/guns/tables/railRearSight.jsonnet` for what each measure is.

import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { finite, minValue, number, parse, pipe, strictObject } from 'valibot';
import content from '../../../../../models/guns/tables/railRearSight.json' with { type: 'json' };

const Positive = pipe(number(), finite(), minValue(Number.MIN_VALUE));

const P = parse(
  strictObject({
    base: strictObject({ halfLengthU: Positive, heightU: Positive, halfWidthU: Positive }),
    tower: strictObject({ halfLengthU: Positive, halfWidthU: Positive }),
    aperture: strictObject({ halfThicknessU: Positive, holeHalfU: Positive, ringU: Positive }),
    eyeReliefU: Positive,
  }),
  content,
);

export const RAIL_REAR_SIGHT_EYE_RELIEF_U = P.eyeReliefU;

const box = (id: string, min: Vec3, max: Vec3): Solid => ({ id, kind: 'box', box: boxFromMinMax(min, max) });

/**
 * The sight's solids with the aperture centred `apertureU` over the rail. The leaf closes over the hole, so its top is
 * solid and the exported sight line drops into the hole rather than resting on the top (see `exportGlb.ts`,
 * `openSightGapOrThrow`).
 */
export const railRearSightSolids = (apertureU: number): Solid[] => {
  const { base, tower, aperture } = P;
  const hole = aperture.holeHalfU;
  const outer = hole + aperture.ringU;
  const leafX = aperture.halfThicknessU;
  if (apertureU - outer <= base.heightU) {
    throw new Error(`A rail rear sight's aperture at ${apertureU}u leaves no room for its tower`);
  }
  return [
    box('base', [-base.halfLengthU, 0, -base.halfWidthU], [base.halfLengthU, base.heightU, base.halfWidthU]),
    box(
      'tower',
      [-tower.halfLengthU, base.heightU, -tower.halfWidthU],
      [tower.halfLengthU, apertureU - hole, tower.halfWidthU],
    ),
    box('ring-left', [-leafX, apertureU - hole, -outer], [leafX, apertureU + hole, -hole]),
    box('ring-right', [-leafX, apertureU - hole, hole], [leafX, apertureU + hole, outer]),
    box('ring-top', [-leafX, apertureU + hole, -outer], [leafX, apertureU + outer, outer]),
  ];
};
