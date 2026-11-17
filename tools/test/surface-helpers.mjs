// Targeted planar face checks, not an exposure/occlusion-aware model validator.
import { meshForSolid } from '../packages/construct/src/shapes/mesh.ts';
import { intersectionArea } from './architecture-helpers.mjs';

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
