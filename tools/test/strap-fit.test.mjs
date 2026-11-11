import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strapFindings } from '../strap-fit.mjs';

// Closed axis-aligned boxes of 12 outward-wound triangles each, as one mesh.
const boxes = (...spans) => {
  const positions = [], indices = [];
  for (const [min, max] of spans) {
    const base = positions.length / 3;
    for (const z of [min[2], max[2]]) for (const y of [min[1], max[1]]) for (const x of [min[0], max[0]]) positions.push(x, y, z);
    indices.push(...[
      0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6,
      0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7,
      0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5,
    ].map((i) => base + i));
  }
  return { positions, indices };
};

// A box head 40 mm wide and 50 mm deep, and a strap drawn on a 2 mm grain with a two-voxel wall round a plan of the
// same size, its inner faces standing `gap` off that plan on each side, centred `shift` along z in the gear frame.
const GRAIN = 0.002;
const WALL = 2 * GRAIN;
const HALF = [0.02, 0.025];
const strapRound = ({ gap = GRAIN, back = gap, left = gap, shift = 0 } = {}) => {
  const [x, z] = HALF;
  const box = (minX, maxX, minZ, maxZ) => [[minX, -0.004, minZ + shift], [maxX, 0.004, maxZ + shift]];
  return boxes(
    box(x + left, x + left + WALL, -z - back - WALL, z + gap + WALL),
    box(-x - gap - WALL, -x - gap, -z - back - WALL, z + gap + WALL),
    box(-x - gap, x + left, z + gap, z + gap + WALL),
    box(-x - gap, x + left, -z - back - WALL, -z - back),
  );
};
const headAt = (y, z) => boxes([[-HALF[0], y - 0.03, z - HALF[1]], [HALF[0], y + 0.01, z + HALF[1]]]);
const level = { frame: { height: 0, turn: 0 }, worn: { at: 0, turn: 0 } };
const findings = (strap, head = headAt(0, 0), place = level) => strapFindings({ head, strap, grain: GRAIN, ...place, model: 'gear' });

test('a strap a voxel off the head, its corners a diagonal off, fits where the head frame and the worn place seat it', () => {
  const place = { frame: { height: 0.75, turn: 90 }, worn: { at: 0.25, turn: 90 } };
  assert.deepEqual(findings(strapRound({ shift: -0.01 }), headAt(1, 0.01), place), []);
  assert.notDeepEqual(findings(strapRound({ shift: -0.01 }), headAt(1, -0.01), place), []);
});

test('a strap standing further than a voxel diagonal off the head is reported', () => {
  const [only, ...rest] = findings(strapRound({ back: 2 * GRAIN }));
  assert.deepEqual(rest, []);
  assert.match(only, /^gear: \d+ of \d+ samples of the strap's inner face stand further off the head/);
});

test('a strap whose inner face lies inside the head is reported', () => {
  const [only, ...rest] = findings(strapRound({ left: -GRAIN }));
  assert.deepEqual(rest, []);
  assert.match(only, /^gear: \d+ of \d+ samples of the strap's inner face lie inside the head/);
});
