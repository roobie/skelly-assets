// Builds the showcase site into _site/: the page, the models from built/ and a models.json that lists them.
// Usage: node site/build.mjs [outDir]. No dependencies; the page loads three.js from a CDN.
// Produced models are found by their rows through tools/layout.mjs, producedModels (pack paths under built/);
// the hand-copied models still sit flat in built/.
import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { producedModels } from '../tools/layout.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const out = resolve(root, process.argv[2] ?? '_site');
const built = join(root, 'built');

// The only grouping the files themselves carry: a model with a clips file is an animated creature. Ids are names,
// not categories, so nothing here reads meaning into them.
const flat = readdirSync(built, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.glb'))
  .map((entry) => ({ id: entry.name.slice(0, -4), file: entry.name, clips: null }));
const models = [...producedModels(root), ...flat]
  .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  .map(({ id, file, clips }) => ({
    id,
    file,
    bytes: statSync(join(built, file)).size,
    category: clips ? 'Creatures' : 'Things',
    clips,
  }));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'app.js', 'style.css']) cpSync(join(here, f), join(out, f));
cpSync(built, join(out, 'built'), { recursive: true, filter: (src) => !src.endsWith('.import') });
writeFileSync(join(out, 'models.json'), JSON.stringify({ models }));
writeFileSync(join(out, '.nojekyll'), '');
console.log(`${models.length} models into ${out}`);
