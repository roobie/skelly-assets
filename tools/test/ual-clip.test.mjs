import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  add,
  applyPoint,
  boneTransforms,
  IDENTITY_M,
  mulMV,
  quatToMat3,
  sub,
  transpose,
} from '../../site/kinematics.mjs';
import { restMeshes, treeMeshes } from '../dollRig.mjs';
import { glbJson } from '../glb.mjs';
import { modelGrain } from '../shapeProbe.mjs';
import { boneMoves, ualClips } from '../ualClip.mjs';
import { dollTree, repo } from './doll-tree.mjs';

const { doll, rig, built, manifest } = dollTree({ doll: 'ual' });
// The mannequin's node tree as a game holds it at one key of a clip, or at rest with none.
const { nodes: posedNodes } = ualClips(repo);

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

// A leaf part's origin is checked above, which a part turned about it keeps; a digit's tip, the middle of its flesh's
// far face, lands on the skeleton's leaf beyond it, the point the clip carries the bone's end to. The flesh is drawn
// hanging down its part's y, so the far face is the one of least y. It is voxelised at its model's grain, which moves
// each coordinate of the face's middle up to half a grain off the tip as drawn, and a leaning digit's last upright step
// (avatarLimbs.ts, `digit`) stops a little short of its tail: within a grain in all, where a digit turned off its bone
// by a grain at its tip misses. Head is no leaf here: the mannequin's skeleton ends at its head's joint, with no leaf
// beyond to land on. The ball's leaf ends the toes short of the shoe's toe, which is flesh set by hand (`toeReach`,
// models/dolls/ual/measures.libsonnet), so the toes land on no leaf either.
const { bones: skeleton } = JSON.parse(readFileSync(join(repo, 'models/dolls/ual/skeleton.json'), 'utf8'));
const rest = restMeshes(rig, doll.sites, treeMeshes(built, manifest));
const tip = (bone) => {
  const { positions } = rest.body.find((body) => body.bone === bone.id).mesh;
  const flesh = Array.from({ length: positions.length / 3 }, (_, i) => inPart(bone, positions.slice(3 * i, 3 * i + 3)));
  const foot = Math.min(...flesh.map(([, y]) => y));
  const face = flesh.filter(([, y]) => y - foot < 1e-6);
  return [0, 1, 2].map((axis) => {
    const along = face.map((p) => p[axis]);
    return (Math.min(...along) + Math.max(...along)) / 2;
  });
};
const grainOf = (bone) => {
  const { pack, path } = manifest.models.find(({ id }) => id === doll.sites[bone.bind.site].model);
  return modelGrain(glbJson(readFileSync(join(built, pack, path))));
};
const leaves = Object.entries(skeleton)
  .filter(([name]) => name.includes('_leaf'))
  .map(([name, { parent }]) => ({ name, bone: rig.bones.find(({ id }) => id === parent) }))
  .filter(({ bone }) => bone?.digit)
  .map((leaf) => ({ ...leaf, tip: tip(leaf.bone), grain: grainOf(leaf.bone) }));

test("every digit's tip lands on the skeleton leaf beyond it, at rest and as the clips play", () => {
  assert.equal(leaves.length, 10, 'each hand ends four fingers and a thumb at a skeleton leaf');
  for (const [clip, key] of [[null, 0], ...['Walk_Loop', 'Idle_Loop'].flatMap((c) => [0, 7, 19].map((k) => [c, k]))]) {
    const nodes = posedNodes(clip, key);
    for (const { name, bone, tip, grain } of leaves) {
      const miss = Math.hypot(...sub(seated(nodes, bone, tip), nodes.get(name).t));
      assert.ok(miss < grain, `${clip ?? 'rest'} key ${key}: ${bone.id} ends ${miss} m off ${name}`);
    }
  }
});

// A bone's move from rest carries a point of the doll at rest where the bone's bind seats it under the posed node, and
// at rest every bone stays where it is.
test("each bone's move from rest carries its part where the posed node seats it", () => {
  const still = boneMoves(rig, posedNodes(null, 0));
  const unposed = boneTransforms(rig.bones, { root: [0, 0, 0], rotations: {} });
  for (const bone of rig.bones) {
    const miss = Math.hypot(
      ...sub(applyPoint(still.get(bone.id), bone.tail), applyPoint(unposed.get(bone.id), bone.tail)),
    );
    assert.ok(miss < 1e-4, `${bone.id} moves ${miss} m at rest`);
  }
  const nodes = posedNodes('Sprint_Loop', 5);
  const moves = boneMoves(rig, nodes);
  for (const bone of rig.bones) {
    const q = inPart(bone, bone.tail);
    const miss = Math.hypot(...sub(applyPoint(moves.get(bone.id), bone.tail), seated(nodes, bone, q)));
    assert.ok(miss < 2e-4, `${bone.id}'s tail lies ${miss} m off where its node seats it`);
  }
});
