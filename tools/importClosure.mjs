// @ts-check
// The files a module runs: itself and every local module and JSON file it imports, through any number of imports. A
// cache keys its entries by the code that made them (packages/thing-export/src/cache.ts, codeFingerprint), and a list of
// that code kept by hand misses the import nobody added to it, which then serves stale entries; the closure cannot.
//
// Imports are found by a lexical scan, as tools/sources.mjs finds Jsonnet's, since a specifier is a literal wherever a
// module names what it runs. A match the runtime would never import, such as one in a string, at most widens a
// closure. An import whose specifier is computed cannot be traced, so it is refused, as is a relative import of a file
// that is not there: a closure that left either out would key an entry by less than made it.
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createRequire, isBuiltin } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = import.meta.dirname;

// A module's types are erased before it runs, so `import type` and a JSDoc `@import` are not followed: what they name
// cannot change what the module makes.
const STATIC = /(?<![@\w.$])(?:import|export)\s+(type\s+)?(?:[^'"`;]*?\bfrom\s*)?(['"])([^'"\n]+)\2/g;
const DYNAMIC = /(?<![@\w.$])import\s*\(\s*(?:(['"`])([^'"`\n]*)\1\s*[,)])?/g;
// A worker thread's module is named by a URL beside the module that starts it (tools/workerPool.mjs).
const WORKER_URL = /\bnew\s+URL\(\s*(['"])(\.[^'"\n]*\.(?:mjs|js|ts))\1\s*,\s*import\.meta\.url\s*\)/g;
const SCANNED = /\.(?:mjs|js|ts|mts)$/;

// The one module that imports by a computed specifier: a pool's thread imports the module its pool was made with,
// which is traced where the pool is made, by the URL that names it or as the importer itself.
const NAMED_BY_THEIR_POOL = new Set([join(here, 'poolWorker.mjs')]);

/**
 * The specifiers `file` imports at runtime.
 * @param {string} file
 * @param {string} text
 */
const specifiersOf = (file, text) => {
  /** @type {string[]} */
  const found = [];
  for (const [, typeOnly, , specifier] of text.matchAll(STATIC)) {
    if (typeOnly === undefined && specifier !== undefined) found.push(specifier);
  }
  for (const [, , specifier] of text.matchAll(DYNAMIC)) {
    if (specifier !== undefined && !specifier.includes('${')) found.push(specifier);
    else if (!NAMED_BY_THEIR_POOL.has(file))
      throw new Error(`${file}: an import of a computed specifier cannot be traced; import a string literal`);
  }
  for (const [, , specifier] of text.matchAll(WORKER_URL)) if (specifier !== undefined) found.push(specifier);
  return found;
};

/**
 * The local file a specifier names, or nothing for a module of the runtime or of node_modules, whose versions the
 * lockfile and the Node version pin. A workspace package resolves through node_modules to its own folder, which is
 * local.
 * @param {string} importer
 * @param {string} specifier
 */
const resolveImport = (importer, specifier) => {
  if (specifier.startsWith('.')) {
    const path = resolve(dirname(importer), specifier);
    if (!existsSync(path) || !statSync(path).isFile())
      throw new Error(`${importer}: imports ${specifier}, which is no file, so its closure cannot be keyed`);
    return realpathSync(path);
  }
  if (isBuiltin(specifier)) return undefined;
  let path;
  try {
    path = realpathSync(createRequire(importer).resolve(specifier));
  } catch {
    // No package of the lockfile: a browser page's import map names it.
    return undefined;
  }
  return path.split(sep).includes('node_modules') ? undefined : path;
};

/** @type {Map<string, string[]>} */
const direct = new Map();
/**
 * @param {string} file
 * @returns {string[]}
 */
const importsOf = (file) => {
  const known = direct.get(file);
  if (known) return known;
  const specifiers = SCANNED.test(file) ? specifiersOf(file, readFileSync(file, 'utf8')) : [];
  const imports = [...new Set(specifiers.flatMap((specifier) => resolveImport(file, specifier) ?? []))];
  direct.set(file, imports);
  return imports;
};

/**
 * Every file the entry modules run, the entries among them, as sorted absolute paths. A module is read once a process,
 * so the closure is of the files as they were when first asked for.
 * @param {readonly (string | URL)[]} entries
 * @returns {string[]}
 */
export const importClosure = (entries) => {
  /** @type {Set<string>} */
  const seen = new Set();
  /** @param {string} file */
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const imported of importsOf(file)) visit(imported);
  };
  for (const entry of entries) visit(realpathSync(entry instanceof URL ? fileURLToPath(entry) : resolve(entry)));
  return [...seen].sort();
};

const LOCKFILE = join(here, 'package-lock.json');

/**
 * The code a cache keys the work of `entries` by, as paths from `root` for codeFingerprint: their import closure, and
 * the lockfile, which pins every module the closure takes from node_modules.
 * @param {string} root
 * @param {readonly (string | URL)[]} entries
 */
export const closureCode = (root, entries) => [LOCKFILE, ...importClosure(entries)].map((file) => relative(root, file));
