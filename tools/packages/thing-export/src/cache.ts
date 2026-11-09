import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';
import { threadId } from 'node:worker_threads';
import type { NeutralModel } from '@skelly/thing-core/schema';
import type { ModelExport, RecipeExport } from './recipe.ts';

const SOURCE_FILE = /\.(ts|mjs|js)$/;
const TEST_FILE = /\.test\.(ts|mjs|js)$/;
const sourceFiles = (path: string): string[] =>
  statSync(path).isFile()
    ? [path]
    : readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
        const inner = join(path, entry.name);
        if (entry.isDirectory()) {
          return sourceFiles(inner);
        }
        return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name) ? [inner] : [];
      });

/**
 * Hashes the generator code (directories and files) and the runtime that runs it, so a change to either misses every
 * entry. Data files are left out: a row's own inputs carry the data its export reads.
 */
export const codeFingerprint = (root: string, paths: readonly string[]): string => {
  const hash = createHash('sha256').update(process.version).update('\0');
  for (const file of paths.flatMap((path) => sourceFiles(join(root, path))).sort()) {
    hash.update(relative(root, file)).update('\0').update(readFileSync(file)).update('\0');
  }
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

export interface ExportCache {
  /** The row's export from the cache, or generated and stored; a row that declares no inputs is always generated. */
  readonly export: (row: RecipeExport) => ModelExport;
}

/**
 * Entries are named by their key, so two rows exporting at once, even under one id, never write the same entry
 * differently. A builder that wants a cache of only its current models starts from an empty folder.
 */
export const exportCache = (dir: string, code: string): ExportCache => {
  mkdirSync(dir, { recursive: true });
  const path = (key: string, ext: string) => join(dir, `${key}.${ext}`);
  // Each file lands whole, by rename, and the entry file last, so a reader sees a complete entry or none.
  const land = (file: string, data: string | Uint8Array) => {
    const temporary = `${file}.${process.pid}.${threadId}.tmp`;
    writeFileSync(temporary, data);
    renameSync(temporary, file);
  };
  return {
    export: (row) => {
      if (!row.inputs) {
        return row.generate();
      }
      const key = createHash('sha256').update(code).update('\0').update(canonical(row.inputs())).digest('hex');
      if (existsSync(path(key, 'json'))) {
        const { modelEntry, partNodes } = JSON.parse(readFileSync(path(key, 'json'), 'utf8')) as {
          modelEntry: NeutralModel;
          partNodes: string[];
        };
        return { modelEntry, partNodes, glb: readFileSync(path(key, 'glb')) };
      }
      const generated = row.generate();
      land(path(key, 'glb'), generated.glb);
      land(path(key, 'json'), JSON.stringify({ modelEntry: generated.modelEntry, partNodes: generated.partNodes }));
      return generated;
    },
  };
};
