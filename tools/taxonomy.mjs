// @ts-check
// The model taxonomy: the vocabulary in models/taxonomy.json, the inheritance rule that resolves a row's taxonomy over
// its defaults, and the report that holds every model's taxonomy to the vocabulary and lists its keywords not yet curated. Why it is shaped this way is in
// models/TAXONOMY.md; tools/check-sources.mjs collects the models' taxonomies and runs the report.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * models/taxonomy.json as readVocabulary holds it.
 * @typedef {ReturnType<typeof readVocabulary>} Vocabulary
 */

/**
 * A model's departure from the vocabulary.
 * @typedef {object} TaxonomyProblem
 * @property {string} pack
 * @property {string} [id]
 * @property {string} problem
 * @property {string} [facet]
 * @property {string} [term]
 * @property {string} message
 */

/**
 * A model as the taxonomy report reads it; its taxonomy is whatever its row holds, which the report holds to the rules.
 * @typedef {{ pack: string; id: string; taxonomy?: unknown }} TaxonomyModel
 */

const repo = resolve(import.meta.dirname, '..');
export const VOCABULARY = 'models/taxonomy.json';

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
/**
 * @param {unknown} value
 * @returns {value is string}
 */
const isTerm = (value) => typeof value === 'string' && KEBAB.test(value);
/**
 * @param {unknown} value
 * @returns {value is Readonly<Record<string, unknown>>}
 */
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
/**
 * @param {unknown} value
 * @returns {value is readonly string[]}
 */
const isTermList = (value) => Array.isArray(value) && value.every((term) => typeof term === 'string');
/**
 * @param {string} a
 * @param {string} b
 */
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * A taxonomy's tags as a facet map; none is an empty one. Anything else is no map of facets, which the vocabulary check
 * (modelProblems) refuses, so it is refused here too rather than read as one.
 * @param {unknown} tags
 * @returns {Readonly<Record<string, unknown>>}
 */
function facetMap(tags) {
  if (tags === undefined || tags === null) return {};
  if (!isObject(tags)) throw new Error(`taxonomy tags must map each facet to its terms, read ${JSON.stringify(tags)}`);
  return tags;
}

/**
 * The facet map a taxonomy holds; a taxonomy that is not an object holds none.
 * @param {unknown} taxonomy
 */
export const taxonomyTags = (taxonomy) => facetMap(isObject(taxonomy) ? taxonomy.tags : undefined);

/**
 * The terms a taxonomy's tags give `facet`, none if they name none.
 * @param {unknown} tags
 * @param {string} facet
 * @returns {readonly string[]}
 */
export function facetTerms(tags, facet) {
  if (!isObject(tags)) return [];
  const terms = tags[facet] ?? [];
  if (!isTermList(terms)) throw new Error(`taxonomy tags ${facet} must list terms, read ${JSON.stringify(terms)}`);
  return terms;
}

// A row's own taxonomy over a default: its category and keywords replace the default's, and each facet it names replaces
// that facet's terms, so the facets it leaves out are inherited. tools/jsonnet/lib/taxonomy.libsonnet, over, is the same
// rule for Jsonnet sources.
/**
 * @param {Readonly<Record<string, unknown>>} [base]
 * @param {Readonly<Record<string, unknown>>} [own]
 */
export function inheritTaxonomy(base = {}, own = {}) {
  return { ...base, ...own, tags: { ...facetMap(base.tags), ...facetMap(own.tags) } };
}

/**
 * @param {unknown} table
 * @param {string} where
 */
function termTable(table, where) {
  if (!isObject(table) || Object.keys(table).length === 0)
    throw new Error(`${VOCABULARY}: ${where} must name at least one term`);
  /** @type {Map<string, string>} */
  const terms = new Map();
  for (const [term, meaning] of Object.entries(table)) {
    if (!KEBAB.test(term)) throw new Error(`${VOCABULARY}: ${where} term ${term} is not kebab-case`);
    if (typeof meaning !== 'string' || meaning.trim() === '')
      throw new Error(`${VOCABULARY}: ${where} term ${term} has no meaning`);
    terms.set(term, meaning);
  }
  return terms;
}

/**
 * A dimension's meaning, once it holds only `keys`.
 * @param {string} name
 * @param {Readonly<Record<string, unknown>>} entry
 * @param {readonly string[]} keys
 */
function dimensionMeaning(name, entry, keys) {
  const { meaning } = entry;
  if (typeof meaning !== 'string' || meaning.trim() === '')
    throw new Error(`${VOCABULARY}: dimension ${name} has no meaning`);
  if (Object.keys(entry).some((key) => !keys.includes(key)))
    throw new Error(`${VOCABULARY}: dimension ${name} must hold only ${keys.join(' and ')}`);
  return meaning;
}

