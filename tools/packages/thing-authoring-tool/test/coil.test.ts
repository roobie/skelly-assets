import { expect, it } from 'vitest';
import { coil } from '../src/families/coil.ts';

const spring = { radius: '0.014', tubeRadius: '0.002', turns: '8', pitch: '0.005' };

// The rod's centre line, from the middle of its start edge to the middle of its end edge.
const centreLine = (turnedSides?: number) => {
  const rod = coil(spring, turnedSides).find(({ id }) => id === 'rod');
  if (rod?.kind !== 'extruded-polygon') throw new Error('coil has no rod');
  const [a, b, c, d] = rod.profile;
  return [[(a![0] + b![0]) / 2, (a![1] + b![1]) / 2], [(c![0] + d![0]) / 2, (c![1] + d![1]) / 2]];
};

// Without the rod the turns are separate rings that fall apart as loose parts.
it('runs a rod from the bottom turn to the top one', () => {
  const [start, end] = centreLine();
  expect(start![1]).toBeCloseTo(0.002);
  expect(end![1]).toBeCloseTo(7 * 0.005 + 0.002);
});

it.each([[undefined, 0.014], [8, 0.014 * Math.cos(Math.PI / 8)]])('ends the rod on the turn surface with %s sides', (sides, reach) => {
  const [start, end] = centreLine(sides);
  expect(start![0]).toBeCloseTo(-reach);
  expect(end![0]).toBeCloseTo(reach);
});
