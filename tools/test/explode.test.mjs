import assert from 'node:assert/strict';
import { test } from 'node:test';
import { explode } from '../../site/explode.mjs';
import { UP } from '../../site/modelFrame.mjs';

const box = (min, max) => ({ min, max });
const centre = ({ min, max }) => min.map((x, axis) => (x + max[axis]) / 2);
const shifted = ({ min, max }, by) => box(min.map((x, a) => x + by[a]), max.map((x, a) => x + by[a]));
const overlapping = (a, b) => [0, 1, 2].every((axis) => a.min[axis] < b.max[axis] && b.min[axis] < a.max[axis]);
const dot = (a, b) => a.reduce((sum, x, axis) => sum + x * b[axis], 0);
const cross = ([ax, ay, az], [bx, by, bz]) => [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
const whole = (boxes) => box(
  [0, 1, 2].map((axis) => Math.min(...boxes.map((b) => b.min[axis]))),
  [0, 1, 2].map((axis) => Math.max(...boxes.map((b) => b.max[axis]))),
);

// An engine-bay-like assembly: a hollow shell round everything, a core, accessories touching or cutting into the core,
// a near and far twin, and a part sticking out of the shell.
const shell = box([-1, 0, -2], [1, 1.4, 2]);
const core = box([-0.3, 0.3, 1], [0.3, 0.8, 1.5]);
const assembly = [
  shell,
  core,
  box([-0.4, 0.4, 1.2], [-0.25, 0.55, 1.4]), // an alternator cutting into the core's side
  box([-0.2, 0.3, 1.5], [0.2, 0.6, 1.52]), // a belt flat on the core's front face
  box([-0.1, 0.8, 1.1], [0.1, 0.9, 1.3]), // a cover resting on the core
  box([-0.9, 0.2, -0.5], [-0.4, 1.2, 0.3]), // a near seat
  box([0.4, 0.2, -0.5], [0.9, 1.2, 0.3]), // its far twin
  box([-0.95, 0, 1.1], [-0.7, 0.6, 1.7]), // a wheel poking out under the shell
];

test('a single-piece model stays where it is', () => {
  assert.deepEqual(explode([core]), [[0, 0, 0]]);
});

test('every part moves away from the assembly centre, along the line through its own centre', () => {
  const middle = centre(whole(assembly));
  explode(assembly).forEach((offset, i) => {
    const away = centre(assembly[i]).map((x, axis) => x - middle[axis]);
    assert.ok(dot(offset, away) >= 0, `part ${i} moves toward the centre`);
    assert.ok(Math.hypot(...cross(offset, away)) < 1e-9, `part ${i} leaves its line from the centre`);
  });
});

test('no exploded part overlaps another, accessories and their core included', () => {
  const offsets = explode(assembly);
  const apart = assembly.map((b, i) => shifted(b, offsets[i]));
  for (let i = 0; i < apart.length; i++) {
    for (let j = i + 1; j < apart.length; j++) assert.ok(!overlapping(apart[i], apart[j]), `parts ${i} and ${j} still overlap`);
  }
});

test('a part with no line of its own, at the assembly centre, is lifted clear of the part it shares the centre with', () => {
  const plate = box([-1, -0.05, -1], [1, 0.05, 1]);
  const post = box([-0.1, -0.5, -0.1], [0.1, 0.5, 0.1]);
  const [still, lifted] = explode([plate, post]);
  assert.deepEqual(still, [0, 0, 0]);
  assert.ok(Math.hypot(...cross(lifted, UP)) < 1e-9 && dot(lifted, UP) > 0, 'the second part is not lifted');
  assert.ok(!overlapping(plate, shifted(post, lifted)));
});
