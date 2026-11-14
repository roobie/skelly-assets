import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { foundContacts, sweepVehicle, swingReport, swingResults } from '../swingClearance.mjs';
import { shapeOf, sweepBody } from '../swingSweep.mjs';

const GRAIN = 0.03125;
const box = (id, min, max) => ({ id, kind: 'box', slot: 'paint', min, max });
const pin = (id, z, y = 0) => ({ id, kind: 'turned', slot: 'paint', axis: 'z', origin: [0, y, z], profile: [[-GRAIN, 0], [-GRAIN, GRAIN], [GRAIN, GRAIN], [GRAIN, 0], [-GRAIN, 0]] });
// A flat flap hinged along its x = 0 edge, which opens up by `open` degrees. It reaches `length` along x.
const flap = (length, { open = 90, toward = 'up', y = 0 } = {}) => ({
  pieces: [box('skin', [0, y, -0.5], [length, y + GRAIN, 0.5]), pin('pin_a', 0.5, y), pin('pin_b', -0.5, y)],
  stages: [{ kind: 'hinge', pins: ['pin_a', 'pin_b'], open, toward }],
});
const site = (id, part, pieces, extra = {}) => ({ id, part, at: [0, 0, 0], mirror: false, pieces, ...extra });
const task = (motions, sites) => ({ grain: GRAIN, forward: '+x', motions, sites });
const lid = flap(1);
const lidSite = (extra) => site('lid', 'lid', lid.pieces, extra);
// The deepest reported contact of the pair, 0 when none.
const reached = (result, a, b) => Math.max(0, ...[...foundContacts(result).values()].filter(({ sites }) => sites.includes(a) && sites.includes(b)).map(({ depth }) => depth));
const sweep = (motions, sites) => sweepVehicle(task(motions, sites));
const contactsOf = (result, id) => result.sites[id].contacts;

test('a thin lid swinging across a thin lip is reported', () => {
  const lip = site('lip', 'lip', [box('edge', [0.5, 0.05, -0.5], [0.5 + GRAIN, 0.8, 0.5])]);
  const result = sweep({ lid }, [lidSite(), lip]);
  assert.ok(contactsOf(result, 'lid').some(({ other }) => other === 'lip'));
  assert.ok(result.sites.lid.clear < 1);
});

test('a lid that swings through empty air clears all the way', () => {
  const result = sweep({ lid }, [lidSite(), site('far', 'far', [box('block', [5, 0, -0.5], [6, 1, 0.5])])]);
  assert.equal(result.sites.lid.clear, 1);
  assert.deepEqual(contactsOf(result, 'lid'), []);
});

test('a plate that slides through a plate as thin as itself is reported, wherever the two sit along its way', () => {
  for (const offset of [0, 0.25, 0.5, 0.75]) {
    const x = (1 + offset) * GRAIN;
    const plate = (id, from) => shapeOf(box(id, [from, 0, 0], [from + GRAIN, 0.2, 0.2]));
    const layers = [[{ kind: 'slide', direction: [1, 0, 0], travel: 0.2, share: 1 }]];
    const { contacts } = sweepBody({ layers, movers: [{ site: 'plate', shape: plate('a', 0) }], obstacles: [{ site: 'other', shape: plate('b', x) }], step: GRAIN / 4, tolerance: GRAIN / 4 });
    assert.ok(contacts.has('other'), `offset ${offset}`);
  }
});

test('a plate that a faster part carries through a nearly still one is reported, whichever of the two moves most', () => {
  const plate = (id, from) => shapeOf(box(id, [from, 0, 0], [from + GRAIN, 0.2, 0.2]));
  const slide = (direction, travel) => [{ kind: 'slide', direction, travel, share: 1 }];
  const [still, fast] = [slide([1, 0, 0], 0.01), slide([-1, 0, 0], 0.3)];
  const { contacts } = sweepBody({ layers: [still], movers: [{ site: 'plate', shape: plate('a', 0) }], obstacles: [{ site: 'other', shape: plate('b', 0.2), layers: [fast] }], step: GRAIN / 4, tolerance: GRAIN / 4 });
  assert.ok(contacts.has('other'));
});

test('the ground stops a lid that opens downward into it', () => {
  const down = flap(1, { toward: 'down', y: 0.2 });
  const result = sweep({ lid: down }, [site('lid', 'lid', down.pieces)]);
  assert.ok(contactsOf(result, 'lid').some(({ other }) => other === 'ground'));
});

