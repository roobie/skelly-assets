import type { RevolvedSolid, Solid } from '@skelly/construct/shapes/solid.ts';
import { box } from '../antiMateriel/common.ts';

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

/**
 * Four boxes round the bore along x from `fromX` to `toX`, leaving a square hole `bore` off it, inside a section from
 * `bottom` to `top` and `half` either side. Boxes rather than a hollow revolved solid, since a solid is judged by its
 * hull and a hollow one would swallow what runs through it.
 */
export const boxSleeve = (
  id: string,
  fromX: number,
  toX: number,
  bore: number,
  [bottom, top]: readonly [number, number],
  half: number,
): Solid[] => [
  box(`${id}-top`, [fromX, bore, -half], [toX, top, half]),
  box(`${id}-bottom`, [fromX, bottom, -half], [toX, -bore, half]),
  box(`${id}-right`, [fromX, -bore, bore], [toX, bore, half]),
  box(`${id}-left`, [fromX, -bore, -half], [toX, bore, -bore]),
];

/**
 * A clamp round a gas journal of `radius` along x from `fromX` to `toX`, in a frame on top of the journal: a `wall` over
 * it and under it, and a cheek either side out to `half`. Each box is named by `id` from its side.
 */
export const journalClamp = (
  id: (side: 'top' | 'right' | 'left' | 'under') => string,
  fromX: number,
  toX: number,
  radius: number,
  wall: number,
  half: number,
): Solid[] => [
  box(id('top'), [fromX, 0, -half], [toX, wall, half]),
  box(id('right'), [fromX, -2 * radius, radius], [toX, 0, half]),
  box(id('left'), [fromX, -2 * radius, -half], [toX, 0, -radius]),
  box(id('under'), [fromX, -2 * radius - wall, -half], [toX, -2 * radius, half]),
];
