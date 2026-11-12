// How a kit's drawn pieces compare and meet, for the tests of kits that fit one thing in more than one way.

// A piece's shape and material, ignoring the id and slot names, which a fused row may prefix with a part's site.
const shape = (piece, finish) => {
  const { id, slot, ...geometry } = piece;
  return JSON.stringify({ geometry, material: finish[slot] }, (_key, value) => (typeof value === 'number' ? Math.round(value * 1e9) / 1e9 : value));
};
// Every shape that drawn parts draw, as a sorted list, so two fittings drawing the same things compare equal.
export const shapes = (drawn) => drawn.flatMap((d) => d.pieces.map((p) => shape(p, d.finish))).sort();

// The solid a piece draws, as a signed distance (negative inside) and its bounding box, so pieces of different kinds
// can be tested against each other by sampling the space their boxes share.
const ALONG = { x: [0, 1, 2], y: [1, 2, 0], z: [2, 0, 1] };
function outline(polygon, [u, v]) {
  let inside = false;
  let nearest = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i];
    const [bx, by] = polygon[(i + 1) % polygon.length];
    if ((ay > v) !== (by > v) && u < ax + ((v - ay) / (by - ay)) * (bx - ax)) inside = !inside;
    const dx = bx - ax;
    const dy = by - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy))) : 0;
    nearest = Math.min(nearest, Math.hypot(u - ax - t * dx, v - ay - t * dy));
  }
  return inside ? -nearest : nearest;
}
export function solid(piece) {
  if (piece.kind === 'box') {
    return {
      min: piece.min,
      max: piece.max,
      distance: (p) => Math.max(...[0, 1, 2].map((i) => Math.max(piece.min[i] - p[i], p[i] - piece.max[i]))),
    };
  }
  const [axis, u, v] = ALONG[piece.axis];
  const min = [];
  const max = [];
  if (piece.kind === 'prism') {
    [min[axis], max[axis]] = [piece.start, piece.end];
    for (const [i, c] of [[u, 0], [v, 1]]) [min[i], max[i]] = [Math.min(...piece.profile.map((p) => p[c])), Math.max(...piece.profile.map((p) => p[c]))];
    // A cut plane's signed distance, so a piece cut to sloped plates is sampled as the shape it draws.
    const cuts = (piece.clip ?? []).map(({ normal, offset }) => (p) => (normal[0] * p[0] + normal[1] * p[1] + normal[2] * p[2] - offset) / Math.hypot(...normal));
    return { min, max, distance: (p) => Math.max(outline(piece.profile, [p[u], p[v]]), piece.start - p[axis], p[axis] - piece.end, ...cuts.map((cut) => cut(p))) };
  }
  const o = piece.origin;
  const radius = Math.max(...piece.profile.map((p) => p[1]));
  [min[axis], max[axis]] = [o[axis] + Math.min(...piece.profile.map((p) => p[0])), o[axis] + Math.max(...piece.profile.map((p) => p[0]))];
  for (const i of [u, v]) [min[i], max[i]] = [o[i] - radius, o[i] + radius];
  return { min, max, distance: (p) => outline(piece.profile, [p[axis] - o[axis], Math.hypot(p[u] - o[u], p[v] - o[v])]) };
}

// How two drawn parts meet, sampled every `step` m: whether they come within a step of each other, and whether they
// share any space deeper than `DEPTH` m, which faces that only abut never do. Parts as big as a truck's wheel take a
// coarser step to keep the sampling quick.
const DEPTH = 0.0005;
export function meeting(a, b, step = 0.002) {
  let touches = false;
  let overlaps = false;
  for (const p of a.map(solid)) {
    for (const q of b.map(solid)) {
      const lo = [0, 1, 2].map((i) => Math.max(p.min[i], q.min[i]) - step);
      const hi = [0, 1, 2].map((i) => Math.min(p.max[i], q.max[i]) + step);
      if (lo.some((l, i) => l > hi[i])) continue;
      for (let x = lo[0]; x <= hi[0]; x += step) {
        for (let y = lo[1]; y <= hi[1]; y += step) {
          for (let z = lo[2]; z <= hi[2]; z += step) {
            const dp = p.distance([x, y, z]);
            const dq = q.distance([x, y, z]);
            if (dp <= step && dq <= step) touches = true;
            if (dp < -DEPTH && dq < -DEPTH) overlaps = true;
          }
        }
      }
    }
  }
  return { touches, overlaps };
}
