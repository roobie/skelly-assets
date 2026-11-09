import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { INDEX, ROW_DIRS, rowIndex } from '../row-index.mjs';

// A row file left out of its index is never built, and nothing else would notice.
for (const dir of ROW_DIRS) {
  test(`the committed ${relative(join(import.meta.dirname, '../..'), dir)} index lists every row file`, () => {
    assert.equal(readFileSync(join(dir, INDEX), 'utf8'), rowIndex(dir));
  });
}
