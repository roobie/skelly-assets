import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitDepth, overlapReport, roleOf, seatingProblems, siteOverlaps } from '../siteOverlap.mjs';

const GRAIN = 0.03125;
const box = (id, min, max) => ({ id, kind: 'box', slot: 'paint', min, max });
const site = (id, part, ...pieces) => ({ id, part, pieces });
const vehicle = (sites, { overlaps = [], unjudged = [], parent = null } = {}) => ({ parent, sites, overlaps, unjudged });
const fit = (seated, into, depth = 1) => ({ why: 'seated', depth, seated, into });
const report = (vehicles, fits = [], roles = []) => overlapReport({ grain: GRAIN, fits, roles, vehicles });
const unit = box('block', [0, 0, 0], [1, 1, 1]);
const shifted = (by) => box('block', [by, 0, 0], [1 + by, 1, 1]);
const bodyAndLamp = [site('body', 'van_body', unit), site('lamp', 'van_lamp', shifted(0.5))];
const allowance = (depth = 1, sites = ['body', 'lamp']) => ({ sites, depth, why: 'seated' });

test('parts at different sites sharing more than a grain of depth are reported with the vehicle, parts and sites', () => {
  const { problems, notes } = report({ van: vehicle(bodyAndLamp) });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^van: van_body at body overlaps van_lamp at lamp\b/);
  assert.deepEqual(notes, []);
});

test('faces that touch, or sink less than a grain into each other, are contact and not an overlap', () => {
  for (const by of [1, 1 - GRAIN / 2]) {
    const sites = [site('body', 'van_body', unit), site('lamp', 'van_lamp', shifted(by))];
    assert.deepEqual(report({ van: vehicle(sites) }).problems, [], `shifted by ${by}`);
  }
});

test('pieces of one site may overlap each other', () => {
  assert.deepEqual(report({ van: vehicle([site('body', 'van_body', unit, shifted(0.5))]) }).problems, []);
});

test('two sites with several piece pairs overlapping report the deepest pair, however the pieces sort', () => {
  const shallow = box('shallow', [0, 0, 0], [1, 1, 1]);
  const deep = box('deep', [0.5, 0, 0], [1.5, 1, 1]);
  const other = box('other', [0.9, 0, 0], [1.9, 1, 1]);
  const [overlap, ...rest] = siteOverlaps([site('a', 'pa', shallow, deep), site('b', 'pb', other)], GRAIN);
  assert.deepEqual(rest, []);
  assert.deepEqual(overlap.pieces, ['deep', 'other']);
});

test('an allowance is silent whichever way round its sites are named, and covers only the pair it names', () => {
  for (const sites of [['body', 'lamp'], ['lamp', 'body']]) {
    assert.deepEqual(report({ van: vehicle(bodyAndLamp, { overlaps: [allowance(1, sites)] }) }).problems, []);
  }
  const withMirror = [...bodyAndLamp, site('mirror', 'van_mirror', shifted(-0.5))];
  const { problems } = report({ van: vehicle(withMirror, { overlaps: [allowance()] }) });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /van_mirror at mirror/);
});

test('an allowance is a depth cap: an overlap deeper than it was written for is reported with the cap', () => {
  const { problems } = report({ van: vehicle(bodyAndLamp, { overlaps: [allowance(0.25)] }) });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /more than the 250 mm allowed/);
});

test('a variant allows its parent\'s entries as well as its own, and listing one again is reported', () => {
  const parent = vehicle(bodyAndLamp, { overlaps: [allowance()] });
  assert.deepEqual(report({ van: parent, electric_van: vehicle(bodyAndLamp, { parent: 'van' }) }).problems, []);
  assert.equal(report({ van: vehicle(bodyAndLamp), electric_van: vehicle(bodyAndLamp, { parent: 'van' }) }).problems.length, 2);
  const again = report({ van: parent, electric_van: vehicle(bodyAndLamp, { parent: 'van', overlaps: [allowance()] }) });
  assert.match(again.problems.join('\n'), /electric_van: allowed overlap of body and lamp is listed twice/);
});

test('an entry whose pair no longer overlaps, or that the seating already covers, or that repeats, is reported stale', () => {
  const apart = [site('body', 'van_body', unit), site('lamp', 'van_lamp', shifted(1))];
  assert.match(report({ van: vehicle(apart, { overlaps: [allowance()] }) }).problems.join(), /stale: the parts no longer overlap/);
  const fits = [fit(['lamp'], ['body'])];
  const covered = report({ van: vehicle(bodyAndLamp, { overlaps: [allowance()] }) }, fits, ['body', 'lamp']);
  assert.match(covered.problems.join(), /stale: the seating already covers it/);
  const twice = report({ van: vehicle(bodyAndLamp, { overlaps: [allowance(), allowance(1, ['lamp', 'body'])] }) });
  assert.match(twice.problems.join(), /is listed twice/);
});

