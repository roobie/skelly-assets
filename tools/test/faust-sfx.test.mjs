import assert from 'node:assert/strict';
import { join } from 'node:path';
import { before, test } from 'node:test';
import { renderSound, readPatches, readSettings } from '../packages/faust-sfx/src/batch.ts';
import { drawValues } from '../packages/faust-sfx/src/explore.ts';

const PATCHES = join(import.meta.dirname, '..', '..', 'models', 'sounds', 'patches');
const settings = readSettings(PATCHES);
let patches;

before(async () => {
  patches = await readPatches(PATCHES);
});

test('every patch renders the same samples for the same seed, and an audible, finite, shaped sound', async () => {
  for (const patch of patches.values()) {
    const first = await renderSound(patch, 7, settings);
    const again = await renderSound(patch, 7, settings);
    assert.deepEqual(again.samples, first.samples, patch.name);
    assert.ok(first.samples.length > 0 && first.samples.every(Number.isFinite), patch.name);
    assert.ok(first.samples.length <= patch.seconds * settings.sampleRate, patch.name);
  }
});

test('drawn values stay within each slider range and on its step, and change with the seed', () => {
  for (const patch of patches.values()) {
    for (let seed = 0; seed < 50; seed += 1) {
      const values = drawValues(patch.sliders, seed);
      for (const { address, min, max, step } of patch.sliders) {
        const value = values[address];
        assert.ok(value >= min && value <= max, `${address} ${value} outside ${min}..${max}`);
        const steps = (value - min) / step;
        assert.ok(Math.abs(steps - Math.round(steps)) < 1e-6, `${address} ${value} off step ${step}`);
      }
    }
    assert.notDeepEqual(drawValues(patch.sliders, 1), drawValues(patch.sliders, 2), patch.name);
  }
});
