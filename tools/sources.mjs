// Compile package Jsonnet into ignored JSON twins so Node, TypeScript and Vite read the same files.
// Call before importing package code, or run this module directly to refresh the twins.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileJsonnetFiles } from './jsonnet/index.mjs';

const here = import.meta.dirname;
const repositoryRoot = resolve(here, '..');
const skippedDirectories = new Set(['node_modules', 'built', 'dist', '_site']);
let sourcesInstalled = false;

export const jsonnetFiles = (directory) => {
  if (directory === undefined) return [...jsonnetFiles(join(here, 'packages')), ...jsonnetFiles(resolve(here, '../models/recipes'))];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      // Tests compile their own fixtures, including deliberately invalid Jsonnet.
      return entry.name === 'node_modules' || entry.name === 'test' ? [] : jsonnetFiles(path);
    }
    return entry.name.endsWith('.jsonnet') ? [path] : [];
  });
};

const twinOf = (source) => source.replace(/\.jsonnet$/, '.json');

const importableFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name.startsWith('.') || skippedDirectories.has(entry.name) ? [] : importableFiles(path);
    }
    if (entry.name.endsWith('.json')) return existsSync(path.replace(/\.json$/, '.jsonnet')) ? [] : [path];
    return /\.(jsonnet|libsonnet)$/.test(entry.name) ? [path] : [];
  });

const inputsDigest = (root, sources) => {
  const hash = createHash('sha256');
  for (const source of sources) hash.update(`source\0${relative(root, source)}\0`);
  for (const path of importableFiles(root).sort()) hash.update(`file\0${relative(root, path)}\0`).update(readFileSync(path));
  return hash.digest('hex');
};

// The compile takes most of a minute and every package pre-script runs it, so unchanged inputs reuse the twins. The
// digest covers every importable file under `root` rather than tracing imports, so no import can leave a twin stale.
// Test files run in parallel processes that each refresh the twins, so a reader must never see a half-written file.
const replaceFile = (path, contents) => {
  const partial = `${path}.${process.pid}.partial`;
  writeFileSync(partial, contents);
  renameSync(partial, path);
};

export function refreshJsonnetTwins(sources, { root, stamp }) {
  const digest = inputsDigest(root, sources);
  const current = existsSync(stamp) && readFileSync(stamp, 'utf8') === digest;
  if (current && sources.every((source) => existsSync(twinOf(source)))) return;
  rmSync(stamp, { force: true });
  const twins = compileJsonnetFiles(sources);
  for (const [at, source] of sources.entries()) replaceFile(twinOf(source), twins[at]);
  mkdirSync(dirname(stamp), { recursive: true });
  replaceFile(stamp, digest);
}

export function installJsonnetSources() {
  if (sourcesInstalled) return;
  refreshJsonnetTwins(jsonnetFiles(), { root: repositoryRoot, stamp: join(here, '.build', 'jsonnet-sources.sha256') });
  sourcesInstalled = true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  installJsonnetSources();
}
