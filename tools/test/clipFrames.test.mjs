import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sampleClip } from '../../site/clipFrames.mjs';

test('sampling reads a bone missing from one frame as identity and hands the weight to the supplied slerp', () => {
  const clip = { loop: false, durationRealSeconds: 2, frames: [{ root: [0, 0, 0], rotations: { a: [0, 0, 0, 1] } }, { root: [2, 4, 6], rotations: {} }] };
  const seen = [];
  const sample = sampleClip(clip, 0.5, (a, b, w) => (seen.push([a, b, w]), a));
  assert.deepEqual(sample.root, [0.5, 1, 1.5]);
  assert.deepEqual(seen, [[[0, 0, 0, 1], [0, 0, 0, 1], 0.25]]);
});