// models/taxonomy.json, read strictly: a key the reader does not know is an error, never skipped.
export function readVocabulary(root = repo) {
  /** @type {unknown} */
  const value = JSON.parse(readFileSync(join(root, VOCABULARY), 'utf8'));
  if (!isObject(value)) throw new Error(`${VOCABULARY}: must hold an object`);
  const known = new Set(['_doc', 'untaggedPacks', 'categories', 'facets', 'dimensions', 'keywords']);
  for (const key of Object.keys(value)) if (!known.has(key)) throw new Error(`${VOCABULARY}: unknown key ${key}`);
  const untaggedPacks = value.untaggedPacks ?? [];
  if (!isTermList(untaggedPacks)) {
    throw new Error(`${VOCABULARY}: untaggedPacks must list pack ids`);
  }
  if (new Set(untaggedPacks).size !== untaggedPacks.length)
    throw new Error(`${VOCABULARY}: untaggedPacks lists a pack twice`);
  if (!isObject(value.facets)) throw new Error(`${VOCABULARY}: facets must map each facet to its meaning and terms`);
  const facets = new Map(
    Object.entries(value.facets).map(([facet, entry]) => {
      if (!KEBAB.test(facet)) throw new Error(`${VOCABULARY}: facet ${facet} is not kebab-case`);
      if (
        !isObject(entry) ||
        typeof entry.meaning !== 'string' ||
        Object.keys(entry).some((key) => key !== 'meaning' && key !== 'terms')
      ) {
        throw new Error(`${VOCABULARY}: facet ${facet} must hold only a meaning and its terms`);
      }
      return [facet, { meaning: entry.meaning, terms: termTable(entry.terms, `facet ${facet}`) }];
    }),
  );
  const dimensions = value.dimensions ?? {};
  const { keyword, form, ...otherDimensions } = isObject(dimensions) ? dimensions : {};
  if (Object.keys(otherDimensions).length > 0 || !isObject(keyword) || !isObject(form)) {
    throw new Error(`${VOCABULARY}: dimensions must hold exactly the keyword and form dimensions`);
  }
  const keywordMeaning = dimensionMeaning('keyword', keyword, ['meaning']);
  const formMeaning = dimensionMeaning('form', form, ['meaning', 'terms']);
  return {
    untaggedPacks: new Set(untaggedPacks),
    categories: termTable(value.categories, 'categories'),
    facets,
    dimensions: {
      keyword: { meaning: keywordMeaning },
      form: { meaning: formMeaning, terms: termTable(form.terms, 'dimension form') },
    },
    keywords: termTable(value.keywords, 'keywords'),
  };
}

/**
 * @param {unknown} taxonomy
 * @returns {readonly unknown[]}
 */
const keywordList = (taxonomy) => (isObject(taxonomy) && Array.isArray(taxonomy.keywords) ? taxonomy.keywords : []);

/**
 * One model's departures from the vocabulary: malformed taxonomy, unknown category, facet or term.
 * @param {TaxonomyModel} model
 * @param {Vocabulary} vocabulary
 */
export function modelProblems({ pack, id, taxonomy }, vocabulary) {
  const at = `${pack}/${id}`;
  /** @type {TaxonomyProblem[]} */
  const problems = [];
  /**
   * @param {string} facet
   * @param {string} term
   */
  const unknown = (facet, term) =>
    problems.push({
      pack,
      id,
      problem: 'unknown-term',
      facet,
      term,
      message: `${at}: ${facet} ${term} is not in ${VOCABULARY}`,
    });
  /** @param {string} message */
  const malformed = (message) => problems.push({ pack, id, problem: 'malformed', message: `${at}: ${message}` });
  if (taxonomy === undefined) return [];
  if (!isObject(taxonomy)) return [{ pack, id, problem: 'malformed', message: `${at}: taxonomy must be an object` }];
  for (const key of Object.keys(taxonomy))
    if (!['category', 'tags', 'keywords'].includes(key)) malformed(`unknown taxonomy key ${key}`);
  const { category, tags, keywords } = taxonomy;
  if (category !== undefined) {
    if (typeof category !== 'string') malformed('category must be one term');
    else if (!vocabulary.categories.has(category)) unknown('category', category);
  }
  if (tags !== undefined && !isObject(tags)) malformed('tags must map each facet to its terms');
  for (const [facet, terms] of Object.entries(isObject(tags) ? tags : {})) {
    const known = vocabulary.facets.get(facet);
    if (!known) {
      problems.push({
        pack,
        id,
        problem: 'unknown-facet',
        facet,
        message: `${at}: facet ${facet} is not in ${VOCABULARY}`,
      });
      continue;
    }
    if (!isTermList(terms)) {
      malformed(`${facet} must list terms`);
      continue;
    }
    if (new Set(terms).size !== terms.length) malformed(`${facet} lists a term twice`);
    for (const term of terms) if (!known.terms.has(term)) unknown(facet, term);
  }
  if (keywords !== undefined) {
    if (!Array.isArray(keywords) || !keywords.every(isTerm)) {
      malformed('keywords must list kebab-case terms');
    } else if (new Set(keywords).size !== keywords.length) malformed('keywords lists a term twice');
  }
  return problems;
}

