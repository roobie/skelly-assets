// Compile package Jsonnet into ignored JSON twins so Node, TypeScript and Vite read the same files.
// Call before importing package code, or run this module directly to refresh the twins (with --digest, to print the
// digest of their inputs instead).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
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

// A store folder keeps the last compile's twins under its input digest, so a fresh checkout whose inputs hash the
// same, such as a later CI job of one commit, takes them instead of compiling. A twin is read from the store only
// under the digest of the current inputs, so a stale or foreign store costs a compile and never a wrong twin.
const storedTwin = (store, digest, root, source) => join(store, digest, relative(root, twinOf(source)));

export function refreshJsonnetTwins(sources, { root, stamp, store }) {
  const digest = inputsDigest(root, sources);
  const current = existsSync(stamp) && readFileSync(stamp, 'utf8') === digest;
  if (current && sources.every((source) => existsSync(twinOf(source)))) return;
  rmSync(stamp, { force: true });
  const stored = store !== undefined && sources.every((source) => existsSync(storedTwin(store, digest, root, source)));
  const twins = stored
    ? sources.map((source) => readFileSync(storedTwin(store, digest, root, source)))
    : compileJsonnetFiles(sources);
  for (const [at, source] of sources.entries()) replaceFile(twinOf(source), twins[at]);
  if (store !== undefined && !stored) {
    rmSync(store, { recursive: true, force: true });
    for (const [at, source] of sources.entries()) {
      mkdirSync(dirname(storedTwin(store, digest, root, source)), { recursive: true });
      writeFileSync(storedTwin(store, digest, root, source), twins[at]);
    }
  }
  mkdirSync(dirname(stamp), { recursive: true });
  replaceFile(stamp, digest);
}

export const jsonnetSourcesDigest = () => inputsDigest(repositoryRoot, jsonnetFiles());

// JSONNET_TWIN_STORE names the store folder; CI caches it under the digest that --digest prints.
export function installJsonnetSources() {
  if (sourcesInstalled) return;
  refreshJsonnetTwins(jsonnetFiles(), {
    root: repositoryRoot,
    stamp: join(here, '.build', 'jsonnet-sources.sha256'),
    store: process.env.JSONNET_TWIN_STORE || undefined,
  });
  sourcesInstalled = true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { digest: { type: 'boolean', default: false } } });
  if (values.digest) console.log(jsonnetSourcesDigest());
  else installJsonnetSources();
}
