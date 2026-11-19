import {
  brand,
  finite,
  type InferOutput,
  integer,
  maxValue,
  minValue,
  number,
  parse,
  pipe,
  safeParse,
  transform,
} from 'valibot';
import { expect, expectTypeOf, it } from 'vitest';
import { CalibreId, firearmModelSchema, Id, modelSchema, Name } from '../src/schema.ts';

const nonNegative = pipe(number(), finite(), minValue(0));
const positive = pipe(number(), finite(), minValue(Number.MIN_VALUE));
const plain = {
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
const cycle = {
  durationSimSeconds: 1,
  legs: [
    { to: 'open', seconds: 0.3 },
    { to: 'rest', seconds: 0.3 },
  ],
};
const motion = {
  stages: [{ kind: 'slide', direction: [1, 0, 0], travel: 0.1, share: 1 }],
  stops: [
    { name: 'rest', clock: 0 },
    { name: 'open', clock: 1 },
  ],
};
const model = {
  id: 'fixture',
  file: 'assets/models/fixture.glb',
  gun: {
    calibre: '9x19',
    action: {
      parts: { fixture: { node: 'fixture', motion, modes: ['hand'] } },
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
    gun: {
      ...model.gun,
      action: { ...model.gun.action, hand: { ...cycle, legs: [{ to: 'open', seconds: 2 }, ...cycle.legs.slice(1)] } },
    },
  };
  expect(safeParse(schema, invalid).issues?.map(({ message }) => message)).toContain(
    'cycle legs must fit within durationSimSeconds',
  );
});

it('keeps a timeline on the stops of the parts that follow it, back to rest at its end', () => {
  const m = ({ message }: { message: string }) => message;
  const withLegs = (legs: readonly { to: string; seconds: number }[]) => ({
    ...model,
    gun: { ...model.gun, action: { ...model.gun.action, hand: { ...cycle, legs } } },
  });
  expect(safeParse(schema, withLegs([{ to: 'unlocked', seconds: 0.2 }, ...cycle.legs])).issues?.map(m)).toContain(
    'every timeline leg must go to a stop of each part that follows it',
  );
  expect(safeParse(schema, withLegs(cycle.legs.slice(0, 1))).issues?.map(m)).toContain(
    'every timeline must end with its parts back at rest',
  );
});

it('uses caller primitives without erasing their transforms or output brands', () => {
  const positiveSeconds = pipe(positive, brand('fixture-seconds'));
  const primitives = {
    ...plain,
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
