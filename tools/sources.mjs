// @ts-check
// Compile the packages' and the models' Jsonnet into ignored JSON twins so Node, TypeScript and Vite read the same files.
// Await installJsonnetSources before importing package code, or run this module directly to refresh the twins (with
// --digest, to print the digest of their inputs instead). Each row file, the finished rows of the sets, the kits and the
// vehicles that tools/row-index.mjs lists, compiles first into a fragment and the heads of its rows, in tiers when one
// row file imports another, and the twins compile over the fragments. A twin's key holds the digest of each fragment
// and of the heads it reads and not the files behind them, so an edit that leaves a fragment or the heads as they were
// recompiles no twin, and one that changes a fragment recompiles only the twins that read it.
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
import { evaluateJsonnetAsync, libraryPaths } from './jsonnet/index.mjs';
import { HEADS, INDEX, ROW_DIRS } from './row-index.mjs';

/** @import { EntryFolder } from './entryFolder.mjs' */
/** @typedef {{ rows: EntryFolder, twins: EntryFolder }} StoreFolders */
/** @typedef {{ path: string, closure: string[], key: string }} Unit A row file, keyed by its whole import closure. */
/** @typedef {{ path: string, closure: string[], standIns: string[] }} Scan A twin's own files and the stood-in files it reads. */
/** @typedef {Scan & { key: string }} Twin A twin, keyed by its own files and the digest of each stand-in. */
/** @typedef {{ fragment: string, heads: string }} RowOutput A row file's rows and their heads, as JSON text. */
/** @typedef {{ root: string, code: readonly string[] }} KeyOptions */
/** @typedef {KeyOptions & { rowIndexes: readonly string[], heads?: string | undefined }} PlanOptions */
/** @typedef {PlanOptions & { folders: StoreFolders }} CompileOptions */
/** @typedef {{ rows: Record<string, [string, string]>, heads?: string, twins: Record<string, string> }} Stamp */
/**
 * @typedef {object} RefreshOptions
 * @property {string} root
 * @property {string} stamp
 * @property {string} store
 * @property {readonly string[]} [code]
 * @property {readonly string[]} [rowIndexes]
 * @property {string} [heads] The file whose heads, in a compile, are those of every row file's fragment.
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
//
// A compile replaces each stand-in file by another through the overlay, which only the library paths see, so an import
// that resolves beside its importer, or by an absolute path, reads the file itself while its importer's key holds the
// stand-in's digest. The scan refuses it: import a stand-in by its root-relative path.
/**
 * @param {readonly string[]} searchPaths
 * @param {ReadonlySet<string>} standIns
 */
const importScanner = (searchPaths, standIns) => {
  /** @type {Map<string, string[]>} */
  const direct = new Map();
  /**
   * @param {string} importer
   * @param {string} path
   */
  const resolveImport = (importer, path) => {
    const beside = isAbsolute(path) ? path : join(dirname(importer), path);
    if (standIns.has(resolve(beside)) && existsSync(beside))
      throw new Error(
        `${importer}: imports ${path}, a file a compile stands in for, from beside it; import it by its root-relative path`,
      );
    return [beside, ...(isAbsolute(path) ? [] : searchPaths.map((folder) => join(folder, path)))].find((candidate) =>
      existsSync(candidate),
    );
  };
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
  /**
   * The files `file` reaches, and with `stopAtStandIns` the stand-ins it reads instead of their files and what they
   * import, which are not its own.
   * @param {string} file
   * @param {boolean} [stopAtStandIns]
   */
  const closure = (file, stopAtStandIns = false) => {
    /** @type {Set<string>} */
    const seen = new Set();
    /** @type {Set<string>} */
    const standing = new Set();
    /** @param {string} path */
    const visit = (path) => {
      if (seen.has(path) || standing.has(path)) return;
      if (stopAtStandIns && standIns.has(path)) {
        standing.add(path);
        return;
      }
      seen.add(path);
      for (const imported of importsOf(path)) visit(imported);
    };
    visit(resolve(file));
    return { files: [...seen].sort(), standIns: [...standing].sort() };
  };
  return { importsOf, closure };
};

const sha256 = () => createHash('sha256');
/** @param {string | Uint8Array} contents */
const digestOf = (contents) => sha256().update(contents).digest('hex');

