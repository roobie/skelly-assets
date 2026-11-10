import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boneTransforms as mobBoneTransforms } from '../packages/mobgen/src/core/pose.ts';
import { jointAngles as mobJointAngles, jointRotation as mobJointRotation } from '../packages/mobgen/src/core/joints.ts';
import {
  applyPoint, boneTransforms, compilePose, frameAbout, jointAngles, jointRotation, length, solveCCD, solveTwoBone, sub,
} from '../../site/kinematics.mjs';

// An arm hanging from a shoulder at the origin: two bones straight down, then a hand, with a hinge elbow that only
// closes forward (+z is the front). Boxes stand in for the parts the ground lift reads.
const bone = (id, parent, head, tail, limits) => ({ id, parent, head, tail, frame: frameAbout(head, tail, [-1, 0, 0]), limits, bind: { box: { min: head.map((v) => v - 0.02), max: tail.map((v) => v + 0.02) } } });
const wide = { flex: [-180, 180], twist: [-180, 180], abduct: [-180, 180] };
const arm = {
  root: 'upper',
  bones: [
    bone('upper', null, [0, 0, 0], [0, -0.3, 0], wide),
    bone('fore', 'upper', [0, -0.3, 0], [0, -0.55, 0], { flex: [0, 150], twist: [0, 0], abduct: [0, 0] }),
    bone('hand', 'fore', [0, -0.55, 0], [0, -0.65, 0], wide),
  ],
};
const rest = { root: [0, 0, 0], rotations: {} };
const near = (a, b, tolerance = 1e-6) => assert.ok(length(sub(a, b)) < tolerance, `${a} is not ${b}`);
const tailOf = (rig, pose, id) => applyPoint(boneTransforms(rig.bones, pose).get(id), rig.bones.find((b) => b.id === id).tail);

test('joint rotation and angles agree with mobgen on the same bone', () => {
  const b = arm.bones[0];
  for (const angles of [[30, 0, 0], [0, 45, 0], [0, 0, -20], [25, -40, 60]]) {
    const ours = jointRotation(b, angles), theirs = mobJointRotation(b, angles);
    ours.forEach((v, i) => assert.ok(Math.abs(v - theirs[i]) < 1e-12));
    jointAngles(b, ours).forEach((v, i) => assert.ok(Math.abs(v - angles[i]) < 1e-9));
    mobJointAngles(b, ours).forEach((v, i) => assert.ok(Math.abs(v - angles[i]) < 1e-9));
  }
});

test('bone transforms agree with mobgen for a chain of rotated bones', () => {
  const pose = { root: [0.1, 0.2, 0.3], rotations: { upper: jointRotation(arm.bones[0], [40, 10, -15]), fore: jointRotation(arm.bones[1], [70, 0, 0]) } };
  const ours = boneTransforms(arm.bones, pose), theirs = mobBoneTransforms(arm.bones, pose);
  for (const b of arm.bones) {
    near(ours.get(b.id).t, theirs.get(b.id).t);
    ours.get(b.id).r.forEach((v, i) => assert.ok(Math.abs(v - theirs.get(b.id).r[i]) < 1e-12));
  }
});

test('two-bone IK reaches a target in reach with a hinge elbow bent toward the pole', () => {
  const target = [0.1, -0.3, 0.3];
  const { pose, residual } = solveTwoBone(arm, rest, ['upper', 'fore'], target, [0, 0, -1]);
  assert.ok(residual < 1e-6);
  near(tailOf(arm, pose, 'fore'), target);
  const [flex, twist, abduct] = jointAngles(arm.bones[1], pose.rotations.fore);
  assert.ok(flex > 1, 'the elbow bends');
  assert.ok(Math.abs(twist) < 1e-6 && Math.abs(abduct) < 1e-6, 'the elbow stays a hinge');
  // The elbow is bent toward the pole: it lies behind the shoulder-to-hand line.
  const elbow = applyPoint(boneTransforms(arm.bones, pose).get('fore'), arm.bones[1].head);
  assert.ok(elbow[2] < target[2] / 2);
});

test('two-bone IK holds the elbow to its limits and reports the distance left', () => {
  // A shoulder that only swings in the sagittal plane cannot turn the elbow round, so a hand behind the back with the
  // elbow in front would need the elbow to bend backwards: its flex is held at 0 and the hand falls short.
  const sagittal = { ...arm, bones: arm.bones.map((b) => (b.id === 'upper' ? { ...b, limits: { flex: [-180, 180], twist: [0, 0], abduct: [0, 0] } } : b)) };
  const target = [0, -0.3, -0.3];
  const clamped = [];
  const { pose, residual } = solveTwoBone(sagittal, rest, ['upper', 'fore'], target, [0, 0, 1], clamped);
  assert.ok(residual > 0.05, `residual ${residual}`);
  assert.ok(clamped.some(({ bone: id }) => id === 'fore'));
  assert.ok(Math.abs(jointAngles(arm.bones[1], pose.rotations.fore)[0]) < 1e-6);
});

test('CCD walks a chain to a target within tolerance', () => {
  const target = [0.2, -0.4, 0.2];
  const { pose, residual } = solveCCD(arm, rest, ['upper', 'fore', 'hand'], target, { iterations: 40, tolerance: 1e-4 });
  assert.ok(residual < 1e-4);
  near(tailOf(arm, pose, 'hand'), target, 1e-4);
});

test('a pose file compiles to a frame with limits held, feet levelled and the root on the ground', () => {
  const { frame, report } = compilePose(arm, { angles: { fore: [200, 0, 0] }, ik: { hand: { target: [0.1, -0.3, 0.3] } }, level: ['hand'], ground: true });
  assert.deepEqual(report.clamped[0], { bone: 'fore', asked: [200, 0, 0], held: [150, 0, 0] });
  assert.ok(report.residuals.hand < 1e-6);
  assert.equal(Object.keys(frame.rotations).sort().join(), 'fore,hand,upper');
  assert.ok(frame.root[1] > 0, 'the root is lifted so the lowest box corner stands on y = 0');
  // The levelled hand points down again whatever the arm above it does.
  const transforms = boneTransforms(arm.bones, { root: frame.root, rotations: Object.fromEntries(Object.entries(frame.rotations).map(([id, q]) => [id, jointRotation(arm.bones[0], [0, 0, 0]) && quatRotation(q)])) });
  const hand = transforms.get('hand').r;
  assert.ok(Math.abs(hand[4] - 1) < 1e-6, 'y stays y');
});

const quatRotation = ([x, y, z, w]) => [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
