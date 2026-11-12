import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FORM, KEYWORD, dailySeed, emptyFilter, emptyState, isBrowsing, knownOnly, landingModels, landingSeed, matches, parseState, sameGrid, shelfOf, stateHash, suggestions } from '../../site/filter.mjs';

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

test('the whole page state survives the round trip through the URL hash', () => {
  const filter = filterOf({ q: 'oak door', shelf: 'building', picks: { [KEYWORD]: ['entrance'], material: ['wood', 'steel'], place: ['urban'] } });
  const state = { filter, reshuffle: 3, model: 'oak_door', view: 'exploded', info: true };
  assert.deepEqual(parseState(`#${stateHash(state)}`), state);
  assert.equal(stateHash(emptyState()), '');
});

test('a view and the details belong to an open model only', () => {
  const state = { ...emptyState(), view: 'walk', info: true };
  assert.deepEqual(parseState(stateHash(state)), emptyState());
});

test('a pick the catalogue lacks is dropped from a linked filter', () => {
  const linked = parseState('#cat=gone&kw=entrance&kw=nonsense&tag=material:wood&tag=material:unobtainium&tag=malformed&r=-2').filter;
  assert.deepEqual(knownOnly(linked, entries), filterOf({ picks: { [KEYWORD]: ['entrance'], material: ['wood'] } }));
  assert.equal(parseState('#r=junk').reshuffle, 0);
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

test('a reshuffle of one day does not land on the seed of the next day', () => {
  const today = dailySeed(new Date(Date.UTC(2026, 10, 12)));
  const tomorrow = dailySeed(new Date(Date.UTC(2026, 10, 13)));
  assert.notEqual(landingSeed(today, 1), landingSeed(tomorrow, 0));
  assert.notEqual(landingSeed(today, 1), landingSeed(today, 0));
});

test('states with the same filter and reshuffle draw the same grid, whichever model is open', () => {
  const base = { ...emptyState(), filter: filterOf({ q: 'e' }) };
  assert.ok(sameGrid(base, { ...base, model: 'oak_door', view: 'front', info: true }));
  assert.ok(!sameGrid(base, { ...base, filter: filterOf({ q: 'ea' }) }));
  assert.ok(!sameGrid(base, { ...base, reshuffle: 1 }));
});

test('the form dimension filters like a tag facet and round-trips through its own hash token', () => {
  const formed = [{ ...model('a', null), form: 'atom' }, { ...model('b', null), form: 'assembly' }, { ...model('c', null, { form: ['atom'] }), form: 'assembly' }];
  const picked = (terms, more = {}) => formed.filter((e) => matches(e, filterOf({ picks: { [FORM]: terms, ...more } }))).map((e) => e.id);
  assert.deepEqual(picked(['atom']), ['a']);
  assert.deepEqual(picked(['atom', 'assembly']), ['a', 'b', 'c']);
  assert.deepEqual(picked(['assembly'], { form: ['atom'] }), ['c'], 'a taxonomy facet of the same name is not the derived form');
  assert.deepEqual(suggestions(formed, filterOf({ picks: { [FORM]: ['atom'] } }), FORM), [{ term: 'assembly', count: 2 }]);
  const state = { ...emptyState(), filter: filterOf({ picks: { [FORM]: ['assembly'], material: ['wood'] } }) };
  assert.equal(stateHash(state), 'form=assembly&tag=material:wood');
  assert.deepEqual(parseState(stateHash(state)).filter.picks, state.filter.picks);
  assert.deepEqual(knownOnly(filterOf({ picks: { [FORM]: ['atom', 'bogus'] } }), formed).picks, { [FORM]: ['atom'] });
});