/**
 * One model's well-formed keywords that the vocabulary does not list yet. Keywords admit new terms by review, so these
 * are reported for a reviewer to curate or reject, never failed; a malformed keyword is a problem (modelProblems).
 * @param {TaxonomyModel} model
 * @param {Vocabulary} vocabulary
 */
export function unlistedKeywords({ pack, id, taxonomy }, vocabulary) {
  return keywordList(taxonomy)
    .filter(isTerm)
    .filter((keyword) => !vocabulary.keywords.has(keyword))
    .map((keyword) => ({
      pack,
      id,
      keyword,
      message: `${pack}/${id}: keyword ${keyword} is not listed in ${VOCABULARY}`,
    }));
}

/**
 * Every model held to the vocabulary. models: { pack, id, taxonomy }. untagged: the models without a category;
 * unlisted: the keywords not yet curated (unlistedKeywords), reported only; problems: every departure, each failing the
 * build. A model without a category is a problem unless the vocabulary
 * lists its pack as untagged; a listed pack is a problem once every model of it has a category, or if no model has it,
 * so the list only shrinks.
 * @param {readonly TaxonomyModel[]} models
 * @param {Vocabulary} vocabulary
 */
export function taxonomyReport(models, vocabulary) {
  const problems = models.flatMap((model) => modelProblems(model, vocabulary));
  const untagged = models
    .filter(({ taxonomy }) => (isObject(taxonomy) ? taxonomy.category : undefined) === undefined)
    .map(({ pack, id }) => ({ pack, id }));
  const packs = new Set(models.map(({ pack }) => pack));
  const untaggedPacks = new Set(untagged.map(({ pack }) => pack));
  for (const { pack, id } of untagged) {
    if (!vocabulary.untaggedPacks.has(pack))
      problems.push({ pack, id, problem: 'untagged', message: `${pack}/${id}: no category` });
  }
  for (const pack of vocabulary.untaggedPacks) {
    if (!packs.has(pack))
      problems.push({
        pack,
        problem: 'stale-untagged-pack',
        message: `${VOCABULARY}: untaggedPacks lists ${pack}, which has no model`,
      });
    else if (!untaggedPacks.has(pack))
      problems.push({
        pack,
        problem: 'stale-untagged-pack',
        message: `${VOCABULARY}: every model of ${pack} has a category; remove it from untaggedPacks`,
      });
  }
  const unlisted = models.flatMap((model) => unlistedKeywords(model, vocabulary));
  /**
   * @param {{ pack: string; id?: string; message?: string }} a
   * @param {{ pack: string; id?: string; message?: string }} b
   */
  const order = (a, b) =>
    byText(a.pack, b.pack) || byText(a.id ?? '', b.id ?? '') || byText(a.message ?? '', b.message ?? '');
  return { untagged: untagged.sort(order), unlisted: unlisted.sort(order), problems: problems.sort(order) };
}

/**
 * A model's taxonomy as the manifest carries it: its category, its tags with empty facets dropped and facets and terms
 * sorted, and its keywords sorted, so the manifest does not change with authoring order. The taxonomy is one the
 * vocabulary check (modelProblems) passed; a malformed one is refused rather than written.
 * @param {unknown} [taxonomy]
 */
export function manifestTaxonomy(taxonomy = {}) {
  if (!isObject(taxonomy)) throw new Error(`a taxonomy must be an object, read ${JSON.stringify(taxonomy)}`);
  const tags = Object.keys(facetMap(taxonomy.tags))
    .map((facet) => /** @type {const} */ ([facet, facetTerms(taxonomy.tags, facet)]))
    .filter(([, terms]) => terms.length > 0)
    .sort(([a], [b]) => byText(a, b))
    .map(([facet, terms]) => [facet, [...terms].sort(byText)]);
  const keywords = keywordList(taxonomy);
  if (!isTermList(keywords)) throw new Error(`taxonomy keywords must list terms, read ${JSON.stringify(keywords)}`);
  return {
    ...(taxonomy.category === undefined ? {} : { category: taxonomy.category }),
    ...(tags.length === 0 ? {} : { tags: Object.fromEntries(tags) }),
    ...(keywords.length === 0 ? {} : { keywords: [...keywords].sort(byText) }),
  };
}
