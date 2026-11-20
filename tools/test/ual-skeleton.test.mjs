import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { GLB, restSkeleton, SKELETON, sha256, skeletonText } from '../ual-skeleton.mjs';

const repo = join(import.meta.dirname, '../..');
const glb = readFileSync(join(repo, GLB));
const tracked = JSON.parse(readFileSync(join(repo, SKELETON), 'utf8'));

test('the skeleton is of the GLB in the repository', () => {
  assert.equal(tracked.source.path, GLB);
  assert.equal(tracked.source.sha256, sha256(glb), 'the GLB changed: run node tools/ual-skeleton.mjs');
});

test('the tracked skeleton is what the GLB derives, byte for byte', () => {
  assert.equal(readFileSync(join(repo, SKELETON), 'utf8'), skeletonText(glb), 'run node tools/ual-skeleton.mjs');
});

test('the rest skeleton stands upright on the ground, T-posed, facing +z', () => {
  const { bones } = tracked;
  assert.equal(Object.keys(bones).length, 65);
  const near = (actual, low, high, what) => assert.ok(actual >= low && actual <= high, `${what} is ${actual}`);
  near(bones.pelvis.head[1], 0.8, 1.1, 'pelvis height');
  near(bones.Head.head[1], 1.5, 1.75, 'head height');
  near(Math.abs(bones.hand_l.head[0]), 0.6, 0.9, 'hand reach');
  assert.ok(Math.abs(bones.foot_l.head[1]) < 0.15, 'foot height');
  assert.ok(bones.ball_leaf_l.head[2] > bones.ball_l.head[2], 'the toes point to +z');
  assert.ok(Math.sign(bones.hand_l.head[0]) !== Math.sign(bones.hand_r.head[0]), 'the hands are on opposite sides');
});

test('every bone has a parent before it, and only the root has none', () => {
  const seen = new Set();
  for (const [name, { parent }] of Object.entries(restSkeleton(glb))) {
    if (seen.size) assert.ok(seen.has(parent), `${name} comes before its parent ${parent}`);
    else assert.equal(parent, null);
    seen.add(name);
  }
});
