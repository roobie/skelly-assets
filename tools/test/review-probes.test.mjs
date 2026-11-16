import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rankedQueue, reviewedIds } from '../review-probe.mjs';
import { stairRuns, thinRuns } from '../runProbe.mjs';
import { cellGrid, pieces, shapeFindings } from '../shapeProbe.mjs';

// The cells of a solid block of lattice cells from `min` up to but not including `max`, all of one slot.
const block = (min, max, slot = 0) => {
  const cells = [];
  for (let i = min[0]; i < max[0]; i++) for (let j = min[1]; j < max[1]; j++) for (let k = min[2]; k < max[2]; k++) {
    cells.push({ cell: [i, j, k], slot });
  }
  return cells;
};
const grid = (...blocks) => {
  const drawn = blocks.flat();
  return cellGrid(drawn, ['body', 'cap'].slice(0, Math.max(...drawn.map(({ slot }) => slot)) + 1));
};
const probes = (findings) => findings.map(({ probe, slot }) => `${probe} ${slot ?? ''}`.trim());

// A tin of one slot: a square body and a lid on it, `shift` cells along x.
const tin = (shift) => grid(block([0, 0, 0], [12, 6, 12]), block([shift, 6, 0], [12 + shift, 8, 12]));

test('a piece apart from the rest by empty cells is floating, and touching across a corner is not', () => {
  assert.deepEqual(pieces(grid(block([0, 0, 0], [4, 4, 4]), block([4, 4, 4], [6, 6, 6]))).length, 1);
  const apart = shapeFindings(grid(block([0, 0, 0], [4, 4, 4]), block([0, 6, 0], [4, 8, 4])));
  assert.deepEqual(apart.map(({ probe, gap }) => [probe, gap]), [['floating', 2]]);
});

test('a lid set a cell or two off its body misses the mirror, and a centred lid does not', () => {
  assert.deepEqual(probes(shapeFindings(tin(0))), []);
  for (const shift of [1, 2]) assert.ok(probes(shapeFindings(tin(shift))).includes('mirror body'), `shifted by ${shift}`);
});

test('a cross with one arm two cells short misses its quarter turn, and an even cross does not', () => {
  const cross = (short) => grid(
    block([-1, 0, -1], [2, 1, 2]),
    block([2, 0, -1], [6, 1, 2]),
    block([-5, 0, -1], [-1, 1, 2]),
    block([-1, 0, 2], [2, 1, 6]),
    block([-1, 0, -5 + short], [2, 1, -1]),
  );
  assert.ok(!probes(shapeFindings(cross(0))).includes('quarter body'));
  assert.ok(probes(shapeFindings(cross(2))).includes('quarter body'));
});

test('a model that is its own mirror and quarter turn has no findings', () => {
  assert.deepEqual(shapeFindings(grid(block([-6, 0, -6], [6, 4, 6]), block([-2, 4, -2], [2, 6, 2], 1))), []);
});

const GRAIN = 0.004;
const box = (id, min, max, slot = 'copper') => ({ id, kind: 'box', slot, min, max });
// `n` boxes from `from`, each `step` on from the last.
const run = (n, step, from = [0, 0, 0], size = 0.01) => Array.from({ length: n }, (_, k) => {
  const min = from.map((x, a) => x + k * step[a]);
  return box(`arm-${k}`, min, min.map((x) => x + size));
});

test('boxes that step along a slant, each touching the next, are a staircase run', () => {
  assert.deepEqual(stairRuns(run(4, [0.008, -0.006, 0]), GRAIN), [{ prefix: 'arm', slot: 'copper', pieces: 4 }]);
});

test('a stack along one axis, or boxes that step apart, is not a staircase run', () => {
  assert.deepEqual(stairRuns(run(4, [0.012, 0, 0]), GRAIN), []);
  assert.deepEqual(stairRuns(run(4, [0.02, -0.02, 0]), GRAIN), []);
});

// A run of wire segments along a slant, each a prism of section `width` square extruded along z.
const wire = (n, width) => Array.from({ length: n }, (_, k) => ({
  id: `bail-${k}`,
  kind: 'prism',
  slot: 'bail',
  axis: 'z',
  profile: [[k * 0.01, k * 0.01], [k * 0.01 + width, k * 0.01], [(k + 1) * 0.01 + width, (k + 1) * 0.01], [(k + 1) * 0.01, (k + 1) * 0.01]],
  start: 0,
  end: width,
}));

test('slanted prisms thinner than the grain are a thin run, and ones a few grains wide are not', () => {
  assert.equal(thinRuns(wire(4, GRAIN / 2), GRAIN).length, 1);
  assert.deepEqual(thinRuns(wire(4, GRAIN * 3), GRAIN), []);
});

test('the queue puts rows more probes find first, then the surest finding, and leaves out rows with none', () => {
  const queue = rankedQueue({
    clean: [],
    lopsided: [{ probe: 'mirror', cells: 30, of: 100 }],
    nudged: [{ probe: 'mirror', cells: 5, of: 100 }],
    loose: [{ probe: 'floating', cells: 5, of: 100 }, { probe: 'mirror', cells: 5, of: 100 }],
  });
  assert.deepEqual(queue.map(({ id }) => id), ['loose', 'lopsided', 'nudged']);
});

test('a verdict on a row since renamed marks the row under its current id reviewed', () => {
  const verdicts = '{"id":"old_kettle","verdict":"ok"}\n{"batch":true}\n{"id":"pot","verdict":"fix"}\n';
  assert.deepEqual([...reviewedIds(verdicts, { old_kettle: 'kettle' })].sort(), ['kettle', 'pot']);
});
