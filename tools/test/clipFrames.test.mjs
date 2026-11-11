import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clipSpanSeconds, decodeFrame, sampleClip } from '../../site/clipFrames.mjs';

const close = (actual, expected) => actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-12, `${actual} vs ${expected}`));

test('a frame decodes to row-major matrices and keeps its root a copy', () => {
  const h = Math.SQRT1_2;
  const frame = { root: [1, 2, 3], rotations: { a: [0, 0, h, h] } };
  const pose = decodeFrame(frame);
  close(pose.rotations.a, [0, -1, 0, 1, 0, 0, 0, 0, 1]);
  assert.deepEqual(pose.root, frame.root);
  assert.notStrictEqual(pose.root, frame.root);
});

test('sampling interpolates roots and hands the weight to the supplied slerp, treating a missing bone as identity', () => {
  const clip = { loop: false, durationRealSeconds: 2, frames: [{ root: [0, 0, 0], rotations: { a: [0, 0, 0, 1] } }, { root: [2, 4, 6], rotations: {} }] };
  const seen = [];
  const sample = sampleClip(clip, 0.5, (a, b, w) => (seen.push([a, b, w]), a));
  assert.deepEqual(sample.root, [0.5, 1, 1.5]);
  assert.deepEqual(seen, [[[0, 0, 0, 1], [0, 0, 0, 1], 0.25]]);
});

test('a finite clip with both or neither span key is refused', () => {
  assert.throws(() => clipSpanSeconds({ durationSimSeconds: 1, durationRealSeconds: 1 }), RangeError);
  assert.throws(() => clipSpanSeconds({}), RangeError);
});
