// What a review tile can be asked to show besides its entry whole from the review views, shared by the review page
// (look.mjs) and the tool that drives it (tools/model-sheet.mjs) so both read a request alike, and which entries the
// page draws and offers in its picker. Plain data, so the rules hold without three.js.
import { landingModels } from './filter.mjs';
import { VIEW_SETS } from './modelFrame.mjs';

// Each tile draws several views at review size, so a page opened without a request draws only a few.
export const LOOK_LANDING_COUNT = 4;

// The [name, direction] views of the set a look asks for by name.
export function viewSet(name) {
  const views = VIEW_SETS[name];
  if (!views) throw new Error(`no view set ${name}; the sets are ${Object.keys(VIEW_SETS).join(', ')}`);
  return views;
}

// A vehicle or an assembly with only the sites whose id starts with one of `prefixes`, so the parts a body hides, such
// as an exhaust run under a floor, can be drawn on their own where they sit. It takes an id of its own, since the
// review page caches what it loads by id. No prefixes keep the entry whole.
export function keepSites(entry, prefixes = []) {
  if (prefixes.length === 0) return entry;
  if (!entry.sites) throw new Error(`${entry.id} is a single model, so it has no sites to keep`);
  const sites = entry.sites.filter(({ site }) => prefixes.some((prefix) => site.startsWith(prefix)));
  if (sites.length === 0) throw new Error(`${entry.id} has no site starting with ${prefixes.join(', ')}`);
  return { ...entry, id: `${entry.id}:${prefixes.join(',')}`, sites };
}

// The ids the review page draws: those it is asked for, or, asked nothing, a few of the showcase's landing models
// for `seed`, so a page opened from a bare link shows tiles beside its picker rather than nothing.
export function lookedIds(asked, entries, seed) {
  if (asked.length > 0) return asked;
  return landingModels(entries, seed, LOOK_LANDING_COUNT).map(({ id }) => id);
}

// The ids the picker offers for what is typed, as the showcase's search reads it, leaving out those already picked.
export function idSuggestions(ids, text, picked, limit) {
  const typed = text.trim().toLowerCase().replace(/\s+/g, '_');
  const taken = new Set(picked);
  return ids.filter((id) => !taken.has(id) && id.includes(typed)).slice(0, limit);
}
