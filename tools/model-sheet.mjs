// Draws models, assembled vehicles and kit assemblies of a built tree into tiles of four views, with the exploded view
// of a vehicle, an assembly or a model that comes in components (tools/components.mjs), or a wearable worn on the doll
// beside them, and a contact sheet, so a reviewer, human or
// agent, can check their looks without opening each one. The drawing
// is the showcase's own: this builds the showcase from the tree and drives its review page (site/look.mjs) in headless
// Chromium.
// Usage: node tools/model-sheet.mjs [--built built] [--out look/sheet] [--size 256] [--vehicles] [--assemblies]
//   [--views review|underside] [--sites prefix,...] [id ...]
// With no ids and no flag it draws everything. A vehicle is assembled from its built placements, and an assembly
// (tools/assemblies.mjs) from its kit, on its own so its own parts come apart about its own centre. `--views` picks
// the tile's view set and `--sites` keeps only a vehicle's or an assembly's sites starting with a prefix
// (site/lookOptions.mjs), so parts a body hides can be drawn on their own.
// Writes <out>/tiles/<id>.png, <out>/sheet.json and <out>/index.html; rows of earlier looks into the same folder with
// the same options stay.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { viewSet } from '../site/lookOptions.mjs';
import { LOOK_DIR, lookDigest, lookIds, lookName, mergeRows } from './look.mjs';
import { MANIFEST } from './manifest.mjs';
import { buildSite, launchBrowser, openPage, serveSite } from './reviewSite.mjs';

const repo = resolve(import.meta.dirname, '..');
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    built: { type: 'string', default: join(repo, 'built') },
    out: { type: 'string', default: join(repo, LOOK_DIR) },
    size: { type: 'string', default: '256' },
    vehicles: { type: 'boolean', default: false },
    assemblies: { type: 'boolean', default: false },
    views: { type: 'string', default: 'review' },
    sites: { type: 'string', default: '' },
  },
});
const options = { views: values.views, sites: values.sites.split(',').filter(Boolean) };
const views = viewSet(options.views);
const look = lookName(options);
const built = resolve(values.built);
const out = resolve(values.out);
const size = Number(values.size);

const writeAtomic = (path, data) => {
  const scratch = `${path}.${process.pid}.tmp`;
  writeFileSync(scratch, data);
  renameSync(scratch, path);
};

// ---- the showcase, served to the browser ----

const site = join(out, 'site');
buildSite(built, site);
const { assemblies, models } = JSON.parse(readFileSync(join(site, 'models.json'), 'utf8'));
const worn = Object.fromEntries(models.filter((model) => model.worn).map(({ id, worn: sites }) => [id, sites]));
const manifest = { ...JSON.parse(readFileSync(join(built, MANIFEST), 'utf8')), assemblies, worn };
const ids = lookIds(manifest, { ids: positionals, vehicles: values.vehicles, assemblies: values.assemblies });
const server = await serveSite(site, built);

// ---- drawing ----

const browser = await launchBrowser();
const drawn = [];
const started = performance.now();
try {
  const { page } = await openPage(browser, server.origin, 'look.html', 'look');
  mkdirSync(join(out, 'tiles'), { recursive: true });
  for (const id of ids) {
    const digest = lookDigest(built, manifest, id);
    try {
      const { png, ...facts } = await page.evaluate(([entry, pixels, asked]) => window.look(entry, pixels, asked), [id, size, options]);
      writeAtomic(join(out, 'tiles', `${id}.png`), Buffer.from(png.slice(png.indexOf(',') + 1), 'base64'));
      drawn.push({ id, look, ...facts, digest });
    } catch (error) {
      drawn.push({ id, look, error: error.message.split('\n')[0] });
    }
  }
} finally {
  await browser.close();
  server.close();
}

// ---- the sheet ----

const sheetPath = join(out, 'sheet.json');
const known = new Set(lookIds(manifest));
const rows = mergeRows(existsSync(sheetPath) ? JSON.parse(readFileSync(sheetPath, 'utf8')) : [], drawn, known, look);
writeAtomic(sheetPath, `${JSON.stringify(rows, null, 1)}\n`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const figure = (r) => r.error
  ? `<figure data-id="${esc(r.id)}"><figcaption><b>${esc(r.id)}</b><div class=err>${esc(r.error)}</div></figcaption></figure>`
  : `<figure data-id="${esc(r.id)}"${r.beside ? ' class=wide' : ''}><img loading=lazy src="tiles/${esc(r.id)}.png" alt="${esc(r.id)}, four views${r.beside ? ` and ${r.beside}` : ''}"><figcaption><b>${esc(r.id)}</b><br>${r.sizeM.join(' × ')} m · ${r.triangles} tris · ${r.parts} ${r.parts === 1 ? 'part' : 'parts'} · grid ${esc(r.grid)}<br>${esc(r.materials.join(', '))}</figcaption></figure>`;
const html = `<!doctype html><meta charset="utf-8"><title>Model sheet</title>
<style>body{font:13px system-ui;background:#f4f2ee;margin:16px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
figure{margin:0;background:#fff;border:1px solid #ccc;padding:6px}figure.wide{grid-column:span 2}img{width:100%}figcaption b{font-family:monospace}.err{color:#b00}
input{font:inherit;padding:4px 8px;margin-bottom:12px;width:280px}</style>
<p>${rows.length} entries · ${esc(look)} · views: ${esc(views.map(([name]) => name).join(' | '))}, then a vehicle, an assembly or a component model exploded, or a wearable worn on the doll, from the front ¾ · sizes x × y × z · <input id=q placeholder="filter by id"></p><main>
${rows.map(figure).join('\n')}
</main><script>q.oninput=()=>{for(const f of document.querySelectorAll('figure'))f.hidden=!f.dataset.id.includes(q.value)}</script>`;
writeFileSync(join(out, 'index.html'), html);
const failed = drawn.filter((r) => r.error);
console.log(`${drawn.length - failed.length}/${drawn.length} drawn in ${((performance.now() - started) / 1000).toFixed(1)} s -> ${join(out, 'index.html')}`);
for (const r of failed) console.log(`FAILED ${r.id}: ${r.error}`);
if (failed.length > 0) process.exitCode = 1;
