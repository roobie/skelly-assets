// A fixed peep rear sight on a top rail, built from its content table. See
// `models/guns/tables/railPeepRearSight.jsonnet` for what each measure is.

import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { boolean, finite, integer, minValue, number, parse, pipe, strictObject } from 'valibot';
import content from '../../../../../models/guns/tables/railPeepRearSight.json' with { type: 'json' };

const Positive = pipe(number(), finite(), minValue(Number.MIN_VALUE));

const P = parse(
  strictObject({
    base: strictObject({ halfLengthU: Positive, heightU: Positive, halfWidthU: Positive }),
    stem: strictObject({ halfLengthU: Positive, halfWidthU: Positive }),
    disc: strictObject({
      halfThicknessU: Positive,
      holeRadiusU: Positive,
      outerRadiusU: Positive,
      sides: pipe(number(), integer()),
    }),
    eyeReliefU: Positive,
    smooth: boolean(),
  }),
  content,
);

export const RAIL_PEEP_REAR_SIGHT_EYE_RELIEF_U = P.eyeReliefU;
export const RAIL_PEEP_REAR_SIGHT_SMOOTH = P.smooth;

const box = (id: string, min: Vec3, max: Vec3): Solid => ({ id, kind: 'box', box: boxFromMinMax(min, max) });

/**
 * The sight's solids with the hole centred `apertureU` over the rail. The stem ends inside the disc's wall rather than
 * at the hole, so no stem face lies in the hole's floor.
 */
export const railPeepRearSightSolids = (apertureU: number): Solid[] => {
  const { base, stem, disc } = P;
  if (disc.holeRadiusU >= disc.outerRadiusU) {
    throw new Error('A rail peep rear sight needs its hole inside its disc');
  }
  if (apertureU - disc.outerRadiusU <= base.heightU) {
    throw new Error(`A rail peep rear sight's hole at ${apertureU}u leaves no room for its stem`);
  }
  const stemTop = apertureU - (disc.holeRadiusU + disc.outerRadiusU) / 2;
  const [back, front] = [-disc.halfThicknessU, disc.halfThicknessU];
  return [
    box('base', [-base.halfLengthU, 0, -base.halfWidthU], [base.halfLengthU, base.heightU, base.halfWidthU]),
    box('stem', [-stem.halfLengthU, base.heightU, -stem.halfWidthU], [stem.halfLengthU, stemTop, stem.halfWidthU]),
    {
      id: 'disc',
      kind: 'revolved',
      axis: 'x',
      origin: [0, apertureU, 0],
      profile: [
        [back, disc.outerRadiusU],
        [front, disc.outerRadiusU],
        [front, disc.holeRadiusU],
        [back, disc.holeRadiusU],
        [back, disc.outerRadiusU],
      ],
      sides: disc.sides,
    },
  ];
};
