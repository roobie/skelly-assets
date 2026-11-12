import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeFrame } from '../../site/clipFrames.mjs';
import { add, applyPoint, boneTransforms, frameAbout, length, mat3ToQuat, mulMM, rotX, rotY, sub } from '../../site/kinematics.mjs';
import { clipIssues, compilePose, groundLift, poseFileOf, poseIssues, rigFrame } from '../../site/poseFile.mjs';

// A rig in tools/dollRig.mjs, `dollRig`'s shape: a pelvis standing a metre up, a spine that absorbs a mob's chest, and
// an arm whose hand reaches by two-bone IK. Each part box hugs its bone.
const wide = { flex: [-90, 90], twist: [-90, 90], abduct: [-90, 90] };
const bone = (id, parent, head, tail, limits, extra = {}) => {
  const lo = [0, 1, 2].map((a) => Math.min(head[a], tail[a]) - 0.05), hi = [0, 1, 2].map((a) => Math.max(head[a], tail[a]) + 0.05);
  return { id, parent, head, tail, frame: frameAbout(head, tail, [-1, 0, 0]), limits, bind: { box: { min: lo, max: hi } }, ...extra };
};
const rig = {
  id: 'fixture',
  revision: 3,
  bones: [
    bone('pelvis', null, [0, 1, 0], [0, 1.1, 0], wide),
    bone('spine', 'pelvis', [0, 1.1, 0], [0, 1.5, 0], wide, { absorbs: ['chest'] }),
    bone('upper', 'spine', [0.2, 1.45, 0], [0.2, 1.15, 0], wide),
    bone('fore', 'upper', [0.2, 1.15, 0], [0.2, 0.9, 0], { flex: [0, 150], twist: [0, 0], abduct: [0, 0] }),
    bone('hand', 'fore', [0.2, 0.9, 0], [0.2, 0.8, 0], wide, { reach: { chain: ['upper', 'fore'], pole: [0, 0, -1] }, grip: 0.9, gripSlant: 0 }),
  ],
};
const ours = { id: rig.id, revision: rig.revision };
const near = (a, b, tolerance = 1e-9) => assert.ok(length(sub(a, b)) < tolerance, `${a} is not ${b}`);
const nearQuat = (a, b) => assert.ok(Math.min(length(sub(a, b)) + Math.abs(a[3] - b[3]), length(add(a, b)) + Math.abs(a[3] + b[3])) < 1e-9, `${a} is not ${b}`);
const transformsOf = (frame) => boneTransforms(rig.bones, decodeFrame(frame));

test('a pose file that does not fit the rig is refused with every issue named', () => {
  const file = {
    rig: { id: rig.id, revision: rig.revision + 1 },
    angles: { spine: [10, Number.NaN, 0], tail: [0, 0, 0] },
    reach: { upper: { target: [0, 1, 0] }, hand: { target: [0, 1], pole: [0, 0, -1], weight: 1 } },
    level: ['hand', 'paw'],
    pose: 'standing',
  };
  const issues = poseIssues(rig, file).join('\n');
  for (const named of [/revision/, /angles\.spine/, /no bone tail/, /upper is not a reach bone/, /reach\.hand\.target/, /unknown key weight/, /no bone paw/, /unknown key pose/]) {
    assert.match(issues, named);
  }
  assert.throws(() => compilePose(rig, file), /does not fit rig fixture/);
  assert.deepEqual(poseIssues(rig, { rig: ours, angles: { spine: [10, 0, 0] } }), []);
});

test('a moved part is a share 0..1 of a model some hand holds', () => {
  const hold = { hand: { model: 'rifle', socket: { at: [0, 0, 0], into: [0, 1, 0], axis: [0, 0, 1] } } };
  assert.deepEqual(poseIssues(rig, { rig: ours, hold, moved: { rifle: { bolt: 0, handle: 1 } } }), []);
  const issues = poseIssues(rig, { rig: ours, hold, moved: { rifle: { bolt: 1.5, handle: 'back' }, axe: { head: 0 } } }).join('\n');
  for (const named of [/moved\.rifle\.bolt is a share/, /moved\.rifle\.handle is a share/, /moved\.axe: no hand holds axe/]) assert.match(issues, named);
  assert.match(poseIssues(rig, { rig: ours, hold, moved: [] }).join('\n'), /moved maps held models/);
});

