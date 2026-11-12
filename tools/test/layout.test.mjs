import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { declaredPacks, outputPath, readMobRows, readRoster, rosterFile, undeclaredDirectories } from '../layout.mjs';
import { buildManifest, MANIFEST, manifestJson, mobManifest, readCredits } from '../manifest.mjs';
import { sampleClip } from '../../site/clipFrames.mjs';

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

test('the roster is a map from valid pack ids to ids, each id in one pack', () => {
  const roster = readRoster();
  assert.ok(roster.length > 0);
  const ids = roster.map((row) => row.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every mob row names a pack and actor output paths', () => {
  const rows = readMobRows();
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.equal(typeof row.pack, 'string', `${row.id} has no pack`);
    for (const file of [row.glb, row.body, row.clips]) outputPath(row.pack, file);
  }
});

test('the roster builder writes each id at its pack path and nowhere else', () => {
  const [{ packId, id }] = readRoster();
  const out = mkdtempSync(join(tmpdir(), 'roster-'));
  try {
    execFileSync(process.execPath, [join(repo, 'tools/build.mjs'), '--no-cache', '--out', out, id], { cwd: repo, stdio: 'pipe' });
    assert.deepEqual(filesUnder(out), [rosterFile(packId, id)]);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

// One mob row per template bakes every clip shape the templates make, so the showcase must compose each of them.
const mobRowPerTemplate = () => [...new Map(readMobRows().map((row) => [row.template, row])).values()];

test('the showcase lists every model of the manifest at its pack path, ships the file there and can play every template\'s clips', () => {
  const root = mkdtempSync(join(tmpdir(), 'site-'));
  const built = join(root, 'built');
  const out = join(root, 'site');
  try {
    const rows = mobRowPerTemplate();
    execFileSync(process.execPath, [join(repo, 'tools/mobs.mjs'), '--no-cache', '--out', built, ...rows.map((row) => row.id)], { cwd: repo, stdio: 'pipe' });
    const manifest = buildManifest({ ...mobManifest(rows), credit: readCredits(repo) });
    writeFileSync(join(built, MANIFEST), manifestJson(manifest));
    execFileSync(process.execPath, [join(repo, 'site/build.mjs'), '--built', built, out], { cwd: repo, stdio: 'pipe' });
    const { models } = JSON.parse(readFileSync(join(out, 'models.json'), 'utf8'));
    const listed = new Map(models.map((model) => [model.file, model]));
    assert.ok(manifest.models.length > 0);
    for (const row of manifest.models) {
      const file = outputPath(row.pack, row.path);
      const clips = row.clips === undefined ? null : outputPath(row.pack, row.clips);
      assert.equal(listed.get(file)?.clips, clips, `${file} is not listed with its clips`);
    }
    assert.equal(new Set(models.map((model) => model.id)).size, models.length, 'two showcase models share an id');
    let sampledDeaths = 0;
    for (const model of models) {
      assert.ok(existsSync(join(out, 'built', model.file)), `${model.file} is not shipped`);
      if (model.clips) assert.ok(existsSync(join(out, 'built', model.clips)), `${model.clips} is not shipped`);
      if (model.body) assert.ok(existsSync(join(out, 'built', model.body)), `${model.file} is missing its actor body`);
      if (model.clips) {
        assert.ok(model.body, `${model.file} has clips the viewer cannot pose`);
        const clips = JSON.parse(readFileSync(join(out, 'built', model.clips), 'utf8'));
        const set = clips.standing ?? clips.crawling ?? clips;
        assert.ok(Object.values(set).some((clip) => ['pose', 'overlay', 'jointDelta'].includes(clip?.kind)), `${model.file} has no viewer-playable clip`);
        for (const name of ['walk', 'attack', 'idle']) if (set[name]?.kind === 'pose') for (const time of [0, 1.234]) {
          const clip = set[name];
          assert.ok(sampleClip(clip, time, (a) => a), `${model.file} has an unsampleable ${name} clip`);
        }
        // Death falls run on the render clock, so its span key differs from every other finite clip's.
        for (const direction of ['forward', 'backward']) if (set.death?.[direction]) for (const time of [0, 1.234]) {
          const clip = set.death[direction];
          assert.equal(clip.kind, 'pose');
          assert.ok(sampleClip(clip, time, (a) => a), `${model.file} has an unsampleable death ${direction} clip`);
          sampledDeaths++;
        }
      }
    }
    assert.ok(sampledDeaths > 0, 'no showcase death clip was sampled');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
