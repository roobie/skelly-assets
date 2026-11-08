import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { declaredPacks, mobFormat, outputPath, readMobRows, readPackFormats, readRoster, rosterFile, undeclaredDirectories } from '../layout.mjs';

const repo = resolve(import.meta.dirname, '../..');
// Git run from a hook inherits GIT_DIR, GIT_WORK_TREE and kin, which override -C; drop every GIT_ binding.
const gitEnvironment = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', env: gitEnvironment() });
const filesUnder = (directory) => readdirSync(directory, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile()).map((entry) => relative(directory, join(entry.parentPath, entry.name))).sort();

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'layout-'));
  mkdirSync(join(root, 'models/recipes'), { recursive: true });
  writeFileSync(join(root, 'models/recipes/fixture.recipe.jsonnet'), '[]');
  writeFileSync(join(root, 'models/export.json'), JSON.stringify({ 'fixture.roster': ['fixture_gun'] }));
  writeFileSync(join(root, 'models/pack-formats.json'), JSON.stringify({ packs: { 'fixture.mobs': 'matrices' } }));
  writeFileSync(join(root, 'models/mobs.json'), JSON.stringify({
    defaults: { pack: 'fixture.mobs' },
    mobs: [{ id: 'fixture_mob', glb: 'fixture_mob.glb', clips: 'fixture_mob_clips.json' }],
  }));
  return root;
}

test('every pack a recipe file, a roster pack or a mob row names is declared, and nothing else', () => {
  const root = fixtureRoot();
  try {
    assert.deepEqual(declaredPacks(root), new Set(['fixture.recipe', 'fixture.roster', 'fixture.mobs']));
    assert.deepEqual(readRoster(root), [{ packId: 'fixture.roster', id: 'fixture_gun', file: 'fixture.roster/assets/models/fixture_gun.glb' }]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a directory under built/ that no pack declares is reported; flat files are not directories', () => {
  const declared = new Set(['fixture.a']);
  assert.deepEqual(undeclaredDirectories(['built/flat.glb', 'built/fixture.a/assets/models/x.glb', 'built/fixture.b/x.glb', 'built/fixture.b/y.glb'], declared), ['built/fixture.b']);
});

test('the pack format map is content: read from models/, validated, and only known formats', () => {
  const root = fixtureRoot();
  try {
    assert.deepEqual(readPackFormats(root), { 'fixture.mobs': 'matrices' });
    writeFileSync(join(root, 'models/pack-formats.json'), JSON.stringify({ packs: { 'fixture.mobs': 'fixture.unknown' } }));
    assert.throws(() => readPackFormats(root), /unknown format/);
    writeFileSync(join(root, 'models/pack-formats.json'), JSON.stringify({ packs: { '../fixture': 'pose' } }));
    assert.throws(() => readPackFormats(root), /Invalid pack id/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a mob row bakes its pack\'s clip representation; a row cannot contradict it', () => {
  const packFormats = readPackFormats();
  assert.ok(Object.keys(packFormats).length > 0);
  for (const [pack, format] of Object.entries(packFormats)) {
    assert.equal(mobFormat({ id: 'fixture', pack }), format);
    assert.throws(() => mobFormat({ id: 'fixture', pack, format: format === 'pose' ? 'matrices' : 'pose' }));
  }
  assert.equal(mobFormat({ id: 'fixture', pack: 'fixture.unlisted', format: 'pose' }), 'pose');
  assert.throws(() => mobFormat({ id: 'fixture', pack: 'fixture.unlisted' }));
});

test('the roster is a map from valid pack ids to ids, each id in one pack', () => {
  const roster = readRoster();
  assert.ok(roster.length > 0);
  const ids = roster.map((row) => row.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every mob row names a pack whose clip representation is known', () => {
  const rows = readMobRows();
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.equal(typeof row.pack, 'string', `${row.id} has no pack`);
    mobFormat(row);
    outputPath(row.pack, row.glb);
  }
});

test('every directory tracked under built/ is a declared pack', () => {
  const tracked = git('ls-files', '-z', '--', 'built').split('\0').filter(Boolean);
  assert.ok(tracked.some((path) => path.split('/').length > 2), 'no tracked file in a pack directory under built/');
  assert.deepEqual(undeclaredDirectories(tracked, declaredPacks()), []);
});

test('the roster builder writes each id at its pack path and nowhere else', () => {
  const [{ packId, id }] = readRoster();
  const out = mkdtempSync(join(tmpdir(), 'roster-'));
  try {
    execFileSync(process.execPath, [join(repo, 'tools/build.mjs'), '--out', out, id], { cwd: repo, stdio: 'pipe' });
    assert.deepEqual(filesUnder(out), [rosterFile(packId, id)]);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('the showcase lists every model of the manifest at its pack path and ships the file there', () => {
  const out = mkdtempSync(join(tmpdir(), 'site-'));
  try {
    execFileSync(process.execPath, [join(repo, 'site/build.mjs'), out], { cwd: repo, stdio: 'pipe' });
    const { models } = JSON.parse(readFileSync(join(out, 'models.json'), 'utf8'));
    const listed = new Map(models.map((model) => [model.file, model]));
    const manifest = JSON.parse(readFileSync(join(repo, 'built/manifest.json'), 'utf8'));
    assert.ok(manifest.models.length > 0);
    for (const row of manifest.models) {
      const file = outputPath(row.pack, row.path);
      const clips = row.clips === undefined ? null : outputPath(row.pack, row.clips);
      assert.equal(listed.get(file)?.clips, clips, `${file} is not listed with its clips`);
    }
    assert.equal(new Set(models.map((model) => model.id)).size, models.length, 'two showcase models share an id');
    for (const model of models) {
      assert.ok(existsSync(join(out, 'built', model.file)), `${model.file} is not shipped`);
      if (model.clips) assert.ok(existsSync(join(out, 'built', model.clips)), `${model.clips} is not shipped`);
    }
  } finally { rmSync(out, { recursive: true, force: true }); }
});
