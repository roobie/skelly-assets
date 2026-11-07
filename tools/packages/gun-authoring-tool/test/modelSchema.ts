import { CalibreId, firearmModelSchema, Id, modelSchema, Name } from '@skelly/thing-core/schema';
import { finite, integer, maxValue, minValue, number, parse, pipe, safeParse } from 'valibot';

const nonNegative = pipe(number(), finite(), minValue(0));
const positive = pipe(number(), finite(), minValue(Number.MIN_VALUE));
export const plain = {
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
export const parseModel = (entry: unknown) => parse(schema, entry);
export const modelIssues = (entry: unknown) => safeParse(schema, entry).issues ?? [];
