import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strapFindings } from '../strap-fit.mjs';

// A closed axis-aligned box of 12 triangles about the origin.
const boxMesh = ([w, h, d]) => {
  const positions = [];
  for (const z of [-d / 2, d / 2]) for (const y of [-h / 2, h / 2]) for (const x of [-w / 2, w / 2]) positions.push(x, y, z);
  const indices = [
    0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6,
    0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7,
    0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5,
  ];
  return { positions, indices };
};

// A head 0.2 m wide, 0.1 m tall and 0.24 m deep, worn gear whose origin sits at the head's centre, and straps with a 4 mm
// wall whose inner faces stand `gap` m off the head on every side.
const head = boxMesh([0.2, 0.1, 0.24]);
const WALL = 0.004;
const straps = (gap, { left = gap, back = gap } = {}) => {
  const pair = (side, [x, z], [dx, dz]) => ({ [`strap_${side}_inner`]: [x, 0, z], [`strap_${side}_outer`]: [x + dx * WALL, 0, z + dz * WALL] });
  return {
    ...pair('left', [0.1 + left, 0], [1, 0]),
    ...pair('right', [-0.1 - gap, 0], [-1, 0]),
    ...pair('front', [0, 0.12 + gap], [0, 1]),
    ...pair('back', [0, -0.12 - back], [0, -1]),
  };
};
const findings = (anchors) => strapFindings({ head, anchors, frame: 0, at: 0, model: 'gear' });

test('straps whose inner faces stand within a wall of the head all round fit', () => {
  assert.deepEqual(findings(straps(0.002)), []);
});

test('a strap standing further than its wall from the head is reported on its own side only', () => {
  const [only, ...rest] = findings(straps(0.002, { back: 0.008 }));
  assert.deepEqual(rest, []);
  assert.match(only, /back strap/);
});

test('a strap whose inner face is inside the head is reported', () => {
  const [only, ...rest] = findings(straps(0.002, { left: -0.002 }));
  assert.deepEqual(rest, []);
  assert.match(only, /left strap's inner face is inside/);
});

test('the gear is placed by the head frame and the height it is worn at', () => {
  const tall = { ...head, positions: head.positions.map((value, i) => (i % 3 === 1 ? value + 1 : value)) };
  assert.deepEqual(strapFindings({ head: tall, anchors: straps(0.002), frame: 0.75, at: 0.25, model: 'gear' }), []);
});
