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

test('a clip with key phases stands in each key frame at its own time and eases between them', () => {
  const at = (x) => ({ root: [x, 0, 0], rotations: {} });
  const clip = { loop: false, durationRealSeconds: 4, keyPhases: [0, 0.75, 1], easing: 'minimum-jerk', frames: [at(0), at(1), at(2)] };
  const x = (seconds) => sampleClip(clip, seconds, (a) => a).root[0];
  assert.equal(x(3), 1);
  assert.equal(x(1.5), 0.5);
  assert.ok(x(0.75) < 0.25, 'eased: a quarter of the way in time is less than a quarter of the way along');
  assert.equal(x(3.5), 1.5);
});

test('a clip listing an easing per move eases each move by its own', () => {
  const at = (x) => ({ root: [x, 0, 0], rotations: {} });
  const clip = { loop: false, durationRealSeconds: 2, keyPhases: [0, 0.5, 1], easing: ['ease-in', 'ease-out'], frames: [at(0), at(1), at(2)] };
  const x = (seconds) => sampleClip(clip, seconds, (a) => a).root[0];
  assert.equal(x(0.5), 0.25);
  assert.equal(x(1.5), 1.75);
  assert.throws(() => sampleClip({ ...clip, easing: ['ease-in', 'lurch'] }, 1.5, (a) => a), /lurch is none of/);
});
