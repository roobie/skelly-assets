import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { keepSites, viewSet } from '../../site/lookOptions.mjs';
import { FORWARD, REVIEW_VIEWS, RIGHT, UNDERSIDE_VIEWS, UP } from '../../site/modelFrame.mjs';
import { lookDigest, lookIds, lookName, mergeRows, staleIds } from '../look.mjs';

const repo = resolve(import.meta.dirname, '../..');
const manifest = {
  models: [
    { id: 'fixture_body', pack: 'fixture.vans', path: 'models/fixture_body.glb' },
    { id: 'fixture_door', pack: 'fixture.vans', path: 'models/fixture_door.glb' },
    { id: 'fixture_notes', pack: 'fixture.vans', path: 'models/fixture_notes.json' },
  ],
  vehicles: [{ id: 'fixture_van', pack: 'fixture.vans', path: 'vehicles/fixture_van.placements.json' }],
  assemblies: [{ id: 'fixture_door_assembly', sites: [{ site: 'door', model: 'fixture_door', at: [0, 0, 0] }, { site: 'trim', model: 'fixture_body', at: [0.1, 0, 0] }] }],
};

function builtTree() {
  const built = mkdtempSync(join(tmpdir(), 'look-'));
  mkdirSync(join(built, 'fixture.vans/models'), { recursive: true });
  mkdirSync(join(built, 'fixture.vans/vehicles'), { recursive: true });
  writeFileSync(join(built, 'fixture.vans/models/fixture_body.glb'), 'body');
  writeFileSync(join(built, 'fixture.vans/models/fixture_door.glb'), 'door');
  const sites = [{ id: 'body', part: 'fixture_body', at: [0, 0, 0] }, { id: 'door_far', part: 'fixture_door', at: [1, 0, 0], mirror: true }];
  writeFileSync(join(built, 'fixture.vans/vehicles/fixture_van.placements.json'), JSON.stringify({ sites }));
  return built;
}

test('a look draws what it is asked, every vehicle or assembly by its flag, and every drawable entry when asked nothing', () => {
  assert.deepEqual(lookIds(manifest, { ids: ['fixture_door'] }), ['fixture_door']);
  assert.deepEqual(lookIds(manifest, { ids: ['fixture_door'], vehicles: true }), ['fixture_door', 'fixture_van']);
  assert.deepEqual(lookIds(manifest, { assemblies: true }), ['fixture_door_assembly']);
  assert.deepEqual(lookIds(manifest), ['fixture_body', 'fixture_door', 'fixture_door_assembly', 'fixture_van']);
  assert.throws(() => lookIds(manifest, { ids: ['fixture_notes'] }), /fixture_notes/);
});

test('a vehicle picture changes digest when any part it places is rebuilt, and has none once a part is gone', () => {
  const built = builtTree();
  try {
    const before = lookDigest(built, manifest, 'fixture_van');
    const body = lookDigest(built, manifest, 'fixture_body');
    writeFileSync(join(built, 'fixture.vans/models/fixture_door.glb'), 'door, rebuilt');
    assert.notEqual(lookDigest(built, manifest, 'fixture_van'), before);
    assert.equal(lookDigest(built, manifest, 'fixture_body'), body);
    rmSync(join(built, 'fixture.vans/models/fixture_door.glb'));
    assert.equal(lookDigest(built, manifest, 'fixture_van'), undefined);
  } finally {
    rmSync(built, { recursive: true, force: true });
  }
});

test('an assembly picture changes digest when one of its parts is rebuilt or moves on its site', () => {
  const built = builtTree();
  try {
    const before = lookDigest(built, manifest, 'fixture_door_assembly');
    assert.ok(before);
    const moved = structuredClone(manifest);
    moved.assemblies[0].sites[1].at = [0.2, 0, 0];
    assert.notEqual(lookDigest(built, moved, 'fixture_door_assembly'), before);
    writeFileSync(join(built, 'fixture.vans/models/fixture_body.glb'), 'body, rebuilt');
    assert.notEqual(lookDigest(built, manifest, 'fixture_door_assembly'), before);
  } finally {
    rmSync(built, { recursive: true, force: true });
  }
});

