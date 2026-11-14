import assert from 'node:assert/strict';
import { test } from 'node:test';
import { seatFindings } from '../head-fit.mjs';
import { boxes } from './boxes.mjs';

// A box head 40 mm wide and 50 mm deep, standing 40 mm tall up to its top at y = 1, and a box shell of 4 mm walls round
// it that leaves `gap` of room at the sides and over the top when its origin sits at the head's foot.
const HEAD = boxes([[-0.02, 0.96, -0.025], [0.02, 1, 0.025]]);
const shell = (gap) => {
  const x = 0.02 + gap, z = 0.025 + gap, top = 0.04 + gap, wall = 0.004;
  return [boxes(
    [[-x - wall, 0, -z - wall], [-x, top, z + wall]],
    [[x, 0, -z - wall], [x + wall, top, z + wall]],
    [[-x, 0, -z - wall], [x, top, -z]],
    [[-x, 0, z], [x, top, z + wall]],
    [[-x - wall, top, -z - wall], [x + wall, top + wall, z + wall]],
  )];
};
const findings = (at, turn) => seatFindings({ head: HEAD, meshes: shell(0.004), frame: { height: 0.75, turn: 90 }, worn: { at, turn }, model: 'shell' });

test('a shell clears the head where the head frame and its worn place seat it', () => {
  assert.deepEqual(findings(0.21, 90), []);
});

test('a shell seated into the head is reported, whether too low or turned across it', () => {
  for (const [at, turn] of [[0.2, 90], [0.21, 0]]) {
    const [only, ...rest] = findings(at, turn);
    assert.deepEqual(rest, []);
    assert.match(only, /^shell: \d+ of \d+ points of its surface lie inside the head/);
  }
});
