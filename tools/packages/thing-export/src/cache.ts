import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { threadId } from 'node:worker_threads';
import type { NeutralModel } from '@skelly/thing-core/schema';
import type { ModelExport, ModelPhysical, RecipeExport } from './recipe.ts';

const SOURCE_FILE = /\.(ts|mjs|js)$/;
const TEST_FILE = /\.test\.(ts|mjs|js)$/;
const SKIPPED_FOLDER = new Set(['node_modules', 'test']);
const filesUnder = (path: string, wanted: (name: string) => boolean): string[] =>
  statSync(path).isFile()
    ? [path]
    : readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
        const inner = join(path, entry.name);
        if (entry.isDirectory()) {
          return SKIPPED_FOLDER.has(entry.name) ? [] : filesUnder(inner, wanted);
        }
        return wanted(entry.name) && !TEST_FILE.test(entry.name) ? [inner] : [];
      });

/**
 * Hashes the generator code (directories and files), the data files that code imports and the runtime that runs it, so
 * a change to any of them misses every entry. Only the source files of a code path count, since a row's own inputs
 * carry the data its export reads; a data path counts whole, for data the code reads whatever the row.
 */
export const codeFingerprint = (root: string, code: readonly string[], data: readonly string[] = []): string => {
  const hash = createHash('sha256').update(process.version).update('\0');
  const add = (role: string, files: readonly string[]) => {
    for (const file of [...files].sort()) {
      hash.update(role).update('\0').update(relative(root, file)).update('\0').update(readFileSync(file)).update('\0');
    }
  };
  add(
    'code',
    code.flatMap((path) => filesUnder(join(root, path), (name) => SOURCE_FILE.test(name))),
  );
  add(
    'data',
    data.flatMap((path) => filesUnder(join(root, path), () => true)),
  );
  return hash.digest('hex');
};

/** Deterministic JSON for hashing: object keys sorted at every depth. */
const byKey = ([a]: [string, unknown], [b]: [string, unknown]): number => (a < b ? -1 : Number(a > b));
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, inner: unknown) =>
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(byKey))
      : inner,
  );

/** An export's files by name, as generated or as read back from the store. */
export type EntryFiles = Readonly<Record<string, string | Uint8Array>>;
export interface StoredEntry {
  /** The entry's name in the store, which a full build keeps (`pruneEntries`). */
  readonly key: string;
  /** Whether the files came from the store rather than from generating them. */
  readonly reused: boolean;
  readonly files: EntryFiles;
}
export interface EntryStore {
  /**
   * The files stored under the key of `inputs` and the code, or generated and stored. `names` lists every file an
   * entry holds; the last lands last, so a reader that finds it finds the whole entry.
   */
  readonly entry: (names: readonly string[], inputs: unknown, generate: () => EntryFiles) => StoredEntry;
}

const ENTRY = /^([0-9a-f]+)\./;

const DAY_MS = 24 * 60 * 60 * 1000;
/**
 * How long a shared store keeps an entry that no build has used. Its builds come from other worktrees and users, so
 * one complete build cannot name the entries the others still reuse; a week spans a branch left aside for a few days
 * without keeping every code change's full set of models for long.
 */
export const SHARED_ENTRY_LIFE_MS = 7 * DAY_MS;
// A reuse refreshes an entry's age at most daily, so a build that reuses every model rewrites few of them.
const REFRESH_AFTER_MS = DAY_MS;

const SETGID = 0o2000;
const GROUP_WRITE = 0o020;
/**
 * A folder is shared when it is setgid, so what is made in it keeps its group, and its group may write in it: that is
 * how a store shared by several users is set up, and a store a build makes for itself is neither.
 */
const isShared = (dir: string): boolean => {
  const { mode } = statSync(dir);
  return (mode & SETGID) !== 0 && (mode & GROUP_WRITE) !== 0;
};
// The group gets the access the owner has, since the umask of whoever made the path may withhold it.
const shareWithGroup = (path: string): void => {
  const { mode } = statSync(path);
  chmodSync(path, (mode & 0o7777) | ((mode & 0o700) >> 3));
};

/** Makes `dir` and its missing parents, each shared with the group when the folder it is made in is shared. */
const makeFolder = (dir: string): void => {
  const target = resolve(dir);
  const first = mkdirSync(target, { recursive: true });
  if (first === undefined) {
    return;
  }
  const made: string[] = [];
  for (let at = target; at.length >= first.length; at = dirname(at)) {
    made.unshift(at);
  }
  for (const at of made) {
    if (isShared(dirname(at))) {
      shareWithGroup(at);
    }
  }
};

/**
 * A folder of entries, each a set of files named `<key>.<name>`, which every store of the cache keeps its results in.
 * Each file lands whole, by rename, and an entry's files land in the order named, so a reader that finds the last
 * finds the whole entry.
 */
export interface EntryFolder {
  /** An entry's files, or undefined when its last is missing; a reuse in a shared folder refreshes the entry's age. */
  readonly read: (key: string, names: readonly string[]) => Record<string, Buffer> | undefined;
  readonly write: (key: string, names: readonly string[], files: EntryFiles) => void;
  /** Where an entry's file lies, for a reader that must name the file rather than read it, such as a link to it. */
  readonly path: (key: string, name: string) => string;
}

