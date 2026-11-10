// Where a posed garment stops enclosing the body it covers, shared by the pose page and the pose sheet. A covered body
// point that ends up outside every piece `pokes`; a piece point newly sunk into a body part `sinks`. Both count only
// past `margin`, so a piece that fits its part flush is clean.
//
// The probe takes the doll at rest, as tools/dollRig.mjs, `restMeshes` gives it: `body`, a mesh per bone, and `pieces`,
// a mesh per worn piece with the bone it rides, all in the rig frame. A mesh is a closed triangle mesh
// { positions: xyz triples, indices }. It takes bone transforms as site/kinematics.mjs, `boneTransforms` gives them.
//
// A piece rides its bone rigidly, so what a pose changes is at the joints: a seam opens or a piece passes into the next
// part. A body point is covered when some piece encloses it at rest, or when it lies within the span of a piece along
// the piece's own bone, less `margin` at each end, so a piece too narrow for its part is flagged at rest as in any pose
// (a sleeve covers its arm from cuff to shoulder seam, not the hand beyond its cuff). Pieces pass into the body by
// design where they meet the next piece, so a piece point already sunk at rest is the piece's fit, not the pose's doing.
import { applyPoint, dot, IDENTITY_M, length, normalize, sub } from './kinematics.mjs';

// The parity ray leaves along a fixed direction with no axis-aligned component, so it misses the edges and vertices
// of the axis-aligned meshes parts are built from.
const RAY = normalize([0.123, 0.987, 0.345]);
const EPSILON = 1e-9;

const triangleCorners = ({ positions, indices }, t) => [0, 1, 2].map((k) => {
  const i = indices[t * 3 + k] * 3;
  return [positions[i], positions[i + 1], positions[i + 2]];
});

function boundsOf(points) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of points) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], p[a]); max[a] = Math.max(max[a], p[a]); }
  return { min, max };
}

const nearBox = ({ min, max }, p, reach) => [0, 1, 2].every((a) => p[a] >= min[a] - reach && p[a] <= max[a] + reach);

// A mesh carried by a transform, as triangles with their bounds; a grip closes on one (site/fingers.mjs).
export function posedSolid(mesh, transform) {
  const count = mesh.indices.length / 3;
  const triangles = Array.from({ length: count }, (_, t) => triangleCorners(mesh, t).map((p) => applyPoint(transform, p)));
  return { triangles, bounds: boundsOf(triangles.flat()) };
}

// The points a mesh is probed at: its vertices, once each, and its triangles' centroids, which stand in for the faces
// of a coarse part between its corners.
function samplePoints(mesh) {
  const seen = new Map();
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const p = mesh.positions.slice(i, i + 3);
    seen.set(p.map((x) => x.toFixed(6)).join(), p);
  }
  const centroids = Array.from({ length: mesh.indices.length / 3 }, (_, t) => {
    const [a, b, c] = triangleCorners(mesh, t);
    return [0, 1, 2].map((k) => (a[k] + b[k] + c[k]) / 3);
  });
  return [...seen.values(), ...centroids];
}

// Möller–Trumbore: does the ray from `p` cross the triangle ahead of the point?
function rayCrosses(p, [a, b, c]) {
  const e1 = sub(b, a), e2 = sub(c, a);
  const h = [RAY[1] * e2[2] - RAY[2] * e2[1], RAY[2] * e2[0] - RAY[0] * e2[2], RAY[0] * e2[1] - RAY[1] * e2[0]];
  const det = dot(e1, h);
  if (Math.abs(det) < EPSILON) return false;
  const s = sub(p, a), u = dot(s, h) / det;
  if (u < 0 || u > 1) return false;
  const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
  const v = dot(RAY, q) / det;
  return v >= 0 && u + v <= 1 && dot(e2, q) / det > EPSILON;
}

// The distance from `p` to the nearest point of the triangle (Ericson, Real-Time Collision Detection, 5.1.5).
function triangleDistance(p, [a, b, c]) {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return length(ap);
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return length(bp);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return length(sub(ap, ab.map((x) => x * (d1 / (d1 - d3)))));
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return length(cp);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return length(sub(ap, ac.map((x) => x * (d2 / (d2 - d6)))));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    return length(sub(bp, sub(c, b).map((x) => x * w)));
  }
  const denom = 1 / (va + vb + vc);
  const v = vb * denom, w = vc * denom;
  return length(sub(ap, [0, 1, 2].map((k) => ab[k] * v + ac[k] * w)));
}

