import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { foundContacts, sweepTasks, sweepVehicle, swingReport, swingResults } from '../swingClearance.mjs';

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

test('a thin lid swinging across a thin lip is reported, though no sampled pose of it holds a point of the lip', () => {
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

test('a rider with a motion of its own is swept on its carrier\'s clock and not against the carrier', () => {
  const tip = flap(1, { open: 90 });
  const shifted = { ...tip, pieces: [box('skin', [1, 0, -0.5], [2, GRAIN, 0.5]), pin('pin_a', 0.5), pin('pin_b', -0.5)] };
  shifted.pieces[1].origin[0] = 1;
  shifted.pieces[2].origin[0] = 1;
  const result = sweep({ lid, tip: shifted }, [lidSite(), site('tip', 'tip', shifted.pieces, { rides: 'lid' })]);
  assert.ok(result.sites.tip);
  assert.ok(![...contactsOf(result, 'tip'), ...contactsOf(result, 'lid')].some(({ other }) => other === 'tip' || other === 'lid'));
  assert.equal(result.open.length, 0);
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
