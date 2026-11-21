import assert from 'node:assert/strict';
import { test } from 'node:test';
import { helmetFindings, seatFindings, treeHelmetFindings, treeSeatFindings } from '../head-fit.mjs';
import { boxes } from './boxes.mjs';

// A box head 40 mm wide and 50 mm deep, standing 40 mm tall up to its top at y = 1, and a box shell of 4 mm walls round
// it that leaves `gap` of room at the sides and over the top when its origin sits at the head's foot.
const HEAD = boxes([
  [-0.02, 0.96, -0.025],
  [0.02, 1, 0.025],
]);
const shell = (gap) => {
  const x = 0.02 + gap,
    z = 0.025 + gap,
    top = 0.04 + gap,
    wall = 0.004;
  return [
    boxes(
      [
        [-x - wall, 0, -z - wall],
        [-x, top, z + wall],
      ],
      [
        [x, 0, -z - wall],
        [x + wall, top, z + wall],
      ],
      [
        [-x, 0, -z - wall],
        [x, top, -z],
      ],
      [
        [-x, 0, z],
        [x, top, z + wall],
      ],
      [
        [-x - wall, top, -z - wall],
        [x + wall, top + wall, z + wall],
      ],
    ),
  ];
};
const findings = (at, turn) =>
  seatFindings({
    head: HEAD,
    meshes: shell(0.004),
    frame: { height: 0.75, turn: 90 },
    worn: { at, turn },
    model: 'shell',
  });

test('a shell clears the head where the head frame and its worn place seat it', () => {
  assert.deepEqual(findings(0.21, 90), []);
});

test('a shell seated into the head is reported, whether too low or turned across it', () => {
  for (const [at, turn] of [
    [0.2, 90],
    [0.21, 0],
  ]) {
    const [only, ...rest] = findings(at, turn);
    assert.deepEqual(rest, []);
    assert.match(only, /^shell: \d+ of \d+ points of its surface lie inside the head/);
  }
});

test('an empty seat table is a finding, not a pass', () => {
  assert.deepEqual(treeSeatFindings('', { models: [] }, undefined, {}), ['models/head-seats.libsonnet seats no shell']);
});

// A solid helmet 10 mm off the head at the sides, standing up to `top` in its own frame, with its brow anchor seated 30
// mm under the head's top, so the head stands up to 0.07 in the helmet's frame.
const HEAD_BROW = [0, 0.97, 0];
const helmetFindingsOf = (meshes) =>
  helmetFindings({ head: HEAD, headBrow: HEAD_BROW, meshes, brow: [0, 0.04, 0], model: 'helmet' });
const block = (bottom, top) => [
  [-0.03, bottom, -0.035],
  [0.03, top, 0.035],
];

test('a solid helmet round the head hides it', () => {
  assert.deepEqual(helmetFindingsOf([boxes(block(0, 0.08))]), []);
});

test('a solid helmet too short for the head shows the head over its top', () => {
  const [only, ...rest] = helmetFindingsOf([boxes(block(0, 0.06))]);
  assert.deepEqual(rest, []);
  assert.match(only, /^helmet: \d+ points of the head show outside it, the highest at \(-?0\.0\d+, 0\.070, /);
});

test('a hollow the helmet closes round the head hides what of the head it holds', () => {
  const cap = shell(0.006).map(({ positions, indices }) => ({
    positions: positions.map((value, i) => (i % 3 === 1 ? value + 0.055 : value)),
    indices,
  }));
  assert.deepEqual(helmetFindingsOf([boxes(block(0, 0.055)), ...cap]), []);
});

test('an empty helmet list is a finding, not a pass', () => {
  assert.deepEqual(treeHelmetFindings('', { models: [] }, undefined, []), [
    'models/head-helmets.libsonnet lists no helmet',
  ]);
});
