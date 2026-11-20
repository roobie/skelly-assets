// The rest skeleton of Quaternius's Universal Animation Library mannequin (models/references/ual1), as tracked content
// (models/dolls/ual/skeleton.json): the UAL doll's measures derive from it, and a game on UAL's skeleton seats the
// doll's parts under nodes that carry its rotations. Run again when the GLB changes; its test fails until it is.
// Usage: node tools/ual-skeleton.mjs
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { add, IDENTITY_M, mulMM, mulMV, quatToMat3 } from '../site/kinematics.mjs';
import { replaceFileIfChanged } from './generated-json.mjs';
import { glbJson } from './glb.mjs';

const repo = resolve(import.meta.dirname, '..');
export const GLB = 'models/references/ual1/UAL1_Standard.glb';
export const SKELETON = 'models/dolls/ual/skeleton.json';

const round = (digits) => (v) => Math.round(v * 10 ** digits) / 10 ** digits || 0;
// Heads to 0.1 mm, the rig's own precision; rotations to 1e-6, well inside the 1e-4 the doll's rig is held to.
const head4 = (p) => p.map(round(4));
const rotation6 = (q) => q.map(round(6));

export const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

/**
 * The skin's joints in parent-first order, each with its parent, its head in the world frame and its local rotation.
 * The world frame is the glTF scene's: the root joint's -90 degrees about x, which turns UAL's Z-up bones upright, is
 * folded into the heads, and the root keeps that turn as its rotation as the node stores it. So the doll frame (y up,
 * +z forward) is UAL's world frame at rest, and every rotation is the one a game's node holds at rest.
 * @param {Buffer} glb
 */
export function restSkeleton(glb) {
  const { nodes, skins } = glbJson(glb);
  const joints = new Set(skins[0].joints);
  const parentOf = new Map(nodes.flatMap((node, i) => (node.children ?? []).map((child) => [child, i])));
  const [root, ...extra] = [...joints].filter((i) => !joints.has(parentOf.get(i)));
  if (extra.length) throw new Error('the skin has more than one root joint');
  const above = nodes[parentOf.get(root)];
  if (above?.translation || above?.rotation || above?.scale) throw new Error('the root joint hangs under a transform');

  const bones = {};
  const walk = (i, parent, parentRotation, parentHead) => {
    const { name, translation = [0, 0, 0], rotation = [0, 0, 0, 1], scale = [1, 1, 1] } = nodes[i];
    if (scale.some((s) => Math.abs(s - 1) > 1e-5)) throw new Error(`${name} is scaled, which the skeleton leaves out`);
    if (name in bones) throw new Error(`two joints are named ${name}`);
    const head = add(parentHead, mulMV(parentRotation, translation));
    bones[name] = { parent, head: head4(head), rotation: rotation6(rotation) };
    for (const child of nodes[i].children ?? []) {
      if (joints.has(child)) walk(child, name, mulMM(parentRotation, quatToMat3(rotation)), head);
    }
  };
  walk(root, null, IDENTITY_M, [0, 0, 0]);
  return bones;
}

/** The tracked file's text: one bone to a line, so a change reads as the bones it moves. */
export const skeletonText = (glb) => {
  const bones = Object.entries(restSkeleton(glb)).map(
    ([name, bone]) => `    ${JSON.stringify(name)}: ${JSON.stringify(bone)}`,
  );
  const source = JSON.stringify({ path: GLB, sha256: sha256(glb) });
  return `{\n  "source": ${source},\n  "bones": {\n${bones.join(',\n')}\n  }\n}\n`;
};

if (import.meta.main) {
  replaceFileIfChanged(join(repo, SKELETON), skeletonText(readFileSync(join(repo, GLB))));
  console.log(`${SKELETON} from ${GLB}`);
}
