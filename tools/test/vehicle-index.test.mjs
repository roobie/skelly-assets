import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { INDEX, VEHICLES_DIR, vehicleIndex } from '../vehicle-index.mjs';

// A vehicle file left out of the index is never built, and nothing else would notice.
test('the committed vehicle index lists every vehicle row file', () => {
  assert.equal(readFileSync(join(VEHICLES_DIR, INDEX), 'utf8'), vehicleIndex());
});
