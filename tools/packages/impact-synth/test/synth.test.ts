import { describe, expect, it } from 'vitest';
import { impactRows } from '../src/rows.ts';
import { type ImpactRow, parseImpactRow } from '../src/schema.ts';
import { renderImpact } from '../src/synth.ts';

const RATE = 22050;
const row = (id: string): ImpactRow => {
  const found = impactRows[id];
  if (!found) throw new Error(`no row ${id}`);
  return found;
};
const rowIds = Object.keys(impactRows);
const peak = (samples: Float32Array) => samples.reduce((loudest, sample) => Math.max(loudest, Math.abs(sample)), 0);

describe('renderImpact', () => {
  it.each(rowIds)('renders %s identically for the same row, seed and rate', (id) => {
    expect(renderImpact(row(id), 7, RATE)).toEqual(renderImpact(structuredClone(row(id)), 7, RATE));
  });

  it.each(rowIds)('renders %s differently for another seed', (id) => {
    expect(renderImpact(row(id), 7, RATE)).not.toEqual(renderImpact(row(id), 8, RATE));
  });

  it.each(rowIds)('renders %s audible, finite and under the row ceiling', (id) => {
    const samples = renderImpact(row(id), 3, RATE);
    expect(samples.every(Number.isFinite)).toBe(true);
    expect(peak(samples)).toBeGreaterThan(0);
    expect(peak(samples)).toBeLessThanOrEqual(row(id).mix.peakCeiling);
  });

  it('does not touch Math.random', () => {
    const original = Math.random;
    Math.random = () => {
      throw new Error('Math.random called');
    };
    try {
      renderImpact(row(rowIds[0] ?? ''), 1, RATE);
    } finally {
      Math.random = original;
    }
  });

  it('keeps the same hit timing at every sample rate', () => {
    const seconds = (rate: number) => renderImpact(row(rowIds[0] ?? ''), 5, rate).length / rate;
    expect(Math.abs(seconds(22050) - seconds(48000))).toBeLessThan(0.001);
  });

  it('rejects a sample rate it cannot render', () => {
    expect(() => renderImpact(row(rowIds[0] ?? ''), 1, 100)).toThrow();
  });
});

describe('impact row validation', () => {
  const base = (): Record<string, any> => structuredClone(row(rowIds[0] ?? ''));
  const mutations: [string, (draft: Record<string, any>) => void][] = [
    ['a mode with no decay time', (d) => (d.object.modes[0].ms = 0)],
    ['no modes', (d) => (d.object.modes = [])],
    ['a negative mode level', (d) => (d.object.modes[0].gain = -1)],
    ['a restitution of 1, which never settles', (d) => (d.drop.restitution = 1)],
    ['a hardness above 1', (d) => (d.object.hardness = 1.5)],
    ['a drop from no height', (d) => (d.drop.height = 0)],
    ['a non-finite gravity', (d) => (d.motion.gravity = Number.POSITIVE_INFINITY)],
    ['a roll that ends before it starts', (d) => (d.motion.roll.maxSeconds = d.motion.roll.minSeconds / 2)],
    ['a peak ceiling above full scale', (d) => (d.mix.peakCeiling = 2)],
    ['an unknown setting', (d) => (d.drop.bounciness = 1)],
    ['a missing section', (d) => delete d.mix],
  ];

  it('accepts every shipped row', () => {
    for (const id of rowIds) expect(() => parseImpactRow(row(id))).not.toThrow();
  });

  it.each(mutations)('rejects %s', (_name, mutate) => {
    const draft = base();
    mutate(draft);
    expect(() => parseImpactRow(draft)).toThrow();
  });
});
