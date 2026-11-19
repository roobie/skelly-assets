// @ts-check
// Compile the packages' and the models' Jsonnet into ignored JSON twins so Node, TypeScript and Vite read the same files.
// Await installJsonnetSources before importing package code, or run this module directly to refresh the twins (with
// --digest, to print the digest of their inputs instead).
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { BUILD_ROOT, makeBuildDir } from './buildDir.mjs';
import { entryFolder } from './entryFolder.mjs';
import { compileJsonnetFiles, evaluateJsonnetAsync, libraryPaths } from './jsonnet/index.mjs';
import { INDEX, ROW_DIRS } from './row-index.mjs';

/** @import { EntryFolder } from './entryFolder.mjs' */
/** @typedef {{ rows: EntryFolder, twins: EntryFolder }} StoreFolders */
/** @typedef {{ path: string, closure: string[], key: string }} Unit */
/** @typedef {{ root: string, code: readonly string[] }} KeyOptions */
/** @typedef {KeyOptions & { rowIndexes: readonly string[] }} PlanOptions */
/** @typedef {KeyOptions & { folders: StoreFolders }} CompileOptions */
/**
 * @typedef {object} RefreshOptions
 * @property {string} root
 * @property {string} stamp
 * @property {string} store
 * @property {readonly string[]} [code]
 * @property {readonly string[]} [rowIndexes]
 */

const here = import.meta.dirname;
const repositoryRoot = resolve(here, '..');
let sourcesInstalled = false;

/**
 * @param {string} [directory]
 * @returns {string[]}
 */
export const jsonnetFiles = (directory) => {
  if (directory === undefined)
    return [...jsonnetFiles(join(here, 'packages')), ...jsonnetFiles(join(repositoryRoot, 'models'))];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      // Tests compile their own fixtures, including deliberately invalid Jsonnet.
      return entry.name === 'node_modules' || entry.name === 'test' ? [] : jsonnetFiles(path);
    }
    return entry.name.endsWith('.jsonnet') ? [path] : [];
  });
};

/** @param {string} source */
const twinOf = (source) => source.replace(/\.jsonnet$/, '.json');

/**
 * The compiler's library root under `root`, as the compile passes it; see jsonnet/index.mjs, libraryPaths.
 * @param {string} root
 */
const compileRoot = (root) => join(root, 'tools');

