import assert from 'node:assert/strict';
import { test } from 'node:test';
import { posedSolid, signedDepth } from '../../site/clearance.mjs';
import { closeHand, handAngles, handIssues, holdItem, padOf } from '../../site/fingers.mjs';
import { compilePose, decodeFrame } from '../../site/poseFile.mjs';
import { applyPoint, boneTransforms, dot, frameAbout, jointAngles, jointRotation, length, mat3ToQuat, mulMV, rotY, sub } from '../../site/kinematics.mjs';

// A hand in tools/dollRig.mjs, `dollRig`'s shape, part boxes in the doll frame: the palm faces -x as the doll's
// reference side does, one finger of three phalanges hangs from it, flexing about the knuckle row so positive flex
// curls toward the palm, and a thumb of three bones hangs beside its front edge (+z) in the same frame, its root free
// to swing, roll and lift (models/poses/rig.libsonnet). The arm above is there for the hold's two-bone reach, its
// forearm pronating as the doll's does. A held handle crosses the palm near the knuckles, at the hand's grip share.
const wide = { flex: [-90, 90], twist: [-90, 90], abduct: [-90, 90] };
const sense = [1, 1, 1];
const bone = (id, parent, head, tail, box, flexAxis, limits, extra = {}) => ({
  id, parent, head, tail, limits, sense, frame: frameAbout(head, tail, flexAxis), bind: { box, mirror: true }, ...extra,
});
const box = (min, max) => ({ min, max });
const phalanxId = (k) => (k === 0 ? 'index' : `index${k + 1}`);
const phalanx = (k, head, limits) => bone(phalanxId(k), k === 0 ? 'hand' : phalanxId(k - 1), head, [head[0], head[1] - 0.03, head[2]],
  box([-0.008, head[1] - 0.03, -0.008], [0.008, head[1], 0.008]), [0, 0, -1], limits, { digit: 'index', ...(k === 0 ? { spread: 1 } : {}) });
const thumbId = (k) => (k === 0 ? 'thumb' : `thumb${k + 1}`);
const thumb = (k, head, limits) => bone(thumbId(k), k === 0 ? 'hand' : thumbId(k - 1), head, [head[0], head[1] - 0.02, head[2]],
  box([-0.006, head[1] - 0.02, 0.04], [0.006, head[1], 0.056]), [0, 0, -1], limits, { digit: 'thumb' });
const rig = {
  id: 'fixture',
  revision: 1,
  presets: { fist: { curl: 1, thumb: { across: 0.6, oppose: 0.7, lift: 0.6, curl: 0.8 } } },
  bones: [
    bone('upper', null, [0, 1.5, 0], [0, 1.2, 0], box([-0.04, 1.2, -0.04], [0.04, 1.5, 0.04]), [-1, 0, 0], wide),
    bone('fore', 'upper', [0, 1.2, 0], [0, 0.95, 0], box([-0.03, 0.95, -0.03], [0.03, 1.2, 0.03]), [-1, 0, 0], { flex: [0, 150], twist: [0, 0], abduct: [0, 0] }, { pronates: true }),
    bone('hand', 'fore', [0, 0.95, 0], [0, 0.86, 0], box([-0.012, 0.86, -0.04], [0.012, 0.95, 0.04]), [-1, 0, 0], wide, { reach: { chain: ['upper', 'fore'], pole: [0, 0, -1] }, grip: 0.9 }),
    phalanx(0, [0, 0.86, 0], { flex: [-20, 90], twist: [0, 0], abduct: [-15, 15] }),
    phalanx(1, [0, 0.83, 0], { flex: [0, 110], twist: [0, 0], abduct: [0, 0] }),
    phalanx(2, [0, 0.80, 0], { flex: [0, 80], twist: [0, 0], abduct: [0, 0] }),
    thumb(0, [0, 0.93, 0.04], { flex: [-10, 60], twist: [0, 70], abduct: [-60, 25] }),
    thumb(1, [0, 0.91, 0.04], { flex: [-10, 60], twist: [0, 0], abduct: [0, 0] }),
    thumb(2, [0, 0.89, 0.04], { flex: [0, 80], twist: [0, 0], abduct: [0, 0] }),
  ],
};
const bones = new Map(rig.bones.map((b) => [b.id, b]));
const rest = { root: [0, 0, 0], rotations: {} };
const near = (a, b, tolerance = 1e-9) => assert.ok(length(sub(a, b)) < tolerance, `${a} is not ${b}`);
// The palm's face where a held handle crosses it, at rest.
const gripAt = [-0.012, 0.95 - 0.9 * 0.09, 0];

