import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildManifest } from '../manifest.mjs';
import { exportPlacements, placementProblems } from '../placements.mjs';

const models = [
  { id: 'fixture_body', pack: 'fixture.road' },
  { id: 'fixture_door', pack: 'fixture.road' },
  { id: 'fixture_wheel', pack: 'fixture.shared' },
  { id: 'fixture_twice', pack: 'fixture.road' },
  { id: 'fixture_twice', pack: 'fixture.shared' },
];
const body = { id: 'body', part: 'fixture_body', at: [0, 0, 0] };
const car = [
  body,
  { id: 'door_near', part: 'fixture_door', at: [0, 0, 0] },
  { id: 'door_far', part: 'fixture_door', at: [0, 0, 0], mirror: true },
  { id: 'wheel', part: 'fixture_wheel', at: [1, 0.3, 0.8] },
];

test('sites that name built models, each once, at a point, assemble without problems', () => {
  assert.deepEqual(placementProblems({ car }, models), []);
});

// Each would place nothing, the wrong model or a part nowhere, and only the showcase or a game would notice.
test('a site that cannot be assembled from the built models is a problem', () => {
  const broken = (site) => placementProblems({ car: [body, site] }, models);
  assert.match(broken({ id: 'gone', part: 'fixture_missing', at: [0, 0, 0] }).join(), /not a built model/);
  assert.match(broken({ id: 'twice', part: 'fixture_twice', at: [0, 0, 0] }).join(), /2 packs/);
  assert.match(broken({ ...body }).join(), /two sites of one id/);
  assert.match(broken({ id: 'flat', part: 'fixture_door', at: [0, 0] }).join(), /three finite numbers/);
  assert.match(broken({ id: 'far', part: 'fixture_door', at: [0, 0, 0], mirror: false }).join(), /mirror/);
  assert.match(broken({ id: 'turned', part: 'fixture_door', at: [0, 0, 0], yaw: 1 }).join(), /unknown keys yaw/);
  assert.match(placementProblems({ empty: [] }, models).join(), /no sites/);
});

test('a vehicle\'s placements are written into the pack of its root part and named in the manifest', () => {
  const out = mkdtempSync(join(tmpdir(), 'placements-'));
  try {
    const placed = exportPlacements({ placements: { car }, models, out });
    assert.deepEqual(placed.vehicles, [{ id: 'car', pack: 'fixture.road', path: 'vehicles/car.placements.json' }]);
    assert.deepEqual(JSON.parse(readFileSync(join(out, placed.files[0]), 'utf8')), { sites: car });
    const manifest = buildManifest({ models: [], vehicles: placed.vehicles, files: placed.files, credit: () => ({}) });
    assert.deepEqual(manifest.vehicles.map(({ id, pack, path }) => ({ id, pack, path })), placed.vehicles);
    assert.throws(() => buildManifest({ models: [], vehicles: placed.vehicles, files: [], credit: () => ({}) }), /car/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
