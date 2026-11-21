import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeFrame } from '../../site/clipFrames.mjs';
import {
  add,
  applyPoint,
  boneTransforms,
  IDENTITY_M,
  mat3ToQuat,
  mulMM,
  mulMV,
  quatToMat3,
  rotAxis,
  sub,
} from '../../site/kinematics.mjs';
import { encodeFrame } from '../../site/poseFile.mjs';
import { restOffset, treeMeshes } from '../dollRig.mjs';
import { dollTree, WEAR } from './doll-tree.mjs';

const { built, manifest, rig, sitesIn } = dollTree({ wears: [WEAR] });
const meshes = treeMeshes(built, manifest);

const close = (a, b, message) => a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < 1e-4, `${message}: ${a} vs ${b}`));

// A pose turning every bone about a different axis, written as a clip frame and read back as a game plays it.
const posed = () => {
  const rotations = Object.fromEntries(
    rig.bones.map(({ id }, i) => [id, rotAxis([1 + (i % 3), 2 - (i % 2), 1 + (i % 4)], 15 + 7 * (i % 5))]),
  );
  return decodeFrame(encodeFrame({ root: [0.2, -0.1, 0.3], rotations }));
};

// Where a game puts a point of a part's own model frame: every bone a node at its head under its parent's, turned by
// the clip's quaternion (the node's rest rotation being identity), the part a child of its node by bind.rest alone.
const seatedBy = (frame, bone, q) => {
  const nodes = new Map();
  for (const { id, parent, head, node } of rig.bones) {
    assert.deepEqual(node.rotation, [0, 0, 0, 1], id);
    const turn = frame.rotations[id] ?? IDENTITY_M;
    const up = nodes.get(parent);
    nodes.set(id, {
      r: up ? mulMM(up.r, turn) : turn,
      t: up ? add(up.t, mulMV(up.r, sub(head, rig.bones.find((b) => b.id === parent).head))) : add(head, frame.root),
    });
  }
  const { rotation, translation, scale } = bone.bind.rest;
  const local = add(
    mulMV(
      quatToMat3(rotation),
      q.map((c, i) => c * scale[i]),
    ),
    translation,
  );
  return applyPoint(nodes.get(bone.id), local);
};

test("a worn piece seated from its bone's bind alone follows the posed part copy it is drawn in", () => {
  const frame = posed();
  const transforms = boneTransforms(rig.bones, frame);
  const worn = sitesIn(WEAR).filter(({ part }) => part !== undefined);
  assert.ok(worn.length > 0);
  for (const site of worn) {
    const bone = rig.bones.find(({ bind }) => bind.part === site.part && bind.side === site.side);
    for (const { positions } of meshes(site.model)) {
      for (let i = 0; i < positions.length; i += 3) {
        const q = positions.slice(i, i + 3);
        const flipped = site.mirror ? [-q[0], q[1], q[2]] : q;
        const atRest = add(site.turn ? mulMV(quatToMat3(site.turn), flipped) : flipped, site.at);
        close(seatedBy(frame, bone, q), applyPoint(transforms.get(bone.id), atRest), `${site.model} on ${bone.id}`);
      }
    }
  }
});

test("a node rest-turned off the model's axes seats the part through its own rotation", () => {
  const turn = rotAxis([0.3, 1, 0.2], 50);
  const head = [0.1, 0.5, -0.2];
  const at = [0.4, 0.2, 0.3];
  const q = [0.05, -0.1, 0.2];
  for (const mirror of [false, true]) {
    const { rotation, translation, scale } = restOffset({ at, mirror }, head, mat3ToQuat(turn));
    const local = add(
      mulMV(
        quatToMat3(rotation),
        q.map((c, i) => c * scale[i]),
      ),
      translation,
    );
    // The node in the model: at its head, turned by its rest rotation.
    close(add(head, mulMV(turn, local)), add(mirror ? [-q[0], q[1], q[2]] : q, at), `mirror ${mirror}`);
  }
});
