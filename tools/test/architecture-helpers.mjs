import assert from 'node:assert/strict';

export const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} != ${expected}`);
export const bounds = (pieces) => {
  const points = pieces.flatMap((p) =>
    p.kind === 'box'
      ? [p.min, p.max]
      : p.profile.flatMap(([u, v]) =>
          [p.start, p.end].map((along) =>
            p.axis === 'x' ? [along, u, v] : p.axis === 'y' ? [v, along, u] : [u, v, along],
          ),
        ),
  );
  return [Math.min, Math.max].map((extreme) => [0, 1, 2].map((axis) => extreme(...points.map((p) => p[axis]))));
};
export const contains = (p, point) => {
  if (p.kind === 'box') return point.every((v, axis) => v >= p.min[axis] && v <= p.max[axis]);
  const axis = 'xyz'.indexOf(p.axis);
  if (point[axis] < p.start || point[axis] > p.end) return false;
  const [u, v] = p.axis === 'x' ? [point[1], point[2]] : p.axis === 'y' ? [point[2], point[0]] : [point[0], point[1]];
  return p.profile.every(([x, y], i, poly) => {
    const [nx, ny] = poly[(i + 1) % poly.length];
    return (nx - x) * (v - y) - (ny - y) * (u - x) >= -1e-9;
  });
};
// Architecture examples use quarter turns; preserve exact grid coordinates when transforming their endpoints.
export const placed = (site, point) => {
  const angle = 2 * Math.atan2(site.turn[1], site.turn[3]);
  const c = Math.round(Math.cos(angle)),
    s = Math.round(Math.sin(angle));
  return [c * point[0] + s * point[2], point[1], -s * point[0] + c * point[2]].map((v, axis) => v + site.at[axis]);
};
const cross = ([x, y], [nx, ny], [u, v]) => (nx - x) * (v - y) - (ny - y) * (u - x);
export const intersectionArea = (subject, mask) => {
  const intersection = mask.reduce((poly, a, i) => {
    const b = mask[(i + 1) % mask.length];
    return poly.flatMap((p, j) => {
      const q = poly[(j + 1) % poly.length];
      const dp = cross(a, b, p),
        dq = cross(a, b, q);
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
// All stone pieces are boxes or z prisms. Find same-facing, positive-area coplanar surface overlaps, not
// intentional interior volume overlap. Opposite-facing contact planes at a fitted seam are fine.
export const coplanarOverlap = (a, b) => {
  const prism = (p) =>
    p.kind === 'box'
      ? {
          start: p.min[2],
          end: p.max[2],
          profile: [
            [p.min[0], p.min[1]],
            [p.max[0], p.min[1]],
            [p.max[0], p.max[1]],
            [p.min[0], p.max[1]],
          ],
        }
      : p;
  a = prism(a);
  b = prism(b);
  const tolerance = 1e-8;
  if (
    (Math.abs(a.start - b.start) < tolerance || Math.abs(a.end - b.end) < tolerance) &&
    intersectionArea(a.profile, b.profile) > tolerance
  )
    return true;
  const height = Math.min(a.end, b.end) - Math.max(a.start, b.start);
  if (height <= tolerance) return false;
  return a.profile.some((p, i, poly) => {
    const q = poly[(i + 1) % poly.length];
    const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const dx = (q[0] - p[0]) / length,
      dy = (q[1] - p[1]) / length;
    return b.profile.some((r, j, other) => {
      const t = other[(j + 1) % other.length];
      if (dx * (t[0] - r[0]) + dy * (t[1] - r[1]) <= 0) return false;
      if (Math.abs(cross(p, q, r) / length) > tolerance || Math.abs(cross(p, q, t) / length) > tolerance) return false;
      const u = (r[0] - p[0]) * dx + (r[1] - p[1]) * dy;
      const v = (t[0] - p[0]) * dx + (t[1] - p[1]) * dy;
      return (Math.min(length, Math.max(u, v)) - Math.max(0, Math.min(u, v))) * height > tolerance;
    });
  });
};
export const glbBounds = (bytes) => {
  const data = Buffer.from(bytes);
  const gltf = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)));
  for (const node of gltf.nodes) {
    assert.ok(!node.matrix);
    if (node.translation) assert.ok(node.translation.every((v) => Math.abs(v) < 1e-9));
    if (node.rotation) assert.deepEqual(node.rotation, [0, 0, 0, 1]);
  }
  const positions = gltf.meshes.flatMap(({ primitives }) =>
    primitives.map(({ attributes }) => gltf.accessors[attributes.POSITION]),
  );
  return [Math.min, Math.max].map((extreme, side) =>
    [0, 1, 2].map((axis) => extreme(...positions.map((p) => p[side === 0 ? 'min' : 'max'][axis]))),
  );
};
