import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { withTaxonomy } from '../build.mjs';
import { compileJsonnetFile } from '../jsonnet/index.mjs';
import { buildManifest } from '../manifest.mjs';
import { inheritTaxonomy, readVocabulary, taxonomyReport, VOCABULARY } from '../taxonomy.mjs';

const FIXTURE = {
  _doc: 'fixture',
  untaggedPacks: ['fixture.loose'],
  categories: { tools: 'Things to work with.', weapons: 'Things to fight with.' },
  facets: {
    material: { meaning: 'What it is made of.', terms: { metal: 'Metal.', wood: 'Wood.' } },
    setting: { meaning: 'Its era.', terms: { modern: 'Now.' } },
  },
  keywords: { 'hand-tool': 'A tool held in the hand.' },
};

const inTemp = (prefix, work) => {
  const root = mkdtempSync(join(tmpdir(), prefix));
  try {
    return work(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
};

const vocabularyOf = (value) => inTemp('taxonomy-', (root) => {
  mkdirSync(join(root, 'models'));
  writeFileSync(join(root, VOCABULARY), JSON.stringify(value));
  return readVocabulary(root);
});

const vocabulary = vocabularyOf(FIXTURE);
const problemsOf = (models) => taxonomyReport(models, vocabulary).problems.map(({ problem, id }) => `${problem} ${id ?? ''}`.trim());
// A tagged model of the listed pack, so the pack is not reported stale while a test looks at other packs.
const looseUntagged = { pack: 'fixture.loose', id: 'loose' };

test('a model without a category fails outside the packs listed as untagged, and is only reported inside them', () => {
  const report = taxonomyReport([{ pack: 'fixture.strict', id: 'bare' }, looseUntagged], vocabulary);
  assert.deepEqual(report.untagged, [{ pack: 'fixture.loose', id: 'loose' }, { pack: 'fixture.strict', id: 'bare' }]);
  assert.deepEqual(report.problems.map(({ problem, id }) => [problem, id]), [['untagged', 'bare']]);
});

test('a category, facet or term outside the vocabulary fails, even in a pack listed as untagged', () => {
  const at = (id, taxonomy) => ({ pack: 'fixture.loose', id, taxonomy });
  assert.deepEqual(problemsOf([
    looseUntagged,
    at('bad_category', { category: 'gadgets' }),
    at('bad_facet', { category: 'tools', tags: { colour: ['red'] } }),
    at('bad_term', { category: 'tools', tags: { material: ['metal', 'glass'] } }),
    at('bad_key', { category: 'tools', shelf: 'tools' }),
  ]), ['unknown-term bad_category', 'unknown-facet bad_facet', 'malformed bad_key', 'unknown-term bad_term']);
});

test('a keyword the vocabulary does not list is reported without failing; a malformed keyword fails', () => {
  const at = (id, keywords) => ({ pack: 'fixture.loose', id, taxonomy: { category: 'tools', keywords } });
  const report = taxonomyReport([
    looseUntagged,
    at('listed', ['hand-tool']),
    at('unlisted', ['hand-tool', 'claw-hammer']),
    at('bad_case', ['Claw_Hammer']),
    at('twice', ['hand-tool', 'hand-tool']),
    at('not_a_list', 'hand-tool'),
  ], vocabulary);
  assert.deepEqual(report.unlisted.map(({ id, keyword }) => [id, keyword]), [['unlisted', 'claw-hammer']]);
  assert.deepEqual(report.problems.map(({ problem, id }) => [problem, id]), [['malformed', 'bad_case'], ['malformed', 'not_a_list'], ['malformed', 'twice']]);
});

test('the untagged pack list only shrinks: a fully tagged or vanished listed pack fails', () => {
  assert.deepEqual(problemsOf([]), ['stale-untagged-pack']);
  assert.deepEqual(problemsOf([{ pack: 'fixture.loose', id: 'done', taxonomy: { category: 'tools' } }]), ['stale-untagged-pack']);
  assert.deepEqual(problemsOf([looseUntagged]), []);
});

test('the vocabulary is refused when a term is not kebab-case, has no meaning, or a key is unknown', () => {
  assert.throws(() => vocabularyOf({ ...FIXTURE, categories: { Hand_Tools: 'Tools.' } }), /not kebab-case/);
  assert.throws(() => vocabularyOf({ ...FIXTURE, categories: { tools: ' ' } }), /has no meaning/);
  assert.throws(() => vocabularyOf({ ...FIXTURE, facets: { material: { meaning: 'x', terms: { metal: '' } } } }), /has no meaning/);
  assert.throws(() => vocabularyOf({ ...FIXTURE, strict: true }), /unknown key strict/);
  assert.throws(() => vocabularyOf({ ...FIXTURE, keywords: { 'Hand tool': 'A tool.' } }), /not kebab-case/);
  assert.throws(() => vocabularyOf({ ...FIXTURE, keywords: { 'hand-tool': '' } }), /keywords term hand-tool has no meaning/);
});

// [default, own, resolved]: the JavaScript and Jsonnet implementations of the rule must agree on each case.
const INHERITANCE = [
  ['the default fills an empty row', { category: 'weapons', tags: { setting: ['modern'] } }, {}, { category: 'weapons', tags: { setting: ['modern'] } }],
  ['a row category replaces the default', { category: 'weapons' }, { category: 'tools' }, { category: 'tools', tags: {} }],
  [
    'a facet the row names replaces that facet; the others are inherited',
    { category: 'weapons', tags: { material: ['wood'], setting: ['modern'] } },
    { tags: { material: ['metal'] } },
    { category: 'weapons', tags: { material: ['metal'], setting: ['modern'] } },
  ],
  ['an empty facet clears the inherited terms', { tags: { setting: ['modern'] } }, { tags: { setting: [] } }, { tags: { setting: [] } }],
  ['a row\'s keywords replace the default\'s', { keywords: ['hand-tool'] }, { keywords: ['claw-hammer'] }, { keywords: ['claw-hammer'], tags: {} }],
];

test('a row inherits its default and overrides it by category, by keywords and by facet', () => {
  for (const [name, base, own, resolved] of INHERITANCE) assert.deepEqual(inheritTaxonomy(base, own), resolved, name);
});

test('the Jsonnet inheritance helper resolves every case as the JavaScript rule does', () => inTemp('taxonomy-jsonnet-', (dir) => {
  const source = join(dir, 'cases.jsonnet');
  const cases = INHERITANCE.map(([, base, own]) => ({ base, own }));
  writeFileSync(source, `local taxonomy = import 'jsonnet/lib/taxonomy.libsonnet';
local cases = ${JSON.stringify(cases)};
{
  over: [taxonomy.over(c.base, c.own) for c in cases],
  inherit: [taxonomy.inherit(c.base, [{ id: 'row', taxonomy: c.own }])[0].taxonomy for c in cases],
  innerFirst: taxonomy.inherit({ category: 'weapons', tags: { setting: ['modern'] } }, taxonomy.inherit({ tags: { material: ['wood'] } }, [{ id: 'row' }]))[0].taxonomy,
}
`);
  const compiled = JSON.parse(compileJsonnetFile(source));
  const expected = INHERITANCE.map(([, , , resolved]) => resolved);
  assert.deepEqual(compiled.over, expected);
  assert.deepEqual(compiled.inherit, expected);
  assert.deepEqual(compiled.innerFirst, { category: 'weapons', tags: { material: ['wood'], setting: ['modern'] } });
}));

test('the manifest carries each model\'s category, sorted tags and sorted keywords, without empty facets', () => {
  const models = withTaxonomy(
    [{ id: 'axe', kind: 'item', pack: 'fixture.a', path: 'axe.glb', nodes: [] }, { id: 'rock', kind: 'item', pack: 'fixture.a', path: 'rock.glb', nodes: [] }],
    [
      { pack: 'fixture.a', id: 'axe', taxonomy: { category: 'tools', tags: { setting: [], material: ['wood', 'metal'] }, keywords: ['splitting', 'felling'] } },
      { pack: 'fixture.a', id: 'rock' },
    ],
  );
  const { models: entries } = buildManifest({ models, files: ['fixture.a/axe.glb', 'fixture.a/rock.glb'], credit: () => ({ author: 'a', licence: 'l' }) });
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  assert.equal(byId.get('axe').category, 'tools');
  assert.deepEqual(byId.get('axe').tags, { material: ['metal', 'wood'] });
  assert.deepEqual(byId.get('axe').keywords, ['felling', 'splitting']);
  assert.ok(['category', 'tags', 'keywords'].every((key) => !Object.hasOwn(byId.get('rock'), key)));
});

test('a built model whose source row was not read for its taxonomy stops the build', () => {
  assert.throws(() => withTaxonomy([{ id: 'stray', pack: 'fixture.a' }], []), /stray/);
});
