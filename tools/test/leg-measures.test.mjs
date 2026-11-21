import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { dollTree, repo } from './doll-tree.mjs';

// The player's leg measures beside UAL's, the hips' foot the player's bust stands on in UAL's frame, and UAL's
// skeleton.
const { player, ual, bustBase, skeleton } = JSON.parse(
  evaluateJsonnet(
    `
  local joints = import 'models/dolls/ual/joints.libsonnet';
  { player: import 'models/measures/leg.libsonnet', ual: (import 'models/dolls/ual/measures.libsonnet').leg,
    bustBase: joints.bustBase, skeleton: (import 'models/dolls/ual/skeleton.libsonnet').bones }`,
    repo,
  ),
);
const { rig } = dollTree({});
const boneOf = (id) => rig.bones.find((bone) => bone.id === id);
// A joint is held to a tenth of a millimetre, past what the eye can judge; a girth is the player's own within the eye's
// error, a millimetre.
const JOINT = 1e-4;
const MM = 1e-3;
const near = (actual, expected, what, within = MM) =>
  assert.ok(Math.abs(actual - expected) <= within, `${what}: the player's ${actual} m, UAL's ${expected} m`);

test("the player's foot reaches as far as UAL's, toe and heel", () => {
  near(player.toeReach, ual.toeReach, 'toe reach');
  near(player.heelReach, ual.heelReach, 'heel reach');
});

test("the player's built hips stand where UAL's do", () => {
  const head = boneOf('thigh.L').head;
  for (const i of [0, 1, 2]) near(head[i] + bustBase[i], skeleton.thigh_l.head[i], `hip axis ${i}`, JOINT);
});

test("the player's built knee and ankle stand as far out and as high as UAL's", () => {
  for (const [bone, joint] of [
    ['shin.L', 'calf_l'],
    ['foot.L', 'foot_l'],
  ]) {
    const head = boneOf(bone).head;
    for (const i of [0, 1]) near(head[i] + bustBase[i], skeleton[joint].head[i], `${bone} axis ${i}`, JOINT);
  }
});
