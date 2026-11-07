// Compile package Jsonnet into ignored JSON twins so Node, TypeScript and Vite read the same files.
// Call before importing package code, or run this module directly to refresh the twins.
import { readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileJsonnetFile } from './jsonnet/index.mjs';

const here = import.meta.dirname;
export const jsonnetFiles = (directory = join(here, 'packages')) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      // Tests compile their own fixtures, including deliberately invalid Jsonnet.
      return entry.name === 'node_modules' || entry.name === 'test' ? [] : jsonnetFiles(path);
    }
    return entry.name.endsWith('.jsonnet') ? [path] : [];
  });

export function installJsonnetSources() {
  for (const source of jsonnetFiles()) {
    writeFileSync(source.replace(/\.jsonnet$/, '.json'), compileJsonnetFile(relative(here, source)));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  installJsonnetSources();
}
