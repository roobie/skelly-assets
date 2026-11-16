import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildManifest } from '../manifest.mjs';
import { dependencyProblems, readDependencies } from '../packs.mjs';

const declared = new Set(['fixture.a', 'fixture.b', 'fixture.c']);

test('dependencies on declared packs, without a cycle, are honoured', () => {
  assert.deepEqual(dependencyProblems({ 'fixture.a': ['fixture.b'], 'fixture.b': ['fixture.c'] }, declared), []);
});

// A consumer could never load a pack whose dependency is missing or loops back to it.
test('a dependency on a missing pack or around a cycle is a problem', () => {
  assert.match(
    dependencyProblems({ 'fixture.a': ['fixture.gone'] }, declared).join(),
    /fixture.gone, which is not a declared pack/,
  );
  assert.match(dependencyProblems({ 'fixture.gone': [] }, declared).join(), /fixture.gone: not a declared pack/);
  assert.match(dependencyProblems({ 'fixture.a': ['fixture.a'] }, declared).join(), /cycle: fixture.a -> fixture.a/);
  assert.match(
    dependencyProblems(
      { 'fixture.a': ['fixture.b'], 'fixture.b': ['fixture.c'], 'fixture.c': ['fixture.a'] },
      declared,
    ).join(),
    /cycle/,
  );
});

test("the manifest carries each pack's dependencies and refuses one the tree does not hold", () => {
  const files = ['fixture.a/x.glb', 'fixture.b/y.glb'];
  const manifest = buildManifest({ models: [], dependsOn: { 'fixture.a': ['fixture.b'] }, files, credit: () => ({}) });
  assert.deepEqual(manifest.packs['fixture.a'].dependsOn, ['fixture.b']);
  assert.throws(
    () => buildManifest({ models: [], dependsOn: { 'fixture.a': ['fixture.c'] }, files, credit: () => ({}) }),
    /fixture.c/,
  );
});

const withPacks = (packs, read) => {
  const root = mkdtempSync(join(tmpdir(), 'packs-'));
  try {
    mkdirSync(join(root, 'models'));
    writeFileSync(join(root, 'models/packs.json'), JSON.stringify({ packs }));
    return read(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

// A smooth pack's models are weighed and fitted by the sidecars of the pack it copies, and by nothing else.
test('a smooth pack depends on the pack it is the copy of, which models/packs.json may not restate', () => {
  const smooth = new Set([...declared, 'fixture.a.smooth']);
  assert.deepEqual(
    withPacks({ 'fixture.a': { dependsOn: ['fixture.b'] } }, (root) => readDependencies(smooth, root)),
    {
      'fixture.a': ['fixture.b'],
      'fixture.a.smooth': ['fixture.a'],
    },
  );
  assert.throws(
    () => withPacks({ 'fixture.a.smooth': {} }, (root) => readDependencies(smooth, root)),
    /depends only on fixture.a/,
  );
});
