// Where a posed garment stops enclosing the body it covers, shared by the pose page, the pose sheet and the clearance
// sweep. Nothing is forgiven by a margin: every finding is classified instead, so a fit that is merely flush or a
// seam where two pieces meet is told apart from a body part showing through. Why is in docs/decisions/0011-clearance-classified.md.
//
// The probe takes the doll at rest, as tools/dollRig.mjs, `restMeshes` gives it: `body`, a mesh per bone, and `pieces`,
// a mesh per worn piece with the bone it rides, all in the rig frame. A mesh is a closed triangle mesh
// { positions: xyz triples, indices }, and a body part's mesh may name each triangle's region in `pieces`
// (site/hiding.mjs). It takes bone transforms as site/kinematics.mjs, `boneTransforms` gives them.
//
// A body point is covered when a piece is meant to cover it at rest (`coverage`). A covered point outside every piece in
// a pose `pokes`, unless it is hidden inside the figure, as where one part meets the next, which no one sees; one on
// a piece's outer surface is `flush`, a coincident face. A piece point the pose drives into a body part `sinks`, unless
// it was already in there at rest, where pieces meet the next part by design, or it lies in another piece, a `seam`
// where the garment overlaps itself. The skin check (skin.mjs) draws the same covered surface, so what the probe finds and what a camera sees
// are told of one surface.
import { hides } from './hiding.mjs';
import { add, applyPoint, cross, dot, IDENTITY_M, length, mulMV, normalize, scale, sub, transpose } from './kinematics.mjs';

// Two surfaces closer than this are one: positions are stored as float32 and pass through a few transforms, which moves
// them by well under a micrometre at the doll's size, and a pixel of a review sheet spans millimetres, so a face this
// close cannot show in front of another.
export const COINCIDENT = 1e-5;
// The spacing body and piece surfaces are sampled at: coarse parts are a few large triangles, so their corners alone
// would miss a strip along an edge that passes out of its piece between two corners. It is about a pixel of a review
// sheet, so a poke too small to sample is too small to see there.
export const PITCH = 0.005;

// The ray that tells inside from outside leaves along a fixed direction with no axis-aligned component, so it misses the edges and vertices
// of the axis-aligned meshes parts are built from.
const RAY = normalize([0.123, 0.987, 0.345]);
const EPSILON = 1e-12;

const triangleCorners = ({ positions, indices }, t) => [0, 1, 2].map((k) => {
  const i = indices[t * 3 + k] * 3;
  return [positions[i], positions[i + 1], positions[i + 2]];
});
const triangles = (mesh) => Array.from({ length: mesh.indices.length / 3 }, (_, t) => triangleCorners(mesh, t));
const centroid = ([a, b, c]) => [0, 1, 2].map((k) => (a[k] + b[k] + c[k]) / 3);

function boundsOf(points) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of points) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], p[a]); max[a] = Math.max(max[a], p[a]); }
  return { min, max };
}

// Whether the boxes overlap, the first widened by `margin`.
const boxesMeet = (a, b, margin) => [0, 1, 2].every((k) => a.min[k] - margin <= b.max[k] && b.min[k] <= a.max[k] + margin);

// How far `p` lies outside the box, zero inside it.
function boxDistance({ min, max }, p) {
  let sum = 0;
  for (let a = 0; a < 3; a++) {
    const off = Math.max(min[a] - p[a], 0, p[a] - max[a]);
    sum += off * off;
  }
  return Math.sqrt(sum);
}

/**
 * Each triangle of the mesh halved across its longest side until no side is longer than `pitch`, as corner triples:
 * the surface the probe samples and the skin check draws. Halving the longest side keeps a long thin triangle to a
 * row of small ones rather than a grid.
 */
export function subdivided(mesh, pitch = PITCH) {
  const out = [];
  const split = (corners) => {
    const sides = [0, 1, 2].map((k) => length(sub(corners[(k + 1) % 3], corners[k])));
    const k = sides.indexOf(Math.max(...sides));
    if (sides[k] <= pitch) {
      out.push(corners);
      return;
    }
    const [a, b, c] = [corners[k], corners[(k + 1) % 3], corners[(k + 2) % 3]];
    const middle = [0, 1, 2].map((axis) => (a[axis] + b[axis]) / 2);
    split([a, middle, c]);
    split([middle, b, c]);
  };
  triangles(mesh).forEach(split);
  return out;
}

