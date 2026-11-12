// How a kit's drawn pieces compare and meet, for the tests of kits that fit one thing in more than one way.
import { solid } from '../pieceSolid.mjs';

// A piece's shape and material, ignoring the id and slot names, which a fused row may prefix with a part's site.
const shape = (piece, finish) => {
  const { id, slot, ...geometry } = piece;
  return JSON.stringify({ geometry, material: finish[slot] }, (_key, value) => (typeof value === 'number' ? Math.round(value * 1e9) / 1e9 : value));
};
// Every shape that drawn parts draw, as a sorted list, so two fittings drawing the same things compare equal.
export const shapes = (drawn) => drawn.flatMap((d) => d.pieces.map((p) => shape(p, d.finish))).sort();

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
