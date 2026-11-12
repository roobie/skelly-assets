import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildManifest } from '../manifest.mjs';
import { compileJsonnetFile } from '../jsonnet/index.mjs';
import { MATERIALS } from '../packages/thing-core/src/materials.ts';
import { exportPlacements, placementProblems } from '../placements.mjs';

const terms = (...names) => ({ terms: new Map(names.map((name) => [name, name])) });
const vocabulary = { categories: new Map(), facets: new Map([['vehicle-body', terms('van')], ['vehicle-role', terms('emergency', 'farm')]]) };
const van = { tags: { 'vehicle-body': ['van'] } };
const models = [
  { id: 'fixture_van_body', pack: 'fixture.vans', taxonomy: van },
  { id: 'fixture_light_bar', pack: 'fixture.rescue' },
  { id: 'fixture_door', pack: 'fixture.vans', paintable: ['paint'] },
  { id: 'fixture_engine', pack: 'fixture.vans' },
  { id: 'fixture_motor', pack: 'fixture.vans' },
  { id: 'fixture_twice', pack: 'fixture.vans' },
  { id: 'fixture_twice', pack: 'fixture.rescue' },
];
const body = { id: 'body', part: 'fixture_van_body', at: [0, 0, 0] };
const vanSites = [
  body,
  { id: 'door_near', part: 'fixture_door', at: [0, 0, 0] },
  { id: 'door_far', part: 'fixture_door', at: [0, 0, 0], mirror: true },
];
// The ambulance borrows the van's body from another pack and adds its own light bar and role.
const ambulance = { title: 'Fixture Ambulance', forward: '+z', sites: [...vanSites, { id: 'light_bar', part: 'fixture_light_bar', at: [0, 2, 0] }], tags: { 'vehicle-role': ['emergency'] } };
const vehicleRows = { van: ['fixture_van_body', 'fixture_door', 'fixture_engine', 'fixture_motor'], ambulance: ['fixture_light_bar'] };
const dependsOn = { 'fixture.rescue': ['fixture.vans'] };
const problems = (placements, deps = dependsOn) => placementProblems({ placements, models, vehicleRows, dependsOn: deps, vocabulary }).join('\n');

test('sites that name built models, each once, at a point, in reachable packs, assemble without problems', () => {
  assert.equal(problems({ van: { title: 'Fixture Van', forward: '+z', sites: vanSites }, ambulance }), '');
});

// Each would place nothing, the wrong model or a part nowhere, and only the showcase or a game would notice.
test('a site that cannot be assembled from the built models is a problem', () => {
  const broken = (site) => problems({ van: { title: 'Fixture Van', forward: '+z', sites: [body, site] } });
  assert.match(broken({ id: 'gone', part: 'fixture_missing', at: [0, 0, 0] }), /not a built model/);
  assert.match(broken({ id: 'twice', part: 'fixture_twice', at: [0, 0, 0] }), /2 packs/);
  assert.match(broken({ ...body }), /two sites of one id/);
  assert.match(broken({ id: 'flat', part: 'fixture_door', at: [0, 0] }), /three finite numbers/);
  assert.match(broken({ id: 'far', part: 'fixture_door', at: [0, 0, 0], mirror: false }), /mirror/);
  assert.match(broken({ id: 'turned', part: 'fixture_door', at: [0, 0, 0], yaw: 1 }), /unknown keys yaw/);
  assert.match(problems({ van: { title: 'Fixture Van', forward: '+z', sites: [] } }), /no sites/);
  assert.match(problems({ van: { title: 'Fixture Van', forward: '+y', sites: vanSites } }), /forward is not one of/);
});

// A finish seeds the paint of the part's copy, so one outside the library or on a part with nothing to paint would set
// nothing, and only a game would notice.
test('a site finish names a library material on a part that takes paint', () => {
  const paint = Object.keys(MATERIALS)[0];
  const sites = (site) => problems({ van: { title: 'Fixture Van', forward: '+z', sites: [body, site] } });
  assert.equal(sites({ id: 'door', part: 'fixture_door', at: [0, 0, 0], finish: paint }), '');
  assert.match(sites({ id: 'door', part: 'fixture_door', at: [0, 0, 0], finish: 'fixture-unknown' }), /not in the finish library/);
  assert.match(sites({ id: 'engine', part: 'fixture_engine', at: [0, 0, 0], finish: paint }), /no paintable slot/);
});

// A copied part would drift from its source unseen; an undeclared reference would load without its pack.
test('a part from another pack needs a declared dependency of the vehicle\'s pack', () => {
  assert.match(problems({ ambulance }, {}), /ambulance\/body: fixture_van_body is in fixture.vans, which fixture.rescue does not declare/);
});