// A mesh's surface as the probe samples it: its triangles subdivided to `pitch`, each as { corners, point, normal, region },
// sampled at its centroid with its outward normal, `region` the region its triangle is named in, if any. A centroid lies
// inside one face, so a step off it along that normal leaves the face's plane, where a corner's step along one of its
// faces could run along a plane another face lies in. A mirrored copy's faces are turned inside out, which its negative
// volume shows.
export function sampledSurface(mesh, pitch = PITCH) {
  const faces = triangles(mesh);
  const outward = faces.reduce((sum, [a, b, c]) => sum + dot(a, cross(b, c)), 0) < 0 ? -1 : 1;
  return faces.flatMap((face, t) => {
    const normal = scale(normalize(cross(sub(face[1], face[0]), sub(face[2], face[0]))), outward);
    const region = mesh.pieces?.[t];
    return subdivided({ positions: face.flat(), indices: [0, 1, 2] }, pitch).map((corners) => ({ corners, point: centroid(corners), normal, region }));
  });
}

// Möller–Trumbore: how far along the ray from `p` in direction `dir` it meets the triangle, and whether it leaves
// through the face's outer side (+1) or enters it (-1); null when it misses or meets it behind the point.
function rayHit(p, dir, [a, b, c]) {
  const e1 = sub(b, a), e2 = sub(c, a);
  const h = cross(dir, e2);
  const det = dot(e1, h);
  if (Math.abs(det) < EPSILON) return null;
  const s = sub(p, a), u = dot(s, h) / det;
  if (u < 0 || u > 1) return null;
  const q = cross(s, e1);
  const v = dot(dir, q) / det;
  if (v < 0 || u + v > 1) return null;
  const t = dot(e2, q) / det;
  // det is the ray against the face's normal (e1 × e2), negated: positive when the ray enters the face's front.
  return t > EPSILON ? { t, side: det > 0 ? -1 : 1 } : null;
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

// ---- solids: a tree of boxes over a mesh's triangles, so a point's queries visit only the triangles near it ----

const LEAF = 8;

function boxTree(faces) {
  const bounds = boundsOf(faces.flat());
  if (faces.length <= LEAF) return { bounds, faces };
  const centres = faces.map(centroid);
  const spread = boundsOf(centres);
  const axis = [0, 1, 2].reduce((best, a) => (spread.max[a] - spread.min[a] > spread.max[best] - spread.min[best] ? a : best), 0);
  const order = faces.map((face, i) => ({ face, at: centres[i][axis] })).sort((a, b) => a.at - b.at).map(({ face }) => face);
  const half = order.length >> 1;
  return { bounds, children: [boxTree(order.slice(0, half)), boxTree(order.slice(half))] };
}

// The distance from `p` to the nearest triangle under `node`, if nearer than `best`.
function nearest(node, p, best) {
  if (boxDistance(node.bounds, p) >= best) return best;
  if (node.faces) return node.faces.reduce((least, face) => Math.min(least, triangleDistance(p, face)), best);
  const [a, b] = node.children;
  const [first, second] = boxDistance(a.bounds, p) <= boxDistance(b.bounds, p) ? [a, b] : [b, a];
  return nearest(second, p, nearest(first, p, best));
}

// Whether the ray from `p` in direction `dir` can meet the box nearer than `limit` (the slab test).
function rayMeets({ min, max }, p, dir, limit = Infinity) {
  let near = 0, far = limit;
  for (let a = 0; a < 3; a++) {
    const t1 = (min[a] - p[a]) / dir[a], t2 = (max[a] - p[a]) / dir[a];
    near = Math.max(near, Math.min(t1, t2));
    far = Math.min(far, Math.max(t1, t2));
  }
  return near <= far;
}

// How many more times the ray from `p` leaves the surface under `node` than it enters it: the number of shells around
// the point, negative for a mirrored copy, whose faces are turned inside out. A part is built of shells that overlap
// and touch, so a crossing's parity alone would call a point inside two of them outside.
const winding = (node, p) => {
  if (!rayMeets(node.bounds, p, RAY)) return 0;
  if (node.faces) return node.faces.reduce((count, face) => count + (rayHit(p, RAY, face)?.side ?? 0), 0);
  return winding(node.children[0], p) + winding(node.children[1], p);
};

// How far the ray from `p` in direction `dir` runs before it first meets a triangle under `node` beyond a coincident
// face, if nearer than `best`.
function firstHit(node, p, dir, best) {
  if (!rayMeets(node.bounds, p, dir, best)) return best;
  if (node.faces) return node.faces.reduce((least, face) => { const t = rayHit(p, dir, face)?.t ?? Infinity; return t > COINCIDENT && t < least ? t : least; }, best);
  return firstHit(node.children[1], p, dir, firstHit(node.children[0], p, dir, best));
}

// A solid: a mesh's tree at rest, carried rigidly by a bone transform. A query takes its point back into the rest
// frame, so a pose moves no triangle and builds no tree.
const STILL = { r: IDENTITY_M, t: [0, 0, 0] };
const solidOf = (mesh) => boxTree(triangles(mesh));
const carried = (tree, { r, t }) => {
  const back = transpose(r);
  return { tree, local: (p) => mulMV(back, sub(p, t)) };
};

// A mesh carried by a transform; a grip closes on one (site/fingers.mjs).
export const posedSolid = (mesh, transform) => carried(solidOf(mesh), transform);

/**
 * How far `p` lies outside the solid, negative inside. A point off the solid's box is outside it, so needs no ray. A
 * grip probes hundreds of points per joint step, so it can name a `reach` past which only the side matters: the
 * search gives up there, and the depth is ±Infinity.
 */
export function signedDepth({ tree, local }, p, reach = Infinity) {
  const q = local(p);
  const surface = nearest(tree, q, reach);
  const inside = boxDistance(tree.bounds, q) === 0 && winding(tree, q) !== 0;
  if (surface >= reach) return inside ? -Infinity : Infinity;
  return inside ? -surface : surface;
}

// Whether `p` lies inside the solid deeper than a coincident face.
function isInside({ tree, local }, p) {
  const q = local(p);
  return boxDistance(tree.bounds, q) === 0 && winding(tree, q) !== 0 && nearest(tree, q, COINCIDENT) >= COINCIDENT;
}

// How far `p` lies outside every one of the solids, or -Infinity when it lies inside one deeper than a coincident face,
// with the index of the solid that decides it. A solid whose box lies further off than the best so far cannot do better.
function depthOutside(solids, p) {
  const local = solids.map((solid) => solid.local(p));
  const off = local.map((q, i) => boxDistance(solids[i].tree.bounds, q));
  const within = solids.findIndex((solid, i) => off[i] === 0 && winding(solid.tree, local[i]) !== 0 && nearest(solid.tree, local[i], COINCIDENT) >= COINCIDENT);
  if (within >= 0) return { depth: -Infinity, index: within };
  let best = { depth: Infinity, index: -1 };
  solids.forEach((solid, index) => {
    if (off[index] >= best.depth) return;
    const depth = nearest(solid.tree, local[index], best.depth);
    if (depth < best.depth) best = { depth, index };
  });
  return best;
}

// A step off a face along its normal, past a coincident face: where the step lands tells whether the face is on the
// figure's outside, where it shows, or on a face inside it, where the shells a part or a piece is built from overlap
// or one part meets the next.
export const STEP = 2 * COINCIDENT;

// Whether `p` lies outside every one of the solids.
const outsideAll = (solids, p) => solids.every(({ tree, local }) => { const q = local(p); return boxDistance(tree.bounds, q) > 0 || winding(tree, q) === 0; });

/**
 * Which piece is meant to cover a body point at rest: `cover(bone, { point, normal })`, the point with its face's
 * outward normal, gives the index into `rest.pieces` of the piece meant to cover it, or -1 when none is. A piece
 * covers the points
 * - it encloses at rest, flush included;
 * - it passes beneath: a ray from the point straight into its body part, across the part's bone, meets the piece while
 *   still inside that part, as a jacket's yoke passes through a deltoid that stands proud of it, or a sleeve too narrow
 *   for its arm passes through the arm.
 * A ray along the bone runs out through the part's end, where it nests into the next piece through that piece's
 * opening: a fingertip's ray meets the cuff its hand reaches into, and the cuff does not cover the fingertip. Nor does a
 * piece cover what it only sits beside, as a belt bag beside the waist it hangs on. A piece that declares what it
 * `covers` of the part copy it rides passes beneath only that: a tank top that covers the trunk leaves the shoulders
 * bare, though its armholes and straps lie beneath the deltoids and the pectorals.
 * The body part's `part` and a sample's `region` name what a declaration hides (site/hiding.mjs, `hides`).
 */
export function coverage(rig, rest) {
  const pieceSolids = rest.pieces.map(({ mesh }) => carried(solidOf(mesh), STILL));
  const bodySolids = new Map(rest.body.map(({ bone, mesh }) => [bone, carried(solidOf(mesh), STILL)]));
  const parts = new Map(rest.body.map(({ bone, part }) => [bone, part]));
  const axes = new Map(rig.bones.map(({ id, head, tail }) => [id, normalize(sub(tail, head))]));
  // A body point is covered inside a piece, or beneath it where a ray into its own part meets the piece inside that
  // part, so a part whose box misses every piece's box, a coincident face's width wide, has nothing covered.
  const reached = new Set([...bodySolids].filter(([, { tree }]) => pieceSolids.some((piece) => boxesMeet(tree.bounds, piece.tree.bounds, COINCIDENT))).map(([bone]) => bone));
  const declaresBare = ({ bone, covers }, id, region) => bone === id && covers !== undefined && !hides(covers, parts.get(id), region);
  const beneath = (id, { point, normal, region }) => {
    if (Math.abs(dot(normal, axes.get(id))) >= Math.SQRT1_2) return -1;
    const dir = scale(normal, -1);
    let hit = { t: Infinity, index: -1 };
    pieceSolids.forEach(({ tree }, index) => {
      if (declaresBare(rest.pieces[index], id, region)) return;
      const t = firstHit(tree, point, dir, hit.t);
      if (t < hit.t) hit = { t, index };
    });
    if (hit.index < 0) return -1;
    return winding(bodySolids.get(id).tree, add(point, scale(dir, hit.t))) !== 0 ? hit.index : -1;
  };
  return (id, sample) => {
    if (!reached.has(id)) return -1;
    const { depth, index } = depthOutside(pieceSolids, sample.point);
    return depth <= COINCIDENT ? index : beneath(id, sample);
  };
}

/**
 * The body's surface with what covers it: for each body part { bone, samples }, its sampled surface as above, each
 * sample with `cover`, the index into `rest.pieces` of the piece meant to cover it, or -1. The probe tests the covered
 * samples. With `whole`, each sample also says whether its corners are covered too, which costs a query per corner of each
 * covered sample: the skin check draws the triangles of the whole ones, since a triangle a hem or a cuff crosses would
 * draw its uncovered part as showing, so only a caller that draws or counts them asks.
 */
export function coveredSurface(rig, rest, { whole = false } = {}) {
  const cover = coverage(rig, rest);
  const sampled = (bone, sample) => {
    const index = cover(bone, sample);
    if (!whole) return { ...sample, cover: index };
    return { ...sample, cover: index, whole: index >= 0 && sample.corners.every((point) => cover(bone, { ...sample, point }) >= 0) };
  };
  return rest.body.map(({ bone, mesh }) => ({ bone, samples: sampledSurface(mesh).map((sample) => sampled(bone, sample)) }));
}

/**
 * A probe of the doll at rest, over its covered surface: given the bone transforms of a pose, its findings as { pokes, flush, sinks, seams }, each
 * a list of points in the rig frame. A poke is { bone, piece, point, depth }: the body part, the piece meant to cover
 * it and how far outside every piece it lies. A flush point, { bone, piece, point }, is a covered point on a piece's
 * outer surface, a coincident face that draws in a tie with the piece's and so shows through it in stripes. A covered
 * point that does not show, because a step off its face lands inside the figure, is neither. A sink is { piece, into, point,
 * depth }: how far the piece passes into the body part `into`; a seam is { piece, into, point }.
 */
export function clearanceProbe(rig, rest, surface = coveredSurface(rig, rest)) {
  const covered = coveredPoints(rest, surface);
  const bodyTrees = rest.body.map(({ mesh }) => solidOf(mesh));
  const pieceTrees = rest.pieces.map(({ mesh }) => solidOf(mesh));
  const restBody = bodyTrees.map((tree) => carried(tree, STILL));
  // Each piece point with the body parts it is already sunk into at rest.
  const pieces = rest.pieces.map(({ piece, bone, mesh }) => ({
    piece, bone,
    points: sampledSurface(mesh).map(({ point }) => ({ point, sunk: new Set(restBody.flatMap((solid, i) => (isInside(solid, point) ? [i] : []))) })),
  }));
  return (transforms) => {
    const at = (id) => {
      const transform = transforms.get(id);
      if (!transform) throw new Error(`clearance: no transform for bone ${id}`);
      return transform;
    };
    const posedPieces = rest.pieces.map(({ bone }, i) => carried(pieceTrees[i], at(bone)));
    const posedBody = rest.body.map(({ bone }, i) => carried(bodyTrees[i], at(bone)));
    const findings = { ...bareFindings(covered, posedPieces, posedBody, at), sinks: [], seams: [] };
    pieces.forEach(({ piece, bone, points }, own) => {
      const others = posedPieces.filter((_, i) => i !== own);
      for (const { point, sunk } of points) {
        const posed = applyPoint(at(bone), point);
        const into = posedBody.findIndex((solid, i) => !sunk.has(i) && isInside(solid, posed));
        if (into < 0) continue;
        if (depthOutside(others, posed).depth <= COINCIDENT) findings.seams.push({ piece, into: rest.body[into].bone, point: posed });
        else findings.sinks.push({ piece, into: rest.body[into].bone, point: posed, depth: -signedDepth(posedBody[into], posed) });
      }
    });
    return findings;
  };
}

/**
 * The probe's findings with the doll at rest, as `clearanceProbe(...)` gives them for the identity pose, without the
 * work that pose cannot need: a piece point is sunk into exactly the body parts it already was at rest, so there are
 * no sinks or seams to look for and the pieces are never sampled.
 */
export function restClearance(rig, rest, surface = coveredSurface(rig, rest)) {
  const solids = (parts) => parts.map(({ mesh }) => carried(solidOf(mesh), STILL));
  return { ...bareFindings(coveredPoints(rest, surface), solids(rest.pieces), solids(rest.body), () => STILL), sinks: [], seams: [] };
}

// The covered samples of a surface, each with the piece meant to cover it.
const coveredPoints = (rest, surface) => surface.flatMap(({ bone, samples }) => samples.flatMap(({ point, normal, cover }) => (cover < 0 ? [] : [{ bone, piece: rest.pieces[cover].piece, point, normal }])));

// The pokes and flush points of covered samples against the posed pieces and body.
function bareFindings(covered, posedPieces, posedBody, at) {
  const findings = { pokes: [], flush: [] };
  const figure = [...posedPieces, ...posedBody];
  for (const { bone, piece, point, normal } of covered) {
    const posed = applyPoint(at(bone), point);
    const { depth } = depthOutside(posedPieces, posed);
    if (depth === -Infinity) continue;
    if (!outsideAll(figure, add(posed, scale(mulMV(at(bone).r, normal), STEP)))) continue;
    if (depth > COINCIDENT) findings.pokes.push({ bone, piece, point: posed, depth });
    else findings.flush.push({ bone, piece, point: posed });
  }
  return findings;
}

/**
 * A closed mesh as a gear check reads it: `depth(p)`, how far `p` lies outside it, negative inside, and `reach(p, dir)`,
 * how far the ray from `p` along the unit vector `dir` runs before it meets the mesh beyond a coincident face, Infinity
 * when it misses. They answer a gear piece's question, how far a point stands off the surface beneath it.
 */
export function meshProbe(mesh) {
  const solid = carried(solidOf(mesh), STILL);
  return { depth: (p) => signedDepth(solid, p), reach: (p, dir) => firstHit(solid.tree, p, dir, Infinity) };
}
