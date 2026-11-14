import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { placementProblems } from '../placements.mjs';
import { farSlot, loadOutStowage, seatedBounds, slotProblems, slotRowProblems, stowedPose } from '../stowage.mjs';

const GRAIN = 0.02;
// A shelf slot: its normal up out of the shelf, its up along the vehicle, so its envelope's y runs along the vehicle.
const shelfSlot = (id, x, envelope = { min: [0, -0.2, -0.15], max: [0.4, 0.2, 0.15] }) => ({
  id,
  accepts: ['can'],
  envelope,
  frame: { position: [x, 1, 0.5], normal: [0, 1, 0], up: [1, 0, 0] },
});
const shelf = { id: 'shelf', kind: 'box', min: [-0.5, 0.97, 0.3], max: [1, 1, 0.7] };
const locker = (slots, pieces = [shelf]) => slotProblems({ id: 'fixture_locker', slots, pieces }, GRAIN).join('\n');

test('slots that hold their kit apart and clear of the fit-out are sound, touching included', () => {
  assert.equal(locker([shelfSlot('left', 0), shelfSlot('right', 0.4)]), '');
});

// Kit stowed in the one would stand in the other's, or in the shelf, and only a game spawning both would show it.
test('a slot whose envelope reaches into another or into the fit-out at all is a problem', () => {
  assert.match(locker([shelfSlot('left', 0), shelfSlot('right', 0.395)]), /envelopes of left and right overlap/);
  const sunk = shelfSlot('left', 0, { min: [-0.005, -0.2, -0.15], max: [0.4, 0.2, 0.15] });
  assert.match(locker([sunk]), /left: its envelope reaches \d+ mm into shelf/);
});

// Its slots are checked against one part's fit-out, which a row of several parts has not.
test('a row of several parts with stowage slots is a problem', () => {
  assert.match(slotRowProblems({ id: 'fixture_locker', partCount: 2, ports: [], pieces: [] }, GRAIN).join('\n'), /built of 2 parts, not one/);
});

// The far twin's kit stands turned, not reflected, so only an envelope centred along the vehicle comes out reflected.
test('a slot whose envelope is not centred on it along the vehicle is a problem', () => {
  assert.match(locker([shelfSlot('left', 0, { min: [0, -0.1, -0.15], max: [0.4, 0.3, 0.15] })]), /not centred on it along the vehicle/);
});

// The item model is rigid; posing it must put each corner where the fit check measured it.
test('an item posed by its seat fills the box the fit check measures', () => {
  const slot = farSlot(shelfSlot('left', 0.2).frame, 2);
  const seat = { position: [0.05, 0, 0.02], normal: [0, -1, 0], up: [0, 0, 1] };
  const bounds = { min: [-0.1, 0, -0.08], max: [0.3, 0.3, 0.2] };
  const { rotation, at } = stowedPose(slot, seat);
  const posed = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const p = [0, 1, 2].map((a) => ((i >> a) & 1 ? bounds.max[a] : bounds.min[a]));
    return [0, 1, 2].map((row) => at[row] + [0, 1, 2].reduce((sum, col) => sum + rotation[row * 3 + col] * p[col], 0));
  });
  const filled = seatedBounds(seat, bounds);
  const axes = [slot.normal, slot.up, [slot.normal[1] * slot.up[2] - slot.normal[2] * slot.up[1], slot.normal[2] * slot.up[0] - slot.normal[0] * slot.up[2], slot.normal[0] * slot.up[1] - slot.normal[1] * slot.up[0]]];
  const inSlot = posed.map((p) => axes.map((axis) => axis.reduce((sum, v, a) => sum + v * (p[a] - slot.position[a]), 0)));
  for (const a of [0, 1, 2]) {
    assert.ok(Math.abs(Math.min(...inSlot.map((p) => p[a])) - filled.min[a]) < 1e-9);
    assert.ok(Math.abs(Math.max(...inSlot.map((p) => p[a])) - filled.max[a]) < 1e-9);
  }
});

// ---- load-outs ----

