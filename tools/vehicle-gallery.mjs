// Builds one review page of the vehicles a model sheet (tools/model-sheet.mjs) has drawn, so a fleet can be watched as
// it is authored. Whoever looks at the renders may write <sheet>/reviews/<vehicle>.json, { family?, faults: [] }, to
// group the vehicle and list what is wrong with it.
// Usage: node tools/vehicle-gallery.mjs [--built built] [--sheet look/sheet] [--out <sheet>/gallery.html] [--stale]
// --stale also lists each vehicle whose render predates its built model and fails when there is one.
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { LOOK_DIR, lookDigest, staleIds } from './look.mjs';
import { MANIFEST } from './manifest.mjs';

const repo = resolve(import.meta.dirname, '..');
const { values } = parseArgs({
  options: {
    built: { type: 'string', default: join(repo, 'built') },
    sheet: { type: 'string', default: join(repo, LOOK_DIR) },
    out: { type: 'string' },
    stale: { type: 'boolean', default: false },
  },
});
const built = resolve(values.built);
const sheetDir = resolve(values.sheet);
const out = resolve(values.out ?? join(sheetDir, 'gallery.html'));
const manifest = JSON.parse(readFileSync(join(built, MANIFEST), 'utf8'));
const sheetPath = join(sheetDir, 'sheet.json');
if (!existsSync(sheetPath)) throw new Error(`${sheetPath}: no sheet; draw the vehicles with tools/model-sheet.mjs --vehicles`);
const vehicleTags = new Map(manifest.vehicles.map(({ id, tags }) => [id, tags ?? {}]));
const vehicleTitles = new Map(manifest.vehicles.map(({ id, title }) => [id, title]));
const rows = JSON.parse(readFileSync(sheetPath, 'utf8')).filter(({ id }) => vehicleTags.has(id));
const stale = new Set(staleIds(rows, (id) => lookDigest(built, manifest, id)));

const escapeHtml = (text) =>
  String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const tileOf = (id) => join(sheetDir, 'tiles', `${id}.png`);

function readReview(id) {
  const path = join(sheetDir, 'reviews', `${id}.json`);
  if (!existsSync(path)) return {};
  const review = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(review.faults)) throw new Error(`${path} has no faults list`);
  const pictured = existsSync(tileOf(id));
  return { review, reviewStale: pictured && statSync(path).mtimeMs < statSync(tileOf(id)).mtimeMs };
}

const vehicles = rows.map((row) => {
  try {
    return { ...row, title: vehicleTitles.get(row.id), tags: vehicleTags.get(row.id), stale: stale.has(row.id), ...readReview(row.id) };
  } catch (error) {
    return { ...row, title: vehicleTitles.get(row.id), tags: vehicleTags.get(row.id), broken: String(error) };
  }
});

// The sheet measures x, y, z; a plate reads length, width, height, the length being the longer horizontal side.
const metres = ([x, y, z]) => `${Math.max(x, z).toFixed(2)} × ${Math.min(x, z).toFixed(2)} × ${y.toFixed(2)} m`;

function verdict({ broken, review, reviewStale }) {
  if (broken) return '<span class="pill fault">Could not be read</span>';
  if (!review) return '<span class="pill pending">Not reviewed</span>';
  if (reviewStale) return '<span class="pill pending">Review predates render</span>';
  const count = review.faults.length;
  return count === 0
    ? '<span class="pill clear">No faults listed</span>'
    : `<span class="pill fault">${count} ${count === 1 ? 'fault' : 'faults'}</span>`;
}

function card(vehicle) {
  const faults = vehicle.review?.faults ?? [];
  const tags = Object.entries(vehicle.tags).map(([facet, terms]) => `<div><dt>${escapeHtml(facet)}</dt><dd>${escapeHtml(terms.join(', '))}</dd></div>`);
  return `<article class="card" id="${escapeHtml(vehicle.id)}">
  <header><h3>${escapeHtml(vehicle.title)}</h3>${vehicle.stale ? '<span class="pill fault">Render predates model</span>' : ''}${verdict(vehicle)}</header>
  ${vehicle.broken ? `<p class="note">${escapeHtml(vehicle.broken)}</p>` : ''}
  ${vehicle.error ? `<p class="note">No render: ${escapeHtml(vehicle.error)}</p>` : `<dl>
    <div><dt>L × W × H</dt><dd>${metres(vehicle.sizeM)}</dd></div>
    <div><dt>Parts</dt><dd>${vehicle.parts}</dd></div>
    <div><dt>Triangles</dt><dd>${vehicle.triangles.toLocaleString('en-GB')}</dd></div>
    ${tags.join('\n    ')}
  </dl>
  <figure><img src="${escapeHtml(relative(resolve(out, '..'), tileOf(vehicle.id)))}" alt="${escapeHtml(vehicle.title)}: front and rear three-quarter, side and top views" loading="lazy"></figure>`}
  ${faults.length > 0 ? `<ul class="faults${vehicle.reviewStale ? ' old' : ''}">${faults.map((fault) => `<li>${escapeHtml(fault)}</li>`).join('')}</ul>` : ''}
</article>`;
}

