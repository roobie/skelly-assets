import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import { nominalCapacityForMagazine } from '../magazineGeometry.ts';
import { gunPort } from '../portData.ts';
import { BMG_BASE_DIAMETER_U, BMG_OVERALL_LENGTH_U, ceilTo } from './cartridge.ts';
import { RUBBER, X, Y } from './common.ts';

/**
 * A 10-round .50 BMG box magazine, sized from the cartridge rather than picked from the shared `magazine`
 * family's rifle-cartridge bands. The rounds lie along the bore, so the magazine is as deep (X) as the round is
 * long, and it is a close-packed double column, so it is short (Y) and wide (Z):
 *
 * - depth: round length plus a wall at each end, up to the 0.5u the symmetric box needs to stay on the grid;
 * - width: the two columns' centres are offset by sqrt(3)/2 of a case diameter (neighbours in opposite columns
 *   touch), plus a wall each side, up to the next 0.5u;
 * - length: ten rounds in that zig-zag stand (10 - 1) * d/2 + d tall above the floor allowance for the follower,
 *   spring and floorplate. A round spans the whole depth, so the stack is measured at the front, where the
 *   slanted bottom is highest, and the back face is taller by the slant's rise.
 *
 * It plays the `magazine` role, so the lower's `magazine` mount, the feed rule and the palette treat it as one. Its
 * one `length` band names its capacity in the shared magazine's vocabulary, so the round column a loose export
 * fits holds that nominal count.
 */
const LENGTH_BAND = '10-round';
export const HEAVY_MAGAZINE_ROUNDS = nominalCapacityForMagazine({ length: LENGTH_BAND })!;
const WALL = 0.25;
const BASE_ALLOWANCE = 0.75;

export const HEAVY_MAGAZINE_DEPTH = ceilTo(BMG_OVERALL_LENGTH_U + 2 * WALL, 0.5);
export const HEAVY_MAGAZINE_WIDTH = ceilTo(BMG_BASE_DIAMETER_U * (1 + Math.sqrt(3) / 2) + 2 * WALL, 0.5);
/** How far the magazine's top stands up into the well; the well's roof is one grid step above it. */
export const HEAVY_MAGAZINE_INSERTION = 0.75;
const FLOORPLATE_THICKNESS = 0.25;

/**
 * The bottom slants up toward the front, so the front face is shorter than the back face. The rise is the depth
 * times tan(8 degrees), snapped to the 0.25u grid the way the shared slanted magazine snaps its vertex (so the real
 * angle is 7.67 degrees, not 8).
 */
export const HEAVY_MAGAZINE_SLANT_DEGREES = 8;
const HEAVY_MAGAZINE_SLANT_RISE =
  Math.round((HEAVY_MAGAZINE_DEPTH * Math.tan((HEAVY_MAGAZINE_SLANT_DEGREES * Math.PI) / 180)) / 0.25) * 0.25;

/** The back face's height, the magazine's tallest. */
export const HEAVY_MAGAZINE_LENGTH = ceilTo(
  ((HEAVY_MAGAZINE_ROUNDS - 1) / 2 + 1) * BMG_BASE_DIAMETER_U + BASE_ALLOWANCE + HEAVY_MAGAZINE_SLANT_RISE,
  0.25,
);

export const heavyMagazine: PartFamily = {
  name: 'heavy-magazine',
  params: { length: { values: [LENGTH_BAND], default: LENGTH_BAND } },
  build(): PartDef {
    const bottom = HEAVY_MAGAZINE_INSERTION - HEAVY_MAGAZINE_LENGTH;
    const frontBottom = bottom + HEAVY_MAGAZINE_SLANT_RISE;
    const halfDepth = HEAVY_MAGAZINE_DEPTH / 2;
    const halfWidth = HEAVY_MAGAZINE_WIDTH / 2;
    // Convex side profiles (x, y), counter-clockwise, extruded along Z (the width).
    return {
      family: 'magazine',
      solids: [
        {
          id: 'body',
          kind: 'extruded-polygon',
          profile: [
            [-halfDepth, bottom],
            [halfDepth, frontBottom],
            [halfDepth, HEAVY_MAGAZINE_INSERTION],
            [-halfDepth, HEAVY_MAGAZINE_INSERTION],
          ],
          z: [-halfWidth, halfWidth],
        },
        {
          id: 'floorplate',
          kind: 'extruded-polygon',
          profile: [
            [-halfDepth, bottom],
            [halfDepth, frontBottom],
            [halfDepth, frontBottom + FLOORPLATE_THICKNESS],
            [-halfDepth, bottom + FLOORPLATE_THICKNESS],
          ],
          z: [-halfWidth - WALL, halfWidth + WALL],
          ...RUBBER,
        },
      ],
      ports: [
        gunPort({
          id: 'top',
          mount: 'magazine',
          gender: 'male',
          pos: [0, 0, 0],
          normal: Y,
          up: X,
          required: true,
          seat: 'well',
        }),
      ],
      keepOuts: [],
      axes: [],
    };
  },
};
