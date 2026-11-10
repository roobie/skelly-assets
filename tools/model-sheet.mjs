// Draws models and assembled vehicles of a built tree into tiles of four views, with a vehicle's exploded view beside
// them, and a contact sheet, so a reviewer, human or agent, can check their looks without opening each one. The drawing
// is the showcase's own: this builds the showcase from the tree and drives its review page (site/look.mjs) in headless
// Chromium.
// Usage: node tools/model-sheet.mjs [--built built] [--out look/sheet] [--size 256] [--vehicles] [id ...]
// With no ids and no --vehicles it draws every model and vehicle. A vehicle is assembled from its built placements.
// Writes <out>/tiles/<id>.png, <out>/sheet.json and <out>/index.html; rows of earlier looks into the same folder stay.
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { LOOK_DIR, lookDigest, lookIds, mergeRows } from './look.mjs';
import { MANIFEST } from './manifest.mjs';

const repo = resolve(import.meta.dirname, '..');
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    built: { type: 'string', default: join(repo, 'built') },
    out: { type: 'string', default: join(repo, LOOK_DIR) },
    size: { type: 'string', default: '256' },
    vehicles: { type: 'boolean', default: false },
  },
});
const built = resolve(values.built);
const out = resolve(values.out);
const size = Number(values.size);
const manifest = JSON.parse(readFileSync(join(built, MANIFEST), 'utf8'));
const ids = lookIds(manifest, { ids: positionals, vehicles: values.vehicles });

const writeAtomic = (path, data) => {
  const scratch = `${path}.${process.pid}.tmp`;
  writeFileSync(scratch, data);
  renameSync(scratch, path);
};

// ---- the showcase, served to the browser ----

const site = join(out, 'site');
execFileSync(process.execPath, [join(repo, 'site/build.mjs'), '--built', built, '--no-tree', site], { stdio: ['ignore', 'ignore', 'inherit'] });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary' };
const isFile = (path) => existsSync(path) && statSync(path).isFile();
// The showcase built without its tree holds only the files it rewrites, such as plain clips; the rest come from the tree.
const sitePath = (pathname) => {
  const path = resolve(site, `.${pathname}`);
  if (!path.startsWith(site + sep)) return undefined;
  if (isFile(path) || !pathname.startsWith('/built/')) return path;
  const fromTree = resolve(built, `.${pathname.slice('/built'.length)}`);
  return fromTree.startsWith(built + sep) ? fromTree : undefined;
};
const server = createServer((request, response) => {
  const path = sitePath(decodeURIComponent(new URL(request.url, 'http://look').pathname));
  if (!path || !isFile(path)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
  createReadStream(path).pipe(response);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));

// ---- drawing ----

const { chromium } = await import('playwright');
// Headless Chromium has no GPU, so WebGL runs on the SwiftShader software rasteriser.
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const drawn = [];
const started = performance.now();
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/look.html`);
  await page.waitForFunction(() => typeof window.look === 'function', undefined, { timeout: 30_000 }).catch(() => {
    throw new Error(`the review page did not start: ${pageErrors.join('; ') || 'no error reported'}`);
  });
  mkdirSync(join(out, 'tiles'), { recursive: true });
  for (const id of ids) {
    const digest = lookDigest(built, manifest, id);
    try {
      const { png, ...facts } = await page.evaluate(([entry, pixels]) => window.look(entry, pixels), [id, size]);
      writeAtomic(join(out, 'tiles', `${id}.png`), Buffer.from(png.slice(png.indexOf(',') + 1), 'base64'));
      drawn.push({ id, ...facts, digest });
    } catch (error) {
      drawn.push({ id, error: error.message.split('\n')[0] });
    }
  }
} finally {
  await browser.close();
  server.close();
}

// ---- the sheet ----

const sheetPath = join(out, 'sheet.json');
const known = new Set(lookIds(manifest));
const rows = mergeRows(existsSync(sheetPath) ? JSON.parse(readFileSync(sheetPath, 'utf8')) : [], drawn, known);
writeAtomic(sheetPath, `${JSON.stringify(rows, null, 1)}\n`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const figure = (r) => r.error
  ? `<figure data-id="${esc(r.id)}"><figcaption><b>${esc(r.id)}</b><div class=err>${esc(r.error)}</div></figcaption></figure>`
  : `<figure data-id="${esc(r.id)}"${r.exploded ? ' class=exploded' : ''}><img loading=lazy src="tiles/${esc(r.id)}.png" alt="${esc(r.id)}, ${r.exploded ? 'four views and exploded' : 'four views'}"><figcaption><b>${esc(r.id)}</b><br>${r.sizeM.join(' × ')} m · ${r.triangles} tris · ${r.parts} ${r.parts === 1 ? 'part' : 'parts'} · grid ${esc(r.grid)}<br>${esc(r.materials.join(', '))}</figcaption></figure>`;
const html = `<!doctype html><meta charset="utf-8"><title>Model sheet</title>
<style>body{font:13px system-ui;background:#f4f2ee;margin:16px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
figure{margin:0;background:#fff;border:1px solid #ccc;padding:6px}figure.exploded{grid-column:span 2}img{width:100%}figcaption b{font-family:monospace}.err{color:#b00}
input{font:inherit;padding:4px 8px;margin-bottom:12px;width:280px}</style>
<p>${rows.length} entries · views: front ¾ | rear ¾ / side | top, then a vehicle exploded from the front ¾ · sizes x × y × z · <input id=q placeholder="filter by id"></p><main>
${rows.map(figure).join('\n')}
</main><script>q.oninput=()=>{for(const f of document.querySelectorAll('figure'))f.hidden=!f.dataset.id.includes(q.value)}</script>`;
writeFileSync(join(out, 'index.html'), html);
const failed = drawn.filter((r) => r.error);
console.log(`${drawn.length - failed.length}/${drawn.length} drawn in ${((performance.now() - started) / 1000).toFixed(1)} s -> ${join(out, 'index.html')}`);
for (const r of failed) console.log(`FAILED ${r.id}: ${r.error}`);
if (failed.length > 0) process.exitCode = 1;
