import assert from 'node:assert/strict';
import { test } from 'node:test';
import { anchorSocket, heldWeapon } from '../wields.mjs';

// A box 4 cm wide, 4 cm tall and 40 cm long along the bore, centred on the origin, outward-wound.
const box = (() => {
  const [x, y, z] = [0.02, 0.02, 0.2];
  const positions = [-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1].map(
    (sign, i) => sign * [x, y, z][i % 3],
  );
  const quads = [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [1, 2, 6, 5],
    [0, 4, 7, 3],
  ];
  return { positions, indices: quads.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]) };
})();
const gun = heldWeapon({ grip: { at: [0, -0.01, -0.1] }, anchors: { support: [0, -0.02, 0.1] } }, box);
const close = (actual, expected) =>
  assert.ok(
    actual.every((x, i) => Math.abs(x - expected[i]) < 1e-4),
    `${JSON.stringify(actual)} is not ${JSON.stringify(expected)}`,
  );

test("a socket from an anchor inside the gun comes out to the surface on the palm's side", () => {
  close(anchorSocket(gun, { from: 'grip', into: [1, 0, 0], axis: [0, 1, 0] }).at, [-0.02, -0.01, -0.1]);
});

test('a socket from an anchor off the gun, moved by its offset, goes in to the surface', () => {
  const socket = anchorSocket(gun, { from: 'support', offset: [0, -0.01, 0.05], into: [0, 1, 0], axis: [0, 0, 1] });
  close(socket.at, [0, -0.02, 0.15]);
  close(socket.into, [0, 1, 0]);
});

test('a socket whose anchor lies off the gun along its into is refused', () => {
  assert.throws(
    () => anchorSocket(gun, { from: 'support', offset: [0.1, 0, 0], into: [0, 1, 0], axis: [0, 0, 1] }),
    /lies off the weapon/,
  );
  assert.throws(() => anchorSocket(gun, { from: 'butt', into: [0, 0, 1], axis: [0, 1, 0] }), /no butt anchor/);
});