test('an unjudged overlap does not fail but is noted with its parts, depth and note every run', () => {
  const entry = { sites: ['body', 'lamp'], depth: 1, note: 'nobody has looked at this' };
  const { problems, notes } = report({ van: vehicle(bodyAndLamp, { unjudged: [entry] }) });
  assert.deepEqual(problems, []);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /^van: van_body at body and van_lamp at lamp overlap by \d+ mm and are not judged: nobody has looked at this$/);
});

test('an unjudged entry is capped and goes stale like an allowance', () => {
  const entry = (depth) => ({ sites: ['body', 'lamp'], depth, note: 'n' });
  assert.match(report({ van: vehicle(bodyAndLamp, { unjudged: [entry(0.25)] }) }).problems.join(), /more than the 250 mm allowed/);
  const apart = [site('body', 'van_body', unit), site('lamp', 'van_lamp', shifted(1))];
  assert.match(report({ van: vehicle(apart, { unjudged: [entry(1)] }) }).problems.join(), /stale/);
});

const lamps = [site('body', 'van_body', unit), site('lamp_near', 'van_lamp', shifted(0.5))];

test('a fit allows its roles to sink into each other up to its depth in either orientation, in every vehicle', () => {
  const roles = ['body', 'lamp_near'];
  const deep = [fit(['lamp'], ['body'], 0.5 + GRAIN / 2)];
  assert.deepEqual(report({ van: vehicle(lamps), truck: vehicle(lamps) }, deep, roles).problems, []);
  assert.deepEqual(report({ van: vehicle([...lamps].reverse()) }, deep, roles).problems, []);
  assert.equal(report({ van: vehicle(lamps) }, [fit(['lamp'], ['body'], 0.25)], roles).problems.length, 1);
});

test('a fit is a pair of role sets: roles on the same side do not seat into each other', () => {
  const roles = ['body', 'lamp_near', 'trim'];
  const sites = [...lamps, site('trim', 'van_trim', shifted(0.5))];
  const { problems } = report({ van: vehicle(sites) }, [fit(['lamp'], ['body'])], roles);
  assert.equal(problems.length, 2);
  assert.ok(problems.every((problem) => /trim/.test(problem)));
});

test('a fit names whole roles: a prefix or a pattern of a role seats nothing', () => {
  assert.equal(fitDepth([fit(['lam'], ['body'])], 'lamp', 'body'), 0);
  assert.equal(fitDepth([fit(['la*'], ['body'])], 'lamp', 'body'), 0);
  assert.equal(fitDepth([fit(['lamp'], ['body'])], 'lamp_extra', 'body'), 0);
  assert.equal(fitDepth([fit(['lamp'], ['body'], 0.4)], 'body', 'lamp'), 0.4);
});

test('a role is a site id without its side and number segments, and a word that only contains a side is kept', () => {
  assert.equal(roleOf('wheel_front_near'), 'wheel_front');
  assert.equal(roleOf('headlamp_3_far'), 'headlamp');
  assert.equal(roleOf('near_side'), 'near_side');
  assert.equal(roleOf('nearside'), 'nearside');
});

test('the seating is reported when a fit is malformed, names a role no site has, or covers a pair another fit covers', () => {
  const roles = ['body', 'lamp_near', 'wheel'];
  assert.deepEqual(seatingProblems([fit(['lamp'], ['body'])], roles), []);
  const wrong = (bad, pattern) => assert.match(seatingProblems([bad], roles).join(), pattern);
  wrong({ why: 'x', depth: 1, seated: ['lamp'] }, /has keys/);
  wrong({ ...fit(['lamp'], ['body']), depth: 0 }, /needs a depth above 0/);
  wrong({ ...fit(['lamp'], ['body']), why: '' }, /needs a why/);
  wrong(fit([], ['body']), /seated needs at least one role/);
  wrong(fit(['lamp'], ['bodyy']), /role bodyy is the role of no site/);
  const clash = seatingProblems([fit(['lamp'], ['body']), fit(['body', 'wheel'], ['lamp'])], roles);
  assert.match(clash.join(), /body and lamp is also covered by fit 1/);
});
