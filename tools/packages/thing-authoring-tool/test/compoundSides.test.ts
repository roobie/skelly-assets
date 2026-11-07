import { expect, it } from 'vitest';
import { compound } from '../src/families/compound.ts';

const turned = { id: 'fixture', slot: 'body', kind: 'turned', axis: 'y', profile: [[0, 0], [0, 1], [1, 1], [1, 0]] };

it.each([undefined, 9])('keeps an authored count with default %s', (defaultSides) => {
  const [solid] = compound({ pieces: JSON.stringify([{ ...turned, sides: 12 }]) }, defaultSides);
  expect(solid).toMatchObject({ kind: 'revolved', sides: 12 });
});

it('leaves omission unsided when no default is configured', () => {
  const [solid] = compound({ pieces: JSON.stringify([turned]) });
  expect(solid).not.toHaveProperty('sides');
});

it('inherits a configured count but consumes the explicit round opt-out', () => {
  const defaultSides = 9;
  const [inherited, round] = compound({ pieces: JSON.stringify([turned, { ...turned, id: 'round', sides: null }]) }, defaultSides);
  expect(inherited).toMatchObject({ kind: 'revolved', sides: defaultSides });
  expect(round).not.toHaveProperty('sides');
});