test('an overlap that exists at rest is no contact until the swing sinks deeper than the fit allows', () => {
  const thick = { ...lid, pieces: [box('skin', [0, 0, -0.5], [1, 4 * GRAIN, 0.5]), ...lid.pieces.slice(1)] };
  const shallow = site('seat', 'seat', [box('step', [0.4, -0.2, -0.5], [0.6, GRAIN / 2, 0.5])]);
  const deep = site('seat', 'seat', [box('step', [0.4, 3.5 * GRAIN, -0.5], [0.6, 0.6, 0.5])]);
  const lidAt = site('lid', 'lid', thick.pieces);
  assert.deepEqual(contactsOf(sweep({ lid: thick }, [lidAt, shallow]), 'lid'), []);
  assert.ok(contactsOf(sweep({ lid: thick }, [lidAt, deep]), 'lid').some(({ other }) => other === 'seat'));
});

test('a rider is not tested against its carrier, though it stands in the carrier\'s way at rest', () => {
  const thick = { ...lid, pieces: [box('skin', [0, 0, -0.5], [1, 4 * GRAIN, 0.5]), ...lid.pieces.slice(1)] };
  const post = box('post', [0.4, 3.5 * GRAIN, -0.1], [0.6, 0.6, 0.1]);
  const asRider = sweep({ lid: thick }, [site('lid', 'lid', thick.pieces), site('handle', 'handle', [post], { rides: 'lid' })]);
  assert.deepEqual(contactsOf(asRider, 'lid'), []);
  assert.equal(asRider.sites.handle, undefined);
  const asPart = sweep({ lid: thick }, [site('lid', 'lid', thick.pieces), site('handle', 'handle', [post])]);
  assert.ok(contactsOf(asPart, 'lid').some(({ other }) => other === 'handle'));
});

test('a rider is carried with its carrier and meets what the carrier alone never would', () => {
  const rider = site('handle', 'handle', [box('grip', [0.4, 0, 0.5], [0.6, GRAIN, 0.7])], { rides: 'lid' });
  const wall = site('wall', 'wall', [box('slab', [0.45, 0.1, 0.55], [0.55, 0.5, 0.65])]);
  assert.equal(sweep({ lid }, [lidSite(), wall]).sites.lid.clear, 1);
  const carried = sweep({ lid }, [lidSite(), rider, wall]);
  assert.ok(carried.sites.lid.clear < 1);
  assert.ok(contactsOf(carried, 'lid').some(({ other }) => other === 'wall'));
});

// A piece hinged on the line through `hinge` (x, y) along z, turning `toward` by `open` degrees.
const hinged = (skin, [x, y], { toward = 'up', open = 90 } = {}) => ({
  pieces: [skin, { ...pin('pin_a', 0.5, y), origin: [x, y, 0.5] }, { ...pin('pin_b', -0.5, y), origin: [x, y, -0.5] }],
  stages: [{ kind: 'hinge', pins: ['pin_a', 'pin_b'], open, toward }],
});
// A flap one grain thick lying along x from its hinge at x0, `length` long (negative to lie back along -x), on the hinge
// line at height y0.
const fold = (x0, length, { y0 = 0, open = 90 } = {}) =>
  hinged(box('skin', [Math.min(x0, x0 + length), y0, -0.5], [Math.max(x0, x0 + length), y0 + GRAIN, 0.5]), [x0, y0], { open });
const riderOf = (id, motion, carrier = 'lid') => site(id, id, motion.pieces, { rides: carrier });

test('a rider that moves is swept on its carrier\'s clock, nested in the carrier\'s motion', () => {
  const tip = fold(1.1, 1);
  const post = site('post', 'post', [box('post', [-0.6, 1, -0.2], [-0.5, 1.2, 0.2])]);
  const result = sweep({ lid, tip }, [lidSite(), riderOf('tip', tip), post]);
  assert.ok(contactsOf(result, 'tip').some(({ other }) => other === 'post'));
});

test('a rider that moves is swept against its carrier, which it folds onto', () => {
  const panel = fold(1.1, 1, { y0: GRAIN, open: 180 });
  const result = sweep({ lid, panel }, [lidSite(), riderOf('panel', panel)]);
  assert.ok(contactsOf(result, 'panel').some(({ other }) => other === 'lid'));
  assert.deepEqual(contactsOf(result, 'lid'), []);
});