test('a vehicle\'s extra tags are held to the vocabulary', () => {
  assert.match(problems({ ambulance: { ...ambulance, tags: { 'vehicle-role': ['ambulance'] } } }), /vehicle-role ambulance is not in/);
});

test('a vehicle ships in the pack of its own rows, with its body\'s tags and its own', () => {
  const out = mkdtempSync(join(tmpdir(), 'placements-'));
  try {
    const extra = { ...ambulance, tags: { ...ambulance.tags, 'vehicle-body': ['van'] } };
    const placed = exportPlacements({ placements: { ambulance: extra }, models, vehicleRows, dependsOn, vocabulary, out });
    assert.deepEqual(placed.vehicles, [{
      id: 'ambulance',
      title: 'Fixture Ambulance',
      pack: 'fixture.rescue',
      path: 'vehicles/ambulance.placements.json',
      tags: { 'vehicle-body': ['van'], 'vehicle-role': ['emergency'] },
    }]);
    assert.deepEqual(JSON.parse(readFileSync(join(out, placed.files[0]), 'utf8')), { sites: ambulance.sites });
    const manifest = buildManifest({ models: [], vehicles: placed.vehicles, files: placed.files, credit: () => ({}) });
    assert.deepEqual(manifest.vehicles.map(({ id, title, pack, path, tags }) => ({ id, title, pack, path, tags })), placed.vehicles);
    assert.throws(() => buildManifest({ models: [], vehicles: placed.vehicles, files: [], credit: () => ({}) }), /ambulance/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

// A variant shares its parent's build: laid out from the parent's sites, it ships where the parent's rows do and carries
// the parent's tags, and a parent that is missing would leave it nowhere to ship.
test('a variant is laid out from its parent\'s sites, in its parent\'s pack, with its parent\'s tags and its own', () => {
  const placements = JSON.parse(compileJsonnetFile(join(import.meta.dirname, 'fixtures/variants.jsonnet'), join(import.meta.dirname, '../..')));
  const van = { ...placements.van, tags: { 'vehicle-role': ['emergency'] } };
  const { electric_van: electricVan } = placements;
  assert.deepEqual(electricVan.sites.map(({ id }) => id), ['body', 'motor']);
  assert.match(problems(placements), /^orphan_van: unknown parent gone_van$/);
  assert.match(problems({ van, electric_van: { ...electricVan, parent: 'electric_van' } }), /parent electric_van is itself a variant/);
  assert.match(problems({ van, ambulance: { ...ambulance, parent: 'van' } }), /a variant's rows belong in its parent's file/);
  const out = mkdtempSync(join(tmpdir(), 'placements-'));
  try {
    const placed = exportPlacements({ placements: { van, electric_van: electricVan }, models, vehicleRows, dependsOn, vocabulary, out });
    assert.deepEqual(placed.vehicles.find(({ id }) => id === 'electric_van'), {
      id: 'electric_van',
      title: 'Fixture Electric Van',
      pack: 'fixture.vans',
      path: 'vehicles/electric_van.placements.json',
      tags: { 'vehicle-body': ['van'], 'vehicle-role': ['emergency', 'farm'] },
    });
    const shipped = JSON.parse(readFileSync(join(out, placed.files.find((file) => file.endsWith('electric_van.placements.json'))), 'utf8'));
    assert.deepEqual(shipped.sites.find(({ id }) => id === 'motor').at, [0, 0, 1], 'a site laid out ahead along x ships ahead along +z');
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

// An allowance that names a site the vehicle lacks, or gives no reason, would silence nothing or hide why.
test('an allowed overlap names two different sites of the vehicle and says why', () => {
  const allowing = (overlaps) => problems({ van: { title: 'Fixture Van', forward: '+z', sites: vanSites, overlaps } });
  assert.equal(allowing([{ sites: ['door_near', 'door_far'], why: 'the doors are seated in the body' }]), '');
  assert.match(allowing([{ sites: ['door_near', 'gone'], why: 'x' }]), /two different sites of the vehicle/);
  assert.match(allowing([{ sites: ['door_near', 'door_near'], why: 'x' }]), /two different sites of the vehicle/);
  assert.match(allowing([{ sites: ['door_near', 'door_far'] }]), /needs a why/);
  assert.match(allowing([{ sites: ['door_near', 'door_far'], why: 'x', note: 'y' }]), /unknown keys note/);
  assert.match(allowing('door_near'), /overlaps is not a list/);
});