/**
 * How far `p` lies outside the solid, negative inside, as long as that is no more than `reach` either way; beyond it,
 * only the side is known, as ±Infinity.
 */
export function signedDepth({ triangles, bounds }, p, reach) {
  if (!nearBox(bounds, p, reach)) return Infinity;
  let crossings = 0, nearest = Infinity;
  for (const triangle of triangles) {
    if (rayCrosses(p, triangle)) crossings++;
    nearest = Math.min(nearest, triangleDistance(p, triangle));
  }
  const inside = crossings % 2 === 1;
  if (nearest > reach) return inside ? -Infinity : Infinity;
  return inside ? -nearest : nearest;
}

const STILL = { r: IDENTITY_M, t: [0, 0, 0] };

// The body points the pieces cover, as described above.
function coveredPoints(rig, rest, margin) {
  const bones = new Map(rig.bones.map((bone) => [bone.id, bone]));
  const enclosing = rest.pieces.map(({ mesh }) => posedSolid(mesh, STILL));
  const spans = new Map();
  for (const { bone: id, mesh } of rest.pieces) {
    const bone = bones.get(id);
    const axis = normalize(sub(bone.tail, bone.head));
    const along = samplePoints(mesh).map((p) => dot(sub(p, bone.head), axis));
    spans.set(id, [...(spans.get(id) ?? []), { axis, low: Math.min(...along) + margin, high: Math.max(...along) - margin }]);
  }
  return rest.body.flatMap(({ bone: id, mesh }) => {
    const head = bones.get(id).head;
    const inSpan = (p) => (spans.get(id) ?? []).some(({ axis, low, high }) => { const s = dot(sub(p, head), axis); return s >= low && s <= high; });
    return samplePoints(mesh)
      .filter((p) => inSpan(p) || enclosing.some((solid) => signedDepth(solid, p, margin) <= margin))
      .map((point) => ({ bone: id, point }));
  });
}

/**
 * A probe of the doll at rest: given the bone transforms of a pose, the covered body points it shows through its
 * pieces and the piece points it newly sinks into its body, each past `margin`, as
 * { pokes: [{ bone, point }], sinks: [{ piece, into, point }] } with points in the rig frame.
 */
export function clearanceProbe(rig, rest, { margin }) {
  if (!(margin >= 0)) throw new Error('clearance needs a margin of zero or more metres');
  const covered = coveredPoints(rig, rest, margin);
  const restBody = rest.body.map(({ mesh }) => posedSolid(mesh, STILL));
  // Each piece point with the body parts it is already sunk into at rest.
  const pieces = rest.pieces.map(({ piece, bone, mesh }) => ({
    piece, bone, mesh,
    points: samplePoints(mesh).map((point) => ({ point, sunk: new Set(restBody.flatMap((solid, i) => (signedDepth(solid, point, margin) < -margin ? [i] : []))) })),
  }));
  return (transforms) => {
    const at = (id) => {
      const transform = transforms.get(id);
      if (!transform) throw new Error(`clearance: no transform for bone ${id}`);
      return transform;
    };
    const posedPieces = pieces.map(({ bone, mesh }) => posedSolid(mesh, at(bone)));
    const posedBody = rest.body.map(({ bone, mesh }) => posedSolid(mesh, at(bone)));
    const pokes = covered
      .map(({ bone, point }) => ({ bone, point: applyPoint(at(bone), point) }))
      .filter(({ point }) => posedPieces.every((solid) => signedDepth(solid, point, margin) > margin));
    const sinks = pieces.flatMap(({ piece, bone, points }) => points.flatMap(({ point, sunk }) => {
      const posed = applyPoint(at(bone), point);
      const into = posedBody.findIndex((solid, i) => !sunk.has(i) && signedDepth(solid, posed, margin) < -margin);
      return into < 0 ? [] : [{ piece, into: rest.body[into].bone, point: posed }];
    }));
    return { pokes, sinks };
  };
}
