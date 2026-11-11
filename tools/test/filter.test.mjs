import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KEYWORD, dailySeed, emptyFilter, filterQuery, isBrowsing, knownOnly, landingModels, landingSeed, matches, parseFilter, shelfOf, suggestions } from '../../site/filter.mjs';

const model = (id, category, tags = {}, keywords = []) => ({ id, category, tags, keywords });
const entries = [
  model('oak_door', 'building', { material: ['wood'], place: ['urban'] }, ['entrance']),
  model('steel_door', 'building', { material: ['steel'], place: ['urban'] }, ['entrance']),
  model('oak_log', 'nature', { material: ['wood'] }),
  { id: 'jeep', tags: {}, keywords: [], sites: [] },
  model('loose', null),
];
const ids = (filter) => entries.filter((e) => matches(e, filter)).map((e) => e.id);
const filterOf = (changes) => ({ ...emptyFilter(), ...changes });

test('a filter keeps only the models that satisfy every dimension it names', () => {
  assert.deepEqual(ids(filterOf({ picks: { material: ['wood'], place: ['urban'] } })), ['oak_door']);
  assert.deepEqual(ids(filterOf({ picks: { [KEYWORD]: ['entrance'], material: ['steel'] } })), ['steel_door']);
  assert.deepEqual(ids(filterOf({ shelf: 'building', q: 'oak' })), ['oak_door']);
});

test('terms picked in one tag facet widen the match, where two keywords narrow it', () => {
  assert.deepEqual(ids(filterOf({ picks: { material: ['wood', 'steel'] } })), ['oak_door', 'steel_door', 'oak_log']);
  assert.deepEqual(ids(filterOf({ picks: { material: ['wood', 'steel'], place: ['urban'] } })), ['oak_door', 'steel_door']);
  const keyed = [model('a', null, {}, ['x', 'y']), model('b', null, {}, ['x'])];
  const both = { ...emptyFilter(), picks: { [KEYWORD]: ['x', 'y'] } };
  assert.deepEqual(keyed.filter((e) => matches(e, both)).map((e) => e.id), ['a']);
});

test('the shelf names vehicles and models without a category', () => {
  assert.equal(shelfOf(entries[3]), 'Vehicles');
  assert.deepEqual(ids(filterOf({ shelf: 'Uncategorised' })), ['loose']);
});

test('only an empty filter is browsing', () => {
  assert.ok(isBrowsing(filterOf({ q: '  ', picks: { material: [] } })));
  assert.ok(!isBrowsing(filterOf({ shelf: 'nature' })));
  assert.ok(!isBrowsing(filterOf({ picks: { material: ['wood'] } })));
});

test('a filter survives the round trip through its URL query', () => {
  const filter = filterOf({ q: 'oak door', shelf: 'building', picks: { [KEYWORD]: ['entrance'], material: ['wood', 'steel'], place: ['urban'] } });
  assert.deepEqual(parseFilter(filterQuery(filter)), filter);
  assert.equal(filterQuery(emptyFilter()), '');
});

test('a pick the catalogue lacks is dropped from a linked filter', () => {
  const linked = parseFilter('cat=gone&kw=entrance&kw=nonsense&tag=material:wood&tag=material:unobtainium&tag=malformed');
  assert.deepEqual(knownOnly(linked, entries), filterOf({ picks: { [KEYWORD]: ['entrance'], material: ['wood'] } }));
});

test('suggestions list only the terms that leave models, without those already picked', () => {
  const filter = filterOf({ picks: { material: ['wood'] } });
  assert.deepEqual(suggestions(entries, filter, 'place'), [{ term: 'urban', count: 1 }]);
  assert.deepEqual(suggestions(entries, filter, 'material'), [{ term: 'steel', count: 1 }]);
  const keyword = filterOf({ picks: { [KEYWORD]: ['entrance'], material: ['wood'] } });
  assert.deepEqual(suggestions(entries, keyword, KEYWORD), []);
  assert.deepEqual(suggestions(entries, emptyFilter(), 'material').map(({ term }) => term), ['wood', 'steel']);
});

test('the landing page is the same models for the same seed and stays within its count', () => {
  const many = Array.from({ length: 200 }, (_, i) => model(`m${i}`, `c${i % 7}`));
  const first = landingModels(many, dailySeed(new Date('2026-11-12')), 10);
  assert.equal(first.length, 10);
  assert.equal(new Set(first).size, 10);
  assert.deepEqual(first, landingModels(many, dailySeed(new Date('2026-11-12')), 10));
  assert.notDeepEqual(first, landingModels(many, dailySeed(new Date('2026-11-13')), 10));
  assert.equal(new Set(first.slice(0, 7).map(shelfOf)).size, 7);
  assert.equal(landingModels(entries, 1, 99).length, entries.length);
});

test('no reshuffle of one day lands on the seed of another day', () => {
  const days = Array.from({ length: 60 }, (_, i) => dailySeed(new Date(Date.UTC(2026, 10, 1 + i))));
  const seeds = days.flatMap((day) => Array.from({ length: 20 }, (_, n) => landingSeed(day, n)));
  assert.equal(new Set(seeds).size, seeds.length);
});
