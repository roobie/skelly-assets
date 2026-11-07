import {
  brand, check, finite, type InferOutput, integer, maxValue, minValue,
  number, parse, pipe, safeParse, strictObject,
} from 'valibot';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { Id, Name, vehicleBlueprintSchema, vehicleServiceFields } from '../src/schema.ts';

const positive = pipe(number(), finite(), check((value) => value > 0, 'must be more than 0'));
const quality = pipe(number(), integer(), minValue(1), maxValue(5));
const cells = pipe(number(), integer(), minValue(1));
const plain = { id: Id, name: Name, positiveSimSeconds: positive, qualityLevel: quality, cells };
const schema = vehicleBlueprintSchema(plain);
const service = { name: 'Wheel', mount: 'wheel', durationSimSeconds: 12, qualities: { wrenching: 1 } };
const fitting = { id: 'wheel', part: 'fixture_part', at: [0, 0, 0], supportedBy: [], cargo: [1, 2, 3], service };
const row = { id: 'fixture', name: 'Fixture', fittings: [fitting] };

// These are shape constraints, not admission against a game's part catalogue.
describe('vehicle schema factories', () => {
  it('accepts the row, not the content envelope, and shares service fields', () => {
    expect(parse(schema, row)).toEqual(row);
    expect(safeParse(schema, { vehicleBlueprints: [row] }).success).toBe(false);
    const { name: _name, ...fields } = service;
    expect(parse(strictObject(vehicleServiceFields(plain)), fields)).toEqual(fields);
  });

  it('rejects empty or duplicate fittings and unknown row keys', () => {
    for (const invalid of [
      { ...row, fittings: [] },
      { ...row, fittings: [fitting, fitting] },
      { ...row, unknown: true },
      { ...row, id: 'Not an id' },
      { ...row, name: '' },
    ]) expect(safeParse(schema, invalid).success).toBe(false);
  });

  it('keeps fitting shape constraints without checking part references', () => {
    expect(safeParse(schema, { ...row, fittings: [{ ...fitting, supportedBy: ['not_registered'] }] }).success).toBe(true);
    for (const invalid of [
      { ...fitting, unknown: true },
      { ...fitting, id: 'Bad id' },
      { ...fitting, part: '' },
      { ...fitting, at: [0, Infinity, 0] },
      { ...fitting, at: [0, 0] },
      { ...fitting, mirror: false },
      { ...fitting, supportedBy: ['BAD'] },
      ...[0, -1, 1.5].map((value) => ({ ...fitting, cargo: [1, value, 1] })),
    ]) expect(safeParse(schema, { ...row, fittings: [invalid] }).success).toBe(false);
  });

  it('keeps service duration, mount, name, quality and strict-key constraints', () => {
    for (const invalid of [
      { ...service, name: '' },
      { ...service, mount: 'BAD' },
      { ...service, unknown: true },
      ...[-1, 0, Infinity, NaN].map((durationSimSeconds) => ({ ...service, durationSimSeconds })),
      ...[0, 6, 1.5].map((value) => ({ ...service, qualities: { wrenching: value } })),
      { ...service, qualities: { BAD: 1 } },
    ]) expect(safeParse(schema, { ...row, fittings: [{ ...fitting, service: invalid }] }).success).toBe(false);
  });

  it('preserves consumer-branded primitive outputs', () => {
    const duration = pipe(positive, brand('SimSeconds'));
    const level = pipe(quality, brand('QualityLevel'));
    const branded = vehicleBlueprintSchema({ ...plain, positiveSimSeconds: duration, qualityLevel: level });
    const parsed = parse(branded, row);
    expectTypeOf(parsed.fittings[0]!.service!.durationSimSeconds).toEqualTypeOf<InferOutput<typeof duration>>();
    expectTypeOf(parsed.fittings[0]!.service!.qualities.wrenching!).toEqualTypeOf<InferOutput<typeof level>>();
    expect(parsed).toEqual(row);
  });
});
