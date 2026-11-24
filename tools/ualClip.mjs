// The UAL mannequin's clips (models/references/ual1) as a game on its skeleton plays them: each node's world transform
// at one key, and from those the move of each bone of the UAL doll's rig from its rest. The joint-cover report
// (tools/joint-cover.mjs) and the clip tests pose the doll with it.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { add, IDENTITY_M, mulMM, mulMV, quatToMat3, sub, transpose } from '../site/kinematics.mjs';
import { glbAccessor, glbJson } from './glb.mjs';
import { GLB } from './ual-skeleton.mjs';

const repo = resolve(import.meta.dirname, '..');

/**
 * The mannequin's clips, read once: `keys(clip)`, how many keys a clip holds, and `nodes(clip, key)`, the node tree
 * at that key, or at rest for a null clip, by node name: each node's own translation, rotation and scale, the clip's
 * where it animates them and the node's rest otherwise, composed from the scene down.
 * @param {string} [root]
 */
export function ualClips(root = repo) {
  const glb = readFileSync(join(root, GLB));
  const gltf = glbJson(glb);
  const clipOf = (name) => {
    const clip = gltf.animations.find((animation) => animation.name === name);
    if (!clip) throw new Error(`the UAL mannequin has no clip ${name}`);
    return clip;
  };
  const keys = (name) => Math.max(...clipOf(name).samplers.map(({ input }) => gltf.accessors[input].count));
  const nodes = (name, key) => {
    const clip = name === null ? { channels: [], samplers: [] } : clipOf(name);
    const local = gltf.nodes.map(({ translation = [0, 0, 0], rotation = [0, 0, 0, 1], scale = [1, 1, 1] }) => ({
      translation,
      rotation,
      scale,
    }));
    const times = new Set();
    for (const { sampler, target } of clip.channels) {
      const { input, output } = clip.samplers[sampler];
      const at = Math.min(key, gltf.accessors[input].count - 1);
      times.add(glbAccessor(glb, gltf, input)[at]);
      const width = target.path === 'rotation' ? 4 : 3;
      local[target.node][target.path] = glbAccessor(glb, gltf, output).slice(at * width, (at + 1) * width);
    }
    // The clip is baked, every channel keyed at the same times, so one key is one instant of every node.
    if (times.size > 1) throw new Error(`${name} keys its channels apart`);
    const world = new Map();
    const walk = (index, up) => {
      const { name: nodeName, children = [] } = gltf.nodes[index];
      const { translation, rotation, scale } = local[index];
      const r = mulMM(quatToMat3(rotation), [scale[0], 0, 0, 0, scale[1], 0, 0, 0, scale[2]]);
      const node = { r: mulMM(up.r, r), t: add(up.t, mulMV(up.r, translation)) };
      world.set(nodeName, node);
      for (const child of children) walk(child, node);
    };
    for (const index of gltf.scenes[gltf.scene ?? 0].nodes) walk(index, { r: IDENTITY_M, t: [0, 0, 0] });
    return world;
  };
  return { keys, nodes };
}

/**
 * Each rig bone's move from rest, { r, t } by bone id, with its node where `nodes` has it: the bone's node rests at
 * the bone's head turned by `node.rotation`, so the move carries a point of the doll frame at rest to where the posed
 * node holds it.
 * @param {{ bones: readonly { id: string; head: number[]; node: { rotation: number[] } }[] }} rig
 * @param {ReadonlyMap<string, { r: number[]; t: number[] }>} nodes
 */
export function boneMoves(rig, nodes) {
  return new Map(
    rig.bones.map(({ id, head, node }) => {
      const posed = nodes.get(id);
      if (!posed) throw new Error(`the UAL mannequin has no node ${id}`);
      const r = mulMM(posed.r, transpose(quatToMat3(node.rotation)));
      return [id, { r, t: sub(posed.t, mulMV(r, head)) }];
    }),
  );
}
