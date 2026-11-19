// A fixed post front sight clamped to a top rail, shared by every frame that stands one on its own sight line; each
// frame gives its own clamp and post. See `models/guns/tables/railFrontSight.jsonnet` for the generic one's.

import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { finite, type InferOutput, minValue, number, parse, pipe, strictObject } from 'valibot';
import content from '../../../../../models/guns/tables/railFrontSight.json' with { type: 'json' };

const Positive = pipe(number(), finite(), minValue(Number.MIN_VALUE));

const ShapeSchema = strictObject({
  base: strictObject({ halfLengthU: Positive, heightU: Positive, halfWidthU: Positive }),
  post: strictObject({ halfLengthU: Positive, halfWidthU: Positive }),
});

/** A rail front sight's clamp and post, in gun units. */
export type RailFrontSightShape = InferOutput<typeof ShapeSchema>;

const GENERIC = parse(strictObject({ ...ShapeSchema.entries, referenceU: Positive }), content);

/** The generic sight's clamp and post. */
export const GENERIC_RAIL_FRONT_SIGHT: RailFrontSightShape = GENERIC;

/** The reference distance on the post's sight axis, which the attachment metadata reports as its eye relief. */
export const RAIL_FRONT_SIGHT_REFERENCE_U = GENERIC.referenceU;

/** The clamp and the post, whose top stands `postTopU` over the rail top, on the sight line. */
export const railFrontSightSolids = ({ base, post }: RailFrontSightShape, postTopU: number): Solid[] => {
  if (postTopU <= base.heightU) {
    throw new Error(`A rail front sight's post top at ${postTopU}u leaves no post above its clamp`);
  }
  return [
    {
      id: 'base',
      kind: 'box',
      box: boxFromMinMax([-base.halfLengthU, 0, -base.halfWidthU], [base.halfLengthU, base.heightU, base.halfWidthU]),
    },
    {
      id: 'post',
      kind: 'box',
      box: boxFromMinMax(
        [-post.halfLengthU, base.heightU, -post.halfWidthU],
        [post.halfLengthU, postTopU, post.halfWidthU],
      ),
    },
  ];
};
