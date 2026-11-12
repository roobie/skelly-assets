import {
  check,
  finite,
  type InferOutput,
  integer,
  maxValue,
  minValue,
  maxLength,
  minLength,
  nullable,
  number,
  parse,
  pipe,
  record,
  strictObject,
  string,
  array,
} from 'valibot';

const Fraction = pipe(number(), finite(), minValue(0), maxValue(1));
const NonNegative = pipe(number(), finite(), minValue(0));
const Positive = pipe(number(), finite(), check((value) => value > 0, 'must be greater than 0'));
const Hz = pipe(Positive, maxValue(96000));
const Ms = pipe(Positive, maxValue(10000));
const Seconds = pipe(Positive, maxValue(10));

const Rate = pipe(Positive, maxValue(200));
const Scale = pipe(Positive, maxValue(10));

const ordered = <T extends Record<string, number>>(low: keyof T & string, high: keyof T & string) =>
  check<T, string>((range) => range[low]! <= range[high]!, `${low} must not exceed ${high}`);

/** A mode of the object's ring: its pitch, how long it takes to fall 60 dB, and its level. */
const ModeSchema = strictObject({ hz: Hz, ms: Ms, gain: NonNegative });

/** A pair of close frequencies per mode, which beat; `lean` shifts the level between the pair. */
const SplitSchema = strictObject({ ratio: pipe(NonNegative, maxValue(0.1)), lean: pipe(number(), finite(), minValue(-1), maxValue(1)) });

const SpinSchema = pipe(
  strictObject({ minHz: Hz, maxHz: Hz, depth: Fraction }),
  ordered('minHz', 'maxHz'),
);

const DoubleStrikeSchema = pipe(
  strictObject({
    chancePerTumble: NonNegative,
    minMs: Ms,
    maxMs: Ms,
    fullTumble: Positive,
    level: Fraction,
  }),
  ordered('minMs', 'maxMs'),
);

/** A decaying tone under an attack, such as the thud of a body or the head of a case. */
const BodySchema = pipe(
  strictObject({ lowHz: Hz, highHz: Hz, overtone: NonNegative, ms: Ms, gain: NonNegative }),
  ordered('lowHz', 'highHz'),
);

const TickSchema = pipe(
  strictObject({ shortMs: Ms, longMs: Ms, highPassHz: Hz, gain: NonNegative }),
  ordered('shortMs', 'longMs'),
);

const ObjectSchema = strictObject({
  contactGain: NonNegative,
  ringGain: NonNegative,
  hardness: Fraction,
  split: nullable(SplitSchema),
  spin: nullable(SpinSchema),
  doubleStrike: nullable(DoubleStrikeSchema),
  head: nullable(BodySchema),
  modes: pipe(array(ModeSchema), minLength(1), maxLength(32)),
});

const SurfaceSchema = strictObject({
  decayScale: Scale,
  contactGain: NonNegative,
  hardness: Fraction,
  tick: nullable(TickSchema),
  body: nullable(BodySchema),
});

/** Below 1, so a drop's bounces always die away. */
const Restitution = pipe(number(), finite(), minValue(0), check((value) => value < 1, 'must be below 1'));

const StrikeSchema = pipe(
  strictObject({
    contact: pipe(
      strictObject({ softSeconds: Seconds, hardSeconds: Seconds, softHz: Hz, hardHz: Hz }),
      ordered('hardSeconds', 'softSeconds'),
      ordered('softHz', 'hardHz'),
    ),
    ring: pipe(
      strictObject({ softAttackSeconds: Seconds, hardAttackSeconds: Seconds, tiltExponent: Positive }),
      ordered('hardAttackSeconds', 'softAttackSeconds'),
    ),
    body: pipe(
      strictObject({ attackSeconds: Seconds, overtoneLevel: NonNegative, hardnessShare: Fraction, randomShare: Fraction }),
      check(({ hardnessShare, randomShare }) => hardnessShare + randomShare <= 1, 'the pitch shares must not sum above 1'),
    ),
    landing: strictObject({ scatter: NonNegative, poseWeight: NonNegative }),
    splitSpacing: strictObject({ least: NonNegative, spread: NonNegative }),
  }),
);

const DropSchema = strictObject({
  height: pipe(Positive, maxValue(100)),
  restitution: Restitution,
  tumble: Fraction,
});

const EventRingSchema = strictObject({ decay: Scale, level: NonNegative, choke: Fraction });

const RollSchema = pipe(
  strictObject({
    level: NonNegative,
    startRate: Rate,
    endRate: Rate,
    minSeconds: Seconds,
    maxSeconds: Seconds,
    settleSeconds: NonNegative,
    hardness: Fraction,
    endLevel: Fraction,
    wobbleDepth: Fraction,
    minWobbleHz: Hz,
    maxWobbleHz: Hz,
    wobbleSlowing: Fraction,
    tickJitter: Fraction,
  }),
  ordered('minSeconds', 'maxSeconds'),
  ordered('minWobbleHz', 'maxWobbleHz'),
);

const MotionSchema = strictObject({
  gravity: Positive,
  maxSeconds: Seconds,
  startSeconds: NonNegative,
  bounceBudgetSeconds: Seconds,
  rollSpeed: Positive,
  hardSpeed: Positive,
  amplitudeExponent: Positive,
  referenceTumble: Positive,
  maxTumbleSpread: pipe(Positive, maxValue(10)),
  eventRing: strictObject({ bounce: EventRingSchema, roll: EventRingSchema, rock: EventRingSchema }),
  roll: RollSchema,
  rocks: pipe(array(strictObject({ gap: Positive, level: NonNegative })), maxLength(16)),
});

const MixSchema = strictObject({
  contactLevel: NonNegative,
  ringLevel: NonNegative,
  upperModeTiltDb: NonNegative,
  outputGain: pipe(Positive, maxValue(1)),
  peakCeiling: pipe(Positive, maxValue(1)),
  chokeFadeSeconds: pipe(Positive, maxValue(1)),
  endFadeSeconds: pipe(Positive, maxValue(1)),
});

/** One dropped object on one surface: every setting `renderImpact` reads. */
export const ImpactRowSchema = strictObject({
  object: ObjectSchema,
  surface: SurfaceSchema,
  strike: StrikeSchema,
  drop: DropSchema,
  motion: MotionSchema,
  mix: MixSchema,
});
export type ImpactRow = InferOutput<typeof ImpactRowSchema>;

/** The impact rows by id. */
export const ImpactRowsSchema = pipe(
  record(pipe(string(), minLength(1)), ImpactRowSchema),
  check((rows) => Object.keys(rows).length > 0, 'needs at least one row'),
);

/** Throws, naming the field, when a row's settings are out of range. */
export const parseImpactRow = (row: unknown): ImpactRow => parse(ImpactRowSchema, row);
export const parseImpactRows = (rows: unknown): Record<string, ImpactRow> => parse(ImpactRowsSchema, rows);

/** The rates a render accepts: below it nothing above 4 kHz survives, above it the buffers outgrow any use. */
export const SampleRate = pipe(number(), integer(), minValue(8000), maxValue(192000));
