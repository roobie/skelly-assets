import { optional, safeParse, strictObject, string } from 'valibot';
import { describe, expect, it } from 'vitest';
import { MATERIALS, MaterialSchema } from '../src/materials.ts';
import { modelSchema, NeutralModelSchema } from '../src/schema.ts';

const model = {
  id: 'fixture',
  file: 'assets/models/fixture.glb',
  grip: { at: [0, 0, 0] },
  parts: { body: { massKg: 1, centreOfMass: [0, 0, 0] } },
};

describe('neutral model envelope', () => {
  it('validates pack-owned named blocks without accepting their fields at the top level', () => {
    const schema = modelSchema({ fixturePack: optional(strictObject({ choice: string() })) });
    expect(safeParse(schema, { ...model, fixturePack: { choice: 'fixture' } }).success).toBe(true);
    expect(safeParse(schema, { ...model, choice: 'fixture' }).success).toBe(false);
    expect(safeParse(schema, { ...model, fixturePack: { unknown: true } }).success).toBe(false);
  });

  it('rejects pack blocks that would replace a neutral field', () => {
    expect(() => modelSchema({ grip: optional(string()) })).toThrow();
  });

  it('allows atoms without parts but requires finite assembly parts and rejects scalar mass', () => {
    const { parts: _parts, ...withoutParts } = model;
    expect(safeParse(NeutralModelSchema, withoutParts).success).toBe(true);
    expect(safeParse(NeutralModelSchema, { ...model, parts: {} }).success).toBe(false);
    expect(safeParse(NeutralModelSchema, { ...model, massKg: 1 }).success).toBe(false);
    for (const massKg of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        safeParse(NeutralModelSchema, { ...model, parts: { body: { ...model.parts.body, massKg } } }).success,
      ).toBe(false);
    }
    expect(
      safeParse(NeutralModelSchema, { ...model, parts: { body: { massKg: 1, centreOfMass: [0, Number.NaN, 0] } } })
        .success,
    ).toBe(false);
  });

  it('rejects nonfinite model-frame coordinates', () => {
    expect(safeParse(NeutralModelSchema, model).success).toBe(true);
    expect(
      safeParse(NeutralModelSchema, { ...model, anchors: { fixture: [0, Number.POSITIVE_INFINITY, 0] } }).success,
    ).toBe(false);
  });
});

describe('motion', () => {
  const slide = (share: number) => ({ kind: 'slide', direction: [0, 0, -1], travel: 0.5, share });
  const stop = (name: string, clock: number) => ({ name, clock });
  const restOpen = [stop('rest', 0), stop('open', 1)];
  const withMotion = (stages: unknown, stops: unknown = restOpen) =>
    safeParse(NeutralModelSchema, { ...model, motion: { stages, stops } }).success;

  it('holds each stage to a share above 0 and the shares to a sum of 1', () => {
    expect(withMotion([slide(0.25), slide(0.75)])).toBe(true);
    expect(withMotion([slide(0), slide(1)])).toBe(false);
    expect(withMotion([slide(0.25), slide(0.5)])).toBe(false);
  });

  it('requires stops, running from 0 to 1 in order, each named once', () => {
    const stages = [slide(1)];
    expect(safeParse(NeutralModelSchema, { ...model, motion: { stages } }).success).toBe(false);
    expect(withMotion(stages, [stop('rest', 0), stop('half', 0.5), stop('open', 1)])).toBe(true);
    expect(withMotion(stages, [stop('rest', 0)])).toBe(false);
    expect(withMotion(stages, [stop('rest', 0.1), stop('open', 1)])).toBe(false);
    expect(withMotion(stages, [stop('rest', 0), stop('open', 0.9)])).toBe(false);
    expect(withMotion(stages, [stop('rest', 0), stop('half', 0.5), stop('back', 0.4), stop('open', 1)])).toBe(false);
    expect(withMotion(stages, [stop('rest', 0), stop('rest', 1)])).toBe(false);
  });
});

