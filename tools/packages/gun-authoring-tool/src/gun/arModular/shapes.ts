import type { RevolvedSolid } from '@skelly/construct/shapes/solid.ts';

/** A solid round bar along x from `fromX` to `toX`. */
export const roundBar = (id: string, fromX: number, toX: number, radius: number): RevolvedSolid => ({
  id,
  kind: 'revolved',
  axis: 'x',
  profile: [
    [fromX, 0],
    [fromX, radius],
    [toX, radius],
    [toX, 0],
  ],
});
