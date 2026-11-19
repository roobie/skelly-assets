import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import {
  CATALOGUE,
  catalogueIndex,
  HEADS,
  headsIndex,
  INDEX,
  PLACEMENTS,
  placementsIndex,
  ROW_DIRS,
  rowIndex,
  VEHICLES_DIR,
} from '../row-index.mjs';

// A row file left out of its index is never built, and nothing else would notice.
for (const dir of ROW_DIRS) {
  test(`the committed ${relative(join(import.meta.dirname, '../..'), dir)} index lists every row file`, () => {
    assert.equal(readFileSync(join(dir, INDEX), 'utf8'), rowIndex(dir));
  });
}

test('the committed catalogue lists every folder of row files', () => {
  assert.equal(readFileSync(CATALOGUE, 'utf8'), catalogueIndex());
});

// A Jsonnet object lists its fields sorted, so the heads carry no order of their own: tools/jsonnet/heads.libsonnet
// restores the catalogue's, which is these folders' in turn, by sorting the paths.
test('the row folders are in path order, as the heads put the catalogue back in order', () => {
  assert.deepEqual(ROW_DIRS, [...ROW_DIRS].sort());
});

test('the committed heads list every row file', () => {
  assert.equal(readFileSync(HEADS, 'utf8'), headsIndex());
});

test('the committed placements index lists every vehicle placements file', () => {
  assert.equal(readFileSync(join(VEHICLES_DIR, PLACEMENTS), 'utf8'), placementsIndex());
});