// A unit's key covers the compiler code, the unit and the path and contents of every file in its closure. The resolved
// path is part of it, so a new file that shadows an import changes the key as surely as an edit does. A stand-in that a
// twin reads counts by its digest, in place of the files behind it.
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
    const digest = digestOf(readFileSync(path));
    contents.set(path, digest);
    return digest;
  };
  const codeDigest = sha256();
  for (const path of code) codeDigest.update(`code\0${relative(root, path)}\0${contentDigest(path)}\0`);
  const codeKey = codeDigest.digest('hex');
  /**
   * @param {readonly string[]} closure
   * @param {string} unit
   * @param {readonly (readonly [string, string])[]} [standIns] Each stand-in's path and digest.
   */
  return (closure, unit, standIns = []) => {
    const hash = sha256().update(`${codeKey}\0unit\0${relative(root, unit)}\0`);
    for (const path of closure) hash.update(`file\0${relative(root, path)}\0${contentDigest(path)}\0`);
    for (const [path, digest] of standIns) hash.update(`stand-in\0${relative(root, path)}\0${digest}\0`);
    return hash.digest('hex');
  };
};

// The units of a path as its files are now. Row files are the imports of the row indexes; each compiles on its own into
// a fragment, its manifested JSON, and keeps its whole import closure as its key. The files that stand in for others
// are the row files, whose fragments the twins read, and the heads file, whose heads they read.
/** @param {PlanOptions} options */
const planNow = ({ root, code, rowIndexes, heads }) => {
  const searchPaths = libraryPaths(compileRoot(root));
  const indexes = importScanner(searchPaths, new Set());
  const rowPaths = [...new Set(rowIndexes.flatMap((index) => indexes.importsOf(resolve(index))))];
  const headsPath = heads === undefined ? undefined : resolve(heads);
  const scanner = importScanner(searchPaths, new Set(headsPath === undefined ? rowPaths : [...rowPaths, headsPath]));
  const keyOf = unitKeys(root, code);
  /**
   * @param {string} path
   * @returns {Unit}
   */
  const row = (path) => {
    const { files } = scanner.closure(path);
    return { path, closure: files, key: keyOf(files, path) };
  };
  return {
    headsPath,
    rows: rowPaths.map(row),
    row,
    /**
     * @param {string} path
     * @returns {Scan}
     */
    scan: (path) => {
      const { files, standIns } = scanner.closure(path, true);
      return { path, closure: files, standIns };
    },
    /**
     * @param {Scan} scan
     * @param {(standIn: string) => string} digest
     * @returns {Twin}
     */
    twin: (scan, digest) => ({
      ...scan,
      key: keyOf(
        scan.closure,
        scan.path,
        scan.standIns.map((path) => [path, digest(path)]),
      ),
    }),
    // The key of a source over its whole closure, which names the inputs before any unit has compiled.
    inputKey: (/** @type {string} */ path) => keyOf(scanner.closure(path).files, path),
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
// a checkout's fragments outlive a stretch of refreshes its stored twins all served. A fragment's entry holds its
// heads too, landing last, so a reader of the heads finds the whole entry.
const FRAGMENT = 'json';
const HEADS_FILE = 'heads';
const ENTRY = [FRAGMENT];
const ROW_ENTRY = [FRAGMENT, HEADS_FILE];
/**
 * @param {string} store
 * @returns {StoreFolders}
 */
const storeFolders = (store) => ({ rows: entryFolder(store, 'rows'), twins: entryFolder(store, 'twins') });
/**
 * @param {EntryFolder} folder
 * @param {string} key
 */
const storedJson = (folder, key) => folder.read(key, ENTRY)?.[FRAGMENT];
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
 * @template {{ path: string }} U
 * @param {EntryFolder} folder
 * @param {readonly string[]} names
 * @param {ReadonlyMap<U, { key: string, files: Record<string, string> }>} compiled Each unit's key and entry files.
 * @param {(unit: U) => string} keyNow The unit's key from its files as they are now.
 */
const storeUnchanged = (folder, names, compiled, keyNow) => {
  /** @type {Set<U>} */
  const changed = new Set();
  for (const [unit, { key, files }] of compiled) {
    if (keyNow(unit) === key) folder.write(key, names, files);
    else changed.add(unit);
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
// data, naming the file and field that is not; see jsonnet/plain-data.libsonnet. The same evaluation projects the rows
// to their heads; see jsonnet/heads.libsonnet.
const PLAIN_DATA = join(here, 'jsonnet', 'plain-data.libsonnet');
const HEADS_LIBRARY = join(here, 'jsonnet', 'heads.libsonnet');
/** @param {string} path */
const rowsWithHeads = (path) =>
  `local rows = (import ${JSON.stringify(PLAIN_DATA)}).rows(import ${JSON.stringify(resolve(path))}); ` +
  `{ rows: rows, heads: (import ${JSON.stringify(HEADS_LIBRARY)}).of(rows) }`;

// A fragment is the Jsonnet it stands in for, so the text keeps what JSON.stringify drops: a negative zero.
const NEGATIVE_ZERO = '\0negative zero';
/** @param {unknown} value */
const jsonText = (value) =>
  JSON.stringify(value, (_key, field) => (Object.is(field, -0) ? NEGATIVE_ZERO : field)).replaceAll(
    `"\\u0000${NEGATIVE_ZERO.slice(1)}"`,
    '-0',
  );

/**
 * The rows in tiers: a row file that reaches another row file is a tier above it, so it compiles over that file's
 * fragment instead of evaluating it again. A cycle of row files has no tier to compile first.
 * @param {readonly Unit[]} rows
 * @returns {Unit[][]}
 */
const rowTiers = (rows) => {
  const byPath = new Map(rows.map((row) => [row.path, row]));
  /** @type {Map<Unit, number>} */
  const tierOf = new Map();
  /** @type {Set<Unit>} */
  const visiting = new Set();
  /**
   * @param {Unit} row
   * @returns {number}
   */
  const tier = (row) => {
    const known = tierOf.get(row);
    if (known !== undefined) return known;
    if (visiting.has(row)) throw new Error(`${row.path}: row files that import each other have no order to compile in`);
    visiting.add(row);
    const reached = row.closure.filter((path) => path !== row.path).flatMap((path) => byPath.get(path) ?? []);
    /** @type {number} */
    const above = reached.reduce((highest, other) => Math.max(highest, tier(other) + 1), 0);
    visiting.delete(row);
    tierOf.set(row, above);
    return above;
  };
  const levels = rows.map(tier);
  return Array.from({ length: Math.max(-1, ...levels) + 1 }, (_, level) =>
    rows.filter((_row, i) => levels[i] === level),
  );
};

// A tier compiles over the fragments of the tiers below it, the stored ones or those just compiled, so a kit that reads
// a set costs its own evaluation and not the set's, and a set file's edit recompiles only the kits that name it.
/**
 * The fragments and heads of the rows the store lacks, each by its row, and the rows whose files changed meanwhile.
 * @param {readonly Unit[]} rows
 * @param {CompileOptions} options
 */
const compileFragments = async (rows, options) => {
  const { root, folders } = options;
  /** @type {Map<Unit, RowOutput>} */
  const outputs = new Map();
  /** @type {Set<Unit>} */
  const changed = new Set();
  /** @type {Unit[]} */
  const below = [];
  for (const tier of rowTiers(rows)) {
    const missing = tier.filter(({ key }) => !existsSync(folders.rows.path(key, HEADS_FILE)));
    const reached = new Set(missing.flatMap(({ closure }) => closure));
    /** @type {Map<Unit, RowOutput>} */
    const compiled = new Map();
    if (missing.length > 0) {
      await withOverlay(
        below.filter(({ path }) => reached.has(path)),
        fragmentsOf(outputs),
        options,
        (overlay) =>
          forEachConcurrently(missing, async (row) => {
            const label = relative(root, row.path);
            const text = await evaluateJsonnetAsync(rowsWithHeads(row.path), compileRoot(root), { label, overlay });
            const { rows: fragment, heads } = JSON.parse(text);
            compiled.set(row, { fragment: jsonText(fragment), heads: jsonText(heads) });
          }),
      );
    }
    const fresh = planNow(options);
    const unchanged = storeUnchanged(
      folders.rows,
      ROW_ENTRY,
      new Map(
        [...compiled].map(([row, { fragment, heads }]) => [
          row,
          { key: row.key, files: { [FRAGMENT]: fragment, [HEADS_FILE]: heads } },
        ]),
      ),
      (row) => fresh.row(row.path).key,
    );
    for (const row of unchanged) changed.add(row);
    for (const [row, output] of compiled) outputs.set(row, output);
    below.push(...tier);
  }
  return { outputs, changed };
};

/**
 * @param {ReadonlyMap<Unit, RowOutput>} outputs
 * @returns {Map<Unit, string>}
 */
const fragmentsOf = (outputs) => new Map([...outputs].map(([row, { fragment }]) => [row, fragment]));

// The overlay mirrors each stand-in's root-relative path onto its stand-in, so the imports of the row indexes read the
// fragments, the imports of the heads read the heads of the fragments, and a compile skips evaluating every row file
// again. It links the stored fragments and holds the ones this refresh compiled, which the store may not take, and the
// stand-in files given beside them. It is the checkout's own, not the store's, so a refresh killed before removing it
// leaves nothing in a store that other users could not prune.
/**
 * @template T
 * @param {readonly Unit[]} rows
 * @param {ReadonlyMap<Unit, string>} fragments
 * @param {{ root: string, folders: StoreFolders }} options
 * @param {(overlay: string) => T | Promise<T>} use
 * @param {Readonly<Record<string, string>>} [files] Other stand-ins, by their root-relative paths.
 * @returns {Promise<T>}
 */
const withOverlay = async (rows, fragments, { root, folders }, use, files = {}) => {
  const overlay = makeBuildDir('jsonnet-overlay');
  /** @param {string} path */
  const placed = (path) => {
    const at = join(overlay, path);
    mkdirSync(dirname(at), { recursive: true });
    return at;
  };
  try {
    for (const row of rows) {
      const at = placed(relative(root, row.path));
      const fragment = fragments.get(row);
      if (fragment === undefined) symlinkSync(folders.rows.path(row.key, FRAGMENT), at);
      else writeFileSync(at, fragment);
    }
    for (const [path, text] of Object.entries(files)) writeFileSync(placed(path), text);
    return await use(overlay);
  } finally {
    rmSync(overlay, { recursive: true, force: true });
  }
};

/**
 * @param {string} stamp
 * @returns {Stamp}
 */
const readStamp = (stamp) => {
  const { rows = {}, heads, twins = {} } = existsSync(stamp) ? JSON.parse(readFileSync(stamp, 'utf8')) : {};
  return { rows, heads, twins };
};

// The row files a refresh needs: those a twin reads as stand-ins, with the row files they reach, and all of them when a
// twin reads the heads, which hold every row file's.
/**
 * @param {readonly Unit[]} rows
 * @param {ReadonlySet<string>} reached The stand-ins the twins read.
 * @param {boolean} readsHeads
 */
const neededRows = (rows, reached, readsHeads) => {
  if (readsHeads) return rows;
  const named = rows.filter(({ path }) => reached.has(path));
  const closure = new Set(named.flatMap((row) => row.closure));
  return rows.filter(({ path }) => closure.has(path));
};

// The heads of every row file, under the file's root-relative path as the heads file lists them.
/**
 * @param {string} root
 * @param {readonly (readonly [Unit, string])[]} headsOfRows Each row file and its heads as JSON text.
 */
const assembledHeads = (root, headsOfRows) =>
  JSON.stringify(
    Object.fromEntries(
      headsOfRows
        .map(([{ path }, heads]) => [relative(root, path), JSON.parse(heads)])
        .sort(([one], [other]) => (one < other ? -1 : 1)),
    ),
  );

// The stamp maps each row file to the key it compiled under and the digest of its fragment, the heads to their digest and each twin to the key
// it was written under, so a refresh with nothing changed reads no store. A row file edited without changing its
// fragment recompiles one fragment and no twin. Twins whose keys the store lacks compile in parallel processes. A twin
// whose files changed during its compile is left unstamped, so the next refresh compiles it from what they are then,
// and so is a row file that changed during its. A twin left unwritten because its bytes are unchanged is stamped like
// any other: its key is current.
/**
 * @param {readonly string[]} sources
 * @param {RefreshOptions} options
 * @returns {Promise<void>}
 */
export async function refreshJsonnetTwins(sources, { root, stamp, store, code = [], rowIndexes = [], heads }) {
  const plan = planNow({ root, code, rowIndexes, heads });
  const scans = sources.map(plan.scan);
  const stamped = readStamp(stamp);
  const reached = new Set(scans.flatMap(({ standIns }) => standIns));
  const readsHeads = plan.headsPath !== undefined && reached.has(plan.headsPath);
  const needed = neededRows(plan.rows, reached, readsHeads);
  const options = { root, code, rowIndexes, heads, folders: storeFolders(resolve(store)) };
  /** @param {Unit} row */
  const stampedDigest = (row) => {
    const [key, digest] = stamped.rows[relative(root, row.path)] ?? [];
    return key === row.key ? digest : undefined;
  };

  // The fragments the store lacks compile once, when the first reader of them asks.
  /** @type {ReturnType<typeof compileFragments> | undefined} */
  let compiling;
  const fragments = () => {
    compiling ??= compileFragments(needed, options);
    return compiling;
  };
  /** @type {Map<string, string>} */
  const digests = new Map();
  /** @type {string | undefined} */
  let headsText;
  const settled = needed.every((row) => stampedDigest(row) !== undefined) && (!readsHeads || stamped.heads);
  if (settled) {
    for (const row of needed) digests.set(row.path, /** @type {string} */ (stampedDigest(row)));
    if (plan.headsPath !== undefined && stamped.heads !== undefined) digests.set(plan.headsPath, stamped.heads);
  } else {
    const { outputs } = await fragments();
    /** @type {[Unit, string][]} */
    const headsOfRows = [];
    for (const row of needed) {
      const made = outputs.get(row);
      if (made) {
        digests.set(row.path, digestOf(made.fragment));
        headsOfRows.push([row, made.heads]);
        continue;
      }
      const stored = options.folders.rows.read(row.key, stampedDigest(row) === undefined ? ROW_ENTRY : [HEADS_FILE]);
      if (stored === undefined) throw new Error(`${relative(root, row.path)}: its fragment is in no store`);
      digests.set(row.path, stampedDigest(row) ?? digestOf(/** @type {Buffer} */ (stored[FRAGMENT])));
      headsOfRows.push([row, /** @type {Buffer} */ (stored[HEADS_FILE]).toString()]);
    }
    if (plan.headsPath !== undefined && readsHeads) {
      headsText = assembledHeads(root, headsOfRows);
      digests.set(plan.headsPath, digestOf(headsText));
    }
  }
  /** @param {string} standIn */
  const digestOfStandIn = (standIn) => {
    const digest = digests.get(standIn);
    if (digest === undefined) throw new Error(`${relative(root, standIn)}: no digest of a file that a twin reads`);
    return digest;
  };
  const twins = scans.map((scan) => plan.twin(scan, digestOfStandIn));
  const stale = twins.filter(
    ({ path, key }) => stamped.twins[relative(root, path)] !== key || !existsSync(twinOf(path)),
  );

  /** @type {Map<Twin, string | Uint8Array>} */
  const stored = new Map();
  for (const twin of stale) {
    const json = storedJson(options.folders.twins, twin.key);
    if (json !== undefined) stored.set(twin, json);
  }
  /** @type {Map<Twin, string>} */
  let compiled = new Map();
  /** @type {Set<Twin>} */
  let changed = new Set();
  const unstored = stale.filter((twin) => !stored.has(twin));
  if (unstored.length > 0) {
    const { outputs } = await fragments();
    for (const [row, { fragment }] of outputs)
      if (digests.get(row.path) !== digestOf(fragment))
        throw new Error(`${relative(root, row.path)}: compiled to another fragment than the one stamped for its key`);
    if (readsHeads) headsText ??= currentHeads(needed, outputs, options, root);
    ({ compiled, changed } = await compileTwins(unstored, needed, outputs, headsText, options, digestOfStandIn));
  }
  for (const [twin, json] of [...stored, ...compiled]) replaceFileIfChanged(twinOf(twin.path), json);

  const current = twins.filter((twin) => !changed.has(twin));
  const changedRows = compiling === undefined ? new Set() : (await compiling).changed;
  /** @type {Stamp} */
  const next = {
    rows: Object.fromEntries(
      needed
        .filter((row) => !changedRows.has(row))
        .map((row) => [relative(root, row.path), [row.key, digestOfStandIn(row.path)]]),
    ),
    ...(readsHeads && plan.headsPath !== undefined ? { heads: digestOfStandIn(plan.headsPath) } : {}),
    twins: Object.fromEntries(current.map(({ path, key }) => [relative(root, path), key])),
  };
  const text = JSON.stringify(next);
  if (stale.length === 0 && existsSync(stamp) && readFileSync(stamp, 'utf8') === text) return;
  pruneStore(options.folders, {
    rows: plan.rows.map(({ key }) => key),
    twins: twins.map(({ key }) => key),
  });
  replaceFile(stamp, text);
}

// The heads of the rows as they are now, when the stamp spared the refresh from reading them: each row file's stored
// heads, or those it just compiled.
/**
 * @param {readonly Unit[]} rows
 * @param {ReadonlyMap<Unit, RowOutput>} outputs
 * @param {CompileOptions} options
 * @param {string} root
 */
const currentHeads = (rows, outputs, { folders }, root) =>
  assembledHeads(
    root,
    rows.map((row) => {
      const heads = outputs.get(row)?.heads ?? folders.rows.read(row.key, [HEADS_FILE])?.[HEADS_FILE]?.toString();
      if (heads === undefined) throw new Error(`${relative(root, row.path)}: its heads are in no store`);
      return [row, heads];
    }),
  );

// Compiles `twins` over the stand-ins they read, storing each twin whose files held still. Returns each twin's JSON by
// its twin, and the twins whose files changed during the compile.
/**
 * @param {readonly Twin[]} twins
 * @param {readonly Unit[]} rows
 * @param {ReadonlyMap<Unit, RowOutput>} outputs
 * @param {string | undefined} headsText
 * @param {CompileOptions} options
 * @param {(standIn: string) => string} digest
 * @returns {Promise<{ compiled: Map<Twin, string>, changed: Set<Twin> }>}
 */
const compileTwins = async (twins, rows, outputs, headsText, options, digest) => {
  const reached = new Set(twins.flatMap(({ standIns }) => standIns));
  const standingIn = rows.filter(({ path }) => reached.has(path));
  const headsFile = options.heads === undefined ? undefined : resolve(options.heads);
  const files =
    headsFile !== undefined && reached.has(headsFile) && headsText !== undefined
      ? { [relative(options.root, headsFile)]: headsText }
      : {};
  /** @type {Map<Twin, string>} */
  const compiled = new Map();
  await withOverlay(
    standingIn,
    fragmentsOf(outputs),
    options,
    (overlay) =>
      forEachConcurrently(twins, async (twin) => {
        const label = relative(options.root, twin.path);
        const json = await evaluateJsonnetAsync(`import ${JSON.stringify(twin.path)}`, compileRoot(options.root), {
          label,
          overlay,
        });
        compiled.set(twin, json);
      }),
    files,
  );
  const fresh = planNow(options);
  const changed = storeUnchanged(
    options.folders.twins,
    ENTRY,
    new Map([...compiled].map(([twin, json]) => [twin, { key: twin.key, files: { [FRAGMENT]: json } }])),
    (twin) => fresh.twin(fresh.scan(twin.path), digest).key,
  );
  return { compiled, changed };
};

// This module and the compiler driver, plain-data check, heads projection and compiler pin beside it, since a store
// shared by checkouts on different branches must not serve one compiler's twins under another's keys.
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
  heads: HEADS,
});

// Every input's key over its whole closure: CI names its store by this digest before the store is restored, when no
// fragment exists to take a digest of, so it keys by the files behind every unit, and an unchanged tree names exactly
// the store it last left.
const jsonnetSourcesDigest = () => {
  const plan = planNow(installOptions());
  const hash = sha256();
  for (const { key } of plan.rows) hash.update(`${key}\0`);
  for (const path of jsonnetFiles()) hash.update(`${plan.inputKey(path)}\0`);
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
