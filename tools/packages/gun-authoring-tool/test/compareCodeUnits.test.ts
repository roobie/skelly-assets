import { expect, test } from 'vitest';
import { compareCodeUnits } from '../../../codeUnitOrder.mjs';
import { compareSightCandidates } from '../src/gun/exportGlb.ts';

// ICU collation folds case and skips punctuation, so these ids order differently by locale than by code unit.
const ids = ['rear_b', 'rearB', 'rear-a', 'Rear', 'rear'];

test('the export order of ids is the code unit order, not the runtime locale order', () => {
  expect([...ids].sort(compareCodeUnits)).toEqual(['Rear', 'rear', 'rear-a', 'rearB', 'rear_b']);
});

test('the sight pick breaks a priority tie by code unit id order', () => {
  const candidates = [
    { priority: 1, id: 'sight_b' },
    { priority: 1, id: 'sightB' },
    { priority: 0, id: 'z' },
  ];
  expect(candidates.sort(compareSightCandidates).map(({ id }) => id)).toEqual(['z', 'sightB', 'sight_b']);
});
