import assert from 'node:assert/strict';
import { test } from 'node:test';
import { posedSolid, signedDepth } from '../../site/clearance.mjs';
import { closeHand, handAngles, holdItem } from '../../site/fingers.mjs';
import { applyPoint, boneTransforms, frameAbout, jointAngles, jointRotation, length, mat3ToQuat, mulMV, rotY, sub } from '../../site/kinematics.mjs';

// A hand in tools/dollRig.mjs, `dollRig`'s shape, part boxes in the doll frame: the palm faces -x as the doll's reference side does, one finger of
// three phalanges hangs from it, flexing about the knuckle row so positive flex curls toward the palm, and a thumb
// lies along its front edge, flexing toward the palm about the way the finger hangs. The arm above is there for the
// hold's two-bone reach.
const wide = { flex: [-90, 90], twist: [-90, 90], abduct: [-90, 90] };
const sense = [1, 1, 1];
const bone = (id, parent, head, tail, box, flexAxis, limits, extra = {}) => ({
  id, parent, head, tail, limits, sense, frame: frameAbout(head, tail, flexAxis), bind: { box, mirror: true }, ...extra,
});
const box = (min, max) => ({ min, max });
const phalanxId = (k) => (k === 0 ? 'index' : `index${k + 1}`);
const phalanx = (k, head, limits) => bone(phalanxId(k), k === 0 ? 'hand' : phalanxId(k - 1), head, [head[0], head[1] - 0.03, head[2]],
  box([-0.008, head[1] - 0.03, -0.008], [0.008, head[1], 0.008]), [0, 0, -1], limits, { digit: 'index', ...(k === 0 ? { spread: 1 } : {}) });
const rig = {
  id: 'fixture',
  revision: 1,
  bones: [
    bone('upper', null, [0, 1.5, 0], [0, 1.2, 0], box([-0.04, 1.2, -0.04], [0.04, 1.5, 0.04]), [-1, 0, 0], wide),
    bone('fore', 'upper', [0, 1.2, 0], [0, 0.95, 0], box([-0.03, 0.95, -0.03], [0.03, 1.2, 0.03]), [-1, 0, 0], { flex: [0, 150], twist: [0, 0], abduct: [0, 0] }),
    bone('hand', 'fore', [0, 0.95, 0], [0, 0.86, 0], box([-0.012, 0.86, -0.04], [0.012, 0.95, 0.04]), [-1, 0, 0], wide, { reach: { chain: ['upper', 'fore'], pole: [0, 0, -1] } }),
    phalanx(0, [0, 0.86, 0], { flex: [-20, 90], twist: [0, 0], abduct: [-15, 15] }),
    phalanx(1, [0, 0.83, 0], { flex: [0, 110], twist: [0, 0], abduct: [0, 0] }),
    phalanx(2, [0, 0.80, 0], { flex: [0, 80], twist: [0, 0], abduct: [0, 0] }),
    bone('thumb', 'hand', [0, 0.93, 0.04], [0, 0.93, 0.08], box([-0.008, 0.922, 0.04], [0.008, 0.938, 0.08]), [0, -1, 0], { flex: [-20, 60], twist: [0, 0], abduct: [-80, 20] }, { digit: 'thumb' }),
  ],
};
const bones = new Map(rig.bones.map((b) => [b.id, b]));
const rest = { root: [0, 0, 0], rotations: {} };
const near = (a, b, tolerance = 1e-9) => assert.ok(length(sub(a, b)) < tolerance, `${a} is not ${b}`);

// A closed box mesh, as a held item's mesh comes.
const boxMesh = ({ min, max }) => {
  const corner = (i) => [0, 1, 2].map((a) => ((i >> a) & 1 ? max[a] : min[a]));
  const positions = [0, 1, 2, 3, 4, 5, 6, 7].flatMap(corner);
  const quads = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
  return { positions, indices: quads.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]) };
};
const tipOf = (pose, id) => { const b = bones.get(id); return applyPoint(boneTransforms(rig.bones, pose).get(id), b.tail); };

