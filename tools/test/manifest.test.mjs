import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { outputPath } from '../layout.mjs';
import { buildManifest, manifestFiles, mobManifest, readCredits, treeDifferences } from '../manifest.mjs';

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
    { id: 'fixture_b', title: 'Fixture B', kind: 'item', pack: 'fixture.b', path: 'assets/models/fixture_b.glb', nodes: ['b:part'] },
    { id: 'fixture_a', title: 'Fixture A', kind: 'design', pack: 'fixture.a', path: 'assets/models/fixture_a.glb', nodes: ['a:part'] },
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
    models: [{ id: 'fixture_a', title: 'Fixture A', kind: 'item', pack: 'fixture.a', path: 'assets/models/fixture_a.glb', nodes: [] }],
    files: [],
    credit,
  }), /fixture_a/);
});

test('motions whose rig file the tree does not hold are refused, so a consumer never loads clips it cannot pose', () => {
  assert.throws(() => buildManifest({
    models: [],
    motions: [{ id: 'fixture_moves', pack: 'fixture.a', path: 'motions/fixture.moves.json', rig: 'motions/fixture.rig.json' }],
    files: ['fixture.a/motions/fixture.moves.json'],
    credit,
  }), /fixture_moves/);
});

test('the manifest carries what a worn shell covers, so a consumer reads it without opening the model entry', () => {
  const { models } = buildManifest({
    models: [{ id: 'fixture_a', title: 'Fixture A', kind: 'item', pack: 'fixture.a', path: 'assets/models/fixture_a.glb', nodes: [], covers: ['trunk'] }],
    files: ['fixture.a/assets/models/fixture_a.glb'],
    credit,
  });
  assert.deepEqual(models[0].covers, ['trunk']);
});

test('the manifest carries a model\'s mass and drawn volume, and leaves them out where its tool authors none', () => {
  const { models } = buildManifest({
    models: [
      { id: 'fixture_a', title: 'Fixture A', kind: 'item', pack: 'fixture.a', path: 'assets/models/fixture_a.glb', nodes: [], massKg: 2, volumeM3: 0.004 },
      { id: 'fixture_b', title: 'Fixture B', kind: 'item', pack: 'fixture.a', path: 'assets/models/fixture_b.glb', nodes: [] },
    ],
    files: ['fixture.a/assets/models/fixture_a.glb', 'fixture.a/assets/models/fixture_b.glb'],
    credit,
  });
  assert.deepEqual([models[0].massKg, models[0].volumeM3], [2, 0.004]);
  assert.ok(!Object.hasOwn(models[1], 'massKg') && !Object.hasOwn(models[1], 'volumeM3'));
});

const withRenames = (renames) => buildManifest({
  models: [{ id: 'fixture_a', title: 'Fixture A', kind: 'item', pack: 'fixture.a', path: 'assets/models/fixture_a.glb', nodes: [] }],
  files: ['fixture.a/assets/models/fixture_a.glb'],
  credit,
  renames,
});

test('the manifest carries each retired id with the current id that replaces it', () => {
  assert.deepEqual(withRenames({ fixture_old: 'fixture_a' }).renames, { fixture_old: 'fixture_a' });
});

test('a retired id that names a current model is refused, so no lookup is ambiguous', () => {
  assert.throws(() => withRenames({ fixture_a: 'fixture_a' }), /fixture_a is retired/);
});

test('a rename to an id the build does not hold is refused, so one lookup always lands on a model', () => {
  assert.throws(() => withRenames({ fixture_old: 'fixture_gone' }), /fixture_gone/);
});

test('a mob row joins the manifest with its actor files and no part nodes', () => {
  const { models, files } = mobManifest([{ id: 'fixture_mob', title: 'Fixture mob', pack: 'fixture.mobs', glb: 'fixture_mob.glb', clips: 'fixture_mob.clips.json', body: 'fixture_mob.body.json' }]);
  assert.deepEqual(files, ['fixture.mobs/fixture_mob.glb', 'fixture.mobs/fixture_mob.body.json', 'fixture.mobs/fixture_mob.clips.json']);
  assert.deepEqual(models, [{ id: 'fixture_mob', title: 'Fixture mob', kind: 'mob', pack: 'fixture.mobs', path: 'fixture_mob.glb', clips: 'fixture_mob.clips.json', body: 'fixture_mob.body.json' }]);
  assert.ok(!Object.hasOwn(models[0], 'nodes'));
});

test('the tree check holds a fresh tree to its manifest and the declared packs', () => {
  const manifest = fixtureManifest();
  const files = [...manifestFiles(manifest)].sort();
  const declared = new Set(Object.keys(manifest.packs));
  const differences = (tree, packs = declared) => treeDifferences({ files: tree, manifest, declared: packs });
  assert.deepEqual(differences(files), []);
  const reports = (lines, needle) => assert.ok(lines.some((line) => line.includes(needle)), `${needle} is not reported:\n${lines.join('\n')}`);
  reports(differences([...files, 'built/flat.glb']), 'built/flat.glb');
  reports(differences([...files, 'built/fixture.a/new.glb']), 'built/fixture.a/new.glb');
  reports(differences(files.filter((file) => !file.endsWith('fixture_a.glb'))), 'fixture_a.glb');
  reports(differences(files, new Set(['fixture.a'])), 'fixture.b');
  reports(differences(files, new Set([...declared, 'fixture.unbuilt'])), 'fixture.unbuilt');
});
