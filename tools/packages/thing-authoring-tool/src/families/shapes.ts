import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import type { BoxSolid, ExtrudedPolygonSolid, RevolvedSolid, Solid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import {
  finite,
  type GenericSchema,
  minValue,
  number,
  picklist,
  pipe,
  record,
  string,
  transform,
  tuple,
} from 'valibot';

export const scalar = pipe(string(), transform(Number), finite());
export const positive = pipe(scalar, minValue(Number.MIN_VALUE));
/** A parameter carrying structured content, as the catalogue passes arrays and objects: JSON text. */
export const json = <T>(schema: GenericSchema<unknown, T>) =>
  pipe(
    string(),
    transform((text): unknown => JSON.parse(text)),
    schema,
  );
const coordinate = pipe(number(), finite());
export const point3 = tuple([coordinate, coordinate, coordinate]);
/**
 * Where each segment's joint lies in the frame its limb or body is drawn in, for a body whose joints are not on the
 * centre line it is drawn about. A part is handed over about its own joint, the pivot its bone turns it about.
 */
export const jointOrigins = <const S extends string>(segments: readonly S[]) =>
  json(record(picklist(segments), point3));
/** How far a place given as content may lie from where the measures derive it: a rounding of the measures and no more. */
export const MEASURE_TOLERANCE = 1e-6;
/**
 * A joint is given whole, as its skeleton has it, while the measures lay out the flesh along the limb; a joint at
 * another height than the measures' would turn its part about a point the flesh does not end at.
 */
export const requireJointHeights = (
  joints: Readonly<Partial<Record<string, Vec3>>>,
  heights: Readonly<Partial<Record<string, number>>>,
  what: string,
): void => {
  for (const [segment, height] of Object.entries(heights)) {
    const joint = joints[segment];
    if (joint && height !== undefined && Math.abs(joint[1] - height) > MEASURE_TOLERANCE) {
      throw new Error(
        `The ${what}'s ${segment} joint stands at ${joint[1]}, not at ${height} where its measures put it`,
      );
    }
  }
};
/** Extruded solids must be convex, with the profile wound counterclockwise. */
export const requireConvex = (profile: readonly Vec2[], what: string): void => {
  for (let i = 0; i < profile.length; i++) {
    const a = profile[i]!;
    const b = profile[(i + 1) % profile.length]!;
    const c = profile[(i + 2) % profile.length]!;
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) <= 0) {
      throw new Error(`${what} needs a convex counterclockwise profile`);
    }
  }
};
export const revolve = (id: string, profile: readonly Vec2[], slot = 'body'): RevolvedSolid => ({
  id,
  kind: 'revolved',
  axis: 'y',
  profile,
  slot,
});
export const cylinder = (id: string, radius: number, height: number, slot = 'body') =>
  revolve(
    id,
    [
      [0, 0],
      [0, radius],
      [height, radius],
      [height, 0],
      [0, 0],
    ],
    slot,
  );
export const box = (id: string, center: Vec3, size: Vec3, slot = 'body'): BoxSolid => ({
  id,
  kind: 'box',
  box: { center, half: size.map((v) => v / 2) as unknown as Vec3 },
  slot,
});
/** A cylinder of `[radius, length]` from `origin` along `axis`. */
export const round = (
  id: string,
  origin: Vec3,
  [radius, length]: Vec2,
  [axis, slot]: readonly ['x' | 'y' | 'z', string],
): Solid => ({
  ...cylinder(id, radius, length, slot),
  origin,
  axis,
});
/**
 * A spheroid turned about `axis` through `centre`: `halfAxial` along the axis, `radius` across it. For the round
 * joints and caps of a body, where a box end shows a wedge once posed.
 */
export const spheroid = (
  id: string,
  centre: Vec3,
  [halfAxial, radius]: Vec2,
  [axis, slot]: readonly ['x' | 'y' | 'z', string],
  steps = 10,
): RevolvedSolid => {
  const profile: Vec2[] = [[-halfAxial, 0]];
  for (let i = 1; i < steps; i++) {
    const a = -halfAxial + (2 * halfAxial * i) / steps;
    profile.push([a, radius * Math.sqrt(Math.max(0, 1 - (a / halfAxial) ** 2))]);
  }
  profile.push([halfAxial, 0], [-halfAxial, 0]);
  return { id, kind: 'revolved', axis, origin: centre, profile, slot, creaseDegrees: 90 };
};
/** A straight bar between two profile points, `[width, depth]` across. */
export const link = (
  id: string,
  [start, end]: readonly [Vec2, Vec2],
  [width, depth]: Vec2,
  slot: string,
): ExtrudedPolygonSolid => {
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  if (length === 0) {
    throw new Error(`${id} link needs length`);
  }
  const dx = (-(end[1] - start[1]) * width) / (2 * length);
  const dy = ((end[0] - start[0]) * width) / (2 * length);
  return {
    id,
    kind: 'extruded-polygon',
    slot,
    profile: [
      [start[0] + dx, start[1] + dy],
      [start[0] - dx, start[1] - dy],
      [end[0] - dx, end[1] - dy],
      [end[0] + dx, end[1] + dy],
    ],
    z: [-depth / 2, depth / 2],
  };
};
export const strip = (id: string, points: readonly Vec2[], [width, depth]: readonly [number, number], slot = 'body') =>
  points.slice(1).map((end, i): ExtrudedPolygonSolid => {
    const start = points[i]!;
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (length === 0) {
      throw new Error(`${id} segment needs length`);
    }
    const dx = ((-(end[1] - start[1]) / length) * width) / 2;
    const dy = (((end[0] - start[0]) / length) * width) / 2;
    return {
      id: `${id}-${i}`,
      kind: 'extruded-polygon',
      profile: [
        [start[0] + dx, start[1] + dy],
        [start[0] - dx, start[1] - dy],
        [end[0] - dx, end[1] - dy],
        [end[0] + dx, end[1] + dy],
      ],
      z: [-depth / 2, depth / 2],
      slot,
    };
  });
export const annulus = (id: string, [inner, outer]: readonly [number, number], height: number, slot = 'body') =>
  revolve(
    id,
    [
      [0, inner],
      [0, outer],
      [height, outer],
      [height, inner],
      [0, inner],
    ],
    slot,
  );
