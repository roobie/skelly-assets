import assert from 'node:assert/strict';
import { test } from 'node:test';
import { anchorFindings, strapFindings, treeStrapFindings } from '../strap-fit.mjs';
import { boxes } from './boxes.mjs';

// A box head 40 mm wide and 50 mm deep, and a strap drawn on a 2 mm grain with a two-voxel wall round a plan of the
// same size, its inner faces standing `gap` off that plan on each side, centred `shift` along z in the gear frame.
const GRAIN = 0.002;
const WALL = 2 * GRAIN;
const HALF = [0.02, 0.025];
const strapRound = ({ gap = GRAIN, back = gap, left = gap, shift = 0 } = {}) => {
  const [x, z] = HALF;
  const box = (minX, maxX, minZ, maxZ) => [[minX, -0.004, minZ + shift], [maxX, 0.004, maxZ + shift]];
  return boxes(
    box(x + left, x + left + WALL, -z - back - WALL, z + gap + WALL),
    box(-x - gap - WALL, -x - gap, -z - back - WALL, z + gap + WALL),
    box(-x - gap, x + left, z + gap, z + gap + WALL),
    box(-x - gap, x + left, -z - back - WALL, -z - back),
  );
};
const headAt = (y, z) => boxes([[-HALF[0], y - 0.03, z - HALF[1]], [HALF[0], y + 0.01, z + HALF[1]]]);
const level = { frame: { height: 0, turn: 0 }, worn: { at: 0, turn: 0 } };
const findings = (strap, head = headAt(0, 0), place = level) => strapFindings({ head, strap, grain: GRAIN, ...place, model: 'gear' });

test('a strap a voxel off the head, its corners a diagonal off, fits where the head frame and the worn place seat it', () => {
  const place = { frame: { height: 0.75, turn: 90 }, worn: { at: 0.25, turn: 90 } };
  assert.deepEqual(findings(strapRound({ shift: -0.01 }), headAt(1, 0.01), place), []);
  assert.notDeepEqual(findings(strapRound({ shift: -0.01 }), headAt(1, -0.01), place), []);
});

test('a strap standing further than a voxel diagonal off the head is reported', () => {
  const [only, ...rest] = findings(strapRound({ back: 2 * GRAIN }));
  assert.deepEqual(rest, []);
  assert.match(only, /^gear: \d+ of \d+ samples of the strap's inner face stand further off the head/);
});

test('a strap whose inner face lies inside the head is reported', () => {
  const [only, ...rest] = findings(strapRound({ left: -GRAIN }));
  assert.deepEqual(rest, []);
  assert.match(only, /^gear: \d+ of \d+ samples of the strap's inner face lie inside the head/);
});

// Strap anchors on the box head's left side, the inner anchor `gap` off it and the outer a wall further out, in the
// gear frame; a half turn about y in all carries the gear frame's -x onto the head's +x.
const leftAnchors = ({ gap = GRAIN, inner = -(HALF[0] + gap), outer = inner - WALL } = {}) => ({
  strap_left_inner: [inner, 0, 0],
  strap_left_outer: [outer, 0, 0],
});
const turned = { frame: { height: 0.75, turn: 90 }, worn: { at: 0.25, turn: 90 } };
const anchorsFit = (anchors) => anchorFindings({ head: headAt(1, 0), anchors, ...turned, model: 'gear' });

test('strap anchors fit where the head lies within the strap thickness inward of the inner anchor', () => {
  assert.deepEqual(anchorsFit(leftAnchors()), []);
  const [only, ...rest] = anchorsFit(leftAnchors({ gap: 3 * GRAIN }));
  assert.deepEqual(rest, []);
  assert.match(only, /^gear: looking in from its left strap's inner anchor .*, the head lies 6\.0 mm off/);
});

test('strap anchors naming the outer face as the inner one are reported', () => {
  const swapped = leftAnchors({ inner: -(HALF[0] + GRAIN + WALL), outer: -(HALF[0] + GRAIN) });
  assert.match(anchorsFit(swapped)[0], /^gear: looking in from its left strap's inner anchor .*, the head is missed/);
});

test('an empty table of band-fitted models is a finding, not a pass', () => {
  assert.deepEqual(treeStrapFindings('', { models: [] }, undefined, {}), ['models/head-band.libsonnet wears no band-fitted model']);
});
