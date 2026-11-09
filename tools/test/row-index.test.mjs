import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { INDEX, PLACEMENTS, placementsIndex, ROW_DIRS, rowIndex, VEHICLES_DIR } from '../row-index.mjs';

// A row file left out of its index is never built, and nothing else would notice.
for (const dir of ROW_DIRS) {
  test(`the committed ${relative(join(import.meta.dirname, '../..'), dir)} index lists every row file`, () => {
    assert.equal(readFileSync(join(dir, INDEX), 'utf8'), rowIndex(dir));
  });
}

test('the committed placements index lists every vehicle placements file', () => {
  assert.equal(readFileSync(join(VEHICLES_DIR, PLACEMENTS), 'utf8'), placementsIndex());
});
