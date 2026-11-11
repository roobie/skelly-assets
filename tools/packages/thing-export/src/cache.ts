import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
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
  add('code', code.flatMap((path) => filesUnder(join(root, path), (name) => SOURCE_FILE.test(name))));
  add('data', data.flatMap((path) => filesUnder(join(root, path), () => true)));
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

const ENTRY = /^([0-9a-f]{64})\./;

/**
 * Entries are named by their key, so two exports running at once, even of one row, never write the same entry
 * differently, and a stale or foreign entry is never read under the key of other inputs.
 */
export const entryStore = (dir: string, code: string): EntryStore => {
  mkdirSync(dir, { recursive: true });
  const path = (key: string, name: string) => join(dir, `${key}.${name}`);
  // Each file lands whole, by rename.
  const land = (file: string, data: string | Uint8Array) => {
    const temporary = `${file}.${process.pid}.${threadId}.tmp`;
    writeFileSync(temporary, data);
    renameSync(temporary, file);
  };
  return {
    entry: (names, inputs, generate) => {
      const key = createHash('sha256').update(code).update('\0').update(canonical(inputs)).digest('hex');
      if (existsSync(path(key, names.at(-1)!))) {
        return { key, reused: true, files: Object.fromEntries(names.map((name) => [name, readFileSync(path(key, name))])) };
      }
      const files = generate();
      for (const name of names) {
        land(path(key, name), files[name]!);
      }
      return { key, reused: false, files };
    },
  };
};

/**
 * Removes every entry of the store but those named, so a store that a complete build used holds only what the next
 * build can reuse, rather than one entry per edit ever made.
 */
export const pruneEntries = (dir: string, keep: ReadonlySet<string>): void => {
  if (!existsSync(dir)) {
    return;
  }
  for (const name of readdirSync(dir)) {
    const key = ENTRY.exec(name)?.[1];
    if (key !== undefined && !keep.has(key)) {
      rmSync(join(dir, name), { force: true });
    }
  }
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

const MODEL_FILES = ['glb', 'json'];

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
        model: { modelEntry, partNodes, glb: files.glb as Uint8Array, ...(physical === undefined ? {} : { physical }) },
        entry: { key, reused },
      };
    },
  };
};
