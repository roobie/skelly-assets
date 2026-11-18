import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';
import type { NeutralModel } from '@skelly/thing-core/schema';
import { type EntryFiles, entryFolder } from '../../../entryFolder.mjs';
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

export interface StoredEntry {
  /** The entry's name in the store, which a full build keeps (`prune`). */
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
  /** As the entry folder's, for a build that ran every row. */
  readonly prune: (keep: ReadonlySet<string>) => void;
}

/**
 * Entries are named by their key, so two exports running at once, even of one row, never write the same entry
 * differently, and a stale or foreign entry is never read under the key of other inputs.
 */
export const entryStore = (store: string, kind: string, code: string): EntryStore => {
  const folder = entryFolder(store, kind);
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
    prune: (keep) => folder.prune(keep),
  };
};

/** The results of a check, as JSON by key, which the check keeps in a folder of the export cache. */
export interface ResultFolder {
  readonly get: (key: string) => unknown;
  readonly put: (key: string, result: unknown) => void;
  /** As the entry folder's, for a check that ran over everything it judges. */
  readonly prune: (keep: ReadonlySet<string>) => void;
}

const RESULT = ['json'];

export const resultFolder = (store: string, kind: string): ResultFolder => {
  const folder = entryFolder(store, kind);
  return {
    get: (key) => {
      const stored = folder.read(key, RESULT);
      return stored && JSON.parse(String(stored.json));
    },
    put: (key, result) => folder.write(key, RESULT, { json: JSON.stringify(result) }),
    prune: (keep) => folder.prune(keep),
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

export const exportCache = (store: string, kind: string, code: string): ExportCache => {
  const entries = entryStore(store, kind, code);
  return {
    export: (row) => {
      if (!row.inputs) {
        return { model: row.generate() };
      }
      let generated: ModelExport | undefined;
      const { key, reused, files } = entries.entry(MODEL_FILES, row.inputs(), () => {
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
