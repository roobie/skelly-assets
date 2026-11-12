import assert from 'node:assert/strict';
import { test } from 'node:test';
import { titleProblems, titleReport } from '../titles.mjs';

test('a model without a title fails, whatever its id could spell', () => {
  assert.deepEqual(titleProblems({ pack: 'fixture.pack', id: 'round_7_d_62x54r', title: undefined }).map(({ problem }) => problem), ['untitled']);
});

test('a title that is not text, or is empty or padded, fails', () => {
  for (const title of ['', '  ', 42, ' Padded', 'Padded ']) {
    assert.deepEqual(titleProblems({ pack: 'fixture.pack', id: 'fixture_a', title }).map(({ problem }) => problem), ['bad-title'], JSON.stringify(title));
  }
});

test('an authored title passes, and the report lists only the failing models', () => {
  const report = titleReport([
    { pack: 'fixture.pack', id: 'fixture_b', title: 'Fixture B' },
    { pack: 'fixture.pack', id: 'fixture_a' },
  ]);
  assert.deepEqual(report.map(({ id }) => id), ['fixture_a']);
});