test('a rider that moves does not meet its carrier at the rest pose it has left', () => {
  const cap = fold(0.3, -0.2, { y0: GRAIN, open: 10 });
  const result = sweep({ lid, cap }, [lidSite(), riderOf('cap', cap)]);
  assert.deepEqual([...contactsOf(result, 'lid'), ...contactsOf(result, 'cap')], []);
  assert.equal(result.sites.lid.clear, 1);
});

test('riders of one carrier are swept against each other as they move together, not against each other\'s rest', () => {
  // The carrier only tilts. Both riders turn about one line, one lying along x and one standing along y, so each is where
  // the other started.
  const tilting = flap(1, { open: 5 });
  const flat = fold(0.2, 0.5, { y0: 4 * GRAIN });
  const standing = hinged(box('skin', [0.2 - GRAIN, 4 * GRAIN, -0.5], [0.2, 4 * GRAIN + 0.5, 0.5]), [0.2, 4 * GRAIN], { toward: 'rear' });
  const together = sweep({ lid: tilting, flat, standing }, [lidSite(), riderOf('flat', flat), riderOf('standing', standing)]);
  assert.deepEqual([...contactsOf(together, 'flat'), ...contactsOf(together, 'standing')], []);
  const crossing = fold(0.8, -0.5, { y0: 8 * GRAIN });
  const crossed = sweep({ lid: tilting, flat, crossing }, [lidSite(), riderOf('flat', flat), riderOf('crossing', crossing)]);
  assert.ok(reached(crossed, 'flat', 'crossing') > 0);
});

test('two lids that clear alone but collide once both are open are caught by the all-open pose', () => {
  const low = flap(1, { open: 20 });
  const high = { ...flap(1, { open: 18, toward: 'down' }), pieces: [box('skin', [0.2, 0.4, -0.5], [1.2, 0.4 + GRAIN, 0.5]), pin('pin_a', 0.5, 0.4), pin('pin_b', -0.5, 0.4)] };
  high.pieces[1].origin[0] = 1.2;
  high.pieces[2].origin[0] = 1.2;
  const sites = [site('low', 'low', low.pieces), site('high', 'high', high.pieces)];
  const result = sweep({ low, high }, sites);
  assert.deepEqual(contactsOf(result, 'low'), []);
  assert.deepEqual(contactsOf(result, 'high'), []);
  const [meeting] = foundContacts(result).values();
  assert.deepEqual([...meeting.sites].sort(), ['high', 'low']);
  assert.equal(meeting.sweep, false);
  assert.ok(meeting.depth > 0);
});

const lip = site('lip', 'lip', [box('edge', [0.5, 0.05, -0.5], [0.5 + GRAIN, 0.8, 0.5])]);
const data = (overrides = {}) => ({
  grain: GRAIN,
  motions: { lid },
  vehicles: { van: { parent: null, forward: '+x', sites: [lidSite(), lip], swingContacts: [], swingUnjudged: [], ...overrides } },
});
const entry = (depth, sites = ['lid', 'lip']) => ({ sites, depth, why: 'seated', note: 'by design' });
const report = async (vehicle, options = {}) => {
  const input = data(vehicle);
  return swingReport(input, (await swingResults(input, { workers: 1, ...options })).results);
};
const measured = async () => reached((await swingResults(data(), { workers: 1 })).results.van, 'lid', 'lip');

test('a swing into another part is reported with the vehicle, the parts and how far the lid got', async () => {
  const { problems } = await report({});
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^van: lid at lid swings into lip at lip from /);
});

test('an entry covers the pair to its depth, and a swingUnjudged one is said again on every run', async () => {
  const depth = await measured();
  const judged = await report({ swingContacts: [entry(depth)] });
  assert.deepEqual([judged.problems, judged.notes], [[], []]);
  const unjudged = await report({ swingUnjudged: [entry(depth)] });
  assert.deepEqual(unjudged.problems, []);
  assert.equal(unjudged.notes.length, 1);
});

test('an entry is a depth cap: a swing deeper than it was written for is reported with the cap', async () => {
  const { problems } = await report({ swingContacts: [entry((await measured()) / 2)] });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /more than the \d+ mm allowed/);
});

test('a stale entry fails: one for a pair that no longer touches is reported', async () => {
  const clear = site('lip', 'lip', [box('edge', [5, 0.05, -0.5], [5 + GRAIN, 0.8, 0.5])]);
  const { problems } = await report({ sites: [lidSite(), clear], swingContacts: [entry(0.01)] });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /is stale/);
});

