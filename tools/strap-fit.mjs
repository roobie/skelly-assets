// Check that each band-fitted gear model's strap hugs the built player bust's head where the game wears it
// (models/head-band.libsonnet, `worn`). The strap is the bust's ring of hair grown by one of the strap's voxels, the
// least gap a strap on its own lattice can leave without touching the hair; where the ring steps, its inner face can
// stand off a corner of the hair by that voxel's diagonal and no further. So every sample of the strap's inner face
// must lie outside the head and within that diagonal of it, which fails the build where a head measure, the head's
// grain or a worn height moves the drawn hair out from under the strap.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { COINCIDENT, meshProbe, sampledSurface, STEP } from '../site/clearance.mjs';
import { modelMeshes } from './dress.mjs';
import { glbJson } from './glb.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';

const repo = resolve(import.meta.dirname, '..');

const BUST = 'player_bust';
const STRAP = 'strap';

const readBandFit = (root) => JSON.parse(evaluateJsonnet("import 'models/head-band.libsonnet'", root));

const millimetres = (metres) => `${(metres * 1000).toFixed(1)} mm`;
const at = (p) => `(${p.map((value) => value.toFixed(3)).join(', ')})`;

// `mesh`, in a gear model's frame, carried into the bust model frame: turned `turn` degrees about y, then lifted `lift`.
function placed(mesh, turn, lift) {
  const angle = (turn * Math.PI) / 180;
  const cos = Math.round(Math.cos(angle) * 1e12) / 1e12, sin = Math.round(Math.sin(angle) * 1e12) / 1e12;
  const positions = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const [x, y, z] = mesh.positions.slice(i, i + 3);
    positions.push(cos * x + sin * z, y + lift, -sin * x + cos * z);
  }
  return { positions, indices: mesh.indices };
}

/**
 * The ways a gear model's strap fails to hug `head`, a closed mesh in the bust model frame. `strap` is the strap's
 * closed mesh in the gear model's frame, drawn on a lattice of `grain`; the game wears the model `worn.at` above the
 * head frame and turned `worn.turn` in it, the frame standing `frame.height` up the bust and turned `frame.turn`.
 */
export function strapFindings({ head, strap, grain, frame, worn, model }) {
  const seated = placed(strap, frame.turn + worn.turn, frame.height + worn.at);
  const onHead = meshProbe(head);
  const onStrap = meshProbe(seated);
  const bound = grain * Math.SQRT2;
  // Sampling at half the strap's grain puts a sample on every patch of its faces, which are whole lattice cells.
  const surface = sampledSurface(seated, grain / 2);
  // The inner face: a side face that shows, rather than lying inside another of the strap's boxes, and looks at the head.
  const inner = surface.filter(({ point, normal }) => Math.abs(normal[1]) < 0.5
    && onStrap.depth(point.map((value, k) => value + normal[k] * STEP)) > 0
    && Number.isFinite(onHead.reach(point, normal)));
  if (inner.length === 0) return [`${model}: no face of the strap looks at the head`];
  const depths = inner.map(({ point }) => ({ point, depth: onHead.depth(point) }));
  const findings = [];
  const sunk = depths.filter(({ depth }) => depth < -COINCIDENT);
  if (sunk.length > 0) {
    const deepest = sunk.reduce((worst, sample) => (sample.depth < worst.depth ? sample : worst));
    findings.push(`${model}: ${sunk.length} of ${inner.length} samples of the strap's inner face lie inside the head, `
      + `${millimetres(-deepest.depth)} deep at ${at(deepest.point)}`);
  }
  const loose = depths.filter(({ depth }) => depth > bound + COINCIDENT);
  if (loose.length > 0) {
    const furthest = loose.reduce((worst, sample) => (sample.depth > worst.depth ? sample : worst));
    findings.push(`${model}: ${loose.length} of ${inner.length} samples of the strap's inner face stand further off `
      + `the head than a strap voxel's ${millimetres(bound)} diagonal, ${millimetres(furthest.depth)} at ${at(furthest.point)}`);
  }
  return findings;
}

// A gear model's strap as one mesh in its model frame, with the voxel grain its strap is drawn at.
function strapOf(buffer, model) {
  const meshes = modelMeshes(buffer, (part, piece, slot) => slot === STRAP);
  const grains = new Set(glbJson(buffer).meshes.flatMap(({ primitives }) => primitives)
    .filter(({ extras }) => extras?.slot === STRAP).map(({ extras }) => extras.voxelGrain));
  if (meshes.length !== 1 || grains.size !== 1) throw new Error(`${model} draws no single strap on one voxel grain`);
  return { strap: meshes[0], grain: [...grains][0] };
}

/** The strap findings of every band-fitted gear model in a built tree, whose manifest is `manifest`. */
export function treeStrapFindings(built, manifest, root = repo) {
  const { frame, worn } = readBandFit(root);
  const glbOf = (id) => {
    const entry = manifest.models.find((model) => model.id === id && model.path.endsWith('.glb'));
    if (!entry) throw new Error(`the built tree holds no ${id}`);
    return readFileSync(join(built, entry.pack, entry.path));
  };
  const head = modelMeshes(glbOf(BUST)).find(({ part }) => part === 'head');
  if (!head) throw new Error(`${BUST} has no head part`);
  return Object.entries(worn).flatMap(([model, place]) => strapFindings({ head, ...strapOf(glbOf(model), model), frame, worn: place, model }));
}
