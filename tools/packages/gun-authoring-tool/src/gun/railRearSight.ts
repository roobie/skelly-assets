// A fixed aperture rear sight on a top rail, built from its content table. See
// `models/guns/tables/railRearSight.jsonnet` for what each measure is.

import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
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
 * The sight's solids with the square hole centred `apertureU` over the rail, where the exported sight line runs through
 * it. The tower ends inside the frame's bottom wall, and is narrower than the frame so no tower face lies in a frame
 * face.
 */
export const railRearSightSolids = (apertureU: number): Solid[] => {
  const { base, tower, aperture } = P;
  const hole = aperture.holeHalfU;
  const outer = hole + aperture.ringU;
  if (tower.halfWidthU >= outer) {
    throw new Error("A rail rear sight's tower must be narrower than its frame");
  }
  if (apertureU - outer <= base.heightU) {
    throw new Error(`A rail rear sight's aperture at ${apertureU}u leaves no room for its tower`);
  }
  const towerTop = apertureU - (hole + outer) / 2;
  const [back, front] = [-aperture.halfThicknessU, aperture.halfThicknessU];
  return [
    box('base', [-base.halfLengthU, 0, -base.halfWidthU], [base.halfLengthU, base.heightU, base.halfWidthU]),
    box(
      'tower',
      [-tower.halfLengthU, base.heightU, -tower.halfWidthU],
      [tower.halfLengthU, towerTop, tower.halfWidthU],
    ),
    {
      id: 'frame',
      kind: 'revolved',
      axis: 'x',
      origin: [0, apertureU, 0],
      profile: [
        [back, outer],
        [front, outer],
        [front, hole],
        [back, hole],
        [back, outer],
      ],
      sides: 4,
    },
  ];
};
