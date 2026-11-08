// Builds the showcase site into _site/: the page, the models from built/ and a models.json that lists them.
// Usage: node site/build.mjs [outDir]. No dependencies; the page loads three.js from a CDN.
// The models are the GLB models built/manifest.json names (tools/manifest.mjs), at their pack paths under built/.
import { cpSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';


const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const out = resolve(root, process.argv[2] ?? '_site');
const built = join(root, 'built');

// The only grouping the files themselves carry: a model with a clips file is an animated creature. Ids are names,
// not categories, so nothing here reads meaning into them.
const manifest = JSON.parse(readFileSync(join(built, 'manifest.json'), 'utf8'));
const models = manifest.models
  .filter(({ path }) => path.endsWith('.glb'))
  .map(({ id, pack, path, clips, body }) => ({
    id,
    file: `${pack}/${path}`,
    clips: clips === undefined ? null : `${pack}/${clips}`,
    body: body === undefined ? null : `${pack}/${body}`,
  }))
  .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.file < b.file ? -1 : a.file > b.file ? 1 : 0))
  .map(({ id, file, clips, body }) => ({
    id,
    file,
    bytes: statSync(join(built, file)).size,
    category: clips ? 'Creatures' : 'Things',
    clips,
    body,
  }));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'app.js', 'style.css']) cpSync(join(here, f), join(out, f));
cpSync(built, join(out, 'built'), { recursive: true, filter: (src) => !src.endsWith('.import') });
writeFileSync(join(out, 'models.json'), JSON.stringify({ models }));
writeFileSync(join(out, '.nojekyll'), '');
console.log(`${models.length} models into ${out}`);
