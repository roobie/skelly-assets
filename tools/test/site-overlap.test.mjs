import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitDepth, overlapReport, roleOf, seatingProblems, siteOverlaps } from '../siteOverlap.mjs';

const GRAIN = 0.03125;
const box = (id, min, max) => ({ id, kind: 'box', slot: 'paint', min, max });
const site = (id, part, ...pieces) => ({ id, part, pieces });
const vehicle = (sites, { overlaps = [], unjudged = [], parent = null } = {}) =>
  ({ parent, sites, overlaps, unjudged });
const fit = (...pairs) => ({ why: 'seated', pairs });
const report = (vehicles, fits = [], roles = []) => overlapReport({ grain: GRAIN, fits, roles, vehicles });
const unit = box('block', [0, 0, 0], [1, 1, 1]);
const shifted = (by) => box('block', [by, 0, 0], [1 + by, 1, 1]);
const bodyAndLamp = [site('body', 'van_body', unit), site('lamp', 'van_lamp', shifted(0.5))];
const allowance = (depth = 0.5 + GRAIN, sites = ['body', 'lamp']) => ({ sites, depth, why: 'seated' });

test('parts at different sites sharing over a grain of depth are reported with the vehicle, parts and sites', () => {
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
    assert.deepEqual(report({ van: vehicle(bodyAndLamp, { overlaps: [allowance(undefined, sites)] }) }).problems, []);
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
  const bare = report({ van: vehicle(bodyAndLamp), electric_van: vehicle(bodyAndLamp, { parent: 'van' }) });
  assert.equal(bare.problems.length, 2);
  const again = report({ van: parent, electric_van: vehicle(bodyAndLamp, { parent: 'van', overlaps: [allowance()] }) });
  assert.match(again.problems.join('\n'), /electric_van: allowed overlap of body and lamp is listed twice/);
});

test('an entry whose pair no longer overlaps, that a pair already covers, or that repeats, is reported stale', () => {
  const apart = [site('body', 'van_body', unit), site('lamp', 'van_lamp', shifted(1))];
  const gone = report({ van: vehicle(apart, { overlaps: [allowance()] }) });
  assert.match(gone.problems.join(), /stale: the parts no longer overlap/);
  const fits = [fit(['lamp', 'body', 0.5 + GRAIN])];
  const covered = report({ van: vehicle(bodyAndLamp, { overlaps: [allowance()] }) }, fits, ['body', 'lamp']);
  assert.match(covered.problems.join(), /stale: the seating already covers it/);
  const repeated = [allowance(), allowance(undefined, ['lamp', 'body'])];
  const twice = report({ van: vehicle(bodyAndLamp, { overlaps: repeated }) });
  assert.match(twice.problems.join(), /is listed twice/);
});

test('an unjudged overlap does not fail but is noted with its parts, depth and note every run', () => {
  const entry = { sites: ['body', 'lamp'], depth: 0.5 + GRAIN, note: 'nobody has looked at this' };
  const { problems, notes } = report({ van: vehicle(bodyAndLamp, { unjudged: [entry] }) });
  assert.deepEqual(problems, []);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /^van: van_body at body and van_lamp at lamp overlap by \d+ mm and are not judged: nobody/);
});

test('an unjudged entry is capped and goes stale like an allowance', () => {
  const entry = (depth) => ({ sites: ['body', 'lamp'], depth, note: 'n' });
  const shallow = report({ van: vehicle(bodyAndLamp, { unjudged: [entry(0.25)] }) });
  assert.match(shallow.problems.join(), /more than the 250 mm allowed/);
  const apart = [site('body', 'van_body', unit), site('lamp', 'van_lamp', shifted(1))];
  assert.match(report({ van: vehicle(apart, { unjudged: [entry(1)] }) }).problems.join(), /stale/);
});

const lamps = [site('body', 'van_body', unit), site('lamp_near', 'van_lamp', shifted(0.5))];

test('a pair allows its roles to sink into each other up to its depth in either orientation, in every vehicle', () => {
  const roles = ['body', 'lamp_near'];
  const deep = [fit(['lamp', 'body', 0.5 + GRAIN / 2])];
  assert.deepEqual(report({ van: vehicle(lamps), truck: vehicle(lamps) }, deep, roles).problems, []);
  assert.deepEqual(report({ van: vehicle([...lamps].reverse()) }, deep, roles).problems, []);
  assert.equal(report({ van: vehicle(lamps) }, [fit(['lamp', 'body', 0.25])], roles).problems.length, 1);
});

