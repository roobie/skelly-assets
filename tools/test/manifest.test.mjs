import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { outputPath } from '../layout.mjs';
import { buildManifest, manifestFiles, mobManifest, readCredits, treeDifferences } from '../manifest.mjs';

const repo = resolve(import.meta.dirname, '../..');
// Git run from a hook inherits GIT_DIR, GIT_WORK_TREE and kin, which override -C; drop every GIT_ binding.
const gitEnvironment = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', env: gitEnvironment() });

const withReuse = (text, work) => {
  const root = mkdtempSync(join(tmpdir(), 'manifest-'));
  try {
    writeFileSync(join(root, 'REUSE.toml'), text);
    work(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
};

const REUSE = [
  'version = 1',
  '',
  '[[annotations]]',
  'path = ["built/**"]',
  'SPDX-FileCopyrightText = "Fixture Author"',
  'SPDX-License-Identifier = "fixture-licence-a"',
  '',
  '[[annotations]]',
  'path = ["built/fixture.b/**", "other/*.txt"]',
  'SPDX-FileCopyrightText = "Other Author"',
  'SPDX-License-Identifier = "fixture-licence-b"',
  '',
].join('\n');

test('credits come from REUSE.toml: the last annotation whose path matches names the author and licence', () => {
  withReuse(REUSE, (root) => {
    const credit = readCredits(root);
    assert.deepEqual(credit('built/fixture.a/assets/models/x.glb'), { author: 'Fixture Author', licence: 'fixture-licence-a' });
    assert.deepEqual(credit('built/fixture.b/assets/models/x.glb'), { author: 'Other Author', licence: 'fixture-licence-b' });
    assert.deepEqual(credit('other/x.txt'), { author: 'Other Author', licence: 'fixture-licence-b' });
    assert.throws(() => credit('other/deeper/x.txt'), /no REUSE.toml annotation/);
    assert.throws(() => credit('elsewhere/x.glb'), /no REUSE.toml annotation/);
  });
});

test('a REUSE.toml line the reader does not know is refused, not skipped', () => {
  withReuse(`${REUSE}\nunknown line\n`, (root) => assert.throws(() => readCredits(root), /REUSE.toml/));
  withReuse(REUSE.replace('SPDX-FileCopyrightText = "Other Author"\n', ''), (root) => assert.throws(() => readCredits(root), /REUSE.toml/));
});

const credit = () => ({ author: 'Fixture Author', licence: 'fixture-licence' });
const fixtureManifest = () => buildManifest({
  models: [
    { id: 'fixture_b', kind: 'item', pack: 'fixture.b', path: 'assets/models/fixture_b.glb', nodes: ['b:part'] },
    { id: 'fixture_a', kind: 'design', pack: 'fixture.a', path: 'assets/models/fixture_a.glb', nodes: ['a:part'] },
  ],
  files: [
    'fixture.b/assets/models/fixture_b.glb', 'fixture.b/things/fixture_b.model.json', 'fixture.b/things/index.json',
    'fixture.a/assets/models/fixture_a.glb', 'fixture.a/gungen/fixture_a.model.json',
  ],
  credit,
});

test('the manifest names every produced file under its pack and every model with its pack, path, nodes and credits', () => {
  const manifest = fixtureManifest();
  const files = manifestFiles(manifest);
  for (const model of manifest.models) {
    assert.ok(files.has(`built/${outputPath(model.pack, model.path)}`), `${model.id}'s path is not among its pack's files`);
    assert.deepEqual(model.credits, credit());
    assert.ok(Array.isArray(model.nodes));
  }
  for (const [pack, { files: packFiles }] of Object.entries(manifest.packs)) {
    for (const file of packFiles) assert.ok(files.has(`built/${outputPath(pack, file)}`));
  }
  assert.ok(files.has('built/manifest.json'));
});

test('a model whose path is not among the produced files is refused', () => {
  assert.throws(() => buildManifest({
    models: [{ id: 'fixture_a', kind: 'item', pack: 'fixture.a', path: 'assets/models/fixture_a.glb', nodes: [] }],
    files: [],
    credit,
  }), /fixture_a/);
});

test('a mob row joins the manifest with its GLB and clips and no part nodes', () => {
  const { models, files } = mobManifest([{ id: 'fixture_mob', pack: 'fixture.mobs', glb: 'fixture_mob.glb', clips: 'fixture_mob_clips.json', format: 'matrices' }]);
  assert.deepEqual(files, ['fixture.mobs/fixture_mob.glb', 'fixture.mobs/fixture_mob_clips.json']);
  assert.equal(models.length, 1);
  assert.equal(models[0].path, 'fixture_mob.glb');
  assert.equal(models[0].clips, 'fixture_mob_clips.json');
  assert.ok(!Object.hasOwn(models[0], 'nodes'));
  const actors = mobManifest([{ id: 'fixture_actor', pack: 'fixture.mobs', glb: 'a.glb', clips: 'a.json', body: 'b.json', format: 'pose' }]);
  assert.deepEqual(actors, {
    models: [{ id: 'fixture_actor', kind: 'mob', pack: 'fixture.mobs', path: 'a.glb', clips: 'a.json' }],
    files: ['fixture.mobs/a.glb', 'fixture.mobs/a.json', 'fixture.mobs/b.json'],
  });
});

test('the tree check holds the tracked set, the fresh set and the manifest to one another', () => {
  const manifest = fixtureManifest();
  const fresh = [...manifestFiles(manifest)].sort();
  assert.deepEqual(treeDifferences({ tracked: fresh, fresh, manifest }), []);
  const flat = treeDifferences({ tracked: [...fresh, 'built/flat.glb'], fresh: [...fresh, 'built/flat.glb'], manifest });
  assert.ok(flat.some((line) => line.includes('built/flat.glb') && /flat/.test(line)), flat.join('\n'));
  const stale = treeDifferences({ tracked: [...fresh, 'built/fixture.a/stale.glb'], fresh, manifest });
  assert.ok(stale.some((line) => line.includes('built/fixture.a/stale.glb')), stale.join('\n'));
  const unnamed = treeDifferences({ tracked: [...fresh, 'built/fixture.a/new.glb'], fresh: [...fresh, 'built/fixture.a/new.glb'], manifest });
  assert.ok(unnamed.some((line) => line.includes('built/fixture.a/new.glb')), unnamed.join('\n'));
  const lost = fresh.filter((file) => !file.endsWith('fixture_a.glb'));
  const missing = treeDifferences({ tracked: lost, fresh: lost, manifest });
  assert.ok(missing.some((line) => line.includes('fixture_a.glb')), missing.join('\n'));
});

test('built/ holds nothing flat but the manifest, and the manifest names every tracked file under built/', () => {
  const tracked = git('ls-files', '-z', '--', 'built').split('\0').filter(Boolean);
  assert.deepEqual(tracked.filter((path) => path.split('/').length === 2), ['built/manifest.json']);
  const manifest = JSON.parse(readFileSync(join(repo, 'built/manifest.json'), 'utf8'));
  assert.deepEqual([...manifestFiles(manifest)].sort(), [...tracked].sort());
});

test('a recipe file\'s rows reach the production build: every recipe pack has a model in the manifest', async () => {
  const { recipePackIds } = await import('../recipes.mjs');
  const manifest = JSON.parse(readFileSync(join(repo, 'built/manifest.json'), 'utf8'));
  const packs = new Set(manifest.models.map((model) => model.pack));
  for (const packId of recipePackIds(repo)) assert.ok(packs.has(packId), `${packId} has no model in built/manifest.json`);
});