// A closed box mesh, as a held item's mesh comes.
const boxMesh = ({ min, max }) => {
  const corner = (i) => [0, 1, 2].map((a) => ((i >> a) & 1 ? max[a] : min[a]));
  const positions = [0, 1, 2, 3, 4, 5, 6, 7].flatMap(corner);
  const quads = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
  return { positions, indices: quads.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]) };
};
const tipOf = (pose, id) => { const b = bones.get(id); return applyPoint(boneTransforms(rig.bones, pose).get(id), b.tail); };

const posedBy = (angles) => ({ root: [0, 0, 0], rotations: Object.fromEntries(Object.entries(angles).map(([id, a]) => [id, jointRotation(bones.get(id), a)])) });
// The thumb's pad faces the way the palm does at rest.
const thumbPad = (pose) => mulMV(boneTransforms(rig.bones, pose).get('thumb').r, [-1, 0, 0]);

test('a curl shorthand turns every digit toward the palm by its share, the thumb across, rolled and lifted by its own', () => {
  const angles = handAngles(rig, 'hand', { curl: 0.5, spread: 1, thumb: { lift: 1, across: 0.5, oppose: 0.5, curl: 0.5 } });
  assert.deepEqual(angles.index, [45, 0, 15]);
  assert.deepEqual(angles.index2, [55, 0, 0]);
  assert.deepEqual(angles.index3, [40, 0, 0]);
  assert.deepEqual(angles.thumb, [60, 35, -30]);
  assert.deepEqual(angles.thumb2, [30, 0, 0]);
  assert.deepEqual(angles.thumb3, [40, 0, 0]);
  const pose = posedBy(angles);
  assert.ok(tipOf(pose, 'index3')[0] < tipOf(rest, 'index3')[0] - 0.02, 'the curled fingertip comes back toward the palm face');
});

test('opposition rolls the thumb pad toward the fingers, and a lift carries the thumb toward the palm face', () => {
  const rolled = posedBy(handAngles(rig, 'hand', { thumb: { oppose: 1 } }));
  assert.ok(thumbPad(rolled)[2] < -0.9, `the rolled pad faces the little finger's side, not ${thumbPad(rolled)}`);
  near(tipOf(rolled, 'thumb3'), tipOf(rest, 'thumb3'), 1e-9);
  const lifted = posedBy(handAngles(rig, 'hand', { thumb: { lift: 1 } }));
  const tip = sub(tipOf(lifted, 'thumb3'), bones.get('thumb').head);
  assert.ok(tip[0] < -0.8 * length(tip), 'the lifted thumb stands out of the palm plane on the palm side');
});

test('a preset names a shorthand, and a shorthand over it changes only what it says', () => {
  assert.deepEqual(handAngles(rig, 'hand', 'fist'), handAngles(rig, 'hand', rig.presets.fist));
  const eased = handAngles(rig, 'hand', { preset: 'fist', thumb: { curl: 0 } });
  assert.deepEqual(eased.thumb, handAngles(rig, 'hand', 'fist').thumb);
  assert.deepEqual(eased.thumb3, [0, 0, 0]);
  assert.deepEqual(eased.index, handAngles(rig, 'hand', 'fist').index);
  assert.match(handIssues(rig, 'hand', 'wave').join(), /no preset wave/);
});

