// The small schemas the model schemas share, in a file of their own so that the schemas which import each other do not
// import one another's primitives in a circle.
import { check, finite, nonEmpty, number, pipe, string } from 'valibot';
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
