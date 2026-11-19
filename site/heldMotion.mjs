// A held gun's parts moved by the motions its sidecar gives them (`gun.action.parts`), for the pose page and for the tests
// that check what it does.
// It builds its matrices from the nodes' own, so it imports no three.js and node tests load it as the page does.
import { poseAt } from '../tools/packages/motion/src/motion.ts';

// The node of `obj` marked as the part `part`; the model needs exactly one.
function partNode(obj, model, part) {
  const found = [];
  obj.traverse((node) => {
    if (node.userData.part === part) found.push(node);
  });
  if (found.length !== 1) throw new Error(`moved.${model}: ${found.length} ${part} nodes in ${model}; it needs one`);
  return found[0];
}

/**
 * A copy of a held model's `scene` at rest, `obj`, and `move(moved)`, which stands each moving part at the clock `moved`
 * gives it (a pose file's `moved` for the model) of its motion and the rest at rest. A part's motion is the one `action`
 * (the model's `gun.action`) gives the action part of its node, named by the part and family the node's extras carry, as
 * the sidecar does; the motion is in the model's own axes and in metres.
 */
export function heldItem({ scene, action }, model) {
  const obj = scene.clone(true);
  const rests = new Map();
  const restOf = (part) => {
    if (!rests.has(part)) {
      const node = partNode(obj, model, part);
      const named = `${node.userData.part}:${node.userData.family}`;
      const driver = Object.values(action?.parts ?? {}).find(({ node: name }) => name === named);
      if (!driver) throw new Error(`moved.${model}.${part}: ${model}'s action has no motion for ${part}`);
      const matrix = node.matrix.clone().compose(node.position, node.quaternion, node.scale);
      rests.set(part, { node, motion: driver.motion, matrix });
    }
    return rests.get(part);
  };
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
