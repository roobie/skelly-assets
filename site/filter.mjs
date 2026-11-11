// What the showcase page shows: which models a search, a category and the picked keywords and tags select, how that
// state reads from and writes to the page's URL so a view can be linked, and the few models the landing page shows
// before anything is chosen. No DOM and no three.js, so a test can run it.

// Vocabulary terms are kebab-case, so these capitalised shelf keys never collide with a category.
export const ALL = 'All';
export const UNCATEGORISED = 'Uncategorised';
export const VEHICLES = 'Vehicles';
export const KEYWORD = 'keyword'; // the dimension of a model's keywords; every other dimension is a tag facet

// A short landing page keeps the first load to a handful of previews however large the catalogue grows.
export const LANDING_COUNT = 10;
// A filter that matches thousands reveals its matches this many at a time.
export const PAGE_SIZE = 48;

export const shelfOf = (entry) => (entry.sites ? VEHICLES : entry.category ?? UNCATEGORISED);
export const termsOf = (entry, dimension) => (dimension === KEYWORD ? entry.keywords : entry.tags[dimension] ?? []);

export const emptyFilter = () => ({ q: '', shelf: ALL, picks: {} });

export const isBrowsing = ({ q, shelf, picks }) => !q.trim() && shelf === ALL && Object.values(picks).every((terms) => terms.length === 0);

// Dimensions combine with AND and the terms picked in one tag facet with OR. Most facets give a model a single term
// (setting, place, fit), so AND within one would leave nothing after a second pick, where OR widens. Keywords narrow
// instead: a model has several, and each further one is a refinement.
const termsMatch = (entry, dimension, terms) => (dimension === KEYWORD
  ? terms.every((t) => entry.keywords.includes(t))
  : terms.length === 0 || terms.some((t) => termsOf(entry, dimension).includes(t)));

export function matches(entry, { q, shelf, picks }) {
  if (shelf !== ALL && shelfOf(entry) !== shelf) return false;
  const text = q.trim().toLowerCase();
  if (text) {
    const id = text.replace(/\s+/g, '_');
    const term = text.replace(/[\s_]+/g, '-');
    if (!entry.id.includes(id) && ![...Object.values(entry.tags).flat(), ...entry.keywords].some((t) => t.includes(term))) return false;
  }
  return Object.entries(picks).every(([dimension, terms]) => termsMatch(entry, dimension, terms));
}

// The terms of `dimension` that a further pick would offer models for, with how many, most models first. A tag facet's
// own picks are left out of the filter so its other terms stay on offer, since a further pick there widens; a keyword
// narrows, so its picks stay in.
export function suggestions(entries, filter, dimension) {
  const taken = new Set(filter.picks[dimension] ?? []);
  const { [dimension]: own, ...others } = filter.picks;
  const basis = dimension === KEYWORD ? filter : { ...filter, picks: others };
  const counts = new Map();
  for (const entry of entries) {
    if (!matches(entry, basis)) continue;
    for (const term of termsOf(entry, dimension)) if (!taken.has(term)) counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return [...counts].sort(([a, n], [b, m]) => m - n || (a < b ? -1 : 1)).map(([term, count]) => ({ term, count }));
}

// ---- the URL ----
// `?q=text&cat=shelf&kw=a&kw=b&tag=facet:term`: a part left out is not filtering.

export function filterQuery({ q, shelf, picks }) {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (shelf !== ALL) params.set('cat', shelf);
  for (const [dimension, terms] of Object.entries(picks)) {
    for (const term of terms) params.append(dimension === KEYWORD ? 'kw' : 'tag', dimension === KEYWORD ? term : `${dimension}:${term}`);
  }
  return params.toString();
}

export function parseFilter(search) {
  const params = new URLSearchParams(search);
  const filter = { ...emptyFilter(), q: params.get('q') ?? '', shelf: params.get('cat') || ALL };
  const pick = (dimension, term) => {
    const terms = (filter.picks[dimension] ??= []);
    if (term && !terms.includes(term)) terms.push(term);
  };
  for (const term of params.getAll('kw')) pick(KEYWORD, term);
  for (const tag of params.getAll('tag')) {
    const at = tag.indexOf(':');
    if (at > 0) pick(tag.slice(0, at), tag.slice(at + 1));
  }
  return filter;
}

// A pick the catalogue does not have would match nothing and could not be removed, so it is dropped.
export function knownOnly(filter, entries) {
  const known = (dimension, term) => entries.some((entry) => termsOf(entry, dimension).includes(term));
  const picks = Object.fromEntries(Object.entries(filter.picks)
    .map(([dimension, terms]) => [dimension, terms.filter((term) => known(dimension, term))])
    .filter(([, terms]) => terms.length > 0));
  const shelf = filter.shelf === ALL || entries.some((entry) => shelfOf(entry) === filter.shelf) ? filter.shelf : ALL;
  return { ...filter, shelf, picks };
}

// ---- the landing page ----

// The same day gives the same seed, so a reload does not reshuffle the models under the reader.
export const dailySeed = (date = new Date()) => date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();

// The seed of a landing page: the day, mixed with how many times the reader asked for another, so that no reshuffle
// of one day lands on another day's set.
export const landingSeed = (day, reshuffle) => Math.imul(day ^ Math.imul(reshuffle, 0x9e3779b1), 0x85ebca6b) >>> 0;

// mulberry32: a small seeded generator returning numbers in [0, 1).
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(items, next) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// `count` models for the landing page, one from each of as many shelves as there are so that it shows variety rather
// than whichever kind of model the catalogue holds most of, then any that remain from the rest.
export function landingModels(entries, seed, count = LANDING_COUNT) {
  const next = random(seed);
  const byShelf = Map.groupBy(entries, shelfOf);
  const firsts = shuffled([...byShelf.keys()], next).slice(0, count).map((shelf) => {
    const group = byShelf.get(shelf);
    return group[Math.floor(next() * group.length)];
  });
  const taken = new Set(firsts);
  return [...firsts, ...shuffled(entries.filter((entry) => !taken.has(entry)), next)].slice(0, count);
}
