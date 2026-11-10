// Where a posed garment stops enclosing the body part it covers, shared by the pose tool's viewer and its Node
// coverage. A body vertex showing through its shell `pokes`; a shell vertex sunk into the body `sinks`.
//
// Meshes are closed triangle soups in one common frame: { positions: xyz triples, indices } with `indices`
// undefined meaning every three consecutive vertices form a triangle. Inside-ness is ray parity: a ray from the
// point crosses a closed surface an odd number of times when the point is inside. The ray leaves along a fixed
// direction with no axis-aligned component, so it misses the edges and vertices of axis-aligned meshes.
//
// A shell covers only a span of its part (a sleeve covers the upper arm, not the shoulder cap), so a body vertex
// counts only within the shell's extent along its longest axis, shrunk by `margin` at each end. The shells are
// convex, so clipping on the whole bounding box would never find a poke.
const RAY = normalised([0.123, 0.987, 0.345]);
const EPSILON = 1e-9;
const DUPLICATE = 1e-6; // vertices this close count once: unindexed soups repeat each shared corner

function normalised(v) {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
}

function boundsOf(positions) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], positions[i + axis]);
      max[axis] = Math.max(max[axis], positions[i + axis]);
    }
  }
  return { min, max };
}

const inBox = ({ min, max }, p) => [0, 1, 2].every((axis) => p[axis] >= min[axis] && p[axis] <= max[axis]);

function prepared(mesh) {
  const { positions } = mesh;
  const indices = mesh.indices ?? Array.from({ length: positions.length / 3 }, (_, i) => i);
  return { positions, indices, bounds: boundsOf(positions) };
}

// Möller–Trumbore: does the ray from `p` cross triangle (a, b, c) ahead of the point?
function rayHits(p, positions, a, b, c) {
  const e1 = [0, 1, 2].map((k) => positions[b + k] - positions[a + k]);
  const e2 = [0, 1, 2].map((k) => positions[c + k] - positions[a + k]);
  const h = [RAY[1] * e2[2] - RAY[2] * e2[1], RAY[2] * e2[0] - RAY[0] * e2[2], RAY[0] * e2[1] - RAY[1] * e2[0]];
  const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
  if (Math.abs(det) < EPSILON) return false;
  const s = [0, 1, 2].map((k) => p[k] - positions[a + k]);
  const u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) / det;
  if (u < 0 || u > 1) return false;
  const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
  const v = (RAY[0] * q[0] + RAY[1] * q[1] + RAY[2] * q[2]) / det;
  if (v < 0 || u + v > 1) return false;
  const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det;
  return t > EPSILON;
}

function inside({ positions, indices, bounds }, p) {
  if (!inBox(bounds, p)) return false;
  let crossings = 0;
  for (let i = 0; i < indices.length; i += 3) {
    if (rayHits(p, positions, indices[i] * 3, indices[i + 1] * 3, indices[i + 2] * 3)) crossings++;
  }
  return crossings % 2 === 1;
}

function* uniqueVertices(positions) {
  const seen = new Set();
  for (let i = 0; i < positions.length; i += 3) {
    const p = [positions[i], positions[i + 1], positions[i + 2]];
    const key = p.map((x) => Math.round(x / DUPLICATE)).join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    yield p;
  }
}

function longestAxis({ min, max }) {
  const size = max.map((high, axis) => high - min[axis]);
  return size.indexOf(Math.max(...size));
}

export function clearance(body, pieces, { margin = 0 } = {}) {
  const parts = new Map(body.map(({ part, mesh }) => [part, prepared(mesh)]));
  const issues = [];
  for (const { piece, part, mesh } of pieces) {
    const bodyPart = parts.get(part);
    if (!bodyPart) throw new RangeError(`piece ${piece} covers part ${part}, which the body does not have`);
    const shell = prepared(mesh);
    const axis = longestAxis(shell.bounds);
    const low = shell.bounds.min[axis] + margin, high = shell.bounds.max[axis] - margin;
    for (const point of uniqueVertices(bodyPart.positions)) {
      if (point[axis] >= low && point[axis] <= high && !inside(shell, point)) issues.push({ kind: 'pokes', piece, part, point });
    }
    for (const point of uniqueVertices(shell.positions)) {
      if (inside(bodyPart, point)) issues.push({ kind: 'sinks', piece, part, point });
    }
  }
  const counts = { pokes: 0, sinks: 0 };
  for (const { kind } of issues) counts[kind]++;
  return { issues, counts };
}
