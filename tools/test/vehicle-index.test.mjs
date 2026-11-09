import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { INDEX, PLACEMENTS, placementsIndex, VEHICLES_DIR, vehicleIndex } from '../vehicle-index.mjs';

// A vehicle file left out of an index is never built, and nothing else would notice.
test('the committed vehicle index lists every vehicle row file', () => {
  assert.equal(readFileSync(join(VEHICLES_DIR, INDEX), 'utf8'), vehicleIndex());
});

test('the committed placements index lists every vehicle placements file', () => {
  assert.equal(readFileSync(join(VEHICLES_DIR, PLACEMENTS), 'utf8'), placementsIndex());
});
