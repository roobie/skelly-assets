import assert from 'node:assert/strict';
import { test } from 'node:test';
import { overlapProblems, siteOverlapProblems } from '../siteOverlap.mjs';

const GRAIN = 0.03125;
const box = (id, min, max) => ({ id, kind: 'box', slot: 'paint', min, max });
const site = (id, part, ...pieces) => ({ id, part, pieces });
const vehicle = (sites, overlaps = [], parent = null) => ({ parent, sites, overlaps });
const problems = (vehicles) => overlapProblems({ grain: GRAIN, vehicles });
const unit = box('block', [0, 0, 0], [1, 1, 1]);
const shifted = (by) => box('block', [by, 0, 0], [1 + by, 1, 1]);

test('parts at different sites sharing more than a grain of depth are reported with the vehicle, parts and sites', () => {
  const [problem, ...rest] = problems({ van: vehicle([site('body', 'van_body', unit), site('lamp', 'van_lamp', shifted(0.5))]) });
  assert.deepEqual(rest, []);
  assert.match(problem, /^van: van_body at body overlaps van_lamp at lamp\b/);
});

test('faces that touch, or sink less than a grain into each other, are contact and not an overlap', () => {
  for (const by of [1, 1 - GRAIN / 2]) {
    assert.deepEqual(problems({ van: vehicle([site('body', 'van_body', unit), site('lamp', 'van_lamp', shifted(by))]) }), [], `shifted by ${by}`);
  }
});

test('pieces of one site may overlap each other', () => {
  assert.deepEqual(problems({ van: vehicle([site('body', 'van_body', unit, shifted(0.5))]) }), []);
});

test('an allowed overlap is silent, whichever way round its sites are named', () => {
  const sites = [site('body', 'van_body', unit), site('lamp', 'van_lamp', shifted(0.5))];
  for (const pair of [['body', 'lamp'], ['lamp', 'body']]) {
    assert.deepEqual(problems({ van: vehicle(sites, [{ sites: pair, why: 'the lamp is seated in the body' }]) }), []);
  }
});

test('an allowance covers only the pair it names', () => {
  const sites = [site('body', 'van_body', unit), site('lamp', 'van_lamp', shifted(0.5)), site('mirror', 'van_mirror', shifted(-0.5))];
  const [problem, ...rest] = problems({ van: vehicle(sites, [{ sites: ['body', 'lamp'], why: 'seated' }]) });
  assert.deepEqual(rest, []);
  assert.match(problem, /van_mirror at mirror overlaps van_body at body|van_body at body overlaps van_mirror at mirror/);
});

test('a variant allows its parent\'s overlaps as well as its own', () => {
  const sites = [site('body', 'van_body', unit), site('lamp', 'van_lamp', shifted(0.5))];
  const parent = vehicle(sites, [{ sites: ['body', 'lamp'], why: 'seated' }]);
  assert.deepEqual(problems({ van: parent, electric_van: vehicle(sites, [], 'van') }), []);
  assert.equal(problems({ van: vehicle(sites), electric_van: vehicle(sites, [], 'van') }).length, 2);
});

test('every vehicle of the catalogue keeps its parts at different sites clear of each other or allows the overlap', () => {
  assert.deepEqual(siteOverlapProblems(), []);
});
