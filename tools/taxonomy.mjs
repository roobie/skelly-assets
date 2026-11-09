// The model taxonomy: the vocabulary in models/taxonomy.json, the inheritance rule that resolves a row's taxonomy over
// its defaults, and the report that holds every model's taxonomy to the vocabulary. Why it is shaped this way is in
// models/TAXONOMY.md; tools/check-taxonomy.mjs collects the models' taxonomies and runs the report.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
export const VOCABULARY = 'models/taxonomy.json';

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// A row's own taxonomy over a default: its category replaces the default's, and each facet it names replaces that
// facet's terms, so the facets it leaves out are inherited. tools/jsonnet/lib/taxonomy.libsonnet, over, is the same
// rule for Jsonnet sources.
export function inheritTaxonomy(base = {}, own = {}) {
  return { ...base, ...own, tags: { ...base.tags, ...own.tags } };
}

function termTable(table, where) {
  if (!isObject(table) || Object.keys(table).length === 0) throw new Error(`${VOCABULARY}: ${where} must name at least one term`);
  for (const [term, meaning] of Object.entries(table)) {
    if (!KEBAB.test(term)) throw new Error(`${VOCABULARY}: ${where} term ${term} is not kebab-case`);
    if (typeof meaning !== 'string' || meaning.trim() === '') throw new Error(`${VOCABULARY}: ${where} term ${term} has no meaning`);
  }
  return new Map(Object.entries(table));
}

// models/taxonomy.json, read strictly: a key the reader does not know is an error, never skipped.
export function readVocabulary(root = repo) {
  const value = JSON.parse(readFileSync(join(root, VOCABULARY), 'utf8'));
  const known = new Set(['_doc', 'untaggedPacks', 'categories', 'facets']);
  for (const key of Object.keys(value)) if (!known.has(key)) throw new Error(`${VOCABULARY}: unknown key ${key}`);
  const untaggedPacks = value.untaggedPacks ?? [];
  if (!Array.isArray(untaggedPacks) || untaggedPacks.some((pack) => typeof pack !== 'string')) {
    throw new Error(`${VOCABULARY}: untaggedPacks must list pack ids`);
  }
  if (new Set(untaggedPacks).size !== untaggedPacks.length) throw new Error(`${VOCABULARY}: untaggedPacks lists a pack twice`);
  if (!isObject(value.facets)) throw new Error(`${VOCABULARY}: facets must map each facet to its meaning and terms`);
  const facets = new Map(Object.entries(value.facets).map(([facet, entry]) => {
    if (!KEBAB.test(facet)) throw new Error(`${VOCABULARY}: facet ${facet} is not kebab-case`);
    if (!isObject(entry) || typeof entry.meaning !== 'string' || Object.keys(entry).some((key) => key !== 'meaning' && key !== 'terms')) {
      throw new Error(`${VOCABULARY}: facet ${facet} must hold only a meaning and its terms`);
    }
    return [facet, { meaning: entry.meaning, terms: termTable(entry.terms, `facet ${facet}`) }];
  }));
  return { untaggedPacks: new Set(untaggedPacks), categories: termTable(value.categories, 'categories'), facets };
}

// One model's departures from the vocabulary: malformed taxonomy, unknown category, facet or term.
export function modelProblems({ pack, id, taxonomy }, vocabulary) {
  const at = `${pack}/${id}`;
  const problems = [];
  const unknown = (facet, term) => problems.push({ pack, id, problem: 'unknown-term', facet, term, message: `${at}: ${facet} ${term} is not in ${VOCABULARY}` });
  const malformed = (message) => problems.push({ pack, id, problem: 'malformed', message: `${at}: ${message}` });
  if (taxonomy === undefined) return [];
  if (!isObject(taxonomy)) return [{ pack, id, problem: 'malformed', message: `${at}: taxonomy must be an object` }];
  for (const key of Object.keys(taxonomy)) if (key !== 'category' && key !== 'tags') malformed(`unknown taxonomy key ${key}`);
  if (taxonomy.category !== undefined) {
    if (typeof taxonomy.category !== 'string') malformed('category must be one term');
    else if (!vocabulary.categories.has(taxonomy.category)) unknown('category', taxonomy.category);
  }
  if (taxonomy.tags !== undefined && !isObject(taxonomy.tags)) malformed('tags must map each facet to its terms');
  for (const [facet, terms] of Object.entries(isObject(taxonomy.tags) ? taxonomy.tags : {})) {
    if (!vocabulary.facets.has(facet)) {
      problems.push({ pack, id, problem: 'unknown-facet', facet, message: `${at}: facet ${facet} is not in ${VOCABULARY}` });
      continue;
    }
    if (!Array.isArray(terms) || terms.some((term) => typeof term !== 'string')) {
      malformed(`${facet} must list terms`);
      continue;
    }
    if (new Set(terms).size !== terms.length) malformed(`${facet} lists a term twice`);
    for (const term of terms) if (!vocabulary.facets.get(facet).terms.has(term)) unknown(facet, term);
  }
  return problems;
}

// Every model held to the vocabulary. models: { pack, id, taxonomy }. untagged: the models without a category;
// problems: every departure, each failing the build. A model without a category is a problem unless the vocabulary
// lists its pack as untagged; a listed pack is a problem once every model of it has a category, or if no model has it,
// so the list only shrinks.
export function taxonomyReport(models, vocabulary) {
  const problems = models.flatMap((model) => modelProblems(model, vocabulary));
  const untagged = models.filter(({ taxonomy }) => taxonomy?.category === undefined)
    .map(({ pack, id }) => ({ pack, id }));
  const packs = new Set(models.map(({ pack }) => pack));
  const untaggedPacks = new Set(untagged.map(({ pack }) => pack));
  for (const { pack, id } of untagged) {
    if (!vocabulary.untaggedPacks.has(pack)) problems.push({ pack, id, problem: 'untagged', message: `${pack}/${id}: no category` });
  }
  for (const pack of vocabulary.untaggedPacks) {
    if (!packs.has(pack)) problems.push({ pack, problem: 'stale-untagged-pack', message: `${VOCABULARY}: untaggedPacks lists ${pack}, which has no model` });
    else if (!untaggedPacks.has(pack)) problems.push({ pack, problem: 'stale-untagged-pack', message: `${VOCABULARY}: every model of ${pack} has a category; remove it from untaggedPacks` });
  }
  const order = (a, b) => byText(a.pack, b.pack) || byText(a.id ?? '', b.id ?? '') || byText(a.message, b.message);
  return { untagged: untagged.sort(order), problems: problems.sort(order) };
}

// A model's taxonomy as the manifest carries it: its category, and its tags with empty facets dropped and facets and
// terms sorted, so the manifest does not change with authoring order.
export function manifestTaxonomy(taxonomy = {}) {
  const tags = Object.entries(taxonomy.tags ?? {}).filter(([, terms]) => terms.length > 0).sort(([a], [b]) => byText(a, b))
    .map(([facet, terms]) => [facet, [...terms].sort(byText)]);
  return {
    ...(taxonomy.category === undefined ? {} : { category: taxonomy.category }),
    ...(tags.length === 0 ? {} : { tags: Object.fromEntries(tags) }),
  };
}
