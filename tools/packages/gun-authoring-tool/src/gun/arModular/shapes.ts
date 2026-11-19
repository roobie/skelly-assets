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
