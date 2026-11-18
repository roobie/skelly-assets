// @ts-check
// The solid a piece draws, as a signed distance (negative inside) and its bounding box, so pieces of different kinds
// can be tested against each other by sampling the space their boxes share.
/** @import { AxisIndex, Vec3 } from './packages/construct/src/foundation/math.ts' */
/** @import { AnalyticPiece } from './packages/thing-core/src/motion.ts' */
import { AXES, perAxis } from './packages/construct/src/foundation/math.ts';

/** @typedef {{ readonly normal: Vec3; readonly offset: number }} CutPlane */
/** @typedef {Extract<AnalyticPiece, { kind: 'prism' }> & { readonly clip?: readonly CutPlane[] | undefined }} CutPrism */
/** @typedef {Exclude<AnalyticPiece, { kind: 'prism' }> | CutPrism} Piece A piece as a vehicle draws it. */
/** @typedef {Piece extends infer P ? (P extends Piece ? Omit<P, 'id'> : never) : never} PieceShape */
/** @typedef {(p: Vec3) => number} Distance */
/** @typedef {{ readonly box?: true; readonly min: Vec3; readonly max: Vec3; readonly distance: Distance }} Solid */

/** @type {Readonly<Record<'x' | 'y' | 'z', readonly [AxisIndex, AxisIndex, AxisIndex]>>} */
const ALONG = { x: [0, 1, 2], y: [1, 2, 0], z: [2, 0, 1] };

/**
 * @param {readonly (readonly [number, number])[]} polygon
 * @param {readonly [number, number]} point
 */
function outline(polygon, [u, v]) {
  let inside = false;
  let nearest = Infinity;
  let previous = polygon.at(-1);
  if (previous === undefined) return nearest;
  for (const next of polygon) {
    const [[ax, ay], [bx, by]] = [previous, next];
    if (ay > v !== by > v && u < ax + ((v - ay) / (by - ay)) * (bx - ax)) inside = !inside;
    const dx = bx - ax;
    const dy = by - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy))) : 0;
    nearest = Math.min(nearest, Math.hypot(u - ax - t * dx, v - ay - t * dy));
    previous = next;
  }
  return inside ? -nearest : nearest;
}

/**
 * @param {readonly (readonly [number, number])[]} profile
 * @param {0 | 1} c
 * @returns {readonly [number, number]}
 */
const spread = (profile, c) => [Math.min(...profile.map((p) => p[c])), Math.max(...profile.map((p) => p[c]))];

/**
 * @param {PieceShape} piece
 * @returns {Solid}
 */
export function solid(piece) {
  if (piece.kind === 'box') {
    return {
      box: true, // a box fills its bounds, so a reader may take them as the solid
      min: piece.min,
      max: piece.max,
      distance: (p) => Math.max(...AXES.map((i) => Math.max(piece.min[i] - p[i], p[i] - piece.max[i]))),
    };
  }
  const [axis, u, v] = ALONG[piece.axis];
  /** @type {(along: number, first: number, second: number) => Vec3} */
  const placed = (along, first, second) => perAxis((i) => (i === axis ? along : i === u ? first : second));
  if (piece.kind === 'prism') {
    const [[uLow, uHigh], [vLow, vHigh]] = [spread(piece.profile, 0), spread(piece.profile, 1)];
    // A cut plane's signed distance, so a piece cut to sloped plates is sampled as the shape it draws.
    const cuts = (piece.clip ?? []).map(
      ({ normal, offset }) =>
        /** @param {Vec3} p */
        (p) =>
          (normal[0] * p[0] + normal[1] * p[1] + normal[2] * p[2] - offset) / Math.hypot(...normal),
    );
    return {
      min: placed(piece.start, uLow, vLow),
      max: placed(piece.end, uHigh, vHigh),
      distance: (p) =>
        Math.max(
          outline(piece.profile, [p[u], p[v]]),
          piece.start - p[axis],
          p[axis] - piece.end,
          ...cuts.map((cut) => cut(p)),
        ),
    };
  }
  const o = piece.origin ?? [0, 0, 0];
  const radius = Math.max(...piece.profile.map((p) => p[1]));
  const [low, high] = spread(piece.profile, 0);
  return {
    min: placed(o[axis] + low, o[u] - radius, o[v] - radius),
    max: placed(o[axis] + high, o[u] + radius, o[v] + radius),
    distance: (p) => outline(piece.profile, [p[axis] - o[axis], Math.hypot(p[u] - o[u], p[v] - o[v])]),
  };
}
