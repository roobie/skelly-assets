// Compile the packages' and the models' Jsonnet into ignored JSON twins so Node, TypeScript and Vite read the same files.
// Await installJsonnetSources before importing package code, or run this module directly to refresh the twins (with
// --digest, to print the digest of their inputs instead).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { compileJsonnetFiles, evaluateJsonnetAsync, libraryPaths } from './jsonnet/index.mjs';
import { INDEX, ROW_DIRS } from './row-index.mjs';

const here = import.meta.dirname;
const repositoryRoot = resolve(here, '..');
let sourcesInstalled = false;

export const jsonnetFiles = (directory) => {
  if (directory === undefined) return [...jsonnetFiles(join(here, 'packages')), ...jsonnetFiles(join(repositoryRoot, 'models'))];
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

// The compiler's library root under `root`, as the compile passes it; see jsonnet/index.mjs, libraryPaths.
const compileRoot = (root) => join(root, 'tools');

const IMPORT = /\bimport(?:str|bin)?\s*@?(['"])((?:\\.|(?!\1).)*)\1/g;
const TEXT_BLOCK_IMPORT = /\bimport(?:str|bin)?\s*\|\|\|/;

// Jsonnet import paths are literals, so a lexical scan finds every import a file can make without evaluating it. Each
// is resolved as go-jsonnet does: beside the importer first, then through the library paths. A match the compiler
// would never import, such as one in a comment, at most widens a closure; only a text-block path could hide one.
const importScanner = (searchPaths) => {
  const direct = new Map();
  const resolveImport = (importer, path) =>
    (isAbsolute(path) ? [path] : [join(dirname(importer), path), ...searchPaths.map((folder) => join(folder, path))])
      .find((candidate) => existsSync(candidate));
  const importsOf = (file) => {
    if (!direct.has(file)) {
      const text = /\.(jsonnet|libsonnet)$/.test(file) ? readFileSync(file, 'utf8') : '';
      if (TEXT_BLOCK_IMPORT.test(text)) throw new Error(`${file}: an import of a text block cannot be traced; import a string literal`);
      const found = [...text.matchAll(IMPORT)].map((match) => resolveImport(file, match[2])).filter(Boolean);
      direct.set(file, [...new Set(found.map((path) => resolve(path)))]);
    }
    return direct.get(file);
  };
  const closure = (file) => {
    const seen = new Set();
    const visit = (path) => {
      if (seen.has(path)) return;
      seen.add(path);
      for (const imported of importsOf(path)) visit(imported);
    };
    visit(resolve(file));
    return [...seen].sort();
  };
  return { importsOf, closure };
};

const sha256 = () => createHash('sha256');

// A unit's key covers the compiler code, the unit and the path and contents of every file in its closure. The resolved
// path is part of it, so a new file that shadows an import changes the key as surely as an edit does.
const unitKeys = (root, code) => {
  const contents = new Map();
  const contentDigest = (path) => {
    if (!contents.has(path)) contents.set(path, sha256().update(readFileSync(path)).digest('hex'));
    return contents.get(path);
  };
  const codeDigest = sha256();
  for (const path of code) codeDigest.update(`code\0${relative(root, path)}\0${contentDigest(path)}\0`);
  const codeKey = codeDigest.digest('hex');
  return (closure, unit) => {
    const hash = sha256().update(`${codeKey}\0unit\0${relative(root, unit)}\0`);
    for (const path of closure) hash.update(`file\0${relative(root, path)}\0${contentDigest(path)}\0`);
    return hash.digest('hex');
  };
};

// Row files are the imports of the row indexes; each compiles on its own into a fragment, its manifested JSON.
const unitPlan = (sources, { root, code, rowIndexes }) => {
  const scanner = importScanner(libraryPaths(compileRoot(root)));
  const keyOf = unitKeys(root, code);
  const unit = (path) => {
    const closure = scanner.closure(path);
    return { path, closure, key: keyOf(closure, path) };
  };
  return {
    rows: [...new Set(rowIndexes.flatMap((index) => scanner.importsOf(resolve(index))))].map(unit),
    twins: sources.map(unit),
  };
};

// Test files run in parallel processes that each refresh the twins, so a reader must never see a half-written file.
const replaceFile = (path, contents) => {
  mkdirSync(dirname(path), { recursive: true });
  const partial = `${path}.${process.pid}.partial`;
  writeFileSync(partial, contents);
  renameSync(partial, path);
};

// The store is content-addressed, so an entry is only ever read under the key of the inputs that made it: a stale or
// foreign store costs a compile, never a wrong twin.
const storeEntry = (store, kind, key) => join(store, kind, `${key}.json`);
const STORE_ENTRY = /^[0-9a-f]{64}\.json$/;

const pruneStore = (store, kind, keys) => {
  const current = new Set(keys.map((key) => `${key}.json`));
  const folder = join(store, kind);
  if (!existsSync(folder)) return;
  for (const name of readdirSync(folder)) {
    if (STORE_ENTRY.test(name) && !current.has(name)) rmSync(join(folder, name), { force: true });
  }
};

const forEachConcurrently = async (items, work) => {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await work(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(availableParallelism(), items.length) }, worker));
};

// A fragment stands in for its row file only when the two cannot differ, so each compile holds its row file to plain
// data, naming the file and field that is not; see jsonnet/plain-data.libsonnet.
const PLAIN_DATA = join(here, 'jsonnet', 'plain-data.libsonnet');
const plainRows = (path) => `(import ${JSON.stringify(PLAIN_DATA)}).rows(import ${JSON.stringify(resolve(path))})`;

const compileFragments = (rows, { root, store }) =>
  forEachConcurrently(rows.filter(({ key }) => !existsSync(storeEntry(store, 'rows', key))), async ({ path, key }) => {
    const fragment = await evaluateJsonnetAsync(plainRows(path), compileRoot(root), { label: relative(root, path) });
    replaceFile(storeEntry(store, 'rows', key), fragment);
  });

// The overlay mirrors each row file's root-relative path onto its fragment, so the row indexes' imports read the
// fragments and the twins' compile skips evaluating every row file again.
const withOverlay = (rows, { root, store }, use) => {
  const overlay = mkdtempSync(join(store, 'overlay-'));
  try {
    for (const { path, key } of rows) {
      const at = join(overlay, relative(root, path));
      mkdirSync(dirname(at), { recursive: true });
      symlinkSync(storeEntry(store, 'rows', key), at);
    }
    return use(overlay);
  } finally {
    rmSync(overlay, { recursive: true, force: true });
  }
};

const readStamp = (stamp) => (existsSync(stamp) ? JSON.parse(readFileSync(stamp, 'utf8')) : {});

// The stamp maps each twin to the key it was written under, so a refresh with nothing changed reads no store. Stale
// twins whose keys the store lacks compile together in one run, which evaluates the catalogue they share once.
export async function refreshJsonnetTwins(sources, { root, stamp, store, code = [], rowIndexes = [] }) {
  const options = { root, store: resolve(store) };
  const { rows, twins } = unitPlan(sources, { root, code, rowIndexes });
  const stamped = readStamp(stamp);
  const stale = twins.filter(({ path, key }) => stamped[relative(root, path)] !== key || !existsSync(twinOf(path)));
  if (stale.length === 0) return;
  const unstored = stale.filter(({ key }) => !existsSync(storeEntry(options.store, 'twins', key)));
  if (unstored.length > 0) {
    const reached = new Set(unstored.flatMap(({ closure }) => closure));
    const needed = rows.filter(({ path }) => reached.has(path));
    mkdirSync(options.store, { recursive: true });
    await compileFragments(needed, options);
    const compiled = withOverlay(needed, options, (overlay) =>
      compileJsonnetFiles(unstored.map(({ path }) => path), compileRoot(root), { overlay }));
    for (const [at, { key }] of unstored.entries()) replaceFile(storeEntry(options.store, 'twins', key), compiled[at]);
  }
  for (const { path, key } of stale) replaceFile(twinOf(path), readFileSync(storeEntry(options.store, 'twins', key)));
  pruneStore(options.store, 'rows', rows.map(({ key }) => key));
  pruneStore(options.store, 'twins', twins.map(({ key }) => key));
  replaceFile(stamp, JSON.stringify(Object.fromEntries(twins.map(({ path, key }) => [relative(root, path), key]))));
}

// This module and the compiler driver and plain-data check beside it; the compiler binary is pinned by
// jsonnet/runtime.json, an input.
export const compilerCode = () => [
  fileURLToPath(import.meta.url),
  ...readdirSync(join(here, 'jsonnet')).filter((name) => /\.(mjs|libsonnet)$/.test(name)).sort().map((name) => join(here, 'jsonnet', name)),
];

const installOptions = () => ({
  root: repositoryRoot,
  stamp: join(here, '.build', 'jsonnet-twins.json'),
  store: process.env.JSONNET_TWIN_STORE || join(here, '.build', 'jsonnet'),
  code: compilerCode(),
  rowIndexes: ROW_DIRS.map((dir) => join(dir, INDEX)),
});

// Every current unit key, so an unchanged tree names exactly the store it last left.
const jsonnetSourcesDigest = () => {
  const { rows, twins } = unitPlan(jsonnetFiles(), installOptions());
  const hash = sha256();
  for (const { key } of [...rows, ...twins]) hash.update(`${key}\0`);
  return hash.digest('hex');
};

// JSONNET_TWIN_STORE names the store folder; CI caches it under the digest that --digest prints.
export async function installJsonnetSources() {
  if (sourcesInstalled) return;
  await refreshJsonnetTwins(jsonnetFiles(), installOptions());
  sourcesInstalled = true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { digest: { type: 'boolean', default: false } } });
  if (values.digest) console.log(jsonnetSourcesDigest());
  else await installJsonnetSources();
}
