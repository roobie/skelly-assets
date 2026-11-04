// Builds the repo's models from their sources in models/ into GLB files.
// Usage: node tools/model/build.mjs [--out dir] [rowId ...]
// With no row ids it builds every id listed in models/export.json; with ids it builds those rows, any row in the
// sources. GLBs are written flat into --out, by default assets/own/skelly, where the game loads them. Needs node
// (26 or later, which runs the TypeScript directly) and `npm ci` in tools/model.
// Adapted from skelly's tools/model-look.mjs (see README.md beside this file).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { compileJsonnetFile } from './jsonnet/index.mjs';

const here = import.meta.dirname;
const repo = resolve(here, '../..');
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: 'string', default: join(repo, 'assets/own/skelly') } },
});
const ids = positionals.length > 0 ? positionals : JSON.parse(readFileSync(join(repo, 'models/export.json'), 'utf8')).ids;
const out = resolve(values.out);
mkdirSync(out, { recursive: true });

// The Jsonnet sources compile to .build (ignored; the JSON they make is never tracked) and the imports of those JSON
// files are pointed there.
const scratch = join(here, '.build');
const jsonnetFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : jsonnetFiles(path);
    }
    return entry.name.endsWith('.jsonnet') ? [path] : [];
  });
for (const source of jsonnetFiles(join(here, 'packages'))) {
  const target = join(scratch, relative(here, source).replace(/\.jsonnet$/, '.json'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, compileJsonnetFile(relative(here, source)));
}
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && specifier.endsWith('.json') && context.parentURL?.startsWith('file:')) {
      const wanted = fileURLToPath(new URL(specifier, context.parentURL));
      const compiled = join(scratch, relative(here, wanted));
      if (existsSync(compiled)) {
        return { url: pathToFileURL(compiled).href, format: 'json', importAttributes: context.importAttributes, shortCircuit: true };
      }
    }
    return next(specifier, context);
  },
});

let failed = false;
try {
  const { loadThingRecipe } = await import('./packages/thing-authoring-tool/src/exports.ts');
  const recipe = loadThingRecipe();
  const missing = ids.filter((id) => !recipe.some((row) => row.id === id));
  if (missing.length > 0) {
    console.log(`not in the model sources: ${missing.join(' ')}`);
    failed = true;
  }
  for (const { id, generate } of recipe.filter((row) => ids.includes(row.id))) {
    try {
      writeFileSync(join(out, `${id}.glb`), generate().glb);
      console.log(`built ${id}.glb`);
    } catch (error) {
      console.log(`EXPORT FAILED ${id}: ${error.message}`);
      failed = true;
    }
  }
} catch (error) {
  // A row error arrives as a long issue dump; one line per issue with its path is what an author needs.
  if (!error.issues) {
    throw error;
  }
  for (const issue of error.issues) {
    console.log(`ROW ERROR ${(issue.path ?? []).map((p) => p.key).join('.')}: ${issue.message} (${JSON.stringify(issue.input)})`);
  }
  failed = true;
}
process.exit(failed ? 1 : 0);
