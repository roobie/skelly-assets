import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildManifest } from '../manifest.mjs';
import { dependencyProblems } from '../packs.mjs';

const declared = new Set(['fixture.a', 'fixture.b', 'fixture.c']);

test('dependencies on declared packs, without a cycle, are honoured', () => {
  assert.deepEqual(dependencyProblems({ 'fixture.a': ['fixture.b'], 'fixture.b': ['fixture.c'] }, declared), []);
});

// A consumer could never load a pack whose dependency is missing or loops back to it.
test('a dependency on a missing pack or around a cycle is a problem', () => {
  assert.match(dependencyProblems({ 'fixture.a': ['fixture.gone'] }, declared).join(), /fixture.gone, which is not a declared pack/);
  assert.match(dependencyProblems({ 'fixture.gone': [] }, declared).join(), /fixture.gone: not a declared pack/);
  assert.match(dependencyProblems({ 'fixture.a': ['fixture.a'] }, declared).join(), /cycle: fixture.a -> fixture.a/);
  assert.match(dependencyProblems({ 'fixture.a': ['fixture.b'], 'fixture.b': ['fixture.c'], 'fixture.c': ['fixture.a'] }, declared).join(), /cycle/);
});

test('the manifest carries each pack\'s dependencies and refuses one the tree does not hold', () => {
  const files = ['fixture.a/x.glb', 'fixture.b/y.glb'];
  const manifest = buildManifest({ models: [], dependsOn: { 'fixture.a': ['fixture.b'] }, files, credit: () => ({}) });
  assert.deepEqual(manifest.packs['fixture.a'].dependsOn, ['fixture.b']);
  assert.throws(() => buildManifest({ models: [], dependsOn: { 'fixture.a': ['fixture.c'] }, files, credit: () => ({}) }), /fixture.c/);
});