test('a pair not listed is reported even when both its roles appear in other pairs', () => {
  const roles = ['body', 'lamp_near', 'trim'];
  const trim = box('block', [0.9, 0, 0], [1.1, 1, 1]);
  const sites = [...lamps, site('trim', 'van_trim', trim)];
  const listed = [fit(['lamp', 'body', 0.5 + GRAIN], ['trim', 'body', 0.1 + GRAIN])];
  const { problems } = report({ van: vehicle(sites) }, listed, roles);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /lamp_near overlaps van_trim at trim|van_trim at trim overlaps van_lamp at lamp_near/);
});

test('a pair names whole roles: a prefix or a pattern of a role seats nothing', () => {
  assert.equal(fitDepth([fit(['lam', 'body', 1])], 'lamp', 'body'), 0);
  assert.equal(fitDepth([fit(['la*', 'body', 1])], 'lamp', 'body'), 0);
  assert.equal(fitDepth([fit(['lamp', 'body', 1])], 'lamp_extra', 'body'), 0);
  assert.equal(fitDepth([fit(['lamp', 'body', 0.4])], 'body', 'lamp'), 0.4);
});

test('a pair no vehicle overlaps on is reported unused', () => {
  const apart = [site('body', 'van_body', unit), site('lamp', 'van_lamp', shifted(1))];
  const { problems } = report({ van: vehicle(apart) }, [fit(['lamp', 'body', 1])], ['body', 'lamp']);
  assert.match(problems.join(), /pair lamp and body is unused/);
});

test('a pair or entry capped far above the overlap it covers is reported, one capped near it is not', () => {
  const roles = ['body', 'lamp'];
  const loose = report({ van: vehicle(bodyAndLamp) }, [fit(['lamp', 'body', 0.5 + 3 * GRAIN])], roles);
  assert.match(loose.problems.join(), /pair lamp and body is capped at \d+ mm, far above the \d+ mm it covers/);
  const near = report({ van: vehicle(bodyAndLamp) }, [fit(['lamp', 'body', 0.5 + GRAIN])], roles);
  assert.deepEqual(near.problems, []);
  const entry = (depth) => ({ sites: ['body', 'lamp'], depth, why: 'seated' });
  const capped = report({ van: vehicle(bodyAndLamp, { overlaps: [entry(0.5 + 3 * GRAIN)] }) });
  assert.match(capped.problems.join(), /far above/);
  assert.deepEqual(report({ van: vehicle(bodyAndLamp, { overlaps: [entry(0.5 + GRAIN)] }) }).problems, []);
});

test('a role is a site id without its side and number segments, and a word that only contains a side is kept', () => {
  assert.equal(roleOf('wheel_front_near'), 'wheel_front');
  assert.equal(roleOf('headlamp_3_far'), 'headlamp');
  assert.equal(roleOf('near_side'), 'near_side');
  assert.equal(roleOf('nearside'), 'nearside');
});

test('the seating is reported when a fit or pair is malformed, names a role no site has, or lists a pair twice', () => {
  const roles = ['body', 'lamp_near', 'wheel'];
  assert.deepEqual(seatingProblems([fit(['lamp', 'body', 1])], roles), []);
  const wrong = (bad, pattern) => assert.match(seatingProblems([bad], roles).join(), pattern);
  wrong({ why: 'x', pairs: [['lamp', 'body', 1]], extra: 1 }, /has keys/);
  wrong({ ...fit(['lamp', 'body', 1]), why: '' }, /needs a why/);
  wrong(fit(), /needs at least one pair/);
  wrong(fit(['lamp', 'body', 0]), /is not \[seated, into, depth\] with a depth above 0/);
  wrong(fit(['lamp', 'body']), /is not \[seated, into, depth\]/);
  wrong(fit(['lamp', 'bodyy', 1]), /role bodyy is the role of no site/);
  const twice = seatingProblems([fit(['lamp', 'body', 1]), fit(['wheel', 'body', 1], ['body', 'lamp', 1])], roles);
  assert.match(twice.join(), /fit 2 .*: pair body and lamp is also listed in fit 1/);
});
