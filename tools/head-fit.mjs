// Check that each rigid shell the game seats round the head clears the built player bust's head there
// (models/head-seats.libsonnet). The game draws both from these models, so a shell that dips into the hair here lets
// the hair show through it in the game; the consumer holds the worn shells to the same rule:
// https://github.com/roobie/skelly, `packages/deadvox/test/playerFigure.test.ts`, `wearOnFigure`.
// And check that each solid helmet (models/head-helmets.libsonnet) hides the head it is drawn round, seated as the
// showcase dresses it.
import { resolve } from 'node:path';
import { COINCIDENT, meshProbe, sampledSurface } from '../site/clearance.mjs';
import { modelMeshes } from './dress.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { at, builtModels, millimetres, placed, readBandFit } from './strap-fit.mjs';

const repo = resolve(import.meta.dirname, '..');

export const readSeats = (root) => JSON.parse(evaluateJsonnet("import 'models/head-seats.libsonnet'", root));
export const readHelmets = (root) => JSON.parse(evaluateJsonnet("import 'models/head-helmets.libsonnet'", root));

// A face's corners and the centroids of its sampled patches, so a face dipping in between its corners is caught.
const surfacePoints = (mesh) => [
  ...Array.from({ length: mesh.positions.length / 3 }, (_, i) => mesh.positions.slice(3 * i, 3 * i + 3)),
  ...sampledSurface(mesh).map(({ point }) => point),
];

/**
 * The ways a shell fails to clear `head`, a closed mesh in the bust model frame. `meshes` are the shell's closed
 * meshes in its model frame; the game wears it `worn.at` above the head frame and turned `worn.turn` in it, the frame
 * standing `frame.height` up the bust and turned `frame.turn`.
 */
export function seatFindings({ head, meshes, frame, worn, model }) {
  const onHead = meshProbe(head);
  const points = meshes
    .map((mesh) => placed(mesh, frame.turn + worn.turn, frame.height + worn.at))
    .flatMap(surfacePoints);
  const sunk = points
    .map((point) => ({ point, depth: onHead.depth(point) }))
    .filter(({ depth }) => depth < -COINCIDENT);
  if (sunk.length === 0) return [];
  const deepest = sunk.reduce((worst, sample) => (sample.depth < worst.depth ? sample : worst));
  return [
    `${model}: ${sunk.length} of ${points.length} points of its surface lie inside the head, ` +
      `${millimetres(-deepest.depth)} deep at ${at(deepest.point)}`,
  ];
}

/**
 * The seat findings of every seated shell in a built tree, whose manifest is `manifest`; `seats` is where the game wears
 * each. An empty table is a finding, so the check never passes having checked nothing.
 */
export function treeSeatFindings(built, manifest, root = repo, seats = readSeats(root)) {
  if (Object.keys(seats).length === 0) return ['models/head-seats.libsonnet seats no shell'];
  const { frame } = readBandFit(root);
  const { glbOf, head } = builtModels(built, manifest);
  return Object.entries(seats).flatMap(([model, worn]) =>
    seatFindings({ head, meshes: modelMeshes(glbOf(model)), frame, worn, model }),
  );
}

// The ways out a ray takes from a point a helmet hides: along the axes and the plan's and the height's diagonals.
const LOOKS = [-1, 0, 1]
  .flatMap((x) => [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((z) => [x, y, z])))
  .filter((dir) => dir.some((value) => value !== 0))
  .map((dir) => dir.map((value) => value / Math.hypot(...dir)));

/**
 * The ways a solid helmet fails to hide `head`, a closed mesh in the bust model frame, when its `brow` anchor is seated
 * at the bust's, `headBrow`. `meshes` are the helmet's closed meshes in its model frame. A point of the head shows where
 * it lies outside every mesh and a ray from it gets out past them all; one in a hollow the helmet closes round, as
 * under a crown cap, does not.
 */
export function helmetFindings({ head, headBrow, meshes, brow, model }) {
  const probes = meshes.map(meshProbe);
  const seat = brow.map((value, k) => value - headBrow[k]);
  const shown = surfacePoints(head)
    .map((point) => point.map((value, k) => value + seat[k]))
    .filter((point) => probes.every((probe) => probe.depth(point) > COINCIDENT))
    .filter((point) => LOOKS.some((dir) => probes.every((probe) => probe.reach(point, dir) === Infinity)));
  if (shown.length === 0) return [];
  const highest = shown.reduce((top, point) => (point[1] > top[1] ? point : top));
  return [`${model}: ${shown.length} points of the head show outside it, the highest at ${at(highest)}`];
}

/**
 * The helmet findings of every solid helmet in a built tree, whose manifest is `manifest`; `helmets` are their ids. An
 * empty list is a finding, so the check never passes having checked nothing.
 */
export function treeHelmetFindings(built, manifest, root = repo, helmets = readHelmets(root)) {
  if (helmets.length === 0) return ['models/head-helmets.libsonnet lists no helmet'];
  const { glbOf, anchorsOf, head, headBrow } = builtModels(built, manifest);
  return helmets.flatMap((model) =>
    helmetFindings({ head, headBrow, meshes: modelMeshes(glbOf(model)), brow: anchorsOf(model).brow, model }),
  );
}
