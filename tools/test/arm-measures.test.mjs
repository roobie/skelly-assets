import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateJsonnet } from '../jsonnet/index.mjs';
import { dollTree, repo } from './doll-tree.mjs';

// The player's arm measures beside the UAL doll's, and UAL's skeleton.
const { player, ual, skeleton } = JSON.parse(
  evaluateJsonnet(
    `{ player: import 'models/measures/arm.libsonnet', ual: (import 'models/dolls/ual/measures.libsonnet').arm,
       skeleton: (import 'models/dolls/ual/skeleton.libsonnet').bones }`,
    repo,
  ),
);
const { rig } = dollTree({});
const boneOf = (id) => rig.bones.find((bone) => bone.id === id);
// A joint is held to a tenth of a millimetre, past what the eye can judge; a girth is UAL's within the eye's error, a
// millimetre.
const JOINT = 1e-4;
const MM = 1e-3;
const near = (actual, expected, what, within = MM) =>
  assert.ok(Math.abs(actual - expected) <= within, `${what}: the player's ${actual} m, UAL's ${expected} m`);
const span = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

test("the player's arm and hand are as thick and as long as UAL's", () => {
  for (const girth of [
    'upperWidth',
    'upperDepth',
    'foreWidth',
    'wristWidth',
    'palmLength',
    'palmWidth',
    'palmThickness',
  ])
    near(player[girth], ual[girth], girth);
});

// The built rig, not the measures, so a part's socket that strays from the joint it stands on shows here. The rig
// rests its arms swung down from the skeleton's, so each bone is judged by its span from its parent's joint.
test("the player's built elbow and wrist stand as far from the joint before them as UAL's", () => {
  for (const [bone, joint] of [
    ['forearm', 'lowerarm'],
    ['hand', 'hand'],
  ]) {
    const child = boneOf(`${bone}.L`);
    const ualJoint = skeleton[`${joint}_l`];
    near(
      span(child.head, boneOf(child.parent).head),
      span(ualJoint.head, skeleton[ualJoint.parent].head),
      `${bone}.L`,
      JOINT,
    );
  }
});

// The player's fingers hang straight down the arm from UAL's knuckles, so each bone runs as long as UAL's runs along
// the arm; the thumb leans as UAL's does, so each of its bones runs as long as UAL's whole.
test("the player's built knuckles stand where UAL's do, each finger bone runs as long along the arm as UAL's and each thumb bone as long as UAL's", () => {
  const along = (child) => span(boneOf(child).head, boneOf(boneOf(child).parent).head);
  const fromWrist = (joint) => span(skeleton[`${joint}_l`].head, skeleton.hand_l.head);
  [...player.fingers.map((finger) => `${finger}_01`), 'thumb_01'].forEach((joint) =>
    near(along(`${joint}.L`), fromWrist(joint), `${joint}.L from the wrist`, JOINT),
  );
  player.fingers.forEach((finger, i) =>
    [1, 2].forEach((k) =>
      near(along(`${finger}_0${k + 1}.L`), player.phalanxLengths[i][k - 1], `${finger}_0${k}.L`, JOINT),
    ),
  );
  [1, 2].forEach((k) =>
    near(
      along(`thumb_0${k + 1}.L`),
      span(skeleton[`thumb_0${k + 1}_l`].head, skeleton[`thumb_0${k}_l`].head),
      `thumb_0${k}.L`,
      JOINT,
    ),
  );
});