const vocabulary = { categories: new Map(), facets: new Map() };
const models = [
  { id: 'fixture_body', pack: 'fixture.vans' },
  { id: 'fixture_locker', pack: 'fixture.vans' },
  { id: 'fixture_shutter', pack: 'fixture.vans' },
  { id: 'fixture_can', pack: 'fixture.kit' },
  { id: 'fixture_flush_can', pack: 'fixture.kit' },
  { id: 'fixture_tall_can', pack: 'fixture.kit' },
  { id: 'fixture_crate', pack: 'fixture.kit' },
  { id: 'fixture_loose', pack: 'fixture.loose' },
];
const vehicleRows = { van: ['fixture_body', 'fixture_locker', 'fixture_shutter'] };
const dependsOn = { 'fixture.vans': ['fixture.kit'] };
// Items stand on their base, the seat's normal down out of it.
const seat = (standard) => ({ standard, frame: { position: [0, 0, 0], normal: [0, -1, 0], up: [1, 0, 0] } });
const item = (standard, height) => ({ slots: [], seats: [seat(standard)], bounds: { min: [-0.1, 0, -0.1], max: [0.1, height, 0.1] } });
const stowage = {
  items: new Map([
    ['fixture_locker', { slots: [shelfSlot('left', 0)], seats: [], bounds: { min: [-1, 0, 0], max: [1, 2, 1] } }],
    ['fixture_can', item('can', 0.3)],
    ['fixture_flush_can', item('can', 0.4)],
    ['fixture_tall_can', item('can', 0.402)],
    ['fixture_crate', item('crate', 0.3)],
    ['fixture_loose', item('can', 0.3)],
  ]),
  moving: new Set(['fixture_shutter']),
};
const van = (site) => ({
  van: { title: 'Fixture Van', forward: '+z', sites: [{ id: 'body', part: 'fixture_body', at: [0, 0, 0] }, { id: 'door', part: 'fixture_shutter', at: [0, 0, 0] }, { id: 'locker', part: 'fixture_locker', at: [0, 0, 0], ...site }] },
});
const loaded = (site) => placementProblems({ placements: van(site), models, vehicleRows, dependsOn, vocabulary, stowage }).join('\n');

test('a load-out of built items that a slot accepts and holds stows without problems, flush included', () => {
  assert.equal(loaded({ stowed: { left: 'fixture_can' }, behind: 'door' }), '');
  assert.equal(loaded({ stowed: { left: 'fixture_flush_can' } }), '');
});

// Each would spawn kit nowhere, through the locker, or from a pack a game may not have loaded.
test('a load-out that cannot be stowed is a problem', () => {
  assert.match(loaded({ stowed: { right: 'fixture_can' } }), /fixture_locker has no stowage slot right/);
  assert.match(loaded({ stowed: { left: 'fixture_crate' } }), /stows as crate, which the slot does not accept/);
  assert.match(loaded({ stowed: { left: 'fixture_tall_can' } }), /does not fit the slot's envelope along its x/);
  assert.match(loaded({ stowed: { left: 'fixture_loose' } }), /locker stowed: fixture_loose is in fixture.loose/);
  assert.match(loaded({ stowed: { left: 'fixture_gone' } }), /fixture_gone is not a built model/);
  assert.match(loaded({ stowed: ['fixture_can'] }), /stowed is not slot -> item/);
});

// A slot read from a model without its fields would leave nothing to check the item against.
test('a load-out into a slot without accepts or envelope is a problem', () => {
  const bare = { ...stowage, items: new Map([...stowage.items, ['fixture_locker', { slots: [{ id: 'left', frame: shelfSlot('left', 0).frame }], seats: [], bounds: { min: [-1, 0, 0], max: [1, 2, 1] } }]]) };
  const problems = placementProblems({ placements: van({ stowed: { left: 'fixture_can' } }), models, vehicleRows, dependsOn, vocabulary, stowage: bare }).join('\n');
  assert.match(problems, /the slot has no accepts or envelope/);
});

// A consumer skips drawing kit behind its closure until the closure opens, so a closure that is not a site, or cannot
// open, would hide the kit for good.
test('behind names another site of the vehicle that opens', () => {
  assert.match(loaded({ behind: 'hatch' }), /behind names another site of the vehicle, not hatch/);
  assert.match(loaded({ behind: 'locker' }), /behind names another site/);
  assert.match(loaded({ behind: 'body' }), /behind names body, whose part has no motion to open it/);
});

// A closure moves when its built sidecar gives it a motion; kit behind one that does not would be hidden for good.
test('the closures that open are those whose built model has a motion', () => {
  const out = mkdtempSync(join(tmpdir(), 'stowage-'));
  try {
    const sidecar = (id, motion) => {
      mkdirSync(join(out, 'fixture.vans', 'things'), { recursive: true });
      writeFileSync(join(out, 'fixture.vans', 'things', `${id}.model.json`), JSON.stringify({ motion }));
    };
    sidecar('fixture_shutter', [{ kind: 'slide', direction: [0, 1, 0], travel: 1, stow: 0, share: 1 }]);
    sidecar('fixture_body', []);
    const placements = { van: { sites: [
      { id: 'body', part: 'fixture_body' },
      { id: 'door', part: 'fixture_shutter' },
      { id: 'locker', part: 'fixture_locker', behind: 'door' },
      { id: 'boot', part: 'fixture_locker', behind: 'body' },
    ] } };
    assert.deepEqual([...loadOutStowage(out, models, placements).moving], ['fixture_shutter']);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
