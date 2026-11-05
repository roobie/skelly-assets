// Compiles the Jsonnet sources under packages/ into .build (ignored; the JSON they make is never tracked) and points
// the imports of those JSON files there. Shared by build.mjs and mobs.mjs; call it once before importing package code.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileJsonnetFile } from './jsonnet/index.mjs';

const here = import.meta.dirname;
const scratch = join(here, '.build');
const jsonnetFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : jsonnetFiles(path);
    }
    return entry.name.endsWith('.jsonnet') ? [path] : [];
  });

export function installJsonnetSources() {
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
}
