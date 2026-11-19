import type { RevolvedSolid, Solid } from '@skelly/construct/shapes/solid.ts';
import appearance from '../../../../../../models/guns/tables/appearance.json' with { type: 'json' };
import { octagonalProfile, octagonalSection, octagonalTubeWalls } from '../octagon.ts';

/** A solid round bar along x from `fromX` to `toX`, with the content side count optics and cartridges are drawn with. */
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
  sides: appearance.roundSides,
});

/**
 * A clamp round a gas journal of `radius` along x from `fromX` to `toX`, in a frame on top of the journal: a `wall` over
 * it and under it, and out to `half` either side.
 */
export const journalClamp = (
  id: string,
  fromX: number,
  toX: number,
  radius: number,
  wall: number,
  half: number,
): Solid[] =>
  octagonalTubeWalls(
    id,
    octagonalSection([-2 * radius - wall, wall], [-half, half]),
    octagonalProfile(radius, [-radius, 0]),
    [fromX, toX],
  );