const IMPORT = /\bimport(?:str|bin)?\s*@?(['"])((?:\\.|(?!\1).)*)\1/g;
const TEXT_BLOCK_IMPORT = /\bimport(?:str|bin)?\s*\|\|\|/;

// Jsonnet import paths are literals, so a lexical scan finds every import a file can make without evaluating it. Each
// is resolved as go-jsonnet does: beside the importer first, then through the library paths. A match the compiler
// would never import, such as one in a comment, at most widens a closure; only a text-block path could hide one.
/** @param {readonly string[]} searchPaths */
const importScanner = (searchPaths) => {
  /** @type {Map<string, string[]>} */
  const direct = new Map();
  /**
   * @param {string} importer
   * @param {string} path
   */
  const resolveImport = (importer, path) =>
    (isAbsolute(path)
      ? [path]
      : [join(dirname(importer), path), ...searchPaths.map((folder) => join(folder, path))]
    ).find((candidate) => existsSync(candidate));
  /**
   * @param {string} file
   * @returns {string[]}
   */
  const importsOf = (file) => {
    const known = direct.get(file);
    if (known) return known;
    const text = /\.(jsonnet|libsonnet)$/.test(file) ? readFileSync(file, 'utf8') : '';
    if (TEXT_BLOCK_IMPORT.test(text))
      throw new Error(`${file}: an import of a text block cannot be traced; import a string literal`);
    const found = [...text.matchAll(IMPORT)]
      .map((match) => match[2])
      .filter((path) => path !== undefined)
      .map((path) => resolveImport(file, path))
      .filter((path) => path !== undefined);
    const imports = [...new Set(found.map((path) => resolve(path)))];
    direct.set(file, imports);
    return imports;
  };
  /** @param {string} file */
  const closure = (file) => {
    /** @type {Set<string>} */
    const seen = new Set();
    /** @param {string} path */
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
/**
 * @param {string} root
 * @param {readonly string[]} code
 */
const unitKeys = (root, code) => {
  /** @type {Map<string, string>} */
  const contents = new Map();
  /** @param {string} path */
  const contentDigest = (path) => {
    const known = contents.get(path);
    if (known !== undefined) return known;
    const digest = sha256().update(readFileSync(path)).digest('hex');
    contents.set(path, digest);
    return digest;
  };
  const codeDigest = sha256();
  for (const path of code) codeDigest.update(`code\0${relative(root, path)}\0${contentDigest(path)}\0`);
  const codeKey = codeDigest.digest('hex');
  /**
   * @param {readonly string[]} closure
   * @param {string} unit
   */
  return (closure, unit) => {
    const hash = sha256().update(`${codeKey}\0unit\0${relative(root, unit)}\0`);
    for (const path of closure) hash.update(`file\0${relative(root, path)}\0${contentDigest(path)}\0`);
    return hash.digest('hex');
  };
};

/**
 * Each unit of a path as its files are now: its closure and its key.
 * @param {KeyOptions} options
 */
const unitsNow = ({ root, code }) => {
  const scanner = importScanner(libraryPaths(compileRoot(root)));
  const keyOf = unitKeys(root, code);
  /**
   * @param {string} path
   * @returns {Unit}
   */
  const unit = (path) => {
    const closure = scanner.closure(path);
    return { path, closure, key: keyOf(closure, path) };
  };
  return { scanner, unit };
};

/**
 * Row files are the imports of the row indexes; each compiles on its own into a fragment, its manifested JSON.
 * @param {readonly string[]} sources
 * @param {PlanOptions} options
 */
const unitPlan = (sources, { root, code, rowIndexes }) => {
  const { scanner, unit } = unitsNow({ root, code });
  return {
    rows: [...new Set(rowIndexes.flatMap((index) => scanner.importsOf(resolve(index))))].map(unit),
    twins: sources.map(unit),
  };
};

/**
 * Test files run in parallel processes that each refresh the twins, so a reader must never see a half-written file.
 * @param {string} path
 * @param {string | Uint8Array} contents
 */
const replaceFile = (path, contents) => {
  mkdirSync(dirname(path), { recursive: true });
  const partial = `${path}.${process.pid}.partial`;
  writeFileSync(partial, contents);
  renameSync(partial, path);
};

// A twin whose bytes are already on disk is left alone, mtime included: a dev server watching the twins reloads on
// every write, and an edit reaches many twins that come out as they were.
/**
 * @param {string} path
 * @param {string | Uint8Array} contents
 */
const replaceFileIfChanged = (path, contents) => {
  try {
    if (readFileSync(path).equals(typeof contents === 'string' ? Buffer.from(contents) : contents)) return;
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ENOENT') throw error;
  }
  replaceFile(path, contents);
};

// The store is content-addressed, so an entry is only ever read under the key of the inputs that made it: a stale or
// foreign store costs a compile, never a wrong twin. It keeps its entries as the export cache does, so worktrees and
// users on one host can share it as they share that cache: a shared store keeps what other checkouts still use. A
// refresh's prune names every current fragment and twin, which counts them as used even when no compile read them, so
// a checkout's fragments outlive a stretch of refreshes its stored twins all served.
const ENTRY_FILE = 'json';
const ENTRY = [ENTRY_FILE];
/**
 * @param {string} store
 * @returns {StoreFolders}
 */
const storeFolders = (store) => ({ rows: entryFolder(store, 'rows'), twins: entryFolder(store, 'twins') });
/**
 * @param {EntryFolder} folder
 * @param {string} key
 */
const storedJson = (folder, key) => folder.read(key, ENTRY)?.json;
/**
 * @param {StoreFolders} folders
 * @param {{ [kind in keyof StoreFolders]: readonly string[] }} keys
 */
const pruneStore = (folders, keys) => {
  folders.rows.prune(new Set(keys.rows));
  folders.twins.prune(new Set(keys.twins));
};

// go-jsonnet reads the files again after the plan keyed them, so a file edited meanwhile would put one content's output
// under another's key, which a shared store would serve to every checkout on the keyed content. The compiled units are
// keyed afresh, and only those whose key held go into the store; an edit undone within the compile goes unseen. The
// others are returned: their output still serves this checkout, until the next refresh compiles them again.
/**
 * @param {EntryFolder} folder
 * @param {ReadonlyMap<Unit, string>} compiled
 * @param {KeyOptions} options
 */
const storeUnchanged = (folder, compiled, options) => {
  const { unit } = unitsNow(options);
  /** @type {Set<Unit>} */
  const changed = new Set();
  for (const [compiledUnit, json] of compiled) {
    if (unit(compiledUnit.path).key === compiledUnit.key) folder.write(compiledUnit.key, ENTRY, { json });
    else changed.add(compiledUnit);
  }
  return changed;
};

/**
 * @template T
 * @param {readonly T[]} items
 * @param {(item: T) => Promise<void>} work
 */
const forEachConcurrently = async (items, work) => {
  // The workers share one iterator, so each item goes to whichever worker is free first.
  const queue = items.values();
  const worker = async () => {
    for (const item of queue) await work(item);
  };
  await Promise.all(Array.from({ length: Math.min(availableParallelism(), items.length) }, worker));
};

// A fragment stands in for its row file only when the two cannot differ, so each compile holds its row file to plain
// data, naming the file and field that is not; see jsonnet/plain-data.libsonnet.
const PLAIN_DATA = join(here, 'jsonnet', 'plain-data.libsonnet');
/** @param {string} path */
const plainRows = (path) => `(import ${JSON.stringify(PLAIN_DATA)}).rows(import ${JSON.stringify(resolve(path))})`;

/**
 * The fragments of the rows the store lacks, each by its row.
 * @param {readonly Unit[]} rows
 * @param {CompileOptions} options
 */
const compileFragments = async (rows, { root, folders }) => {
  /** @type {Map<Unit, string>} */
  const fragments = new Map();
  await forEachConcurrently(
    rows.filter(({ key }) => !existsSync(folders.rows.path(key, ENTRY_FILE))),
    async (row) => {
      const label = relative(root, row.path);
      fragments.set(row, await evaluateJsonnetAsync(plainRows(row.path), compileRoot(root), { label }));
    },
  );
  return fragments;
};

// The overlay mirrors each row file's root-relative path onto its fragment, so the row indexes' imports read the
// fragments and the twins' compile skips evaluating every row file again. It links the stored fragments and holds the
// ones this refresh compiled, which the store may not take. It is the checkout's own, not the store's, so a refresh
// killed before removing it leaves nothing in a store that other users could not prune.
/**
 * @template T
 * @param {readonly Unit[]} rows
 * @param {ReadonlyMap<Unit, string>} fragments
 * @param {CompileOptions} options
 * @param {(overlay: string) => T} use
 * @returns {T}
 */
const withOverlay = (rows, fragments, { root, folders }, use) => {
  const overlay = makeBuildDir('jsonnet-overlay');
  try {
    for (const row of rows) {
      const at = join(overlay, relative(root, row.path));
      mkdirSync(dirname(at), { recursive: true });
      const fragment = fragments.get(row);
      if (fragment === undefined) symlinkSync(folders.rows.path(row.key, ENTRY_FILE), at);
      else writeFileSync(at, fragment);
    }
    return use(overlay);
  } finally {
    rmSync(overlay, { recursive: true, force: true });
  }
};

// Compiles `twins` over the fragments of the rows they reach, storing each unit whose files held still. Returns each
// twin's JSON by its unit, and the twins whose files changed during the compile.
/**
 * @param {readonly Unit[]} twins
 * @param {readonly Unit[]} rows
 * @param {CompileOptions} options
 * @returns {Promise<{ compiled: Map<Unit, string>, changed: Set<Unit> }>}
 */
const compileTwins = async (twins, rows, options) => {
  if (twins.length === 0) return { compiled: new Map(), changed: new Set() };
  const reached = new Set(twins.flatMap(({ closure }) => closure));
  const needed = rows.filter(({ path }) => reached.has(path));
  const fragments = await compileFragments(needed, options);
  storeUnchanged(options.folders.rows, fragments, options);
  const outputs = withOverlay(needed, fragments, options, (overlay) =>
    compileJsonnetFiles(
      twins.map(({ path }) => path),
      compileRoot(options.root),
      { overlay },
    ),
  );
  /** @type {Map<Unit, string>} */
  const compiled = new Map();
  for (const [at, json] of outputs.entries()) {
    const twin = twins[at];
    if (twin !== undefined) compiled.set(twin, json);
  }
  return { compiled, changed: storeUnchanged(options.folders.twins, compiled, options) };
};

/**
 * @param {string} stamp
 * @returns {Record<string, string>}
 */
const readStamp = (stamp) => (existsSync(stamp) ? JSON.parse(readFileSync(stamp, 'utf8')) : {});

// The stamp maps each twin to the key it was written under, so a refresh with nothing changed reads no store. Stale
// twins whose keys the store lacks compile together in one run, which evaluates the catalogue they share once. A twin
// whose files changed during its compile is left unstamped, so the next refresh compiles it from what they are then. A
// twin left unwritten because its bytes are unchanged is stamped like any other: its key is current.
/**
 * @param {readonly string[]} sources
 * @param {RefreshOptions} options
 * @returns {Promise<void>}
 */
export async function refreshJsonnetTwins(sources, { root, stamp, store, code = [], rowIndexes = [] }) {
  const { rows, twins } = unitPlan(sources, { root, code, rowIndexes });
  const stamped = readStamp(stamp);
  const stale = twins.filter(({ path, key }) => stamped[relative(root, path)] !== key || !existsSync(twinOf(path)));
  if (stale.length === 0) return;
  const options = { root, code, folders: storeFolders(resolve(store)) };
  /** @type {Map<Unit, string | Uint8Array>} */
  const stored = new Map();
  for (const twin of stale) {
    const json = storedJson(options.folders.twins, twin.key);
    if (json !== undefined) stored.set(twin, json);
  }
  const unstored = stale.filter((twin) => !stored.has(twin));
  const { compiled, changed } = await compileTwins(unstored, rows, options);
  for (const [twin, json] of [...stored, ...compiled]) replaceFileIfChanged(twinOf(twin.path), json);
  pruneStore(options.folders, {
    rows: rows.map(({ key }) => key),
    twins: twins.map(({ key }) => key),
  });
  const current = twins.filter((twin) => !changed.has(twin));
  replaceFile(stamp, JSON.stringify(Object.fromEntries(current.map(({ path, key }) => [relative(root, path), key]))));
}

// This module and the compiler driver, plain-data check and compiler pin beside it, since a store shared by checkouts
// on different branches must not serve one compiler's twins under another's keys.
const COMPILER_FILE = /\.(mjs|libsonnet)$|^runtime\.json$/;
export const compilerCode = () => [
  fileURLToPath(import.meta.url),
  ...readdirSync(join(here, 'jsonnet'))
    .filter((name) => COMPILER_FILE.test(name))
    .sort()
    .map((name) => join(here, 'jsonnet', name)),
];

const installOptions = () => ({
  root: repositoryRoot,
  stamp: join(BUILD_ROOT, 'jsonnet-twins.json'),
  store: process.env.JSONNET_TWIN_STORE || join(BUILD_ROOT, 'jsonnet'),
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

// Every twin made current now, for a long-running process whose sources change under it; a refresh with nothing changed
// reads no store.
export const refreshJsonnetSources = () => refreshJsonnetTwins(jsonnetFiles(), installOptions());

// JSONNET_TWIN_STORE names the store folder; CI caches it under the digest that --digest prints.
export async function installJsonnetSources() {
  if (sourcesInstalled) return;
  await refreshJsonnetSources();
  sourcesInstalled = true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { digest: { type: 'boolean', default: false } } });
  if (values.digest) console.log(jsonnetSourcesDigest());
  else await installJsonnetSources();
}