test('a printed label steers the picture, so relabelling a model changes its digest', () => {
  const built = builtTree();
  try {
    const labelled = structuredClone(manifest);
    labelled.models[0].label = { text: 'Fixture' };
    assert.notEqual(lookDigest(built, labelled, 'fixture_body'), lookDigest(built, manifest, 'fixture_body'));
  } finally {
    rmSync(built, { recursive: true, force: true });
  }
});

test('a redrawn row replaces its earlier one, the rest of the batch stays and a removed entry leaves', () => {
  const previous = [{ id: 'a', digest: 'old' }, { id: 'b', digest: 'b' }, { id: 'gone', digest: 'x' }];
  assert.deepEqual(mergeRows(previous, [{ id: 'a', digest: 'new' }], new Set(['a', 'b'])), [{ id: 'a', digest: 'new' }, { id: 'b', digest: 'b' }]);
});

test('a sheet shows one look, so a look with other options drops the rows drawn before it', () => {
  const underside = lookName({ views: 'underside' });
  const previous = [{ id: 'a', digest: '1' }, { id: 'b', digest: '1', look: underside }];
  assert.deepEqual(mergeRows(previous, [{ id: 'c', look: underside }], new Set(['a', 'b', 'c']), underside).map(({ id }) => id), ['b', 'c']);
});

test('a look keeps only the sites it names by prefix, under an id of its own, and refuses one it cannot keep', () => {
  const van = { id: 'fixture_van', sites: [{ site: 'body' }, { site: 'exhaust_front_pipe' }, { site: 'muffler' }, { site: 'door_far' }] };
  const kept = keepSites(van, ['exhaust_', 'muffler']);
  assert.deepEqual(kept.sites.map(({ site }) => site), ['exhaust_front_pipe', 'muffler']);
  assert.notEqual(kept.id, van.id);
  assert.equal(keepSites(van), van);
  assert.throws(() => keepSites(van, ['radiator']), /radiator/);
  assert.throws(() => keepSites({ id: 'fixture_door' }, ['door']), /fixture_door/);
  assert.throws(() => viewSet('sideways'), /sideways/);
});

test('the underside views look up from below at both ends, and the rear from straight behind', () => {
  const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
  const view = Object.fromEntries(UNDERSIDE_VIEWS);
  assert.ok(dot(view['below front ¾'], UP) < 0 && dot(view['below front ¾'], FORWARD) > 0);
  assert.ok(dot(view['below rear ¾'], UP) < 0 && dot(view['below rear ¾'], FORWARD) < 0);
  assert.equal(dot(view.rear, FORWARD), -1);
  assert.equal(dot(view.below, UP), -1);
});

test('a render is stale when its model changed or left the tree, never when it failed to draw', () => {
  const rows = [{ id: 'same', digest: '1' }, { id: 'changed', digest: '1' }, { id: 'gone', digest: '1' }, { id: 'failed', error: 'no' }];
  const now = { same: '1', changed: '2', failed: '1' };
  assert.deepEqual(staleIds(rows, (id) => now[id]), ['changed', 'gone']);
});

// The review page must draw with the very three.js the showcase draws with, or a review would judge another renderer.
test('the review page loads the same three.js as the showcase', () => {
  const importMap = (page) => JSON.parse(/<script type="importmap">([\s\S]*?)<\/script>/.exec(readFileSync(join(repo, 'site', page), 'utf8'))[1]);
  assert.deepEqual(importMap('look.html'), importMap('index.html'));
});

// Every model file faces glTF's +z with +y up, so the review page must find a model's front there rather than guess it
// from the model's proportions, and its right-hand profile on glTF's right, -x.
test('the review page draws the front from +z, the rear from behind and the side from the right, square to forward', () => {
  const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const view = Object.fromEntries(REVIEW_VIEWS);
  assert.deepEqual([FORWARD, UP], [[0, 0, 1], [0, 1, 0]]);
  assert.deepEqual(cross(FORWARD, UP), RIGHT);
  assert.ok(dot(view['front ¾'], FORWARD) > 0);
  assert.ok(dot(view['rear ¾'], FORWARD) < 0);
  assert.equal(dot(view.side, FORWARD), 0);
  assert.ok(dot(view.side, RIGHT) > 0);
  assert.equal(dot(view.side, UP), 0);
  assert.equal(dot(view.top, UP), 1);
});
