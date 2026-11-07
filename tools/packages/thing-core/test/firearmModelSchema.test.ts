import {
  brand,
  finite,
  integer,
  maxValue,
  minValue,
  number,
  parse,
  pipe,
  safeParse,
  transform,
  type InferOutput,
} from 'valibot';
import { expect, expectTypeOf, it } from 'vitest';
import { CalibreId, firearmModelSchema, Id, modelSchema, Name } from '../src/schema.ts';

const nonNegative = pipe(number(), finite(), minValue(0));
const positive = pipe(number(), finite(), minValue(Number.MIN_VALUE));
const plain = {
  simSeconds: nonNegative,
  positiveSimSeconds: positive,
  simPerMinute: positive,
  id: Id,
  calibreId: CalibreId,
  name: Name,
  positive,
  nonNegative,
  count: pipe(nonNegative, integer()),
  fraction: pipe(nonNegative, maxValue(1)),
};
const schema = modelSchema({ gun: firearmModelSchema(plain) });
const cycle = { durationSimSeconds: 1, rearwardSimSeconds: 0.3, dwellSimSeconds: 0, forwardSimSeconds: 0.3 };
const model = {
  id: 'fixture',
  file: 'assets/models/fixture.glb',
  gun: {
    calibre: '9x19',
    action: {
      parts: { fixture: { node: 'fixture', axis: [1, 0, 0], strokeMetres: 0.1, modes: ['hand'] } },
      hand: cycle,
      ejectAt: 0.5,
      ejectDirection: [0, 1, 0],
      holdOpen: false,
    },
  },
};

it('validates whole model envelopes and refuses unknown firearm fields and malformed identifiers', () => {
  expect(safeParse(schema, model).success).toBe(true);
  expect(safeParse(schema, { ...model, gun: { ...model.gun, unknown: true } }).success).toBe(false);
  expect(safeParse(schema, { ...model, id: 'Invalid id' }).success).toBe(false);
  expect(safeParse(schema, { ...model, gun: { calibre: 'bad calibre' } }).success).toBe(false);
  expect(safeParse(Name, '').success).toBe(false);
  expect(safeParse(schema, { ...model, gun: { calibre: 'fixture-new.12-3' } }).success).toBe(true);
});

it('keeps temporal positivity and phase sums at the shared validation boundary', () => {
  for (const durationSimSeconds of [-1, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(
      safeParse(schema, {
        ...model,
        gun: { ...model.gun, action: { ...model.gun.action, hand: { ...cycle, durationSimSeconds } } },
      }).success,
    ).toBe(false);
  }
  const invalid = {
    ...model,
    gun: { ...model.gun, action: { ...model.gun.action, hand: { ...cycle, rearwardSimSeconds: 2 } } },
  };
  expect(safeParse(schema, invalid).issues?.map(({ message }) => message)).toContain(
    'cycle phases must fit within durationSimSeconds',
  );
});

it('uses caller primitives without erasing their transforms or output brands', () => {
  const seconds = pipe(nonNegative, brand('fixture-seconds'));
  const positiveSeconds = pipe(positive, brand('fixture-seconds'));
  const primitives = {
    ...plain,
    simSeconds: seconds,
    positiveSimSeconds: positiveSeconds,
    calibreId: pipe(
      CalibreId,
      transform((value) => `accepted-${value}`),
    ),
  };
  const brandedSchema = modelSchema({ gun: firearmModelSchema(primitives) });
  const parsed = parse(brandedSchema, model);
  expect(parsed.gun.calibre).toBe(`accepted-${model.gun.calibre}`);
  expectTypeOf(parsed.gun.action!.hand.durationSimSeconds).toEqualTypeOf<InferOutput<typeof positiveSeconds>>();
});
