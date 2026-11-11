// Check that each head-gear strap fits the built player bust's head: from the strap's inner anchor on each side, the ray
// toward the head must start outside it and meet it within the strap's own wall, since the game seats the gear by
// that ray (deadvox, test/playerFigure.test.ts, `expectSnugStrap`). A strap authored against the head's shape
// (models/head-band.libsonnet) fits by construction, so this catches the build where a head measure or the head's
// voxel grain moves the drawn surface out from under it.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { rayDistance } from '../site/clearance.mjs';
import { modelMeshes } from './dress.mjs';
import { evaluateJsonnet } from './jsonnet/index.mjs';

const repo = resolve(import.meta.dirname, '..');

const BUST = 'player_bust';
const SIDES = ['left', 'right', 'front', 'back'];
// The anchors are stored as float32, so a distance this far over the wall is still the wall.
const SLACK = 1e-6;

const subtract = (a, b) => a.map((value, i) => value - b[i]);

// The head's frame height and each band-fitted gear model's worn height, from models/head-band.libsonnet.
export const readBandFit = (root = repo) => JSON.parse(evaluateJsonnet("import 'models/head-band.libsonnet'", root));

/**
 * The ways a gear model's straps fail to fit `head`, a closed mesh in the bust model frame. `anchors` are the gear
 * model's `strap_<side>_inner` and `strap_<side>_outer`, in its own frame, whose origin the game wears `at` above the
 * head frame at height `frame`.
 */
export function strapFindings({ head, anchors, frame, at, model }) {
  return SIDES.flatMap((side) => {
    const inner = anchors[`strap_${side}_inner`];
    const outer = anchors[`strap_${side}_outer`];
    if (!inner || !outer) return [`${model}: no strap_${side}_inner and strap_${side}_outer anchors`];
    const toHead = subtract(inner, outer);
    const wall = Math.hypot(...toHead);
    const { inside, distance } = rayDistance(head, [inner[0], inner[1] + frame + at, inner[2]], toHead.map((value) => value / wall));
    if (inside) return [`${model}: the ${side} strap's inner face is inside the head`];
    if (distance > wall + SLACK) {
      const reach = Number.isFinite(distance) ? `${(distance * 1000).toFixed(1)} mm from the head` : 'off the head';
      return [`${model}: the ${side} strap's inner face is ${reach}, further than its ${(wall * 1000).toFixed(1)} mm wall`];
    }
    return [];
  });
}

/** The strap findings of every band-fitted gear model in a built tree, whose manifest is `manifest`. */
export function treeStrapFindings(built, manifest, root = repo) {
  const { frame, wornAt } = readBandFit(root);
  const entryOf = (id) => {
    const entry = manifest.models.find((model) => model.id === id && model.path.endsWith('.glb'));
    if (!entry) throw new Error(`the built tree holds no ${id}`);
    return entry;
  };
  const bust = entryOf(BUST);
  const bustMeshes = modelMeshes(readFileSync(join(built, bust.pack, bust.path)));
  const head = bustMeshes.find(({ part }) => part === 'head');
  if (!head) throw new Error(`${BUST} has no head part`);
  return Object.entries(wornAt).flatMap(([model, at]) => {
    const { pack } = entryOf(model);
    const { anchors } = JSON.parse(readFileSync(join(built, pack, 'things', `${model}.model.json`), 'utf8'));
    return strapFindings({ head, anchors, frame, at, model });
  });
}
