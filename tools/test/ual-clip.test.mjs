import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  add,
  applyPoint,
  dot,
  IDENTITY_M,
  mulMM,
  mulMV,
  quatToMat3,
  scale,
  sub,
  transpose,
} from '../../site/kinematics.mjs';
import { glbAccessor, glbJson } from '../glb.mjs';
import { GLB } from '../ual-skeleton.mjs';
import { dollTree, repo } from './doll-tree.mjs';

const { doll, rig } = dollTree({ doll: 'ual' });
const glb = readFileSync(join(repo, GLB));
const gltf = glbJson(glb);

// The mannequin's node tree as a game holds it at one key of a clip, or at rest with none: each node's own translation,
// rotation and scale, the clip's where it animates them and the node's rest otherwise, composed from the scene down.
const posedNodes = (clipName, key) => {
  const clip = gltf.animations.find(({ name }) => name === clipName) ?? { channels: [], samplers: [] };
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
  assert.ok(times.size <= 1, `${clipName} keys its channels apart`);
  const world = new Map();
  const walk = (index, up) => {
    const { name, children = [] } = gltf.nodes[index];
    const { translation, rotation, scale } = local[index];
    const r = mulMM(quatToMat3(rotation), [scale[0], 0, 0, 0, scale[1], 0, 0, 0, scale[2]]);
    const node = { r: mulMM(up.r, r), t: add(up.t, mulMV(up.r, translation)) };
    world.set(name, node);
    for (const child of children) walk(child, node);
  };
  for (const index of gltf.scenes[gltf.scene ?? 0].nodes) walk(index, { r: IDENTITY_M, t: [0, 0, 0] });
  return world;
};

// A point of a bone's part, in the part's own model frame, where a game seats it: under the bone's node by the
// bone's bind alone.
const seated = (nodes, bone, q) => {
  const { rotation, translation, scale } = bone.bind.rest;
  return applyPoint(
    nodes.get(bone.id),
    add(
      mulMV(
        quatToMat3(rotation),
        q.map((c, i) => c * scale[i]),
      ),
      translation,
    ),
  );
};
// A point of the doll frame in a bone's part's own model frame, undoing where the doll places the part copy.
const inPart = (bone, p) => {
  const copy = doll.parts.get(bone.bind.part).find(({ side }) => side === bone.bind.side);
  const unturned = mulMV(copy.turn ? transpose(quatToMat3(copy.turn)) : IDENTITY_M, sub(p, copy.at));
  return copy.mirror ? [-unturned[0], unturned[1], unturned[2]] : unturned;
};

test("the UAL mannequin's rest seats every part where the doll stands it", () => {
  const nodes = posedNodes(null, 0);
  for (const bone of rig.bones) {
    const miss = Math.hypot(...sub(seated(nodes, bone, [0, 0, 0]), bone.head));
    assert.ok(miss < 1e-4, `${bone.id} rests ${miss} m off its head`);
  }
});

// Each joint carried twice, by the part above it (the point of its flesh the joint was at) and by the part below (its
// own origin), lands in one place however the clip turns the two nodes.
for (const clip of ['Walk_Loop', 'Idle_Loop']) {
  test(`every part stays seated at its joint as ${clip} plays`, () => {
    for (const key of [0, 7, 19]) {
      const nodes = posedNodes(clip, key);
      for (const bone of rig.bones.filter(({ parent }) => parent !== null)) {
        const parent = rig.bones.find(({ id }) => id === bone.parent);
        const above = seated(nodes, parent, inPart(parent, bone.head));
        const below = seated(nodes, bone, [0, 0, 0]);
        const miss = Math.hypot(...sub(above, below));
        assert.ok(miss < 1e-4, `${clip} key ${key}: ${bone.id} lies ${miss} m off its joint on ${parent.id}`);
      }
    }
  });
}

// A leaf part's origin is checked above, which a part turned about it keeps; its far end, the rig's tail through its
// flesh's far face, lies on the line from its joint to the skeleton's leaf beyond it, the point the clip carries the
// bone's end to, as exactly as the joints do. Along that line the far face stands off the leaf by the flesh of a
// fingertip, the thumb's pad or a shoe's toe, under 3 mm. Head is no leaf here: the mannequin's skeleton ends at its
// head's joint, with no leaf beyond to land on.
const LEAF_FLESH = 0.003;
const { bones: skeleton } = JSON.parse(readFileSync(join(repo, 'models/dolls/ual/skeleton.json'), 'utf8'));
const leaves = Object.entries(skeleton)
  .filter(([name]) => name.includes('_leaf'))
  .map(([name, { parent }]) => ({ name, bone: rig.bones.find(({ id }) => id === parent) }));

test('every leaf part reaches out to the skeleton leaf beyond it, at rest and as the clips play', () => {
  assert.ok(leaves.length > 0 && leaves.every(({ bone }) => bone), 'every skeleton leaf hangs from a bone of the rig');
  for (const [clip, key] of [[null, 0], ...['Walk_Loop', 'Idle_Loop'].flatMap((c) => [0, 7, 19].map((k) => [c, k]))]) {
    const nodes = posedNodes(clip, key);
    for (const { name, bone } of leaves) {
      const joint = seated(nodes, bone, [0, 0, 0]);
      const toLeaf = sub(nodes.get(name).t, joint);
      const line = scale(toLeaf, 1 / Math.hypot(...toLeaf));
      const far = sub(seated(nodes, bone, inPart(bone, bone.tail)), joint);
      const beyond = dot(far, line) - Math.hypot(...toLeaf);
      const off = Math.hypot(...sub(far, scale(line, dot(far, line))));
      const at = `${clip ?? 'rest'} key ${key}: ${bone.id}`;
      assert.ok(off < 1e-4, `${at} ends ${off} m off the line to ${name}`);
      assert.ok(Math.abs(beyond) < LEAF_FLESH, `${at} ends ${beyond} m past ${name}`);
    }
  }
});
