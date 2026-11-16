// Source probes over a compound row's pieces, for ranking the catalogue rows a reviewer has not yet looked at: runs of
// pieces that draw one pipe, wire or rail in a way the voxel grain breaks up. Like the shape probes (shapeProbe.mjs)
// they rank a review queue rather than fail a build; see ../docs/decisions/0018-review-probes.md.
import { solid } from './pieceSolid.mjs';

// A run is the pieces of one slot and kind named `<prefix>-<n>`, in the order of n, which is how a row lays out a
// repeated piece along a path.
const RUN_ID = /^(.+)-(\d+)$/;
export function runsOf(pieces) {
  const runs = new Map();
  for (const piece of pieces) {
    const match = RUN_ID.exec(piece.id);
    if (!match) continue;
    const name = `${match[1]} ${piece.slot} ${piece.kind}`;
    if (!runs.has(name)) runs.set(name, { prefix: match[1], slot: piece.slot, kind: piece.kind, pieces: [] });
    runs.get(name).pieces.push({ at: Number(match[2]), piece });
  }
  return [...runs.values()]
    .map((run) => ({ ...run, pieces: run.pieces.sort((a, b) => a.at - b.at).map(({ piece }) => piece) }))
    .filter(({ pieces: list }) => list.length >= 3);
}

const middle = ({ min, max }) => min.map((low, a) => (low + max[a]) / 2);
const meet = (a, b, slack) => [0, 1, 2].every((k) => a.min[k] - slack <= b.max[k] && b.min[k] - slack <= a.max[k]);

// Runs of square-cut pieces (boxes and turned pieces, which keep the model's axes) that step along a slant, each
// touching the next: a staircase where the row means one slanted pipe or rail. A step along one axis, such as a
// ladder's rungs or a coil's turns, is a plain stack and is not reported. `grain` is the slack within which two
// pieces count as touching.
export function stairRuns(pieces, grain) {
  return runsOf(pieces).filter(({ kind }) => kind === 'box' || kind === 'turned').flatMap(({ prefix, slot, pieces: list }) => {
    const boxes = list.map(solid);
    const steps = boxes.slice(1).map((box, n) => middle(box).map((x, a) => x - middle(boxes[n])[a]));
    const slanted = steps.every((step) => step.filter((d) => Math.abs(d) > grain / 2).length >= 2);
    const joined = boxes.slice(1).every((box, n) => meet(box, boxes[n], grain / 2));
    return slanted && joined ? [{ prefix, slot, pieces: list.length }] : [];
  });
}

// The least width of a convex polygon: the least, over its edges, of how far its corners reach from that edge's line.
function polygonWidth(points) {
  let least = Infinity;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % points.length];
    const length = Math.hypot(bx - ax, by - ay);
    if (length === 0) continue;
    const reach = Math.max(...points.map(([x, y]) => Math.abs((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / length));
    least = Math.min(least, reach);
  }
  return least;
}

// Runs of slanted prisms thinner than the grain, across their section or along their extrusion: a wire bent through
// short straight runs, which the voxel sampling turns into a jagged line of single cells rather than the curve it
// follows. A prism whose section keeps the model's axes is a plain bar and is not reported.
export function thinRuns(pieces, grain) {
  return runsOf(pieces).filter(({ kind }) => kind === 'prism').flatMap(({ prefix, slot, pieces: list }) => {
    const thin = list.filter(({ profile, start, end }) => {
      const slanted = profile.some(([ax, ay], i) => {
        const [bx, by] = profile[(i + 1) % profile.length];
        return ax !== bx && ay !== by;
      });
      return slanted && Math.min(polygonWidth(profile), end - start) < grain;
    });
    return thin.length >= 3 ? [{ prefix, slot, pieces: list.length, thin: thin.length }] : [];
  });
}
