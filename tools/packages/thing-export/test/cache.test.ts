import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NeutralModel } from '@skelly/thing-core/schema';
import { afterEach, describe, expect, it } from 'vitest';
import { codeFingerprint, entryStore, exportCache, pruneEntries } from '../src/cache.ts';
import type { RecipeExport } from '../src/recipe.ts';

const folders: string[] = [];
const folder = () => {
  const dir = mkdtempSync(join(tmpdir(), 'export-cache-'));
  folders.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of folders.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A row whose export counts its runs, so a test sees whether the cache generated it.
const countedRow = (inputs: unknown, declare = true) => {
  const row = {
    runs: 0,
    id: 'thing',
    kind: 'item',
    source: 'thing',
    voxel: { voxelGrain: 0.01 },
    generate: () => {
      row.runs += 1;
      return {
        modelEntry: { id: 'thing', file: 'assets/models/thing.glb' } as unknown as NeutralModel,
        glb: new Uint8Array([row.runs, 1, 2, 3]),
        partNodes: ['part-1:block'],
      };
    },
    ...(declare ? { inputs: () => inputs } : {}),
  };
  return row as typeof row & RecipeExport;
};

describe('the export cache', () => {
  it('serves an unchanged row the export it stored, without generating it again', () => {
    const dir = folder();
    const first = exportCache(dir, 'code').export(countedRow({ size: 1, colour: 'red' }));
    const again = countedRow({ colour: 'red', size: 1 });
    const served = exportCache(dir, 'code').export(again);
    expect(served.model).toEqual({ ...first.model, glb: Buffer.from(first.model.glb) });
    expect(served.entry).toEqual({ key: first.entry?.key, reused: true });
    expect(first.entry?.reused).toBe(false);
    expect(again.runs).toBe(0);
  });

  it.each([
    ['its inputs', { size: 2 }, 'code'],
    ['the code', { size: 1 }, 'changed code'],
  ])('generates a row again when %s change', (_name, inputs, code) => {
    const dir = folder();
    exportCache(dir, 'code').export(countedRow({ size: 1 }));
    const changed = countedRow(inputs);
    exportCache(dir, code).export(changed);
    expect(changed.runs).toBe(1);
  });

  it('always generates a row that declares no inputs, and gives it no entry', () => {
    const cache = exportCache(folder(), 'code');
    const row = countedRow(undefined, false);
    expect(cache.export(row).entry).toBeUndefined();
    cache.export(row);
    expect(row.runs).toBe(2);
  });

  it('keeps on pruning only the entries named, every file of each', () => {
    const dir = folder();
    const kept = exportCache(dir, 'code').export(countedRow({ size: 1 })).entry!.key;
    exportCache(dir, 'code').export(countedRow({ size: 2 }));
    pruneEntries(dir, new Set([kept]));
    expect(readdirSync(dir).sort()).toEqual([`${kept}.glb`, `${kept}.json`]);
  });
});

describe('an entry store', () => {
  it('serves every file of an entry as the bytes it stored', () => {
    const store = entryStore(folder(), 'code');
    const files = { 'body.json': '{"a":1}', glb: new Uint8Array([1, 2, 3]) };
    store.entry(['body.json', 'glb'], { id: 1 }, () => files);
    const served = store.entry(['body.json', 'glb'], { id: 1 }, () => {
      throw new Error('generated again');
    });
    expect(served.reused).toBe(true);
    expect(served.files['body.json']).toEqual(Buffer.from(files['body.json']));
    expect(served.files.glb).toEqual(Buffer.from(files.glb));
  });
});

describe('the code fingerprint', () => {
  const tree = (files: Record<string, string>) => {
    const root = folder();
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(root, path, '..'), { recursive: true });
      writeFileSync(join(root, path), text);
    }
    return root;
  };
  const base = { 'src/a.ts': 'code', 'src/a.json': 'data', 'src/a.test.ts': 'test', 'src/test/fixture.json': 'fixture' };
  const fingerprints = (files: Record<string, string>) => {
    const root = tree(files);
    return { code: codeFingerprint(root, ['src']), data: codeFingerprint(root, ['src'], ['src']) };
  };

  it.each([
    ['source code', { 'src/a.ts': 'new code' }, { code: true, data: true }],
    ['a data file of a data path', { 'src/a.json': 'new data' }, { code: false, data: true }],
    ['a test', { 'src/a.test.ts': 'new test', 'src/test/fixture.json': 'new fixture' }, { code: false, data: false }],
  ])('changes with %s as declared', (_name, edit, changes) => {
    const before = fingerprints(base);
    const after = fingerprints({ ...base, ...edit });
    expect({ code: before.code !== after.code, data: before.data !== after.data }).toEqual(changes);
  });
});
