// The schema of a part's motion, apart from the model schemas that carry it, so a vehicle part and a gun's action part
// read one definition. The type, and what the stages and the stops mean, is `@skelly/motion`.
import { type Motion, stopsError } from '@skelly/motion/motion';
import {
  array,
  check,
  finite,
  type GenericSchema,
  literal,
  maxValue,
  minLength,
  minValue,
  nonEmpty,
  number,
  optional,
  pipe,
  rawCheck,
  strictObject,
  string,
  variant,
} from 'valibot';
import { ModelPointSchema } from './modelPoint.ts';

export const Name = pipe(string(), nonEmpty('must not be empty'));

export const UnitVectorSchema = pipe(
  ModelPointSchema,
  check((point) => Math.abs(Math.hypot(...point) - 1) <= 1e-6, 'must be a unit vector'),
);

export const PositiveSchema = pipe(
  number(),
  finite(),
  check((value) => value > 0, 'must be positive'),
);

/** The authored stop of a hinge in degrees: a part opening further than a half turn would pass through its carrier. */
export const OpenAngleSchema = pipe(PositiveSchema, maxValue(180));

/** A stage's part of its motion's clock, from 0 to 1, which it runs through linearly. */
const ShareSchema = pipe(
  number(),
  finite(),
  check((share) => share > 0 && share <= 1, 'stage share must be above 0 and at most 1'),
);

/**
 * The named places on a motion's clock, in order from rest at 0 to the end of travel at 1, so a reader finds a place by what it
 * is called rather than by a number it would have to guess.
 */
export const StopsSchema = pipe(
  array(strictObject({ name: Name, clock: pipe(number(), finite(), minValue(0), maxValue(1)) })),
  minLength(2, 'needs a stop at rest and one at the end'),
  check((stops) => stops[0]?.clock === 0 && stops.at(-1)?.clock === 1, 'must run from clock 0 to 1'),
  rawCheck(({ dataset, addIssue }) => {
    const error = dataset.typed ? stopsError(dataset.value) : undefined;
    if (error !== undefined) addIssue({ message: error });
  }),
);

/**
 * A part's motion from rest to the end of its travel, in the model frame and metres; the type, and what the stages and the
 * stops mean, is `@skelly/motion`, `Motion`. Each stage's share is above 0 and they sum to 1.
 */
export const MotionSchema = strictObject({
  stages: pipe(
    array(
      variant('kind', [
        strictObject({
          kind: literal('hinge'),
          axis: pipe(
            strictObject({ from: ModelPointSchema, to: ModelPointSchema }),
            check(
              ({ from, to }) => from.some((value, axis) => value !== to[axis]),
              'hinge axis needs two distinct points',
            ),
          ),
          angle: pipe(
            number(),
            finite(),
            check((angle) => angle !== 0 && Math.abs(angle) <= 180, 'hinge angle must be nonzero, at most a half turn'),
          ),
          share: ShareSchema,
        }),
        strictObject({
          kind: literal('slide'),
          direction: UnitVectorSchema,
          travel: PositiveSchema,
          stow: optional(pipe(number(), finite())),
          share: ShareSchema,
        }),
      ]),
    ),
    nonEmpty(),
    check(
      (stages) => Math.abs(stages.reduce((sum, { share }) => sum + share, 0) - 1) <= 1e-9,
      'stage shares must sum to 1',
    ),
  ),
  stops: StopsSchema,
}) satisfies GenericSchema<unknown, Motion>;
