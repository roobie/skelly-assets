import { expect, it } from 'vitest';
import { compound } from '../src/families/compound.ts';

const prism = { id: 'fixture', slot: 'body', kind: 'prism', axis: 'z', profile: [[0, 0], [1, 0], [1, 1], [0, 1]], start: 0, end: 1 };

it('keeps a prism cut to its planes and draws it unbevelled, as the mesh requires of a cut solid', () => {
  const clip = [{ normal: [1, 1, 1], offset: 2 }];
  const [solid] = compound({ pieces: JSON.stringify([{ ...prism, clip }]) });
  expect(solid).toMatchObject({ kind: 'extruded-polygon', clip, display: { bevel: false } });
});
