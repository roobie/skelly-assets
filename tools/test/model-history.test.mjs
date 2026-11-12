import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { compareVersions, hashModels, mergeHistory, previousTag, standings, vehicleStanding } from '../model-history.mjs';

const entry = (introduced, updated, sha256) => ({ introduced, updated, sha256 });
const before = { version: 'v1.0.0', models: { kept: entry('v0.1.0', 'v0.1.0', 'a'), edited: entry('v0.1.0', 'v0.2.0', 'b'), old_name: entry('v0.3.0', 'v0.3.0', 'c'), gone: entry('v0.1.0', 'v0.1.0', 'd') } };

test('a model is new, edited or unchanged by its hash, and a release without it drops it', () => {
  const { models } = mergeHistory({ previous: before, version: 'v1.1.0', hashes: { kept: 'a', edited: 'b2', fresh: 'f' } });
  assert.deepEqual(models.kept, entry('v0.1.0', 'v0.1.0', 'a'));
  assert.deepEqual(models.edited, entry('v0.1.0', 'v1.1.0', 'b2'));
  assert.deepEqual(models.fresh, entry('v1.1.0', 'v1.1.0', 'f'));
  assert.equal(models.gone, undefined);
});

test('a renamed model keeps its history, and is updated only when its bytes changed', () => {
  const same = mergeHistory({ previous: before, version: 'v1.1.0', hashes: { new_name: 'c' }, renames: { old_name: 'new_name' } });
  assert.deepEqual(same.models.new_name, entry('v0.3.0', 'v0.3.0', 'c'));
  const edited = mergeHistory({ previous: before, version: 'v1.1.0', hashes: { new_name: 'c2' }, renames: { old_name: 'new_name' } });
  assert.deepEqual(edited.models.new_name, entry('v0.3.0', 'v1.1.0', 'c2'));
});

test('models merged into one keep the earliest introduction and count as changed', () => {
  const { models } = mergeHistory({ previous: before, version: 'v1.1.0', hashes: { whole: 'w' }, renames: { kept: 'whole', old_name: 'whole' } });
  assert.deepEqual(models.whole, entry('v0.1.0', 'v1.1.0', 'w'));
});

test('a model that left a release and came back is new again, not continuous', () => {
  const gap = mergeHistory({ previous: before, version: 'v1.1.0', hashes: {} });
  const back = mergeHistory({ previous: gap, version: 'v1.2.0', hashes: { gone: 'd' } });
  assert.deepEqual(back.models.gone, entry('v1.2.0', 'v1.2.0', 'd'));
});

test('the first release has no previous history and introduces every model', () => {
  assert.deepEqual(mergeHistory({ version: 'v0.1.0', hashes: { x: 'h' } }).models.x, entry('v0.1.0', 'v0.1.0', 'h'));
});

test('a model stands as unchanged, changed since the release, or new on main, also under a rename since', () => {
  const now = standings(before, { kept: 'a', edited: 'other', fresh: 'f', new_name: 'c' }, { old_name: 'new_name' });
  assert.deepEqual(now.kept, { introduced: 'v0.1.0', updated: 'v0.1.0', changed: false });
  assert.equal(now.edited.changed, true);
  assert.equal(now.fresh, null);
  assert.deepEqual(now.new_name, { introduced: 'v0.3.0', updated: 'v0.3.0', changed: false });
});

test('a vehicle is introduced with its placements and last changed with its placements or any part', () => {
  const own = { introduced: 'v0.5.0', updated: 'v0.5.0', changed: false };
  const wheel = { introduced: 'v0.1.0', updated: 'v0.6.0', changed: false };
  assert.deepEqual(vehicleStanding(own, [wheel]), { introduced: 'v0.5.0', updated: 'v0.6.0', changed: false });
  assert.equal(vehicleStanding(own, [{ ...wheel, changed: true }]).changed, true);
  assert.equal(vehicleStanding(own, [null]).changed, true);
  assert.equal(vehicleStanding(null, [wheel]), null);
});

test('versions order numerically, and the previous release skips edge and later tags', () => {
  assert.ok(compareVersions('v0.10.0', 'v0.9.2') > 0);
  assert.throws(() => compareVersions('edge', 'v0.1.0'), /not a vMAJOR/);
  const tags = ['edge', 'v0.9.0', 'v0.10.0', 'v0.2.0'];
  assert.equal(previousTag(tags, 'v0.10.0'), 'v0.9.0');
  assert.equal(previousTag(tags), 'v0.10.0');
  assert.equal(previousTag(tags, 'v0.2.0'), undefined);
});

test('only GLB models and vehicle placements are hashed, and a vehicle may not share a model id', () => {
  const root = mkdtempSync(join(tmpdir(), 'model-history-'));
  try {
    mkdirSync(join(root, 'fixture.a'));
    writeFileSync(join(root, 'fixture.a/one.glb'), 'one');
    const manifest = { models: [{ id: 'one', pack: 'fixture.a', path: 'one.glb' }, { id: 'rig', pack: 'fixture.a', path: 'rig.json' }] };
    writeFileSync(join(root, 'fixture.a/car.json'), '{}');
    const car = { id: 'car', pack: 'fixture.a', path: 'car.json' };
    assert.deepEqual(Object.keys(hashModels(root, { ...manifest, vehicles: [car] })), ['one', 'car']);
    assert.throws(() => hashModels(root, { ...manifest, vehicles: [{ ...car, id: 'one' }] }), /one names more than one/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
