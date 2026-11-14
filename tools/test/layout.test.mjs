import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { sampleClip } from '../../site/clipFrames.mjs';
import { isWearable, placeOf, readDressing, wornPieces } from '../dress.mjs';
import {
  declaredPacks,
  outputPath,
  readMobRows,
  readRoster,
  smoothPack,
  thingEntryFile,
  undeclaredDirectories,
} from '../layout.mjs';
import { buildManifest, MANIFEST, manifestJson, mobManifest, readCredits } from '../manifest.mjs';
import { installJsonnetSources } from '../sources.mjs';

const repo = resolve(import.meta.dirname, '../..');
await installJsonnetSources();
const filesUnder = (directory) =>
  readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)))
    .sort();

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'layout-'));
  mkdirSync(join(root, 'models/recipes'), { recursive: true });
  writeFileSync(join(root, 'models/recipes/fixture.recipe.jsonnet'), '[]');
  mkdirSync(join(root, 'models/sounds'), { recursive: true });
  writeFileSync(join(root, 'models/sounds/fixture.sounds.jsonnet'), '{}');
  writeFileSync(join(root, 'models/export.json'), JSON.stringify({ 'fixture.roster': ['fixture_gun'] }));
  writeFileSync(
    join(root, 'models/mobs.json'),
    JSON.stringify({
      defaults: { pack: 'fixture.mobs' },
      mobs: [{ id: 'fixture_mob', glb: 'fixture_mob.glb', clips: 'fixture_mob_clips.json' }],
    }),
  );
  return root;
}

