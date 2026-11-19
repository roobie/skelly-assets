import type { Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';

type Span = readonly [number, number];

/** How far each corner of a regular octagon stands from its centre line, as a share of the half-extent across it. */
export const OCTAGON_CORNER = Math.SQRT2 - 1;

/**
 * How much shorter a 45-degree chamfer's legs are on a section `wall` inside another, per unit of wall, so the wall is as
 * thick across the chamfer as across the flats.
 */
export const CHAMFER_WALL_INSET = 2 - Math.SQRT2;

/**
 * The eight-sided section in the box `y` by `z` whose flats face both transverse axes, from the spans along Y of its Z
 * flats and along Z of its Y flats. Points are (Y, Z), for an extrusion along X, and every section starts at the same
 * corner and turns the same way, so any two of them pair vertex for vertex.
 */
const octagonInBox = ([y0, y1]: Span, [z0, z1]: Span, [ya, yb]: Span, [za, zb]: Span): readonly Vec2[] => [
  [y1, zb],
  [yb, z1],
  [ya, z1],
  [y0, zb],
  [y0, za],
  [ya, z0],
  [yb, z0],
  [y1, za],
];

/**
 * The octagon in the box `y` by `z` that is regular when the box is square. Its corners scale with the box, so a box
 * that is not square gives chamfers that are not at 45 degrees.
 */
export const octagonalSection = (y: Span, z: Span): readonly Vec2[] => {
  const [centreY, centreZ] = [(y[0] + y[1]) / 2, (z[0] + z[1]) / 2];
  const [cornerY, cornerZ] = [((y[1] - y[0]) / 2) * OCTAGON_CORNER, ((z[1] - z[0]) / 2) * OCTAGON_CORNER];
  return octagonInBox(y, z, [centreY - cornerY, centreY + cornerY], [centreZ - cornerZ, centreZ + cornerZ]);
};

/** The box `y` by `z` with each corner cut at 45 degrees, `chamfer` back along both of its sides. */
export const octagonalSectionChamfered = (y: Span, z: Span, chamfer: number): readonly Vec2[] =>
  octagonInBox(y, z, [y[0] + chamfer, y[1] - chamfer], [z[0] + chamfer, z[1] - chamfer]);

/** A regular octagon `flatRadius` from `centre` to each flat. */
export const octagonalProfile = (flatRadius: number, [centreY, centreZ]: Vec2 = [0, 0]): readonly Vec2[] =>
  octagonalSection([centreY - flatRadius, centreY + flatRadius], [centreZ - flatRadius, centreZ + flatRadius]);

/** A regular octagonal bar along X. */
export const octagonalPrism = (id: string, flatRadius: number, along: Span): Solid => ({
  id,
  kind: 'extruded-polygon',
  profile: octagonalProfile(flatRadius),
  axis: 'x',
  z: along,
});

/**
 * A tube along X between two octagonal sections, built as one wall per side rather than as a hollow solid, since a
 * solid is judged by its hull and a hollow one would swallow what runs through it. Each wall joins a side of `outer` to
 * the same side of `inner`, so the two sections pair vertex for vertex, as every section here does.
 */
export const octagonalTubeWalls = (id: string, outer: readonly Vec2[], inner: readonly Vec2[], along: Span): Solid[] =>
  outer.map((point, index) => {
    const next = (index + 1) % outer.length;
    return {
      id: `${id}-wall-${index}`,
      kind: 'extruded-polygon',
      profile: [point, outer[next]!, inner[next]!, inner[index]!] as const,
      axis: 'x',
      z: along,
    };
  });
