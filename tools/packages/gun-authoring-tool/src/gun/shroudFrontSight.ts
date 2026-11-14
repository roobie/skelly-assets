// A fixed front post on an anti-materiel barrel shroud, built from its content table. See
// `models/guns/tables/shroudFrontSight.jsonnet` for what each measure is.

import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { boolean, finite, minValue, number, parse, pipe, strictObject } from 'valibot';
import content from '../../../../../models/guns/tables/shroudFrontSight.json' with { type: 'json' };

const Positive = pipe(number(), finite(), minValue(Number.MIN_VALUE));

const P = parse(
  strictObject({
    setbackU: Positive,
    base: strictObject({ halfLengthU: Positive, heightU: Positive, halfWidthU: Positive }),
    post: strictObject({ halfLengthU: Positive, halfWidthU: Positive }),
    ears: strictObject({ halfLengthU: Positive, innerHalfGapU: Positive, thicknessU: Positive, dropU: Positive }),
    smooth: boolean(),
  }),
  content,
);

export const SHROUD_FRONT_SIGHT_SETBACK_U = P.setbackU;
export const SHROUD_FRONT_SIGHT_SMOOTH = P.smooth;

const box = (id: string, min: Vec3, max: Vec3): Solid => ({ id, kind: 'box', box: boxFromMinMax(min, max) });

/** The sight's solids with the post top `postTopU` over the shroud. */
export const shroudFrontSightSolids = (postTopU: number): Solid[] => {
  const { base, post, ears } = P;
  const earTopU = postTopU - ears.dropU;
  if (earTopU <= base.heightU) {
    throw new Error(`A shroud front sight's post top at ${postTopU}u leaves no room for its ears`);
  }
  const outer = ears.innerHalfGapU + ears.thicknessU;
  return [
    box('base', [-base.halfLengthU, 0, -base.halfWidthU], [base.halfLengthU, base.heightU, base.halfWidthU]),
    box('post', [-post.halfLengthU, base.heightU, -post.halfWidthU], [post.halfLengthU, postTopU, post.halfWidthU]),
    box('ear-left', [-ears.halfLengthU, base.heightU, -outer], [ears.halfLengthU, earTopU, -ears.innerHalfGapU]),
    box('ear-right', [-ears.halfLengthU, base.heightU, ears.innerHalfGapU], [ears.halfLengthU, earTopU, outer]),
  ];
};