// A square haft `width` across lying along the knuckle row, seated on the palm's grip socket as a hold without a place
// seats it, reaching `span` either side of the palm's middle.
const seatedHaft = (width, span) => {
  const handle = { min: [-width / 2, -width / 2, -span], max: [width / 2, width / 2, span] };
  const { item } = holdItem(rig, rest, 'hand', { model: 'haft', socket: { at: [width / 2, 0, 0], into: [-1, 0, 0], axis: [0, 0, 1] } }, []);
  return { solid: posedSolid(boxMesh(handle), item), centre: applyPoint(item, [0, 0, 0]) };
};

test('a hand closes round a haft on its grip socket, every phalanx resting on it and the fingertip wrapping past it', () => {
  // The haft spans the finger only, so the thumb meets nothing.
  const { solid, centre } = seatedHaft(0.024, 0.02);
  const { pose, closed } = closeHand(rig, rest, 'hand', solid);
  assert.ok(closed.index.touched, 'the finger touches the haft');
  const transforms = boneTransforms(rig.bones, pose);
  for (const id of ['index', 'index2', 'index3']) {
    // The pad is the phalanx's palm-side face, -x at rest.
    const { min, max } = bones.get(id).bind.box;
    const pad = applyPoint(transforms.get(id), [min[0], (min[1] + max[1]) / 2, 0]);
    const gap = signedDepth(solid, pad, 0.05);
    assert.ok(gap > -0.0015 && gap < 0.005, `${id}'s pad rests on the haft, not ${gap * 1000} mm off it`);
  }
  assert.ok(tipOf(pose, 'index3')[0] < centre[0], 'the fingertip wraps past the haft\'s middle');
  const thumb = bones.get('thumb');
  assert.ok(!closed.thumb.touched && closed.thumb.angles.thumb[0] === thumb.limits.flex[0], 'a digit that meets nothing closes fully');
});

test('a thumb lifted wide comes down on the far side of a haft, not through it', () => {
  // The haft spans the thumb too; lifted, the thumb stands beyond it, and lowered all the way it would lie behind it.
  const { solid, centre } = seatedHaft(0.024, 0.06);
  const lifted = posedBy(handAngles(rig, 'hand', { thumb: { lift: 1 } }));
  const { pose, closed } = closeHand(rig, lifted, 'hand', solid);
  const [lift] = closed.thumb.angles.thumb;
  const { flex } = bones.get('thumb').limits;
  assert.ok(closed.thumb.touched && lift > flex[0] && lift < flex[1], `the thumb stops on the haft, not at a limit (${lift})`);
  for (const id of ['thumb', 'thumb2', 'thumb3']) assert.ok(signedDepth(solid, tipOf(pose, id), 0.05) > -0.0015, `${id} sinks into the haft`);
  assert.ok(tipOf(pose, 'thumb3')[0] < centre[0], 'the thumb tip rests beyond the haft\'s middle');
});

test('a held pinch sets the thumb and index pads on either face of a thin tab, closing leaving them there', () => {
  // A tab 8 mm thick across the knuckle row, before the palm where the curled index and the opposed thumb meet, held
  // with its frame on the hand's: its socket is the palm's own.
  const tab = { min: [-0.03, 0.88, 0.006], max: [-0.01, 0.9, 0.014] };
  const pinch = { index: [-0.02, 0.89, tab.min[2]], thumb: [-0.02, 0.89, tab.max[2]] };
  const file = { rig: { id: rig.id, revision: rig.revision }, hold: { hand: { model: 'tab', socket: { at: gripAt, into: [-1, 0, 0], axis: [0, 0, 1] }, pinch } } };
  const { frame, report: { grips: { hand: pinched } }, held } = compilePose(rig, file, { meshOf: () => boxMesh(tab) });
  const solid = posedSolid(boxMesh(tab), held.hand);
  const transforms = boneTransforms(rig.bones, decodeFrame(frame));
  const pad = (id) => applyPoint(transforms.get(id), padOf(bones.get(id)));
  for (const [digit, tip] of [['index', 'index3'], ['thumb', 'thumb3']]) {
    assert.ok(pinched[digit].residual < 0.0005, `the ${digit} pad reaches its point, not ${pinched[digit].residual * 1000} mm off`);
    assert.ok(Math.abs(signedDepth(solid, pad(tip), 0.05)) < 0.0005, `the ${digit} pad rests on the tab`);
  }
  const across = sub(pad('thumb3'), pad('index3'));
  assert.ok(dot(sub([-0.02, 0.89, 0.01], pad('index3')), across) > 0 && dot(sub(pad('thumb3'), [-0.02, 0.89, 0.01]), across) > 0, 'the tab lies between the pads');
});

