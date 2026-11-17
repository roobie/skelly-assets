// Targeted planar face checks, not an exposure/occlusion-aware model validator.
import { meshForSolid } from '../packages/construct/src/shapes/mesh.ts';

// Sutherland–Hodgman clipping of convex, counter-clockwise 2D polygons.
const side2D = ([x, y], [nx, ny], [u, v]) => (nx - x) * (v - y) - (ny - y) * (u - x);
const intersectionArea = (subject, mask) => {
  const intersection = mask.reduce((poly, a, i) => {
    const b = mask[(i + 1) % mask.length];
    return poly.flatMap((p, j) => {
      const q = poly[(j + 1) % poly.length];
      const dp = side2D(a, b, p),
        dq = side2D(a, b, q);
      const insideP = dp >= 0,
        insideQ = dq >= 0;
      return (insideP ? [p] : []).concat(
        insideP === insideQ ? [] : [[p[0] + ((q[0] - p[0]) * dp) / (dp - dq), p[1] + ((q[1] - p[1]) * dp) / (dp - dq)]],
      );
    });
  }, subject);
  return (
    Math.abs(
      intersection.reduce((sum, p, i, poly) => {
        const q = poly[(i + 1) % poly.length];
        return sum + p[0] * q[1] - p[1] * q[0];
      }, 0),
    ) / 2
  );
};

const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function trianglesOf(solid) {
  const mesh = meshForSolid(solid, 0);
  const triangles = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const points = Array.from(mesh.indices.slice(i, i + 3), (j) => Array.from(mesh.positions.slice(j * 3, j * 3 + 3)));
    const normal = cross(sub(points[1], points[0]), sub(points[2], points[0]));
    const length = Math.hypot(...normal);
    if (length > 1e-10) triangles.push({ points, normal: normal.map((v) => v / length) });
  }
  return triangles;
}

// Both winding senses matter for transparent/double-sided panes. Float32 mesh coordinates need a tolerance.
// Returns projected area, sufficient to detect positive-area coincidence but not to measure world-space face area.
export function coplanarArea(a, b, tolerance = 5e-7) {
  let area = 0;
  for (const t of a) {
    const axis = t.normal.map(Math.abs).indexOf(Math.max(...t.normal.map(Math.abs)));
    const project = (points) => {
      const p = points.map((point) => point.filter((_, i) => i !== axis));
      const turn = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]);
      return turn < 0 ? p.toReversed() : p;
    };
    for (const u of b) {
      if (Math.abs(dot(t.normal, u.normal)) < 1 - 1e-6) continue;
      if (!u.points.every((p) => Math.abs(dot(t.normal, sub(p, t.points[0]))) < tolerance)) continue;
      area += intersectionArea(project(t.points), project(u.points));
    }
  }
  return area;
}
