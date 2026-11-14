// Check that each rigid shell the game seats round the head clears the built player bust's head there
// (models/head-seats.libsonnet). The game draws both from these models, so a shell that dips into the hair here lets
// the hair show through it in the game; the consumer holds the worn shells to the same rule:
// https://github.com/roobie/skelly, `packages/deadvox/test/playerFigure.test.ts`, `wearOnFigure`.
import { resolve } from 'node:path';
import { COINCIDENT, meshProbe, sampledSurface } from '../site/clearance.mjs';
import { modelMeshes } from './dress.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';
import { at, builtModels, millimetres, placed, readBandFit } from './strap-fit.mjs';

const repo = resolve(import.meta.dirname, '..');

const readSeats = (root) => JSON.parse(evaluateJsonnet("import 'models/head-seats.libsonnet'", root));

/**
 * The ways a shell fails to clear `head`, a closed mesh in the bust model frame. `meshes` are the shell's closed
 * meshes in its model frame; the game wears it `worn.at` above the head frame and turned `worn.turn` in it, the frame
 * standing `frame.height` up the bust and turned `frame.turn`.
 */
export function seatFindings({ head, meshes, frame, worn, model }) {
  const onHead = meshProbe(head);
  // A face's corners and the centroids of its sampled patches, so a face dipping in between its corners is caught.
  const points = meshes.map((mesh) => placed(mesh, frame.turn + worn.turn, frame.height + worn.at)).flatMap((mesh) => [
    ...Array.from({ length: mesh.positions.length / 3 }, (_, i) => mesh.positions.slice(3 * i, 3 * i + 3)),
    ...sampledSurface(mesh).map(({ point }) => point),
  ]);
  const sunk = points.map((point) => ({ point, depth: onHead.depth(point) })).filter(({ depth }) => depth < -COINCIDENT);
  if (sunk.length === 0) return [];
  const deepest = sunk.reduce((worst, sample) => (sample.depth < worst.depth ? sample : worst));
  return [`${model}: ${sunk.length} of ${points.length} points of its surface lie inside the head, `
    + `${millimetres(-deepest.depth)} deep at ${at(deepest.point)}`];
}

/** The seat findings of every seated shell in a built tree, whose manifest is `manifest`. */
export function treeSeatFindings(built, manifest, root = repo) {
  const { frame } = readBandFit(root);
  const { glbOf, head } = builtModels(built, manifest);
  return Object.entries(readSeats(root)).flatMap(([model, worn]) => seatFindings({ head, meshes: modelMeshes(glbOf(model)), frame, worn, model }));
}