test('a held item without a place follows the posed palm, its socket on the palm face with the thumb along its axis', () => {
  const pose = { root: [0, 0, 0], rotations: { hand: jointRotation(bones.get('hand'), [30, 0, 10]), fore: jointRotation(bones.get('fore'), [40, 0, 0]) } };
  const socket = { at: [0.1, 0.2, 0.3], into: [0, 1, 0], axis: [1, 0, 0] };
  const { item, residual } = holdItem(rig, pose, 'hand', { model: 'thing', socket }, []);
  assert.equal(residual, 0);
  const t = boneTransforms(rig.bones, pose).get('hand');
  near(applyPoint(item, socket.at), applyPoint(t, gripAt));
  near(mulMV(item.r, socket.into), mulMV(t.r, [-1, 0, 0]));
  near(mulMV(item.r, socket.axis), mulMV(t.r, [0, 0, 1]));
});

// The rig with a forearm that twists under a wrist that cannot, as the doll's arm is.
const limited = (id, twist) => (bone) => (bone.id === id ? { ...bone, limits: { ...bone.limits, twist } } : bone);
const twisting = { ...rig, bones: rig.bones.map(limited('fore', [-80, 80])).map(limited('hand', [0, 0])) };
const socket = { at: [0, 0, 0], into: [-1, 0, 0], axis: [0, 0, 1] };
// A hold whose socket is the palm's rest face carried to `wrist` and turned by `turn`, so the reach puts the wrist there.
const holdAt = (wrist, turn) => ({ model: 'thing', at: applyPoint({ r: turn, t: wrist }, sub(gripAt, [0, 0.95, 0])), turn: mat3ToQuat(turn), socket });
const wristOf = (pose) => applyPoint(boneTransforms(twisting.bones, pose).get('hand'), bones.get('hand').head);

test('a hold turns the palm onto a socket by twisting the forearm where the wrist cannot twist', () => {
  // The item sits so the wrist stays where it hangs, its socket turned 40° about the vertical from the palm's rest
  // normal: a turn about the hanging arm's own axis, which only the forearm can give.
  const turn = rotY(40);
  const report = [];
  const { pose, residual } = holdItem(twisting, rest, 'hand', holdAt([0, 0.95, 0], turn), report);
  assert.ok(residual < 1e-3, `the wrist stays put, residual ${residual}`);
  assert.deepEqual(report.filter(({ bone }) => bone === 'hand'), [], 'the hand is not held short');
  const palm = boneTransforms(twisting.bones, pose).get('hand').r;
  near(mulMV(palm, [-1, 0, 0]), mulMV(turn, [-1, 0, 0]), 1e-3);
  assert.ok(Math.abs(Math.abs(jointAngles(bones.get('fore'), pose.rotations.fore)[1]) - 40) < 1.5, 'the forearm gives the turn');
});

test('a hold on a bent arm rolls the forearm to turn the hand, leaving the wrist where the reach put it', () => {
  // The item is held out in front with the elbow bent, its socket turned about the vertical, so the palm meets it
  // only with the forearm's twist, which rolls the hand about the bent forearm rather than swinging the wrist.
  const wrist = [0, 1.15, 0.2];
  const { pose, residual } = holdItem(twisting, rest, 'hand', holdAt(wrist, rotY(40)), []);
  assert.ok(residual < 1e-3, `the reach puts the wrist there, residual ${residual}`);
  const [flex, twist] = jointAngles(bones.get('fore'), pose.rotations.fore);
  assert.ok(flex > 30 && Math.abs(twist) > 5, `the elbow bends and the forearm rolls, not flex ${flex}, twist ${twist}`);
  near(wristOf(pose), wrist, 1e-3);
});
