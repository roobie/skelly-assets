// What a review tile can be asked to show besides its entry whole from the review views, shared by the review page
// (look.mjs) and the tool that drives it (tools/model-sheet.mjs) so both read a request alike. Plain data, so the
// rules hold without three.js.
import { VIEW_SETS } from './modelFrame.mjs';

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