test("every pack a recipe file, a roster pack, a mob row or a sound file names is declared, with each model pack's smooth copy, and nothing else", () => {
  const root = fixtureRoot();
  try {
    assert.deepEqual(
      declaredPacks(root),
      new Set([
        'fixture.recipe',
        'fixture.roster',
        'fixture.mobs',
        'fixture.sounds',
        'fixture.recipe.smooth',
        'fixture.roster.smooth',
      ]),
    );
    assert.deepEqual(readRoster(root), [{ packId: 'fixture.roster', id: 'fixture_gun' }]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a source naming a pack as a smooth copy is refused, so no smooth pack is two packs', () => {
  const root = fixtureRoot();
  try {
    writeFileSync(join(root, 'models/export.json'), JSON.stringify({ 'fixture.roster.smooth': ['fixture_gun'] }));
    assert.throws(() => declaredPacks(root), /smooth pack's name: fixture\.roster\.smooth/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a directory under built/ that no pack declares is reported; flat files are not directories', () => {
  const declared = new Set(['fixture.a']);
  assert.deepEqual(
    undeclaredDirectories(
      ['built/flat.glb', 'built/fixture.a/assets/models/x.glb', 'built/fixture.b/x.glb', 'built/fixture.b/y.glb'],
      declared,
    ),
    ['built/fixture.b'],
  );
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

test('the roster builder writes each id at its pack path, with its sidecar and its smooth copy, and nowhere else', () => {
  const [{ packId, id }] = readRoster();
  const out = mkdtempSync(join(tmpdir(), 'roster-'));
  try {
    execFileSync(process.execPath, [join(repo, 'tools/build.mjs'), '--no-cache', '--out', out, id], {
      cwd: repo,
      stdio: 'pipe',
    });
    assert.deepEqual(
      filesUnder(out),
      [
        outputPath(packId, `assets/models/${id}.glb`),
        thingEntryFile(packId, id),
        outputPath(smoothPack(packId), `assets/models/${id}.glb`),
      ].sort(),
    );
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('every roster wearable the doll seats by an anchor builds with that anchor, so it is not seated by its origin', () => {
  const dressing = readDressing(repo);
  const roster = new Map(readRoster().map((row) => [row.id, row]));
  const rows = JSON.parse(readFileSync(join(repo, 'tools/packages/thing-authoring-tool/exports/deadvox.json'), 'utf8'));
  const models = rows.filter(({ id }) => roster.has(id)).map(({ id, taxonomy }) => ({ id, tags: taxonomy.tags }));
  const seated = models.filter(
    (model) =>
      isWearable(model, models) &&
      wornPieces(model.id, models, dressing).length === 0 &&
      placeOf(model, dressing).anchor !== undefined,
  );
  assert.ok(seated.length > 0);
  const out = mkdtempSync(join(tmpdir(), 'roster-'));
  try {
    execFileSync(
      process.execPath,
      [join(repo, 'tools/build.mjs'), '--no-cache', '--out', out, ...seated.map(({ id }) => id)],
      { cwd: repo, stdio: 'pipe' },
    );
    for (const { id } of seated) {
      const sidecar = join(out, thingEntryFile(roster.get(id).packId, id));
      assert.ok(existsSync(sidecar), `${id} builds no sidecar`);
      const { anchor } = placeOf(
        models.find((model) => model.id === id),
        dressing,
      );
      assert.ok(JSON.parse(readFileSync(sidecar, 'utf8')).anchors?.[anchor], `${id} has no ${anchor} anchor`);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

// One mob row per template bakes every clip shape the templates make, so the showcase must compose each of them.
const mobRowPerTemplate = () => [...new Map(readMobRows().map((row) => [row.template, row])).values()];

test("the showcase lists every model of the manifest at its pack path, ships the file there with any smooth copy and can play every template's clips", () => {
  const root = mkdtempSync(join(tmpdir(), 'site-'));
  const built = join(root, 'built');
  const out = join(root, 'site');
  try {
    const rows = mobRowPerTemplate();
    execFileSync(
      process.execPath,
      [join(repo, 'tools/mobs.mjs'), '--no-cache', '--out', built, ...rows.map((row) => row.id)],
      { cwd: repo, stdio: 'pipe' },
    );
    // A roster model beside the mobs, since a mob has no smooth copy and the model has.
    const [{ packId, id }] = readRoster();
    execFileSync(process.execPath, [join(repo, 'tools/build.mjs'), '--no-cache', '--out', built, id], {
      cwd: repo,
      stdio: 'pipe',
    });
    const path = `assets/models/${id}.glb`;
    const thing = { id, title: id, kind: 'thing', pack: packId, path, smooth: { pack: smoothPack(packId), path } };
    const manifest = buildManifest({
      models: [...mobManifest(rows).models, thing],
      files: filesUnder(built),
      credit: readCredits(repo),
    });
    writeFileSync(join(built, MANIFEST), manifestJson(manifest));
    execFileSync(process.execPath, [join(repo, 'site/build.mjs'), '--built', built, out], { cwd: repo, stdio: 'pipe' });
    const { models } = JSON.parse(readFileSync(join(out, 'models.json'), 'utf8'));
    const listed = new Map(models.map((model) => [model.file, model]));
    assert.ok(manifest.models.length > 0);
    for (const row of manifest.models) {
      const file = outputPath(row.pack, row.path);
      const clips = row.clips === undefined ? null : outputPath(row.pack, row.clips);
      assert.equal(listed.get(file)?.clips, clips, `${file} is not listed with its clips`);
      assert.equal(listed.get(file)?.title, row.title, `${file} is not listed under its authored title`);
      const smooth = row.smooth === undefined ? undefined : outputPath(row.smooth.pack, row.smooth.path);
      assert.equal(listed.get(file)?.smooth?.file, smooth, `${file} is not listed with its smooth copy`);
    }
    assert.ok(models.some((model) => model.smooth) && models.some((model) => !model.smooth));
    assert.equal(new Set(models.map((model) => model.id)).size, models.length, 'two showcase models share an id');
    let sampledDeaths = 0;
    for (const model of models) {
      assert.ok(existsSync(join(out, 'built', model.file)), `${model.file} is not shipped`);
      if (model.smooth)
        assert.ok(existsSync(join(out, 'built', model.smooth.file)), `${model.smooth.file} is not shipped`);
      if (model.clips) assert.ok(existsSync(join(out, 'built', model.clips)), `${model.clips} is not shipped`);
      if (model.body) assert.ok(existsSync(join(out, 'built', model.body)), `${model.file} is missing its actor body`);
      if (model.clips) {
        assert.ok(model.body, `${model.file} has clips the viewer cannot pose`);
        const clips = JSON.parse(readFileSync(join(out, 'built', model.clips), 'utf8'));
        const set = clips.standing ?? clips.crawling ?? clips;
        assert.ok(
          Object.values(set).some((clip) => ['pose', 'overlay', 'jointDelta'].includes(clip?.kind)),
          `${model.file} has no viewer-playable clip`,
        );
        for (const name of ['walk', 'attack', 'idle'])
          if (set[name]?.kind === 'pose')
            for (const time of [0, 1.234]) {
              const clip = set[name];
              assert.ok(
                sampleClip(clip, time, (a) => a),
                `${model.file} has an unsampleable ${name} clip`,
              );
            }
        // Death falls run on the render clock, so its span key differs from every other finite clip's.
        for (const [direction, clip] of Object.entries(set.death ?? {}))
          for (const time of [0, 1.234]) {
            assert.equal(clip.kind, 'pose');
            assert.ok(
              sampleClip(clip, time, (a) => a),
              `${model.file} has an unsampleable death ${direction} clip`,
            );
            sampledDeaths++;
          }
      }
    }
    assert.ok(sampledDeaths > 0, 'no showcase death clip was sampled');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
