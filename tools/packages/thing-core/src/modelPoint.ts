import { finite, number, pipe, tuple } from 'valibot';

export const ModelPointSchema = tuple([pipe(number(), finite()), pipe(number(), finite()), pipe(number(), finite())]);