const families = Map.groupBy(vehicles, (vehicle) => vehicle.review?.family ?? 'Awaiting review');
const sections = [...families]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([family, members]) => `<section>
  <h2>${escapeHtml(family)} <span>${members.length}</span></h2>
  <div class="grid">${members.map(card).join('\n')}</div>
</section>`)
  .join('\n');
const faultCount = vehicles.reduce((sum, { review, reviewStale }) => sum + (reviewStale ? 0 : (review?.faults.length ?? 0)), 0);
const brokenCount = vehicles.filter(({ broken }) => broken).length;
const tallyExtra = [
  [brokenCount, 'could not be read'],
  [vehicles.filter(({ error }) => error).length, 'with no render'],
  [stale.size, 'with a render older than the model'],
  [vehicles.filter(({ reviewStale }) => reviewStale).length, 'with an old review'],
  [vehicleTags.size - rows.length, 'not drawn yet'],
]
  .filter(([count]) => count > 0)
  .map(([count, label]) => `<span>${count} ${label}</span>`)
  .join('');

const page = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vehicle Yard</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* A yard inventory: each vehicle is a sheet of drawings with its data plate under the name. */
:root {
  --ground: #dfe3de; --sheet: #f1f3ef; --ink: #20261f; --quiet: #586156; --rule: #b5bcb2;
  --plate: #2f4a3a; --on-plate: #eef3ec; --clear: #2d6a42; --fault: #a3321f; --pending: #6b6f5d;
  --display: "Barlow Condensed", "Arial Narrow", sans-serif;
  --data: "IBM Plex Mono", ui-monospace, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --ground: #161a16; --sheet: #20251f; --ink: #e4e8e1; --quiet: #a2aa9e; --rule: #3c443a;
  --plate: #3f6450; --on-plate: #f0f5ee; --clear: #79c394; --fault: #ee8a75; --pending: #b5b9a5; color-scheme: dark;
} }
:root[data-theme="dark"] {
  --ground: #161a16; --sheet: #20251f; --ink: #e4e8e1; --quiet: #a2aa9e; --rule: #3c443a;
  --plate: #3f6450; --on-plate: #f0f5ee; --clear: #79c394; --fault: #ee8a75; --pending: #b5b9a5; color-scheme: dark;
}
body { background: var(--ground); color: var(--ink); font: 14px/1.45 var(--data); margin: 0; padding: 24px 16px 64px; }
main { display: grid; gap: 32px; }
h1, h2, h3 { font-family: var(--display); font-weight: 600; margin: 0; text-wrap: balance; }
h1 { font-size: 2.6rem; line-height: 1; letter-spacing: .01em; }
.tally { display: flex; flex-wrap: wrap; gap: 4px 20px; margin: 8px 0 0; color: var(--quiet); font-variant-numeric: tabular-nums; }
section { display: grid; gap: 12px; }
h2 { font-size: 1.5rem; text-transform: capitalize; border-bottom: 2px solid var(--ink); padding-bottom: 4px; }
h2 span { font: 500 .85rem var(--data); color: var(--quiet); }
.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); }
.card { background: var(--sheet); border: 1px solid var(--rule); display: grid; gap: 8px; padding: 12px; min-width: 0; align-content: start; }
.card header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
h3 { font-size: 1.45rem; line-height: 1.1; }
.pill { font-size: .75rem; font-weight: 500; padding: 1px 8px; border: 1px solid currentColor; }
.clear { color: var(--clear); } .fault { color: var(--fault); } .pending { color: var(--pending); }
dl { display: flex; flex-wrap: wrap; gap: 2px 16px; margin: 0; padding: 6px 10px; background: var(--plate); color: var(--on-plate); font-size: .8rem; font-variant-numeric: tabular-nums; }
dl div { display: flex; gap: 6px; } dt { opacity: .75; } dd { margin: 0; font-weight: 500; }
figure { margin: 0; min-width: 0; }
figure img { display: block; width: 100%; height: auto; border: 1px solid var(--rule); }
.faults { margin: 0; padding-left: 1.2em; color: var(--fault); font-size: .85rem; }
.faults.old { color: var(--quiet); }
.note { margin: 0; color: var(--fault); font-size: .85rem; overflow-wrap: anywhere; }
.empty { color: var(--quiet); }
</style>
<main>
  <header>
    <h1>Vehicle Yard</h1>
    <p class="tally"><span>${vehicles.length} ${vehicles.length === 1 ? 'vehicle' : 'vehicles'}</span><span>${faultCount} open ${faultCount === 1 ? 'fault' : 'faults'}</span>${tallyExtra}</p>
  </header>
  ${sections || '<p class="empty">No vehicle has been drawn yet.</p>'}
</main>
`;
writeFileSync(out, page);
console.log(`${vehicles.length} vehicles, ${faultCount} faults: ${out}`);
for (const { id, broken } of vehicles.filter(({ broken }) => broken)) console.error(`BROKEN ${id}: ${broken}`);
if (values.stale) {
  for (const id of [...stale].sort()) console.error(`STALE ${id}: its render predates its built model`);
  if (stale.size > 0) process.exitCode = 1;
}
if (brokenCount > 0) process.exitCode = 1;
