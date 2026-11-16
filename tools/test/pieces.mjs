// How a kit's drawn pieces compare and meet, for the tests of kits that fit one thing in more than one way.
import { solid } from '../pieceSolid.mjs';

// A piece's shape and material, ignoring the id and slot names, which a fused row may prefix with a part's site.
const shape = (piece, finish) => {
  const { id, slot, ...geometry } = piece;
  return JSON.stringify({ geometry, material: finish[slot] }, (_key, value) => (typeof value === 'number' ? Math.round(value * 1e9) / 1e9 : value));
};
// Every shape that drawn parts draw, as a sorted list, so two fittings drawing the same things compare equal.
export const shapes = (drawn) => drawn.flatMap((d) => d.pieces.map((p) => shape(p, d.finish))).sort();

// Whether two drawn parts, sampled every `step` m, hold a point where `found(dp, dq)`, given each piece's distance there,
// stopping at the first. Each pair of pieces is sampled on one grid from the corner of their boxes' meeting grown by a
// step, whatever is asked, so every question sees the same points; it visits only the points within `reach` m of both
// boxes, as a point further off lies further than that from one of the pieces.
function holds(a, b, step, reach, found) {
  const bs = b.map(solid);
  for (const p of a.map(solid)) {
    for (const q of bs) {
      const lo = [0, 1, 2].map((i) => Math.max(p.min[i], q.min[i]) - step);
      const from = [0, 1, 2].map((i) => Math.max(p.min[i], q.min[i]) - reach);
      const hi = [0, 1, 2].map((i) => Math.min(p.max[i], q.max[i]) + reach);
      if (from.some((f, i) => f > hi[i])) continue;
      for (let x = lo[0]; x <= hi[0]; x += step) {
        if (x < from[0]) continue;
        for (let y = lo[1]; y <= hi[1]; y += step) {
          if (y < from[1]) continue;
          for (let z = lo[2]; z <= hi[2]; z += step) {
            if (z >= from[2] && found(p.distance([x, y, z]), q.distance([x, y, z]))) return true;
          }
        }
      }
    }
  }
  return false;
}

// Whether two drawn parts come within a step of each other, sampled every `step` m. Parts as big as a truck's wheel take
// a coarser step to keep the sampling quick.
export const touches = (a, b, step = 0.002) => holds(a, b, step, step, (dp, dq) => dp <= step && dq <= step);

// Whether two drawn parts share any space deeper than `DEPTH` m, which faces that only abut never do, sampled every
// `step` m. A piece's distance is negative only inside its box, so only the boxes' meeting need be sampled.
const DEPTH = 0.0005;
export const overlaps = (a, b, step = 0.002) => holds(a, b, step, 0, (dp, dq) => dp < -DEPTH && dq < -DEPTH);

// The pairs among drawn parts that share space, as [i, j] with i < j, from `{ parts, step }`: one fitting's whole scan as a
// task, so a test can spread its fittings over a worker pool (tools/workerPool.mjs).
export const overlappingPairs = ({ parts, step }) =>
  parts.flatMap((a, i) => parts.slice(i + 1).flatMap((b, k) => (overlaps(a.pieces, b.pieces, step) ? [[i, i + 1 + k]] : [])));

// Both of how two drawn parts meet, for a test that asks both.
export const meeting = (a, b, step = 0.002) => ({ touches: touches(a, b, step), overlaps: overlaps(a, b, step) });
