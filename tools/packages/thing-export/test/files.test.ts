import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NeutralModel } from '@skelly/thing-core/schema';
import { expect, it } from 'vitest';
import { type GeneratedModel, writeModelExports } from '../src/files.ts';

const generated = (parts: Record<string, { massKg?: number }>, physical?: GeneratedModel['physical']) =>
  ({
    id: 'fixture',
    kind: 'item',
    modelEntry: { id: 'fixture', file: 'assets/models/fixture.glb', parts } as unknown as NeutralModel,
    glb: new Uint8Array(),
    partNodes: [],
    ...(physical === undefined ? {} : { physical }),
  }) satisfies GeneratedModel;

const written = (model: GeneratedModel) => {
  const base = mkdtempSync(join(tmpdir(), 'files-'));
  try {
    return writeModelExports([model], base, 'things').models[0]?.physical;
  } finally {
    rmSync(base, { recursive: true });
  }
};

it('weighs a model through its parts when its tool reports no total', () => {
  expect(written(generated({ a: { massKg: 1 }, b: { massKg: 0.5 } }))).toEqual({ massKg: 1.5 });
});

it('leaves a model unweighed while any part is, and keeps a total the tool reports', () => {
  expect(written(generated({ a: { massKg: 1 }, b: {} }))).toBeUndefined();
  expect(written(generated({ a: { massKg: 1 } }, { massKg: 9, volumeM3: 2 }))).toEqual({ massKg: 9, volumeM3: 2 });
});
