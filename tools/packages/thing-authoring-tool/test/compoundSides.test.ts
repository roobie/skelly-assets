import { expect, it } from 'vitest';
import { compound } from '../src/families/compound.ts';

const turned = { id: 'fixture', slot: 'body', kind: 'turned', axis: 'y', profile: [[0, 0], [0, 1], [1, 1], [1, 0]] };
it('passes an authored turned count through without supplying a default', () => {
  const [authored, omitted] = compound({ pieces: JSON.stringify([{ ...turned, sides: 12 }, { ...turned, id: 'unsided' }]) });
  expect(authored).toMatchObject({ kind: 'revolved', sides: 12 });
  expect(omitted).not.toHaveProperty('sides');
});
