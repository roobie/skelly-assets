import { clippedExtrudedPolygonPolyhedron, polyhedronVolume } from '@skelly/construct/shapes/geometry.ts';
import type { Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import { subtractConvexSection } from './receiverSection.ts';

/** Cubic Hermite graph, with endpoint slopes expressed as dy/dx. */
export const hermite = (
  x: number,
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number => {
  const dx = b[0] - a[0];
  const t = (x - a[0]) / dx;
  return (
    (2 * t ** 3 - 3 * t ** 2 + 1) * a[1] +
    (t ** 3 - 2 * t ** 2 + t) * dx * a[2] +
    (-2 * t ** 3 + 3 * t ** 2) * b[1] +
    (t ** 3 - t ** 2) * dx * b[2]
  );
};

/** A traced line through `points` in rising x, straight between them and level beyond its ends. */
export const tracedLine =
  (points: readonly Vec2[]) =>
  (x: number): number => {
    const next = points.findIndex(([px]) => px >= x);
    if (next <= 0) {
      return points[next === 0 ? 0 : points.length - 1]![1];
    }
    const [x0, y0] = points[next - 1]!;
    const [x1, y1] = points[next]!;
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  };

/** A wooden stock's side profile and plan width along x, and how its cells merge for display. */
export interface StockContour {
  readonly top: (x: number) => number;
  readonly bottom: (x: number) => number;
  readonly halfWidth: (x: number) => number;
  readonly segments: number;
  readonly mergeGroup: string;
}

/** One convex wood cell whose sides taper linearly from its front half-width to its back half-width. */
export const woodCell = (
  { mergeGroup, id, role }: { readonly mergeGroup: string; readonly id: string; readonly role: string },
  profile: readonly Vec2[],
  width: readonly [frontX: number, frontHalf: number, backX: number, backHalf: number],
): Solid => {
  const [frontX, frontHalf, backX, backHalf] = width;
  const slope = (backHalf - frontHalf) / (backX - frontX);
  const offset = frontHalf - slope * frontX;
  const half = Math.max(frontHalf, backHalf);
  return {
    id,
    kind: 'extruded-polygon',
    profile,
    z: [-half, half],
    clip: [
      { normal: [-slope, 0, 1], offset },
      { normal: [-slope, 0, -1], offset },
    ],
    slot: 'furniture',
    display: { bevel: false, outline: false, outlineAngleDeg: 30, mergeGroup, role },
  };
};

/** A span of the stock, from `front` back to `back`, cut into convex cells at even steps and at `breaks`. */
export const woodRegion = (
  contour: StockContour,
  role: string,
  [front, back]: readonly [number, number],
  breaks: readonly number[] = [],
): Solid[] => {
  const xs = [
    ...new Set([
      ...Array.from({ length: contour.segments + 1 }, (_, i) => front + ((back - front) * i) / contour.segments),
      ...breaks,
    ]),
  ].sort((a, b) => b - a);
  return xs.slice(1).map((x, i) =>
    woodCell(
      { mergeGroup: contour.mergeGroup, id: i === 0 ? role : `${role}-${i}`, role },
      [
        [x, contour.bottom(x)],
        [xs[i]!, contour.bottom(xs[i]!)],
        [xs[i]!, contour.top(xs[i]!)],
        [x, contour.top(x)],
      ],
      [xs[i]!, contour.halfWidth(xs[i]!), x, contour.halfWidth(x)],
    ),
  );
};

/** A metal part let into the wood: its side-profile opening, cut only between ±`halfWidth`. */
export interface WoodInlet {
  readonly name: string;
  readonly halfWidth: number;
  /** The convex opening in a cell's side profile, or `undefined` where the cell lies clear of the inlet. */
  readonly opening: (profile: readonly Vec2[]) => readonly Vec2[] | undefined;
}

/** Cuts an inlet into the stock's side-profile furniture cells, splitting each cut cell into z bands at the inlet's walls. */
export const inletWood = (solids: readonly Solid[], { name, halfWidth, opening }: WoodInlet): Solid[] =>
  solids.flatMap((solid) => {
    if (solid.kind !== 'extruded-polygon' || solid.slot !== 'furniture') {
      return [solid];
    }
    const section = opening(solid.profile);
    if (section === undefined) {
      return [solid];
    }
    const bands = [solid.z[0], -halfWidth, halfWidth, solid.z[1]].filter((z) => z >= solid.z[0] && z <= solid.z[1]);
    return bands.slice(0, -1).flatMap((start, band) => {
      const end = bands[band + 1]!;
      const profiles =
        start >= -halfWidth && end <= halfWidth ? subtractConvexSection(solid.profile, section) : [solid.profile];
      return profiles
        .map(
          (profile, piece): Solid => ({
            ...solid,
            id: `${solid.id}-${name}-${band}-${piece}`,
            profile,
            z: [start, end],
          }),
        )
        .filter((piece) => {
          if (piece.kind !== 'extruded-polygon') {
            return false;
          }
          const polyhedron = clippedExtrudedPolygonPolyhedron(piece);
          return polyhedron !== undefined && polyhedronVolume(polyhedron) > 1e-9;
        });
    });
  });
