import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearanceProbe } from '../../site/clearance.mjs';
import { IDENTITY_M, rotZ } from '../../site/kinematics.mjs';

// A closed axis-aligned box of 12 triangles about `centre`.
const boxMesh = ([w, h, d], centre = [0, 0, 0]) => {
  const positions = [];
  for (const z of [-d / 2, d / 2]) for (const y of [-h / 2, h / 2]) for (const x of [-w / 2, w / 2]) positions.push(x + centre[0], y + centre[1], z + centre[2]);
  const indices = [
    0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, // z faces
    0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, // y faces
    0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5, // x faces
  ];
  return { positions, indices };
};

// Two bones hanging down the y axis, an upper arm and a forearm below it, each a 0.1 m thick part.
const rig = { bones: [{ id: 'upper', head: [0, 0, 0], tail: [0, -0.3, 0] }, { id: 'fore', head: [0, -0.3, 0], tail: [0, -0.6, 0] }] };
const body = [{ bone: 'upper', mesh: boxMesh([0.1, 0.3, 0.1], [0, -0.15, 0]) }, { bone: 'fore', mesh: boxMesh([0.1, 0.3, 0.1], [0, -0.45, 0]) }];
const sleeve = (width, length = 0.3) => ({ piece: 'sleeve', bone: 'upper', mesh: boxMesh([width, length, width], [0, -length / 2, 0]) });
const still = new Map(rig.bones.map(({ id }) => [id, { r: IDENTITY_M, t: [0, 0, 0] }]));
const margin = 0.006;

test('a sleeve that encloses its arm is clean at rest', () => {
  const { pokes, sinks } = clearanceProbe(rig, { body, pieces: [sleeve(0.12)] }, { margin })(still);
  assert.deepEqual({ pokes, sinks }, { pokes: [], sinks: [] });
});

test('a sleeve narrower than its arm lets the arm poke through at rest', () => {
  const { pokes } = clearanceProbe(rig, { body, pieces: [sleeve(0.08)] }, { margin })(still);
  assert.ok(pokes.length > 0);
  assert.ok(pokes.every(({ bone }) => bone === 'upper'), 'only the sleeved bone is covered');
});

test('the margin forgives a fit within it and no more', () => {
  const flush = { body, pieces: [sleeve(0.1 - margin)] };
  assert.deepEqual(clearanceProbe(rig, flush, { margin })(still).pokes, []);
  assert.ok(clearanceProbe(rig, flush, { margin: 0 })(still).pokes.length > 0);
});

test('a joint that turns a covered part out of its piece pokes, and one that turns a part into a piece sinks', () => {
  // The sleeve runs past the elbow, covering the top of the forearm at rest. Swinging the forearm away pulls that out;
  // sliding the upper arm, sleeve and all, down and aside drives the sleeve's wall through the forearm.
  const long = { body, pieces: [sleeve(0.12, 0.4)] };
  const probe = clearanceProbe(rig, long, { margin });
  assert.deepEqual(probe(still), { pokes: [], sinks: [] });
  const elbow = [0, -0.3, 0];
  const about = (r, [x, y, z]) => ({ r, t: [x - (r[0] * x + r[1] * y + r[2] * z), y - (r[3] * x + r[4] * y + r[5] * z), z - (r[6] * x + r[7] * y + r[8] * z)] });
  const forearmOut = new Map([...still, ['fore', about(rotZ(90), elbow)]]);
  const { pokes } = probe(forearmOut);
  assert.ok(pokes.length > 0 && pokes.every(({ bone }) => bone === 'fore'));
  const shoulderIn = new Map([...still, ['upper', { r: IDENTITY_M, t: [-0.06, -0.25, 0] }]]);
  const { sinks } = probe(shoulderIn);
  assert.ok(sinks.length > 0 && sinks.every(({ piece, into }) => piece === 'sleeve' && into === 'fore'));
});

test('a piece already sunk into the body at rest is its fit, not a sink', () => {
  // A sleeve thinner than the arm along z but wider along x passes through the arm's sides by design.
  const sunk = { body, pieces: [{ piece: 'sleeve', bone: 'upper', mesh: boxMesh([0.12, 0.3, 0.06], [0, -0.15, 0]) }] };
  assert.deepEqual(clearanceProbe(rig, sunk, { margin })(still).sinks, []);
});

test('a probe refuses a negative margin and a pose missing a bone', () => {
  assert.throws(() => clearanceProbe(rig, { body, pieces: [] }, { margin: -1 }), /margin/);
  const probe = clearanceProbe(rig, { body, pieces: [sleeve(0.12)] }, { margin });
  assert.throws(() => probe(new Map([['upper', still.get('upper')]])), /no transform for bone fore/);
});
