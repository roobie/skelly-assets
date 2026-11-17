// The level steps a leaning solid's voxel copy is drawn as when it asks to terrace (`SolidDisplayHints.terrace`).
//
// Up is the part's local y, the axis its plans and roofs are authored on; the steps stand on the voxel lattice's layer
// boundaries, so every layer of a step samples one outline and the step reads as whole layers. A solid with no leaning
// face has one outline at every height, so it is drawn as authored: terracing it would change nothing but its mesh.

import { add, cross, dot, length, type Vec3 } from '../foundation/math.ts';
import { boundsOfPoints, clipConvexPolyhedron, clippedExtrudedPolygonPolyhedron } from './geometry.ts';
import type { ConvexPolyhedron } from './shapeTypes.ts';
import type { Solid, Vec2 } from './solid.ts';

/** The voxel layers along the part's local y, in the solid's units: their height, and the height of one boundary. */
export interface TerraceLattice {
  readonly layer: number;
  readonly base: number;
}

const UP: Vec3 = [0, 1, 0];

/** Relative to a solid's height: below it a face counts as level or upright, and a step as empty. */
const TOLERANCE = 1e-9;

const facePoints = (shape: ConvexPolyhedron, face: readonly number[]): Vec3[] =>
  face.map((index) => shape.vertices[index]!);

const faceNormal = (points: readonly Vec3[]): Vec3 =>
  points.reduce<Vec3>((sum, point, i) => add(sum, cross(point, points[(i + 1) % points.length]!)), [0, 0, 0]);

const leans = (shape: ConvexPolyhedron): boolean =>
  shape.faces.some((face) => {
    const normal = faceNormal(facePoints(shape, face));
    const least = TOLERANCE * length(normal);
    return Math.abs(dot(normal, UP)) > least && Math.hypot(normal[0], normal[2]) > least;
  });

/** The solid's level outline at `height` as a y-extrusion profile, (z, x) counter-clockwise seen from above. */
const outlineAt = (shape: ConvexPolyhedron, height: number, tolerance: number): Vec2[] | undefined => {
  const below = clipConvexPolyhedron(shape, { normal: UP, offset: height });
  const cap = below?.faces
    .map((face) => facePoints(below, face))
    .find((points) => points.every((point) => Math.abs(point[1] - height) <= tolerance));
  return cap?.map(([x, , z]): Vec2 => [z, x]);
};

/**
 * The convex steps `solid`'s voxel copy is drawn as, or undefined when it is drawn as authored: it does not terrace, or
 * has no leaning face. Each step spans `terrace` layers of `lattice`, cut to the solid's height, and extrudes the
 * solid's outline at the step's middle. For a leaning plane the outline moves linearly with height, so the middle is
 * the step's mean outline: the step keeps the volume it replaces, and its edge stands half a step proud of the authored
 * face at one end and half a step short at the other, the least either way that one outline can stray.
 */
export const terraceBands = (solid: Solid, { layer, base }: TerraceLattice): ConvexPolyhedron[] | undefined => {
  const layers = solid.display?.terrace;
  if (layers === undefined || solid.kind === 'box') {
    return undefined;
  }
  if (!(Number.isInteger(layers) && layers >= 1)) {
    throw new Error(`Solid "${solid.id}" terraces by ${layers} layers; a step is a whole number of layers.`);
  }
  if (solid.kind === 'revolved') {
    throw new Error(`Solid "${solid.id}" is revolved; only extrusions terrace.`);
  }
  const shape = clippedExtrudedPolygonPolyhedron(solid);
  if (!(shape && leans(shape))) {
    return undefined;
  }
  const [low, high] = boundsOfPoints(shape.vertices);
  const [bottom, top] = [low[1], high[1]];
  const tolerance = TOLERANCE * Math.max(1, top - bottom);
  const step = layers * layer;
  const bands: ConvexPolyhedron[] = [];
  for (let k = Math.floor((bottom - base) / step); base + k * step < top - tolerance; k++) {
    const from = Math.max(bottom, base + k * step);
    const to = Math.min(top, base + (k + 1) * step);
    const profile = to - from > tolerance ? outlineAt(shape, (from + to) / 2, tolerance) : undefined;
    const band =
      profile &&
      clippedExtrudedPolygonPolyhedron({ id: solid.id, kind: 'extruded-polygon', axis: 'y', profile, z: [from, to] });
    if (band) {
      bands.push(band);
    }
  }
  return bands;
};
