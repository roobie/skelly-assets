import { safeParse } from 'valibot';
import { describe, expect, it } from 'vitest';
import { SURFACE_EDITS } from '../src/patch.ts';
import {
  BarkSchema,
  LeafInputsSchema,
  LeafSchema,
  SURFACE_CONTRACT,
  SURFACE_KINDS,
  SurfaceSchema,
  uniformFields,
} from '../src/schema.ts';
import { LOOKS, lookOf } from './looks.ts';

const LOOK_SCHEMAS = { bark: BarkSchema, leaf: LeafSchema } as const;

const valueAt = (source: unknown, path: readonly string[]) =>
  path.reduce<unknown>((at, name) => (at as Record<string, unknown>)[name], source);

describe('the surface schema', () => {
  it('has code for exactly the kinds it lists', () => {
    expect(Object.keys(SURFACE_EDITS).sort()).toEqual([...SURFACE_KINDS].sort());
    expect(Object.keys(LOOK_SCHEMAS).sort()).toEqual([...SURFACE_KINDS].sort());
    expect(Number.isInteger(SURFACE_CONTRACT)).toBe(true);
  });

  it.each(SURFACE_KINDS)('gives every %s look number a range, for a slider to span', (kind) => {
    const fields = uniformFields(LOOK_SCHEMAS[kind]);
    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) expect(field.range, field.path.join('.')).toBeDefined();
  });

  it('refuses a number outside its range, a fade that ends before it starts, and an unknown kind', () => {
    const bark = lookOf('bark');
    expect(safeParse(SurfaceSchema, bark).success).toBe(true);
    expect(safeParse(SurfaceSchema, { ...bark, relief: 99 }).success).toBe(false);
    expect(safeParse(SurfaceSchema, { ...bark, fade: { from: 0.6, to: 0.3 } }).success).toBe(false);
    expect(safeParse(SurfaceSchema, { ...bark, grain: 'sideways' }).success).toBe(false);
    expect(safeParse(SurfaceSchema, { ...bark, kind: 'moss' }).success).toBe(false);
    expect(safeParse(SurfaceSchema, { ...bark, extra: 1 }).success).toBe(false);
  });

  it('takes the game inputs as points and a near coverage', () => {
    const inputs = { eye: [0, 1.6, 0], player: [0, 1, 3], nearCoverage: 0.2, seeRadius: 1, seeEdge: 0.5 };
    expect(safeParse(LeafInputsSchema, inputs).success).toBe(true);
    expect(safeParse(LeafInputsSchema, { ...inputs, nearCoverage: 2 }).success).toBe(false);
    expect(safeParse(LeafInputsSchema, { ...inputs, seeRadius: -1 }).success).toBe(false);
    expect(uniformFields(LeafInputsSchema).map(({ path, type }) => [path.join('.'), type])).toEqual([
      ['eye', 'vec3'],
      ['player', 'vec3'],
      ['nearCoverage', 'float'],
      ['seeRadius', 'float'],
      ['seeEdge', 'float'],
    ]);
  });
});

describe('the shipped looks, models/surfaces.libsonnet', () => {
  it('cover every kind', () => {
    for (const kind of SURFACE_KINDS) expect(lookOf(kind).kind).toBe(kind);
  });

  it.each(Object.entries(LOOKS))('%s lies within every field range', (_name, look) => {
    for (const { path, range } of uniformFields(LOOK_SCHEMAS[look.kind])) {
      const value = valueAt(look, path) as number;
      expect(value).toBeGreaterThanOrEqual(range?.[0] ?? Number.NEGATIVE_INFINITY);
      expect(value).toBeLessThanOrEqual(range?.[1] ?? Number.POSITIVE_INFINITY);
    }
  });

  it('keep every leaf solid for everyone, so only the local view near its player opens leaves', () => {
    for (const look of Object.values(LOOKS)) if (look.kind === 'leaf') expect(look.coverage).toBe(1);
  });
});