test('angles past a limit are held to it and the hold is reported', () => {
  const { frame, report } = compilePose(rig, { rig: ours, angles: { fore: [170, 0, 0] } });
  assert.deepEqual(report.clamped, [{ bone: 'fore', asked: [170, 0, 0], held: [150, 0, 0] }]);
  assert.deepEqual(poseFileOf(rig, frame).angles.fore.map((a) => Math.round(a) + 0), [150, 0, 0]);
});

test('ground stands the posed figure on y = 0 before the reach, so a target is read in the standing world', () => {
  const standing = { rig: ours, angles: { spine: [30, 0, 0] }, ground: true };
  const { frame: stood } = compilePose(rig, standing);
  assert.ok(Math.abs(groundLift(rig, decodeFrame(stood))) < 1e-9, 'the unreached figure stands on y = 0');
  // A target off the shoulder as the standing figure shows it.
  const target = add(applyPoint(transformsOf(stood).get('upper'), rig.bones[2].head), [0.1, -0.3, 0.25]);
  const { frame, report } = compilePose(rig, { ...standing, reach: { hand: { target } } });
  assert.ok(report.residuals.hand < 1e-9, `residual ${report.residuals.hand}`);
  near(applyPoint(transformsOf(frame).get('fore'), rig.bones[3].tail), target);
  assert.equal(frame.root[1], stood.root[1]);
});

test('a levelled bone is levelled again after the reach moves its parents', () => {
  const { frame } = compilePose(rig, { rig: ours, reach: { hand: { target: [0.35, 1.0, 0.25] } }, level: ['hand'] });
  transformsOf(frame).get('hand').r.forEach((v, i) => assert.ok(Math.abs(v - [1, 0, 0, 0, 1, 0, 0, 0, 1][i]) < 1e-9));
});

test('a frame read back as a pose file compiles to the same frame', () => {
  const { frame } = compilePose(rig, { rig: ours, angles: { spine: [20, -15, 10], upper: [40, 30, -20], fore: [60, 0, 0] }, root: [0.1, 0.2, 0.3] });
  const again = compilePose(rig, poseFileOf(rig, frame));
  assert.deepEqual(again.report.clamped, []);
  near(again.frame.root, frame.root);
  for (const id of Object.keys(frame.rotations)) nearQuat(again.frame.rotations[id], frame.rotations[id]);
});

test('an actor frame folds absorbed bones into their bone, drops bones the rig lacks and stands on the rig ground', () => {
  const spine = rotX(20), chest = rotY(30);
  const actor = { root: [0.1, 0.05, 0], rotations: { spine: mat3ToQuat(spine), chest: mat3ToQuat(chest), jaw: mat3ToQuat(rotX(10)) } };
  const frame = rigFrame(rig, actor);
  assert.deepEqual(Object.keys(frame.rotations), ['spine']);
  nearQuat(frame.rotations.spine, mat3ToQuat(mulMM(spine, chest)));
  near(frame.root, [0.1, 0.05 + groundLift(rig, { root: [0, 0, 0], rotations: {} }), 0]);
});

test('a clip naming bones the rig lacks or holding no unit quaternions is refused', () => {
  const good = { kind: 'pose', frames: [{ root: [0, 0, 0], rotations: { spine: [0, 0, 0, 1] } }] };
  assert.deepEqual(clipIssues(rig, good), []);
  const bad = { kind: 'pose', frames: [{ root: [0, 0, 0], rotations: { jaw: [0, 0, 0, 1], spine: [0, 0, 0, 2] } }] };
  const issues = clipIssues(rig, bad).join('\n');
  assert.match(issues, /no bone jaw/);
  assert.match(issues, /spine is no unit quaternion/);
  assert.notDeepEqual(clipIssues(rig, { kind: 'loop', frames: [] }), []);
});
