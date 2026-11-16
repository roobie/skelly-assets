// Renders a batch of random sounds from the Faust patches, for a listener to audition and name uses for.
// Usage: node tools/explore_sounds.mjs --out <dir> [--seed 1] [--count N] [--patch glass --patch hiss ...]
import { join } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { exploreBatch, readPatches, readSettings } from './packages/faust-sfx/src/batch.ts';

const PATCHES = join(import.meta.dirname, '..', 'models', 'sounds', 'patches');

const { values } = parseArgs({
  options: {
    out: { type: 'string' },
    seed: { type: 'string', default: '1' },
    count: { type: 'string' },
    patch: { type: 'string', multiple: true },
  },
});
if (!values.out) {
  console.error('explore_sounds: --out <dir> is required');
  process.exit(2);
}

const settings = readSettings(PATCHES);
const { log } = await exploreBatch(await readPatches(PATCHES), settings, {
  out: values.out,
  firstSeed: Number(values.seed),
  count: values.count === undefined ? settings.count : Number(values.count),
  only: values.patch,
});
for (const { file, peakDbfs, rmsDbfs, finite } of log) {
  console.log(`${file.padEnd(20)} peak ${peakDbfs.toFixed(1)} dBFS  rms ${rmsDbfs.toFixed(1)} dBFS${finite ? '' : '  NON-FINITE'}`);
}