export const entryFolder = (dir: string): EntryFolder => {
  makeFolder(dir);
  const shared = isShared(dir);
  const path = (key: string, name: string) => join(dir, `${key}.${name}`);
  const land = (file: string, data: string | Uint8Array) => {
    const temporary = `${file}.${process.pid}.${threadId}.tmp`;
    writeFileSync(temporary, data);
    if (shared) {
      shareWithGroup(temporary);
    }
    renameSync(temporary, file);
  };
  // Landing anew rather than touching, since only a file's owner may set its times and a shared entry has many users.
  const write = (key: string, names: readonly string[], files: EntryFiles) => {
    for (const name of names) {
      land(path(key, name), files[name]!);
    }
  };
  return {
    read: (key, names) => {
      const last = statSync(path(key, names.at(-1)!), { throwIfNoEntry: false });
      if (last === undefined) {
        return undefined;
      }
      const files = Object.fromEntries(names.map((name) => [name, readFileSync(path(key, name))]));
      if (shared && Date.now() - last.mtimeMs > REFRESH_AFTER_MS) {
        write(key, names, files);
      }
      return files;
    },
    write,
    path,
  };
};

/**
 * Entries are named by their key, so two exports running at once, even of one row, never write the same entry
 * differently, and a stale or foreign entry is never read under the key of other inputs.
 */
export const entryStore = (dir: string, code: string): EntryStore => {
  const folder = entryFolder(dir);
  return {
    entry: (names, inputs, generate) => {
      const key = createHash('sha256').update(code).update('\0').update(canonical(inputs)).digest('hex');
      const stored = folder.read(key, names);
      if (stored) {
        return { key, reused: true, files: stored };
      }
      const files = generate();
      folder.write(key, names, files);
      return { key, reused: false, files };
    },
  };
};

/**
 * Removes the entries a complete build did not use, so a store holds what the next build can reuse rather than one
 * entry per edit ever made. A private store keeps only those the build named; a shared store also keeps each entry
 * some build used within SHARED_ENTRY_LIFE_MS. An entry's files go together, judged by the newest, so a reader never
 * finds part of one.
 */
export const pruneEntries = (dir: string, keep: ReadonlySet<string>, now = Date.now()): void => {
  if (!existsSync(dir)) {
    return;
  }
  const unused = new Map<string, string[]>();
  for (const name of readdirSync(dir)) {
    const key = ENTRY.exec(name)?.[1];
    if (key !== undefined && !keep.has(key)) {
      unused.set(key, [...(unused.get(key) ?? []), name]);
    }
  }
  const shared = isShared(dir);
  const lastUse = (names: readonly string[]) =>
    Math.max(...names.map((name) => statSync(join(dir, name), { throwIfNoEntry: false })?.mtimeMs ?? 0));
  for (const names of unused.values()) {
    if (!shared || now - lastUse(names) > SHARED_ENTRY_LIFE_MS) {
      for (const name of names) {
        rmSync(join(dir, name), { force: true });
      }
    }
  }
};

/** The results of a check, as JSON by key, which the check keeps in a folder of the export cache. */
export interface ResultFolder {
  readonly get: (key: string) => unknown;
  readonly put: (key: string, result: unknown) => void;
  /** As `pruneEntries`, for a check that ran over everything it judges. */
  readonly prune: (keep: ReadonlySet<string>) => void;
}

const RESULT = ['json'];

export const resultFolder = (dir: string): ResultFolder => {
  const folder = entryFolder(dir);
  return {
    get: (key) => {
      const stored = folder.read(key, RESULT);
      return stored && JSON.parse(String(stored.json));
    },
    put: (key, result) => folder.write(key, RESULT, { json: JSON.stringify(result) }),
    prune: (keep) => pruneEntries(dir, keep),
  };
};

/** A row's export, and its entry in the cache when the row declares its inputs. */
export interface CachedExport {
  readonly model: ModelExport;
  readonly entry?: { readonly key: string; readonly reused: boolean };
}
export interface ExportCache {
  /** The row's export from the cache, or generated and stored; a row that declares no inputs is always generated. */
  readonly export: (row: RecipeExport) => CachedExport;
}

const MODEL_FILES = ['glb', 'smooth.glb', 'json'];

export const exportCache = (dir: string, code: string): ExportCache => {
  const store = entryStore(dir, code);
  return {
    export: (row) => {
      if (!row.inputs) {
        return { model: row.generate() };
      }
      let generated: ModelExport | undefined;
      const { key, reused, files } = store.entry(MODEL_FILES, row.inputs(), () => {
        generated = row.generate();
        return {
          glb: generated.glb,
          'smooth.glb': generated.smoothGlb,
          json: JSON.stringify({
            modelEntry: generated.modelEntry,
            partNodes: generated.partNodes,
            physical: generated.physical,
          }),
        };
      });
      if (generated) {
        return { model: generated, entry: { key, reused } };
      }
      const { modelEntry, partNodes, physical } = JSON.parse(String(files.json)) as {
        modelEntry: NeutralModel;
        partNodes: string[];
        physical?: ModelPhysical;
      };
      return {
        model: {
          modelEntry,
          partNodes,
          glb: files.glb as Uint8Array,
          smoothGlb: files['smooth.glb'] as Uint8Array,
          ...(physical === undefined ? {} : { physical }),
        },
        entry: { key, reused },
      };
    },
  };
};
