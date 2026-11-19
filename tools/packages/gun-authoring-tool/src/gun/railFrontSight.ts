// A fixed post front sight clamped to a top rail, shared by every frame that stands one on its own sight line.

import { GRID } from '@skelly/construct/foundation/conventions.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';
import type { Solid } from '@skelly/construct/shapes/solid.ts';

/** The reference distance on the post's sight axis, which the attachment metadata reports as its eye relief. */
export const RAIL_FRONT_SIGHT_REFERENCE_U = 4;

// The clamp across the rail, one notch long so the sight fits the rail's end slots.
const BASE = { halfLength: 1, height: 0.5, halfWidth: 1 };

/** The clamp and the post, whose top stands `postTopU` over the rail top, on the sight line. */
export const railFrontSightSolids = (postTopU: number): Solid[] => {
  if (postTopU <= BASE.height) {
    throw new Error(`A rail front sight's post top at ${postTopU}u leaves no post above its clamp`);
  }
  return [
    {
      id: 'base',
      kind: 'box',
      box: boxFromMinMax([-BASE.halfLength, 0, -BASE.halfWidth], [BASE.halfLength, BASE.height, BASE.halfWidth]),
    },
    { id: 'post', kind: 'box', box: boxFromMinMax([-GRID, BASE.height, -GRID / 2], [GRID, postTopU, GRID / 2]) },
  ];
};
