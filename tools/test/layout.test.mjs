import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { declaredPacks, mobFormat, outputPath, packFormats, producedModels, readMobRows, readRoster, rosterFile, undeclaredDirectories } from '../layout.mjs';

const repo = resolve(import.meta.dirname, '../..');
const filesUnder = (directory) => readdirSync(directory, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile()).map((entry) => relative(directory, join(entry.parentPath, entry.name))).sort();

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'layout-'));
  mkdirSync(join(root, 'models/recipes'), { recursive: true });
  writeFileSync(join(root, 'models/recipes/fixture.recipe.jsonnet'), '[]');
  writeFileSync(join(root, 'models/export.json'), JSON.stringify({ 'fixture.roster': ['fixture_gun'] }));
  writeFileSync(join(root, 'models/mobs.json'), JSON.stringify({
    defaults: { pack: 'fixture.mobs' },
    mobs: [{ id: 'fixture_mob', format: 'matrices', glb: 'fixture_mob.glb', clips: 'fixture_mob_clips.json' }],
  }));
  return root;
}

test('every pack a recipe file, a roster pack or a mob row names is declared, and nothing else', () => {
  const root = fixtureRoot();
  try {
    assert.deepEqual(declaredPacks(root), new Set(['fixture.recipe', 'fixture.roster', 'fixture.mobs']));
    assert.deepEqual(readRoster(root), [{ packId: 'fixture.roster', id: 'fixture_gun', file: 'fixture.roster/assets/models/fixture_gun.glb' }]);
    assert.deepEqual(producedModels(root), [
      { id: 'fixture_gun', file: 'fixture.roster/assets/models/fixture_gun.glb', clips: null },
      { id: 'fixture_mob', file: 'fixture.mobs/fixture_mob.glb', clips: 'fixture.mobs/fixture_mob_clips.json' },
    ]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a directory under built/ that no pack declares is reported; flat files are not directories', () => {
  const declared = new Set(['fixture.a']);
  assert.deepEqual(undeclaredDirectories(['built/flat.glb', 'built/fixture.a/assets/models/x.glb', 'built/fixture.b/x.glb', 'built/fixture.b/y.glb'], declared), ['built/fixture.b']);
});

test('a mob row bakes its pack\'s clip representation; a row cannot contradict it', () => {
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
  const tracked = execFileSync('git', ['-C', repo, 'ls-files', '-z', '--', 'built'], { encoding: 'utf8' }).split('\0').filter(Boolean);
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

test('the showcase lists every produced row at its layout path and ships the file there', () => {
  const out = mkdtempSync(join(tmpdir(), 'site-'));
  try {
    execFileSync(process.execPath, [join(repo, 'site/build.mjs'), out], { cwd: repo, stdio: 'pipe' });
    const { models } = JSON.parse(readFileSync(join(out, 'models.json'), 'utf8'));
    const listed = new Map(models.map((model) => [model.file, model]));
    for (const row of producedModels()) {
      assert.equal(listed.get(row.file)?.clips, row.clips, `${row.file} is not listed with its clips`);
    }
    for (const model of models) {
      assert.ok(existsSync(join(out, 'built', model.file)), `${model.file} is not shipped`);
      if (model.clips) assert.ok(existsSync(join(out, 'built', model.clips)), `${model.clips} is not shipped`);
    }
  } finally { rmSync(out, { recursive: true, force: true }); }
});
