import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boneTransforms as mobBoneTransforms } from '../packages/mobgen/src/core/pose.ts';
import { clampJointAngles as mobClampJointAngles, jointAngles as mobJointAngles, jointRotation as mobJointRotation } from '../packages/mobgen/src/core/joints.ts';
import {
  applyPoint, boneTransforms, clampJointAngles, frameAbout, jointAngles, jointRotation, length, levelBone, mulMV, normalize, rotAxis, sub, solveTwoBone,
} from '../../site/kinematics.mjs';

// An arm hanging from a shoulder at the origin: two bones straight down, then a hand, with a hinge elbow that only
// closes forward (+z is the front).
const bone = (id, parent, head, tail, limits) => ({ id, parent, head, tail, frame: frameAbout(head, tail, [-1, 0, 0]), limits });
const wide = { flex: [-180, 180], twist: [-180, 180], abduct: [-180, 180] };
const arm = {
  bones: [
    bone('upper', null, [0, 0, 0], [0, -0.3, 0], wide),
    bone('fore', 'upper', [0, -0.3, 0], [0, -0.55, 0], { flex: [0, 150], twist: [0, 0], abduct: [0, 0] }),
    bone('hand', 'fore', [0, -0.55, 0], [0, -0.65, 0], { flex: [-70, 80], twist: [0, 0], abduct: [-25, 20] }),
  ],
};
const rest = { root: [0, 0, 0], rotations: {} };
const near = (a, b, tolerance = 1e-6) => assert.ok(length(sub(a, b)) < tolerance, `${a} is not ${b}`);
const sameMatrix = (a, b) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-12, `${a} is not ${b}`));
const tailOf = (rig, pose, id) => applyPoint(boneTransforms(rig.bones, pose).get(id), rig.bones.find((b) => b.id === id).tail);

// The twin's contract is mobgen's: the same bone data gives the same rotations, angles, limits and transforms.
test('joint rotation, angles and limits agree with mobgen on the same bone', () => {
  const [upper, , hand] = arm.bones;
  for (const angles of [[30, 0, 0], [0, 45, 0], [0, 0, -20], [25, -40, 60]]) {
    sameMatrix(jointRotation(upper, angles), mobJointRotation(upper, angles));
    const rotation = jointRotation(upper, angles);
    jointAngles(upper, rotation).forEach((v, i) => assert.ok(Math.abs(v - mobJointAngles(upper, rotation)[i]) < 1e-9));
  }
  for (const angles of [[100, 5, -40], [-90, 0, 30], [10, 0, 0]]) assert.deepEqual(clampJointAngles(hand, angles), mobClampJointAngles(hand, angles));
});

test('a pronating bone twisted after a right-angle flex rolls about itself where a plain bone swings round a cone', () => {
  const plain = arm.bones[1];
  const pronating = { ...plain, pronates: true };
  const posed = (bone, angles) => ({ root: [0, 0, 0], rotations: { fore: jointRotation(bone, angles) } });
  const flexed = posed(pronating, [90, 0, 0]), rolled = posed(pronating, [90, 40, 0]);
  const tail = tailOf(arm, flexed, 'fore');
  near(tailOf(arm, rolled, 'fore'), tail);
  // The frame has turned by the twist about the posed bone.
  const along = normalize(sub(tail, plain.head));
  near(mulMV(rolled.rotations.fore, plain.frame.x), mulMV(rotAxis(along, 40), mulMV(flexed.rotations.fore, plain.frame.x)));
  // A plain bone twists about its rest axis before it flexes, so the same twist carries the flexed bone round.
  assert.ok(length(sub(tailOf(arm, posed(plain, [90, 40, 0]), 'fore'), tail)) > 0.1, 'a plain bone\'s tail is carried round');
});

test('a pronating bone\'s angles read back from its rotation across the whole range an elbow closes through', () => {
  const pronating = { ...arm.bones[1], pronates: true };
  for (const angles of [[30, 0, 0], [0, 45, 0], [0, 0, -20], [25, -40, 60], [120, 70, -15], [-60, 30, 10], [150, -80, 0]]) {
    const read = jointAngles(pronating, jointRotation(pronating, angles));
    read.forEach((v, i) => assert.ok(Math.abs(v - angles[i]) < 1e-9, `${read} is not ${angles}`));
  }
});