test('a vehicle where nothing moves any more still fails its allowances and its riders', async () => {
  const still = site('lid', 'lid', [box('skin', [0, 0, -0.5], [1, GRAIN, 0.5])]);
  const rider = site('handle', 'handle', [box('grip', [0.4, 0, 0.5], [0.6, GRAIN, 0.7])], { rides: 'lid' });
  const input = data({ sites: [still, rider, lip], swingContacts: [entry(0.01)] });
  input.motions = {};
  const { problems } = swingReport(input, (await swingResults(input, { workers: 1 })).results);
  assert.match(problems.join('\n'), /allowed swing contact of lid and lip is stale/);
  assert.match(problems.join('\n'), /handle rides lid, and neither is a part that moves/);
});

test('an entry capped far above what it measures, or listed twice, is reported', async () => {
  const depth = await measured();
  const far = await report({ swingContacts: [entry(depth + 3 * GRAIN)] });
  assert.match(far.problems.join('\n'), /far above/);
  const twice = await report({ swingContacts: [entry(depth), entry(depth, ['lip', 'lid'])] });
  assert.match(twice.problems.join('\n'), /listed twice/);
});

test('a variant allows its parent\'s entries, and listing one again is reported', async () => {
  const depth = await measured();
  const input = data({ swingContacts: [entry(depth)] });
  input.vehicles.van_electric = { ...input.vehicles.van, parent: 'van', swingContacts: [] };
  const { problems } = swingReport(input, (await swingResults(input, { workers: 1 })).results);
  assert.deepEqual(problems, []);
  input.vehicles.van_electric.swingContacts = [entry(depth)];
  assert.match(swingReport(input, (await swingResults(input, { workers: 1 })).results).problems.join('\n'), /listed twice/);
});

test('each moving site is exported with the part of its way it opens clear', async () => {
  const { exports } = await report({});
  assert.ok(exports.van.lid.clear > 0 && exports.van.lid.clear < 1);
  assert.equal(exports.van.lid.stop, 'lip');
});

test('a vehicle swept once is read from the cache, and a changed input sweeps it again', async () => {
  const cache = mkdtempSync(join(tmpdir(), 'swing-cache-'));
  try {
    assert.equal((await swingResults(data(), { cache, workers: 1 })).swept, 1);
    assert.equal((await swingResults(data(), { cache, workers: 1 })).swept, 0);
    const moved = data({ sites: [lidSite(), site('lip', 'lip', [box('edge', [0.6, 0.05, -0.5], [0.6 + GRAIN, 0.8, 0.5])])] });
    assert.equal((await swingResults(moved, { cache, workers: 1 })).swept, 1);
  } finally {
    rmSync(cache, { recursive: true });
  }
});

test('a cached sweep made by other checker code is not reused', async () => {
  const cache = mkdtempSync(join(tmpdir(), 'swing-cache-'));
  try {
    await swingResults(data(), { cache, workers: 1, checker: 'before' });
    assert.equal((await swingResults(data(), { cache, workers: 1, checker: 'before' })).swept, 0);
    assert.equal((await swingResults(data(), { cache, workers: 1, checker: 'after' })).swept, 1);
  } finally {
    rmSync(cache, { recursive: true });
  }
});

test('an allowance change takes effect on a cached sweep, because the allowances are applied on every run', async () => {
  const cache = mkdtempSync(join(tmpdir(), 'swing-cache-'));
  try {
    const depth = await measured();
    await swingResults(data(), { cache, workers: 1 });
    const input = data({ swingContacts: [entry(depth)] });
    const results = await swingResults(input, { cache, workers: 1 });
    assert.equal(results.swept, 0);
    assert.deepEqual(swingReport(input, results.results).problems, []);
  } finally {
    rmSync(cache, { recursive: true });
  }
});

test('a shard sweeps only its share of the vehicles', async () => {
  const input = data();
  input.vehicles.van_b = { ...input.vehicles.van, sites: [lidSite(), site('lip', 'lip', [box('edge', [0.6, 0.05, -0.5], [0.6 + GRAIN, 0.8, 0.5])])] };
  const first = await swingResults(input, { workers: 1, shard: { index: 1, count: 2 } });
  const second = await swingResults(input, { workers: 1, shard: { index: 2, count: 2 } });
  assert.deepEqual([first.swept, second.swept], [1, 1]);
  assert.deepEqual(Object.keys(first.results).concat(Object.keys(second.results)).sort(), ['van', 'van_b']);
});
