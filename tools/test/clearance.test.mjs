import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearance } from '../../site/clearance.mjs';

// A closed axis-aligned box of 12 triangles, centred at the origin, as an indexed mesh or as a bare soup.
const boxMesh = ([w, h, d], { indexed = true } = {}) => {
  const corners = [];
  for (const z of [-d / 2, d / 2]) for (const y of [-h / 2, h / 2]) for (const x of [-w / 2, w / 2]) corners.push(x, y, z);
  const indices = [
    0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, // z faces
    0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, // y faces
    0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5, // x faces
  ];
  if (indexed) return { positions: corners, indices };
  return { positions: indices.flatMap((i) => corners.slice(i * 3, i * 3 + 3)) };
};
const body = (size) => [{ part: 'arm', mesh: boxMesh(size) }];
const shell = (size, part = 'arm') => [{ piece: 'sleeve', part, mesh: boxMesh(size) }];

test('a body enclosed by its shell has no issues', () => {
  assert.deepEqual(clearance(body([1, 1, 1]), shell([2, 2, 2])).counts, { pokes: 0, sinks: 0 });
});

test('body vertices within the shell span but outside the shell poke', () => {
  const { issues, counts } = clearance(body([1, 1, 1]), shell([0.6, 2, 0.6]));
  assert.deepEqual(counts, { pokes: 8, sinks: 0 });
  assert.deepEqual(issues[0], { kind: 'pokes', piece: 'sleeve', part: 'arm', point: [-0.5, -0.5, -0.5] });
});

test('shell vertices inside the body sink', () => {
  assert.deepEqual(clearance(body([3, 3, 3]), shell([2, 2, 2])).counts, { pokes: 0, sinks: 8 });
});

test('margin shrinks the shell span body vertices are checked in', () => {
  assert.deepEqual(clearance(body([1, 1, 1]), shell([0.6, 2, 0.6]), { margin: 0.6 }).counts, { pokes: 0, sinks: 0 });
});

test('a piece covering a part the body lacks throws', () => {
  assert.throws(() => clearance(body([1, 1, 1]), shell([2, 2, 2], 'leg')), /covers part leg/);
});

test('a vertex repeated across triangles is reported once', () => {
  const soupBody = [{ part: 'arm', mesh: boxMesh([3, 3, 3], { indexed: false }) }];
  const soupShell = [{ piece: 'sleeve', part: 'arm', mesh: boxMesh([2, 2, 2], { indexed: false }) }];
  assert.deepEqual(clearance(soupBody, soupShell).counts, { pokes: 0, sinks: 8 });
});
