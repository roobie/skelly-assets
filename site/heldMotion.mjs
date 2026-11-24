// @ts-check
// A held gun's parts moved by the motions its sidecar gives them (`gun.action.parts` and `gun.moving`), for the pose
// page, the review page and for the tests that check what it does.
// It builds its matrices from the nodes' own, so it imports no three.js and node tests load it as the page does.
/** @import { Motion } from '../tools/packages/motion/src/motion.ts' */
import { poseAt } from '../tools/packages/motion/src/motion.ts';

/**
 * What this module reads of a three.js node and its matrix, and calls: stated here, as site/hiding.mjs states its own.
 * @typedef {object} Matrix
 * @property {() => Matrix} clone
 * @property {(position: unknown, quaternion: unknown, scale: unknown) => Matrix} compose
 * @property {(...elements: number[]) => Matrix} set
 * @property {(a: Matrix, b: Matrix) => Matrix} multiplyMatrices
 * @property {(position: unknown, quaternion: unknown, scale: unknown) => unknown} decompose
 */
/**
 * @typedef {object} SceneNode
 * @property {Record<string, any>} userData
 * @property {Matrix} matrix
 * @property {unknown} position
 * @property {unknown} quaternion
 * @property {unknown} scale
 * @property {(visit: (node: SceneNode) => void) => void} traverse
 * @property {(recursive: boolean) => SceneNode} clone
 */
/** @typedef {{ node: string; motion: Motion }} Mover A part's node name and the motion its sidecar gives it. */

// The node of `obj` marked as the part `part`; the model needs exactly one.
/**
 * @param {SceneNode} obj
 * @param {string} model
 * @param {string} part
 */
function partNode(obj, model, part) {
  /** @type {SceneNode[]} */
  const found = [];
  obj.traverse((node) => {
    if (node.userData.part === part) found.push(node);
  });
  const [only] = found;
  if (only === undefined || found.length !== 1)
    throw new Error(`moved.${model}: ${found.length} ${part} nodes in ${model}; it needs one`);
  return only;
}

/**
 * Every part of a gun that its sidecar moves, as `{ node, motion }`: its action's parts and the parts that move outside
 * the action, such as a port cover or a stock. `gun` is the sidecar's `gun`, or a site entry, which carries both.
 * @param {{ action?: { parts?: Readonly<Record<string, Mover>> } | undefined; moving?: readonly Mover[] | undefined }} gun
 * @returns {Mover[]}
 */
export const gunMovers = ({ action, moving = [] }) => [...Object.values(action?.parts ?? {}), ...moving];

/**
 * A copy of a held model's `scene` at rest, `obj`, and `move(moved)`, which stands each moving part at the clock `moved`
 * gives it (a pose file's `moved` for the model) of its motion and the rest at rest. A part's motion is the one of
 * `movers` (gunMovers) whose node is named by the part and family the node's extras carry, as the sidecar does; the
 * motion is in the model's own axes and in metres.
 * @param {{ scene: SceneNode; movers: readonly Mover[] }} held
 * @param {string} model
 */
export function heldItem({ scene, movers }, model) {
  const obj = scene.clone(true);
  /** @type {Map<string, { node: SceneNode; motion: Motion; matrix: Matrix }>} */
  const rests = new Map();
  /** @param {string} part */
  const restOf = (part) => {
    if (!rests.has(part)) {
      const node = partNode(obj, model, part);
      const named = `${node.userData.part}:${node.userData.family}`;
      const driver = movers.find(({ node: name }) => name === named);
      if (!driver) throw new Error(`moved.${model}.${part}: ${model} gives no motion for ${part}`);
      const matrix = node.matrix.clone().compose(node.position, node.quaternion, node.scale);
      rests.set(part, { node, motion: driver.motion, matrix });
    }
    return rests.get(part);
  };
  /** @param {Readonly<Record<string, number>>} [moved] each part's clock, 0 at rest */
  const move = (moved = {}) => {
    for (const part of Object.keys(moved)) restOf(part);
    for (const [part, { node, motion, matrix }] of rests) {
      const {
        rotation: [x, y, z],
        shift,
      } = poseAt(motion, moved[part] ?? 0);
      const pose = node.matrix.clone().set(...x, shift[0], ...y, shift[1], ...z, shift[2], 0, 0, 0, 1);
      node.matrix.multiplyMatrices(pose, matrix).decompose(node.position, node.quaternion, node.scale);
    }
  };
  return { obj, move };
}