describe('stowage', () => {
  const frame = { position: [0, 1, 0], normal: [0, 1, 0], up: [1, 0, 0] };
  const slot = (id: string) => ({
    id,
    accepts: ['case'],
    envelope: { min: [0, -0.1, -0.1], max: [0.3, 0.1, 0.1] },
    frame,
  });
  const withStowage = (stowage: unknown) => safeParse(NeutralModelSchema, { ...model, stowage }).success;

  it('takes slots, seats or both', () => {
    expect(withStowage({ slots: [slot('left'), slot('right')] })).toBe(true);
    expect(withStowage({ seats: [{ standard: 'case', frame }] })).toBe(true);
    expect(withStowage({ slots: [slot('left')], seats: [{ standard: 'case', frame }] })).toBe(true);
  });

  // A load-out names a slot by its id and fills it by its words and envelope, so a slot short of any cannot be filled.
  it('refuses stowage that names no port, a slot twice, or a slot without its words or envelope', () => {
    expect(withStowage({})).toBe(false);
    expect(withStowage({ slots: [] })).toBe(false);
    expect(withStowage({ slots: [slot('left'), slot('left')] })).toBe(false);
    expect(withStowage({ slots: [{ ...slot('left'), accepts: [] }] })).toBe(false);
    const { envelope: _envelope, ...open } = slot('left');
    expect(withStowage({ slots: [open] })).toBe(false);
    expect(withStowage({ slots: [{ ...slot('left'), frame: { ...frame, up: [0, 1, 0] } }] })).toBe(false);
  });
});

describe('material table', () => {
  it('requires valid appearance and rejects retired density inputs', () => {
    const material = {
      colour: [0.2, 0.3, 0.4],
      finish: { metallic: 0, roughness: 0.5 },
    };
    expect(Object.keys(MATERIALS).length).toBeGreaterThan(0);
    expect(safeParse(MaterialSchema, material).success).toBe(true);
    expect(safeParse(MaterialSchema, { ...material, densityKgPerM3: 1000 }).success).toBe(false);
    expect(safeParse(MaterialSchema, { ...material, colour: [0, 0, 2] }).success).toBe(false);
    expect(safeParse(MaterialSchema, { ...material, finish: { metallic: 0 } }).success).toBe(false);
  });

  it('takes a fabric grain only on a non-metallic finish with a sheen', () => {
    const fabric = { kind: 'knit', grain: 0.003, relief: 0.5, noise: 0.1, crease: 0.2, fold: 0.08 };
    const sheen = { colour: [0.6, 0.6, 0.6], roughness: 0.5 };
    const cloth = { colour: [0.2, 0.3, 0.4], finish: { metallic: 0, roughness: 0.9, sheen, fabric } };
    expect(safeParse(MaterialSchema, cloth).success).toBe(true);
    expect(safeParse(MaterialSchema, { ...cloth, finish: { ...cloth.finish, metallic: 1 } }).success).toBe(false);
    expect(safeParse(MaterialSchema, { ...cloth, finish: { metallic: 0, roughness: 0.9, fabric } }).success).toBe(
      false,
    );
    expect(
      safeParse(MaterialSchema, { ...cloth, finish: { ...cloth.finish, fabric: { ...fabric, kind: 'chainmail' } } })
        .success,
    ).toBe(false);
  });

  it('takes a shader surface, checked by its kind, and never beside a fabric', () => {
    const bark = Object.values(MATERIALS).find(({ finish }) => finish.surface?.kind === 'bark');
    expect(bark).toBeDefined();
    if (bark === undefined) return;
    const surface = bark.finish.surface;
    expect(safeParse(MaterialSchema, bark).success).toBe(true);
    expect(
      safeParse(MaterialSchema, { ...bark, finish: { ...bark.finish, surface: { ...surface, relief: 9 } } }).success,
    ).toBe(false);
    expect(safeParse(MaterialSchema, { ...bark, finish: { ...bark.finish, surface: { kind: 'moss' } } }).success).toBe(
      false,
    );
    const fabric = { kind: 'felt', grain: 0.003, relief: 0.5, noise: 0.1, crease: 0.2, fold: 0.08 };
    const sheen = { colour: [0.6, 0.6, 0.6], roughness: 0.5 };
    expect(safeParse(MaterialSchema, { ...bark, finish: { ...bark.finish, sheen, fabric } }).success).toBe(false);
  });
});
