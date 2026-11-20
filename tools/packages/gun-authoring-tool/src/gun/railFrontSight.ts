// A fixed post front sight clamped to a top rail, shared by every frame that stands one on its own sight line; each
// frame gives its own clamp and post. See `models/guns/tables/railFrontSight.jsonnet` for the generic one's.

import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { finite, type InferOutput, minValue, number, optional, parse, pipe, strictObject } from 'valibot';
import content from '../../../../../models/guns/tables/railFrontSight.json' with { type: 'json' };

const Positive = pipe(number(), finite(), minValue(Number.MIN_VALUE));

const ShapeSchema = strictObject({
  base: strictObject({ halfLengthU: Positive, heightU: Positive, halfWidthU: Positive }),
  post: strictObject({ halfLengthU: Positive, halfWidthU: Positive }),
  /** A tower over the clamp, solid up to its deck, then split into two ears that stand beside the post to its tip. */
  ears: optional(
    strictObject({ halfLengthU: Positive, outerHalfWidthU: Positive, innerHalfWidthU: Positive, deckU: Positive }),
  ),
});

/** A rail front sight's clamp and post, and its ears where it has them, in gun units. */
export type RailFrontSightShape = InferOutput<typeof ShapeSchema>;

const GENERIC = parse(strictObject({ ...ShapeSchema.entries, referenceU: Positive }), content);

/** The generic sight's clamp and post. */
export const GENERIC_RAIL_FRONT_SIGHT: RailFrontSightShape = GENERIC;

/** The reference distance on the post's sight axis, which the attachment metadata reports as its eye relief. */
export const RAIL_FRONT_SIGHT_REFERENCE_U = GENERIC.referenceU;

/** The tower and the ears either side of the post, which stand from the clamp to the post's tip. */
const earSolids = (
  { halfLengthU, outerHalfWidthU, innerHalfWidthU, deckU }: NonNullable<RailFrontSightShape['ears']>,
  { base, post }: RailFrontSightShape,
  postTopU: number,
): Solid[] => {
  if (innerHalfWidthU <= post.halfWidthU || outerHalfWidthU <= innerHalfWidthU) {
    throw new Error("A rail front sight's ears must stand clear of its post, each with some thickness");
  }
  if (deckU <= base.heightU || deckU >= postTopU) {
    throw new Error(`A rail front sight's deck at ${deckU}u must stand between its clamp and its post top`);
  }
  const ear = (id: string, side: 1 | -1): Solid => ({
    id,
    kind: 'box',
    box: boxFromMinMax(
      [-halfLengthU, deckU, side > 0 ? innerHalfWidthU : -outerHalfWidthU],
      [halfLengthU, postTopU, side > 0 ? outerHalfWidthU : -innerHalfWidthU],
    ),
  });
  return [
    {
      id: 'tower',
      kind: 'box',
      box: boxFromMinMax([-halfLengthU, base.heightU, -outerHalfWidthU], [halfLengthU, deckU, outerHalfWidthU]),
    },
    ear('ear-left', 1),
    ear('ear-right', -1),
  ];
};

/**
 * The clamp and the post, whose top stands `postTopU` over the rail top, on the sight line, and any ears, whose tower's
 * deck the post then stands on.
 */
export const railFrontSightSolids = (shape: RailFrontSightShape, postTopU: number): Solid[] => {
  const { base, post, ears } = shape;
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
        [-post.halfLengthU, ears?.deckU ?? base.heightU, -post.halfWidthU],
        [post.halfLengthU, postTopU, post.halfWidthU],
      ),
    },
    ...(ears === undefined ? [] : earSolids(ears, shape, postTopU)),
  ];
};