test('a curl shorthand turns every digit toward the palm by its share, the thumb across by its own', () => {
  const angles = handAngles(rig, 'hand', { curl: 0.5, spread: 1, thumb: { in: 1, across: 0.5 } });
  assert.deepEqual(angles.index, [45, 0, 15]);
  assert.deepEqual(angles.index2, [55, 0, 0]);
  assert.deepEqual(angles.index3, [40, 0, 0]);
  assert.deepEqual(angles.thumb, [60, 0, -40]);
  const pose = { root: [0, 0, 0], rotations: Object.fromEntries(Object.entries(angles).map(([id, a]) => [id, jointRotation(bones.get(id), a)])) };
  assert.ok(tipOf(pose, 'index3')[0] < tipOf(rest, 'index3')[0] - 0.02, 'the curled fingertip comes back toward the palm face');
});

test('a hand closes on a handle by contact, each phalanx stopping on it and none sinking in', () => {
  // A haft a finger's span wide lying along the knuckle row, against the palm face and below the knuckle, out of the
  // thumb's reach.
  const handle = { min: [-0.039, 0.833, -0.1], max: [-0.012, 0.86, 0.1] };
  const solid = posedSolid(boxMesh(handle), { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] });
  const { pose, closed } = closeHand(rig, rest, 'hand', solid);
  assert.ok(closed.index.touched, 'the finger touches the haft');
  for (const id of ['index', 'index2', 'index3']) {
    const [flex] = closed.index.angles[id];
    assert.ok(flex > 0 && flex < bones.get(id).limits.flex[1], `${id} stops on the haft, not at a limit`);
    assert.ok(signedDepth(solid, tipOf(pose, id), 0.05) > -0.0015, `${id} sinks into the haft`);
  }
  assert.ok(tipOf(pose, 'index3')[0] < handle.min[0], 'the fingertip wraps past the far side of the haft');
  assert.ok(!closed.thumb.touched && closed.thumb.angles.thumb[0] === bones.get('thumb').limits.flex[1], 'a digit that meets nothing closes to its limit');
});

test('a held item without a place follows the posed palm, its socket on the palm face with the thumb along its axis', () => {
  const pose = { root: [0, 0, 0], rotations: { hand: jointRotation(bones.get('hand'), [30, 0, 10]), fore: jointRotation(bones.get('fore'), [40, 0, 0]) } };
  const socket = { at: [0.1, 0.2, 0.3], into: [0, 1, 0], axis: [1, 0, 0] };
  const { item, residual } = holdItem(rig, pose, 'hand', { model: 'thing', socket }, []);
  assert.equal(residual, 0);
  const t = boneTransforms(rig.bones, pose).get('hand');
  near(applyPoint(item, socket.at), applyPoint(t, [-0.012, 0.905, 0]));
  near(mulMV(item.r, socket.into), mulMV(t.r, [-1, 0, 0]));
  near(mulMV(item.r, socket.axis), mulMV(t.r, [0, 0, 1]));
});

test('a hold turns the palm onto a socket by twisting the forearm where the wrist cannot twist', () => {
  const limited = (id, twist) => (bone) => (bone.id === id ? { ...bone, limits: { ...bone.limits, twist } } : bone);
  const twisting = { ...rig, bones: rig.bones.map(limited('fore', [-80, 80])).map(limited('hand', [0, 0])) };
  // The item sits so the wrist stays where it hangs, its socket turned 40° about the vertical from the palm's rest
  // normal: a turn about the hanging arm's own axis, which only the forearm can give.
  const turn = rotY(40);
  const at = applyPoint({ r: turn, t: [0, 0.95, 0] }, [-0.012, -0.045, 0]);
  const report = [];
  const { pose, residual } = holdItem(twisting, rest, 'hand', { model: 'thing', at, turn: mat3ToQuat(turn), socket: { at: [0, 0, 0], into: [-1, 0, 0], axis: [0, 0, 1] } }, report);
  assert.ok(residual < 1e-3, `the wrist stays put, residual ${residual}`);
  assert.deepEqual(report.filter(({ bone }) => bone === 'hand'), [], 'the hand is not held short');
  const palm = boneTransforms(twisting.bones, pose).get('hand').r;
  near(mulMV(palm, [-1, 0, 0]), mulMV(turn, [-1, 0, 0]), 1e-3);
  assert.ok(Math.abs(Math.abs(jointAngles(bones.get('fore'), pose.rotations.fore)[1]) - 40) < 1.5, 'the forearm gives the turn');
});