test('bone transforms agree with mobgen for a chain of rotated bones', () => {
  const pose = { root: [0.1, 0.2, 0.3], rotations: { upper: jointRotation(arm.bones[0], [40, 10, -15]), fore: jointRotation(arm.bones[1], [70, 0, 0]) } };
  const ours = boneTransforms(arm.bones, pose), theirs = mobBoneTransforms(arm.bones, pose);
  for (const b of arm.bones) {
    near(ours.get(b.id).t, theirs.get(b.id).t, 1e-12);
    sameMatrix(ours.get(b.id).r, theirs.get(b.id).r);
  }
});

test('two-bone IK reaches a target in reach with a hinge elbow bent toward the pole', () => {
  const target = [0.1, -0.3, 0.3];
  const { pose, residual } = solveTwoBone(arm, rest, ['upper', 'fore'], target, [0, 0, -1]);
  assert.ok(residual < 1e-9, `residual ${residual}`);
  near(tailOf(arm, pose, 'fore'), target);
  const [flex, twist, abduct] = jointAngles(arm.bones[1], pose.rotations.fore);
  assert.ok(flex > 1, 'the elbow bends');
  assert.ok(Math.abs(twist) < 1e-6 && Math.abs(abduct) < 1e-6, 'the elbow stays a hinge');
  // Bent toward the pole, behind the shoulder-to-hand line.
  const elbow = applyPoint(boneTransforms(arm.bones, pose).get('fore'), arm.bones[1].head);
  assert.ok(elbow[2] < target[2] / 2);
});

test('two-bone IK holds the elbow to its limits and reports the distance left', () => {
  // A shoulder that only swings in the sagittal plane cannot turn the elbow round, so a hand behind the back with the
  // elbow in front would need the elbow to bend backwards: its flex is held at 0 and the hand falls short.
  const sagittal = { bones: arm.bones.map((b) => (b.id === 'upper' ? { ...b, limits: { flex: [-180, 180], twist: [0, 0], abduct: [0, 0] } } : b)) };
  const clamped = [];
  const { pose, residual } = solveTwoBone(sagittal, rest, ['upper', 'fore'], [0, -0.3, -0.3], [0, 0, 1], clamped);
  assert.ok(residual > 0.05, `residual ${residual}`);
  assert.ok(clamped.some(({ bone: id }) => id === 'fore'));
  assert.ok(Math.abs(jointAngles(arm.bones[1], pose.rotations.fore)[0]) < 1e-6);
});

test('two-bone IK turns the pole with the bone the chain hangs from', () => {
  // A shoulder turned a quarter about y carries a pole of -z round to -x, so the elbow bends that way.
  const shouldered = { bones: [bone('trunk', null, [0, 0.1, 0], [0, 0.4, 0], wide), ...arm.bones.map((b) => (b.parent === null ? { ...b, parent: 'trunk' } : b))] };
  const turned = { root: [0, 0, 0], rotations: { trunk: jointRotation(shouldered.bones[0], [0, 90, 0]) } };
  const target = [0, -0.45, 0];
  const { pose, residual } = solveTwoBone(shouldered, turned, ['upper', 'fore'], target, [0, 0, -1]);
  assert.ok(residual < 1e-9, `residual ${residual}`);
  const elbow = applyPoint(boneTransforms(shouldered.bones, pose).get('fore'), arm.bones[1].head);
  assert.ok(elbow[0] < -0.05 && Math.abs(elbow[2]) < 1e-6, `elbow at ${elbow}`);
});

test('a levelled bone keeps its rest orientation within its limits whatever its parents do', () => {
  const bentArm = { root: [0, 0, 0], rotations: { upper: jointRotation(arm.bones[0], [30, 0, 0]), fore: jointRotation(arm.bones[1], [40, 0, 0]) } };
  const levelled = levelBone(arm, bentArm, 'hand');
  sameMatrix(boneTransforms(arm.bones, levelled).get('hand').r.map((v) => Math.round(v * 1e9) / 1e9), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  // Past the hand's flex limit it is held there, and the hold is reported.
  const report = [];
  const tooFar = { ...bentArm, rotations: { ...bentArm.rotations, fore: jointRotation(arm.bones[1], [120, 0, 0]) } };
  levelBone(arm, tooFar, 'hand', report);
  assert.equal(report[0]?.bone, 'hand');
});
