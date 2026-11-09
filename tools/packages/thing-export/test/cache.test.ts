import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NeutralModel } from '@skelly/thing-core/schema';
import { afterEach, describe, expect, it } from 'vitest';
import { exportCache } from '../src/cache.ts';
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
    expect(exportCache(dir, 'code').export(again)).toEqual({ ...first, glb: Buffer.from(first.glb) });
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

  it('always generates a row that declares no inputs', () => {
    const cache = exportCache(folder(), 'code');
    const row = countedRow(undefined, false);
    cache.export(row);
    cache.export(row);
    expect(row.runs).toBe(2);
  });
});
